/**
 * Cloudflare Worker entry point for the WishVideo API and static asset
 * server. This file contains only routing logic and delegates all heavy
 * lifting to dedicated modules. Each helper remains under 200 lines to
 * aid maintainability. To extend functionality, add a new function to
 * one of the imported modules and map a route below.
 */

import { corsHeaders, jsonResponse, handleStaticAsset } from './worker/utils.js';
import { ensureSchema } from './worker/schema.js';
import {
  listProducts,
  getProduct,
  saveProduct,
  addReview,
  getReviews
} from './worker/product-routes.js';
import {
  saveEncryptedOrder,
  saveArchiveLink,
  uploadEncryptedFileToArchive
} from './worker/order-routes.js';
import { handleSecureDownload } from './worker/secure-download.js';

export default {
  /**
   * Main request handler. Determines whether a request should be treated
   * as an API call or a static asset and dispatches accordingly. Any
   * errors thrown by route handlers are caught and returned as JSON
   * responses. Preflight OPTIONS requests are handled immediately.
   *
   * @param {Request} req The incoming request
   * @param {any} env The worker environment
   */
  async fetch(req, env, ctx) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    const url = new URL(req.url);
    const pathname = url.pathname;
    const isApi =
      pathname.startsWith('/api/') ||
      pathname === '/submit-order' ||
      pathname.startsWith('/download/');
    try {
      if (isApi) {
        if (!env.DB) throw new Error('D1 binding "DB" missing');
        await ensureSchema(env);
        // Health check
        if (req.method === 'GET' && pathname === '/api/health') {
          return jsonResponse({ ok: true });
        }
        // Product routes
        if (req.method === 'GET' && pathname === '/api/products') {
          return listProducts(env);
        }
        if (req.method === 'GET' && pathname.startsWith('/api/product/')) {
          const id = pathname.split('/').pop();
          return getProduct(env, id);
        }
        if (req.method === 'POST' && pathname === '/api/product/save') {
          return saveProduct(req, env);
        }
        // Order routes
        if (req.method === 'POST' && (pathname === '/api/order/create' || pathname === '/submit-order')) {
          return saveEncryptedOrder(req, env);
        }
        if (req.method === 'POST' && pathname === '/api/order/archive-link') {
          return saveArchiveLink(req, env);
        }
        if (req.method === 'POST' && pathname === '/api/order/upload-encrypted-file') {
          return uploadEncryptedFileToArchive(req, env);
        }
        // Review routes
        if (req.method === 'POST' && pathname === '/api/reviews/add') {
          return addReview(req, env);
        }
        if (req.method === 'GET' && pathname.startsWith('/api/reviews/')) {
          const id = pathname.split('/').pop();
          return getReviews(env, id);
        }
        // Secure download
        if (req.method === 'GET' && pathname.startsWith('/download/')) {
          return handleSecureDownload(pathname, env);
        }
      }
      // Fallback to static assets when not an API request
      return handleStaticAsset(req, env);
    } catch (err) {
      return jsonResponse({ error: err.message || 'Server error' }, 500);
    }
  }
};