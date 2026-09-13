/* ===== Rebel Hounds MC  Media (Gallery + Videos) — shared uploads v3 ===== */

const API_MEDIA = 'api-media.php';
const UPLOAD_PHP = 'upload-media.php';
const LS_GALLERY = 'rh_gallery';
const LS_VIDEOS = 'rh_videos';

var _mediaRole = null;
var _mediaRoleLoaded = false;
async function canEditMedia() {
  if (_mediaRoleLoaded) return _mediaRole === 'officer' || _mediaRole === 'owner';
  // Check sessionStorage first (set by portal.js)
  var ssRole = '';
  try { ssRole = sessionStorage.getItem('rh_patch_role') || ''; } catch(e) {}
  if (ssRole === 'officer' || ssRole === 'owner') {
    _mediaRoleLoaded = true;
    _mediaRole = ssRole;
    return true;
  }
  // Check PHP session via auth-check
  try {
    var r = await fetch('auth-check.php?t=' + Date.now(), { credentials: 'same-origin', cache: 'no-store' });
    var d = await r.json();
    _mediaRoleLoaded = true;
    _mediaRole = d.logged_in ? (d.role || '') : '';
    return _mediaRole === 'officer' || _mediaRole === 'owner';
  } catch(e) {
    _mediaRoleLoaded = true;
    _mediaRole = '';
    return false;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function isVideoUrl(url, type) {
  if (type === 'video') return true;
  if (type === 'image') return false;
  return /\.(mp4|webm|mov|m4v|avi)(\?|$)/i.test(url);
}

/* ===== GALLERY ===== */
async function fetchSharedGallery() {
  try {
    var r = await fetch(API_MEDIA + '?t=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' });
    var d = await r.json();
    if (d && Array.isArray(d.items)) return d.items;
  } catch(e) {}
  // Fallback to gallery.json
  try {
    var r2 = await fetch('gallery.json?t=' + Date.now(), { cache: 'no-store' });
    if (r2.ok) { var d2 = await r2.json(); if (Array.isArray(d2)) return d2; }
  } catch(e) {}
  // Fallback to localStorage
  try { return JSON.parse(localStorage.getItem(LS_GALLERY)) || getDefaultGallery(); } catch(e) { return getDefaultGallery(); }
}

function getDefaultGallery() {
  return [{ url: 'rebel-hounds-patch.png', caption: 'Rebel Hounds MC  Club Patch', type: 'image', addedBy: 'Club' }];
}

async function renderGallery() {
  var grid = document.getElementById('galleryGrid');
  var empty = document.getElementById('galleryEmpty');
  if (!grid) return;
  var items = [];
  try { items = await fetchSharedGallery(); } catch(e) { items = getDefaultGallery(); }
  // merge local fallback
  try {
    var local = JSON.parse(localStorage.getItem(LS_GALLERY) || '[]');
    if (Array.isArray(local) && local.length) {
      var urls = new Set(items.map(function(i){ return i.url; }));
      local.forEach(function(l){ if(!urls.has(l.url)) items.push(l); });
    }
  } catch(e) {}
  if (items.length === 0) { if (empty) empty.style.display = 'block'; grid.innerHTML = ''; return; }
  if (empty) empty.style.display = 'none';
  var edit = await canEditMedia();
  grid.innerHTML = items.map(function(item, i) {
    var isVid = isVideoUrl(item.url, item.type);
    var media = isVid
      ? '<video src="' + escapeHtml(item.url) + '" muted loop playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.6);color:#fff;border-radius:50%;width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:18px;">\u25B6</span>'
      : '<img src="' + escapeHtml(item.url) + '" alt="' + escapeHtml(item.caption||'Club photo') + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;">';
    var delBtn = edit ? '<button class="media-delete-btn" data-url="' + escapeHtml(item.url) + '" data-type="' + (isVid?'video':'image') + '" title="Delete">&times;</button>' : '';
    return '<div class="gallery-item" data-index="' + i + '" data-url="' + escapeHtml(item.url) + '" data-type="' + (isVid?'video':'image') + '" style="position:relative;overflow:hidden;cursor:pointer;">' +
      delBtn +
      media +
      (item.caption ? '<div class="gallery-item-overlay"><p>' + escapeHtml(item.caption) + '</p></div>' : '') +
    '</div>';
  }).join('');
  grid.querySelectorAll('.gallery-item').forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (e.target.classList.contains('media-delete-btn')) return;
      var url = el.getAttribute('data-url');
      var type = el.getAttribute('data-type');
      if (type === 'video') openLightboxVideo(url);
      else openLightbox(url);
    });
  });
  grid.querySelectorAll('.media-delete-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var url = btn.getAttribute('data-url');
      var type = btn.getAttribute('data-type');
      if (!confirm('Delete this ' + type + '?')) return;
      deleteMediaItem(url, type);
    });
  });
}

async function deleteMediaItem(url, type) {
  try {
    var r = await fetch(API_MEDIA, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ url: url, type: type === 'video' ? 'video' : 'gallery' })
    });
    var d = await r.json();
    if (d.success) {
      if (type !== 'video') {
        // Also remove from localStorage fallback
        try {
          var local = JSON.parse(localStorage.getItem(LS_GALLERY) || '[]');
          local = local.filter(function(i) { return i.url !== url; });
          localStorage.setItem(LS_GALLERY, JSON.stringify(local));
        } catch(e) {}
        await renderGallery();
      } else {
        await renderVideos();
      }
    } else {
      alert(d.error || 'Failed to delete.');
    }
  } catch(e) {
    alert('Connection failed. Could not delete.');
  }
}

/* ===== VIDEOS ===== */
async function fetchVideos() {
  try {
    var r = await fetch(API_MEDIA + '?type=videos&t=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' });
    var d = await r.json();
    if (d && Array.isArray(d.items)) return d.items;
  } catch(e) {}
  // Fallback to localStorage
  try { return JSON.parse(localStorage.getItem(LS_VIDEOS)) || []; } catch(e) { return []; }
}

async function renderVideos() {
  var grid = document.getElementById('videoGrid');
  var empty = document.getElementById('videoEmpty');
  if (!grid) return;
  var items = [];
  try { items = await fetchVideos(); } catch(e) { items = []; }
  if (items.length === 0) { if (empty) { empty.style.display = 'block'; grid.innerHTML = ''; } return; }
  if (empty) empty.style.display = 'none';
  var edit = await canEditMedia();
  grid.innerHTML = items.map(function(item) {
    var delBtn = edit ? '<button class="media-delete-btn media-delete-btn-video" data-url="' + escapeHtml(item.embedUrl) + '" title="Delete">&times;</button>' : '';
    return '<div class="video-card" style="position:relative;">' +
      delBtn +
      '<iframe src="' + escapeHtml(item.embedUrl) + '" title="' + escapeHtml(item.title||'Video') + '" allowfullscreen loading="lazy"></iframe>' +
      '<div class="video-card-info"><h4>' + escapeHtml(item.title||'Untitled') + '</h4>' + (item.description ? '<p>' + escapeHtml(item.description) + '</p>' : '') + '</div>' +
    '</div>';
  }).join('');
  grid.querySelectorAll('.media-delete-btn-video').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var url = btn.getAttribute('data-url');
      if (!confirm('Delete this video?')) return;
      deleteMediaItem(url, 'video');
    });
  });
}

/* ===== LIGHTBOX ===== */
function openLightbox(url) {
  var lb = document.getElementById('lightbox');
  var img = document.getElementById('lightboxImg');
  if (!lb || !img) return;
  var vid = document.getElementById('lightboxVideo');
  if (vid) { vid.pause(); vid.style.display = 'none'; }
  img.style.display = 'block';
  img.src = url;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function openLightboxVideo(url) {
  var lb = document.getElementById('lightbox');
  var vid = document.getElementById('lightboxVideo');
  var img = document.getElementById('lightboxImg');
  if (!lb) return;
  if (!vid) {
    vid = document.createElement('video');
    vid.id = 'lightboxVideo';
    vid.controls = true; vid.autoplay = true;
    vid.style.maxWidth = '90vw'; vid.style.maxHeight = '85vh'; vid.style.borderRadius = '8px';
    lb.appendChild(vid);
  }
  if (img) img.style.display = 'none';
  vid.style.display = 'block';
  vid.src = url;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  var lb = document.getElementById('lightbox');
  var vid = document.getElementById('lightboxVideo');
  var img = document.getElementById('lightboxImg');
  if (lb) lb.classList.remove('open');
  if (vid) { vid.pause(); vid.removeAttribute('src'); }
  if (img) img.removeAttribute('src');
  document.body.style.overflow = '';
}
var lightboxClose = document.getElementById('lightboxClose');
if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
var lightbox = document.getElementById('lightbox');
if (lightbox) lightbox.addEventListener('click', function(e) { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeLightbox(); });

/* ===== UPLOAD ===== */
var gallerySubmit = document.getElementById('gallerySubmit');
var galleryUrl = document.getElementById('galleryUrl');
var galleryCaption = document.getElementById('galleryCaption');
var galleryPreview = document.getElementById('galleryPreview');
var galleryPreviewImg = document.getElementById('galleryPreviewImg');
var galleryPreviewVideo = document.getElementById('galleryPreviewVideo');
var galleryMsg = document.getElementById('galleryMsg');
var galleryFile = document.getElementById('galleryFile');
var pendingFile = null;

if (galleryFile) {
  galleryFile.addEventListener('change', function() {
    var file = galleryFile.files[0];
    if (!file) return;
    var isImg = file.type.startsWith('image/');
    var isVid = file.type.startsWith('video/');
    if (!isImg && !isVid) { galleryMsg.textContent = 'Please select an image or video file.'; return; }
    if (isImg && file.size > 12*1024*1024) { galleryMsg.textContent = 'Image too large. Max 12MB.'; return; }
    if (isVid && file.size > 80*1024*1024) { galleryMsg.textContent = 'Video too large. Max 80MB.'; return; }
    pendingFile = file;
    galleryPreview.style.display = 'block';
    if (isImg) {
      galleryPreviewImg.style.display = 'block';
      galleryPreviewVideo.style.display = 'none';
      galleryPreviewVideo.pause();
      var r = new FileReader();
      r.onload = function(e) { galleryPreviewImg.src = e.target.result; };
      r.readAsDataURL(file);
    } else {
      galleryPreviewImg.style.display = 'none';
      galleryPreviewVideo.style.display = 'block';
      galleryPreviewVideo.src = URL.createObjectURL(file);
    }
    galleryMsg.textContent = 'File selected. Click "Upload to Gallery" to share.';
  });
}
if (galleryUrl) {
  galleryUrl.addEventListener('input', function() {
    if (pendingFile) return;
    var url = galleryUrl.value.trim();
    if (!url) { galleryPreview.style.display = 'none'; return; }
    galleryPreview.style.display = 'block';
    var isVid = /\.(mp4|webm|mov|m4v|avi)(\?|$)/i.test(url);
    if (isVid) {
      galleryPreviewImg.style.display = 'none';
      galleryPreviewVideo.style.display = 'block';
      galleryPreviewVideo.src = url;
    } else {
      galleryPreviewVideo.style.display = 'none';
      galleryPreviewVideo.pause();
      galleryPreviewImg.style.display = 'block';
      galleryPreviewImg.src = url;
    }
  });
}
async function uploadDirect(file, caption, url) {
  var fd = new FormData();
  if (file) fd.append('file', file);
  if (caption) fd.append('caption', caption);
  if (url) fd.append('imageUrl', url);
  try {
    var res = await fetch(UPLOAD_PHP, { method: 'POST', body: fd });
    var data = await res.json().catch(function(){ return {}; });
    if (!res.ok || data.error) return { error: data.error || ('Server error ' + res.status) };
    return { url: data.url };
  } catch(err) {
    return { error: 'Connection failed. Check internet.' };
  }
}
function saveLocalFallback(url, caption, isVid) {
  try {
    var items = JSON.parse(localStorage.getItem(LS_GALLERY) || '[]');
    items.unshift({ url: url, caption: caption, type: isVid ? 'video' : 'image', addedBy: 'Member' });
    localStorage.setItem(LS_GALLERY, JSON.stringify(items.slice(0, 100)));
  } catch(e) {}
}
if (gallerySubmit) {
  gallerySubmit.addEventListener('click', async function() {
    var urlVal = galleryUrl.value.trim();
    var caption = galleryCaption.value.trim();
    if (!pendingFile && !urlVal) {
      galleryMsg.textContent = 'Please select a file or enter a URL.';
      return;
    }
    galleryMsg.textContent = 'Uploading...';
    gallerySubmit.disabled = true;
    var result = await uploadDirect(pendingFile, caption, urlVal);
    gallerySubmit.disabled = false;
    if (result && result.url) {
      galleryMsg.textContent = 'Uploaded! Visible to everyone.';
      galleryUrl.value = '';
      galleryCaption.value = '';
      galleryPreview.style.display = 'none';
      galleryPreviewImg.removeAttribute('src');
      galleryPreviewVideo.removeAttribute('src');
      galleryPreviewVideo.pause();
      if (galleryFile) galleryFile.value = '';
      pendingFile = null;
      saveLocalFallback(result.url, caption, false);
      await renderGallery();
      setTimeout(function() { galleryMsg.textContent = ''; }, 3000);
    } else {
      var errMsg = (result && result.error) || 'Upload failed.';
      if (pendingFile && pendingFile.type.startsWith('image/')) {
        var reader = new FileReader();
        reader.onload = function(e) {
          saveLocalFallback(e.target.result, caption, false);
          galleryMsg.textContent = errMsg + ' - Saved locally for you. Server may need permissions fix. Others will not see it until server works.';
          renderGallery();
          galleryUrl.value = ''; galleryCaption.value = ''; galleryPreview.style.display = 'none'; if (galleryFile) galleryFile.value = ''; pendingFile = null;
        };
        reader.readAsDataURL(pendingFile);
      } else {
        galleryMsg.textContent = errMsg + ' - If this persists, check file type/size or contact admin.';
      }
    }
  });
}

renderGallery();
renderVideos();
