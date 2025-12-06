/*
 * Whop checkout integration.
 *
 * This module encapsulates loading the Whop checkout loader,
 * determining the correct plan based on price maps, and
 * presenting a modal overlay with an embedded checkout.
 * It exports a single function `whopCheckout` on the global
 * object.  All functions are kept within this closure to
 * prevent polluting the global namespace.  At under 200 lines,
 * the file remains maintainable while providing a complete
 * integration.
 */

;(function(){
  let scriptPromise = null;

  /**
   * Load the Whop checkout loader script.  Only loads once.
   * Returns a promise that resolves when the script is ready.
   */
  function loadWhopScript() {
    // If Whop is already available, resolve immediately
    if (window.Whop) return Promise.resolve();
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://js.whop.com/static/checkout/loader.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load Whop checkout'));
      document.head.appendChild(s);
    });
    return scriptPromise;
  }

  /**
   * Convert a price map string into an object.  Accepts comma
   * or newline separated entries of the form `amount|planId`.
   * @param {string} str Raw map string
   */
  function parseMap(str) {
    const map = {};
    if (!str || typeof str !== 'string') return map;
    str.split(/[\n,]+/).forEach(item => {
      const parts = item.split('|');
      if (parts.length === 2) {
        const amt = parseFloat(parts[0].trim());
        const plan = parts[1].trim();
        if (!isNaN(amt) && plan) {
          map[amt.toFixed(2)] = plan;
        }
      }
    });
    return map;
  }

  /**
   * Choose the appropriate plan id given an amount and price map.
   * If no exact match is found (within two decimals), the default
   * plan id is returned.
   * @param {number} amount Total amount to match
   * @param {object} priceMap Map of amount string to plan id
   * @param {string} defaultPlan Fallback plan id
   */
  function choosePlan(amount, priceMap, defaultPlan) {
    const amt = parseFloat(amount);
    if (!isNaN(amt)) {
      const keys = Object.keys(priceMap);
      for (const k of keys) {
        const price = parseFloat(k);
        if (Math.abs(price - amt) < 0.01) {
          return priceMap[k];
        }
      }
    }
    return defaultPlan || '';
  }

  /**
   * Ensure the checkout overlay exists in the DOM.  If not,
   * constructs it with backdrop, modal and container elements.
   */
  function ensureOverlay() {
    let overlay = document.getElementById('whop-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'whop-overlay';
      overlay.className = 'whop-overlay';
      overlay.style.display = 'none';
      overlay.innerHTML = `
        <div class="whop-backdrop"></div>
        <div class="whop-modal">
          <button class="whop-close" type="button">×</button>
          <div class="whop-container"></div>
        </div>
      `;
      document.body.appendChild(overlay);
      const close = () => { overlay.style.display = 'none'; };
      overlay.querySelector('.whop-close').addEventListener('click', close);
      overlay.querySelector('.whop-backdrop').addEventListener('click', close);
    }
    return overlay;
  }

  /**
   * Main function to open the Whop checkout.  Accepts an options
   * object with amount, email, metadata, productPlan and
   * productPriceMap.  Relies on `window.whopSettings` and
   * `window.productData` for global and product defaults.
   */
  async function openCheckout(opts = {}) {
    const overlay = ensureOverlay();
    const globals = window.whopSettings || {};
    // Resolve plan sources: product‑level map takes precedence over global
    const prodMapStr = opts.productPriceMap || (window.productData && window.productData.whop_price_map) || '';
    const globalMapStr = globals.price_map || '';
    const priceMap = Object.assign({}, parseMap(globalMapStr), parseMap(prodMapStr));
    const defaultPlan = opts.productPlan || (window.productData && window.productData.whop_plan) || globals.default_plan_id || '';
    const selectedPlan = choosePlan(opts.amount || 0, priceMap, defaultPlan);
    const theme = globals.theme || 'light';
    const metadataObj = opts.metadata || {};
    const metadataStr = JSON.stringify(metadataObj);
    // Build embed markup
    let embed = `<div id="whop-embedded-checkout" data-whop-checkout-plan-id="${selectedPlan}" data-whop-checkout-theme="${theme}" data-whop-checkout-metadata='${metadataStr}'`;
    // Email prefill
    const email = opts.email && typeof opts.email === 'string' ? opts.email.trim() : '';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(email)) {
      const safe = email.toLowerCase();
      embed += ` data-whop-checkout-email="${safe}" data-whop-checkout-prefill-email="${safe}" data-whop-checkout-hide-email="true" data-whop-checkout-disable-email="true"`;
    }
    // Attach completion handler name; defined below
    embed += ` data-whop-checkout-on-complete="whopCheckoutComplete"></div>`;
    const container = overlay.querySelector('.whop-container');
    container.innerHTML = embed;
    // Show overlay and load script
    overlay.style.display = 'block';
    // Define fallback onComplete handler if none exists
    if (typeof window.whopCheckoutComplete !== 'function') {
      window.whopCheckoutComplete = function() {
        overlay.style.display = 'none';
        // In production, you could fetch details from your backend here
        alert('Purchase completed successfully!');
      };
    }
    await loadWhopScript();
  }

  // Export to global scope
  window.whopCheckout = openCheckout;
})();