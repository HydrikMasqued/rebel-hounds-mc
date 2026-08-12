/* ===== Rebel Hounds MC — Dynamic Inventory ===== */

const INV_KEY = 'rh_inventory';

function getDefaultInventory() {
  return {
    storages: [
      {
        id: 'food',
        name: 'Food & Drinks',
        sections: [
          {
            name: 'Food and Drinks',
            items: [
              { name: 'Strawberry Soda', quantity: 2, image: '' },
              { name: 'Dino Nuggets', quantity: 6, image: '' },
              { name: 'The Chip Tease', quantity: 1, image: '' },
              { name: 'Grilled Cheese', quantity: 11, image: '' },
              { name: 'Arnold Palmer', quantity: 76, image: '' },
              { name: 'The Naughty Rack', quantity: 1, image: '' },
              { name: 'Fluffy White Mocha Cloud', quantity: 1, image: '' },
              { name: 'Milkshake', quantity: 2, image: '' },
              { name: 'Apple Slush', quantity: 1, image: '' },
              { name: 'Coffee', quantity: 15, image: '' },
              { name: 'Cozy Morning Swirl', quantity: 2, image: '' },
              { name: 'Rare Affair', quantity: 2, image: '' },
              { name: 'Minty Daze', quantity: 2, image: '' },
              { name: 'Nez-Quick Fix', quantity: 2, image: '' },
              { name: 'Bottle Water', quantity: 101, image: '' },
              { name: 'Matcha', quantity: 10, image: '' },
              { name: 'Donburi', quantity: 10, image: '' },
              { name: 'Koi Whiskey', quantity: 4, image: '' },
              { name: 'Koi no Kokoro', quantity: 2, image: '' },
              { name: 'Ice Age Brain Freeze', quantity: 4, image: '' }
            ]
          },
          {
            name: 'Alcohol',
            items: [
              { name: 'Skitz Spritz', quantity: 1, image: '' },
              { name: 'Gate Keeper', quantity: 2, image: '' },
              { name: 'Whiskey', quantity: 7, image: '' },
              { name: 'Vodka', quantity: 2, image: '' }
            ]
          }
        ]
      },
      {
        id: 'church',
        name: 'Church Storage',
        sections: [
          {
            name: 'Weapons & Ammo',
            items: [
              { name: 'Pure Coke', quantity: 177, image: '' },
              { name: 'Micro SMG — Broken', quantity: 1, image: '' },
              { name: 'SMG — Broken', quantity: 1, image: '' },
              { name: 'Heavy Pistol — Broken', quantity: 1, image: '' },
              { name: 'SNS Pistol — Full', quantity: 17, image: '' },
              { name: 'SNS Pistol — Partial', quantity: 15, image: '' },
              { name: 'Heavy Pistol — Partial', quantity: 2, image: '' },
              { name: 'Combat Pistol — Partial', quantity: 2, image: '' },
              { name: 'Walter P99 — Partial', quantity: 1, image: '' }
            ]
          }
        ]
      },
      {
        id: 'armory',
        name: 'Armory Room',
        sections: [
          {
            name: 'Back Right Corner',
            items: [
              { name: 'Medical Machine', quantity: 1, image: '' },
              { name: 'Oscillator', quantity: 2, image: '' },
              { name: 'Wrench', quantity: 3, image: '' }
            ]
          },
          {
            name: 'Inside Door',
            items: [
              { name: 'Copper', quantity: 753, image: '' },
              { name: 'Rag', quantity: 6, image: '' },
              { name: 'Glass', quantity: 2, image: '' },
              { name: 'Aluminium', quantity: 29, image: '' },
              { name: 'Iron', quantity: 43, image: '' },
              { name: 'Steel', quantity: 13, image: '' },
              { name: 'Plastic', quantity: 10, image: '' },
              { name: 'Metal Bar', quantity: 10, image: '' },
              { name: 'Rubber', quantity: 474, image: '' }
            ]
          },
          {
            name: 'Left of Door',
            items: [
              { name: 'Cement', quantity: 67, image: '' }
            ]
          }
        ]
      },
      {
        id: 'garage',
        name: 'Garage',
        sections: [
          {
            name: 'Garage Office',
            items: [
              { name: 'Tool Kit', quantity: 2, image: '' },
              { name: 'RC Car', quantity: 1, image: '' },
              { name: 'Speaker Blast', quantity: 2, image: '' },
              { name: 'Love Wand', quantity: 1, image: '' }
            ]
          },
          {
            name: 'Left Back Wall',
            items: [
              { name: 'Cement', quantity: 54, image: '' },
              { name: 'Carbon', quantity: 1480, image: '' }
            ]
          },
          {
            name: 'Middle Back Wall',
            items: [
              { name: 'Coal', quantity: 1954, image: '' },
              { name: 'Wood Plank', quantity: 5, image: '' },
              { name: 'Empty Pallet', quantity: 4, image: '' }
            ]
          },
          {
            name: 'Right Back Wall',
            items: [
              { name: 'Sulfur', quantity: 12500, image: '' }
            ]
          }
        ]
      }
    ]
  };
}

function getInventory() {
  try {
    const data = JSON.parse(localStorage.getItem(INV_KEY));
    if (data && data.storages) return data;
  } catch (e) {}
  return getDefaultInventory();
}

function saveInventory(data) {
  try { localStorage.setItem(INV_KEY, JSON.stringify(data)); } catch (e) {}
}

let inventoryData = getInventory();
let editingItem = null;

// Auth check
const PATCH_KEY = 'rh_patch_auth';
let patchAuthed = false;
try { patchAuthed = sessionStorage.getItem(PATCH_KEY) === '1'; } catch (e) {}

// Show controls if logged in
const invControls = document.getElementById('invControls');
if (invControls && patchAuthed) invControls.style.display = '';

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Render
function renderInventory() {
  const container = document.getElementById('inventoryContainer');
  if (!container) return;

  let html = '';
  inventoryData.storages.forEach(storage => {
    html += `<div class="inv-storage">
      <h3 class="inv-storage-title">${escapeHtml(storage.name)}</h3>`;

    storage.sections.forEach(section => {
      html += `<div class="inv-section">
        <h4 class="inv-section-title">${escapeHtml(section.name)}</h4>
        <div class="inv-items">`;

      section.items.forEach((item, idx) => {
        html += `<div class="inv-item">
          ${item.image ? `<div class="inv-item-img"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy"></div>` : ''}
          <div class="inv-item-info">
            <span class="inv-item-name">${escapeHtml(item.name)}</span>
            <span class="inv-item-qty">x${item.quantity}</span>
          </div>
          ${patchAuthed ? `<div class="inv-item-actions">
            <button class="inv-btn-edit" data-storage="${storage.id}" data-section="${section.name}" data-idx="${idx}" title="Edit">&#9998;</button>
            <button class="inv-btn-del" data-storage="${storage.id}" data-section="${section.name}" data-idx="${idx}" title="Delete">&times;</button>
          </div>` : ''}
        </div>`;
      });

      if (patchAuthed) {
        html += `<div class="inv-item inv-item-add" data-storage="${storage.id}" data-section="${section.name}">
          <button class="inv-add-btn">+ Add Item</button>
        </div>`;
      }

      html += `</div></div>`;
    });

    if (patchAuthed) {
      html += `<div class="inv-add-section">
        <button class="btn btn-outline btn-sm inv-add-section-btn" data-storage="${storage.id}">+ Add Section</button>
      </div>`;
    }

    html += `</div>`;
  });

  if (patchAuthed) {
    html += `<div class="inv-add-storage">
      <button class="btn btn-primary btn-sm" id="addStorageBtn">+ Add Storage Location</button>
    </div>`;
  }

  container.innerHTML = html;
  bindEvents();
}

function bindEvents() {
  // Add item
  document.querySelectorAll('.inv-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.inv-item-add');
      const storageId = card.dataset.storage;
      const sectionName = card.dataset.section;
      openItemModal(null, storageId, sectionName);
    });
  });

  // Edit item
  document.querySelectorAll('.inv-btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const storageId = btn.dataset.storage;
      const sectionName = btn.dataset.section;
      const idx = parseInt(btn.dataset.idx);
      const storage = inventoryData.storages.find(s => s.id === storageId);
      const section = storage?.sections.find(s => s.name === sectionName);
      if (section && section.items[idx]) {
        openItemModal(section.items[idx], storageId, sectionName, idx);
      }
    });
  });

  // Delete item
  document.querySelectorAll('.inv-btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this item?')) return;
      const storageId = btn.dataset.storage;
      const sectionName = btn.dataset.section;
      const idx = parseInt(btn.dataset.idx);
      const storage = inventoryData.storages.find(s => s.id === storageId);
      const section = storage?.sections.find(s => s.name === sectionName);
      if (section) {
        section.items.splice(idx, 1);
        saveInventory(inventoryData);
        renderInventory();
      }
    });
  });

  // Add section
  document.querySelectorAll('.inv-add-section-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = prompt('Section name:');
      if (!name || !name.trim()) return;
      const storage = inventoryData.storages.find(s => s.id === btn.dataset.storage);
      if (storage) {
        storage.sections.push({ name: name.trim(), items: [] });
        saveInventory(inventoryData);
        renderInventory();
      }
    });
  });

  // Add storage
  const addStorageBtn = document.getElementById('addStorageBtn');
  if (addStorageBtn) {
    addStorageBtn.addEventListener('click', () => {
      const name = prompt('Storage location name:');
      if (!name || !name.trim()) return;
      const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      inventoryData.storages.push({
        id: id,
        name: name.trim(),
        sections: []
      });
      saveInventory(inventoryData);
      renderInventory();
    });
  }
}

// Modal
function openItemModal(item, storageId, sectionName, editIdx) {
  editingItem = { storageId, sectionName, editIdx };
  const modal = document.getElementById('invModal');
  const nameInput = document.getElementById('invItemName');
  const qtyInput = document.getElementById('invItemQty');
  const imgInput = document.getElementById('invItemImage');
  const title = document.getElementById('invModalTitle');

  if (item) {
    title.textContent = 'Edit Item';
    nameInput.value = item.name;
    qtyInput.value = item.quantity;
    imgInput.value = item.image || '';
  } else {
    title.textContent = 'Add Item';
    nameInput.value = '';
    qtyInput.value = 1;
    imgInput.value = '';
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  nameInput.focus();
}

function closeModal() {
  const modal = document.getElementById('invModal');
  modal.classList.remove('open');
  document.body.style.overflow = '';
  editingItem = null;
}

// Modal events
const invModal = document.getElementById('invModal');
const invForm = document.getElementById('invForm');
const invModalClose = document.getElementById('invModalClose');

if (invModalClose) invModalClose.addEventListener('click', closeModal);
if (invModal) invModal.addEventListener('click', (e) => { if (e.target === invModal) closeModal(); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && invModal?.classList.contains('open')) closeModal();
});

if (invForm) {
  invForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!editingItem) return;

    const name = document.getElementById('invItemName').value.trim();
    const quantity = parseInt(document.getElementById('invItemQty').value) || 0;
    const image = document.getElementById('invItemImage').value.trim();

    if (!name) return;

    const storage = inventoryData.storages.find(s => s.id === editingItem.storageId);
    const section = storage?.sections.find(s => s.name === editingItem.sectionName);
    if (!section) return;

    const newItem = { name, quantity, image };

    if (editingItem.editIdx !== undefined && editingItem.editIdx !== null) {
      section.items[editingItem.editIdx] = newItem;
    } else {
      section.items.push(newItem);
    }

    saveInventory(inventoryData);
    closeModal();
    renderInventory();
  });
}

// Reset to defaults
const resetBtn = document.getElementById('invResetBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    if (!confirm('Reset all inventory to default data? This cannot be undone.')) return;
    inventoryData = getDefaultInventory();
    saveInventory(inventoryData);
    renderInventory();
  });
}

// Init
renderInventory();
