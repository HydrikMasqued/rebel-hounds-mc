/* ===== Rebel Hounds MC — Persistent Login Widget ===== */
/* Adds a floating login circle button to every page.
   When logged out: click to expand login form.
   When logged in: shows role badge, click to logout.
   Also exposes window.rhmcAuth for other scripts. */

(function() {
  var ROLE_LEVEL = { prospect: 1, patched: 2, officer: 3, owner: 4 };

  // State
  var _role = null;
  var _user = '';
  var _checked = false;

  // Check sessionStorage first (set by portal.js)
  try {
    var ssRole = sessionStorage.getItem('rh_patch_role') || '';
    var ssUser = sessionStorage.getItem('rh_patch_user') || '';
    if (ssRole) { _role = ssRole; _user = ssUser; }
  } catch(e) {}

  // Public API for other scripts
  window.rhmcAuth = {
    isLoggedIn: function() { return _role !== null; },
    getRole: function() { return _role; },
    isOfficer: function() { return _role === 'officer' || _role === 'owner'; },
    canEdit: function() { return _role === 'officer' || _role === 'owner'; },
    getRoleLevel: function() { return ROLE_LEVEL[_role] || 0; }
  };

  // Create widget DOM
  function createWidget() {
    // Don't add if already present
    if (document.getElementById('rhmc-login-widget')) return;

    var widget = document.createElement('div');
    widget.id = 'rhmc-login-widget';
    widget.innerHTML = '' +
      '<div class="rhmc-login-circle" id="rhmcLoginCircle">' +
        '<span class="rhmc-login-icon" id="rhmcLoginIcon">&#9786;</span>' +
        '<span class="rhmc-login-badge" id="rhmcLoginBadge" style="display:none;"></span>' +
      '</div>' +
      '<div class="rhmc-login-panel" id="rhmcLoginPanel">' +
        '<div class="rhmc-login-panel-header">' +
          '<span class="rhmc-login-panel-title" id="rhmcPanelTitle">MEMBER LOGIN</span>' +
          '<button class="rhmc-login-panel-close" id="rhmcPanelClose">&times;</button>' +
        '</div>' +
        '<div id="rhmcLoginFormWrap">' +
          '<input type="text" id="rhmcLoginUser" placeholder="Username" autocomplete="username">' +
          '<input type="password" id="rhmcLoginPass" placeholder="Password" autocomplete="current-password">' +
          '<p class="rhmc-login-msg" id="rhmcLoginMsg"></p>' +
          '<button class="rhmc-login-btn" id="rhmcLoginBtn">LOGIN</button>' +
        '</div>' +
        '<div id="rhmcLoggedInWrap" style="display:none;">' +
          '<p class="rhmc-login-welcome" id="rhmcWelcome"></p>' +
          '<button class="rhmc-login-btn rhmc-logout-btn" id="rhmcLogoutBtn">LOGOUT</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(widget);

    // Style
    var style = document.createElement('style');
    style.textContent = '' +
      '#rhmc-login-widget{position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;font-family:var(--font-body,-apple-system,sans-serif);}' +
      '.rhmc-login-circle{width:48px;height:48px;border-radius:50%;background:var(--primary,#dc3545);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4);transition:all .25s ease;font-size:22px;user-select:none;border:2px solid rgba(255,255,255,.15);}' +
      '.rhmc-login-circle:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(0,0,0,.5);}' +
      '.rhmc-login-circle.logged-in{background:#1b5e20;border-color:rgba(76,175,80,.4);}' +
      '.rhmc-login-badge{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;line-height:1;}' +
      '.rhmc-login-panel{position:absolute;bottom:60px;right:0;width:280px;background:var(--dark-1,#111);border:1px solid var(--border,#333);border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.6);padding:0;overflow:hidden;display:none;animation:rhmcSlideUp .2s ease;}' +
      '.rhmc-login-panel.open{display:block;}' +
      '@keyframes rhmcSlideUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}' +
      '.rhmc-login-panel-header{display:flex;justify-content:space-between;align-items:center;padding:.7rem 1rem;border-bottom:1px solid var(--border,#333);}' +
      '.rhmc-login-panel-title{font-family:var(--font-display,Bebas Neue,sans-serif);font-size:.85rem;letter-spacing:1.5px;color:var(--muted,#888);}' +
      '.rhmc-login-panel-close{background:none;border:none;color:var(--muted,#888);font-size:18px;cursor:pointer;padding:0;line-height:1;}' +
      '.rhmc-login-panel-close:hover{color:#fff;}' +
      '#rhmcLoginUser,#rhmcLoginPass{width:100%;padding:.55rem .8rem;background:var(--dark-2,#1a1a1a);border:1px solid var(--border,#333);border-radius:5px;color:var(--text,#eee);font-size:.82rem;margin-bottom:.5rem;box-sizing:border-box;outline:none;transition:border-color .2s;}' +
      '#rhmcLoginUser:focus,#rhmcLoginPass:focus{border-color:var(--primary,#dc3545);}' +
      '#rhmcLoginUser{margin-top:.8rem;}' +
      '.rhmc-login-msg{font-size:.75rem;color:var(--muted,#888);min-height:1em;margin:.3rem 0;}' +
      '.rhmc-login-msg.error{color:#dc3545;}' +
      '.rhmc-login-msg.success{color:#4caf50;}' +
      '.rhmc-login-btn{width:100%;padding:.55rem;background:var(--primary,#dc3545);color:#fff;border:none;border-radius:5px;font-weight:600;font-size:.82rem;cursor:pointer;transition:background .2s;text-transform:uppercase;letter-spacing:1px;}' +
      '.rhmc-login-btn:hover{background:#c82333;}' +
      '.rhmc-login-btn:disabled{opacity:.5;cursor:not-allowed;}' +
      '.rhmc-logout-btn{background:transparent;border:1px solid var(--border,#333);margin-top:.5rem;}' +
      '.rhmc-logout-btn:hover{border-color:#dc3545;color:#dc3545;background:transparent;}' +
      '.rhmc-login-welcome{color:var(--text,#eee);font-size:.82rem;text-align:center;padding:.3rem 0 .6rem;}' +
      '.rhmc-login-welcome strong{color:var(--primary,#dc3545);text-transform:capitalize;}';
    document.head.appendChild(style);
  }

  function updateUI() {
    var circle = document.getElementById('rhmcLoginCircle');
    var badge = document.getElementById('rhmcLoginBadge');
    var icon = document.getElementById('rhmcLoginIcon');
    var formWrap = document.getElementById('rhmcLoginFormWrap');
    var loggedWrap = document.getElementById('rhmcLoggedInWrap');
    var title = document.getElementById('rhmcPanelTitle');
    var welcome = document.getElementById('rhmcWelcome');
    if (!circle) return;

    if (_role) {
      circle.classList.add('logged-in');
      if (icon) icon.style.display = 'none';
      if (badge) { badge.style.display = ''; badge.textContent = _role.charAt(0).toUpperCase(); }
      if (formWrap) formWrap.style.display = 'none';
      if (loggedWrap) loggedWrap.style.display = '';
      if (title) title.textContent = 'LOGGED IN';
      if (welcome) welcome.innerHTML = 'Welcome <strong>' + (_user || _role) + '</strong><br><small style="color:var(--muted);">Role: ' + _role.charAt(0).toUpperCase() + _role.slice(1) + '</small>';
    } else {
      circle.classList.remove('logged-in');
      if (icon) icon.style.display = '';
      if (badge) badge.style.display = 'none';
      if (formWrap) formWrap.style.display = '';
      if (loggedWrap) loggedWrap.style.display = 'none';
      if (title) title.textContent = 'MEMBER LOGIN';
    }
  }

  function setAuth(role, user) {
    _role = role || null;
    _user = user || '';
    if (_role) {
      try {
        sessionStorage.setItem('rh_patch_auth', '1');
        sessionStorage.setItem('rh_patch_role', _role);
        sessionStorage.setItem('rh_patch_user', _user);
      } catch(e) {}
    } else {
      try {
        sessionStorage.removeItem('rh_patch_auth');
        sessionStorage.removeItem('rh_patch_role');
        sessionStorage.removeItem('rh_patch_user');
      } catch(e) {}
    }
    updateUI();
    // Notify portal.js and other scripts
    window.dispatchEvent(new CustomEvent('patchAuthChange', { detail: { authed: !!_role, role: _role } }));
  }

  function bindEvents() {
    var circle = document.getElementById('rhmcLoginCircle');
    var panel = document.getElementById('rhmcLoginPanel');
    var close = document.getElementById('rhmcPanelClose');
    var btn = document.getElementById('rhmcLoginBtn');
    var logoutBtn = document.getElementById('rhmcLogoutBtn');
    var msg = document.getElementById('rhmcLoginMsg');
    var userInput = document.getElementById('rhmcLoginUser');
    var passInput = document.getElementById('rhmcLoginPass');

    if (circle) {
      circle.addEventListener('click', function() {
        panel.classList.toggle('open');
        if (panel.classList.contains('open') && !_role) {
          userInput.focus();
        }
      });
    }
    if (close) {
      close.addEventListener('click', function() { panel.classList.remove('open'); });
    }
    // Close on outside click
    document.addEventListener('click', function(e) {
      if (panel && panel.classList.contains('open') && !panel.contains(e.target) && !circle.contains(e.target)) {
        panel.classList.remove('open');
      }
    });

    if (btn) {
      btn.addEventListener('click', function() {
        var u = userInput.value.trim();
        var p = passInput.value;
        if (!u || !p) { msg.textContent = 'Enter username and password.'; msg.className = 'rhmc-login-msg error'; return; }
        btn.disabled = true;
        msg.textContent = 'Logging in...';
        msg.className = 'rhmc-login-msg';
        fetch('auth-check.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ username: u, password: p })
        })
        .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
        .then(function(res) {
          btn.disabled = false;
          if (res.ok && res.data.logged_in) {
            setAuth(res.data.role, u);
            msg.textContent = 'Logged in!';
            msg.className = 'rhmc-login-msg success';
            userInput.value = '';
            passInput.value = '';
            setTimeout(function() { panel.classList.remove('open'); }, 800);
          } else {
            msg.textContent = 'Invalid credentials.';
            msg.className = 'rhmc-login-msg error';
          }
        })
        .catch(function() {
          btn.disabled = false;
          msg.textContent = 'Connection error.';
          msg.className = 'rhmc-login-msg error';
        });
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        setAuth(null);
        // Clear server session too
        fetch('auth-check.php', { method: 'GET', cache: 'no-store', credentials: 'same-origin' }).catch(function(){});
        panel.classList.remove('open');
      });
    }

    // Enter key on password
    if (passInput) {
      passInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && btn) btn.click();
      });
    }
  }

  // Init
  createWidget();
  bindEvents();
  updateUI();

  // Sync with portal.js if it's loaded (listen for auth changes from portal login form)
  window.addEventListener('patchAuthChange', function(e) {
    if (e.detail) {
      _role = e.detail.role || null;
      updateUI();
    }
  });
})();
