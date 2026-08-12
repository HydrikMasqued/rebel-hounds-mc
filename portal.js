/* ===== Rebel Hounds MC — Portal (shared across all portal pages) ===== */

// Sticky navbar shadow
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });
}

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });

  // Handle dropdown toggles on mobile
  navLinks.querySelectorAll('.nav-item').forEach((item) => {
    const link = item.querySelector('a');
    if (link) {
      link.addEventListener('click', (e) => {
        if (window.innerWidth <= 900 && item.querySelector('.dropdown')) {
          e.preventDefault();
          item.classList.toggle('dropdown-open');
        }
      });
    }
  });
}

/* ===== Login gate ===== */
const cyrb53 = (str, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

const PATCH_USER = '6326359510258827';   // HFFH
const PATCH_PASS = '179402082180785';    // HoundsForever
const PATCH_KEY = 'rh_patch_auth';
const BYLAWS_URL = 'rhmc-bylaws-q8k2x7.pdf';

const patchGate = document.getElementById('patchGate');
const patchArea = document.getElementById('patchArea');
const patchForm = document.getElementById('patchForm');
const patchMsg = document.getElementById('patchMsg');
const patchUser = document.getElementById('patchUser');
const patchPass = document.getElementById('patchPass');
const patchLogout = document.getElementById('patchLogout');
const patchLogMsg = document.getElementById('patchLogMsg');
const patchLoginBg = document.getElementById('patchLoginBg');
const bylawsFrame = document.getElementById('bylawsFrame');
const bylawsOpen = document.getElementById('bylawsOpen');
const bylawsDownload = document.getElementById('bylawsDownload');

function setPatchAuth(authed) {
  if (authed) {
    try { sessionStorage.setItem(PATCH_KEY, '1'); } catch (e) {}
    if (patchGate) patchGate.classList.add('hidden');
    if (patchLoginBg) patchLoginBg.style.display = 'none';
    if (patchArea) patchArea.classList.remove('hidden');
    if (bylawsFrame) bylawsFrame.src = BYLAWS_URL;
    if (bylawsOpen) bylawsOpen.href = BYLAWS_URL;
    if (bylawsDownload) bylawsDownload.href = BYLAWS_URL;
  } else {
    try { sessionStorage.removeItem(PATCH_KEY); } catch (e) {}
    if (patchGate) patchGate.classList.remove('hidden');
    if (patchLoginBg) patchLoginBg.style.display = '';
    if (patchArea) patchArea.classList.add('hidden');
    if (bylawsFrame) bylawsFrame.src = '';
    if (bylawsOpen) bylawsOpen.href = '#';
    if (bylawsDownload) bylawsDownload.href = '#';
  }
}

function clearPatchMsg() {
  if (patchMsg) patchMsg.textContent = '';
}

if (patchForm) {
  patchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = patchUser.value.trim();
    const p = patchPass.value;
    if (cyrb53(u) === Number(PATCH_USER) && cyrb53(p) === Number(PATCH_PASS)) {
      setPatchAuth(true);
      patchForm.reset();
      if (patchArea) patchArea.scrollIntoView({ behavior: 'smooth' });
    } else {
      patchMsg.textContent = 'Invalid credentials. Contact club leadership.';
    }
  });

  patchPass.addEventListener('input', clearPatchMsg);
  patchUser.addEventListener('input', clearPatchMsg);
}

if (patchLogout) {
  patchLogout.addEventListener('click', () => {
    setPatchAuth(false);
    if (patchLogMsg) patchLogMsg.textContent = 'Logged out. Ride safe.';
    if (patchLoginBg) {
      patchLoginBg.scrollIntoView({ behavior: 'smooth' });
    } else if (patchGate) {
      patchGate.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

let patchAuthed = false;
try { patchAuthed = sessionStorage.getItem(PATCH_KEY) === '1'; } catch (e) {}
setPatchAuth(patchAuthed);
