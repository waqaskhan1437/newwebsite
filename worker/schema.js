/**
 * Database schema and migration helpers for the Cloudflare Worker.
 *
 * This module centralises the logic required to initialise and migrate the
 * D1 database used by the worker. Splitting it out of the main worker
 * script keeps the primary entry point small and easy to scan. The schema
 * definitions mirror those found in the original monolithic worker so
 * behaviour remains unchanged.
 */

// Track whether migrations have been applied. Exported for potential
// diagnostics but not intended for general use.
let schemaInitialized = false;

/**
 * Ensure the required tables and columns exist in the database. The schema
 * is idempotent – calling this repeatedly will not recreate tables or
 * columns that already exist. If no schema modifications are necessary
 * subsequent calls return immediately.
 *
 * @param {any} env The worker environment, containing the D1 DB binding
 */
export async function ensureSchema(env) {
  if (schemaInitialized) return;

  // Products table stores core product details including pricing and SEO
  // metadata. It uses sensible defaults for optional fields to avoid
  // unexpected nulls.
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      slug TEXT,
      description TEXT,
      normal_price REAL,
      sale_price REAL,
      instant_delivery INTEGER DEFAULT 0,
      normal_delivery_text TEXT,
      thumbnail_url TEXT,
      video_url TEXT,
      addons_json TEXT,
      seo_title TEXT,
      seo_description TEXT,
      seo_keywords TEXT,
      seo_canonical TEXT,
      status TEXT DEFAULT 'active',
      sort_order INTEGER DEFAULT 0
    );
  `).run();

  // Orders table holds encrypted customer orders. The archive_url column
  // references a location on archive.org once uploads complete.
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE,
      product_id INTEGER,
      encrypted_data TEXT,
      iv TEXT,
      archive_url TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `).run();

  // Reviews table stores user feedback for products. A status field allows
  // manual moderation.
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      author_name TEXT,
      rating INTEGER,
      comment TEXT,
      status TEXT DEFAULT 'approved',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `).run();

  // Additional columns may be added over time. This helper ensures they
  // exist without altering existing data. Without this, updates would
  // require manual migrations in the D1 dashboard.
  await ensureColumn(env, 'products', 'addons_json', 'TEXT');
  await ensureColumn(env, 'products', 'seo_title', 'TEXT');
  await ensureColumn(env, 'orders', 'archive_url', 'TEXT');

  schemaInitialized = true;
}

/**
 * Internal helper to add a column to a table if it is missing. It queries
 * the table schema via PRAGMA and adds the column when absent. Errors
 * during alteration are swallowed so repeated attempts do not throw.
 *
 * @param {any} env Worker environment with DB
 * @param {string} table Table name
 * @param {string} column Column name to ensure
 * @param {string} definition SQL definition for the column
 */
async function ensureColumn(env, table, column, definition) {
  try {
    const info = await env.DB.prepare(`PRAGMA table_info(${table});`).all();
    const exists = (info.results || []).some((col) => col.name === column);
    if (!exists) {
      await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`).run();
    }
  } catch (_) {
    // Intentionally ignore errors here. If the column already exists the
    // ALTER TABLE will throw but does not require action.
  }
}

// Named export allows optional inspection by other modules
export { schemaInitialized };