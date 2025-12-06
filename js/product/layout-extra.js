/*
 * Secondary layout helpers for the product page.  These functions
 * append the description/reviews section and bootstrap the video
 * player.  They are separated from the main layout construction
 * function to keep individual files below the 200 line limit.
 */

;(function(){
  function renderProductDescription(wrapper, product) {
    const descRow = document.createElement('div');
    descRow.className = 'product-desc-row';
    const descBox = document.createElement('div');
    descBox.className = 'product-desc';
    const descText = product.description ? product.description.replace(/\n/g, '<br>') : 'No description available.';
    descBox.innerHTML = `
      <h3>Description</h3>
      <div>${descText}</div>
      <hr style="margin: 2rem 0; border: 0; border-top: 1px solid #eee;">
      <h3>Reviews</h3>
      <div style="background:#f9fafb; padding:1rem; border-radius:8px; text-align:center; color:#6b7280;">
        <span style="font-size:2rem;">⭐ 5.0</span>
        <p>Based on 1 reviews</p>
      </div>
    `;
    descRow.appendChild(descBox);
    wrapper.appendChild(descRow);
  }
  function initializePlayer(hasVideo) {
    if (!hasVideo) return;
    setTimeout(function() {
      if (document.getElementById('player')) {
        new Plyr('#player', {
          controls: ['play-large','play','progress','current-time','mute','volume','fullscreen'],
          ratio: '16:9',
          clickToPlay: true,
          youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
        });
      }
    }, 100);
  }
  window.renderProductDescription = renderProductDescription;
  window.initializePlayer = initializePlayer;
})();