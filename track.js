/* ===== Rebel Hounds MC — Page view tracker ===== */
(function() {
  try {
    var TRACK_KEY = 'rhmc_track_sid';
    var sid = sessionStorage.getItem(TRACK_KEY);
    if (!sid) { sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); sessionStorage.setItem(TRACK_KEY, sid); }
    var role = sessionStorage.getItem('rh_patch_role') || '';
    var user = sessionStorage.getItem('rh_patch_user') || '';
    var page = location.pathname.replace(/^\//, '') || 'index';
    fetch('api-visitors.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ page: page, session_id: sid, username: user, role: role })
    }).catch(function() {});
  } catch(e) {}
})();
