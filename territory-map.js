(function() {
  'use strict';

  var MAP_API_BASE = window.MAP_API_BASE || '';
  var LS_KEY = 'rhmc_map_';
  var LS_TERR = 'territories';

  var MAP_CONFIGS = {
    los_santos: {
      bounds: [[-4000, -4000], [4000, 4000]],
      images: {
        atlas: { base: '/map-images/satellite_hi', rows: 3, cols: 3, ext: 'jpg' },
        satellite: { base: '/map-images/atlas_hi', rows: 3, cols: 3, ext: 'jpg' },
        road: { base: '/map-images/road_hi', rows: 3, cols: 3, ext: 'jpg' }
      }
    },
    cayo_perico: {
      bounds: [[-5400, 3700], [-4150, 4950]],
      images: {
        atlas: '/map-images/cayo_perico_atlas.jpg',
        satellite: '/map-images/cayo_perico_satellite.jpg',
        road: '/map-images/cayo_perico_road.jpg'
      }
    }
  };

  var map = null;
  var currentMap = 'los_santos';
  var currentLayer = 'atlas';
  var baseOverlays = [];
  var zonesLayer = null;
  var draftLayer = null;
  var hqLayer = null;
  var labelLayer = null;

  var territories = [];
  var selectedId = null;
  var editingId = null;

  // Draft state
  var drawMode = false;
  var hqMode = false;
  var draftZone = [];
  var draftHq = null;
  var draftPoly = null;
  var draftPts = [];
  var draftHqMarker = null;

  var drawHud = null;

  function canEdit() {
    if (window.rhmcAuth && typeof window.rhmcAuth.canEdit === 'function') {
      return !!window.rhmcAuth.canEdit();
    }
    if (typeof hasRole === 'function') return hasRole('officer');
    return false;
  }

  function lsGet(k) {
    try { return JSON.parse(localStorage.getItem(LS_KEY + k)) || []; } catch (e) { return []; }
  }

  function lsSet(k, v) {
    try { localStorage.setItem(LS_KEY + k, JSON.stringify(v)); } catch (e) {}
  }

  function lsNextId() {
    var max = 99;
    territories.forEach(function(t) { if (t.id > max) max = t.id; });
    return max + 1;
  }

  async function api(endpoint, options) {
    if (MAP_API_BASE) {
      try {
        var res = await fetch(MAP_API_BASE + endpoint, {
          headers: { 'Content-Type': 'application/json' },
          ...(options || {})
        });
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
      } catch (e) {
        console.warn('[territory] API failed, using localStorage:', e.message);
      }
    }
    return lsApi(endpoint, options);
  }

  function lsApi(endpoint, options) {
    var method = (options && options.method) || 'GET';
    var body = options && options.body ? JSON.parse(options.body) : null;
    var parts = endpoint.replace(/^\//, '').split('/');
    var resource = parts[0];
    var id = parts[1] ? parseInt(parts[1], 10) : null;
    var items = lsGet(LS_TERR);

    if (resource !== 'territories') return Promise.reject(new Error('unknown resource'));

    if (method === 'GET' && !id) return Promise.resolve(items);
    if (method === 'GET' && id) {
      return Promise.resolve(items.find(function(t) { return t.id === id; }) || null);
    }
    if (method === 'POST') {
      var now = new Date().toISOString();
      var terr = Object.assign({ id: lsNextId(), created_at: now, updated_at: now }, body);
      items.push(terr);
      lsSet(LS_TERR, items);
      return Promise.resolve({ id: terr.id });
    }
    if (method === 'PUT' && id) {
      var idx = items.findIndex(function(t) { return t.id === id; });
      if (idx !== -1) {
        items[idx] = Object.assign(items[idx], body, { updated_at: new Date().toISOString() });
        lsSet(LS_TERR, items);
      }
      return Promise.resolve({ success: true });
    }
    if (method === 'DELETE' && id) {
      lsSet(LS_TERR, items.filter(function(t) { return t.id !== id; }));
      return Promise.resolve({ success: true });
    }
    return Promise.reject(new Error('bad request'));
  }

  function addBaseImage() {
    if (map._baseOverlays) {
      map._baseOverlays.forEach(function(o) { map.removeLayer(o); });
      map._baseOverlays = null;
    }
    var cfg = MAP_CONFIGS[currentMap];
    var spec = cfg.images[currentLayer];
    var opts = { opacity: 1, interactive: false, attribution: '© CreepPork/GTAV-Maps' };
    var made = [];

    if (typeof spec === 'string') {
      var single = L.imageOverlay(spec, cfg.bounds, opts).addTo(map);
      single.bringToBack();
      made.push(single);
    } else {
      var rows = spec.rows, cols = spec.cols, ext = spec.ext || 'jpg';
      var s = cfg.bounds[0][0], w = cfg.bounds[0][1];
      var n = cfg.bounds[1][0], e = cfg.bounds[1][1];
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var b = [
            [n - (r + 1) * (n - s) / rows, w + c * (e - w) / cols],
            [n - r * (n - s) / rows, w + (c + 1) * (e - w) / cols]
          ];
          var ov = L.imageOverlay(spec.base + '_' + r + c + '.' + ext, b, opts).addTo(map);
          ov.bringToBack();
          made.push(ov);
        }
      }
    }
    map._baseOverlays = made;
    baseOverlays = made;
    if (draftLayer) draftLayer.bringToFront();
    if (zonesLayer) zonesLayer.bringToFront();
    if (hqLayer) hqLayer.bringToFront();
    if (labelLayer) labelLayer.bringToFront();
  }

  function centroid(zone) {
    if (!zone || !zone.length) return null;
    var lat = 0, lng = 0;
    zone.forEach(function(p) { lat += p[0]; lng += p[1]; });
    return [lat / zone.length, lng / zone.length];
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderZones() {
    zonesLayer.clearLayers();
    labelLayer.clearLayers();
    hqLayer.clearLayers();

    territories.forEach(function(t) {
      var zone = t.zone || [];
      if (zone.length >= 3) {
        var poly = L.polygon(zone, {
          color: t.color || '#c0392b',
          weight: 2,
          fillColor: t.color || '#c0392b',
          fillOpacity: t.id === selectedId ? 0.4 : 0.22
        }).addTo(zonesLayer);
        poly.on('click', function(e) {
          L.DomEvent.stop(e);
          selectTerritory(t.id);
        });
      }

      var mid = centroid(zone);
      if (mid) {
        var logo = t.logo_url
          ? '<img src="' + escapeHtml(t.logo_url) + '" alt="" onerror="this.style.display=\'none\'">'
          : '';
        var icon = L.divIcon({
          className: '',
          html: '<div class="terr-label">' + logo + '<span>' + escapeHtml(t.gang_name || 'Unknown') + '</span></div>',
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        });
        L.marker(mid, { icon: icon, interactive: false, keyboard: false }).addTo(labelLayer);
      }

      if (t.hq_lat != null && t.hq_lng != null) {
        var hqColor = t.color || '#c0392b';
        var hqIcon = L.divIcon({
          className: '',
          html: '<div class="terr-hq" style="background:' + escapeHtml(hqColor) + '" title="HQ"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 18]
        });
        L.marker([t.hq_lat, t.hq_lng], { icon: hqIcon, title: (t.gang_name || '') + ' HQ' })
          .addTo(hqLayer)
          .on('click', function(e) {
            L.DomEvent.stop(e);
            selectTerritory(t.id);
          });
      }
    });
  }

  function renderList() {
    var list = document.getElementById('terrList');
    if (!list) return;
    var q = (document.getElementById('terrSearch') || {}).value || '';
    q = q.trim().toLowerCase();
    var filtered = territories.filter(function(t) {
      return !q || String(t.gang_name || '').toLowerCase().indexOf(q) !== -1;
    });

    document.getElementById('terrStatCount').textContent = territories.length;

    if (!filtered.length) {
      list.innerHTML = '<div class="terr-empty">' + (territories.length ? 'No matches.' : 'No territories yet.') + '</div>';
      return;
    }

    list.innerHTML = filtered.map(function(t) {
      var logo = t.logo_url
        ? '<img src="' + escapeHtml(t.logo_url) + '" alt="" onerror="this.style.visibility=\'hidden\'">'
        : '<span style="width:32px;height:32px;border-radius:50%;background:' + escapeHtml(t.color || '#c0392b') + ';display:inline-block;flex-shrink:0;"></span>';
      var actions = '';
      if (canEdit()) {
        actions =
          '<div class="terr-list-actions">' +
            '<button type="button" data-act="edit" data-id="' + t.id + '" title="Edit">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>' +
            '</button>' +
            '<button type="button" class="danger" data-act="delete" data-id="' + t.id + '" title="Delete">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>' +
            '</button>' +
          '</div>';
      }
      return (
        '<div class="terr-list-item' + (t.id === selectedId ? ' active' : '') + '" data-id="' + t.id + '" style="border-left-color:' + escapeHtml(t.color || '#c0392b') + '">' +
          logo +
          '<span class="terr-list-name">' + escapeHtml(t.gang_name || 'Unnamed') + '</span>' +
          actions +
        '</div>'
      );
    }).join('');
  }

  function selectTerritory(id) {
    selectedId = id;
    var t = territories.find(function(x) { return x.id === id; });
    var hint = document.getElementById('terrHint');
    if (t && hint) {
      var pts = (t.zone || []).length;
      hint.innerHTML = '<b>' + escapeHtml(t.gang_name) + '</b><br>Zone points: ' + pts +
        (t.hq_lat != null ? '<br>HQ: ' + t.hq_lat + ', ' + t.hq_lng : '') +
        (t.notes ? '<br>' + escapeHtml(t.notes) : '');
    } else if (hint) {
      hint.textContent = 'Select a zone for details.';
    }
    renderZones();
    renderList();
    if (t && t.zone && t.zone.length >= 3) {
      try { map.fitBounds(L.latLngBounds(t.zone), { padding: [40, 40] }); } catch (e) {}
    }
  }

  function showPanel(which) {
    var listP = document.getElementById('terrListPanel');
    var formP = document.getElementById('terrFormPanel');
    if (!listP || !formP) return;
    if (which === 'form') {
      listP.classList.remove('active');
      formP.classList.add('active');
    } else {
      formP.classList.remove('active');
      listP.classList.add('active');
    }
  }

  function clearDraft() {
    drawMode = false;
    hqMode = false;
    draftZone = [];
    draftHq = null;
    draftPts = [];
    draftPoly = null;
    draftHqMarker = null;
    draftLayer.clearLayers();
    updateDrawHud();
    document.getElementById('terrBtnDraw').classList.remove('active');
    document.getElementById('terrBtnHq').classList.remove('active');
    updatePtCount();
    if (map && map.dragging) map.dragging.enable();
  }

  function updatePtCount() {
    var el = document.getElementById('terrPtCount');
    if (el) el.textContent = draftZone.length;
  }

  function updateDrawHud() {
    if (!drawHud) return;
    if (drawMode) {
      drawHud.classList.add('on');
      drawHud.innerHTML =
        'Drawing zone (' + draftZone.length + ' pts)' +
        '<button type="button" id="terrCloseZone">Close zone</button>' +
        '<button type="button" class="cancel" id="terrCancelDraw">Cancel</button>';
      document.getElementById('terrCloseZone').onclick = function(e) {
        e.stopPropagation();
        finishDraw();
      };
      document.getElementById('terrCancelDraw').onclick = function(e) {
        e.stopPropagation();
        clearDraft();
      };
    } else if (hqMode) {
      drawHud.classList.add('on');
      drawHud.innerHTML =
        'Click map to place HQ' +
        '<button type="button" class="cancel" id="terrCancelHq">Cancel</button>';
      document.getElementById('terrCancelHq').onclick = function(e) {
        e.stopPropagation();
        hqMode = false;
        document.getElementById('terrBtnHq').classList.remove('active');
        updateDrawHud();
        if (map.dragging) map.dragging.enable();
      };
    } else {
      drawHud.classList.remove('on');
      drawHud.innerHTML = '';
    }
  }

  function redrawDraft() {
    draftLayer.clearLayers();
    if (draftZone.length) {
      var color = (document.getElementById('terrColor') || {}).value || '#c0392b';
      draftPts = draftZone.map(function(p) { return L.circleMarker(p, { radius: 5, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }); });
      draftPts.forEach(function(m) { m.addTo(draftLayer); });
      draftPoly = L.polyline(draftZone, { color: color, weight: 2, dashArray: '6 6', interactive: false }).addTo(draftLayer);
    }
    if (draftHq) {
      draftHqMarker = L.circleMarker(draftHq, {
        radius: 8, color: '#fff', weight: 2, fillColor: '#ffd43b', fillOpacity: 1
      }).addTo(draftLayer);
    }
    updatePtCount();
    updateDrawHud();
  }

  function finishDraw() {
    if (draftZone.length < 3) {
      setMsg('Need at least 3 points to close a zone.');
      return;
    }
    drawMode = false;
    document.getElementById('terrBtnDraw').classList.remove('active');
    if (map.dragging) map.dragging.enable();
    updateDrawHud();
    redrawDraft();
    setMsg('');
  }

  function onMapClick(e) {
    if (!canEdit()) return;
    var pt = [e.latlng.lat, e.latlng.lng];

    if (hqMode) {
      draftHq = pt;
      hqMode = false;
      document.getElementById('terrBtnHq').classList.remove('active');
      var hqLat = document.getElementById('terrHqLat');
      var hqLng = document.getElementById('terrHqLng');
      if (hqLat) hqLat.value = pt[0].toFixed(4);
      if (hqLng) hqLng.value = pt[1].toFixed(4);
      if (map.dragging) map.dragging.enable();
      redrawDraft();
      return;
    }

    if (!drawMode) return;

    if (draftZone.length >= 3) {
      var first = draftZone[0];
      var dx = first[1] - pt[1];
      var dy = first[0] - pt[0];
      var dist = Math.sqrt(dx * dx + dy * dy);
      var px = map.latLngToLayerPoint(L.latLng(first)).distanceTo(map.latLngToLayerPoint(e.latlng));
      if (dist < 80 || px < 14) {
        finishDraw();
        return;
      }
    }
    draftZone.push(pt);
    redrawDraft();
  }

  function setMsg(msg) {
    var el = document.getElementById('terrMsg');
    if (el) el.textContent = msg || '';
  }

  function openForm(terr) {
    editingId = terr ? terr.id : null;
    showPanel('form');
    var title = document.getElementById('terrFormTitle');
    var del = document.getElementById('terrBtnDelete');
    if (title) title.textContent = terr ? 'Edit Territory' : 'New Territory';
    if (del) del.style.display = terr ? '' : 'none';

    document.getElementById('terrId').value = terr ? terr.id : '';
    document.getElementById('terrName').value = terr ? (terr.gang_name || '') : '';
    document.getElementById('terrColor').value = terr ? (terr.color || '#c0392b') : '#c0392b';
    document.getElementById('terrHqLat').value = terr && terr.hq_lat != null ? terr.hq_lat : '';
    document.getElementById('terrHqLng').value = terr && terr.hq_lng != null ? terr.hq_lng : '';
    document.getElementById('terrLogo').value = terr ? (terr.logo_url || '') : '';
    document.getElementById('terrNotes').value = terr ? (terr.notes || '') : '';
    setMsg('');

    clearDraft();
    if (terr && terr.zone && terr.zone.length) {
      draftZone = terr.zone.map(function(p) { return [p[0], p[1]]; });
      if (terr.hq_lat != null && terr.hq_lng != null) {
        draftHq = [terr.hq_lat, terr.hq_lng];
      }
      redrawDraft();
      try { map.fitBounds(L.latLngBounds(draftZone), { padding: [40, 40] }); } catch (e) {}
    }
    var nameEl = document.getElementById('terrName');
    if (nameEl) nameEl.focus();
  }

  function closeForm() {
    showPanel('list');
    clearDraft();
    setMsg('');
  }

  async function loadTerritories() {
    try {
      var data = await api('/territories', { method: 'GET' });
      if (Array.isArray(data)) {
        territories = data;
        lsSet(LS_TERR, territories);
      } else {
        territories = lsGet(LS_TERR);
      }
    } catch (e) {
      territories = lsGet(LS_TERR);
    }
    renderZones();
    renderList();
    if (selectedId) {
      var still = territories.find(function(t) { return t.id === selectedId; });
      if (!still) selectedId = null;
    }
  }

  async function saveTerritory() {
    if (!canEdit()) {
      setMsg('Officer access required.');
      return;
    }
    var name = (document.getElementById('terrName').value || '').trim();
    if (!name) {
      setMsg('Gang name required.');
      return;
    }
    var zone = draftZone.length >= 3 ? draftZone.map(function(p) { return [p[0], p[1]]; }) : [];
    if (!zone.length) {
      var existing = editingId ? territories.find(function(t) { return t.id === editingId; }) : null;
      if (existing && existing.zone) zone = existing.zone;
    }
    if (zone.length < 3) {
      setMsg('Draw a zone with at least 3 points first.');
      return;
    }

    var hqLatRaw = (document.getElementById('terrHqLat').value || '').trim();
    var hqLngRaw = (document.getElementById('terrHqLng').value || '').trim();
    var payload = {
      gang_name: name,
      color: document.getElementById('terrColor').value || '#c0392b',
      logo_url: (document.getElementById('terrLogo').value || '').trim(),
      notes: document.getElementById('terrNotes').value || '',
      zone: zone,
      hq_lat: hqLatRaw === '' ? (draftHq ? draftHq[0] : null) : parseFloat(hqLatRaw),
      hq_lng: hqLngRaw === '' ? (draftHq ? draftHq[1] : null) : parseFloat(hqLngRaw)
    };
    if (isNaN(payload.hq_lat)) payload.hq_lat = null;
    if (isNaN(payload.hq_lng)) payload.hq_lng = null;

    try {
      if (editingId) {
        await api('/territories/' + editingId, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/territories', { method: 'POST', body: JSON.stringify(payload) });
      }
      await loadTerritories();
      closeForm();
      setMsg('');
    } catch (e) {
      setMsg('Save failed: ' + e.message);
    }
  }

  async function deleteTerritory(id) {
    if (!canEdit()) return;
    if (!id) return;
    if (!window.confirm('Delete this territory?')) return;
    try {
      await api('/territories/' + id, { method: 'DELETE' });
      if (selectedId === id) selectedId = null;
      await loadTerritories();
      closeForm();
    } catch (e) {
      setMsg('Delete failed: ' + e.message);
    }
  }

  function switchMap(key) {
    if (!MAP_CONFIGS[key]) return;
    currentMap = key;
    document.querySelectorAll('#territoryEmbed .map-switcher-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.map === key);
    });
    addBaseImage();
    map.fitBounds(MAP_CONFIGS[key].bounds);
  }

  function initMap() {
    var cfg = MAP_CONFIGS[currentMap];
    map = L.map('territoryMap', {
      crs: L.CRS.Simple,
      minZoom: -3,
      maxZoom: 2,
      zoomControl: false,
      attributionControl: false
    });
    map.fitBounds(cfg.bounds);
    addBaseImage();

    zonesLayer = L.layerGroup().addTo(map);
    draftLayer = L.layerGroup().addTo(map);
    hqLayer = L.layerGroup().addTo(map);
    labelLayer = L.layerGroup().addTo(map);

    map.on('click', onMapClick);
  }

  function wireUI() {
    drawHud = document.createElement('div');
    drawHud.className = 'terr-draw-hud';
    document.getElementById('territoryEmbed').appendChild(drawHud);

    var fit = document.getElementById('terrBtnFit');
    if (fit) fit.addEventListener('click', function() { map.fitBounds(MAP_CONFIGS[currentMap].bounds); });

    var full = document.getElementById('terrBtnFull');
    if (full) full.addEventListener('click', function() {
      var el = document.getElementById('territoryEmbed');
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) el.requestFullscreen();
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setTimeout(function() { if (map) map.invalidateSize(); }, 250);
    });

    var drawBtn = document.getElementById('terrBtnDraw');
    if (drawBtn) drawBtn.addEventListener('click', function() {
      if (!canEdit()) return;
      hqMode = false;
      document.getElementById('terrBtnHq').classList.remove('active');
      drawMode = !drawMode;
      drawBtn.classList.toggle('active', drawMode);
      if (drawMode) {
        draftZone = [];
        redrawDraft();
        setMsg('Click the map to add points. Click the first point (or Close) when done.');
      } else {
        updateDrawHud();
      }
    });

    var hqBtn = document.getElementById('terrBtnHq');
    if (hqBtn) hqBtn.addEventListener('click', function() {
      if (!canEdit()) return;
      drawMode = false;
      document.getElementById('terrBtnDraw').classList.remove('active');
      hqMode = !hqMode;
      hqBtn.classList.toggle('active', hqMode);
      updateDrawHud();
    });

    var clearBtn = document.getElementById('terrBtnClear');
    if (clearBtn) clearBtn.addEventListener('click', function() {
      clearDraft();
      setMsg('Draft cleared.');
    });

    document.querySelectorAll('#territoryEmbed .map-switcher-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { switchMap(btn.dataset.map); });
    });

    var search = document.getElementById('terrSearch');
    if (search) search.addEventListener('input', renderList);

    var list = document.getElementById('terrList');
    if (list) list.addEventListener('click', function(e) {
      var btn = e.target.closest('button[data-act]');
      if (btn) {
        e.stopPropagation();
        var id = parseInt(btn.dataset.id, 10);
        if (btn.dataset.act === 'edit') {
          var t = territories.find(function(x) { return x.id === id; });
          if (t) openForm(t);
        } else if (btn.dataset.act === 'delete') {
          deleteTerritory(id);
        }
        return;
      }
      var item = e.target.closest('.terr-list-item');
      if (item) selectTerritory(parseInt(item.dataset.id, 10));
    });

    var newBtn = document.getElementById('terrBtnNew');
    if (newBtn) newBtn.addEventListener('click', function() { openForm(null); });

    var saveBtn = document.getElementById('terrBtnSave');
    if (saveBtn) saveBtn.addEventListener('click', saveTerritory);

    var cancelBtn = document.getElementById('terrBtnCancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closeForm);

    var delBtn = document.getElementById('terrBtnDelete');
    if (delBtn) delBtn.addEventListener('click', function() {
      var id = parseInt(document.getElementById('terrId').value, 10);
      if (id) deleteTerritory(id);
    });

    var color = document.getElementById('terrColor');
    if (color) color.addEventListener('input', redrawDraft);

    var hqLat = document.getElementById('terrHqLat');
    var hqLng = document.getElementById('terrHqLng');
    function syncHqFromInputs() {
      var a = parseFloat(hqLat && hqLat.value);
      var b = parseFloat(hqLng && hqLng.value);
      if (!isNaN(a) && !isNaN(b)) {
        draftHq = [a, b];
        redrawDraft();
      }
    }
    if (hqLat) hqLat.addEventListener('change', syncHqFromInputs);
    if (hqLng) hqLng.addEventListener('change', syncHqFromInputs);

    var sideToggle = document.getElementById('terrSidebarToggle');
    if (sideToggle) sideToggle.addEventListener('click', function() {
      document.getElementById('territorySidebar').classList.toggle('collapsed');
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (drawMode || hqMode) clearDraft();
      }
    });
  }

  function refresh() {
    if (!map) return;
    setTimeout(function() {
      map.invalidateSize();
      renderZones();
      renderList();
    }, 80);
  }

  function boot() {
    if (!document.getElementById('territoryMap')) return;
    initMap();
    wireUI();
    loadTerritories();
    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.rhmcTerritory = { refresh: refresh, reload: loadTerritories };
})();
