/*
 * Logic for the individual product page (product.html).
 * Loads product details by ID from the URL query string, renders a
 * two‑column layout with media on the left and info on the right,
 * and allows the customer to choose addons and submit an order.
 */

;(async function initProductPage() {
  const params = new URLSearchParams(location.search);
  const productId = params.get('id');
  const pageContainer = document.getElementById('product-container');
  if (!pageContainer) return;
  if (!productId) {
    pageContainer.innerHTML = '<p>Product ID missing.</p>';
    return;
  }
  try {
    const { product, addons } = await getProduct(productId);
    if (!product) {
      pageContainer.innerHTML = '<p>Product not found.</p>';
      return;
    }
    renderProduct(pageContainer, product, addons);
  } catch (err) {
    console.error(err);
    pageContainer.innerHTML = `<p>Error loading product: ${err.message}</p>`;
  }
})();

/**
 * Render the product detail layout into the given container element.
 *
 * @param {HTMLElement} el
 * @param {object} product
 * @param {Array<object>} addonGroups
 */
function renderProduct(el, product, addonGroups) {
  // Build the structure: left media column, right info column
  const wrapper = document.createElement('div');
  wrapper.className = 'product-page';

  // Left: media (video + thumbnails + description + reviews placeholder)
  const media = document.createElement('div');
  media.className = 'product-media';
  // Video or placeholder
  if (product.video_url) {
    const video = document.createElement('video');
    video.controls = true;
    video.src = product.video_url;
    video.innerHTML = 'Your browser does not support the video tag.';
    media.appendChild(video);
  }
  // Thumbnails (assuming multiple thumbnails in future; currently only one)
  const thumbs = document.createElement('div');
  thumbs.className = 'thumbnails';
  if (product.thumbnail_url) {
    const thumbImg = document.createElement('img');
    thumbImg.src = product.thumbnail_url;
    thumbImg.alt = product.title;
    thumbImg.addEventListener('click', () => {
      // Replace main video with static image if clicked
      if (product.video_url) return;
      mainImg.src = product.thumbnail_url;
    });
    thumbs.appendChild(thumbImg);
  }
  media.appendChild(thumbs);
  // Description
  const desc = document.createElement('div');
  desc.innerHTML = product.description || '';
  media.appendChild(desc);
  // Reviews placeholder
  const reviews = document.createElement('div');
  reviews.innerHTML = '<h3>Reviews</h3><p>Reviews coming soon.</p>';
  media.appendChild(reviews);

  // Right: info
  const info = document.createElement('div');
  info.className = 'product-info';
  const title = document.createElement('h2');
  title.textContent = product.title;
  info.appendChild(title);
  // Price line
  const priceLine = document.createElement('div');
  priceLine.className = 'price-line';
  const priceLabel = document.createElement('div');
  priceLabel.className = 'price';
  const priceVal = product.sale_price ?? product.normal_price;
  priceLabel.textContent = priceVal ? `Rs ${priceVal}` : '';
  priceLine.appendChild(priceLabel);
  // Delivery time placeholder
  const deliveryTime = document.createElement('div');
  deliveryTime.textContent = product.instant_delivery ? 'Instant delivery' : 'Normal delivery';
  priceLine.appendChild(deliveryTime);
  info.appendChild(priceLine);
  // Digital note
  const note = document.createElement('div');
  note.textContent = product.instant_delivery ? 'This product will be delivered instantly.' : (product.normal_delivery_text || '');
  info.appendChild(note);
  // Addons
  const addonsContainer = document.createElement('div');
  addonsContainer.className = 'addons';
  if (addonGroups && addonGroups.length > 0) {
    const h3 = document.createElement('h3');
    h3.textContent = 'Add‑ons';
    addonsContainer.appendChild(h3);
    addonGroups.forEach(group => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'addon-group';
      const groupLabel = document.createElement('label');
      groupLabel.textContent = group.label || group.groupKey;
      groupDiv.appendChild(groupLabel);
      // Render items within group depending on type
      group.items.forEach(item => {
        // Each item gets its own wrapper
        const itemWrapper = document.createElement('div');
        itemWrapper.style.marginBottom = '0.5rem';
        const itemLabel = document.createElement('span');
        itemLabel.textContent = `${item.label} (Rs ${item.price})`;
        itemLabel.style.display = 'block';
        itemWrapper.appendChild(itemLabel);
        // Determine input type
        let input;
        switch (item.type) {
          case 'quantity':
            input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.value = '0';
            break;
          case 'dropdown':
            input = document.createElement('select');
            if (item.options) {
              item.options.forEach(opt => {
                const optEl = document.createElement('option');
                optEl.value = opt.value;
                optEl.textContent = `${opt.label} (+Rs ${opt.extra || 0})`;
                input.appendChild(optEl);
              });
            }
            break;
          case 'checkbox_group':
            input = document.createElement('div');
            if (item.options) {
              item.options.forEach(opt => {
                const lbl = document.createElement('label');
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = opt.value;
                lbl.appendChild(cb);
                lbl.append(` ${opt.label} (+Rs ${opt.extra || 0})`);
                input.appendChild(lbl);
              });
            }
            break;
          case 'radio_group':
            input = document.createElement('div');
            if (item.options) {
              item.options.forEach(opt => {
                const lbl = document.createElement('label');
                const rb = document.createElement('input');
                rb.type = 'radio';
                rb.name = `addon_${item.id}`;
                rb.value = opt.value;
                lbl.appendChild(rb);
                lbl.append(` ${opt.label} (+Rs ${opt.extra || 0})`);
                input.appendChild(lbl);
              });
            }
            break;
          default:
            // textarea for long text or unknown type
            input = document.createElement('textarea');
            input.placeholder = item.placeholder || '';
            break;
        }
        if (input) itemWrapper.appendChild(input);
        groupDiv.appendChild(itemWrapper);
      });
      addonsContainer.appendChild(groupDiv);
    });
  }
  info.appendChild(addonsContainer);
  // Order button
  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = 'Buy Now';
  btn.addEventListener('click', async () => {
    try {
      // For simplicity we only pass productId; real implementation should
      // gather addon selections and price calculations.
      const response = await createOrder({
        email: prompt('Enter your email:'),
        amount: priceVal,
        productId: product.id,
        addons: []
      });
      alert('Order created: ' + response.orderId);
    } catch (e) {
      alert('Error creating order: ' + e.message);
    }
  });
  info.appendChild(btn);

  // Append columns to wrapper
  wrapper.appendChild(media);
  wrapper.appendChild(info);
  el.innerHTML = '';
  el.appendChild(wrapper);
}