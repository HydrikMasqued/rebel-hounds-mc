/* portal-bots.js - Bot Centralisation Frontend */
(function() {
  'use strict';

  var API_BASE = '/bot-api';
  var AUTH_KEY = 'rh_patch_auth';

  function getAuth() {
    try { return sessionStorage.getItem(AUTH_KEY) === '1'; } catch(e) { return false; }
  }

  function apiFetch(path, opts) {
    return fetch(API_BASE + path, {
      headers: { 'x-portal-auth': 'HoundsForever', 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    }).then(function(r) {
      if (!r.ok) throw new Error('API ' + r.status);
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
    d.textContent = s;
    return d.innerHTML;
  }

  function setApiStatus(connected) {
    var dot = document.getElementById('apiDot');
    var txt = document.getElementById('apiStatusText');
    var st = document.getElementById('apiStatus');
    if (connected) {
      dot.className = 'status-dot online';
      txt.textContent = 'Connected to bot API';
      st.className = 'api-status connected';
    } else {
      dot.className = 'status-dot offline';
      txt.textContent = 'Unable to connect to bot API. Server may be starting up.';
      st.className = 'api-status disconnected';
    }
  }

  function loadOverview() {
    apiFetch('/deimos/stats').then(function(data) {
      document.getElementById('statDeimosMembers').textContent = data.totalMembers || 0;
      document.getElementById('statActiveLOAs').textContent = data.activeLOAs || 0;
    }).catch(function() {});
    apiFetch('/opp/stats').then(function(data) {
      document.getElementById('statOppTotal').textContent = data.totalPlayers || 0;
    }).catch(function() {});
    apiFetch('/fivem/live').then(function(data) {
      document.getElementById('statFiveMOnline').textContent = data.onlineCount || 0;
    }).catch(function() {});
  }

  function loadMembers() {
    apiFetch('/deimos/members').then(function(data) {
      document.getElementById('memberCount').textContent = data.length;
      var tbody = document.getElementById('memberTableBody');
      if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No members found</td></tr>';
        return;
      }
      data.sort(function(a, b) { return (a.discord_name || '').localeCompare(b.discord_name || ''); });
      var html = '';
      data.forEach(function(m) {
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
    apiFetch('/deimos/loa').then(function(data) {
      document.getElementById('loaCount').textContent = data.length;
      var tbody = document.getElementById('loaTableBody');
      if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No active LOAs</td></tr>';
        return;
      }
      var html = '';
      data.forEach(function(l) {
        html += '<tr><td>' + escHtml(l.discord_name || l.member_name || 'Unknown') + '</td><td>' + escHtml(l.reason || 'No reason provided') + '</td><td>' + formatDate(l.start_date || l.created_at) + '</td><td>' + formatDate(l.end_date || l.expiry) + '</td></tr>';
      });
      tbody.innerHTML = html;
    }).catch(function() {
      document.getElementById('loaTableBody').innerHTML = '<tr><td colspan="4" class="empty-state">Failed to load LOAs</td></tr>';
    });
  }

  function loadPlaytime() {
    apiFetch('/deimos/playtime/monthly').then(function(data) {
      document.getElementById('playtimeCount').textContent = data.length;
      var tbody = document.getElementById('playtimeTableBody');
      if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No playtime data</td></tr>';
        return;
      }
      var html = '';
      data.slice(0, 50).forEach(function(p, i) {
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
    apiFetch('/opp/tracked').then(function(data) {
      var items = Array.isArray(data) ? data : (data.players || Object.values(data));
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
    apiFetch('/deimos/log?lines=100').then(function(data) {
      var viewer = document.getElementById('logViewer');
      if (!data.length) {
        viewer.innerHTML = '<div class="empty-state"><p>No log data available</p></div>';
        return;
      }
      var html = '';
      data.forEach(function(line) {
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
    apiFetch('/fivem/live').then(function(data) {
      document.getElementById('fivemCount').textContent = (data.onlineCount || 0) + ' online';
      document.getElementById('statFiveMOnline').textContent = data.onlineCount || 0;
      var container = document.getElementById('fivemPlayers');
      var players = data.players || [];
      if (!players.length) {
        container.innerHTML = '<div class="empty-state"><p>No players currently online</p></div>';
        return;
      }
      var html = '';
      players.forEach(function(p) {
        html += '<div class="player-chip"><span class="player-name">' + escHtml(p.name || 'Unknown') + '</span><span class="player-id">ID: ' + (p.id || '?') + '</span></div>';
      });
      container.innerHTML = html;
    }).catch(function() {
      document.getElementById('fivemPlayers').innerHTML = '<div class="empty-state"><p>Failed to load players</p></div>';
    });
  }
  window.refreshFiveM = loadFiveM;

  function sendCommand() {
    var channelId = document.getElementById('cmdChannelId').value.trim();
    var message = document.getElementById('cmdMessage').value.trim();
    var result = document.getElementById('cmdResult');
    if (!channelId || !message) {
      result.textContent = 'Channel ID and message are required.';
      result.style.color = '#c0392b';
      return;
    }
    result.textContent = 'Sending...';
    result.style.color = 'var(--muted)';
    fetch(API_BASE + '/deimos/command', {
      method: 'POST',
      headers: { 'x-portal-auth': 'HoundsForever', 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: channelId, message: message })
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.success) {
        result.textContent = 'Message sent successfully.';
        result.style.color = '#2ecc71';
        document.getElementById('cmdMessage').value = '';
      } else {
        result.textContent = 'Error: ' + (data.error || 'Unknown error');
        result.style.color = '#c0392b';
      }
    }).catch(function(e) {
      result.textContent = 'Request failed: ' + e.message;
      result.style.color = '#c0392b';
    });
  }
  window.sendCommand = sendCommand;

  function init() {
    if (!getAuth()) return;

    apiFetch('/health').then(function() {
      setApiStatus(true);
      loadOverview();
      loadMembers();
      loadLOAs();
      loadPlaytime();
      loadTracked();
      loadLog();
      loadFiveM();
      setInterval(loadFiveM, 60000);
      setInterval(loadOverview, 120000);
    }).catch(function() {
      setApiStatus(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(init, 500);
    });
  } else {
    setTimeout(init, 500);
  }

  window.addEventListener('patchAuthChange', function(e) {
    if (e.detail && e.detail.authed) {
      setTimeout(init, 500);
    }
  });

})();
