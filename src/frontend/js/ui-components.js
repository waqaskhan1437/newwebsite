(function () {
  function createProductCard(product) {
    var card = document.createElement("article");
    card.className = "card";

    var media = document.createElement("div");
    media.className = "card-media";

    if (product.thumbnail_urls && product.thumbnail_urls.length) {
      var img = document.createElement("img");
      img.src = product.thumbnail_urls[0];
      img.alt = product.title || "Product thumbnail";
      media.appendChild(img);
    }

    var title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = product.title || "Untitled product";

    var desc = document.createElement("p");
    desc.className = "card-description";
    desc.textContent = product.short_description || "";

    var meta = document.createElement("div");
    meta.className = "card-meta";

    var price = document.createElement("span");
    price.className = "price-tag";
    price.textContent = Utils.formatMoney(
      Number(product.price || 0),
      product.currency || "USD"
    );

    var delivery = document.createElement("span");
    delivery.className = "delivery-tag";
    delivery.textContent = product.delivery_time || "Instant";

    meta.appendChild(price);
    meta.appendChild(delivery);

    var actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "space-between";
    actions.style.alignItems = "center";
    actions.style.marginTop = "0.75rem";

    var badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "Digital delivery";

    var btn = document.createElement("a");
    btn.className = "btn btn-primary";
    btn.textContent = "View details";
    btn.href = "product.html?id=" + encodeURIComponent(product.id);

    actions.appendChild(badge);
    actions.appendChild(btn);

    card.appendChild(media);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(meta);
    card.appendChild(actions);

    return card;
  }

  function renderStars(rating) {
    var container = document.createElement("span");
    container.className = "star-row";
    var value = Number(rating || 0);
    for (var i = 1; i <= 5; i++) {
      var star = document.createElement("span");
      star.className = "star" + (i <= value ? " is-filled" : "");
      star.textContent = "★";
      container.appendChild(star);
    }
    return container;
  }

  window.UIComponents = {
    createProductCard: createProductCard,
    renderStars: renderStars
  };
})();
