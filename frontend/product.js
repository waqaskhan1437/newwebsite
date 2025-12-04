/*
 * product.js
 *
 * This script fetches product data from a JSON file and populates the product page.
 * Each file in this project is kept under 300 lines as required.
 */

// Path to the JSON file. In production this would be served from Bunny CDN via a Cloudflare Worker.
const productUrl = '../json/sample-product.json';

/**
 * Fetch product JSON and build the page.
 */
async function loadProduct() {
  try {
    const response = await fetch(productUrl);
    if (!response.ok) {
      throw new Error(`Failed to load product data: ${response.status}`);
    }
    const product = await response.json();
    populatePage(product);
  } catch (err) {
    console.error(err);
    document.querySelector('.container').innerHTML = `<p class="error">Could not load product.</p>`;
  }
}

/**
 * Populate DOM elements using the product JSON.
 * @param {Object} product The product data.
 */
function populatePage(product) {
  // Title and SEO tags
  document.title = product.seoTitle || product.title;
  const descTag = document.querySelector('meta[name="description"]');
  if (descTag) descTag.content = product.seoDescription || '';

  // Main title
  const titleEl = document.getElementById('product-title');
  titleEl.textContent = product.title;

  // Price line: show sale price if available
  const priceLine = document.getElementById('price-line');
  const price = product.salePrice && product.salePrice < product.price
    ? `<span class="sale-price">$${product.salePrice}</span> <span class="old-price">$${product.price}</span>`
    : `$${product.price}`;
  const delivery = product.deliveryTime || '';
  priceLine.innerHTML = `${price} • ${delivery}`;

  // Delivery note: show if instant delivery
  const deliveryNote = document.getElementById('delivery-note');
  deliveryNote.textContent = product.instantDelivery
    ? 'Instant digital delivery'
    : 'Delivery may take time';

  // Media: video player and thumbnails
  const player = document.getElementById('player');
  if (product.media && product.media.video) {
    player.src = product.media.video;
  }
  const thumbsContainer = document.getElementById('thumbnails');
  if (product.media && Array.isArray(product.media.thumbnails)) {
    product.media.thumbnails.forEach((url, index) => {
      const img = document.createElement('img');
      img.src = url;
      img.alt = `Thumbnail ${index + 1}`;
      img.addEventListener('click', () => {
        player.src = url; // clicking thumbnail swaps into player for simplicity
      });
      thumbsContainer.appendChild(img);
    });
  }

  // Description
  const descEl = document.getElementById('description');
  descEl.innerHTML = product.description;

  // Addons
  const addonsEl = document.getElementById('addons');
  if (Array.isArray(product.addons) && product.addons.length > 0) {
    product.addons.forEach(group => {
      const groupEl = document.createElement('div');
      groupEl.className = 'addon-group';
      const heading = document.createElement('h3');
      heading.textContent = group.group;
      groupEl.appendChild(heading);
      if (Array.isArray(group.items)) {
        const list = document.createElement('ul');
        group.items.forEach(item => {
          const li = document.createElement('li');
          li.innerHTML = `<strong>${item.name}</strong> – ${item.description} ($${item.price})`;
          list.appendChild(li);
        });
        groupEl.appendChild(list);
      }
      addonsEl.appendChild(groupEl);
    });
  }

  // Reviews
  const reviewsEl = document.getElementById('reviews');
  if (Array.isArray(product.reviews) && product.reviews.length > 0) {
    const reviewsList = document.createElement('div');
    reviewsList.className = 'reviews-list';
    product.reviews.forEach(r => {
      const block = document.createElement('div');
      block.className = 'review-item';
      block.innerHTML = `<strong>${r.user}</strong><p>${r.comment}</p>`;
      reviewsList.appendChild(block);
    });
    reviewsEl.appendChild(reviewsList);
  } else {
    reviewsEl.innerHTML = '<p>No reviews yet.</p>';
  }

  // Whop checkout embed: set plan id on the container
  const whopEl = document.getElementById('whop-checkout');
  if (product.whopPlanId) {
    whopEl.setAttribute('data-whop-checkout-plan-id', product.whopPlanId);
    // When the script loads it will automatically mount the widget
  }
}

// Load the product after the page is ready
window.addEventListener('DOMContentLoaded', loadProduct);