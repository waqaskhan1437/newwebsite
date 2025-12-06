/*
 * Admin Product Form Logic
 * Handles initialization, demo data seeding, and form submission.
 */

;(async function initProductForm(){
  const params = new URLSearchParams(location.search);
  const productId = params.get('id');
  const form = document.getElementById('product-form');
  
  if(!form) return;
  
  // Initialize dynamic fields
  setupGalleryField(form);
  if(typeof initAddonsBuilder === 'function') initAddonsBuilder(form);

  if(productId){
    try{
      const { product } = await getProduct(productId);
      if(product){
        fillBaseFields(form, product);
        if(typeof populateSeoForm === 'function') populateSeoForm(form, product);
        if(product.addons && typeof window.populateAddonsFromConfig === 'function'){
          console.log('Addons loaded:', product.addons);
        }
      }
    } catch(err){
      console.error('Failed to load product', err);
      alert('Error loading product details.');
    }
  } else {
    fillDemoProduct(form);
  }

  // Handle Form Submit
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
      const base = collectBase(form);
      const media = readMediaFields(form);
      const seo = typeof readSeoFields === 'function' ? readSeoFields(form) : { meta: {} };
      const addons = typeof readAddonsConfig === 'function' ? readAddonsConfig(form) : [];
      
      const payload = { ...base, ...media.meta, ...seo.meta, addons };
      if(productId) payload.id = Number(productId);
      
      console.log('Media files for future upload logic:', media.files);

      const resp = await fetch('/api/admin/product/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await resp.json();
      
      if(!resp.ok || !data.success){
        throw new Error(data.error || 'Save failed');
      }
      
      alert('Product saved successfully! ID: ' + data.id);
      if(!productId) {
        window.location.href = `product-form.html?id=${data.id}`;
      }
    } catch(err){
      console.error('Save error', err);
      alert('Error saving product: ' + (err.message || 'Unknown error'));
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
})();

function setupGalleryField(form){
  const wrapper = form.querySelector('#gallery-wrapper');
  const addBtn = document.getElementById('add-gallery-image');
  if(!wrapper || !addBtn) return;
  
  addBtn.addEventListener('click', () => {
    const first = wrapper.querySelector('.gallery-row');
    if(!first) return;
    const clone = first.cloneNode(true);
    clone.querySelectorAll('input').forEach(inp => inp.value = '');
    wrapper.insertBefore(clone, addBtn);
  });
}

function collectBase(form){
  return {
    title: form.title.value.trim(),
    slug: form.slug.value.trim(),
    description: form.description.value.trim(),
    normal_price: parseFloat(form.normal_price.value) || 0,
    sale_price: form.sale_price.value ? parseFloat(form.sale_price.value) : null,
    instant_delivery: form.instant_delivery.checked ? 1 : 0,
    normal_delivery_text: form.normal_delivery_text.value.trim(),
    // Whop integration fields (optional)
    whop_plan: form.whop_plan ? form.whop_plan.value.trim() : '',
    whop_price_map: form.whop_price_map ? form.whop_price_map.value.trim() : ''
  };
}

function readMediaFields(form){
  const thumbFile = form.thumbnail_file?.files?.[0] || null;
  const videoFile = form.video_file?.files?.[0] || null;
  
  const galleryRows = Array.from(form.querySelectorAll('#gallery-wrapper .gallery-row'));
  const galleryFiles = [];
  const galleryUrls = [];
  
  galleryRows.forEach(row => {
    const f = row.querySelector('input[name="gallery_files[]"]');
    const u = row.querySelector('input[name="gallery_urls[]"]');
    if(f && f.files && f.files[0]) galleryFiles.push(f.files[0]);
    if(u && u.value.trim()) galleryUrls.push(u.value.trim());
  });
  
  return {
    meta: {
      thumbnail_url: form.thumbnail_url.value.trim(),
      video_url: form.video_url.value.trim(),
      gallery_urls: galleryUrls
    },
    files: { thumbnail_file: thumbFile, video_file: videoFile, gallery_files: galleryFiles }
  };
}

function fillBaseFields(form, product){
  form.title.value = product.title || '';
  form.slug.value = product.slug || '';
  form.description.value = product.description || '';
  form.normal_price.value = product.normal_price || '';
  form.sale_price.value = product.sale_price || '';
  form.instant_delivery.checked = !!product.instant_delivery;
  form.normal_delivery_text.value = product.normal_delivery_text || '';
  if(product.thumbnail_url) form.thumbnail_url.value = product.thumbnail_url;
  if(product.video_url) form.video_url.value = product.video_url;
  // Populate Whop fields
  if (form.whop_plan && product.whop_plan) form.whop_plan.value = product.whop_plan;
  if (form.whop_price_map && product.whop_price_map) form.whop_price_map.value = product.whop_price_map;
}

function fillDemoProduct(form){
  form.title.value = 'Happy Birthday Video from Africa';
  form.slug.value = 'happy-birthday-video-africa';
  form.description.value = 'A funny and personalized greeting video featuring our team. Includes custom message on the board and your choice of song.';
  form.normal_price.value = '40';
  form.sale_price.value = '25';
  form.instant_delivery.checked = false;
  form.normal_delivery_text.value = 'Standard delivery 2-3 days';
  
  // Working Image
  form.thumbnail_url.value = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
  
  // UPDATED: Working Video URL (Google Sample)
  form.video_url.value = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  
  const galleryUrlInput = form.querySelector('input[name="gallery_urls[]"]');
  if(galleryUrlInput) galleryUrlInput.value = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
  
  if(form.seo_title) form.seo_title.value = 'Funny Birthday Video Greeting - Personalized';
  if(form.seo_description) form.seo_description.value = 'Order a custom birthday video from Africa. Funny, personalized, and delivered quickly.';
  if(form.seo_keywords) form.seo_keywords.value = 'birthday video, funny greeting, africa wish';
  if(form.seo_canonical) form.seo_canonical.value = 'https://example.com/happy-birthday-video';
}
