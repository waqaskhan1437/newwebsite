/*
 * Admin product form – product info + media + addons + SEO.
 * Abhi demo ke liye form ko sample data se pre-fill kar rahe hain.
 */
;(async function initProductForm(){
  const params=new URLSearchParams(location.search);
  const productId=params.get('id');
  const form=document.getElementById('product-form');
  if(!form)return;
  setupGalleryField(form);
  if(typeof initAddonsBuilder==='function')initAddonsBuilder(form);

  if(productId){
    try{
      const {product}=await getProduct(productId);
      if(product){
        fillBaseFields(form,product);
        if(typeof populateSeoForm==='function')populateSeoForm(form,product);
        if(product.addons && typeof window.populateAddonsFromConfig==='function'){
          window.populateAddonsFromConfig(form,product.addons);
        }
      }
    }catch(err){
      console.error('Failed to load product',err);
    }
  }else{
    fillDemoProduct(form);
  }

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const base=collectBase(form);
    const media=readMediaFields(form);
    const seo=typeof readSeoFields==='function'?readSeoFields(form):{meta:{}};
    const addons=typeof readAddonsConfig==='function'?readAddonsConfig(form):[];
    const payload={...base,...media.meta,...seo.meta,addons};
    if(productId)payload.id=Number(productId);
    console.log('Media files for future R2 upload',media.files);
    try{
      const resp=await fetch('/api/admin/product/save',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });
      const data=await resp.json();
      if(!resp.ok||!data.success){
        throw new Error(data.error||'Save failed');
      }
      alert('Product save ho gaya. ID: '+data.id);
    }catch(err){
      console.error('Save error',err);
      alert('Save error: '+(err.message||'unknown'));
    }
  });
})();

function setupGalleryField(form){
  const wrapper=form.querySelector('#gallery-wrapper');
  const addBtn=document.getElementById('add-gallery-image');
  if(!wrapper||!addBtn)return;
  addBtn.addEventListener('click',()=>{
    const first=wrapper.querySelector('.gallery-row');
    if(!first)return;
    const clone=first.cloneNode(true);
    clone.querySelectorAll('input').forEach(inp=>{
      inp.value='';
    });
    wrapper.insertBefore(clone,addBtn);
  });
}

function collectBase(form){
  return{
    title:form.title.value.trim(),
    slug:form.slug.value.trim(),
    description:form.description.value.trim(),
    normal_price:parseFloat(form.normal_price.value)||0,
    sale_price:form.sale_price.value?parseFloat(form.sale_price.value):null,
    instant_delivery:form.instant_delivery.checked?1:0,
    normal_delivery_text:form.normal_delivery_text.value.trim()
  };
}

function readMediaFields(form){
  const thumbFile=form.thumbnail_file?.files?.[0]||null;
  const videoFile=form.video_file?.files?.[0]||null;
  const galleryRows=Array.from(form.querySelectorAll('#gallery-wrapper .gallery-row'));
  const galleryFiles=[];
  const galleryUrls=[];
  galleryRows.forEach(row=>{
    const f=row.querySelector('input[name="gallery_files[]"]');
    const u=row.querySelector('input[name="gallery_urls[]"]');
    if(f&&f.files&&f.files[0])galleryFiles.push(f.files[0]);
    if(u&&u.value.trim())galleryUrls.push(u.value.trim());
  });
  const thumbnail_url=form.thumbnail_url.value.trim();
  const video_url=form.video_url.value.trim();
  return{
    meta:{thumbnail_url,video_url,gallery_urls:galleryUrls},
    files:{thumbnail_file:thumbFile,video_file:videoFile,gallery_files:galleryFiles}
  };
}

function fillBaseFields(form,product){
  form.title.value=product.title||'';
  form.slug.value=product.slug||'';
  form.description.value=product.description||'';
  form.normal_price.value=product.normal_price||'';
  form.sale_price.value=product.sale_price||'';
  form.instant_delivery.checked=!!product.instant_delivery;
  form.normal_delivery_text.value=product.normal_delivery_text||'';
  if(product.thumbnail_url)form.thumbnail_url.value=product.thumbnail_url;
  if(product.video_url)form.video_url.value=product.video_url;
}

function fillDemoProduct(form){
  form.title.value='Personalized greeting video from Africa';
  form.slug.value='personalized-greeting-video-from-africa';
  form.description.value='Happy birthday style personalized greeting video jahan performers aap ka naam board par likh kar wishes dete hain.';
  form.normal_price.value='7200';
  form.sale_price.value='';
  form.instant_delivery.checked=false;
  form.normal_delivery_text.value='Standard delivery 3-5 days, rush delivery 24 hours tak.';
  form.thumbnail_url.value='https://res.cloudinary.com/demo/image/upload/sample.jpg';
  form.video_url.value='https://res.cloudinary.com/demo/video/upload/sample.mp4';
  const galleryUrlInput=form.querySelector('input[name="gallery_urls[]"]');
  if(galleryUrlInput)galleryUrlInput.value='https://res.cloudinary.com/demo/image/upload/sample.jpg';
  if(form.seo_title)form.seo_title.value='Personalized Greeting Video from Africa – Demo product';
  if(form.seo_description)form.seo_description.value='Demo product for testing: birthday greeting video with photos, custom message, song choice and extras.';
  if(form.seo_keywords)form.seo_keywords.value='greeting video, birthday video, africa team';
  if(form.seo_canonical)form.seo_canonical.value='https://example.com/demo-product';
}
