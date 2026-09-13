/* ===== Rebel Hounds MC  Portal (shared across all portal pages) ===== */

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

/* ===== Role-based access control ===== */
const ROLE_LEVEL = { prospect: 1, patched: 2, officer: 3, owner: 4 };
const PATCH_KEY  = 'rh_patch_auth';
const ROLE_KEY   = 'rh_patch_role';
const USER_KEY   = 'rh_patch_user';
const BYLAWS_URL = 'rhmc-bylaws-q8k2x7.pdf';

const patchGate     = document.getElementById('patchGate');
const patchArea     = document.getElementById('patchArea');
const patchForm     = document.getElementById('patchForm');
const patchMsg      = document.getElementById('patchMsg');
const patchUser     = document.getElementById('patchUser');
const patchPass     = document.getElementById('patchPass');
const patchLogout   = document.getElementById('patchLogout');
const patchLogMsg   = document.getElementById('patchLogMsg');
const patchLoginBg  = document.getElementById('patchLoginBg');
const bylawsFrame   = document.getElementById('bylawsFrame');
const bylawsOpen    = document.getElementById('bylawsOpen');
const bylawsDownload = document.getElementById('bylawsDownload');

let currentRole = null;

function getRole() {
  return currentRole;
}

function hasRole(minRole) {
  if (!currentRole) return false;
  return (ROLE_LEVEL[currentRole] || 0) >= (ROLE_LEVEL[minRole] || 0);
}

function isOwner() {
  return currentRole === 'owner';
}

/* ---- Apply role-based visibility ---- */
function applyRoleVisibility() {
  // Nav items: hide those the user can't access
  document.querySelectorAll('[data-min-role]').forEach(function(el) {
    var min = el.getAttribute('data-min-role');
    el.style.display = hasRole(min) ? '' : 'none';
  });
  // Edit buttons: only officer+ can see
  document.querySelectorAll('[data-edit-role]').forEach(function(el) {
    var min = el.getAttribute('data-edit-role');
    el.style.display = hasRole(min) ? '' : 'none';
  });
}

/* ---- Auth state management ---- */
function setPatchAuth(authed, role) {
  if (authed && role) {
    try {
      sessionStorage.setItem(PATCH_KEY, '1');
      sessionStorage.setItem(ROLE_KEY, role);
    } catch (e) {}
    currentRole = role;
    if (patchGate) patchGate.classList.add('hidden');
    if (patchLoginBg) patchLoginBg.style.display = 'none';
    if (patchArea) patchArea.classList.remove('hidden');
    if (bylawsFrame) bylawsFrame.src = BYLAWS_URL;
    if (bylawsOpen) bylawsOpen.href = BYLAWS_URL;
    if (bylawsDownload) bylawsDownload.href = BYLAWS_URL;
  } else {
    try {
      sessionStorage.removeItem(PATCH_KEY);
      sessionStorage.removeItem(ROLE_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch (e) {}
    currentRole = null;
    if (patchGate) patchGate.classList.remove('hidden');
    if (patchLoginBg) patchLoginBg.style.display = '';
    if (patchArea) patchArea.classList.add('hidden');
    if (bylawsFrame) bylawsFrame.src = '';
    if (bylawsOpen) bylawsOpen.href = '#';
    if (bylawsDownload) bylawsDownload.href = '#';
  }
  applyRoleVisibility();
  // Notify other scripts (e.g. finance, bots) of auth change
  window.dispatchEvent(new CustomEvent('patchAuthChange', { detail: { authed: authed, role: currentRole } }));
}

function clearPatchMsg() {
  if (patchMsg) patchMsg.textContent = '';
}

/* ---- Login form ---- */
if (patchForm) {
  patchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var u = patchUser.value.trim();
    var p = patchPass.value;
    if (!u || !p) return;

    fetch('auth-check.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (res.ok && res.data.logged_in) {
        try { sessionStorage.setItem(USER_KEY, u); } catch (e) {}
        setPatchAuth(true, res.data.role);
        patchForm.reset();
        if (patchArea) patchArea.scrollIntoView({ behavior: 'smooth' });
      } else {
        patchMsg.textContent = 'Invalid credentials. Contact club leadership.';
      }
    })
    .catch(function() {
      patchMsg.textContent = 'Connection error. Try again.';
    });
  });

  patchPass.addEventListener('input', clearPatchMsg);
  patchUser.addEventListener('input', clearPatchMsg);
}

/* ---- Logout ---- */
if (patchLogout) {
  patchLogout.addEventListener('click', function() {
    // Also clear server session
    fetch('auth-check.php', { method: 'GET', cache: 'no-store' }).catch(function() {});
    setPatchAuth(false);
    if (patchLogMsg) patchLogMsg.textContent = 'Logged out. Ride safe.';
    if (patchLoginBg) {
      patchLoginBg.scrollIntoView({ behavior: 'smooth' });
    } else if (patchGate) {
      patchGate.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

/* ---- Restore session on page load ---- */
(function restoreSession() {
  var authed = false;
  var role = null;
  try {
    authed = sessionStorage.getItem(PATCH_KEY) === '1';
    role = sessionStorage.getItem(ROLE_KEY);
  } catch (e) {}

  if (authed && role) {
    // Quick restore from cache, then verify with server in background
    currentRole = role;
    setPatchAuth(true, role);
    // Verify session is still valid
    fetch('auth-check.php', { cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (!d.logged_in) {
          setPatchAuth(false);
        } else if (d.role !== role) {
          // Role changed, update
          setPatchAuth(true, d.role);
        }
      })
      .catch(function() { /* keep cached session on network error */ });
  } else {
    setPatchAuth(false);
  }
})();
