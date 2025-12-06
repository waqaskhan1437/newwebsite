/*
 * Admin Product List Logic
 * Fetches products and displays them in a responsive table.
 * Updated for USD currency and English UI.
 */

;(async function initAdminList() {
  const table = document.getElementById('admin-table');
  if (!table) return;

  try {
    const { products } = await getProducts();
    
    if (!products || products.length === 0) {
      table.innerHTML = '<tbody><tr><td colspan="4" style="text-align:center; padding: 2rem;">No products found. <a href="product-form.html">Create one?</a></td></tr></tbody>';
      return;
    }

    // Create Table Header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="width: 50px;">ID</th>
        <th>Title</th>
        <th style="width: 120px;">Price</th>
        <th style="width: 150px; text-align: right;">Actions</th>
      </tr>
    `;
    table.appendChild(thead);

    // Create Table Body
    const tbody = document.createElement('tbody');
    
    products.forEach(p => {
      const row = document.createElement('tr');
      
      // ID
      const idCell = document.createElement('td');
      idCell.textContent = p.id;
      row.appendChild(idCell);
      
      // Title
      const titleCell = document.createElement('td');
      const link = document.createElement('a');
      link.href = `product-form.html?id=${p.id}`;
      link.textContent = p.title;
      link.style.fontWeight = '500';
      link.style.color = '#1f2937';
      link.style.textDecoration = 'none';
      titleCell.appendChild(link);
      row.appendChild(titleCell);
      
      // Price (USD)
      const priceCell = document.createElement('td');
      const price = p.sale_price ?? p.normal_price;
      priceCell.textContent = price ? `$${parseFloat(price).toLocaleString()}` : 'Free';
      row.appendChild(priceCell);
      
      // Actions
      const actionsCell = document.createElement('td');
      actionsCell.style.textAlign = 'right';
      
      const editBtn = document.createElement('a');
      editBtn.href = `product-form.html?id=${p.id}`;
      editBtn.className = 'btn';
      editBtn.style.padding = '0.25rem 0.75rem';
      editBtn.style.fontSize = '0.85rem';
      editBtn.textContent = 'Edit';
      actionsCell.appendChild(editBtn);
      
      // Delete Button (Placeholder)
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'btn btn-secondary';
      delBtn.style.marginLeft = '0.5rem';
      delBtn.style.padding = '0.25rem 0.75rem';
      delBtn.style.fontSize = '0.85rem';
      delBtn.style.background = '#fee2e2';
      delBtn.style.color = '#b91c1c';
      delBtn.style.border = '1px solid #fecaca';
      
      // Delete Logic (Future Implementation)
      delBtn.onclick = () => {
        if(confirm('Are you sure you want to delete this product? (This is a demo action)')) {
          alert('Delete functionality not connected to backend API yet.');
        }
      };
      
      actionsCell.appendChild(delBtn);
      row.appendChild(actionsCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);

  } catch (err) {
    console.error(err);
    table.innerHTML = `<tbody><tr><td colspan="4" style="color:red; text-align:center;">Error loading products: ${err.message}</td></tr></tbody>`;
  }
})();
