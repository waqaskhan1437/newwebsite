/*
 * Admin Whop Settings
 *
 * This script loads and saves global configuration for the Whop checkout.
 * It relies on API helpers defined in api.js: getWhopSettings and
 * saveWhopSettings.  Fields include theme, default plan ID and a
 * price map.  Keeping this file under 200 lines allows easy
 * maintenance.
 */

;(function(){
  // Populate form inputs with existing settings from the server
  async function loadSettings() {
    try {
      const resp = await window.getWhopSettings();
      const settings = (resp && resp.settings) || {};
      const themeSel = document.getElementById('whop-theme');
      const defaultPlan = document.getElementById('whop-default-plan');
      const priceMap = document.getElementById('whop-price-map');
      if (themeSel) themeSel.value = settings.theme || 'light';
      if (defaultPlan) defaultPlan.value = settings.default_plan_id || '';
      if (priceMap) priceMap.value = settings.price_map || '';
      // Populate API key and webhook secret if present
      const apiKeyEl = document.getElementById('whop-api-key');
      const webhookEl = document.getElementById('whop-webhook-secret');
      if (apiKeyEl) apiKeyEl.value = settings.api_key || '';
      if (webhookEl) webhookEl.value = settings.webhook_secret || '';
    } catch (err) {
      console.error('Failed to load Whop settings', err);
    }
  }

  // Submit handler to save settings via API
  async function handleSubmit(e) {
    e.preventDefault();
    const themeSel = document.getElementById('whop-theme');
    const defaultPlan = document.getElementById('whop-default-plan');
    const priceMap = document.getElementById('whop-price-map');
    const apiKeyEl = document.getElementById('whop-api-key');
    const webhookEl = document.getElementById('whop-webhook-secret');
    const payload = {
      theme: themeSel ? themeSel.value : 'light',
      default_plan_id: defaultPlan ? defaultPlan.value.trim() : '',
      price_map: priceMap ? priceMap.value.trim() : '',
      api_key: apiKeyEl ? apiKeyEl.value.trim() : '',
      webhook_secret: webhookEl ? webhookEl.value.trim() : ''
    };
    try {
      const res = await window.saveWhopSettings(payload);
      if (res && res.success) {
        alert('Whop settings saved successfully!');
      } else {
        throw new Error(res && res.error ? res.error : 'Unknown error');
      }
    } catch (err) {
      alert('Error saving settings: ' + (err.message || 'Unknown error'));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    const form = document.getElementById('whop-settings-form');
    if (form) form.addEventListener('submit', handleSubmit);
  });
})();