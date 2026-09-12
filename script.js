/* ===== Rebel Hounds MC  Scripts ===== */

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

// Animated hero counters
const counters = document.querySelectorAll('.stat-num');

function animateCounter(el) {
  if (!el.dataset.count) return;
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

if (hero) {
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
}

// Recruitment form handler
const recruitForm = document.getElementById('recruitForm');
const formMsg = document.getElementById('formMsg');

if (recruitForm) {
  recruitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (formMsg) formMsg.textContent = 'Application received. A club officer will reach out on Discord within 48 hours. Ride safe.';
    recruitForm.reset();
  });
}

/* ===== Hero background video (direct embed, no API dependency) =====
   Change YT_ID to swap the hero background video.
   Uses the privacy-enhanced host plus a plain iframe so there is no
   external API script or global callback that can fail silently.
   If YouTube is blocked entirely, the banner fallback stays visible.
*/
(function() {
  var YT_ID = 'I5lX2OmPJtI';
  var heroVideo = document.getElementById('heroVideo');
  if (!heroVideo) return;
  var revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    heroVideo.classList.add('video-on');
  }
  try {
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + YT_ID +
      '?autoplay=1&mute=1&controls=0&loop=1&playlist=' + YT_ID +
      '&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('title', 'Rebel Hounds MC video');
    iframe.addEventListener('load', function() { setTimeout(reveal, 2500); });
    heroVideo.appendChild(iframe);
    setTimeout(reveal, 9000);
  } catch (err) {
    heroVideo.classList.add('hidden');
  }
})();

/* ===== Animation layer: scroll reveals, hero parallax, ticker ===== */
(function() {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var heroContent = document.getElementById('heroContent');
  var ticking = false;
  function onScrollAnim() {
    var y = window.scrollY || 0;
    document.body.classList.toggle('scrolled-past', y > window.innerHeight * 0.55);
    if (heroContent && !reduceMotion && y < window.innerHeight) {
      heroContent.style.transform = 'translateY(' + (y * 0.22) + 'px)';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function() {
    if (!ticking) { window.requestAnimationFrame(onScrollAnim); ticking = true; }
  }, { passive: true });

  var revealEls = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function(el) { io.observe(el); });
  } else {
    revealEls.forEach(function(el) { el.classList.add('in'); });
  }

})();

/* ===== Editable ticker (homepage strip, owner unlock) ===== */
(function() {
  var track = document.getElementById('tickerTrack');
  if (!track) return;
  var tickerEl = track.closest ? track.closest('.ticker') : null;
  var LS_KEY = 'rhmc_ticker';
  var OWNER_KEY = 'rhmc_ticker_owner';
  var SEP_DEFAULT = '\u2022';
  var DEFAULT_ITEMS = ['LOYALTY', 'RESPECT', 'BROTHERHOOD', 'DISCIPLINE', 'REBEL HOUNDS MC'];
  var PASS_HASH = 179402082180785;
  var state = { sep: SEP_DEFAULT, items: DEFAULT_ITEMS.slice() };
  var working = null;
  var editing = false;
  var fab = null;

  function cyrb53(str, seed) {
    seed = seed || 0;
    var h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed, ch, i;
    for (i = 0; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = String(s == null ? '' : s);
    return d.innerHTML;
  }

  function readData(raw) {
    try {
      var data = JSON.parse(raw);
      if (data && Array.isArray(data.items) && data.items.length) {
        var clean = data.items.map(function(w) { return String(w).slice(0, 40); }).filter(function(w) { return !!w; });
        if (!clean.length) return null;
        var sep = data.sep ? String(data.sep).slice(0, 4) : SEP_DEFAULT;
        return {
          sep: sep || SEP_DEFAULT,
          items: clean,
          updated: (typeof data.updated === 'number' && data.updated > 0) ? data.updated : 0
        };
      }
    } catch (e) {}
    return null;
  }

  function loadState() {
    renderView();
    var local = null;
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) local = readData(raw);
    } catch (e) {}
    function useLocal() {
      if (local) { state = local; renderView(); }
    }
    if (!window.fetch) { useLocal(); return; }
    fetch('api-ticker.php?t=' + Date.now()).then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function(data) {
      var server = readData(JSON.stringify(data));
      if (!server) { useLocal(); return; }
      if (local && local.updated > server.updated) {
        state = local;
      } else {
        state = server;
        try { localStorage.removeItem(LS_KEY); } catch (e) {}
      }
      renderView();
    }).catch(useLocal);
  }

  function saveToServer(cb) {
    var payload;
    try {
      payload = JSON.stringify({ sep: state.sep, items: state.items, updated: state.updated || 0 });
    } catch (e) { cb(false, 'encoding error'); return; }
    if (!window.fetch) { cb(false, 'no fetch support'); return; }
    fetch('api-ticker.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    }).then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function(data) {
      if (data && data.success) cb(true);
      else cb(false, (data && data.error) || 'server rejected');
    }).catch(function(err) {
      cb(false, (err && err.message) || 'connection failed');
    });
  }

  function setStatus(msg, isErr) {
    var el = document.getElementById('tickerStatus');
    if (el) {
      el.textContent = msg;
      el.style.color = isErr ? 'var(--primary)' : 'var(--muted)';
    }
  }

  function renderView() {
    track.innerHTML = state.items.map(function(w) {
      return '<span>' + esc(w) + ' <b>' + esc(state.sep) + '</b></span>';
    }).join('');
    track.innerHTML += track.innerHTML;
  }

  function isOwner() {
    try { return sessionStorage.getItem(OWNER_KEY) === '1'; } catch (e) { return false; }
  }

  function ensureFab() {
    if (fab || !isOwner()) return;
    fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'ticker-edit-fab';
    fab.textContent = 'Edit ticker';
    fab.addEventListener('click', enterEdit);
    document.body.appendChild(fab);
  }

  function enterEdit() {
    if (editing) return;
    editing = true;
    working = { sep: state.sep, items: state.items.slice() };
    if (tickerEl) {
      tickerEl.classList.add('editing');
      tickerEl.removeAttribute('aria-hidden');
    }
    renderEdit();
    if (fab) fab.style.display = 'none';
  }

  function exitEdit() {
    editing = false;
    working = null;
    if (tickerEl) {
      tickerEl.classList.remove('editing');
      tickerEl.setAttribute('aria-hidden', 'true');
    }
    var bar = document.getElementById('tickerEditBar');
    if (bar) bar.style.display = 'none';
    renderView();
    if (fab) fab.style.display = '';
  }

  function syncWorkingFromInputs() {
    if (!working) return;
    var sepEl = document.getElementById('tickerSep');
    if (sepEl) working.sep = sepEl.value;
    var vals = [];
    track.querySelectorAll('input[data-widx]').forEach(function(inp) { vals.push(inp.value); });
    if (vals.length && vals.length === working.items.length) working.items = vals;
  }

  function renderEdit() {
    track.innerHTML = working.items.map(function(w, i) {
      return '<span class="ticker-word-edit"><input type="text" value="' + esc(w) + '" data-widx="' + i + '" maxlength="40"><button type="button" data-rm="' + i + '" title="Remove">&times;</button></span>';
    }).join('');
    var bar = document.getElementById('tickerEditBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'tickerEditBar';
      bar.className = 'ticker-editbar';
      tickerEl.parentNode.insertBefore(bar, tickerEl);
    }
    bar.style.display = 'flex';
    bar.innerHTML =
      '<strong>Editing ticker</strong>' +
      '<label>Separator <input type="text" id="tickerSep" class="tsep" value="' + esc(working.sep) + '" maxlength="4"></label>' +
      '<button type="button" class="btn btn-outline btn-sm" id="tickerAdd">Add word</button>' +
      '<button type="button" class="btn btn-primary btn-sm" id="tickerSave">Save</button>' +
      '<button type="button" class="btn btn-outline btn-sm" id="tickerReset">Reset</button>' +
      '<button type="button" class="btn btn-outline btn-sm" id="tickerCancel">Cancel</button>' +
      '<span id="tickerStatus" class="ticker-status"></span>';
    document.getElementById('tickerAdd').addEventListener('click', function() {
      syncWorkingFromInputs();
      working.items.push('NEW WORD');
      renderEdit();
      var inputs = track.querySelectorAll('input[data-widx]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    });
    document.getElementById('tickerSave').addEventListener('click', function() {
      syncWorkingFromInputs();
      var words = working.items.map(function(w) { return w.trim(); }).filter(function(w) { return !!w; });
      if (!words.length) { alert('Add at least one word.'); return; }
      working.items = words;
      if (!working.sep.trim()) working.sep = SEP_DEFAULT;
      state = { sep: working.sep, items: working.items.slice(), updated: Date.now() };
      setStatus('Saving to server...');
      saveToServer(function(ok, msg) {
        if (ok) {
          try { localStorage.removeItem(LS_KEY); } catch (e) {}
          exitEdit();
        } else {
          try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
          setStatus('Server save failed (' + msg + ') - kept in this browser only.', true);
        }
      });
    });
    document.getElementById('tickerReset').addEventListener('click', function() {
      state = { sep: SEP_DEFAULT, items: DEFAULT_ITEMS.slice(), updated: Date.now() };
      setStatus('Resetting on server...');
      saveToServer(function(ok, msg) {
        try { localStorage.removeItem(LS_KEY); } catch (e) {}
        if (!ok) alert('Server reset failed (' + msg + ') - cleared locally only.');
        exitEdit();
      });
    });
    document.getElementById('tickerCancel').addEventListener('click', exitEdit);
  }

  track.addEventListener('click', function(e) {
    if (editing) {
      var rm = e.target.getAttribute ? e.target.getAttribute('data-rm') : null;
      if (rm !== null && rm !== undefined && rm !== '') {
        syncWorkingFromInputs();
        working.items.splice(parseInt(rm, 10), 1);
        renderEdit();
      }
      return;
    }
    if (isOwner()) return;
    clickCount++;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(function() { clickCount = 0; }, 1200);
    if (clickCount >= 5) {
      clickCount = 0;
      var pw = null;
      try { pw = window.prompt('Owner password to edit ticker:'); } catch (err) {}
      if (pw === null || pw === '') return;
      if (cyrb53(pw) === PASS_HASH) {
        try { sessionStorage.setItem(OWNER_KEY, '1'); } catch (err) {}
        ensureFab();
        enterEdit();
      } else {
        alert('Wrong password.');
      }
    }
  });

  var clickCount = 0;
  var clickTimer = null;

  loadState();
  renderView();
  ensureFab();
})();
