/*
 * Construct the primary layout for the product detail page.  This
 * function builds the media column, the information column, and the
 * addons form.  The bottom description section and player
 * initialisation live in layout‑extra.js to keep this file below the
 * 200 line limit.  The helper renderAddonField and updateTotal
 * functions are expected to exist on the global scope.
 */

;(function(){
  function renderProductMain(container, product, addonGroups) {
    container.className = '';
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'product-page';
    const mainRow = document.createElement('div');
    mainRow.className = 'product-main-row';
    const leftCol = document.createElement('div');
    leftCol.className = 'product-media-col';
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-wrapper';
    let hasVideo = false;
    if (product.video_url) {
      const ytMatch = product.video_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      if (ytMatch) {
        const videoId = ytMatch[1];
        videoWrapper.innerHTML = '<div id="player" data-plyr-provider="youtube" data-plyr-embed-id="' + videoId + '"></div>';
        hasVideo = true;
      } else {
        const video = document.createElement('video');
        video.id = 'player';
        video.playsInline = true;
        video.src = product.video_url;
        if (product.thumbnail_url) video.poster = product.thumbnail_url;
        video.onerror = function() {
          console.warn('Video failed, showing image.');
          videoWrapper.innerHTML = '';
          const img = document.createElement('img');
          img.src = product.thumbnail_url || 'https://via.placeholder.com/600';
          img.className = 'main-img';
          videoWrapper.appendChild(img);
        };
        videoWrapper.appendChild(video);
        hasVideo = true;
      }
    } else {
      const img = document.createElement('img');
      img.src = product.thumbnail_url || 'https://via.placeholder.com/600';
      img.className = 'main-img';
      videoWrapper.appendChild(img);
    }
    leftCol.appendChild(videoWrapper);
    if (product.thumbnail_url) {
      const thumbsDiv = document.createElement('div');
      thumbsDiv.className = 'thumbnails';
      const img = document.createElement('img');
      img.src = product.thumbnail_url;
      img.className = 'thumb active';
      thumbsDiv.appendChild(img);
      leftCol.appendChild(thumbsDiv);
    }
    mainRow.appendChild(leftCol);
    const rightCol = document.createElement('div');
    rightCol.className = 'product-info-col';
    const panel = document.createElement('div');
    panel.className = 'product-info-panel';
    const title = document.createElement('h1');
    title.className = 'product-title';
    title.textContent = product.title;
    panel.appendChild(title);
    const ratingRow = document.createElement('div');
    ratingRow.className = 'rating-row';
    ratingRow.innerHTML = '<span class="stars">★★★★★</span> <span class="review-count">5.0 (1 Reviews)</span>';
    panel.appendChild(ratingRow);
    const badgeRow = document.createElement('div');
    badgeRow.className = 'badges-row';
    let delText = '2 Days Delivery';
    let delIcon = '🚚';
    const normText = (product.normal_delivery_text || '').toLowerCase();
    if (product.instant_delivery) {
      delText = 'Instant Delivery In 60 Minutes';
      delIcon = '⚡';
    } else if (normText.includes('1 day') || normText.includes('24 hour')) {
      delText = '24 Hours Express Delivery';
      delIcon = '🚀';
    }
    badgeRow.innerHTML = `
      <div class="badge-box badge-delivery">
        <div class="icon">${delIcon}</div><span>${delText}</span>
      </div>
    `;
    const priceBadge = document.createElement('div');
    priceBadge.className = 'badge-box badge-price';
    const normalPrice = parseFloat(product.normal_price) || 0;
    let priceHtml = '<div class="price-final">$' + window.basePrice.toLocaleString() + '</div>';
    if (window.basePrice < normalPrice) {
      const off = Math.round(((normalPrice - window.basePrice) / normalPrice) * 100);
      priceHtml += '<div style="font-size:0.9rem"><span class="price-original">$' + normalPrice + '</span></div>';
      priceHtml += '<div class="discount-tag">' + off + '% OFF</div>';
    }
    priceBadge.innerHTML = priceHtml;
    badgeRow.appendChild(priceBadge);
    panel.appendChild(badgeRow);
    const note = document.createElement('div');
    note.className = 'digital-note';
    note.innerHTML = '<span>📩</span> <span><strong>Digital Delivery:</strong> Receive via WhatsApp/Email.</span>';
    panel.appendChild(note);
    const addonsForm = document.createElement('form');
    addonsForm.id = 'addons-form';
    addonsForm.style.marginTop = '1.5rem';
    if (addonGroups && addonGroups.length > 0) {
      addonGroups.forEach(group => {
        if (group.type === 'heading') {
          const h = document.createElement('h4');
          h.textContent = group.text || group.label;
          h.style.marginTop = '1.5rem';
          addonsForm.appendChild(h);
        } else {
          addonsForm.appendChild(window.renderAddonField(group));
        }
      });
    }
    panel.appendChild(addonsForm);
    const stickyFooter = document.createElement('div');
    stickyFooter.style.marginTop = '2rem';
    stickyFooter.style.paddingTop = '1rem';
    stickyFooter.style.borderTop = '1px solid #e5e5e5';
    const checkoutBtn = document.createElement('button');
    checkoutBtn.id = 'checkout-btn';
    checkoutBtn.className = 'btn-buy';
    checkoutBtn.textContent = 'Checkout - $' + window.currentTotal.toLocaleString();
    checkoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (typeof handleCheckout === 'function') handleCheckout();
    });
    stickyFooter.appendChild(checkoutBtn);
    panel.appendChild(stickyFooter);
    rightCol.appendChild(panel);
    mainRow.appendChild(rightCol);
    wrapper.appendChild(mainRow);
    container.appendChild(wrapper);
    return { wrapper: wrapper, hasVideo: hasVideo };
  }
  window.renderProductMain = renderProductMain;
})();