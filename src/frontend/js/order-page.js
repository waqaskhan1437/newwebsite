(function () {
  function statusLabel(status) {
    if (!status) return "Unknown";
    var normalized = String(status).toLowerCase();
    if (normalized === "paid" || normalized === "delivered") return "Completed";
    if (normalized === "delivering" || normalized === "processing") return "In progress";
    if (normalized === "pending") return "Pending";
    if (normalized === "refunded") return "Refunded";
    return status;
  }

  function renderDelivery(order) {
    var container = document.createElement("div");
    container.className = "order-delivery-section";

    var heading = document.createElement("div");
    heading.className = "order-delivery-heading";
    heading.textContent = "Delivery";

    var meta = document.createElement("div");
    meta.className = "order-delivery-meta";

    if (order.status === "delivered") {
      meta.textContent = "Your order is ready.";
    } else if (order.delivery_eta) {
      meta.textContent = "Estimated delivery: " + order.delivery_eta;
    } else {
      meta.textContent = "Your order is being processed.";
    }

    container.appendChild(heading);
    container.appendChild(meta);

    if (order.status === "delivered" && order.delivery_link) {
      var playerWrapper = document.createElement("div");
      playerWrapper.className = "order-delivery-player";

      if (order.delivery_type === "video" || (order.delivery_link || "").match(/\.mp4$|\.webm$/i)) {
        var video = document.createElement("video");
        video.controls = true;
        video.src = order.delivery_link;
        playerWrapper.appendChild(video);
      } else if (order.delivery_type === "audio" || (order.delivery_link || "").match(/\.mp3$|\.wav$/i)) {
        var audio = document.createElement("audio");
        audio.controls = true;
        audio.src = order.delivery_link;
        playerWrapper.appendChild(audio);
      } else {
        var btn = document.createElement("a");
        btn.className = "btn btn-primary";
        btn.href = order.delivery_link;
        btn.target = "_blank";
        btn.rel = "noopener noreferrer";
        btn.textContent = "Open delivery";
        playerWrapper.appendChild(btn);
      }

      container.appendChild(playerWrapper);
    }

    return container;
  }

  function renderTipSection(order) {
    if (!order.can_tip) return null;

    var section = document.createElement("div");
    section.className = "tip-section";

    var title = document.createElement("div");
    title.textContent = "Enjoying your purchase? Leave a tip.";
    title.style.fontSize = "0.95rem";

    var buttons = document.createElement("div");
    buttons.className = "tip-buttons";

    [3, 5, 10].forEach(function (amount) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-ghost tip-amount-btn";
      btn.textContent = "$" + amount;
      btn.addEventListener("click", function () {
        openWhopTipCheckout(order, amount);
      });
      buttons.appendChild(btn);
    });

    section.appendChild(title);
    section.appendChild(buttons);

    if (order.tips_total) {
      var total = document.createElement("p");
      total.style.marginTop = "0.5rem";
      total.style.fontSize = "0.85rem";
      total.style.opacity = "0.85";
      total.textContent = "Total tips so far: " + Utils.formatMoney(order.tips_total, order.currency || "USD");
      section.appendChild(total);
    }

    return section;
  }

  function openWhopTipCheckout(order, amount) {
    if (window.Whop && typeof window.Whop.openCheckout === "function") {
      window.Whop.openCheckout({
        listingId: order.whop_tip_listing_id || null,
        metadata: {
          orderId: order.order_id,
          tipAmount: amount
        }
      }).catch(function () {
        alert("Tip checkout failed or was cancelled.");
      });
    } else {
      alert("Whop tip checkout is not configured.");
    }
  }

  function renderOrder(order) {
    var root = document.getElementById("order-root");
    var loading = document.getElementById("order-loading");
    if (!root) return;
    if (loading) {
      loading.remove();
    }

    var card = document.createElement("section");
    card.className = "order-card";

    var main = document.createElement("div");
    main.className = "order-main";

    var title = document.createElement("h1");
    title.className = "order-title";
    title.textContent = order.product_title || "Your order";

    var statusLine = document.createElement("div");
    statusLine.className = "order-status";

    var pill = document.createElement("span");
    pill.className = "order-status-pill";
    pill.textContent = statusLabel(order.status);

    statusLine.appendChild(pill);

    var summaryList = document.createElement("ul");
    summaryList.className = "order-summary-list";

    var li1 = document.createElement("li");
    li1.textContent = "Order ID: " + (order.public_order_token || order.order_id || "N/A");

    var li2 = document.createElement("li");
    li2.textContent = "Placed at: " + (order.created_at || "N/A");

    var li3 = document.createElement("li");
    li3.textContent = "Total: " + Utils.formatMoney(order.amount || 0, order.currency || "USD");

    summaryList.appendChild(li1);
    summaryList.appendChild(li2);
    summaryList.appendChild(li3);

    main.appendChild(title);
    main.appendChild(statusLine);
    main.appendChild(summaryList);
    main.appendChild(renderDelivery(order));

    var sidebar = document.createElement("div");
    sidebar.className = "order-sidebar";

    if (order.product_id) {
      var reviewsHeader = document.createElement("h3");
      reviewsHeader.textContent = "Reviews";
      sidebar.appendChild(reviewsHeader);

      var reviewsSummary = document.createElement("div");
      reviewsSummary.className = "review-summary";
      reviewsSummary.id = "order-review-summary";
      reviewsSummary.textContent = "Loading reviews...";
      sidebar.appendChild(reviewsSummary);

      var reviewsList = document.createElement("div");
      reviewsList.id = "order-reviews-list";
      reviewsList.className = "reviews-list";
      sidebar.appendChild(reviewsList);

      loadReviews(order.product_id);
    }

    var tipSection = renderTipSection(order);
    if (tipSection) {
      sidebar.appendChild(tipSection);
    }

    card.appendChild(main);
    card.appendChild(sidebar);
    root.appendChild(card);
  }

  function loadReviews(productId) {
    var summaryEl = document.getElementById("order-review-summary");
    var listEl = document.getElementById("order-reviews-list");
    if (!summaryEl || !listEl) return;

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

        listEl.innerHTML = "";
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
    var token = Utils.getQueryParam("token");
    var root = document.getElementById("order-root");
    if (!token) {
      var loading = document.getElementById("order-loading");
      if (loading) loading.remove();
      var error = document.createElement("div");
      error.className = "error-message";
      error.textContent = "No order token provided.";
      root.appendChild(error);
      return;
    }

    ApiClient.fetchOrderByToken(token)
      .then(function (order) {
        renderOrder(order);
      })
      .catch(function () {
        var loading = document.getElementById("order-loading");
        if (loading) loading.remove();
        var error = document.createElement("div");
        error.className = "error-message";
        error.textContent = "Failed to load your order. Please try again later.";
        root.appendChild(error);
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
