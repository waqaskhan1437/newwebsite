function getBunnyConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    host: props.getProperty("BUNNY_STORAGE_HOST"),
    accessKey: props.getProperty("BUNNY_ACCESS_KEY"),
    basePath: props.getProperty("BUNNY_BASE_PATH") || "/data"
  };
}

function bunnyUpload(path, content) {
  var cfg = getBunnyConfig();
  if (!cfg.host || !cfg.accessKey) {
    throw new Error("Bunny configuration missing in script properties.");
  }
  var url = "https://" + cfg.host + cfg.basePath + path;
  var options = {
    method: "put",
    contentType: "application/json",
    payload: content,
    headers: {
      "AccessKey": cfg.accessKey
    },
    muteHttpExceptions: true
  };
  var res = UrlFetchApp.fetch(url, options);
  var code = res.getResponseCode();
  if (code >= 300) {
    throw new Error("Bunny upload failed: " + code + " - " + res.getContentText());
  }
}

function publishProductsJson() {
  var json = productsToJson();
  bunnyUpload("/products.json", json);
}

function publishOrderJson(publicToken) {
  var order = findOrderByPublicToken(publicToken);
  if (!order) {
    throw new Error("Order not found: " + publicToken);
  }

  var obj = {
    public_order_token: order.public_order_token,
    order_id: order.order_id,
    product_id: order.product_id,
    product_title: order.product_title,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    created_at: order.created_at,
    delivery_eta: order.delivery_eta,
    delivery_link: order.delivery_link,
    delivery_type: order.delivery_type,
    can_tip: order.can_tip,
    tips_total: order.tips_total,
    whop_tip_listing_id: order.whop_tip_listing_id
  };

  var json = JSON.stringify(obj);
  bunnyUpload("/order_" + publicToken + ".json", json);
}

function publishReviewsJson(productId) {
  var json = reviewsToJson(productId);
  bunnyUpload("/reviews_" + productId + ".json", json);
}
