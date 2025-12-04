(function () {
  function renderProducts(products) {
    var list = document.getElementById("product-list");
    var loading = document.getElementById("product-loading");
    if (!list) return;
    if (loading) {
      loading.remove();
    }

    if (!products || !products.length) {
      var empty = document.createElement("div");
      empty.className = "error-message";
      empty.textContent = "No products available yet.";
      list.appendChild(empty);
      return;
    }

    products.forEach(function (product) {
      var card = UIComponents.createProductCard(product);
      list.appendChild(card);
    });
  }

  function init() {
    ApiClient.fetchProducts()
      .then(renderProducts)
      .catch(function () {
        var list = document.getElementById("product-list");
        var loading = document.getElementById("product-loading");
        if (loading) {
          loading.remove();
        }
        var error = document.createElement("div");
        error.className = "error-message";
        error.textContent = "Failed to load products. Please try again later.";
        list.appendChild(error);
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
