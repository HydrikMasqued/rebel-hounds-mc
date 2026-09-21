/* ===== Rebel Hounds MC  Media (Gallery + Videos) — database-backed v4 ===== */

const API_MEDIA = 'api-media.php';
const UPLOAD_PHP = 'upload-media.php';

function canEditMedia() {
  if (window.rhmcAuth && window.rhmcAuth.canEdit()) return true;
  try {
    var r = sessionStorage.getItem('rh_patch_role') || '';
    if (r === 'officer' || r === 'owner') return true;
  } catch(e) {}
  return false;
}

function canUploadMedia() {
  if (window.rhmcAuth && window.rhmcAuth.getRoleLevel) {
    try { return window.rhmcAuth.getRoleLevel() >= 2; } catch(e) {}
  }
  try {
    var r = sessionStorage.getItem('rh_patch_role') || '';
    return r === 'patched' || r === 'officer' || r === 'owner';
  } catch(e) {}
  return false;
}

function updateUploadVisibility() {
  var form = document.getElementById('galleryUpload');
  var notice = document.getElementById('galleryLoginNotice');
  var ok = canUploadMedia();
  if (form) form.style.display = ok ? '' : 'none';
  if (notice) notice.style.display = ok ? 'none' : '';
}

function checkServerAuth() {
  if (canEditMedia()) return;
  fetch('auth-check.php?t=' + Date.now(), { credentials: 'same-origin', cache: 'no-store' })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.logged_in && d.role && (d.role === 'officer' || d.role === 'owner')) {
        try { sessionStorage.setItem('rh_patch_role', d.role); } catch(e) {}
        if (window.rhmcAuth) window.dispatchEvent(new CustomEvent('patchAuthChange', { detail: { authed: true, role: d.role } }));
        renderGallery();
        renderVideos();
      }
    })
    .catch(function() {});
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
async function fetchGallery() {
  try {
    var r = await fetch(API_MEDIA + '?t=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' });
    var d = await r.json();
    if (d && Array.isArray(d.items)) return d.items;
  } catch(e) {}
  return [];
}

async function renderGallery() {
  var grid = document.getElementById('galleryGrid');
  var empty = document.getElementById('galleryEmpty');
  if (!grid) return;
  var items = [];
  try { items = await fetchGallery(); } catch(e) { items = []; }
  if (items.length === 0) { if (empty) empty.style.display = 'block'; grid.innerHTML = ''; return; }
  if (empty) empty.style.display = 'none';
  var edit = canEditMedia();
  grid.innerHTML = items.map(function(item, i) {
    var isVid = isVideoUrl(item.url, item.type);
    var media = isVid
      ? '<video src="' + escapeHtml(item.url) + '" muted loop playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.6);color:#fff;border-radius:50%;width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:18px;">\u25B6</span>'
      : '<img src="' + escapeHtml(item.url) + '" alt="' + escapeHtml(item.caption||'Club photo') + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;">';
    var delBtn = edit ? '<button class="media-delete-btn" data-id="' + (item.id||0) + '" data-url="' + escapeHtml(item.url) + '" data-type="' + (isVid?'video':'image') + '" title="Delete">&times;</button>' : '';
    return '<div class="gallery-item" data-index="' + i + '" data-url="' + escapeHtml(item.url) + '" data-type="' + (isVid?'video':'image') + '" style="position:relative;overflow:hidden;cursor:pointer;">' +
      delBtn + media +
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
      if (!confirm('Delete this item?')) return;
      deleteMediaItem(btn.getAttribute('data-id'), btn.getAttribute('data-url'), btn.getAttribute('data-type'));
    });
  });
}

async function deleteMediaItem(id, url, type) {
  try {
    var r = await fetch(API_MEDIA, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ url: url, type: type })
    });
    var d = await r.json();
    if (d.success) {
      if (type !== 'video') await renderGallery();
      else await renderVideos();
      renderMontage();
    } else if (r.status === 403) {
      alert('You need to be logged in as an officer or owner.\nUse the login button in the bottom-right corner.');
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
  return [];
}

async function renderVideos() {
  var grid = document.getElementById('videoGrid');
  var empty = document.getElementById('videoEmpty');
  if (!grid) return;
  var items = [];
  try { items = await fetchVideos(); } catch(e) { items = []; }
  if (items.length === 0) { if (empty) { empty.style.display = 'block'; grid.innerHTML = ''; } return; }
  if (empty) empty.style.display = 'none';
  var edit = canEditMedia();
  grid.innerHTML = items.map(function(item) {
    var delBtn = edit ? '<button class="media-delete-btn media-delete-btn-video" data-id="' + (item.id||0) + '" data-url="' + escapeHtml(item.embedUrl || item.url) + '" title="Delete">&times;</button>' : '';
    return '<div class="video-card" style="position:relative;">' +
      delBtn +
      '<iframe src="' + escapeHtml(item.embedUrl || item.url) + '" title="' + escapeHtml(item.title||'Video') + '" allowfullscreen loading="lazy"></iframe>' +
      '<div class="video-card-info"><h4>' + escapeHtml(item.title||'Untitled') + '</h4>' + (item.description ? '<p>' + escapeHtml(item.description) + '</p>' : '') + '</div>' +
    '</div>';
  }).join('');
  grid.querySelectorAll('.media-delete-btn-video').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!confirm('Delete this video?')) return;
      deleteMediaItem(btn.getAttribute('data-id'), btn.getAttribute('data-url'), 'video');
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
      await renderGallery();
      renderMontage();
      setTimeout(function() { galleryMsg.textContent = ''; }, 3000);
    } else {
      galleryMsg.textContent = (result && result.error) || 'Upload failed.';
    }
  });
}

/* ===== MONTAGE (auto-play slideshow of gallery photos + video files) ===== */
var montageItems = [];
var montageIndex = 0;
var montageTimer = null;
var montagePlaying = true;
var montageUserPaused = false;
var montageHoverPaused = false;
var montageMuted = true;
var montageFront = 0;
var montageSlideStart = 0;
var montageSlideLen = 6000;
var PHOTO_MS = 6000;
var VIDEO_MAX_MS = 25000;

function montageEl(id) { return document.getElementById(id); }

function montageStopLayerVideo(layer) {
  if (!layer) return;
  var v = layer.querySelector('video');
  if (v) { try { v.pause(); } catch(e) {} v.removeAttribute('src'); }
  layer.innerHTML = '';
}

function montageRunBar(ms) {
  var bar = montageEl('montageProgressBar');
  if (!bar) return;
  bar.style.transition = 'none';
  bar.style.width = '0';
  void bar.offsetWidth;
  bar.style.transition = 'width ' + ms + 'ms linear';
  bar.style.width = '100%';
}

function montageFreezeBar() {
  var bar = montageEl('montageProgressBar');
  if (!bar) return;
  var w = window.getComputedStyle(bar).width;
  bar.style.transition = 'none';
  bar.style.width = w;
}

function montageCurrentVideo() {
  var layers = [montageEl('montageSlideA'), montageEl('montageSlideB')];
  var front = layers[montageFront];
  return front ? front.querySelector('video') : null;
}

function montagePause(hover) {
  if (hover) {
    if (!montagePlaying || montageUserPaused || montageHoverPaused) return;
    montageHoverPaused = true;
  } else {
    if (!montagePlaying) return;
    montagePlaying = false;
    montageUserPaused = true;
  }
  if (montageTimer) { clearTimeout(montageTimer); montageTimer = null; }
  var v = montageCurrentVideo();
  if (v) { try { v.pause(); } catch(e) {} }
  montageFreezeBar();
  montageSlideLen = Math.max(500, montageSlideLen - (Date.now() - montageSlideStart));
  updateMontagePlayBtn();
}

function montagePlay() {
  if (montagePlaying && !montageHoverPaused) return;
  montagePlaying = true;
  montageUserPaused = false;
  montageHoverPaused = false;
  var v = montageCurrentVideo();
  if (v) { try { v.play().catch(function(){}); } catch(e) {} }
  montageSlideStart = Date.now();
  if (montageTimer) clearTimeout(montageTimer);
  montageTimer = null;
  if (montageItems.length > 1) montageTimer = setTimeout(montageNext, montageSlideLen);
  montageRunBar(montageSlideLen);
  updateMontagePlayBtn();
}

function updateMontagePlayBtn() {
  var b = montageEl('montagePlayPause');
  if (b) b.innerHTML = montagePlaying ? '&#10074;&#10074;' : '&#9654;';
}

function updateMontageMuteBtn() {
  var b = montageEl('montageMute');
  if (b) b.innerHTML = montageMuted ? '&#128263;' : '&#128266;';
}

function montageNext() { montageGo((montageIndex + 1) % montageItems.length); }
function montagePrev() { montageGo((montageIndex - 1 + montageItems.length) % montageItems.length); }

function montageGo(i) {
  if (!montageItems.length) return;
  montageIndex = i;
  showMontageSlide(i);
}

function showMontageSlide(i) {
  var layerA = montageEl('montageSlideA');
  var layerB = montageEl('montageSlideB');
  if (!layerA || !layerB) return;
  if (montageTimer) { clearTimeout(montageTimer); montageTimer = null; }
  montageStopLayerVideo(layerA);
  montageStopLayerVideo(layerB);
  var item = montageItems[i];
  if (!item) return;
  var showEl = (montageFront === 0) ? layerB : layerA;
  var hideEl = (montageFront === 0) ? layerA : layerB;
  var isVid = isVideoUrl(item.url, item.type);
  var counter = montageEl('montageCounter');
  if (counter) counter.textContent = (i + 1) + ' / ' + montageItems.length;
  var capWrap = montageEl('montageCaptionWrap');
  var capTitle = montageEl('montageTitle');
  var capText = montageEl('montageCaption');
  var cap = item.caption || item.title || '';
  if (capWrap) capWrap.style.display = cap ? '' : 'none';
  if (capTitle) capTitle.textContent = cap;
  if (capText) capText.textContent = item.description || '';
  var muteBtn = montageEl('montageMute');
  if (muteBtn) muteBtn.style.display = isVid ? '' : 'none';
  var multi = montageItems.length > 1;
  var prevB = montageEl('montagePrev');
  var nextB = montageEl('montageNext');
  if (prevB) prevB.style.display = multi ? '' : 'none';
  if (nextB) nextB.style.display = multi ? '' : 'none';

  if (isVid) {
    showEl.innerHTML = '<video src="' + escapeHtml(item.url) + '" muted playsinline preload="auto"></video>';
    var v = showEl.querySelector('video');
    v.muted = montageMuted;
    montageSlideLen = VIDEO_MAX_MS;
    montageSlideStart = Date.now();
    showEl.classList.add('visible');
    hideEl.classList.remove('visible');
    montageFront = (montageFront === 0) ? 1 : 0;
    montageRunBar(VIDEO_MAX_MS);
    var started = false;
    var begin = function() {
      if (started) return;
      started = true;
      var dur = 20000;
      try { if (v.duration && isFinite(v.duration)) dur = Math.min(v.duration * 1000, VIDEO_MAX_MS); } catch(e) {}
      montageSlideLen = Math.max(3000, dur);
      montageSlideStart = Date.now();
      if (montagePlaying && multi) {
        if (montageTimer) clearTimeout(montageTimer);
        montageTimer = setTimeout(montageNext, montageSlideLen);
      }
      montageRunBar(montageSlideLen);
    };
    v.addEventListener('playing', begin);
    v.addEventListener('loadedmetadata', function() {
      if (v.duration && isFinite(v.duration) && montagePlaying && multi && started) {
        var dur = Math.min(v.duration * 1000, VIDEO_MAX_MS);
        montageSlideLen = Math.max(3000, dur);
      }
    });
    v.addEventListener('ended', function() { if (montagePlaying && multi) montageNext(); });
    v.addEventListener('error', function() {
      if (montagePlaying && multi) {
        if (montageTimer) clearTimeout(montageTimer);
        montageTimer = setTimeout(montageNext, 1500);
      }
    });
    if (montagePlaying) {
      try { var pr = v.play(); if (pr && pr.catch) pr.catch(function(){}); } catch(e) {}
      if (multi) montageTimer = setTimeout(montageNext, VIDEO_MAX_MS);
    }
  } else {
    showEl.innerHTML = '<img src="' + escapeHtml(item.url) + '" alt="' + escapeHtml(cap || 'Club media') + '" class="' + (i % 2 ? 'kb-alt' : 'kb') + '">';
    montageSlideLen = PHOTO_MS;
    montageSlideStart = Date.now();
    showEl.classList.add('visible');
    hideEl.classList.remove('visible');
    montageFront = (montageFront === 0) ? 1 : 0;
    montageRunBar(PHOTO_MS);
    if (montagePlaying && multi) montageTimer = setTimeout(montageNext, PHOTO_MS);
  }
  updateMontagePlayBtn();
  updateMontageMuteBtn();
}

function renderMontage() {
  var sec = montageEl('montageSection');
  if (!sec) return;
  fetchGallery().then(function(items) {
    montageItems = (items || []).filter(function(it) { return it && it.url; });
    if (!montageItems.length) {
      sec.style.display = 'none';
      if (montageTimer) { clearTimeout(montageTimer); montageTimer = null; }
      return;
    }
    sec.style.display = '';
    if (montageIndex >= montageItems.length) montageIndex = 0;
    if (!montagePlaying) { montagePlaying = true; montageUserPaused = false; }
    showMontageSlide(montageIndex);
  }).catch(function() {
    sec.style.display = 'none';
  });
}

function initMontageControls() {
  var prevB = montageEl('montagePrev');
  var nextB = montageEl('montageNext');
  var ppB = montageEl('montagePlayPause');
  var muteB = montageEl('montageMute');
  var player = montageEl('montagePlayer');
  if (prevB) prevB.addEventListener('click', function() { montagePrev(); });
  if (nextB) nextB.addEventListener('click', function() { montageNext(); });
  if (ppB) ppB.addEventListener('click', function() {
    if (montagePlaying) montagePause(false);
    else montagePlay();
  });
  if (muteB) muteB.addEventListener('click', function() {
    montageMuted = !montageMuted;
    var v = montageCurrentVideo();
    if (v) v.muted = montageMuted;
    updateMontageMuteBtn();
  });
  if (player) {
    player.addEventListener('mouseenter', function() { montagePause(true); });
    player.addEventListener('mouseleave', function() {
      if (montageHoverPaused) {
        montageHoverPaused = false;
        if (!montageUserPaused) montagePlay();
      }
    });
  }
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      if (montagePlaying && !montageUserPaused) montagePause(true);
    } else if (montageHoverPaused && !montageUserPaused) {
      montageHoverPaused = false;
      montagePlay();
    }
  });
}

renderGallery();
renderVideos();
renderMontage();
initMontageControls();
updateUploadVisibility();
checkServerAuth();

window.addEventListener('patchAuthChange', function() {
  renderGallery();
  renderVideos();
  updateUploadVisibility();
});
