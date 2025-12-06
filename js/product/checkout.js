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
    const email = prompt('Enter your email for delivery:');
    if (!email) {
      btn.disabled = false;
      updateTotal();
      return;
    }
    try {
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
      const res = await createOrder({
        email: email,
        amount: window.currentTotal,
        productId: window.productData.id,
        addons: selectedAddons
      });
      if (res.success) {
        window.location.href = 'order-success.html?orderId=' + res.orderId;
      }
    } catch (e) {
      alert('Error: ' + e.message);
      btn.disabled = false;
      updateTotal();
    }
  }
  window.updateTotal = updateTotal;
  window.handleCheckout = handleCheckout;
})();