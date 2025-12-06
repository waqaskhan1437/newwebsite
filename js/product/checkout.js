/*
 * Pricing and checkout helpers extracted from the original product.js.
 * The updateTotal function recalculates the total price based on
 * selected addon options, while handleCheckout performs basic
 * validation and submits the order to the backend.  Both functions
 * reference globals (basePrice, currentTotal, productData) defined in
 * product/main.js and are attached to the window object.
 */

;(function(){
  function updateTotal() {
    let addonTotal = 0;
    const selects = document.querySelectorAll('select.form-select');
    selects.forEach(sel => {
      const opt = sel.selectedOptions[0];
      if (opt && opt.dataset.price) addonTotal += parseFloat(opt.dataset.price);
    });
    const inputs = document.querySelectorAll('input.addon-radio:checked, input.addon-checkbox:checked');
    inputs.forEach(el => {
      if (el.dataset.price) addonTotal += parseFloat(el.dataset.price);
    });
    window.currentTotal = window.basePrice + addonTotal;
    const btn = document.getElementById('checkout-btn');
    if (btn) btn.textContent = 'Checkout - $' + window.currentTotal.toLocaleString();
  }
  async function handleCheckout() {
    const btn = document.getElementById('checkout-btn');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Processing...';
    let valid = true;
    document.querySelectorAll('.addon-group').forEach(grp => {
      const lbl = grp.querySelector('.addon-group-label');
      if (lbl && lbl.innerText.includes('*')) {
        const inp = grp.querySelector('input, select, textarea');
        if (inp && !inp.value) {
          inp.style.borderColor = 'red';
          valid = false;
        }
      }
    });
    if (!valid) {
      alert('Please fill required fields');
      btn.disabled = false;
      updateTotal();
      return;
    }
    // Attempt to capture an email from the addons form.  If an
    // email field exists and contains a valid email, we will pass
    // it to the Whop checkout to prefill the address.  Otherwise
    // we omit the email and allow the Whop UI to collect it.
    let email = '';
    const emailInput = document.querySelector('#addons-form input[type="email"]');
    if (emailInput) {
      const value = emailInput.value.trim();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && emailPattern.test(value)) {
        email = value;
      }
    }
    // Gather selected addons for optional metadata; convert FormData into
    // a list of field/value pairs.  If a file is selected, include
    // its name only.  Metadata is passed through to the Whop
    // checkout to aid order reconciliation on your backend.
    const selectedAddons = [];
    const formEl = document.getElementById('addons-form');
    if (formEl) {
      const formData = new FormData(formEl);
      for (const pair of formData.entries()) {
        const key = pair[0];
        const val = pair[1];
        if (!val || (val instanceof File && val.size === 0)) continue;
        let displayVal = val;
        if (val instanceof File) displayVal = 'File: ' + val.name;
        selectedAddons.push({ field: key, value: displayVal });
      }
    }
    // Open the Whop checkout modal.  Use global/product settings to
    // determine the appropriate plan based on the total amount.  Pass
    // along metadata so that post‑purchase processing can reattach
    // selected addons and product identification.
    if (typeof window.whopCheckout === 'function') {
      window.whopCheckout({
        amount: window.currentTotal,
        email: email,
        metadata: {
          productId: window.productData.id,
          addons: selectedAddons
        },
        productPlan: window.productData.whop_plan || '',
        productPriceMap: window.productData.whop_price_map || ''
      });
    } else {
      alert('Whop checkout is not available. Please contact support.');
    }
    // Re‑enable the button and reset the label in case the modal is closed
    btn.disabled = false;
    updateTotal();
  }
  window.updateTotal = updateTotal;
  window.handleCheckout = handleCheckout;
})();