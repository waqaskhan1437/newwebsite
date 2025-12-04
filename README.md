# Lightweight Storefront Starter (Cloudflare Worker Backend)

This repository contains a minimal, lightweight storefront for digital products built with:

- Frontend: Static HTML, CSS and vanilla JS deployed on Cloudflare Pages.
- Data store: Google Sheets (Products, Orders, Reviews, Tips).
- CDN: Bunny for JSON and media delivery.
- Payments: Whop checkout via on-site popup modal using the Whop SDK.
- Backend glue: A single Cloudflare Worker that talks to Google Sheets and Bunny.

## Structure

- `src/frontend/index.html` — Product listing page that shows product cards.
- `src/frontend/product.html` — Single product page with a two-column layout.
- `src/frontend/order.html` — Order detail page with delivery, reviews and tip section.
- `src/frontend/css/base.css` — Base styles and typography.
- `src/frontend/css/layout.css` — Layout, grid and responsive rules.
- `src/frontend/js/home-page.js` — Logic for the product list page.
- `src/frontend/js/product-page.js` — Logic for the product detail and checkout.
- `src/frontend/js/order-page.js` — Logic for the order detail and tip flow.
- `src/frontend/js/ui-components.js` — Reusable UI helpers (cards, stars, etc).
- `src/frontend/js/api-client.js` — Helpers to fetch JSON from Bunny.
- `src/frontend/js/utils.js` — Small shared helpers.
- `src/backend/worker.js` — Cloudflare Worker that handles Whop webhooks, reviews and tips.

All executable code files are kept well below 300 lines. If any file grows near this limit, split it into smaller files instead of adding more lines.

## Backend overview (Cloudflare Worker)

The Worker exposes three HTTP POST endpoints:

- `POST /webhooks/whop`  
  Receives Whop order webhooks, builds an internal `order_id` and `public_order_token`, appends an order row into the `Orders` range in Google Sheets, then uploads a public `order_{token}.json` document to Bunny which is consumed by `order.html`.

- `POST /reviews/new`  
  Receives a new review payload, appends a row into the `Reviews` range in Google Sheets, and if `AUTO_APPROVE_REVIEWS="true"` is set, merges the new review into `reviews_{productId}.json` on Bunny.

- `POST /tips/new`  
  Receives a tip for an order, appends a row into the `Tips` range in Google Sheets and also increments `tips_total` in the corresponding `order_{token}.json` object on Bunny.

The Worker uses environment bindings for:

- `GOOGLE_SHEETS_ID` — Spreadsheet ID.
- `GOOGLE_SHEETS_TOKEN` — OAuth2 access token for Sheets API (service account or delegated).
- `SHEETS_ORDERS_RANGE` — Orders range, e.g. `Orders!A:N`.
- `SHEETS_REVIEWS_RANGE` — Reviews range, e.g. `Reviews!A:G`.
- `SHEETS_TIPS_RANGE` — Tips range, e.g. `Tips!A:E`.
- `BUNNY_STORAGE_BASE` — Storage API base URL for uploads, e.g. `https://storage.bunnycdn.com/your-zone/data`.
- `BUNNY_PUBLIC_BASE` — Public HTTP base used by the frontend, e.g. `https://your-zone.b-cdn.net/data`.
- `BUNNY_ACCESS_KEY` — Bunny storage access key.
- `DEFAULT_CURRENCY` — Fallback currency (e.g. `USD`).
- `WHOP_TIP_LISTING_ID` — Optional Whop listing used for tip checkout.
- `AUTO_APPROVE_REVIEWS` — `"true"` or `"false"`.

The frontend remains unchanged: it fetches `products.json`, `reviews_{productId}.json` and `order_{token}.json` from Bunny and renders the home, product and order pages. Whop checkout uses the popup modal SDK on `product.html` and redirects to `order.html?token=...` using the `public_order_token` returned by the Worker.
