/* ===== Rebel Hounds MC  Media (Gallery + Videos) — shared uploads ===== */

const GALLERY_JSON = 'gallery.json';
const UPLOAD_PHP = 'upload-media.php';
const LS_GALLERY = 'rh_gallery';
const LS_VIDEOS = 'rh_videos';

async function fetchSharedGallery() {
  try {
    const r = await fetch(GALLERY_JSON + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('no json');
    const data = await r.json();
    if (Array.isArray(data)) return data;
  } catch (e) {}
  try { return JSON.parse(localStorage.getItem(LS_GALLERY)) || getDefaultGallery(); } catch(e){ return getDefaultGallery(); }
}
function getDefaultGallery() {
  return [{ url: 'rebel-hounds-patch.png', caption: 'Rebel Hounds MC  Club Patch', type: 'image', addedBy: 'Club' }];
}
function getVideos() {
  try { return JSON.parse(localStorage.getItem(LS_VIDEOS)) || []; } catch(e){ return []; }
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
async function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  const empty = document.getElementById('galleryEmpty');
  if (!grid) return;
  let items=[];
  try { items = await fetchSharedGallery(); } catch(e){ items=getDefaultGallery(); }
  // merge local fallback for recent uploads if server not yet updated
  try {
    const local = JSON.parse(localStorage.getItem(LS_GALLERY)||'[]');
    if (Array.isArray(local) && local.length) {
      const urls=new Set(items.map(i=>i.url));
      local.forEach(l=>{ if(!urls.has(l.url)) items.push(l); });
    }
  } catch(e){}
  if (items.length === 0) { if (empty) empty.style.display='block'; grid.innerHTML=''; return; }
  if (empty) empty.style.display='none';
  grid.innerHTML = items.map((item, i) => {
    const isVid = isVideoUrl(item.url, item.type);
    const media = isVid
      ? `<video src="${escapeHtml(item.url)}" muted loop playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.6);color:#fff;border-radius:50%;width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:18px;">\u25B6</span>`
      : `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.caption||'Club photo')}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`;
    return `<div class="gallery-item" data-index="${i}" data-url="${escapeHtml(item.url)}" data-type="${isVid?'video':'image'}" style="position:relative;overflow:hidden;cursor:pointer;">
      ${media}
      ${item.caption ? `<div class="gallery-item-overlay"><p>${escapeHtml(item.caption)}</p></div>` : ''}
    </div>`;
  }).join('');
  grid.querySelectorAll('.gallery-item').forEach(el => {
    el.addEventListener('click', () => {
      const url = el.getAttribute('data-url');
      const type = el.getAttribute('data-type');
      if (type === 'video') openLightboxVideo(url);
      else openLightbox(url);
    });
  });
}
function renderVideos() {
  const grid = document.getElementById('videoGrid');
  const empty = document.getElementById('videoEmpty');
  if (!grid) return;
  const items = getVideos();
  if (items.length === 0) { if (empty) empty.style.display='block'; return; }
  if (empty) empty.style.display='none';
  grid.innerHTML = items.map(item => `
    <div class="video-card">
      <iframe src="${escapeHtml(item.embedUrl)}" title="${escapeHtml(item.title||'Video')}" allowfullscreen loading="lazy"></iframe>
      <div class="video-card-info"><h4>${escapeHtml(item.title||'Untitled')}</h4>${item.description?`<p>${escapeHtml(item.description)}</p>`:''}</div>
    </div>
  `).join('');
}
function openLightbox(url) {
  const lb=document.getElementById('lightbox');
  const img=document.getElementById('lightboxImg');
  if(!lb||!img) return;
  const vid=document.getElementById('lightboxVideo');
  if(vid){ vid.pause(); vid.style.display='none'; }
  img.style.display='block';
  img.src=url;
  lb.classList.add('open');
  document.body.style.overflow='hidden';
}
function openLightboxVideo(url) {
  let lb=document.getElementById('lightbox');
  let vid=document.getElementById('lightboxVideo');
  let img=document.getElementById('lightboxImg');
  if(!lb) return;
  if(!vid){
    vid=document.createElement('video');
    vid.id='lightboxVideo';
    vid.controls=true; vid.autoplay=true;
    vid.style.maxWidth='90vw'; vid.style.maxHeight='85vh'; vid.style.borderRadius='8px';
    lb.appendChild(vid);
  }
  if(img) img.style.display='none';
  vid.style.display='block';
  vid.src=url;
  lb.classList.add('open');
  document.body.style.overflow='hidden';
}
function closeLightbox(){
  const lb=document.getElementById('lightbox');
  const vid=document.getElementById('lightboxVideo');
  const img=document.getElementById('lightboxImg');
  if(lb) lb.classList.remove('open');
  if(vid){ vid.pause(); vid.removeAttribute('src'); }
  if(img) img.removeAttribute('src');
  document.body.style.overflow='';
}
const lightboxClose=document.getElementById('lightboxClose');
if(lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
const lightbox=document.getElementById('lightbox');
if(lightbox) lightbox.addEventListener('click', e=>{ if(e.target===lightbox) closeLightbox(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeLightbox(); });

const gallerySubmit=document.getElementById('gallerySubmit');
const galleryUrl=document.getElementById('galleryUrl');
const galleryCaption=document.getElementById('galleryCaption');
const galleryPreview=document.getElementById('galleryPreview');
const galleryPreviewImg=document.getElementById('galleryPreviewImg');
const galleryPreviewVideo=document.getElementById('galleryPreviewVideo');
const galleryMsg=document.getElementById('galleryMsg');
const galleryFile=document.getElementById('galleryFile');
let pendingFile=null;

if(galleryFile){
  galleryFile.addEventListener('change', ()=>{
    const file=galleryFile.files[0];
    if(!file) return;
    const isImg=file.type.startsWith('image/');
    const isVid=file.type.startsWith('video/');
    if(!isImg && !isVid){ galleryMsg.textContent='Please select an image or video file.'; return; }
    if(isImg && file.size>12*1024*1024){ galleryMsg.textContent='Image too large. Max 12MB.'; return; }
    if(isVid && file.size>80*1024*1024){ galleryMsg.textContent='Video too large. Max 80MB.'; return; }
    pendingFile=file;
    galleryPreview.style.display='block';
    if(isImg){
      galleryPreviewImg.style.display='block';
      galleryPreviewVideo.style.display='none';
      galleryPreviewVideo.pause();
      const r=new FileReader();
      r.onload=e=>{ galleryPreviewImg.src=e.target.result; };
      r.readAsDataURL(file);
    } else {
      galleryPreviewImg.style.display='none';
      galleryPreviewVideo.style.display='block';
      galleryPreviewVideo.src=URL.createObjectURL(file);
    }
    galleryMsg.textContent='File selected. Click "Upload to Gallery" to share.';
  });
}
if(galleryUrl){
  galleryUrl.addEventListener('input', ()=>{
    if(pendingFile) return;
    const url=galleryUrl.value.trim();
    if(!url){ galleryPreview.style.display='none'; return; }
    galleryPreview.style.display='block';
    const isVid=/\.(mp4|webm|mov|m4v|avi)(\?|$)/i.test(url);
    if(isVid){
      galleryPreviewImg.style.display='none';
      galleryPreviewVideo.style.display='block';
      galleryPreviewVideo.src=url;
    } else {
      galleryPreviewVideo.style.display='none';
      galleryPreviewVideo.pause();
      galleryPreviewImg.style.display='block';
      galleryPreviewImg.src=url;
    }
  });
}
async function uploadDirect(file, caption, url){
  const fd=new FormData();
  if(file) fd.append('file', file);
  if(caption) fd.append('caption', caption);
  if(url) fd.append('imageUrl', url);
  try{
    const res=await fetch(UPLOAD_PHP, { method:'POST', body: fd });
    const data=await res.json().catch(()=>({}));
    if(!res.ok || data.error){ return { error: data.error || ('Server error '+res.status) }; }
    return { url: data.url };
  }catch(err){
    return { error: 'Connection failed. Check internet.' };
  }
}
function saveLocalFallback(url, caption, isVid){
  try{
    const items=JSON.parse(localStorage.getItem(LS_GALLERY)||'[]');
    items.unshift({ url:url, caption:caption, type: isVid?'video':'image', addedBy:'Member' });
    localStorage.setItem(LS_GALLERY, JSON.stringify(items.slice(0,100)));
  }catch(e){}
}
if(gallerySubmit){
  gallerySubmit.addEventListener('click', async ()=>{
    const urlVal=galleryUrl.value.trim();
    const caption=galleryCaption.value.trim();
    if(!pendingFile && !urlVal){
      galleryMsg.textContent='Please select a file or enter a URL.';
      return;
    }
    galleryMsg.textContent='Uploading...';
    gallerySubmit.disabled=true;
    const result=await uploadDirect(pendingFile, caption, urlVal);
    gallerySubmit.disabled=false;
    if(result && result.url){
      galleryMsg.textContent='Uploaded! Visible to everyone.';
      galleryUrl.value='';
      galleryCaption.value='';
      galleryPreview.style.display='none';
      galleryPreviewImg.removeAttribute('src');
      galleryPreviewVideo.removeAttribute('src');
      galleryPreviewVideo.pause();
      if(galleryFile) galleryFile.value='';
      pendingFile=null;
      // also save locally for instant feedback if server gallery not yet refreshed
      saveLocalFallback(result.url, caption, false);
      await renderGallery();
      setTimeout(()=>{ galleryMsg.textContent=''; }, 3000);
    } else {
      const errMsg=(result&&result.error)||'Upload failed.';
      // Fallback for images: save locally as Data URL so user still sees it
      if(pendingFile && pendingFile.type.startsWith('image/')){
        const reader=new FileReader();
        reader.onload=e=>{
          saveLocalFallback(e.target.result, caption, false);
          galleryMsg.textContent=errMsg+' — Saved locally for you. Server may need permissions fix. Others will not see it until server works.';
          renderGallery();
          galleryUrl.value=''; galleryCaption.value=''; galleryPreview.style.display='none'; if(galleryFile) galleryFile.value=''; pendingFile=null;
        };
        reader.readAsDataURL(pendingFile);
      } else {
        galleryMsg.textContent=errMsg+' — If this persists, check file type/size or contact admin.';
      }
    }
  });
}
renderGallery();
renderVideos();
