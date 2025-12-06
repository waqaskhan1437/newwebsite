/*
 * Logic for the product listing page (index.html).
 * Fetches products from the API and renders simple cards linking to
 * individual product pages.
 */

;(async function initProductList() {
  const container = document.getElementById('product-list');
  if (!container) return;
  try {
    const { products } = await getProducts();
    if (!products || products.length === 0) {
      container.innerHTML = '<p>No products available.</p>';
      return;
    }
    products.forEach(p => {
      const card = document.createElement('a');
      card.href = `product.html?id=${encodeURIComponent(p.id)}`;
      card.className = 'product-card';
      // thumbnail
      const img = document.createElement('img');
      img.src = p.thumbnail_url || 'https://via.placeholder.com/80';
      img.alt = p.title;
      card.appendChild(img);
      // info container
      const info = document.createElement('div');
      info.className = 'info';
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = p.title;
      info.appendChild(title);
      const price = document.createElement('div');
      price.className = 'price';
      const displayPrice = p.sale_price ?? p.normal_price;
      price.textContent = displayPrice ? `Rs ${displayPrice}` : '';
      info.appendChild(price);
      card.appendChild(info);
      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p>Error loading products: ${err.message}</p>`;
  }
})();