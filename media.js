/* ===== Rebel Hounds MC  Media (Gallery + Videos) ===== */

const PATCH_KEY = 'rh_patch_auth';
const WEBHOOK_KEY = 'rh_discord_webhook';
let patchAuthed = false;
try { patchAuthed = sessionStorage.getItem(PATCH_KEY) === '1'; } catch (e) {}

// Show upload area if logged in
const galleryUpload = document.getElementById('galleryUpload');
if (galleryUpload && patchAuthed) {
  galleryUpload.classList.remove('hidden');
}

// Webhook config
let webhookUrl = '';
try { webhookUrl = localStorage.getItem(WEBHOOK_KEY) || ''; } catch (e) {}

const webhookInput = document.getElementById('webhookUrl');
const webhookSave = document.getElementById('webhookSave');
const webhookStatus = document.getElementById('webhookStatus');

if (webhookInput) webhookInput.value = webhookUrl;

if (webhookSave) {
  webhookSave.addEventListener('click', () => {
    const url = webhookInput.value.trim();
    if (!url.includes('discord.com/api/webhooks')) {
      webhookStatus.textContent = 'Invalid Discord webhook URL.';
      return;
    }
    webhookUrl = url;
    try { localStorage.setItem(WEBHOOK_KEY, url); } catch (e) {}
    webhookStatus.textContent = 'Webhook saved.';
    setTimeout(() => { webhookStatus.textContent = ''; }, 2000);
  });
}

// Gallery data stored in localStorage
const GALLERY_KEY = 'rh_gallery';
const VIDEO_KEY = 'rh_videos';

function getGallery() {
  try {
    return JSON.parse(localStorage.getItem(GALLERY_KEY)) || getDefaultGallery();
  } catch (e) {
    return getDefaultGallery();
  }
}

function getDefaultGallery() {
  return [
    { url: 'rebel-hounds-patch.png', caption: 'Rebel Hounds MC  Club Patch', addedBy: 'Club' },
  ];
}

function saveGallery(items) {
  try { localStorage.setItem(GALLERY_KEY, JSON.stringify(items)); } catch (e) {}
}

function getVideos() {
  try {
    return JSON.parse(localStorage.getItem(VIDEO_KEY)) || getDefaultVideos();
  } catch (e) {
    return getDefaultVideos();
  }
}

function getDefaultVideos() {
  return [];
}

function saveVideos(items) {
  try { localStorage.setItem(VIDEO_KEY, JSON.stringify(items)); } catch (e) {}
}

// Render gallery
function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  const empty = document.getElementById('galleryEmpty');
  if (!grid) return;

  const items = getGallery();
  if (items.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  grid.innerHTML = items.map((item, i) => `
    <div class="gallery-item" data-index="${i}">
      <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.caption || 'Club photo')}" loading="lazy">
      ${item.caption ? `<div class="gallery-item-overlay"><p>${escapeHtml(item.caption)}</p></div>` : ''}
    </div>
  `).join('');

  // Lightbox click
  grid.querySelectorAll('.gallery-item').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index);
      const photo = items[idx];
      openLightbox(photo.url, photo.caption);
    });
  });
}

// Render videos
function renderVideos() {
  const grid = document.getElementById('videoGrid');
  const empty = document.getElementById('videoEmpty');
  if (!grid) return;

  const items = getVideos();
  if (items.length === 0) {
    if (empty) empty.style.display = 'block';
    grid.style.display = 'none';
    return;
  }
  if (empty) empty.style.display = 'none';

  grid.innerHTML = items.map(item => `
    <div class="video-card">
      <iframe src="${escapeHtml(item.embedUrl)}" title="${escapeHtml(item.title || 'Video')}" allowfullscreen loading="lazy"></iframe>
      <div class="video-card-info">
        <h4>${escapeHtml(item.title || 'Untitled')}</h4>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
      </div>
    </div>
  `).join('');
}

// Lightbox
function openLightbox(url, caption) {
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  if (!lightbox || !img) return;
  img.src = url;
  img.alt = caption || 'Gallery image';
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

const lightboxClose = document.getElementById('lightboxClose');
if (lightboxClose) {
  lightboxClose.addEventListener('click', closeLightbox);
}

const lightbox = document.getElementById('lightbox');
if (lightbox) {
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

// Gallery upload
const gallerySubmit = document.getElementById('gallerySubmit');
const galleryUrl = document.getElementById('galleryUrl');
const galleryCaption = document.getElementById('galleryCaption');
const galleryPreview = document.getElementById('galleryPreview');
const galleryPreviewImg = document.getElementById('galleryPreviewImg');
const galleryMsg = document.getElementById('galleryMsg');
const galleryFile = document.getElementById('galleryFile');
const fileUploadArea = document.getElementById('fileUploadArea');

let pendingFile = null;

// File selection preview
if (galleryFile) {
  galleryFile.addEventListener('change', () => {
    const file = galleryFile.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      galleryMsg.textContent = 'Please select an image file.';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      galleryMsg.textContent = 'File too large. Max 8MB.';
      return;
    }
    pendingFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      galleryPreview.style.display = 'block';
      galleryPreviewImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
    galleryMsg.textContent = 'File selected. Click "Add to Gallery" to upload.';
  });
}

// URL preview
if (galleryUrl) {
  galleryUrl.addEventListener('input', () => {
    if (pendingFile) return;
    const url = galleryUrl.value.trim();
    if (url && (url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.includes('imgur') || url.includes('discord'))) {
      galleryPreview.style.display = 'block';
      galleryPreviewImg.src = url;
    } else {
      galleryPreview.style.display = 'none';
    }
  });
}

// Upload file to Discord webhook
async function uploadToDiscord(file) {
  if (!webhookUrl) {
    galleryMsg.textContent = 'Please save a Discord webhook URL first.';
    return null;
  }

  galleryMsg.textContent = 'Uploading to Discord...';

  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('content', 'Club photo upload');

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const text = await res.text();
      galleryMsg.textContent = 'Upload failed. Check webhook URL.';
      console.error('Discord webhook error:', res.status, text);
      return null;
    }

    // Discord returns the message with the attachment URL
    const data = await res.json();
    if (data.attachments && data.attachments.length > 0) {
      return data.attachments[0].url;
    }

    // Fallback: construct CDN URL from channel info
    galleryMsg.textContent = 'Upload sent. URL not captured  check Discord.';
    return null;
  } catch (err) {
    galleryMsg.textContent = 'Upload failed. Check connection.';
    console.error('Upload error:', err);
    return null;
  }
}

if (gallerySubmit) {
  gallerySubmit.addEventListener('click', async () => {
    let imageUrl = galleryUrl.value.trim();
    const caption = galleryCaption.value.trim();

    // Upload file if selected
    if (pendingFile) {
      const uploadedUrl = await uploadToDiscord(pendingFile);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        return;
      }
    }

    if (!imageUrl) {
      galleryMsg.textContent = 'Please select a file or enter an image URL.';
      return;
    }

    const items = getGallery();
    items.unshift({
      url: imageUrl,
      caption: caption,
      addedBy: 'Patch Holder'
    });
    saveGallery(items);

    galleryUrl.value = '';
    galleryCaption.value = '';
    galleryPreview.style.display = 'none';
    galleryFile.value = '';
    pendingFile = null;
    galleryMsg.textContent = 'Photo added to gallery.';
    renderGallery();

    setTimeout(() => { galleryMsg.textContent = ''; }, 3000);
  });
}

// Utility
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Init
renderGallery();
renderVideos();
