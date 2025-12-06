/**
 * Handlers for product and review API endpoints.
 *
 * This module provides functions to list products, fetch a single product
 * by ID, create or update a product record, and add or retrieve reviews.
 * By splitting these handlers out of the worker entry point we keep
 * related logic together and under 200 lines. Each function returns
 * either a JSON response or throws an error which the caller should
 * convert into a proper response.
 */

import { jsonResponse } from './utils.js';

/**
 * Fetch the list of active products. Results are ordered by sort_order
 * ascending then by ID descending. Only a subset of columns is returned
 * to minimise payload size.
 *
 * @param {any} env Worker environment with DB
 */
export async function listProducts(env) {
  const res = await env.DB.prepare(
    `SELECT id, title, slug, normal_price, sale_price, thumbnail_url
     FROM products
     WHERE status = 'active'
     ORDER BY sort_order ASC, id DESC`
  ).all();
  return jsonResponse({ products: res.results || [] });
}

/**
 * Retrieve a single product and its aggregated review statistics. The
 * product is looked up by numeric ID. If addons_json is present
 * it is parsed from JSON and included in the response. A basic
 * five‑star average rating is calculated when reviews exist.
 *
 * @param {any} env Worker environment with DB
 * @param {string} id Product identifier
 */
export async function getProduct(env, id) {
  if (!id) return jsonResponse({ error: 'Missing product id' }, 400);
  const row = await env.DB.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first();
  if (!row) return jsonResponse({ error: 'Product not found' }, 404);
  const stats = await env.DB.prepare(
    `SELECT COUNT(*) as count, AVG(rating) as avg
     FROM reviews
     WHERE product_id = ? AND status = 'approved'`
  ).bind(id).first();
  let addons = [];
  if (row.addons_json) {
    try {
      addons = JSON.parse(row.addons_json);
    } catch (_) {
      addons = [];
    }
  }
  const reviewCount = stats.count || 0;
  const ratingAvg = reviewCount > 0 ? Math.round(stats.avg * 10) / 10 : 5.0;
  // Exclude the raw addons JSON from the returned product
  // eslint-disable-next-line no-unused-vars
  const { addons_json, ...product } = row;
  return jsonResponse({
    product: {
      ...product,
      addons,
      review_count: reviewCount,
      rating_average: ratingAvg
    },
    addons
  });
}

/**
 * Create or update a product. When an ID is provided the existing
 * record is updated; otherwise a new product is inserted. The
 * request body is expected to be JSON with the fields described
 * below. The slug is auto‑generated from the title if missing.
 *
 * Body fields:
 * - id (optional) numeric product id
 * - title (required) product name
 * - slug (optional) URL slug
 * - description, normal_price, sale_price, instant_delivery,
 *   normal_delivery_text, thumbnail_url, video_url
 * - addons (array)
 * - seo_title, seo_description, seo_keywords, seo_canonical
 *
 * @param {Request} req Incoming request
 * @param {any} env Worker environment with DB
 */
export async function saveProduct(req, env) {
  const body = await req.json().catch(() => null);
  if (!body) return jsonResponse({ error: 'Invalid JSON body' }, 400);
  const title = (body.title || '').trim();
  let slug = (body.slug || '').trim();
  if (!title) return jsonResponse({ error: 'Title required' }, 400);
  if (!slug) {
    slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  const data = {
    title,
    slug,
    description: body.description || '',
    normal_price: Number(body.normal_price || 0),
    sale_price: body.sale_price ? Number(body.sale_price) : null,
    instant_delivery: body.instant_delivery ? 1 : 0,
    normal_delivery_text: body.normal_delivery_text || '',
    thumbnail_url: body.thumbnail_url || '',
    video_url: body.video_url || '',
    addons_json: JSON.stringify(body.addons || []),
    seo_title: body.seo_title || '',
    seo_description: body.seo_description || '',
    seo_keywords: body.seo_keywords || '',
    seo_canonical: body.seo_canonical || '',
    // Whop integration fields (optional)
    whop_plan: body.whop_plan || '',
    whop_price_map: body.whop_price_map || ''
  };
  const fields = Object.keys(data);
  if (body.id) {
    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    const values = [...fields.map((f) => data[f]), body.id];
    await env.DB.prepare(`UPDATE products SET ${setClause} WHERE id = ?`).bind(...values).run();
    return jsonResponse({ success: true, id: body.id, slug });
  }
  const placeholders = fields.map(() => '?').join(', ');
  const values = fields.map((f) => data[f]);
  const stmt = await env.DB.prepare(
    `INSERT INTO products (${fields.join(', ')}, status, sort_order)
     VALUES (${placeholders}, 'active', 0)`
  ).bind(...values).run();
  return jsonResponse({ success: true, id: stmt.meta?.last_row_id, slug });
}

/**
 * Add a new review for a product. The request body should contain
 * productId, author, rating and an optional comment. The review is
 * automatically approved and timestamped.
 *
 * @param {Request} req Incoming request
 * @param {any} env Worker environment with DB
 */
export async function addReview(req, env) {
  const body = await req.json();
  const { productId, author, rating, comment } = body;
  if (!productId || !rating) {
    return jsonResponse({ error: 'Missing fields' }, 400);
  }
  await env.DB.prepare(
    `INSERT INTO reviews (product_id, author_name, rating, comment, status)
     VALUES (?, ?, ?, ?, 'approved')`
  ).bind(productId, author || 'Customer', rating, comment || '').run();
  return jsonResponse({ success: true });
}

/**
 * Retrieve all approved reviews for a product ordered by most recent.
 *
 * @param {any} env Worker environment with DB
 * @param {string} productId Identifier of the product
 */
export async function getReviews(env, productId) {
  const res = await env.DB.prepare(
    `SELECT * FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY created_at DESC`
  ).bind(productId).all();
  return jsonResponse({ reviews: res.results || [] });
}