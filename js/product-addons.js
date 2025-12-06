/*
 * Product addons builder – yahan se admin custom fields bana sakta hai.
 * Ye sirf admin UI ka helper hai, actual save / DB mapping baad me hoga.
 */

;(function () {
  const TYPES = [
    { value: 'heading', label: 'Heading' },
    { value: 'email', label: 'Email field' },
    { value: 'text', label: 'Text field' },
    { value: 'textarea', label: 'Textarea' },
    { value: 'file', label: 'File upload (with quantity)' },
    { value: 'checkbox_group', label: 'Checkbox group' },
    { value: 'radio_group', label: 'Radio button group' },
    { value: 'select_group', label: 'Dropdown list' }
  ];

  function slugify(str) {
    return (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'field';
  }

  function initAddonsBuilder(form) {
    const builder = form.querySelector('#addons-builder');
    if (!builder) return;
    const list = builder.querySelector('#addons-list');
    const addBtn = builder.querySelector('#add-addon-group');
    const hidden = builder.querySelector('#addons-json');
    if (!list || !addBtn || !hidden) return;

    addBtn.addEventListener('click', () => {
      list.appendChild(createGroupElement());
      syncHidden(form);
    });

    builder.addEventListener('click', e => {
      if (e.target.matches('.addon-remove-group')) {
        e.target.closest('.addon-group').remove();
        syncHidden(form);
      }
      if (e.target.matches('.addon-add-option')) {
        const groupEl = e.target.closest('.addon-group');
        const items = groupEl.querySelector('.addon-items');
        if (items) {
          items.appendChild(createOptionRow());
          syncHidden(form);
        }
      }
      if (e.target.matches('.addon-remove-option')) {
        e.target.closest('.addon-item-row').remove();
        syncHidden(form);
      }
    });

    builder.addEventListener('input', () => syncHidden(form));
  }

  function createGroupElement() {
    const wrapper = document.createElement('div');
    wrapper.className = 'addon-group';
    wrapper.innerHTML = [
      '<div class="addon-group-header">',
      '  <label>Group label',
      '    <input type="text" class="addon-group-label" placeholder="e.g. Customer details">',
      '  </label>',
      '  <label>Type',
      '    <select class="addon-type">',
           TYPES.map(t => `      <option value="${t.value}">${t.label}</option>`).join(''),
      '    </select>',
      '  </label>',
      '  <button type="button" class="btn addon-remove-group">Remove group</button>',
      '</div>',
      '<div class="addon-body">',
      '  <div class="addon-single-fields">',
      '    <label>Field label',
      '      <input type="text" class="addon-field-label" placeholder="Label shown to customer">',
      '    </label>',
      '    <label>Placeholder',
      '      <input type="text" class="addon-field-placeholder" placeholder="Optional placeholder text">',
      '    </label>',
      '    <label>Extra price',
      '      <input type="number" step="0.01" class="addon-field-price" value="0">',
      '    </label>',
      '    <label class="addon-file-extra">',
      '      <input type="checkbox" class="addon-file-qty"> Allow quantity with file upload',
      '    </label>',
      '  </div>',
      '  <div class="addon-group-fields">',
      '    <div class="addon-items"></div>',
      '    <button type="button" class="btn addon-add-option">Add option</button>',
      '    <p class="field-note">Har option ke saath label, price, placeholder aur default select set kar sakte hain.</p>',
      '  </div>',
      '</div>'
    ].join('\n');
    // pehle se ek option row add kar do group types ke liye
    const items = wrapper.querySelector('.addon-items');
    if (items) items.appendChild(createOptionRow());
    return wrapper;
  }

  function createOptionRow() {
    const row = document.createElement('div');
    row.className = 'addon-item-row';
    row.innerHTML = [
      '<label>Option label',
      '  <input type="text" class="addon-item-label" placeholder="Option text">',
      '</label>',
      '<label>Price',
      '  <input type="number" step="0.01" class="addon-item-price" value="0">',
      '</label>',
      '<label>Placeholder',
      '  <input type="text" class="addon-item-placeholder" placeholder="Optional placeholder">',
      '</label>',
      '<label>',
      '  <input type="checkbox" class="addon-item-default"> Default selected',
      '</label>',
      '<button type="button" class="btn addon-remove-option">Remove</button>'
    ].join('\n');
    return row;
  }

  function buildConfig(form) {
    const groups = [];
    const builder = form.querySelector('#addons-builder');
    if (!builder) return groups;
    builder.querySelectorAll('.addon-group').forEach(groupEl => {
      const type = groupEl.querySelector('.addon-type').value;
      const label = groupEl.querySelector('.addon-group-label').value.trim();
      const key = slugify(label);
      const base = { key, type, label, items: [], options: {} };

      if (type === 'heading') {
        base.options.kind = 'heading';
      } else if (type === 'file') {
        base.options.allowQuantity = !!groupEl.querySelector('.addon-file-qty')?.checked;
        const fLabel = groupEl.querySelector('.addon-field-label').value.trim();
        const fPlaceholder = groupEl.querySelector('.addon-field-placeholder').value.trim();
        const fPrice = parseFloat(groupEl.querySelector('.addon-field-price').value || '0') || 0;
        base.items.push({
          label: fLabel || label,
          placeholder: fPlaceholder,
          price: fPrice
        });
      } else if (type === 'email' || type === 'text' || type === 'textarea') {
        const fLabel = groupEl.querySelector('.addon-field-label').value.trim();
        const fPlaceholder = groupEl.querySelector('.addon-field-placeholder').value.trim();
        const fPrice = parseFloat(groupEl.querySelector('.addon-field-price').value || '0') || 0;
        base.items.push({
          label: fLabel || label,
          placeholder: fPlaceholder,
          price: fPrice
        });
      } else {
        const itemsEl = groupEl.querySelectorAll('.addon-item-row');
        itemsEl.forEach(row => {
          const oLabel = row.querySelector('.addon-item-label').value.trim();
          if (!oLabel) return;
          const oPlaceholder = row.querySelector('.addon-item-placeholder').value.trim();
          const oPrice = parseFloat(row.querySelector('.addon-item-price').value || '0') || 0;
          const oDefault = !!row.querySelector('.addon-item-default').checked;
          base.items.push({
            label: oLabel,
            placeholder: oPlaceholder,
            price: oPrice,
            default: oDefault
          });
        });
      }

      if (base.items.length || type === 'heading') {
        groups.push(base);
      }
    });
    return groups;
  }

  function syncHidden(form) {
    const hidden = form.querySelector('#addons-json');
    if (!hidden) return;
    const cfg = buildConfig(form);
    hidden.value = cfg.length ? JSON.stringify(cfg) : '';
  }

  window.initAddonsBuilder = initAddonsBuilder;
  window.readAddonsConfig = function (form) {
    return buildConfig(form);
  };
})();