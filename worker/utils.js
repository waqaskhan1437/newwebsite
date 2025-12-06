/*
 * Utility helpers for the Cloudflare Worker.  Provides CORS headers
 * and a helper for returning JSON responses.  Also exposes a helper
 * for serving static assets via the ASSETS binding when present.
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

/**
 * Generate a JSON response.  Automatically stringifies the body and
 * applies the CORS and Content‑Type headers.
 *
 * @param {any} data JSON serialisable data
 * @param {number} status HTTP status code
 */
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Serve static assets from the ASSETS binding.  If the binding is
 * missing or fetch fails this function simply falls back to a plain
 * text response.  Keeping this helper separate reduces the size of
 * the main worker script.
 *
 * @param {Request} req The incoming request
 * @param {any} env The worker environment
 */
export async function handleStaticAsset(req, env) {
  if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
    return env.ASSETS.fetch(req);
  }
  return new Response('Secure Shop Worker Active', { headers: corsHeaders });
}