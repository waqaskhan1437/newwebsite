/*
 * Initialiser for the addon builder.  Attaches all necessary event
 * handlers to add/remove fields and options, reacts to changes in
 * field type and option flags, keeps the hidden JSON input up to
 * date and seeds the builder with demo data when empty.
 */

;(function(){
  function initAddonsBuilder(form) {
    const builder = form.querySelector('#addons-builder');
    if (!builder) return;
    const list = builder.querySelector('#addons-fields');
    const addBtn = builder.querySelector('#add-addon-field');
    const hidden = builder.querySelector('#addons-json');
    if (!list || !addBtn || !hidden) return;
    let counter = 1;
    addBtn.addEventListener('click', () => {
      list.appendChild(window.createFieldRow(counter++));
      window.syncAddonsHidden(form);
    });
    builder.addEventListener('click', e => {
      const t = e.target;
      if (t.matches('.addon-remove-field')) {
        t.closest('.addon-field')?.remove();
        window.syncAddonsHidden(form);
      }
      if (t.matches('.addon-add-option')) {
        const field = t.closest('.addon-field');
        const wrap = field?.querySelector('.addon-options');
        if (wrap) {
          wrap.appendChild(window.createOptionRow());
          window.syncAddonsHidden(form);
        }
      }
      if (t.matches('.addon-remove-option')) {
        t.closest('.addon-option-row')?.remove();
        window.syncAddonsHidden(form);
      }
    });
    builder.addEventListener('change', e => {
      const t = e.target;
      if (t.matches('.addon-type')) {
        const field = t.closest('.addon-field');
        window.renderTypeConfig(field);
      }
      if (t.matches('.addon-opt-file') || t.matches('.addon-opt-text')) {
        const row = t.closest('.addon-option-row');
        window.updateOptionVisibility(row);
      }
      window.syncAddonsHidden(form);
    });
    builder.addEventListener('input', () => window.syncAddonsHidden(form));
    if (!hidden.value) {
      // When no saved config exists, seed with demo data
      window.seedAddonsDemo(list, counter);
      window.syncAddonsHidden(form);
    }
  }
  window.initAddonsBuilder = initAddonsBuilder;
})();