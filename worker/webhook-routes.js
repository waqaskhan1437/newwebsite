/**
 * Whop webhook handler.
 *
 * This module exposes a single function, `handleWhopWebhook`, which
 * processes incoming webhook calls from Whop. The handler reads the
 * configured webhook secret from the `settings` table, verifies the
 * HMAC‑SHA256 signature provided in the `webhook-signature` header,
 * and logs the incoming event. No sensitive business logic is
 * performed here; it merely validates authenticity and returns a
 * simple acknowledgement. Consumers may extend this module to update
 * orders or memberships based on the event type. Keeping this file
 * under 200 lines ensures it remains easy to understand and
 * maintain.
 */

import { jsonResponse } from './utils.js';

/**
 * Verify the webhook signature using the secret, timestamp and raw
 * request body. The signature header is expected in the format
 * `v1,<base64_signature>` as per the Standard Webhooks spec used by
 * Whop. The input to the HMAC is a UTF‑8 string of
 * `${timestamp}.${body}`. The digest is then base64 encoded.
 *
 * @param {string} secret The webhook secret configured in settings
 * @param {string} timestamp The webhook timestamp header
 * @param {string} body The raw request body
 * @returns {Promise<boolean>} Whether the signature matches
 */
async function verifySignature(secret, timestamp, body, providedSig) {
  try {
    if (!secret || !timestamp || !providedSig) return false;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const data = encoder.encode(`${timestamp}.${body}`);
    const sigBuf = await crypto.subtle.sign('HMAC', key, data);
    const signature = btoa(
      String.fromCharCode(...new Uint8Array(sigBuf))
    );
    return signature === providedSig;
  } catch (_) {
    return false;
  }
}

/**
 * Handle incoming POST requests from Whop webhooks. This function
 * reads the headers and body, verifies the signature and logs
 * metadata. It always returns a 200 response quickly to prevent
 * unnecessary retries. Extend this handler to perform custom
 * behaviour based on `payload.type` or other fields.
 *
 * @param {Request} req Incoming request
 * @param {any} env Worker environment with DB
 */
export async function handleWhopWebhook(req, env) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
  // Fetch the webhook secret from settings
  let secret = '';
  try {
    const row = await env.DB.prepare(
      `SELECT value FROM settings WHERE key = 'whop'`
    ).first();
    if (row && row.value) {
      const cfg = JSON.parse(row.value);
      secret = cfg.webhook_secret || '';
    }
  } catch (_) {
    // ignore errors; secret remains empty
  }
  // Read headers for signature validation
  const signatureHeader = req.headers.get('webhook-signature') || '';
  const timestamp = req.headers.get('webhook-timestamp') || '';
  let providedSig = '';
  if (signatureHeader) {
    const parts = signatureHeader.split(',');
    if (parts.length >= 2) {
      providedSig = parts[1];
    }
  }
  const bodyText = await req.text();
  const verified = await verifySignature(secret, timestamp, bodyText, providedSig);
  let payload;
  try {
    payload = JSON.parse(bodyText || '{}');
  } catch (_) {
    payload = {};
  }
  // Log the event for debugging; in production you might update orders
  try {
    console.log('Received Whop webhook', {
      verified,
      type: payload.type,
      id: payload.id || (payload.data && payload.data.id),
    });
  } catch (_) {
    // console logging may fail on some platforms; ignore
  }
  // Acknowledge receipt. Do not reveal verification result to caller.
  return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
}