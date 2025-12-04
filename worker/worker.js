/*
 * Cloudflare Worker script to fetch product data from Google Sheets and serve
 * JSON. The worker proxies the Google Sheets API, caches results on the edge
 * and adds CORS headers. This script is designed to remain under 300 lines.
 *
 * Benefits: running code at the edge reduces latency and avoids the need for
 * dedicated servers. Cloudflare Workers automatically scale and can cache
 * responses, improving performance【149665808505488†L13-L59】.
 */

// Customize these constants for your Google Sheets setup. Use Secrets in
// Cloudflare Dashboard to store sensitive information.
const SHEET_ID = '';
const API_KEY = '';
const RANGE = 'Sheet1!A1:Z100';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Handle incoming requests.
 * @param {Request} request
 */
async function handleRequest(request) {
  // Use default Cloudflare cache
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);
  // Try to serve from cache
  let response = await cache.match(cacheKey);
  if (response) {
    return addCors(response);
  }
  // Build the Google Sheets API URL
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}?key=${API_KEY}`;
  let data;
  try {
    const apiResp = await fetch(url);
    if (!apiResp.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch sheet' }), { status: 502, headers: { 'content-type': 'application/json' } });
    }
    data = await apiResp.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
  // Convert the spreadsheet rows into objects. Assumes first row contains keys.
  const values = data.values || [];
  const headers = values[0] || [];
  const products = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((key, i) => {
      obj[key] = row[i];
    });
    return obj;
  });
  response = new Response(JSON.stringify(products), {
    headers: {
      'content-type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
  // Put response in cache for future requests
  eventWaitUntil(cache.put(cacheKey, response.clone()));
  return addCors(response);
}

/**
 * Add CORS headers to allow browser requests from any origin.
 * @param {Response} response
 */
function addCors(response) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET');
  newHeaders.set('Access-Control-Max-Age', '86400');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/**
 * eventWaitUntil helper to ensure caching completes outside of request scope.
 * This avoids the "waitUntil" undefined error when running the worker locally.
 * In production Cloudflare environment, event.waitUntil is available on
 * FetchEvent. When testing, this function is a no-op.
 */
function eventWaitUntil(promise) {
  if (typeof event !== 'undefined' && typeof event.waitUntil === 'function') {
    event.waitUntil(promise);
  }
}