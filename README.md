# Digital Product Website

This project is a lightweight template for selling digital products with a modern stack.  It uses **Google Sheets** as a simple backend for product data, **Bunny CDN** for hosting generated JSON files, **Cloudflare Workers** to serve API responses and cache data at the edge, and **Whop** for payment processing.  Every file in the repository is intentionally kept under **300 lines** to keep the code base clear and maintainable.

## Architecture overview

| Component | Description |
|---|---|
| Google Sheets | The product data is stored in a spreadsheet.  A Cloudflare Worker reads data from the Google Sheets API via the `spreadsheets.values.get` endpoint (`GET https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}`【239893825644479†L255-L261】) and transforms it into JSON for the frontend. |
| Bunny CDN | After editing products in the admin dashboard, a Node script uploads the generated JSON to Bunny storage using the documented PUT endpoint.  Bunny’s API requires sending a PUT request to `https://REGION.bunnycdn.com/STORAGE_ZONE/FILENAME` with `AccessKey` and `Content‑Type` headers【299689045478259†L264-L276】. |
| Cloudflare Workers | A serverless function runs at Cloudflare’s edge to proxy requests to Google Sheets and return product JSON with caching.  Workers provide low‑latency responses, handle CORS and caching and automatically scale without dedicated servers【149665808505488†L13-L59】. |
| Frontend | A simple two‑column product page (`frontend/index.html`) loads product data from the JSON and renders media (video/thumbnails), description, addons and reviews.  It embeds Whop checkout by including the Whop loader script and a div with `data-whop-checkout-plan-id`【617832647045324†L561-L590】. |
| Admin dashboard | The dashboard (`admin/admin.html`) lists products and offers a form with tabs for **Info**, **Media**, **Addons** and **Email**.  Users can create or edit products, manage thumbnails, build addon groups (with different field types such as text, quantity, dropdown, checkbox, radio, or long text), and define a custom email template.  Products are saved to `localStorage` for demo purposes; in a real deployment you would push JSON to Bunny and update your Google Sheet. |

## File structure

- **frontend/** – Contains the public product page.
  - `index.html`: HTML skeleton with a two‑column layout.  It includes the Whop checkout loader script and placeholders for product data.
  - `product.css`: Minimal styling for layout, media, addons and reviews, including sale/old price formatting.
  - `product.js`: Fetches product JSON (`json/sample-product.json` in this demo) and populates the page.  It updates document title/description, displays video, thumbnails, description, addons and reviews, and sets the Whop plan ID.
- **admin/** – Contains the admin dashboard for managing products.
  - `admin.html`: A dashboard with a product list and a form split into tabs: Info (title, SEO fields, price, delivery), Media (video URL, thumbnail list), Addons (builder for addon groups and fields), and Email (custom email template).
  - `admin.css`: Styles for the dashboard, product list, tabs and the dynamic addon builder.
  - `admin.js`: Implements product listing, editing/creation, tab switching, thumbnail management, and a basic addon builder with group and item management.  It stores products in `localStorage` for demonstration.
- **json/** – Example data.
  - `sample-product.json`: A sample product used by the frontend.  It contains title, SEO fields, pricing, media, addons and reviews.
- **worker/** – Cloudflare Worker code.
  - `worker.js`: Fetches data from Google Sheets and responds with JSON, caching results at the edge.  It also adds CORS headers so that the frontend can request it from any domain.
- **scripts/** – Helper scripts.
  - `upload_bunny.js`: Node script to upload a JSON file to Bunny CDN.  It reads command‑line flags for the local file path, storage zone, region and access key and sends a PUT request as described above【299689045478259†L264-L276】.
- `README.md`: This file.

## Workflow

1. **Edit products**: Open `admin/admin.html` in your browser.  Use the product list to edit or add products.  In the Info tab you can set titles, SEO fields, pricing, instant delivery and delivery time.  The Media tab lets you provide a video URL and add thumbnail URLs.  The Addons tab allows you to create groups (e.g., “Extra Materials”) and add items for each group, choosing the type of field your users will see (text, quantity, dropdown, checkbox, radio button or long text).  The Email tab lets you define a custom email template that will be sent after purchase.

2. **Export data**: When you save a product, the admin script builds a JSON object and stores it in the browser’s local storage.  To deploy this data, export it from your browser (or modify the script to write to a file) and use the Node script in `scripts/upload_bunny.js` to upload the JSON to Bunny CDN.  For example:

   ```bash
   node scripts/upload_bunny.js --file ./digital-product-site/json/sample-product.json \
     --zone YOUR_STORAGE_ZONE --region REGION --key YOUR_ACCESS_KEY --dest product.json
   ```

   Replace `YOUR_STORAGE_ZONE`, `REGION` and `YOUR_ACCESS_KEY` with your Bunny credentials.  The script performs a PUT request with the `AccessKey` header to upload the file【299689045478259†L264-L276】.

3. **Serve via Cloudflare Worker**: Deploy the `worker/worker.js` file as a Cloudflare Worker.  Set environment variables (`SHEET_ID`, `API_KEY`, `RANGE`) in the Worker’s settings.  When a request comes in, the worker fetches product data from the specified Google Sheet using the `spreadsheets.values.get` API【239893825644479†L255-L261】, transforms rows into JSON objects and caches the result.  Cloudflare Workers run at the edge and automatically scale, providing low‑latency and caching benefits【149665808505488†L13-L59】.

4. **Frontend consumption**: The product page (`frontend/index.html`) loads the JSON from your Bunny CDN URL or Worker endpoint via `product.js` and renders the product.  It also sets the `data-whop-checkout-plan-id` on the Whop embed container so that the checkout iframe loads the correct plan【617832647045324†L561-L590】.

5. **SEO and performance**: Because the product JSON is served from Bunny (a CDN) or a Cloudflare Worker, it is fast and can be statically cached.  The frontend sets the `<title>` and `<meta name="description">` dynamically based on the product data to improve SEO.  All code files remain under 300 lines to maintain readability and performance.

## Deployment notes

- **Sensitive keys**: Never commit API keys or Bunny access keys to version control.  Use environment variables or secret configuration in Cloudflare and your CI/CD pipeline.
- **Line limits**: Each file in this project is designed to stay under 300 lines.  If your functionality grows, create new files rather than exceeding this limit.
- **Extensibility**: This template provides a foundation.  You can extend the admin dashboard to push data directly to Google Sheets or Bunny instead of `localStorage`, integrate a real review system, or add authentication for the admin area.