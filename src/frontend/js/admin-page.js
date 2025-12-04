(function () {
  const tabs = Array.from(document.querySelectorAll(".admin-tab-btn"));
  const panels = Array.from(document.querySelectorAll(".admin-panel"));
  function setActive(tabName) {
    tabs.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.tab === tabName);
    });
    panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.panel === tabName);
    });
  }
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => setActive(btn.dataset.tab));
  });
  const state = {
    products: [],
    orders: [],
    reviews: []
  };
  function nowIso() {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }
  function seedDemoData() {
    state.products = [
      {
        id: "video-course-1",
        title: "Video Course Starter",
        price: 49,
        delivery_time: "Instant",
        status: "active",
        short_description: "Perfect for beginners.",
        updated_at: nowIso()
      },
      {
        id: "preset-pack",
        title: "Preset Pack",
        price: 19,
        delivery_time: "Within 24 hours",
        status: "draft",
        short_description: "Custom presets bundle.",
        updated_at: nowIso()
      }
    ];
    state.orders = [
      {
        token: "ord_12345",
        product_title: "Video Course Starter",
        amount: 49,
        currency: "USD",
        status: "paid",
        created_at: nowIso(),
        delivery_eta: "Instant",
        delivery_link: "",
        delivery_type: ""
      },
      {
        token: "ord_67890",
        product_title: "Preset Pack",
        amount: 19,
        currency: "USD",
        status: "delivered",
        created_at: nowIso(),
        delivery_eta: "Done",
        delivery_link: "https://example.com/download",
        delivery_type: "file"
      }
    ];
    state.reviews = [
      {
        id: "rev1",
        product_id: "video-course-1",
        rating: 5,
        name: "Ali",
        comment: "Zabardast course!",
        status: "approved"
      },
      {
        id: "rev2",
        product_id: "preset-pack",
        rating: 4,
        name: "Sara",
        comment: "Presets ache hain, thora aur ho sakta tha.",
        status: "pending"
      }
    ];
  }
  function pill(label, kind) {
    const base = "pill";
    const extra =
      kind === "ok"
        ? " pill-ok"
        : kind === "pending"
        ? " pill-pending"
        : kind === "error"
        ? " pill-error"
        : " pill-draft";
    return `<span class="${base + extra}">${label}</span>`;
  }
  function renderProducts() {
    const tbody = document.querySelector("#product-table tbody");
    if (!tbody) return;
    const q = (document.getElementById("product-search") || { value: "" }).value
      .toLowerCase()
      .trim();
    const rows = state.products
      .filter((p) => {
        if (!q) return true;
        return (
          String(p.id).toLowerCase().includes(q) ||
          String(p.title).toLowerCase().includes(q)
        );
      })
      .map((p) => {
        const statusKind =
          p.status === "active"
            ? "ok"
            : p.status === "draft"
            ? "draft"
            : "pending";
        return `<tr data-id="${p.id}">
<td>${p.id}</td>
<td>${p.title}</td>
<td>$${Number(p.price || 0).toFixed(2)}</td>
<td>${p.delivery_time || ""}</td>
<td>${pill(p.status, statusKind)}</td>
<td>${p.updated_at || ""}</td>
<td>
  <div class="actions-row">
    <button type="button" data-action="edit">Edit</button>
    <button type="button" data-action="delete">Delete</button>
  </div>
</td>
</tr>`;
      })
      .join("");
    tbody.innerHTML = rows || `<tr><td colspan="7">No products yet.</td></tr>`;
  }
  function renderOrders() {
    const tbody = document.querySelector("#order-table tbody");
    if (!tbody) return;
    const filter =
      (document.getElementById("order-status-filter") || { value: "all" }).value;
    const rows = state.orders
      .filter((o) => (filter === "all" ? true : o.status === filter))
      .map((o) => {
        let kind = "pending";
        if (o.status === "paid") kind = "ok";
        else if (o.status === "delivered") kind = "ok";
        else if (o.status === "refunded") kind = "error";
        return `<tr data-token="${o.token}">
<td>${o.token}</td>
<td>${o.product_title}</td>
<td>$${Number(o.amount || 0).toFixed(2)} ${o.currency || ""}</td>
<td>${pill(o.status, kind)}</td>
<td>${o.created_at || ""}</td>
<td>${o.delivery_eta || ""}</td>
<td>
  <div class="actions-row">
    <button type="button" data-action="mark-processing">Processing</button>
    <button type="button" data-action="mark-delivered">Delivered</button>
  </div>
</td>
</tr>`;
      })
      .join("");
    tbody.innerHTML = rows || `<tr><td colspan="7">No orders yet.</td></tr>`;
    renderDeliveries();
  }
  function renderDeliveries() {
    const tbody = document.querySelector("#delivery-table tbody");
    if (!tbody) return;
    const rows = state.orders
      .filter((o) => o.delivery_link)
      .map((o) => {
        const kind = o.status === "delivered" ? "ok" : "pending";
        return `<tr data-token="${o.token}">
<td>${o.token}</td>
<td>${o.product_title}</td>
<td>${o.delivery_type || ""}</td>
<td><a href="${o.delivery_link}" target="_blank" rel="noopener noreferrer">Open</a></td>
<td>${pill(o.status, kind)}</td>
<td>
  <div class="actions-row">
    <button type="button" data-action="open-order">Open order</button>
  </div>
</td>
</tr>`;
      })
      .join("");
    tbody.innerHTML = rows || `<tr><td colspan="6">No deliveries yet.</td></tr>`;
  }
  function renderReviews() {
    const tbody = document.querySelector("#review-table tbody");
    if (!tbody) return;
    const filter =
      (document.getElementById("review-status-filter") || { value: "all" })
        .value;
    const rows = state.reviews
      .filter((r) => (filter === "all" ? true : r.status === filter))
      .map((r) => {
        const kind =
          r.status === "approved"
            ? "ok"
            : r.status === "pending"
            ? "pending"
            : "draft";
        return `<tr data-id="${r.id}">
<td>${r.id}</td>
<td>${r.product_id}</td>
<td>${"★".repeat(Number(r.rating || 0))}</td>
<td>${r.name || ""}</td>
<td>${r.comment || ""}</td>
<td>${pill(r.status, kind)}</td>
<td>
  <div class="actions-row">
    <button type="button" data-action="approve">Approve</button>
    <button type="button" data-action="reject">Reject</button>
  </div>
</td>
</tr>`;
      })
      .join("");
    tbody.innerHTML = rows || `<tr><td colspan="7">No reviews yet.</td></tr>`;
  }
  function hookProductForm() {
    const form = document.getElementById("product-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const data = new FormData(form);
      const id = String(data.get("id") || "").trim();
      if (!id) return;
      const existing = state.products.find((p) => String(p.id) === id);
      const obj = {
        id,
        title: String(data.get("title") || "").trim(),
        price: Number(data.get("price") || 0),
        delivery_time: String(data.get("delivery_time") || "").trim(),
        status: String(data.get("status") || "active"),
        short_description: String(
          data.get("short_description") || ""
        ).trim(),
        updated_at: nowIso()
      };
      if (existing) {
        Object.assign(existing, obj);
      } else {
        state.products.push(obj);
      }
      renderProducts();
      saveProductToApi(obj).catch(console.error);
      form.reset();
    });
    const search = document.getElementById("product-search");
    if (search) {
      search.addEventListener("input", renderProducts);
    }
    const refreshBtn = document.getElementById("product-refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        renderProducts();
      });
    }
    const table = document.getElementById("product-table");
    if (table) {
      table.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const action = btn.dataset.action;
        const row = btn.closest("tr");
        const id = row && row.dataset.id;
        if (!id) return;
        const item = state.products.find((p) => String(p.id) === id);
        if (!item) return;
        if (action === "edit") {
          form.id.value = item.id;
          form.title.value = item.title;
          form.price.value = item.price;
          form.delivery_time.value = item.delivery_time || "";
          form.short_description.value = item.short_description || "";
          form.status.value = item.status || "active";
          setActive("products");
        } else if (action === "delete") {
          const idx = state.products.findIndex((p) => String(p.id) === id);
          if (idx >= 0) {
            const removed = state.products.splice(idx, 1)[0];
            renderProducts();
            deleteProductFromApi(removed).catch(console.error);
          }
        }
      });
    }
  }
  function hookOrders() {
    const filter = document.getElementById("order-status-filter");
    if (filter) {
      filter.addEventListener("change", renderOrders);
    }
    const refreshBtn = document.getElementById("order-refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        renderOrders();
      });
    }
    const table = document.getElementById("order-table");
    if (table) {
      table.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const row = btn.closest("tr");
        const token = row && row.dataset.token;
        if (!token) return;
        const order = state.orders.find((o) => o.token === token);
        if (!order) return;
        const action = btn.dataset.action;
        if (action === "mark-processing") {
          order.status = "processing";
        } else if (action === "mark-delivered") {
          order.status = "delivered";
        }
        renderOrders();
        updateOrderStatusApi(order).catch(console.error);
      });
    }
  }
  function hookDeliveries() {
    const form = document.getElementById("delivery-form");
    if (!form) return;
    const refreshBtn = document.getElementById("delivery-refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", renderDeliveries);
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const data = new FormData(form);
      const token = String(data.get("order_token") || "").trim();
      if (!token) return;
      let order = state.orders.find((o) => o.token === token);
      if (!order) {
        order = {
          token,
          product_title: "(manual)",
          amount: 0,
          currency: "USD",
          status: "delivered",
          created_at: nowIso(),
          delivery_eta: String(data.get("delivery_eta") || "").trim(),
          delivery_link: "",
          delivery_type: ""
        };
        state.orders.push(order);
      }
      order.delivery_link = String(data.get("delivery_link") || "").trim();
      order.delivery_type = String(data.get("delivery_type") || "").trim();
      order.delivery_eta =
        String(data.get("delivery_eta") || "").trim() || order.delivery_eta;
      order.status = "delivered";
      renderOrders();
      attachDeliveryApi(order).catch(console.error);
      form.reset();
    });
  }
  function hookReviews() {
    const filter = document.getElementById("review-status-filter");
    if (filter) {
      filter.addEventListener("change", renderReviews);
    }
    const refreshBtn = document.getElementById("review-refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", renderReviews);
    }
    const table = document.getElementById("review-table");
    if (table) {
      table.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const row = btn.closest("tr");
        const id = row && row.dataset.id;
        if (!id) return;
        const review = state.reviews.find((r) => r.id === id);
        if (!review) return;
        const action = btn.dataset.action;
        if (action === "approve") {
          review.status = "approved";
        } else if (action === "reject") {
          review.status = "rejected";
        }
        renderReviews();
        updateReviewStatusApi(review).catch(console.error);
      });
    }
  }
  async function saveProductToApi(product) {
    try {
      await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product)
      });
    } catch (err) {
      console.warn("Product save API failed", err);
    }
  }
  async function deleteProductFromApi(product) {
    try {
      await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id })
      });
    } catch (err) {
      console.warn("Product delete API failed", err);
    }
  }
  async function updateOrderStatusApi(order) {
    try {
      await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: order.token, status: order.status })
      });
    } catch (err) {
      console.warn("Order status API failed", err);
    }
  }
  async function attachDeliveryApi(order) {
    try {
      await fetch("/api/admin/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: order.token,
          delivery_link: order.delivery_link,
          delivery_type: order.delivery_type,
          delivery_eta: order.delivery_eta
        })
      });
    } catch (err) {
      console.warn("Delivery API failed", err);
    }
  }
  async function updateReviewStatusApi(review) {
    try {
      await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: review.id,
          status: review.status
        })
      });
    } catch (err) {
      console.warn("Review API failed", err);
    }
  }
  function init() {
    seedDemoData();
    hookProductForm();
    hookOrders();
    hookDeliveries();
    hookReviews();
    renderProducts();
    renderOrders();
    renderReviews();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
