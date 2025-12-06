;(function () {
  const TYPES = [
    { value: '', label: 'Select field type' },
    { value: 'heading', label: 'Heading' },
    { value: 'text', label: 'Text field' },
    { value: 'textarea', label: 'Long text / notes' },
    { value: 'email', label: 'Email' },
    { value: 'file', label: 'File upload' },
    { value: 'radio', label: 'Radio buttons' },
    { value: 'select', label: 'Dropdown list' },
    { value: 'checkbox_group', label: 'Checkbox group' }
  ];
  function slugify(str, index) {
    const base = (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return base || `field_${index}`;
  }
  function numVal(v) {
    if (!v) return 0;
    const n = parseFloat(v);
    return Number.isNaN(n) ? 0 : n;
  }
  function intVal(v) {
    if (!v) return 0;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? 0 : n;
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
      list.appendChild(createFieldRow(counter++));
      syncHidden(form);
    });
    builder.addEventListener('click', e => {
      if (e.target.matches('.addon-remove-field')) {
        e.target.closest('.addon-field')?.remove();
        syncHidden(form);
      }
      if (e.target.matches('.addon-add-option')) {
        const fieldEl = e.target.closest('.addon-field');
        const wrap = fieldEl?.querySelector('.addon-options');
        if (wrap) {
          wrap.appendChild(createOptionRow());
          syncHidden(form);
        }
      }
      if (e.target.matches('.addon-remove-option')) {
        e.target.closest('.addon-option-row')?.remove();
        syncHidden(form);
      }
    });
    builder.addEventListener('change', e => {
      const target = e.target;
      if (target.matches('.addon-type')) {
        const fieldEl = target.closest('.addon-field');
        renderTypeConfig(fieldEl);
      }
      if (target.matches('.addon-opt-file') || target.matches('.addon-opt-text')) {
        const row = target.closest('.addon-option-row');
        updateOptionVisibility(row);
      }
      syncHidden(form);
    });
    builder.addEventListener('input', () => syncHidden(form));
  }
  function createFieldRow(index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'addon-field';
    wrapper.dataset.index = String(index);
    wrapper.innerHTML = [
      '<div class="addon-row-header">',
      '  <div class="addon-row-main">',
      '    <label>Field type',
      '      <select class="addon-type">',
           TYPES.map(t => `        <option value="${t.value}">${t.label}</option>`).join(''),
      '      </select>',
      '    </label>',
      '    <label class="addon-label-wrap">Label',
      '      <input type="text" class="addon-label" placeholder="e.g. Choose song">',
      '    </label>',
      '  </div>',
      '  <button type="button" class="btn btn-secondary addon-remove-field">Remove</button>',
      '</div>',
      '<div class="addon-row-config"><p class="field-note">Field type select karo, phir yahan uski settings nazar aayengi.</p></div>'
    ].join('\n');
    return wrapper;
  }
  function renderTypeConfig(fieldEl) {
    if (!fieldEl) return;
    const type = fieldEl.querySelector('.addon-type')?.value || '';
    const cfg = fieldEl.querySelector('.addon-row-config');
    if (!cfg) return;
    if (!type) {
      cfg.innerHTML = '<p class="field-note">Field type select karo, phir yahan uski settings nazar aayengi.</p>';
      return;
    }
    if (type === 'heading') {
      cfg.innerHTML = [
        '<div class="form-field">',
        '  <span class="field-note">Heading sirf text show karega, koi input nahi.</span>',
        '  <label>Heading text',
        '    <input type="text" class="addon-heading-text" placeholder="Section heading">',
        '  </label>',
        '</div>'
      ].join('\n');
      return;
    }
    if (type === 'text' || type === 'textarea' || type === 'email') {
      cfg.innerHTML = [
        '<div class="form-grid-2">',
        '  <div class="form-field">',
        '    <label>Placeholder',
        '      <input type="text" class="addon-placeholder" placeholder="Optional placeholder">',
        '    </label>',
        '  </div>',
        '  <div class="form-field">',
        '    <label>Extra price',
        '      <input type="number" step="0.01" class="addon-price" value="0">',
        '    </label>',
        '  </div>',
        '</div>',
        '<div class="form-field form-field-inline">',
        '  <label>',
        '    <input type="checkbox" class="addon-required"> Required',
        '  </label>',
        '</div>'
      ].join('\n');
      return;
    }
    if (type === 'file') {
      cfg.innerHTML = [
        '<div class="form-grid-2">',
        '  <div class="form-field">',
        '    <label>Price per file',
        '      <input type="number" step="0.01" class="addon-file-price" value="0">',
        '    </label>',
        '  </div>',
        '  <div class="form-field form-field-inline">',
        '    <label>',
        '      <input type="checkbox" class="addon-required"> Required',
        '    </label>',
        '  </div>',
        '</div>',
        '<div class="form-field form-field-inline">',
        '  <label>',
        '    <input type="checkbox" class="addon-file-multi"> Allow multiple files',
        '  </label>',
        '</div>'
      ].join('\n');
      return;
    }
    if (type === 'radio' || type === 'select' || type === 'checkbox_group') {
      cfg.innerHTML = [
        '<p class="field-note">Har option ke saath price, file quantity aur extra text field control kar sakte ho.</p>',
        '<div class="addon-options"></div>',
        '<button type="button" class="btn btn-secondary addon-add-option">Add option</button>'
      ].join('\n');
      const wrap = fieldEl.querySelector('.addon-options');
      if (wrap && !wrap.querySelector('.addon-option-row')) {
        wrap.appendChild(createOptionRow());
      }
      return;
    }
  }
  function createOptionRow() {
    const row = document.createElement('div');
    row.className = 'addon-option-row';
    row.innerHTML = [
      '<div class="form-grid-2 addon-option-main">',
      '  <div class="form-field">',
      '    <label>Option label',
      '      <input type="text" class="addon-opt-label" placeholder="e.g. 1 photo">',
      '    </label>',
      '  </div>',
      '  <div class="form-field">',
      '    <label>Extra price',
      '      <input type="number" step="0.01" class="addon-opt-price" value="0">',
      '    </label>',
      '  </div>',
      '</div>',
      '<div class="addon-option-flags">',
      '  <label><input type="checkbox" class="addon-opt-file"> File</label>',
      '  <label><input type="checkbox" class="addon-opt-text"> Text field</label>',
      '  <label><input type="checkbox" class="addon-opt-default"> Default</label>',
      '  <button type="button" class="btn btn-secondary addon-remove-option">Remove</button>',
      '</div>',
      '<div class="addon-option-config addon-option-file" style="display:none;">',
      '  <div class="form-field">',
      '    <label>File quantity',
      '      <input type="number" min="1" class="addon-opt-fileqty" placeholder="e.g. 1, 2, 3">',
      '    </label>',
      '  </div>',
      '</div>',
      '<div class="addon-option-config addon-option-text" style="display:none;">',
      '  <div class="form-grid-2">',
      '    <div class="form-field">',
      '      <label>Text field label',
      '        <input type="text" class="addon-opt-text-label" placeholder="Label for extra text field">',
      '      </label>',
      '    </div>',
      '    <div class="form-field">',
      '      <label>Text placeholder',
      '        <input type="text" class="addon-opt-text-placeholder" placeholder="Placeholder for extra text">',
      '      </label>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');
    return row;
  }
  function updateOptionVisibility(row) {
    if (!row) return;
    const fileOn = row.querySelector('.addon-opt-file')?.checked;
    const textOn = row.querySelector('.addon-opt-text')?.checked;
    const fileCfg = row.querySelector('.addon-option-file');
    const textCfg = row.querySelector('.addon-option-text');
    if (fileCfg) fileCfg.style.display = fileOn ? 'block' : 'none';
    if (textCfg) textCfg.style.display = textOn ? 'block' : 'none';
  }
  function buildConfig(form) {
    const result = [];
    const builder = form.querySelector('#addons-builder');
    if (!builder) return result;
    const fields = builder.querySelectorAll('.addon-field');
    fields.forEach((fieldEl, idx) => {
      const type = fieldEl.querySelector('.addon-type')?.value || '';
      const label = fieldEl.querySelector('.addon-label')?.value.trim() || '';
      if (!type) return;
      if (!label && type !== 'heading') return;
      const id = slugify(label, idx + 1);
      const field = { id, type, label };
      if (type === 'heading') {
        field.text = fieldEl.querySelector('.addon-heading-text')?.value.trim() || label;
      } else if (type === 'text' || type === 'textarea' || type === 'email') {
        field.placeholder = fieldEl.querySelector('.addon-placeholder')?.value.trim() || '';
        field.price = numVal(fieldEl.querySelector('.addon-price')?.value);
        field.required = !!fieldEl.querySelector('.addon-required')?.checked;
      } else if (type === 'file') {
        field.file = {
          pricePerFile: numVal(fieldEl.querySelector('.addon-file-price')?.value),
          multiple: !!fieldEl.querySelector('.addon-file-multi')?.checked
        };
        field.required = !!fieldEl.querySelector('.addon-required')?.checked;
      } else if (type === 'radio' || type === 'select' || type === 'checkbox_group') {
        const options = [];
        fieldEl.querySelectorAll('.addon-option-row').forEach(row => {
          const oLabel = row.querySelector('.addon-opt-label')?.value.trim() || '';
          if (!oLabel) return;
          options.push({
            label: oLabel,
            price: numVal(row.querySelector('.addon-opt-price')?.value),
            file: !!row.querySelector('.addon-opt-file')?.checked,
            fileQuantity: intVal(row.querySelector('.addon-opt-fileqty')?.value),
            textField: !!row.querySelector('.addon-opt-text')?.checked,
            textLabel: row.querySelector('.addon-opt-text-label')?.value.trim() || '',
            textPlaceholder: row.querySelector('.addon-opt-text-placeholder')?.value.trim() || '',
            default: !!row.querySelector('.addon-opt-default')?.checked
          });
        });
        if (!options.length) return;
        field.options = options;
      }
      result.push(field);
    });
    return result;
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