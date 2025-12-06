/*
 * UI helpers for rendering product addon controls.  These functions
 * were extracted from the original product.js to reduce file size.
 * They generate the appropriate form fields for each addon group and
 * any associated extra inputs (file uploads or text boxes).  The
 * functions attach themselves to the global window object so they can
 * be called from other scripts.
 */

;(function(){
  function renderAddonField(field) {
    const container = document.createElement('div');
    container.className = 'addon-group';
    if (field.label) {
      const lbl = document.createElement('label');
      lbl.className = 'addon-group-label';
      lbl.innerHTML = field.label + (field.required ? ' <span style="color:red">*</span>' : '');
      container.appendChild(lbl);
    }
    const extrasContainer = document.createElement('div');
    extrasContainer.className = 'addon-extras';
    let input;
    if (field.type === 'select') {
      input = document.createElement('select');
      input.className = 'form-select';
      input.name = field.id;
      field.options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.label;
        o.dataset.price = opt.price || 0;
        if (opt.file) o.dataset.needsFile = 'true';
        if (opt.textField) o.dataset.needsText = 'true';
        o.text = opt.label + (opt.price > 0 ? ' (+$' + opt.price + ')' : '');
        if (opt.default) o.selected = true;
        input.add(o);
      });
      input.onchange = function() {
        if (typeof updateTotal === 'function') updateTotal();
        const sel = input.selectedOptions[0];
        renderExtras(extrasContainer, sel ? sel.dataset : {}, field.id);
      };
      const initSel = input.selectedOptions[0];
      if (initSel) renderExtras(extrasContainer, initSel.dataset, field.id);
    } else if (field.type === 'radio') {
      input = document.createElement('div');
      field.options.forEach(opt => {
        const l = document.createElement('label');
        l.className = 'addon-option-card';
        const r = document.createElement('input');
        r.type = 'radio';
        r.name = field.id;
        r.value = opt.label;
        r.className = 'addon-radio';
        r.dataset.price = opt.price || 0;
        if (opt.file) r.dataset.needsFile = 'true';
        if (opt.textField) r.dataset.needsText = 'true';
        if (opt.default) {
          r.checked = true;
          l.classList.add('selected');
        }
        r.onchange = function() {
          if (typeof updateTotal === 'function') updateTotal();
          renderExtras(extrasContainer, r.dataset, field.id);
          const allLabels = input.querySelectorAll('.addon-option-card');
          allLabels.forEach(c => c.classList.remove('selected'));
          if (r.checked) l.classList.add('selected');
        };
        l.appendChild(r);
        l.appendChild(document.createTextNode(' ' + opt.label));
        if (opt.price > 0) {
          const p = document.createElement('span');
          p.className = 'opt-price';
          p.textContent = ' +$' + opt.price;
          l.appendChild(p);
        }
        input.appendChild(l);
      });
      setTimeout(function() {
        const checked = input.querySelector('input:checked');
        if (checked) renderExtras(extrasContainer, checked.dataset, field.id);
      }, 0);
    } else if (field.type === 'checkbox_group') {
      input = document.createElement('div');
      field.options.forEach((opt, idx) => {
        const wrapper = document.createElement('div');
        const l = document.createElement('label');
        l.className = 'addon-option-card';
        const c = document.createElement('input');
        c.type = 'checkbox';
        c.name = field.id + '[]';
        c.value = opt.label;
        c.className = 'addon-checkbox';
        c.dataset.price = opt.price || 0;
        if (opt.file) c.dataset.needsFile = 'true';
        if (opt.textField) c.dataset.needsText = 'true';
        if (opt.default) {
          c.checked = true;
          l.classList.add('selected');
        }
        const subExtras = document.createElement('div');
        subExtras.style.marginLeft = '1.5rem';
        c.onchange = function() {
          if (typeof updateTotal === 'function') updateTotal();
          if (c.checked) {
            l.classList.add('selected');
            renderExtras(subExtras, c.dataset, field.id + '_' + idx);
          } else {
            l.classList.remove('selected');
            subExtras.innerHTML = '';
          }
        };
        l.appendChild(c);
        l.appendChild(document.createTextNode(' ' + opt.label));
        if (opt.price > 0) {
          const p = document.createElement('span');
          p.className = 'opt-price';
          p.textContent = ' +$' + opt.price;
          l.appendChild(p);
        }
        wrapper.appendChild(l);
        wrapper.appendChild(subExtras);
        input.appendChild(wrapper);
        if (c.checked) renderExtras(subExtras, c.dataset, field.id + '_' + idx);
      });
      container.appendChild(input);
      return container;
    } else {
      input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input');
      input.className = field.type === 'textarea' ? 'form-textarea' : 'form-input';
      if (field.type !== 'textarea') input.type = field.type;
      input.name = field.id;
      if (field.placeholder) input.placeholder = field.placeholder;
      if (field.required) input.required = true;
    }
    container.appendChild(input);
    if (field.type !== 'checkbox_group') container.appendChild(extrasContainer);
    return container;
  }
  function renderExtras(container, dataset, idSuffix) {
    container.innerHTML = '';
    if (dataset.needsFile === 'true') {
      const d = document.createElement('div');
      d.style.marginTop = '0.5rem';
      d.innerHTML = '<label style="font-size:0.9rem;display:block;margin-bottom:0.2rem">Upload File:</label>';
      const f = document.createElement('input');
      f.type = 'file';
      f.name = 'file_' + idSuffix;
      d.appendChild(f);
      container.appendChild(d);
    }
    if (dataset.needsText === 'true') {
      const d = document.createElement('div');
      d.style.marginTop = '0.5rem';
      d.innerHTML = '<label style="font-size:0.9rem;display:block;margin-bottom:0.2rem">Details:</label>';
      const t = document.createElement('input');
      t.type = 'text';
      t.className = 'form-input';
      t.name = 'text_' + idSuffix;
      t.placeholder = 'Enter details...';
      d.appendChild(t);
      container.appendChild(d);
    }
  }
  window.renderAddonField = renderAddonField;
  window.renderExtras = renderExtras;
})();