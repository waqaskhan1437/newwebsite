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
})()

function applySeoMeta(product) {
  if (!product) return;
  var title = product.seo_title || product.title || 'Product Detail';
  document.title = title;
  var rawDesc = product.seo_description || (product.description || '');
  // Strip HTML tags for meta description
  var descText = rawDesc.replace(/<[^>]+>/g, '').trim();
  if (descText.length > 160) {
    descText = descText.slice(0, 157).trimEnd() + '…';
  }
  var canonical = product.seo_canonical || window.location.href;
  var image = product.thumbnail_url || product.video_url || '';
  var keywords = product.seo_keywords || '';

  function ensureMeta(selector, attrs) {
    var el = document.querySelector(selector);
    if (!el) {
      el = document.createElement(attrs.tag || 'meta');
      if (attrs.name) el.setAttribute('name', attrs.name);
      if (attrs.property) el.setAttribute('property', attrs.property);
      if (attrs.rel) el.setAttribute('rel', attrs.rel);
      document.head.appendChild(el);
    }
    if (attrs.id) el.id = attrs.id;
    if (attrs.content !== undefined) el.setAttribute('content', attrs.content);
    if (attrs.href !== undefined) el.setAttribute('href', attrs.href);
    return el;
  }

  ensureMeta('meta#meta-description[name="description"]', {
    tag: 'meta',
    name: 'description',
    id: 'meta-description',
    content: descText
  });
  if (keywords) {
    ensureMeta('meta#meta-keywords[name="keywords"]', {
      tag: 'meta',
      name: 'keywords',
      id: 'meta-keywords',
      content: keywords
    });
  }
  ensureMeta('link#meta-canonical[rel="canonical"]', {
    tag: 'link',
    rel: 'canonical',
    id: 'meta-canonical',
    href: canonical
  });

  ensureMeta('meta#og-title[property="og:title"]', {
    tag: 'meta',
    property: 'og:title',
    id: 'og-title',
    content: title
  });
  ensureMeta('meta#og-description[property="og:description"]', {
    tag: 'meta',
    property: 'og:description',
    id: 'og-description',
    content: descText
  });
  ensureMeta('meta#og-url[property="og:url"]', {
    tag: 'meta',
    property: 'og:url',
    id: 'og-url',
    content: canonical
  });
  if (image) {
    ensureMeta('meta#og-image[property="og:image"]', {
      tag: 'meta',
      property: 'og:image',
      id: 'og-image',
      content: image
    });
  }

  // JSON‑LD Product schema
  var offerPrice = product.sale_price != null && product.sale_price !== ''
    ? product.sale_price
    : product.normal_price;
  var ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title || '',
    description: descText,
    image: image ? [image] : undefined,
    sku: String(product.id || ''),
    offers: {
      "@type": "Offer",
      priceCurrency: "PKR",
      price: offerPrice || 0,
      availability: "https://schema.org/InStock",
      url: canonical
    }
  };
  var scriptId = 'product-jsonld';
  var ldScript = document.getElementById(scriptId);
  if (!ldScript) {
    ldScript = document.createElement('script');
    ldScript.type = 'application/ld+json';
    ldScript.id = scriptId;
    document.head.appendChild(ldScript);
  }
  ldScript.textContent = JSON.stringify(ld);
}

function getDeliveryMessage(product) {
  if (!product) return 'Fast digital delivery';
  if (product.instant_delivery) {
    return 'Instant Delivery In 60 Minutes';
  }
  var txt = (product.normal_delivery_text || '').toLowerCase();
  if (txt.includes('24') || txt.includes('1 day') || txt.includes('24 hour')) {
    return '24 Hours Express Delivery';
  }
  if (txt.includes('48') || txt.includes('2 day') || txt.includes('2 days')) {
    return '2 Days Delivery';
  }
  return product.normal_delivery_text || 'Fast digital delivery';
}

;

/**
 * Render the product detail layout into the given container element.
 *
 * @param {HTMLElement} el
 * @param {object} product
 * @param {Array<object>} addonGroups
 */
function renderProduct(el, product, addonGroups) {
  applySeoMeta(product);
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
  // Reviews / order stats placeholder
  const reviews = document.createElement('div');
  const reviewsTitle = document.createElement('h3');
  reviewsTitle.textContent = 'Reviews';
  reviews.appendChild(reviewsTitle);
  const reviewsMeta = document.createElement('p');
  reviewsMeta.className = 'reviews-meta';
  const orderCount = product.order_count || 0;
  if (orderCount > 0) {
    reviewsMeta.textContent = orderCount + '+ orders · reviews coming soon';
  } else {
    reviewsMeta.textContent = 'Be the first to order this product.';
  }
  reviews.appendChild(reviewsMeta);
  media.appendChild(reviews);

  // Right: info
  const info = document.createElement('div');
  info.className = 'product-info';
  const title = document.createElement('h2');
  title.textContent = product.title;
  info.appendChild(title);

  const metaRow = document.createElement('div');
  metaRow.className = 'product-meta-row';
  const ordersBadge = document.createElement('span');
  const count = product.order_count || 0;
  ordersBadge.textContent = count > 0 ? count + '+ orders' : 'New product';
  metaRow.appendChild(ordersBadge);
  info.appendChild(metaRow);

  // Price line
  const priceLine = document.createElement('div');
  priceLine.className = 'price-line';
  const deliverySpan = document.createElement('div');
  const deliveryLabel = getDeliveryMessage(product);
  deliverySpan.className = 'delivery-text';
  deliverySpan.textContent = deliveryLabel;
  const priceLabel = document.createElement('div');
  priceLabel.className = 'price';
  const priceVal = product.sale_price ?? product.normal_price;
  priceLabel.textContent = priceVal ? `Rs ${priceVal}` : '';
  priceLine.appendChild(deliverySpan);
  priceLine.appendChild(priceLabel);
  info.appendChild(priceLine);

  // Digital note
  const note = document.createElement('div');
  note.className = 'digital-note';
  note.innerHTML = '<strong>Digital delivery only.</strong> ' +
    (product.instant_delivery ? 'You will receive secure download links within 60 minutes.' : 'You will receive secure download links within the stated delivery time.');
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
      const email = window.prompt('Enter your email for digital delivery:');
      if (!email) return;
      const response = await createOrder({
        email: email,
        amount: priceVal,
        productId: product.id,
        addons: []
      });
      if (response && response.orderId) {
        const params = new URLSearchParams();
        params.set('orderId', response.orderId);
        if (product.title) params.set('title', product.title);
        if (product.id) params.set('pid', String(product.id));
        window.location.href = 'thank-you.html?' + params.toString();
      } else {
        alert('Order created, but no order ID returned.');
      }
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