/*
 * Admin product form logic.  Abhi sirf product info + media form ready kar rahe
 * hain; actual save / R2 upload next step me implement hoga.
 */

;(async function initProductForm() {
  const params = new URLSearchParams(location.search);
  const productId = params.get('id');
  const form = document.getElementById('product-form');
  if (!form) return;

  setupGalleryField(form);

  if (productId) {
    try {
      const { product } = await getProduct(productId);
      if (product) populateForm(product);
    } catch (e) {
      console.error(e);
    }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const base = {
      title: form.title.value.trim(),
      slug: form.slug.value.trim(),
      description: form.description.value.trim(),
      normal_price: parseFloat(form.normal_price.value) || 0,
      sale_price: form.sale_price.value ? parseFloat(form.sale_price.value) : null,
      instant_delivery: form.instant_delivery.checked ? 1 : 0,
      normal_delivery_text: form.normal_delivery_text.value.trim()
    };
    const media = readMediaFields(form);
    const payload = { ...base, ...media.meta };

    console.log('Product payload', payload);
    console.log('Media files', media.files);
    alert('Form ready hai, save / upload API next step me banayenge.');
  });
})();

function setupGalleryField(form) {
  const wrapper = form.querySelector('#gallery-wrapper');
  const addBtn = document.getElementById('add-gallery-image');
  if (!wrapper || !addBtn) return;
  addBtn.addEventListener('click', () => {
    const firstRow = wrapper.querySelector('.gallery-row');
    if (!firstRow) return;
    const clone = firstRow.cloneNode(true);
    clone.querySelectorAll('input').forEach(input => {
      if (input.type === 'file') input.value = '';
      else input.value = '';
    });
    wrapper.insertBefore(clone, addBtn);
  });
}

function readMediaFields(form) {
  const thumbFile = form.thumbnail_file && form.thumbnail_file.files[0] ? form.thumbnail_file.files[0] : null;
  const videoFile = form.video_file && form.video_file.files[0] ? form.video_file.files[0] : null;

  const galleryRows = Array.from(form.querySelectorAll('#gallery-wrapper .gallery-row'));
  const galleryFiles = [];
  const galleryUrls = [];

  galleryRows.forEach(row => {
    const fileInput = row.querySelector('input[name="gallery_files[]"]');
    const urlInput = row.querySelector('input[name="gallery_urls[]"]');
    if (fileInput && fileInput.files[0]) galleryFiles.push(fileInput.files[0]);
    if (urlInput && urlInput.value.trim()) galleryUrls.push(urlInput.value.trim());
  });

  const thumbnail_url = form.thumbnail_url.value.trim();
  const video_url = form.video_url.value.trim();

  return {
    meta: {
      thumbnail_url,
      video_url,
      gallery_urls: galleryUrls
    },
    files: {
      thumbnail_file: thumbFile,
      video_file: videoFile,
      gallery_files: galleryFiles
    }
  };
}

function populateForm(product) {
  const form = document.getElementById('product-form');
  if (!form) return;
  form.title.value = product.title || '';
  form.slug.value = product.slug || '';
  form.description.value = product.description || '';
  form.normal_price.value = product.normal_price || '';
  form.sale_price.value = product.sale_price || '';
  form.instant_delivery.checked = !!product.instant_delivery;
  form.normal_delivery_text.value = product.normal_delivery_text || '';
  if (product.thumbnail_url) form.thumbnail_url.value = product.thumbnail_url;
  if (product.video_url) form.video_url.value = product.video_url;
}
