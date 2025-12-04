(function () {
  function getQueryParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function formatMoney(amount, currency) {
    if (typeof amount !== "number") return amount;
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD"
      }).format(amount);
    } catch (e) {
      return amount.toFixed(2);
    }
  }

  function setCurrentYear(selector) {
    var el = document.querySelector(selector);
    if (el) {
      el.textContent = new Date().getFullYear();
    }
  }

  function safeJSONParse(text, fallback) {
    if (!text) return fallback;
    try {
      return JSON.parse(text);
    } catch (e) {
      return fallback;
    }
  }

  window.Utils = {
    getQueryParam: getQueryParam,
    formatMoney: formatMoney,
    setCurrentYear: setCurrentYear,
    safeJSONParse: safeJSONParse
  };

  document.addEventListener("DOMContentLoaded", function () {
    setCurrentYear("#year");
  });
})();
