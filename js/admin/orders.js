/*
 * Admin Orders List
 *
 * Fetches all orders from the backend and displays them in a table.
 * Each row shows decrypted email and amount when available.  This
 * script relies on getOrders() from api.js.  Keeping this file
 * concise (<200 lines) allows for straightforward maintenance.
 */

;(async function initOrdersPage() {
  const table = document.getElementById('orders-table');
  if (!table) return;
  try {
    const resp = await getOrders();
    const orders = (resp && resp.orders) || [];
    if (!orders.length) {
      table.innerHTML = '<tbody><tr><td colspan="7" style="text-align:center; padding: 2rem;">No orders found.</td></tr></tbody>';
      return;
    }
    // Build table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="width:50px;">ID</th>
        <th>Order ID</th>
        <th>Product ID</th>
        <th>Email</th>
        <th>Amount</th>
        <th>Status</th>
        <th>Archive Link</th>
        <th>Created At</th>
      </tr>
    `;
    table.appendChild(thead);
    // Build table body
    const tbody = document.createElement('tbody');
    orders.forEach(ord => {
      const row = document.createElement('tr');
      const cols = [];
      cols.push(ord.id);
      cols.push(ord.order_id);
      cols.push(ord.product_id);
      cols.push(ord.email || '–');
      cols.push(ord.amount != null ? `$${parseFloat(ord.amount).toLocaleString()}` : '–');
      cols.push(ord.status || '–');
      cols.push(ord.archive_url ? `<a href="${ord.archive_url}" target="_blank">Link</a>` : '–');
      cols.push(ord.created_at ? new Date(ord.created_at).toLocaleString() : '–');
      cols.forEach(cellVal => {
        const cell = document.createElement('td');
        cell.innerHTML = cellVal;
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
  } catch (err) {
    console.error(err);
    table.innerHTML = `<tbody><tr><td colspan="7" style="color:red; text-align:center;">Error loading orders: ${err.message}</td></tr></tbody>`;
  }
})();