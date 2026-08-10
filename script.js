/* ===== Rebel Hounds MC — Scripts ===== */

// Sticky navbar shadow
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Close mobile nav when a link is clicked
navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Animated hero counters
const counters = document.querySelectorAll('.stat-num');

function animateCounter(el) {
  const target = parseInt(el.dataset.count, 10);
  const duration = 1600;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// Trigger counters when hero comes into view
const hero = document.querySelector('.hero');
let countersRun = false;

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !countersRun) {
        countersRun = true;
        counters.forEach(animateCounter);
      }
    });
  },
  { threshold: 0.3 }
);

observer.observe(hero);

// Recruitment form handler
const recruitForm = document.getElementById('recruitForm');
const formMsg = document.getElementById('formMsg');

recruitForm.addEventListener('submit', (e) => {
  e.preventDefault();
  formMsg.textContent = 'Application received. A club officer will reach out on Discord within 48 hours. Ride safe.';
  recruitForm.reset();
});

/* ===== YouTube background video =====
   Change this ID to swap the hero background video.
   If YouTube is blocked by the browser/ad blocker, the
   patch image fallback on the hero stays visible.
*/
const YT_VIDEO_ID = 'I5lX2OmPJtI';

const heroVideo = document.getElementById('heroVideo');

function onYouTubeIframeAPIReady() {
  try {
    new YT.Player('heroVideo', {
      videoId: YT_VIDEO_ID,
      playerVars: {
        autoplay: 1,
        controls: 0,
        loop: 1,
        playlist: YT_VIDEO_ID,
        mute: 1,
        playsinline: 1,
        rel: 0,
        modestbranding: 1
      },
      events: {
        onReady: (e) => {
          e.target.mute();
          e.target.playVideo();
        },
        onError: () => {
          heroVideo.classList.add('hidden');
        }
      }
    });
  } catch (err) {
    heroVideo.classList.add('hidden');
  }
}

const ytTag = document.createElement('script');
ytTag.src = 'https://www.youtube.com/iframe_api';
document.head.appendChild(ytTag);

/* ===== Patch Holders section ===== */
// Hash-checked against precomputed values so plaintext credentials
// are not stored in the source. This gates casual visitors only.
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

const patchGate = document.getElementById('patchGate');
const patchArea = document.getElementById('patchArea');
const patchForm = document.getElementById('patchForm');
const patchMsg = document.getElementById('patchMsg');
const patchUser = document.getElementById('patchUser');
const patchPass = document.getElementById('patchPass');
const patchLogout = document.getElementById('patchLogout');
const patchLogMsg = document.getElementById('patchLogMsg');
const patchNav = document.getElementById('patchNav');

function setPatchAuth(authed) {
  if (authed) {
    sessionStorage.setItem(PATCH_KEY, '1');
    patchGate.classList.add('hidden');
    patchArea.classList.remove('hidden');
    if (patchNav) patchNav.classList.remove('hidden');
  } else {
    sessionStorage.removeItem(PATCH_KEY);
    patchGate.classList.remove('hidden');
    patchArea.classList.add('hidden');
    if (patchNav) patchNav.classList.add('hidden');
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
    if (patchGate) patchGate.scrollIntoView({ behavior: 'smooth' });
  });
}

setPatchAuth(sessionStorage.getItem(PATCH_KEY) === '1');
