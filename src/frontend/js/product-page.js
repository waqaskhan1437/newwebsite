(function () {
  var currentMediaUrl = null;

  function renderMedia(url) {
    var container = document.getElementById("product-media");
    if (!container) return;
    container.innerHTML = "";

    if (!url) {
      var fallback = document.createElement("p");
      fallback.textContent = "Preview not available.";
      container.appendChild(fallback);
      return;
    }

    currentMediaUrl = url;

    if (url.match(/\.mp4$|\.webm$/i)) {
      var video = document.createElement("video");
      video.controls = true;
      video.src = url;
      container.appendChild(video);
    } else if (url.match(/\.mp3$|\.wav$/i)) {
      var audio = document.createElement("audio");
      audio.controls = true;
      audio.src = url;
      container.appendChild(audio);
    } else {
      var iframe = document.createElement("iframe");
      iframe.src = url;
      iframe.loading = "lazy";
      iframe.setAttribute("frameborder", "0");
      iframe.style.width = "100%";
      iframe.style.minHeight = "260px";
      container.appendChild(iframe);
    }
  }

  function renderThumbnails(product) {
    var container = document.getElementById("product-thumbnails");
    if (!container) return;
    container.innerHTML = "";

    var urls = (product.thumbnail_urls || []).slice();
    if (product.media_url && !urls.includes(product.media_url)) {
      urls.unshift(product.media_url);
    }

    urls.forEach(function (url, index) {
      var wrapper = document.createElement("button");
      wrapper.type = "button";
      wrapper.className = "product-thumbnail" + (index === 0 ? " is-active" : "");
      wrapper.addEventListener("click", function () {
        renderMedia(url);
        Array.prototype.forEach.call(
          container.querySelectorAll(".product-thumbnail"),
          function (node) {
            node.classList.remove("is-active");
          }
        );
        wrapper.classList.add("is-active");
      });
      var img = document.createElement("img");
      img.src = url;
      img.alt = product.title || "Product thumbnail";
      wrapper.appendChild(img);
      container.appendChild(wrapper);
    });
  }

  function renderProduct(product) {
    var titleEl = document.getElementById("product-title");
    var priceEl = document.getElementById("product-price");
    var deliveryEl = document.getElementById("product-delivery-time");
    var noteEl = document.getElementById("product-delivery-note");
    var descBody = document.getElementById("product-description-body");

    if (titleEl) titleEl.textContent = product.title || "Untitled product";
    if (priceEl) {
      var price = Number(product.price || 0);
      priceEl.textContent = Utils.formatMoney(price, product.currency || "USD");
    }
    if (deliveryEl) deliveryEl.textContent = product.delivery_time || "Instant";
    if (noteEl) noteEl.textContent = product.digital_delivery_note || "Digital product, no physical shipment.";
    if (descBody) descBody.textContent = product.long_description || product.short_description || "";

    renderMedia(product.media_url || null);
    renderThumbnails(product);
    renderAddons(product);
  }

  function renderAddons(product) {
    var container = document.getElementById("product-addons");
    if (!container) return;
    container.innerHTML = "";

    var addons = product.addons || [];
    if (typeof addons === "string") {
      addons = Utils.safeJSONParse(addons, []);
    }

    if (!addons || !addons.length) {
      return;
    }

    var heading = document.createElement("p");
    heading.textContent = "Optional addons:";
    heading.style.fontSize = "0.9rem";
    heading.style.opacity = "0.85";
    container.appendChild(heading);

    addons.forEach(function (addon, index) {
      var id = "addon-" + index;
      var row = document.createElement("div");
      row.className = "addon-item";

      var label = document.createElement("label");
      label.className = "addon-label";
      label.setAttribute("for", id);

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = id;
      checkbox.dataset.addonId = addon.id || String(index);

      var text = document.createElement("span");
      text.textContent = addon.label || "Addon";

      label.appendChild(checkbox);
      label.appendChild(text);

      var price = document.createElement("span");
      price.textContent = Utils.formatMoney(
        Number(addon.price || 0),
        product.currency || "USD"
      );

      row.appendChild(label);
      row.appendChild(price);
      container.appendChild(row);
    });
  }

  function collectSelectedAddons(product) {
    var container = document.getElementById("product-addons");
    if (!container) return [];
    var checkboxes = container.querySelectorAll("input[type=checkbox][data-addon-id]");
    var addons = product.addons || [];
    if (typeof addons === "string") {
      addons = Utils.safeJSONParse(addons, []);
    }
    var byId = {};
    addons.forEach(function (addon) {
      byId[String(addon.id)] = addon;
    });

    var selected = [];
    Array.prototype.forEach.call(checkboxes, function (cb) {
      if (!cb.checked) return;
      var id = cb.dataset.addonId;
      var addon = byId[id] || null;
      if (addon) {
        selected.push(addon);
      }
    });
    return selected;
  }

  function openWhopCheckout(product, selectedAddons) {
    if (window.Whop && typeof window.Whop.openCheckout === "function") {
      window.Whop.openCheckout({
        listingId: product.whop_listing_id || null,
        checkoutUrl: product.whop_checkout_url || null,
        metadata: {
          productId: product.id,
          addons: selectedAddons.map(function (a) {
            return { id: a.id, price: a.price };
          })
        }
      }).then(function (result) {
        if (result && result.publicOrderToken) {
          window.location.href = "order.html?token=" + encodeURIComponent(result.publicOrderToken);
        }
      }).catch(function () {
        alert("Checkout failed or was cancelled.");
      });
    } else {
      alert("Whop checkout SDK is not configured on this page.");
    }
  }

  function attachBuyButton(product) {
    var button = document.getElementById("buy-button");
    if (!button) return;
    button.addEventListener("click", function () {
      var addons = collectSelectedAddons(product);
      openWhopCheckout(product, addons);
    });
  }

  function renderReviews(productId) {
    var summaryEl = document.getElementById("product-review-summary");
    var listEl = document.getElementById("product-reviews-list");
    if (!summaryEl || !listEl) return;

    summaryEl.textContent = "Loading reviews...";
    listEl.innerHTML = "";

    ApiClient.fetchReviewsForProduct(productId)
      .then(function (reviews) {
        if (!reviews.length) {
          summaryEl.textContent = "No reviews yet.";
          return;
        }

        var avg =
          reviews.reduce(function (sum, r) {
            return sum + Number(r.rating || 0);
          }, 0) / reviews.length;

        summaryEl.innerHTML = "";
        summaryEl.appendChild(UIComponents.renderStars(avg));

        var countSpan = document.createElement("span");
        countSpan.textContent = " " + avg.toFixed(1) + " (" + reviews.length + " reviews)";
        summaryEl.appendChild(countSpan);

        reviews.forEach(function (review) {
          var card = document.createElement("article");
          card.className = "review-card";

          var header = document.createElement("div");
          header.className = "review-header";

          var author = document.createElement("span");
          author.className = "review-author";
          author.textContent = review.name || "Anonymous";

          var date = document.createElement("span");
          date.className = "review-date";
          date.textContent = review.created_at || "";

          header.appendChild(author);
          header.appendChild(date);

          var starsRow = UIComponents.renderStars(review.rating || 0);
          starsRow.style.marginBottom = "0.25rem";

          var text = document.createElement("p");
          text.textContent = review.comment || "";

          card.appendChild(header);
          card.appendChild(starsRow);
          card.appendChild(text);
          listEl.appendChild(card);
        });
      })
      .catch(function () {
        summaryEl.textContent = "Failed to load reviews.";
      });
  }

  function init() {
    var id = Utils.getQueryParam("id");
    var errorEl = document.getElementById("product-error");
    if (!id) {
      if (errorEl) {
        errorEl.hidden = false;
      }
      return;
    }

    ApiClient.fetchProductById(id)
      .then(function (product) {
        if (!product) {
          if (errorEl) {
            errorEl.hidden = false;
          }
          return;
        }
        renderProduct(product);
        attachBuyButton(product);
        renderReviews(product.id);
      })
      .catch(function () {
        if (errorEl) {
          errorEl.hidden = false;
        }
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
