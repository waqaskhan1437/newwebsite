/**
 * Handler for secure download links. This module retrieves encrypted
 * content from archive.org, decrypts it using the stored secret key
 * and streams the original bytes back to the caller. If the order
 * record cannot be found or has no archive URL a 403/404 response is
 * returned respectively. Grouping this logic in a separate file keeps
 * the primary worker small.
 */

import { corsHeaders } from './utils.js';
import { decryptBytesWithIvPrefix } from './crypto.js';

/**
 * Resolve a download request. The path is expected to end with the
 * orderId. The worker looks up the corresponding archive_url in the
 * orders table and, if present, fetches and decrypts the video. The
 * decrypted content is served with a generic MP4 content type and
 * instructs the browser to download the file.
 *
 * @param {string} pathname Request pathname (e.g. /download/ABC123)
 * @param {any} env Worker environment with DB and secret key
 */
export async function handleSecureDownload(pathname, env) {
  if (!env.SECRET_KEY) {
    throw new Error('SECRET_KEY missing');
  }
  const orderId = pathname.split('/').pop();
  const order = await env.DB.prepare(
    `SELECT archive_url FROM orders WHERE order_id = ?`
  ).bind(orderId).first();
  if (!order || !order.archive_url) {
    return new Response('Link expired', { status: 403 });
  }
  const encRes = await fetch(order.archive_url);
  if (!encRes.ok) {
    return new Response('File missing', { status: 404 });
  }
  const decBuffer = await decryptBytesWithIvPrefix(await encRes.arrayBuffer(), env.SECRET_KEY);
  return new Response(decBuffer, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'video/mp4',
      'Content-Disposition': 'attachment; filename="video.mp4"'
    }
  });
}