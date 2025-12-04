export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET") {
      if (url.pathname === "/" || url.pathname === "/index.html") {
        return renderHome(env, url);
      }
      if (url.pathname === "/product" || url.pathname === "/product.html") {
        return renderProductPage(env, url);
      }
      if (url.pathname === "/order" || url.pathname === "/order.html") {
        return renderOrderPage(env, url);
      }
    }
    if (request.method === "POST") {
      if (url.pathname === "/webhooks/whop") {
        return handleWhopWebhook(request, env);
      }
      if (url.pathname === "/reviews/new") {
        return handleNewReview(request, env);
      }
      if (url.pathname === "/tips/new") {
        return handleNewTip(request, env);
      }
    }
    return new Response("Not found", { status: 404 });
  }
};

function htmlResponse(body, status) {
  return new Response(body, {
    status: status || 200,
    headers: { "Content-Type": "text/html;charset=utf-8" }
  });
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "Content-Type": "application/json" }
  });
}

function randomId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("fetch failed " + res.status);
  return res.json();
}

function bunnyBase(env) {
  return (env.BUNNY_PUBLIC_BASE || "").replace(/\/$/, "");
}

/* ---------- SEO SSR: HOME PAGE ---------- */

function renderProductCardHtml(p) {
  const thumb =
    Array.isArray(p.thumbnail_urls) && p.thumbnail_urls.length
      ? `<img src="${esc(p.thumbnail_urls[0])}" alt="${esc(
          p.title || "Product thumbnail"
        )}">`
      : "";
  const price = typeof p.price === "number" ? p.price.toFixed(2) : esc(p.price || "0.00");
  const delivery = esc(p.delivery_time || "Instant");
  return `
<article class="card">
  <div class="card-media">${thumb}</div>
  <h3 class="card-title">${esc(p.title || "Untitled product")}</h3>
  <p class="card-description">${esc(p.short_description || "")}</p>
  <div class="card-meta">
    <span class="price-tag">$${price}</span>
    <span class="delivery-tag">${delivery}</span>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:.75rem">
    <span class="badge">Digital delivery</span>
    <a class="btn btn-primary" href="/product.html?id=${encodeURIComponent(
      p.id
    )}">View details</a>
  </div>
</article>`;
}

async function renderHome(env, url) {
  const base = bunnyBase(env);
  let products = [];
  try {
    products = await fetchJson(base + "/products.json");
  } catch (e) {}
  const cardsHtml =
    Array.isArray(products) && products.length
      ? products.map(renderProductCardHtml).join("")
      : `<div class="error-message">No products available yet.</div>`;
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Storefront - Digital Products</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="Lightweight digital products storefront with instant delivery and secure Whop checkout.">
  <link rel="stylesheet" href="/css/base.css">
  <link rel="stylesheet" href="/css/layout.css">
</head>
<body class="page page-home">
<header class="site-header">
  <div class="container header-inner">
    <h1 class="logo"><a href="/">Storefront</a></h1>
    <nav class="nav">
      <a href="/" class="nav-link is-active">Products</a>
    </nav>
  </div>
</header>
<main class="site-main">
  <section class="hero">
    <div class="container">
      <h2 class="hero-title">Digital products, delivered instantly</h2>
      <p class="hero-subtitle">Browse curated products with fast, automated delivery.</p>
    </div>
  </section>
  <section class="product-list-section">
    <div class="container">
      <div class="product-grid">
        ${cardsHtml}
      </div>
    </div>
  </section>
</main>
<footer class="site-footer">
  <div class="container">
    <p class="footer-text">&copy; ${new Date().getFullYear()} Storefront. All rights reserved.</p>
  </div>
</footer>
<script src="/js/utils.js" defer></script>
<script src="/js/api-client.js" defer></script>
<script src="/js/ui-components.js" defer></script>
<script src="/js/home-page.js" defer></script>
</body>
</html>`;
  return htmlResponse(html);
}

/* ---------- SEO SSR: PRODUCT PAGE ---------- */

function renderReviewListHtml(reviews) {
  if (!Array.isArray(reviews) || !reviews.length) {
    return {
      summary: `<span>No reviews yet.</span>`,
      list: ""
    };
  }
  const sum = reviews.reduce((s, r) => s + Number(r.rating || 0), 0);
  const avg = sum / reviews.length;
  const stars = Math.round(avg);
  const starHtml = Array.from({ length: 5 })
    .map((_, i) => `<span class="star${i < stars ? " is-filled" : ""}">★</span>`)
    .join("");
  const summary = `<span class="star-row">${starHtml}</span><span> ${avg.toFixed(
    1
  )} (${reviews.length} reviews)</span>`;
  const list = reviews
    .map((r) => {
      return `<article class="review-card">
  <div class="review-header">
    <span class="review-author">${esc(r.name || "Anonymous")}</span>
    <span class="review-date">${esc(r.created_at || "")}</span>
  </div>
  <div class="star-row">
    ${Array.from({ length: 5 })
      .map(
        (_, i) =>
          `<span class="star${i < Number(r.rating || 0) ? " is-filled" : ""}">★</span>`
      )
      .join("")}
  </div>
  <p>${esc(r.comment || "")}</p>
</article>`;
    })
    .join("");
  return { summary, list };
}

function renderAddonListHtml(product) {
  let addons = product.addons || [];
  if (typeof addons === "string") {
    try {
      addons = JSON.parse(addons);
    } catch (e) {
      addons = [];
    }
  }
  if (!Array.isArray(addons) || !addons.length) return "";
  const rows = addons
    .map((a, idx) => {
      const price =
        typeof a.price === "number" ? a.price.toFixed(2) : esc(a.price || "0.00");
      return `<div class="addon-item">
  <label class="addon-label" for="addon-${idx}">
    <input type="checkbox" id="addon-${idx}" data-addon-id="${esc(
        a.id || String(idx)
      )}">
    <span>${esc(a.label || "Addon")}</span>
  </label>
  <span>$${price}</span>
</div>`;
    })
    .join("");
  return `<p style="font-size:.9rem;opacity:.85">Optional addons:</p>${rows}`;
}

function renderMediaBlockHtml(product) {
  const url = product.media_url;
  if (!url) {
    return `<p>Preview not available.</p>`;
  }
  if (/\.(mp4|webm)$/i.test(url)) {
    return `<video controls src="${esc(url)}"></video>`;
  }
  if (/\.(mp3|wav)$/i.test(url)) {
    return `<audio controls src="${esc(url)}"></audio>`;
  }
  return `<iframe src="${esc(
    url
  )}" loading="lazy" frameborder="0" style="width:100%;min-height:260px"></iframe>`;
}

function renderThumbsHtml(product) {
  let urls = Array.isArray(product.thumbnail_urls)
    ? product.thumbnail_urls.slice()
    : [];
  if (product.media_url && !urls.includes(product.media_url)) {
    urls.unshift(product.media_url);
  }
  if (!urls.length) return "";
  return urls
    .map((u, idx) => {
      return `<button type="button" class="product-thumbnail${
        idx === 0 ? " is-active" : ""
      }">
  <img src="${esc(u)}" alt="${esc(product.title || "Product thumbnail")}">
</button>`;
    })
    .join("");
}

async function renderProductPage(env, url) {
  const id = url.searchParams.get("id");
  if (!id) return htmlResponse("<h1>Missing product id</h1>", 400);
  const base = bunnyBase(env);
  let products = [];
  try {
    products = await fetchJson(base + "/products.json");
  } catch (e) {}
  const p = Array.isArray(products)
    ? products.find((x) => String(x.id) === String(id))
    : null;
  if (!p) return htmlResponse("<h1>Product not found</h1>", 404);
  let reviews = [];
  try {
    reviews = await fetchJson(
      base + "/reviews_" + encodeURIComponent(String(p.id)) + ".json"
    );
  } catch (e) {}
  const { summary, list } = renderReviewListHtml(reviews);
  const price = typeof p.price === "number" ? p.price.toFixed(2) : esc(p.price || "0.00");
  const delivery = esc(p.delivery_time || "Instant");
  const addonsHtml = renderAddonListHtml(p);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${esc(p.title || "Product")} - Storefront</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${esc(
    p.short_description || p.long_description || ""
  )}">
  <link rel="stylesheet" href="/css/base.css">
  <link rel="stylesheet" href="/css/layout.css">
</head>
<body class="page page-product">
<header class="site-header">
  <div class="container header-inner">
    <h1 class="logo"><a href="/">Storefront</a></h1>
  </div>
</header>
<main class="site-main">
  <div class="container">
    <div class="product-layout two-column">
      <div class="product-left">
        <div class="product-media">
          ${renderMediaBlockHtml(p)}
        </div>
        <div class="product-thumbnails">
          ${renderThumbsHtml(p)}
        </div>
        <section class="product-description">
          <h2>Description</h2>
          <div>${esc(p.long_description || p.short_description || "")}</div>
        </section>
        <section class="product-reviews">
          <header class="section-header">
            <h2>Reviews</h2>
            <div class="review-summary">${summary}</div>
          </header>
          <div class="reviews-list">
            ${list}
          </div>
        </section>
      </div>
      <aside class="product-right">
        <div class="product-summary-card">
          <h1 class="product-title">${esc(p.title || "Product")}</h1>
          <div class="product-meta-line">
            <span class="product-delivery-time">${delivery}</span>
            <span class="dot-separator">&middot;</span>
            <span class="product-price">$${price}</span>
          </div>
          <p class="product-delivery-note">${esc(
            p.digital_delivery_note || "Digital product, no physical shipment."
          )}</p>
          <div class="product-addons">
            ${addonsHtml}
          </div>
          <button id="buy-button" class="btn btn-primary" data-product-id="${esc(
            p.id
          )}">Buy now</button>
          <p class="small-note">Secure checkout powered by Whop.</p>
        </div>
      </aside>
    </div>
  </div>
</main>
<footer class="site-footer">
  <div class="container">
    <p class="footer-text">&copy; ${new Date().getFullYear()} Storefront.</p>
  </div>
</footer>
<script src="/js/utils.js" defer></script>
<script src="/js/api-client.js" defer></script>
<script src="/js/ui-components.js" defer></script>
<script src="/js/product-page.js" defer></script>
</body>
</html>`;
  return htmlResponse(html);
}

/* ---------- SEO SSR: ORDER PAGE ---------- */

async function renderOrderPage(env, url) {
  const token = url.searchParams.get("token");
  if (!token) return htmlResponse("<h1>Missing order token</h1>", 400);
  const base = bunnyBase(env);
  let order;
  try {
    order = await fetchJson(
      base + "/order_" + encodeURIComponent(String(token)) + ".json"
    );
  } catch (e) {
    return htmlResponse("<h1>Order not found</h1>", 404);
  }
  let reviews = [];
  if (order.product_id) {
    try {
      reviews = await fetchJson(
        base +
          "/reviews_" +
          encodeURIComponent(String(order.product_id)) +
          ".json"
      );
    } catch (e) {}
  }
  const { summary, list } = renderReviewListHtml(reviews);
  const amount =
    typeof order.amount === "number"
      ? order.amount.toFixed(2)
      : esc(order.amount || "0.00");
  const statusText = esc(order.status || "paid");
  const deliverySection = renderOrderDeliverySection(order);
  const tipSection = renderOrderTipSection(order);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Your order - Storefront</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,follow">
  <link rel="stylesheet" href="/css/base.css">
  <link rel="stylesheet" href="/css/layout.css">
</head>
<body class="page page-order">
<header class="site-header">
  <div class="container header-inner">
    <h1 class="logo"><a href="/">Storefront</a></h1>
  </div>
</header>
<main class="site-main">
  <div class="container">
    <section class="order-layout">
      <section class="order-card">
        <div class="order-main">
          <h1 class="order-title">${esc(order.product_title || "Your order")}</h1>
          <div class="order-status">
            <span class="order-status-pill">${statusText}</span>
          </div>
          <ul class="order-summary-list">
            <li>Order ID: ${esc(order.public_order_token || order.order_id || "")}</li>
            <li>Placed at: ${esc(order.created_at || "")}</li>
            <li>Total: $${amount}</li>
          </ul>
          ${deliverySection}
        </div>
        <div class="order-sidebar">
          <h3>Reviews</h3>
          <div class="review-summary">${summary}</div>
          <div class="reviews-list">${list}</div>
          ${tipSection}
        </div>
      </section>
    </section>
  </div>
</main>
<footer class="site-footer">
  <div class="container">
    <p class="footer-text">&copy; ${new Date().getFullYear()} Storefront.</p>
  </div>
</footer>
<script src="/js/utils.js" defer></script>
<script src="/js/api-client.js" defer></script>
<script src="/js/ui-components.js" defer></script>
<script src="/js/order-page.js" defer></script>
</body>
</html>`;
  return htmlResponse(html);
}

function renderOrderDeliverySection(order) {
  let meta;
  if (order.status === "delivered") {
    meta = "Your order is ready.";
  } else if (order.delivery_eta) {
    meta = "Estimated delivery: " + order.delivery_eta;
  } else {
    meta = "Your order is being processed.";
  }
  let content = "";
  if (order.status === "delivered" && order.delivery_link) {
    const url = order.delivery_link;
    if (order.delivery_type === "video" || /\.(mp4|webm)$/i.test(url)) {
      content = `<div class="order-delivery-player"><video controls src="${esc(
        url
      )}"></video></div>`;
    } else if (order.delivery_type === "audio" || /\.(mp3|wav)$/i.test(url)) {
      content = `<div class="order-delivery-player"><audio controls src="${esc(
        url
      )}"></audio></div>`;
    } else {
      content = `<div class="order-delivery-player"><a class="btn btn-primary" target="_blank" rel="noopener noreferrer" href="${esc(
        url
      )}">Open delivery</a></div>`;
    }
  }
  return `<div class="order-delivery-section">
  <div class="order-delivery-heading">Delivery</div>
  <div class="order-delivery-meta">${esc(meta)}</div>
  ${content}
</div>`;
}

function renderOrderTipSection(order) {
  if (!order.can_tip) return "";
  const total =
    typeof order.tips_total === "number"
      ? order.tips_total.toFixed(2)
      : order.tips_total
      ? esc(order.tips_total)
      : null;
  const totalHtml = total
    ? `<p style="margin-top:.5rem;font-size:.85rem;opacity:.85">Total tips so far: $${total}</p>`
    : "";
  return `<div class="tip-section">
  <div style="font-size:.95rem">Enjoying your purchase? Leave a tip.</div>
  <div class="tip-buttons">
    <button type="button" class="btn btn-ghost tip-amount-btn" data-tip="3">$3</button>
    <button type="button" class="btn btn-ghost tip-amount-btn" data-tip="5">$5</button>
    <button type="button" class="btn btn-ghost tip-amount-btn" data-tip="10">$10</button>
  </div>
  ${totalHtml}
</div>`;
}

/* ---------- BACKEND: SHEETS + BUNNY + WHOP ---------- */

async function appendRowToSheet(env, range, values) {
  if (!env.GOOGLE_SHEETS_ID || !env.GOOGLE_SHEETS_TOKEN) {
    throw new Error("Sheets env not configured");
  }
  const base = "https://sheets.googleapis.com/v4/spreadsheets/";
  const url =
    base +
    encodeURIComponent(env.GOOGLE_SHEETS_ID) +
    "/values/" +
    encodeURIComponent(range) +
    ":append?valueInputOption=RAW";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.GOOGLE_SHEETS_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values: [values] })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("Sheets append failed: " + res.status + " " + text);
  }
}

async function uploadToBunny(env, path, content) {
  if (!env.BUNNY_STORAGE_BASE || !env.BUNNY_ACCESS_KEY) {
    throw new Error("Bunny env not configured");
  }
  const url = env.BUNNY_STORAGE_BASE.replace(/\/$/, "") + path;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      AccessKey: env.BUNNY_ACCESS_KEY,
      "Content-Type": "application/json"
    },
    body: content
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("Bunny upload failed: " + res.status + " " + text);
  }
}

async function handleWhopWebhook(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  const whopOrderId = String(body.id || body.order_id || "");
  if (!whopOrderId) {
    return jsonResponse({ error: "missing_order_id" }, 400);
  }
  const internalOrderId = body.internal_order_id || randomId();
  const publicToken = body.public_order_token || randomId();
  const productId =
    body.product_id || (body.metadata && body.metadata.productId) || "";
  const productTitle =
    body.product_title || (body.product && body.product.title) || "";
  const buyerEmail = (body.customer && body.customer.email) || "";
  const amount = Number(body.amount || body.total || 0);
  const currency = body.currency || env.DEFAULT_CURRENCY || "USD";
  const status = body.status || "paid";
  const deliveryLink = body.delivery_link || "";
  const deliveryType = body.delivery_type || "";
  const deliveryEta = body.delivery_eta || "";
  const nowIso = new Date().toISOString();
  const row = [
    internalOrderId,
    whopOrderId,
    publicToken,
    productId,
    productTitle,
    buyerEmail,
    amount,
    currency,
    status,
    deliveryLink,
    deliveryType,
    deliveryEta,
    nowIso,
    nowIso
  ];
  if (env.GOOGLE_SHEETS_TOKEN) {
    try {
      await appendRowToSheet(
        env,
        env.SHEETS_ORDERS_RANGE || "Orders!A:O",
        row
      );
    } catch (err) {
      console.error("Sheets append failed", err);
    }
  }
  const orderJson = {
    public_order_token: publicToken,
    order_id: internalOrderId,
    product_id: productId,
    product_title: productTitle,
    status,
    amount,
    currency,
    created_at: nowIso,
    delivery_eta: deliveryEta,
    delivery_link: deliveryLink,
    delivery_type: deliveryType,
    can_tip: true,
    tips_total: 0,
    whop_tip_listing_id: env.WHOP_TIP_LISTING_ID || null
  };
  try {
    await uploadToBunny(
      env,
      "/order_" + encodeURIComponent(publicToken) + ".json",
      JSON.stringify(orderJson)
    );
  } catch (err2) {
    console.error("Bunny upload failed", err2);
  }
  return jsonResponse({ ok: true, token: publicToken });
}

async function handleNewReview(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  const productId = body.product_id;
  const rating = Number(body.rating);
  if (!productId || !rating) {
    return jsonResponse({ error: "missing_fields" }, 400);
  }
  const reviewId = randomId();
  const name = body.name || "Anonymous";
  const comment = body.comment || "";
  const createdAt = new Date().toISOString();
  const row = [reviewId, productId, rating, comment, name, createdAt, false];
  if (env.GOOGLE_SHEETS_TOKEN) {
    try {
      await appendRowToSheet(
        env,
        env.SHEETS_REVIEWS_RANGE || "Reviews!A:G",
        row
      );
    } catch (err) {
      console.error("Sheets append failed", err);
    }
  }
  if (env.AUTO_APPROVE_REVIEWS === "true") {
    const reviewObj = {
      review_id: reviewId,
      product_id: productId,
      rating,
      comment,
      name,
      created_at: createdAt
    };
    try {
      await mergeReviewIntoBunny(env, productId, reviewObj);
    } catch (err2) {
      console.error("Bunny review merge failed", err2);
    }
  }
  return jsonResponse({ ok: true, review_id: reviewId });
}

async function mergeReviewIntoBunny(env, productId, review) {
  if (!env.BUNNY_PUBLIC_BASE) return;
  const base = env.BUNNY_PUBLIC_BASE.replace(/\/$/, "");
  const path = "/reviews_" + encodeURIComponent(productId) + ".json";
  let list = [];
  try {
    const res = await fetch(base + path, {
      headers: { Accept: "application/json" }
    });
    if (res.ok) {
      list = await res.json();
    }
  } catch (err) {
    console.error("Fetch existing reviews failed", err);
  }
  if (!Array.isArray(list)) list = [];
  list.push(review);
  await uploadToBunny(env, path, JSON.stringify(list));
}

async function handleNewTip(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  const token = body.order_token || body.public_order_token;
  const amount = Number(body.amount);
  if (!token || !amount) {
    return jsonResponse({ error: "missing_fields" }, 400);
  }
  const tipId = randomId();
  const createdAt = new Date().toISOString();
  const row = [tipId, token, amount, body.method || "Whop", createdAt];
  if (env.GOOGLE_SHEETS_TOKEN) {
    try {
      await appendRowToSheet(env, env.SHEETS_TIPS_RANGE || "Tips!A:E", row);
    } catch (err) {
      console.error("Sheets append failed", err);
    }
  }
  try {
    await incrementTipsOnOrder(env, token, amount);
  } catch (err2) {
    console.error("Increment tips failed", err2);
  }
  return jsonResponse({ ok: true, tip_id: tipId });
}

async function incrementTipsOnOrder(env, token, amount) {
  if (!env.BUNNY_PUBLIC_BASE) return;
  const base = env.BUNNY_PUBLIC_BASE.replace(/\/$/, "");
  const path = "/order_" + encodeURIComponent(token) + ".json";
  let order;
  try {
    const res = await fetch(base + path, {
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return;
    order = await res.json();
  } catch (err) {
    console.error("Fetch order failed", err);
    return;
  }
  const current = Number(order.tips_total || 0);
  order.tips_total = current + Number(amount || 0);
  await uploadToBunny(env, path, JSON.stringify(order));
}
