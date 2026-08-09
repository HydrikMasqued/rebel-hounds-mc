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
