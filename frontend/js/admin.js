/*
 * Admin list page logic.  Fetches products and displays them in a table
 * with basic edit/delete placeholders.  This file stays small and clean; you
 * can extend it with more functionality later (e.g. search, pagination).
 */

;(async function initAdminList() {
  const table = document.getElementById('admin-table');
  if (!table) return;
  try {
    const { products } = await getProducts();
    if (!products || products.length === 0) {
      table.innerHTML = '<p>No products found.</p>';
      return;
    }
    const tbody = document.createElement('tbody');
    products.forEach(p => {
      const row = document.createElement('tr');
      const idCell = document.createElement('td');
      idCell.textContent = p.id;
      row.appendChild(idCell);
      const titleCell = document.createElement('td');
      titleCell.textContent = p.title;
      row.appendChild(titleCell);
      const priceCell = document.createElement('td');
      priceCell.textContent = p.sale_price ?? p.normal_price;
      row.appendChild(priceCell);
      const actionsCell = document.createElement('td');
      const editLink = document.createElement('a');
      editLink.href = `product-form.html?id=${p.id}`;
      editLink.textContent = 'Edit';
      actionsCell.appendChild(editLink);
      // Placeholder delete button (no function yet)
      const del = document.createElement('button');
      del.textContent = 'Delete';
      del.className = 'btn';
      del.style.marginLeft = '0.5rem';
      del.disabled = true;
      actionsCell.appendChild(del);
      row.appendChild(actionsCell);
      tbody.appendChild(row);
    });
    // Append header
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>ID</th><th>Title</th><th>Price</th><th>Actions</th></tr>';
    table.appendChild(thead);
    table.appendChild(tbody);
  } catch (err) {
    console.error(err);
    table.innerHTML = `<p>Error loading products: ${err.message}</p>`;
  }
})();