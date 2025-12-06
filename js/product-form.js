/*
 * Admin product form logic.  Supports adding a new product or editing an
 * existing one.  For now it simply loads the product details if an ID
 * is present in the query string and populates the form fields.  Saving
 * is left as a TODO – you can extend this file to call your Worker
 * endpoints for creating and updating products.
 */

;(async function initProductForm() {
  const params = new URLSearchParams(location.search);
  const productId = params.get('id');
  const form = document.getElementById('product-form');
  if (!form) return;
  if (productId) {
    // Editing existing product
    try {
      const { product, addons } = await getProduct(productId);
      if (product) populateForm(product);
    } catch (e) {
      console.error(e);
    }
  }
  // Handle form submit
  form.addEventListener('submit', async e => {
    e.preventDefault();
    // Gather values
    const data = {
      title: form.title.value,
      slug: form.slug.value,
      description: form.description.value,
      normal_price: parseFloat(form.normal_price.value) || 0,
      sale_price: parseFloat(form.sale_price.value) || null,
      instant_delivery: form.instant_delivery.checked ? 1 : 0,
      normal_delivery_text: form.normal_delivery_text.value,
      thumbnail_url: form.thumbnail_url.value,
      video_url: form.video_url.value
    };
    console.log('Form data', data);
    alert('Save functionality not implemented yet.');
  });
})();

function populateForm(product) {
  const form = document.getElementById('product-form');
  form.title.value = product.title || '';
  form.slug.value = product.slug || '';
  form.description.value = product.description || '';
  form.normal_price.value = product.normal_price || '';
  form.sale_price.value = product.sale_price || '';
  form.instant_delivery.checked = !!product.instant_delivery;
  form.normal_delivery_text.value = product.normal_delivery_text || '';
  form.thumbnail_url.value = product.thumbnail_url || '';
  form.video_url.value = product.video_url || '';
}