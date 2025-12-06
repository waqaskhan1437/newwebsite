/*
 * Product detail page script.  It populates the SEO metadata, left media
 * gallery and right info panel based on the product data returned from the
 * backend API.  The layout is purely HTML/CSS so that search engines can
 * index the page easily; dynamic content is injected after load.  Line
 * count is kept below 300 by avoiding unnecessary whitespace and
 * splitting long expressions.
 */

(async function(){
  const qs=new URLSearchParams(location.search);const id=qs.get('id');
  if(!id) return; // no product ID present
  const container=document.getElementById('product-detail');
  try{
    const { product, addons } = await getProduct(id);
    if(!product){container.innerHTML='<p>Product not found.</p>';return;}
    // --- Populate SEO fields ---
    const titleEl=document.getElementById('page-title');
    const metaDesc=document.getElementById('meta-description');
    const metaKeywords=document.getElementById('meta-keywords');
    const canon=document.getElementById('meta-canonical');
    const cleanDesc=(product.description||'').replace(/<[^>]+>/g,' ').trim();
    titleEl.textContent=product.seo_title||product.title||'';
    metaDesc.content=product.seo_description||cleanDesc.slice(0,160);
    metaKeywords.content=product.seo_keywords||'';
    canon.href=product.seo_canonical||location.href;
    // --- Left: media gallery ---
    const player=document.getElementById('media-player');
    const img=document.getElementById('media-image');
    const gallery=document.getElementById('gallery');
    const descEl=document.getElementById('description');
    const reviewWrap=document.getElementById('reviews');
    const reviewCount=document.getElementById('review-count');
    // Determine if product has video or not
    if(product.video_url){player.src=product.video_url;player.style.display='block';img.style.display='none';}
    else if(product.thumbnail_url){img.src=product.thumbnail_url;img.alt=product.title;img.style.display='block';player.style.display='none';}
    // Build gallery thumbnails; include video preview? we include images only
    const thumbs=[];
    if(product.thumbnail_url) thumbs.push(product.thumbnail_url);
    if(Array.isArray(product.gallery_urls)) thumbs.push(...product.gallery_urls);
    thumbs.forEach((url,i)=>{
      const t=document.createElement('img');
      t.src=url;t.alt=product.title;t.addEventListener('click',()=>{
        if(product.video_url){player.pause();player.style.display='none';img.src=url;img.style.display='block';}
        else{img.src=url;}
      });
      gallery.appendChild(t);
    });
    // Description
    descEl.innerHTML=product.description||'';
    // Reviews placeholder; if backend provides a count
    const count=product.review_count||0;
    reviewCount.textContent=`(${count} review${count===1?'':'s'})`;
    reviewWrap.textContent=count?'' : 'No reviews yet.';
    // --- Right: info panel ---
    document.getElementById('product-title').textContent=product.title||'';
    // Delivery badge and price
    const deliveryPrice=document.getElementById('delivery-price');
    const badge=document.createElement('div');
    const priceBox=document.createElement('div');
    badge.className='delivery-badge';
    priceBox.className='price-box';
    let badgeType='';
    if(product.instant_delivery){badgeType='instant';badge.textContent='Instant Delivery In 60 Minutes';}
    else if(/1\s*day|24\s*hour/i.test(product.normal_delivery_text||'')){badgeType='express';badge.textContent='24 Hours Express Delivery';}
    else if(/2\s*day|48\s*hour/i.test(product.normal_delivery_text||'')){badgeType='days';badge.textContent='2 Days Delivery';}
    else{badgeType='other';badge.textContent=product.normal_delivery_text||'';}
    badge.classList.add(badgeType);
    // Price calculations
    const cur=product.sale_price!=null?product.sale_price:product.normal_price;
    const old=product.sale_price!=null?product.normal_price:null;
    const curEl=document.createElement('span');curEl.className='price-current';curEl.textContent=cur?`Rs ${cur}`:'';
    priceBox.appendChild(curEl);
    if(old){const oldEl=document.createElement('span');oldEl.className='price-old';oldEl.textContent=`Rs ${old}`;priceBox.appendChild(oldEl);
      const discount=Math.round(((old-cur)/old)*100);if(discount>0){const d=document.createElement('span');d.className='price-discount';d.textContent=`${discount}% OFF`;priceBox.appendChild(d);} }
    deliveryPrice.appendChild(badge);
    deliveryPrice.appendChild(priceBox);
    // Digital note
    const note=document.getElementById('digital-note');
    note.textContent=product.instant_delivery?'Digital Delivery: Receive via WhatsApp/Email.':'';
    // --- Addons form ---
    const form=document.getElementById('addons-form');
    function createInput(item){ let input; switch(item.type){ case 'quantity': input=document.createElement('input'); input.type='number'; input.min='0'; input.value='0'; break; case 'dropdown': input=document.createElement('select'); (item.options||[]).forEach(opt=>{ const optEl=document.createElement('option'); optEl.value=opt.value; optEl.textContent=`${opt.label}${opt.extra?` (+Rs ${opt.extra})`:''}`; input.appendChild(optEl); }); break; case 'checkbox_group': input=document.createElement('div'); (item.options||[]).forEach(opt=>{ const lbl=document.createElement('label'); const cb=document.createElement('input'); cb.type='checkbox'; cb.value=opt.value; lbl.appendChild(cb); lbl.append(` ${opt.label}${opt.extra?` (+Rs ${opt.extra})`:''}`); input.appendChild(lbl); }); break; case 'radio_group': input=document.createElement('div'); (item.options||[]).forEach(opt=>{ const lbl=document.createElement('label'); const rb=document.createElement('input'); rb.type='radio'; rb.name=`addon_${item.id}`; rb.value=opt.value; lbl.appendChild(rb); lbl.append(` ${opt.label}${opt.extra?` (+Rs ${opt.extra})`:''}`); input.appendChild(lbl); }); break; default: input=document.createElement('textarea'); input.placeholder=item.placeholder||''; } return input; }
    if(addons&&addons.length){ addons.forEach(group=>{ const g=document.createElement('div'); g.className='addon-group'; const gl=document.createElement('label'); gl.textContent=group.label||group.groupKey||''; g.appendChild(gl); group.items.forEach(item=>{ const wrapper=document.createElement('div'); wrapper.className='addon-item'; const l=document.createElement('span'); l.textContent=`${item.label}${item.price?` (Rs ${item.price})`:''}`; wrapper.appendChild(l); const inp=createInput(item); wrapper.appendChild(inp); g.appendChild(wrapper); }); form.appendChild(g); }); }
    // --- Order button ---
    document.getElementById('order-btn').addEventListener('click',async()=>{
      const emailInput=document.getElementById('email-field');
      const email=emailInput?emailInput.value.trim():'';
      if(!email){ alert('Please enter your email.'); return; }
      try{
        await createOrder({email:email,amount:cur,productId:product.id,addons:[]});
        window.location.href='order-success.html';
      } catch(e){ alert('Error creating order: '+e.message); }
    });
  } catch(err){console.error(err);container.innerHTML='<p>Error loading product.</p>'; }
})();