/**
 * Whop settings routes.
 *
 * These helpers provide a simple key/value storage for global Whop
 * configuration.  Settings are stored in the `settings` table using
 * the fixed key 'whop' and the JSON value of the configuration.  The
 * structure of the settings is not enforced by the database; any
 * serialisable object may be stored.  Consumers should validate
 * fields before using.
 */

import { jsonResponse } from './utils.js';

/**
 * Fetch the current Whop settings from the database.  If no settings
 * exist the returned object is empty.
 *
 * @param {any} env Worker environment
 */
export async function getWhopSettings(env) {
  const row = await env.DB.prepare(
    `SELECT value FROM settings WHERE key = 'whop'`
  ).first();
  let settings = {};
  if (row && row.value) {
    try {
      settings = JSON.parse(row.value);
    } catch (_) {
      settings = {};
    }
  }
  return jsonResponse({ settings });
}

/**
 * Save Whop settings into the database.  The request body must be
 * valid JSON.  The entire object is stored under the 'whop' key.
 *
 * @param {Request} req Incoming request with JSON body
 * @param {any} env Worker environment
 */
export async function saveWhopSettings(req, env) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }
  const json = JSON.stringify(body);
  await env.DB.prepare(
    `INSERT OR REPLACE INTO settings (key, value) VALUES ('whop', ?)`
  ).bind(json).run();
  return jsonResponse({ success: true });
}