/*
 * Simple Globo-style product addons / form builder.
 * Har field ek line ke JSON object me save hota hai.
 */

;(function () {
  const TYPES = [
    { value: 'heading', label: 'Heading' },
    { value: 'text', label: 'Short text' },
    { value: 'textarea', label: 'Long text' },
    { value: 'email', label: 'Email' },
    { value: 'select', label: 'Dropdown' },
    { value: 'radio', label: 'Radio buttons' },
    { value: 'checkbox_group', label: 'Checkbox group' },
    { value: 'file', label: 'File upload' }
  ];

  function slugify(str, index) {
    const base = (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return base || `field_${index}`;
  }

  function initAddonsBuilder(form) {
    const builder = form.querySelector('#addons-builder');
    if (!builder) return;
    const list = builder.querySelector('#addons-fields');
    const addBtn = builder.querySelector('#add-addon-field');
    const hidden = builder.querySelector('#addons-json');
    if (!list || !addBtn || !hidden) return;

    let counter = 1;

    addBtn.addEventListener('click', () => {
      list.appendChild(createFieldElement(counter++));
      syncHidden(form);
    });

    builder.addEventListener('click', e => {
      if (e.target.matches('.addon-remove-field')) {
        e.target.closest('.addon-field').remove();
        syncHidden(form);
      }
      if (e.target.matches('.addon-add-option')) {
        const fieldEl = e.target.closest('.addon-field');
        const wrap = fieldEl.querySelector('.addon-options');
        if (wrap) {
          wrap.appendChild(createOptionRow());
          syncHidden(form);
        }
      }
      if (e.target.matches('.addon-remove-option')) {
        e.target.closest('.addon-option-row').remove();
        syncHidden(form);
      }
    });

    builder.addEventListener('change', e => {
      if (e.target.matches('.addon-type')) {
        updateFieldMode(e.target.closest('.addon-field'));
      }
      syncHidden(form);
    });

    builder.addEventListener('input', () => syncHidden(form));

    // start with ek khali field
    list.appendChild(createFieldElement(counter++));
    syncHidden(form);
  }

  function createFieldElement(index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'addon-field';
    wrapper.dataset.index = String(index);
    wrapper.innerHTML = [
      '<div class="addon-field-header">',
      '  <strong class="addon-field-title">New field</strong>',
      '  <button type="button" class="btn addon-remove-field">Remove</button>',
      '</div>',
      '<div class="addon-field-body">',
      '  <label>Label',
      '    <input type="text" class="addon-label" placeholder="e.g. What shall we say?">',
      '  </label>',
      '  <label>Type',
      '    <select class="addon-type">',
           TYPES.map(t => `      <option value="${t.value}">${t.label}</option>`).join(''),
      '    </select>',
      '  </label>',
      '  <label>Placeholder',
      '    <input type="text" class="addon-placeholder" placeholder="Optional placeholder text">',
      '  </label>',
      '  <label>Help text',
      '    <input type="text" class="addon-help" placeholder="Short hint for customer">',
      '  </label>',
      '  <label>Required',
      '    <input type="checkbox" class="addon-required">',
      '  </label>',
      '  <label>Base extra price',
      '    <input type="number" step="0.01" class="addon-price" value="0">',
      '  </label>',
      '  <div class="addon-options-wrap">',
      '    <div class="addon-options"></div>',
      '    <button type="button" class="btn addon-add-option">Add option</button>',
      '    <p class="field-note">Options sirf dropdown, radio aur checkbox group k liye hain.</p>',
      '  </div>',
      '  <div class="addon-file-wrap">',
      '    <label><input type="checkbox" class="addon-file-multi"> Allow multiple files</label>',
      '    <label><input type="checkbox" class="addon-file-qty"> Ask for quantity</label>',
      '    <label>Price per file / unit',
      '      <input type="number" step="0.01" class="addon-file-price" value="0">',
      '    </label>',
      '  </div>',
      '</div>'
    ].join('\n');

    // default ek option row bana do taake user ko samaj aa jaye
    const optsWrap = wrapper.querySelector('.addon-options');
    if (optsWrap) {
      optsWrap.appendChild(createOptionRow());
    }
    // initial mode update
    updateFieldMode(wrapper);
    return wrapper;
  }

  function updateFieldMode(fieldEl) {
    if (!fieldEl) return;
    const type = fieldEl.querySelector('.addon-type')?.value || 'text';
    const optionsWrap = fieldEl.querySelector('.addon-options-wrap');
    const fileWrap = fieldEl.querySelector('.addon-file-wrap');
    const title = fieldEl.querySelector('.addon-field-title');
    if (title) {
      const label = fieldEl.querySelector('.addon-label')?.value || 'Field';
      title.textContent = label;
    }
    if (optionsWrap) {
      const showOptions = type === 'select' || type === 'radio' || type === 'checkbox_group';
      optionsWrap.style.display = showOptions ? 'block' : 'none';
    }
    if (fileWrap) {
      fileWrap.style.display = type === 'file' ? 'block' : 'none';
    }
  }

  function createOptionRow() {
    const row = document.createElement('div');
    row.className = 'addon-option-row';
    row.innerHTML = [
      '<label>Option label',
      '  <input type="text" class="addon-opt-label" placeholder="Option text">',
      '</label>',
      '<label>Extra price',
      '  <input type="number" step="0.01" class="addon-opt-price" value="0">',
      '</label>',
      '<label>Max files (optional)',
      '  <input type="number" min="0" class="addon-opt-maxfiles">',
      '</label>',
      '<label>',
      '  <input type="checkbox" class="addon-opt-default"> Default',
      '</label>',
      '<button type="button" class="btn addon-remove-option">Remove</button>'
    ].join('\n');
    return row;
  }

  function buildConfig(form) {
    const fields = [];
    const builder = form.querySelector('#addons-builder');
    if (!builder) return fields;
    const fieldEls = builder.querySelectorAll('.addon-field');
    fieldEls.forEach((fieldEl, idx) => {
      const type = fieldEl.querySelector('.addon-type').value;
      const label = fieldEl.querySelector('.addon-label').value.trim();
      if (!label && type !== 'heading') return;
      const placeholder = fieldEl.querySelector('.addon-placeholder').value.trim();
      const help = fieldEl.querySelector('.addon-help').value.trim();
      const required = !!fieldEl.querySelector('.addon-required').checked;
      const price = parseFloat(fieldEl.querySelector('.addon-price').value || '0') || 0;
      const id = slugify(label, idx + 1);
      const field = { id, type, label, placeholder, helpText: help, required, price };

      if (type === 'select' || type === 'radio' || type === 'checkbox_group') {
        const options = [];
        fieldEl.querySelectorAll('.addon-option-row').forEach(row => {
          const ol = row.querySelector('.addon-opt-label').value.trim();
          if (!ol) return;
          const op = parseFloat(row.querySelector('.addon-opt-price').value || '0') || 0;
          const maxFilesRaw = row.querySelector('.addon-opt-maxfiles').value;
          const maxFiles = maxFilesRaw ? parseInt(maxFilesRaw, 10) : null;
          const def = !!row.querySelector('.addon-opt-default').checked;
          options.push({ label: ol, price: op, default: def, maxFiles });
        });
        field.options = options;
      }

      if (type === 'file') {
        field.file = {
          multiple: !!fieldEl.querySelector('.addon-file-multi').checked,
          askQuantity: !!fieldEl.querySelector('.addon-file-qty').checked,
          pricePerUnit: parseFloat(fieldEl.querySelector('.addon-file-price').value || '0') || 0
        };
      }

      fields.push(field);
    });
    return fields;
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