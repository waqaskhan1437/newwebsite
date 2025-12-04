(function () {
  var BUNNY_BASE = "https://your-zone.b-cdn.net/data";

  function fetchJSON(url) {
    return fetch(url, {
      headers: { "Accept": "application/json" }
    }).then(function (res) {
      if (!res.ok) {
        throw new Error("Failed to fetch: " + url);
      }
      return res.json();
    });
  }

  function fetchProducts() {
    return fetchJSON(BUNNY_BASE + "/products.json");
  }

  function fetchProductById(id) {
    return fetchProducts().then(function (products) {
      return products.find(function (p) {
        return p.id === id;
      }) || null;
    });
  }

  function fetchReviewsForProduct(productId) {
    return fetchJSON(BUNNY_BASE + "/reviews_" + encodeURIComponent(productId) + ".json")
      .catch(function () {
        return [];
      });
  }

  function fetchOrderByToken(token) {
    return fetchJSON(BUNNY_BASE + "/order_" + encodeURIComponent(token) + ".json");
  }

  window.ApiClient = {
    fetchProducts: fetchProducts,
    fetchProductById: fetchProductById,
    fetchReviewsForProduct: fetchReviewsForProduct,
    fetchOrderByToken: fetchOrderByToken
  };
})();
