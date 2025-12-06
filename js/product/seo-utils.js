/*
 * SEO helper functions extracted from the original product.js.  These
 * functions update the page title and various meta tags based on the
 * current product data.  They are defined in a self‑invoking function
 * and attached to the global scope for use by other scripts.
 */

;(function(){
  /**
   * Update the document title and various meta tags for SEO and
   * social sharing.  Falls back to sensible defaults if fields are
   * missing.
   *
   * @param {object} product The product object returned from the API
   */
  function updateSEO(product) {
    document.title = (product.seo_title || product.title) + ' | WishVideo';
    // Limit description to 160 characters to avoid truncation
    let desc = product.seo_description || product.description || '';
    if (desc.length > 160) desc = desc.substring(0, 160);
    setMeta('description', desc);
    setMeta('keywords', product.seo_keywords || 'video, greeting');
    setMetaProperty('og:title', product.title);
    setMetaProperty('og:description', desc);
    setMetaProperty('og:image', product.thumbnail_url);
  }
  function setMeta(name, content) {
    let e = document.querySelector('meta[name="' + name + '"]');
    if (!e) {
      e = document.createElement('meta');
      e.name = name;
      document.head.appendChild(e);
    }
    e.content = content || '';
  }
  function setMetaProperty(prop, content) {
    let e = document.querySelector('meta[property="' + prop + '"]');
    if (!e) {
      e = document.createElement('meta');
      e.setAttribute('property', prop);
      document.head.appendChild(e);
    }
    e.content = content || '';
  }
  window.updateSEO = updateSEO;
})();