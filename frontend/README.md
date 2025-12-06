# Frontend Overview

This folder contains the static frontend for your Cloudflare Pages site.  It is
organised into small, purpose‐built files and folders to keep the project
lightweight and easy to maintain.  Each HTML and JavaScript file stays well
under the 300‑line limit you requested.  Feel free to adjust styles and
copy as you develop your shop further.

```
frontend/
├── index.html               – product listing page
├── product.html             – individual product detail page
├── admin/                   – admin dashboard pages
│   ├── index.html           – list products in admin
│   └── product-form.html    – basic add/edit product form
├── js/                      – all client‑side scripts
│   ├── api.js              – helper functions for talking to the worker
│   ├── products.js         – logic for the product list page
│   ├── product.js          – logic for the product detail page
│   ├── admin.js            – logic for the admin list page
│   └── product-form.js     – logic for the admin product form
└── css/style.css           – minimal CSS styles
```

These pages make simple `fetch` calls to your Worker routes (e.g. `/api/products`
and `/api/product/:id`) and render the returned JSON.  The admin pages are
placeholders for now; they show how to lay out forms and list existing
products but leave the heavy lifting (authentication, validations, save
operations) for later.