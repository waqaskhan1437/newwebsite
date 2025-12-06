/*
 * Logic for the product listing page (index.html).
 * Fetches products from the API and renders simple cards linking to
 * individual product pages.
 * Updated for USD ($) currency.
 */

;(async function initProductList() {
  const container = document.getElementById('product-list');
  if (!container) return;

  try {
    // Show loading state
    container.innerHTML = '<p style="text-align:center; color:#6b7280;">Loading products...</p>';

    const { products } = await getProducts();
    
    if (!products || products.length === 0) {
      container.innerHTML = '<p style="text-align:center;">No products available at the moment.</p>';
      return;
    }

    // Clear loading state
    container.innerHTML = '';

    products.forEach(p => {
      const card = document.createElement('a');
      card.href = `product.html?id=${encodeURIComponent(p.id)}`;
      card.className = 'product-card';
      
      // Thumbnail
      const img = document.createElement('img');
      img.src = p.thumbnail_url || 'https://via.placeholder.com/80';
      img.alt = p.title;
      card.appendChild(img);
      
      // Info Container
      const info = document.createElement('div');
      info.className = 'info';
      
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = p.title;
      info.appendChild(title);
      
      const price = document.createElement('div');
      price.className = 'price';
      
      // Price Logic (USD)
      const normal = parseFloat(p.normal_price) || 0;
      const sale = parseFloat(p.sale_price) || 0;
      
      if (sale > 0 && sale < normal) {
        // Show Sale Price + Original Price (Strikethrough)
        price.innerHTML = `
          <span style="color:#ef4444; font-weight:700;">$${sale.toLocaleString()}</span>
          <span style="color:#9ca3af; text-decoration:line-through; font-size:0.85em; margin-left:6px;">$${normal.toLocaleString()}</span>
        `;
      } else {
        // Show Normal Price only
        price.textContent = normal > 0 ? `$${normal.toLocaleString()}` : 'Free';
      }
      
      info.appendChild(price);
      card.appendChild(info);
      container.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="color:red; text-align:center;">Error loading products: ${err.message}</p>`;
  }
})();
