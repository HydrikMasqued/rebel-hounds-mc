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
        '<span class="rhmc-login-icon" id="rhmcLoginIcon"><img src="rebel-hounds-patch.png" alt="Member login" onerror="this.remove()"></span>' +
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
      '.rhmc-login-circle{position:relative;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#e0533d,#a93226);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 18px rgba(192,57,43,.45),inset 0 1px 0 rgba(255,255,255,.25);transition:transform .25s ease,box-shadow .25s ease;font-size:24px;user-select:none;border:1px solid rgba(255,255,255,.22);}' +
      '.rhmc-login-circle::before{content:\'\';position:absolute;inset:-4px;border-radius:50%;border:1px solid rgba(224,83,61,.55);animation:rhmcPulse 2.2s ease-out infinite;pointer-events:none;}' +
      '@keyframes rhmcPulse{0%{transform:scale(.88);opacity:1;}100%{transform:scale(1.28);opacity:0;}}' +
      '.rhmc-login-circle:hover{transform:scale(1.1) rotate(4deg);box-shadow:0 6px 26px rgba(192,57,43,.65),inset 0 1px 0 rgba(255,255,255,.25);}' +
      '.rhmc-login-circle.logged-in{background:linear-gradient(135deg,#2e7d32,#1b5e20);box-shadow:0 4px 18px rgba(46,125,50,.45),inset 0 1px 0 rgba(255,255,255,.25);}' +
      '.rhmc-login-circle.logged-in::before{display:none;}' +
      '.rhmc-login-badge{font-size:20px;font-weight:700;line-height:1;text-shadow:0 1px 3px rgba(0,0,0,.4);}' +
      '.rhmc-login-icon{display:block;width:100%;height:100%;background:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23ffffff\' fill-opacity=\'.9\'%3E%3Cellipse cx=\'12\' cy=\'15.5\' rx=\'4.4\' ry=\'3.5\'/%3E%3Ccircle cx=\'5.4\' cy=\'10.2\' r=\'1.9\'/%3E%3Ccircle cx=\'9.6\' cy=\'7.1\' r=\'1.9\'/%3E%3Ccircle cx=\'14.4\' cy=\'7.1\' r=\'1.9\'/%3E%3Ccircle cx=\'18.6\' cy=\'10.2\' r=\'1.9\'/%3E%3C/svg%3E") no-repeat center/58%;}' +
      '.rhmc-login-icon img{display:block;width:100%;height:100%;object-fit:cover;border-radius:50%;}' +
      '.rhmc-login-panel{position:absolute;bottom:66px;right:0;width:300px;background:linear-gradient(180deg,#171717,#0c0c0c);border:1px solid rgba(224,83,61,.28);border-top:2px solid var(--primary,#dc3545);border-radius:14px;box-shadow:0 14px 44px rgba(0,0,0,.7),0 0 26px rgba(192,57,43,.14);padding:0;overflow:hidden;display:none;animation:rhmcSlideUp .25s ease;}' +
      '.rhmc-login-panel.open{display:block;}' +
      '@keyframes rhmcSlideUp{from{opacity:0;transform:translateY(14px) scale(.98);}to{opacity:1;transform:translateY(0) scale(1);}}' +
      '.rhmc-login-panel-header{display:flex;justify-content:space-between;align-items:center;padding:.9rem 1.1rem;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);}' +
      '.rhmc-login-panel-title{font-family:var(--font-display,Bebas Neue,sans-serif);font-size:1.02rem;letter-spacing:3px;color:#fff;border-left:3px solid var(--primary,#dc3545);padding-left:.6rem;}' +
      '.rhmc-login-panel-close{background:rgba(255,255,255,.06);border:none;color:var(--muted,#888);font-size:15px;cursor:pointer;width:26px;height:26px;border-radius:50%;line-height:1;transition:all .25s ease;}' +
      '.rhmc-login-panel-close:hover{color:#fff;background:var(--primary,#dc3545);transform:rotate(90deg);}' +
      '#rhmcLoginFormWrap,#rhmcLoggedInWrap{padding:1.1rem 1.1rem 1.2rem;}' +
      '#rhmcLoginUser,#rhmcLoginPass{width:100%;padding:.65rem .9rem .65rem 2.3rem;background-color:rgba(255,255,255,.045);background-repeat:no-repeat;background-position:.8rem center;background-size:1rem;border:1px solid rgba(255,255,255,.1);border-radius:9px;color:var(--text,#eee);font-size:.85rem;margin-bottom:.65rem;box-sizing:border-box;outline:none;transition:border-color .2s,box-shadow .2s,background-color .2s;}' +
      '#rhmcLoginUser{background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23999\' stroke-width=\'2\' stroke-linecap=\'round\'%3E%3Ccircle cx=\'12\' cy=\'8\' r=\'4\'/%3E%3Cpath d=\'M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5\'/%3E%3C/svg%3E");}' +
      '#rhmcLoginPass{background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23999\' stroke-width=\'2\' stroke-linecap=\'round\'%3E%3Crect x=\'4\' y=\'10\' width=\'16\' height=\'11\' rx=\'2\'/%3E%3Cpath d=\'M8 10V7a4 4 0 0 1 8 0v3\'/%3E%3C/svg%3E");}' +
      '#rhmcLoginUser:focus,#rhmcLoginPass:focus{border-color:var(--primary,#dc3545);box-shadow:0 0 0 3px rgba(220,53,69,.18);background-color:rgba(255,255,255,.07);}' +
      '.rhmc-login-msg{font-size:.75rem;color:var(--muted,#888);min-height:1em;margin:.3rem 0;}' +
      '.rhmc-login-msg.error{color:#dc3545;}' +
      '.rhmc-login-msg.success{color:#4caf50;}' +
      '.rhmc-login-btn{width:100%;padding:.72rem;background:linear-gradient(135deg,#e0533d,#a93226);color:#fff;border:none;border-radius:9px;font-weight:700;font-size:.85rem;cursor:pointer;transition:transform .15s ease,box-shadow .2s ease,filter .2s ease;text-transform:uppercase;letter-spacing:2px;box-shadow:0 4px 14px rgba(192,57,43,.35);}' +
      '.rhmc-login-btn:hover{filter:brightness(1.12);box-shadow:0 6px 22px rgba(192,57,43,.55);transform:translateY(-1px);}' +
      '.rhmc-login-btn:active{transform:translateY(0);}' +
      '.rhmc-login-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}' +
      '.rhmc-logout-btn{background:transparent;border:1px solid var(--border,#333);margin-top:.5rem;box-shadow:none;}' +
      '.rhmc-logout-btn:hover{border-color:#dc3545;color:#dc3545;background:transparent;transform:none;box-shadow:none;filter:none;}' +
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

  // On page load, verify PHP session if no sessionStorage
  if (!_role) {
    fetch('auth-check.php?t=' + Date.now(), { credentials: 'same-origin', cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.logged_in && d.role) {
          setAuth(d.role, d.username || '');
        }
      })
      .catch(function() {});
  }

  // Sync with portal.js if it's loaded (listen for auth changes from portal login form)
  window.addEventListener('patchAuthChange', function(e) {
    if (e.detail) {
      _role = e.detail.role || null;
      updateUI();
    }
  });
})();
