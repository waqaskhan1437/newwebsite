/**
 * Handlers for order and archive API endpoints.
 *
 * This module groups together functions that operate on orders. It
 * includes creating a new encrypted order, updating an order with a
 * permanent archive link, and uploading encrypted content to the
 * Internet Archive. Keeping these related routines in a dedicated
 * module improves readability of the worker entry point.
 */

import { jsonResponse } from './utils.js';
import { encryptData, encryptBytesWithIvPrefix } from './crypto.js';

/**
 * Create a new encrypted order record. The body must contain at
 * least productId, email and amount. A random orderId is generated if
 * not supplied. The sensitive payload is encrypted using AES‑GCM and
 * stored alongside an IV.
 *
 * @param {Request} req Incoming request
 * @param {any} env Worker environment with DB and secrets
 */
export async function saveEncryptedOrder(req, env) {
  if (!env.SECRET_KEY) {
    throw new Error('SECRET_KEY missing in worker variables');
  }
  const body = await req.json();
  const productId = body.productId;
  if (!productId) {
    throw new Error('productId missing');
  }
  const orderId = body.orderId || crypto.randomUUID().split('-')[0].toUpperCase();
  const sensitivePayload = JSON.stringify({
    email: body.email,
    amount: body.amount,
    productId,
    addons: body.addons || []
  });
  const { encrypted, iv } = await encryptData(sensitivePayload, env.SECRET_KEY);
  await env.DB.prepare(
    `INSERT INTO orders (order_id, product_id, encrypted_data, iv, status)
     VALUES (?, ?, ?, ?, 'PAID')`
  ).bind(orderId, productId, encrypted, iv).run();
  return jsonResponse({ success: true, orderId });
}

/**
 * Update an existing order with a permanent archive URL. The request body
 * should provide both orderId and archiveUrl. No sensitive operations
 * occur here; the function simply performs an UPDATE and returns success.
 *
 * @param {Request} req Incoming request
 * @param {any} env Worker environment with DB
 */
export async function saveArchiveLink(req, env) {
  const body = await req.json();
  await env.DB.prepare(`UPDATE orders SET archive_url = ? WHERE order_id = ?`).bind(body.archiveUrl, body.orderId).run();
  return jsonResponse({ success: true });
}

/**
 * Upload an encrypted file to the Internet Archive. The order ID and item
 * identifiers are extracted from the request URL parameters. The file
 * contents are read into an ArrayBuffer, encrypted with the configured
 * secret key and the IV prepended. On success the orders table is
 * updated with the public archive URL.
 *
 * @param {Request} req Incoming request
 * @param {any} env Worker environment with DB and archive credentials
 */
export async function uploadEncryptedFileToArchive(req, env) {
  if (!env.SECRET_KEY) {
    throw new Error('SECRET_KEY missing');
  }
  const url = new URL(req.url);
  const orderId = url.searchParams.get('orderId');
  const itemId = url.searchParams.get('itemId');
  const filename = url.searchParams.get('filename') || 'file.bin';
  const fileBuffer = await req.arrayBuffer();
  const encryptedBuffer = await encryptBytesWithIvPrefix(fileBuffer, env.SECRET_KEY);
  // Construct S3 style URL for archive.org uploads
  const s3Url = `https://s3.us.archive.org/${itemId}/${filename}`;
  const auth = `LOW ${env.ARCHIVE_ACCESS_KEY}:${env.ARCHIVE_SECRET_KEY}`;
  const resp = await fetch(s3Url, {
    method: 'PUT',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/octet-stream'
    },
    body: encryptedBuffer
  });
  if (!resp.ok) {
    return jsonResponse({ error: 'Upload failed' }, 502);
  }
  const publicUrl = `https://archive.org/download/${itemId}/${filename}`;
  await env.DB.prepare(`UPDATE orders SET archive_url = ? WHERE order_id = ?`).bind(publicUrl, orderId).run();
  return jsonResponse({ success: true, archiveUrl: publicUrl });
}