/*
 * admin.js
 *
 * Implements a lightweight admin dashboard for managing products. The UI allows
 * listing products, editing/creating products with tabs for info, media,
 * addons and email. It uses localStorage for persistence in this demo. Each
 * file in the project is kept under 300 lines as required.
 */

const productListEl = document.getElementById('product-list');
const addProductBtn = document.getElementById('add-product');
const formContainer = document.getElementById('product-form');
const saveBtn = document.getElementById('save-product');
const cancelBtn = document.getElementById('cancel-edit');
const formTitle = document.getElementById('form-title');
// Form fields
const fields = {
  title: document.getElementById('p-title'),
  seoTitle: document.getElementById('p-seo-title'),
  desc: document.getElementById('p-desc'),
  seoDesc: document.getElementById('p-seo-desc'),
  seoKeywords: document.getElementById('p-seo-keywords'),
  price: document.getElementById('p-price'),
  salePrice: document.getElementById('p-sale-price'),
  instant: document.getElementById('p-instant'),
  deliveryTime: document.getElementById('p-delivery-time'),
  video: document.getElementById('p-video'),
  emailTemplate: document.getElementById('p-email-template')
};
const thumbsContainer = document.getElementById('thumbs-container');
const addThumbBtn = document.getElementById('add-thumb');
const addonGroupsEl = document.getElementById('addon-groups');
const addGroupBtn = document.getElementById('add-group');

let products = [];
let editingIndex = null;

// Load products from localStorage or start with an example
function loadProducts() {
  const stored = localStorage.getItem('products');
  products = stored ? JSON.parse(stored) : [];
  if (products.length === 0) {
    // Preload with sample product
    products.push({
      title: 'Sample Product',
      price: 10,
      salePrice: 8,
      instantDelivery: true
    });
  }
  renderProductList();
}

// Render the product list
function renderProductList() {
  productListEl.innerHTML = '';
  products.forEach((product, index) => {
    const item = document.createElement('div');
    item.className = 'product-item';
    item.innerHTML = `<span>${product.title || 'Untitled'}</span>`;
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => editProduct(index));
    item.appendChild(editBtn);
    productListEl.appendChild(item);
  });
}

// Clear form fields
function clearForm() {
  Object.values(fields).forEach(el => {
    if (el.type === 'checkbox') {
      el.checked = false;
    } else {
      el.value = '';
    }
  });
  thumbsContainer.innerHTML = '';
  addonGroupsEl.innerHTML = '';
}

// Open form for a new product
function createProduct() {
  editingIndex = null;
  clearForm();
  formTitle.textContent = 'Create Product';
  formContainer.classList.remove('hidden');
  switchTab('info');
}

// Edit existing product
function editProduct(index) {
  editingIndex = index;
  const p = products[index];
  clearForm();
  formTitle.textContent = 'Edit Product';
  // Populate basic fields
  fields.title.value = p.title || '';
  fields.seoTitle.value = p.seoTitle || '';
  fields.desc.value = p.description || '';
  fields.seoDesc.value = p.seoDescription || '';
  fields.seoKeywords.value = (p.seoKeywords || []).join(', ');
  fields.price.value = p.price || '';
  fields.salePrice.value = p.salePrice || '';
  fields.instant.checked = !!p.instantDelivery;
  fields.deliveryTime.value = p.deliveryTime || '';
  // Media
  fields.video.value = (p.media && p.media.video) || '';
  if (p.media && Array.isArray(p.media.thumbnails)) {
    p.media.thumbnails.forEach(url => addThumbnailInput(url));
  }
  // Addons
  if (Array.isArray(p.addons)) {
    p.addons.forEach(group => {
      const groupEl = addAddonGroup(group.group);
      if (Array.isArray(group.items)) {
        group.items.forEach(item => addAddonItem(groupEl, item));
      }
    });
  }
  // Email
  fields.emailTemplate.value = p.emailTemplate || '';
  formContainer.classList.remove('hidden');
  switchTab('info');
}

// Gather form values into a product object
function gatherProduct() {
  const seoKeywords = fields.seoKeywords.value.split(',').map(s => s.trim()).filter(Boolean);
  const media = {
    video: fields.video.value,
    thumbnails: Array.from(thumbsContainer.querySelectorAll('input')).map(i => i.value).filter(Boolean)
  };
  const addons = Array.from(addonGroupsEl.children).map(groupEl => {
    const groupName = groupEl.querySelector('.group-name').value;
    const items = Array.from(groupEl.querySelectorAll('.item')).map(itemEl => {
      const label = itemEl.querySelector('.item-label').value;
      const type = itemEl.querySelector('.item-type').value;
      return { label, type };
    });
    return { group: groupName, items };
  });
  return {
    title: fields.title.value,
    seoTitle: fields.seoTitle.value,
    description: fields.desc.value,
    seoDescription: fields.seoDesc.value,
    seoKeywords,
    price: parseFloat(fields.price.value || '0'),
    salePrice: parseFloat(fields.salePrice.value || '0'),
    instantDelivery: fields.instant.checked,
    deliveryTime: fields.deliveryTime.value,
    media,
    addons,
    emailTemplate: fields.emailTemplate.value
  };
}

// Save product to list and localStorage
function saveProduct() {
  const product = gatherProduct();
  if (editingIndex !== null) {
    products[editingIndex] = product;
  } else {
    products.push(product);
  }
  localStorage.setItem('products', JSON.stringify(products));
  formContainer.classList.add('hidden');
  renderProductList();
}

// Add thumbnail input
function addThumbnailInput(value = '') {
  const input = document.createElement('input');
  input.type = 'url';
  input.value = value;
  input.placeholder = 'Thumbnail URL';
  thumbsContainer.appendChild(input);
}

// Add addon group
function addAddonGroup(name = '') {
  const group = document.createElement('div');
  group.className = 'group';
  group.innerHTML = `
    <div class="group-header">
      <input type="text" class="group-name" placeholder="Group name" value="${name}">
      <button type="button" class="small-btn remove-group">Remove</button>
    </div>
    <div class="items"></div>
    <button type="button" class="small-btn add-item">Add Item</button>
  `;
  addonGroupsEl.appendChild(group);
  // Event handlers
  group.querySelector('.remove-group').addEventListener('click', () => group.remove());
  group.querySelector('.add-item').addEventListener('click', () => addAddonItem(group));
  return group;
}

// Add addon item to a group
function addAddonItem(groupEl, data = {}) {
  const itemsEl = groupEl.querySelector('.items');
  const item = document.createElement('div');
  item.className = 'item';
  item.innerHTML = `
    <label><input type="text" class="item-label" placeholder="Field label" value="${data.label || ''}"></label>
    <select class="item-type">
      <option value="text" ${data.type === 'text' ? 'selected' : ''}>Text</option>
      <option value="number" ${data.type === 'number' ? 'selected' : ''}>Quantity</option>
      <option value="dropdown" ${data.type === 'dropdown' ? 'selected' : ''}>Dropdown</option>
      <option value="checkbox" ${data.type === 'checkbox' ? 'selected' : ''}>Checkbox</option>
      <option value="radio" ${data.type === 'radio' ? 'selected' : ''}>Radio</option>
      <option value="textarea" ${data.type === 'textarea' ? 'selected' : ''}>Long Text</option>
    </select>
    <button type="button" class="small-btn remove-item">Remove</button>
  `;
  itemsEl.appendChild(item);
  item.querySelector('.remove-item').addEventListener('click', () => item.remove());
}

// Tab switching
function switchTab(tab) {
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('hidden', content.id !== 'tab-' + tab);
  });
}

// Handle tab button clicks
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.getAttribute('data-tab'));
  });
});

// Event listeners
addProductBtn.addEventListener('click', createProduct);
saveBtn.addEventListener('click', saveProduct);
cancelBtn.addEventListener('click', () => formContainer.classList.add('hidden'));
addThumbBtn.addEventListener('click', () => addThumbnailInput());
addGroupBtn.addEventListener('click', () => addAddonGroup());

// Initialize
loadProducts();