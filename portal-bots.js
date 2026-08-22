/* portal-bots.js - Bot Centralisation Frontend (Static JSON) */
(function() {
  'use strict';

  var DATA_BASE = 'bot-data';

  function loadJson(file) {
    return fetch(DATA_BASE + '/' + file + '?t=' + Date.now())
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
  }

  function toggleSection(id) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('collapsed');
  }
  window.toggleSection = toggleSection;

  function formatDate(ts) {
    if (!ts) return '--';
    var d = new Date(typeof ts === 'number' ? ts : Date.parse(ts));
    if (isNaN(d)) return '--';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatHours(seconds) {
    if (!seconds) return '0h';
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    return h + 'h ' + m + 'm';
  }

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function setApiStatus(connected, msg) {
    var dot = document.getElementById('apiDot');
    var txt = document.getElementById('apiStatusText');
    var st = document.getElementById('apiStatus');
    if (connected) {
      dot.className = 'status-dot online';
      txt.textContent = msg || 'Data loaded successfully';
      st.className = 'api-status connected';
    } else {
      dot.className = 'status-dot offline';
      txt.textContent = msg || 'Failed to load bot data';
      st.className = 'api-status disconnected';
    }
  }

  function loadOverview() {
    loadJson('deimos_stats.json').then(function(data) {
      document.getElementById('statDeimosMembers').textContent = data.totalMembers || 0;
      document.getElementById('statActiveLOAs').textContent = data.activeLOAs || 0;
    }).catch(function() {});
    loadJson('opp_stats.json').then(function(data) {
      document.getElementById('statOppTotal').textContent = data.totalPlayers || 0;
    }).catch(function() {});
  }

  var RANK_ORDER = [
    'president', 'vice president', 'vice-president', 'vp',
    'secretary', 'treasurer', 'sergeant at arms', 'sergeant-at-arms', 'sa',
    'road captain', 'enforcer', 'officer', 'full patch', 'nomad', 'prospect'
  ];

  function loadMembers() {
    loadJson('deimos_members.json').then(function(data) {
      var items = Array.isArray(data) ? data : [];
      document.getElementById('memberCount').textContent = items.length;
      var tbody = document.getElementById('memberTableBody');
      if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No members found</td></tr>';
        return;
      }
      items.sort(function(a, b) {
        var ra = (a.rank || '').toLowerCase();
        var rb = (b.rank || '').toLowerCase();
        var ia = RANK_ORDER.indexOf(ra);
        var ib = RANK_ORDER.indexOf(rb);
        if (ia === -1) ia = 999;
        if (ib === -1) ib = 999;
        if (ia !== ib) return ia - ib;
        return (a.discord_name || '').localeCompare(b.discord_name || '');
      });
      var html = '';
      items.forEach(function(m) {
        var name = escHtml(m.discord_name || m.name || 'Unknown');
        var rank = escHtml(m.rank || 'Prospect');
        var status = m.status || 'active';
        var statusClass = status === 'active' ? 'online' : 'offline';
        var joined = formatDate(m.joined_at || m.join_date);
        html += '<tr><td>' + name + '</td><td>' + rank + '</td><td><span class="status-dot ' + statusClass + '"></span>' + escHtml(status) + '</td><td>' + joined + '</td></tr>';
      });
      tbody.innerHTML = html;
    }).catch(function() {
      document.getElementById('memberTableBody').innerHTML = '<tr><td colspan="4" class="empty-state">Failed to load members</td></tr>';
    });
  }

  function loadLOAs() {
    loadJson('deimos_loa.json').then(function(data) {
      var items = Array.isArray(data) ? data : [];
      document.getElementById('loaCount').textContent = items.length;
      var tbody = document.getElementById('loaTableBody');
      if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No active LOAs</td></tr>';
        return;
      }
      var html = '';
      items.forEach(function(l) {
        html += '<tr><td>' + escHtml(l.discord_name || l.member_name || 'Unknown') + '</td><td>' + escHtml(l.reason || 'No reason provided') + '</td><td>' + formatDate(l.start_date || l.created_at) + '</td><td>' + formatDate(l.end_date || l.expiry) + '</td></tr>';
      });
      tbody.innerHTML = html;
    }).catch(function() {
      document.getElementById('loaTableBody').innerHTML = '<tr><td colspan="4" class="empty-state">Failed to load LOAs</td></tr>';
    });
  }

  function loadPlaytime() {
    loadJson('deimos_monthly_stats.json').then(function(data) {
      var items = Array.isArray(data) ? data : [];
      document.getElementById('playtimeCount').textContent = items.length;
      var tbody = document.getElementById('playtimeTableBody');
      if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No playtime data</td></tr>';
        return;
      }
      var html = '';
      items.slice(0, 50).forEach(function(p, i) {
        var name = escHtml(p.discord_name || p.member_name || p.user_id || 'Unknown');
        var hours = formatHours(p.total_seconds);
        var vital = formatHours(p.vital_seconds || 0);
        var elyxir = formatHours(p.elyxir_seconds || 0);
        html += '<tr><td>' + (i + 1) + '</td><td>' + name + '</td><td>' + hours + '</td><td>' + vital + '</td><td>' + elyxir + '</td></tr>';
      });
      tbody.innerHTML = html;
    }).catch(function() {
      document.getElementById('playtimeTableBody').innerHTML = '<tr><td colspan="5" class="empty-state">Failed to load playtime data</td></tr>';
    });
  }

  function loadTracked() {
    loadJson('opp_tracked_players.json').then(function(data) {
      var items = Array.isArray(data) ? data : (data && data.players ? data.players : Object.values(data || {}));
      document.getElementById('trackedCount').textContent = items.length;
      var tbody = document.getElementById('trackedTableBody');
      if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No tracked players</td></tr>';
        return;
      }
      var html = '';
      items.forEach(function(t) {
        var name = escHtml(t.name || t.player_name || 'Unknown');
        var cat = escHtml(t.category || t.reason || 'Watchlist');
        var added = formatDate(t.added_at || t.created_at);
        html += '<tr><td>' + name + '</td><td>' + cat + '</td><td>' + added + '</td></tr>';
      });
      tbody.innerHTML = html;
    }).catch(function() {
      document.getElementById('trackedTableBody').innerHTML = '<tr><td colspan="3" class="empty-state">Failed to load tracked players</td></tr>';
    });
  }

  function loadLog() {
    loadJson('deimos_log.json').then(function(data) {
      var lines = Array.isArray(data) ? data : [];
      var viewer = document.getElementById('logViewer');
      if (!lines.length) {
        viewer.innerHTML = '<div class="empty-state"><p>No log data available</p></div>';
        return;
      }
      var html = '';
      lines.forEach(function(line) {
        var cls = 'log-line';
        if (/error|exception|traceback/i.test(line)) cls += ' error';
        else if (/warn|warning/i.test(line)) cls += ' warn';
        else if (/info|command|member/i.test(line)) cls += ' info';
        html += '<div class="' + cls + '">' + escHtml(line) + '</div>';
      });
      viewer.innerHTML = html;
      viewer.scrollTop = viewer.scrollHeight;
    }).catch(function() {
      document.getElementById('logViewer').innerHTML = '<div class="empty-state"><p>Failed to load logs</p></div>';
    });
  }
  window.refreshLog = loadLog;

  function loadFiveM() {
    // Fetch live from CFX API via our PHP proxy on the VPS
    fetch('proxy-fivem.php?server=ogpvmv').then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function(raw) {
      var playerList = (raw && raw.Data && Array.isArray(raw.Data.players))
        ? raw.Data.players
        : (Array.isArray(raw.players) ? raw.players : []);
      var players = playerList
        .map(function(p) { return { id: p.id, name: p.name, ping: p.ping }; })
        .filter(function(p) { return !!p.name; });
      var serverName = (raw && raw.Data && raw.Data.hostname) ? raw.Data.hostname
        : (raw && raw.vars) ? raw.vars.sv_hostname : 'Vital RP';
      var maxPlayers = (raw && raw.Data) ? (raw.Data.sv_maxclients || raw.Data.svMaxclients || 0)
        : (raw && raw.vars) ? raw.vars.sv_maxClients : 0;
      renderFiveM(players, serverName, maxPlayers);
    }).catch(function() {
      // Fallback to cached JSON
      loadJson('fivem_live.json').then(function(data) {
        var players = data.players || [];
        renderFiveM(players, data.serverName || 'Vital RP', data.maxPlayers || 0);
      }).catch(function() {
        renderFiveM([], 'Vital RP', 0);
      });
    });
  }

  function renderFiveM(players, serverName, maxPlayers) {
    document.getElementById('fivemCount').textContent = players.length + ' online';
    document.getElementById('statFiveMOnline').textContent = players.length;
    var label = document.getElementById('statFiveMServer');
    if (label) label.textContent = 'on ' + (serverName || 'Vital RP');
    var container = document.getElementById('fivemPlayers');
    if (!players.length) {
      container.innerHTML = '<div class="empty-state"><p>No players currently online</p></div>';
      return;
    }
    var html = '';
    players.forEach(function(p) {
      html += '<div class="player-chip"><span class="player-name">' + escHtml(p.name || 'Unknown') + '</span><span class="player-id">ID: ' + (p.id || '?') + (p.ping != null ? ' | ' + p.ping + 'ms' : '') + '</span></div>';
    });
    container.innerHTML = html;
  }
  window.refreshFiveM = loadFiveM;

  function init() {
    var authed = false;
    try { authed = sessionStorage.getItem('rh_patch_auth') === '1'; } catch(e) {}
    if (!authed) return;

    loadJson('sync_meta.json').then(function(meta) {
      var syncTime = new Date(meta.lastSync);
      var age = Math.round((Date.now() - syncTime.getTime()) / 60000);
      setApiStatus(true, 'Data synced ' + age + ' min ago (auto-refreshes every 10 min)');
    }).catch(function() {
      setApiStatus(true, 'Bot data loaded');
    });

    loadOverview();
    loadMembers();
    loadLOAs();
    loadPlaytime();
    loadTracked();
    loadLog();
    loadFiveM();
    setInterval(loadFiveM, 180000);
    setInterval(loadOverview, 180000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 300); });
  } else {
    setTimeout(init, 300);
  }

  window.addEventListener('patchAuthChange', function(e) {
    if (e.detail && e.detail.authed) { setTimeout(init, 300); }
  });

})();
