/*
 * Cloudflare Worker backend for the shop.  This single file handles
 * database schema creation, product APIs, encrypted order storage,
 * encrypted file uploads to archive.org and secure proxy downloads.
 * All helpers are defined inline and the entire file stays under 300
 * lines for readability and maintainability.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
let schemaInitialized = false;

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    const { pathname, searchParams } = new URL(req.url);
    try {
      await ensureSchema(env);
      // API routes
      if (req.method === 'GET' && pathname === '/api/health') return jsonResponse({ ok: true });
      if (req.method === 'GET' && pathname === '/api/products') return listProducts(env);
      if (req.method === 'GET' && pathname.startsWith('/api/product/')) {
        const id = pathname.split('/').pop();
        return getProduct(env, id);
      }
      if (req.method === 'POST' && (pathname === '/api/order/create' || pathname === '/submit-order')) {
        return saveEncryptedOrder(req, env);
      }
      if (req.method === 'POST' && pathname === '/api/order/archive-link') {
        return saveArchiveLink(req, env);
      }
      if (req.method === 'POST' && pathname === '/api/order/upload-encrypted-file') {
        return uploadEncryptedFileToArchive(req, env);
      }
      if (req.method === 'GET' && pathname.startsWith('/download/')) {
        return handleSecureDownload(pathname, env);
      }
      return new Response('Secure Shop Worker Active', { headers: corsHeaders });
    } catch (err) {
      return jsonResponse({ error: err.message || 'Server error' }, 500);
    }
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// --- Schema auto‑creation and migrations ---
async function ensureSchema(env) {
  if (schemaInitialized) return;
  // Create base tables
  await env.DB.exec(`
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
      status TEXT DEFAULT 'active',
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS product_addons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      group_key TEXT,
      group_label TEXT,
      item_label TEXT,
      item_type TEXT,
      item_price REAL,
      placeholder TEXT,
      options_json TEXT,
      group_order INTEGER DEFAULT 0,
      item_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE,
      product_id INTEGER,
      encrypted_data TEXT,
      iv TEXT,
      archive_url TEXT
    );
  `);
  // Add missing columns if tables existed from previous versions
  await ensureColumn(env, 'products', 'thumbnail_url', 'TEXT');
  await ensureColumn(env, 'products', 'video_url', 'TEXT');
  await ensureColumn(env, 'products', 'status', "TEXT DEFAULT 'active'");
  await ensureColumn(env, 'products', 'sort_order', 'INTEGER DEFAULT 0');
  await ensureColumn(env, 'product_addons', 'group_order', 'INTEGER DEFAULT 0');
  await ensureColumn(env, 'product_addons', 'item_order', 'INTEGER DEFAULT 0');
  await ensureColumn(env, 'orders', 'product_id', 'INTEGER');
  await ensureColumn(env, 'orders', 'archive_url', 'TEXT');
  schemaInitialized = true;
}

async function ensureColumn(env, table, column, definition) {
  const info = await env.DB.prepare(`PRAGMA table_info(${table});`).all();
  const exists = (info.results || []).some(col => col.name === column);
  if (!exists) await env.DB.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
}

// --- Product APIs ---
async function listProducts(env) {
  const res = await env.DB.prepare(
    `SELECT id, title, slug, normal_price, sale_price, thumbnail_url FROM products WHERE status = 'active' ORDER BY sort_order ASC`
  ).all();
  return jsonResponse({ products: res.results || [] });
}

async function getProduct(env, id) {
  if (!id) return jsonResponse({ error: 'Missing product id' }, 400);
  const product = await env.DB.prepare(
    `SELECT id, title, slug, description, normal_price, sale_price, instant_delivery, normal_delivery_text, thumbnail_url, video_url
     FROM products WHERE id = ?`
  ).bind(id).first();
  if (!product) return jsonResponse({ error: 'Product not found' }, 404);
  const addonsRes = await env.DB.prepare(
    `SELECT id, group_key, group_label, item_label, item_type, item_price, placeholder, options_json, group_order, item_order
     FROM product_addons WHERE product_id = ? ORDER BY group_order ASC, item_order ASC`
  ).bind(id).all();
  const grouped = (addonsRes.results || []).reduce((acc, row) => {
    const k = row.group_key || 'default';
    if (!acc[k]) acc[k] = { groupKey: row.group_key, label: row.group_label, items: [] };
    acc[k].items.push({ id: row.id, label: row.item_label, type: row.item_type, price: row.item_price, placeholder: row.placeholder, options: row.options_json ? JSON.parse(row.options_json) : null });
    return acc;
  }, {});
  return jsonResponse({ product, addons: Object.values(grouped) });
}

// --- Order APIs ---
async function saveEncryptedOrder(req, env) {
  if (!env.SECRET_KEY) throw new Error('SECRET_KEY missing');
  const body = await req.json();
  const productId = body.productId ?? body.product_id ?? body.product;
  if (!productId) throw new Error('productId missing for order');
  const orderId = body.orderId || crypto.randomUUID();
  const sensitive = JSON.stringify({ email: body.email, amount: body.amount, productId, status: 'PAID', addons: body.addons || null });
  const { encrypted, iv } = await encryptData(sensitive, env.SECRET_KEY);
  await env.DB.prepare(
    `INSERT INTO orders (order_id, product_id, encrypted_data, iv) VALUES (?, ?, ?, ?) ON CONFLICT(order_id) DO UPDATE SET product_id = excluded.product_id, encrypted_data = excluded.encrypted_data, iv = excluded.iv`
  ).bind(orderId, productId, encrypted, iv).run();
  return jsonResponse({ success: true, orderId });
}

async function saveArchiveLink(req, env) {
  const body = await req.json();
  const { orderId, archiveUrl } = body;
  if (!orderId || !archiveUrl) return jsonResponse({ error: 'orderId / archiveUrl missing' }, 400);
  await env.DB.prepare(`UPDATE orders SET archive_url = ? WHERE order_id = ?`).bind(archiveUrl, orderId).run();
  return jsonResponse({ success: true });
}

async function uploadEncryptedFileToArchive(req, env) {
  if (!env.SECRET_KEY) throw new Error('SECRET_KEY missing');
  if (!env.ARCHIVE_ACCESS_KEY || !env.ARCHIVE_SECRET_KEY) throw new Error('archive keys missing');
  const url = new URL(req.url);
  const orderId = url.searchParams.get('orderId');
  const itemId = url.searchParams.get('itemId');
  const filename = url.searchParams.get('filename') || 'file.bin';
  if (!orderId || !itemId) return jsonResponse({ error: 'orderId / itemId missing' }, 400);
  const fileBuffer = await req.arrayBuffer();
  if (!fileBuffer || fileBuffer.byteLength === 0) return jsonResponse({ error: 'empty file body' }, 400);
  const encryptedBuffer = await encryptBytesWithIvPrefix(fileBuffer, env.SECRET_KEY);
  const s3Url = `https://s3.us.archive.org/${itemId}/${filename}`;
  const auth = `LOW ${env.ARCHIVE_ACCESS_KEY}:${env.ARCHIVE_SECRET_KEY}`;
  const resp = await fetch(s3Url, { method: 'PUT', headers: { Authorization: auth, 'Content-Type': 'application/octet-stream' }, body: encryptedBuffer });
  if (!resp.ok) return jsonResponse({ error: 'archive upload failed', status: resp.status }, 502);
  const publicUrl = `https://archive.org/download/${itemId}/${filename}`;
  await env.DB.prepare(`UPDATE orders SET archive_url = ? WHERE order_id = ?`).bind(publicUrl, orderId).run();
  return jsonResponse({ success: true, archiveUrl: publicUrl });
}

// --- Secure download and decryption ---
async function handleSecureDownload(pathname, env) {
  if (!env.SECRET_KEY) throw new Error('SECRET_KEY missing');
  const orderId = pathname.split('/').pop();
  const order = await env.DB.prepare(`SELECT order_id, archive_url FROM orders WHERE order_id = ?`).bind(orderId).first();
  if (!order || !order.archive_url) return new Response('Invalid or expired link', { status: 403 });
  const encRes = await fetch(order.archive_url);
  if (!encRes.ok) return new Response('File not available', { status: 502 });
  const encBuffer = await encRes.arrayBuffer();
  const decBuffer = await decryptBytesWithIvPrefix(encBuffer, env.SECRET_KEY);
  return new Response(decBuffer, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'video/mp4', 'Content-Disposition': 'attachment; filename="secure-video.mp4"' } });
}

// --- Crypto helpers ---
async function deriveAesKey(password) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode('universal-salt'), iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function encryptData(text, password) {
  const enc = new TextEncoder();
  const key = await deriveAesKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  return { encrypted: btoa(String.fromCharCode(...new Uint8Array(ct))), iv: btoa(String.fromCharCode(...iv)) };
}

async function decryptData(encryptedBase64, ivBase64, password) {
  const enc = new TextEncoder();
  const key = await deriveAesKey(password);
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
  const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  return JSON.parse(new TextDecoder().decode(plain));
}

async function encryptBytesWithIvPrefix(buf, password) {
  const key = await deriveAesKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buf);
  const encBytes = new Uint8Array(enc);
  const out = new Uint8Array(iv.length + encBytes.length);
  out.set(iv, 0);
  out.set(encBytes, iv.length);
  return out.buffer;
}

async function decryptBytesWithIvPrefix(buf, password) {
  const key = await deriveAesKey(password);
  const all = new Uint8Array(buf);
  if (all.length < 13) throw new Error('encrypted payload too small');
  const iv = all.slice(0, 12);
  const ct = all.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return pt;
}