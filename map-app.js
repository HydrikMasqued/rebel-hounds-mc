(function() { 'use strict';
    // Map configurations for Los Santos and Cayo Perico
    const MAP_CONFIGS = {
      los_santos: {
        bounds: [[-4000, -4000], [4000, 4000]],
        images: {
          atlas: '/map-images/satellite_hi.jpg',
          satellite: '/map-images/atlas_hi.jpg',
          road: '/map-images/road_hi.jpg'
        },
        type: 'image'
      },
      cayo_perico: {
        bounds: [[-5400, 3700], [-4150, 4950]],
        images: {
          atlas: '/map-images/cayo_perico_atlas.jpg',
          satellite: '/map-images/cayo_perico_satellite.jpg',
          road: '/map-images/cayo_perico_road.jpg'
        },
        type: 'image'
      }
    };
    let currentMap = 'los_santos';
    let currentLayer = 'atlas';

    // Blip icon glyphs
    const ICON_SVG = {
      marker: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
      star: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
      diamond: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12l10 10 10-10-10-10z"/></svg>`,
      car: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
      crosshairs: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2v10h-2V2h2zm0 12v10h-2v-10h2zM2 12h10V2H2v10zm12 0h10V2h-10v10z"/></svg>`,
      home: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
      gamepad: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1-1 .45-1 1zm8 0c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1-1 .45-1 1zm-4-4c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1-1 .45-1 1zm4 8c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1-1 .45-1 1z"/></svg>`,
      circle: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>`,
      flag: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>`,
      skull: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3-8c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1zm6 0c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1zm-3-4c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zm-6 8c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1zm12 0c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1z"/></svg>`,
      crown: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
      arrow_up: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 21 14h-6v8H9v-8H3l9-12z"/></svg>`,
      arrow_up_right: `<svg viewBox="0 0 24 24" fill="currentColor" style="transform:rotate(45deg)"><path d="M12 2 21 14h-6v8H9v-8H3l9-12z"/></svg>`,
      arrow_right: `<svg viewBox="0 0 24 24" fill="currentColor" style="transform:rotate(90deg)"><path d="M12 2 21 14h-6v8H9v-8H3l9-12z"/></svg>`,
      arrow_down_right: `<svg viewBox="0 0 24 24" fill="currentColor" style="transform:rotate(135deg)"><path d="M12 2 21 14h-6v8H9v-8H3l9-12z"/></svg>`,
      arrow_down: `<svg viewBox="0 0 24 24" fill="currentColor" style="transform:rotate(180deg)"><path d="M12 2 21 14h-6v8H9v-8H3l9-12z"/></svg>`,
      arrow_down_left: `<svg viewBox="0 0 24 24" fill="currentColor" style="transform:rotate(225deg)"><path d="M12 2 21 14h-6v8H9v-8H3l9-12z"/></svg>`,
      arrow_left: `<svg viewBox="0 0 24 24" fill="currentColor" style="transform:rotate(270deg)"><path d="M12 2 21 14h-6v8H9v-8H3l9-12z"/></svg>`,
      arrow_up_left: `<svg viewBox="0 0 24 24" fill="currentColor" style="transform:rotate(315deg)"><path d="M12 2 21 14h-6v8H9v-8H3l9-12z"/></svg>`,
      infantry: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
      medic: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z"/></svg>`,
      target: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>`,
      alert: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 1 21h22L12 2zm-1 6h2v7h-2V8zm0 9h2v2h-2v-2z"/></svg>`,
      shield: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 3v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5l8-3zm0 2.2L6 6.6V12c0 3.9 2.6 6.7 6 7.8 3.4-1.1 6-3.9 6-7.8V6.6l-6-2.4z"/></svg>`,
      plane: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`,
      eye: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 5C7 5 2.7 8 1 12c1.7 4 6 7 11 7s9.3-3 11-7c-1.7-4-6-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>`
    };
    const ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`;
    const ICON_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>`;

    // State
    let map, blipLayer, drawLayer;
    let blips = [], categories = [], drawings = [];
    let selectedBlipId = null;
    let editingBlipId = null;
    let addBlipMode = false;
    let categoryFilter = '';

    // Drawing state
    const DRAW_COLORS = ['#ff4d6d', '#ff9f43', '#ffd43b', '#37d67a', '#22d3ee', '#3b82f6', '#a78bfa', '#ffffff', '#8b949e'];
    let drawMode = false, eraseMode = false;
    let drawColor = '#ff4d6d', drawWidth = 3;
    let currentStroke = null, strokePoints = [];
    let drawingStrokes = [];

    // Initialize map
    function initMap() {
      const cfg = MAP_CONFIGS[currentMap];

      map = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: -3,
        maxZoom: 2,
        zoomControl: false,
        attributionControl: false
      });

      // Fit the whole map in the viewport on load
      map.fitBounds(cfg.bounds);

      // No maxBounds - allow free panning

      // Add base map image
      addMapImage();
      syncLayerUI();

      // Drawing layer (below blip markers)
      drawLayer = L.layerGroup().addTo(map);

      // Blip layer
      blipLayer = L.layerGroup().addTo(map);

      // Map events
      map.on('moveend', updateCoordDisplay);
      map.on('click', onMapClick);
      map.on('click', onMapClickErase);
      map.on('mousedown touchstart', startStroke);
      map.on('zoomend', updateCoordDisplay);

      updateCoordDisplay();
      loadData();
    }

    function addMapImage() {
      if (map._imageOverlay) { map.removeLayer(map._imageOverlay); map._imageOverlay = null; }
      if (map._tileLayer) { map.removeLayer(map._tileLayer); map._tileLayer = null; }

      const cfg = MAP_CONFIGS[currentMap];

      map._imageOverlay = L.imageOverlay(cfg.images[currentLayer], cfg.bounds, {
        opacity: 1,
        interactive: false,
        attribution: '© CreepPork/GTAV-Maps'
      }).addTo(map);
      map._imageOverlay.bringToBack();

      if (map._gridOverlay) { map._gridOverlay.bringToFront(); }
    }

    function syncLayerUI() {
      document.querySelectorAll('.layer-opt').forEach(o => {
        o.classList.toggle('checked', o.querySelector('input[name="layer"]')?.value === currentLayer);
      });
    }

    function updateTileLayer() {
      currentLayer = document.querySelector('input[name="layer"]:checked')?.value || 'atlas';
      syncLayerUI();
      addMapImage();
    }

    // switchMap moved to end of file (with smooth transition)

    function updateGrid() {
      const show = document.getElementById('gridToggle').checked;
      const cfg = MAP_CONFIGS[currentMap];
      if (show && !map._gridOverlay) {
        map._gridOverlay = L.imageOverlay('/map-images/grid.png', cfg.bounds, {
          opacity: 1,
          interactive: false
        }).addTo(map);
      } else if (!show && map._gridOverlay) {
        map.removeLayer(map._gridOverlay);
        map._gridOverlay = null;
      }
    }

    // ---- Drawing layer ----
    function initDrawControl() {
      const colorRow = document.getElementById('colorRow');
      colorRow.innerHTML = DRAW_COLORS.map(c =>
        `<button type="button" class="color-swatch ${c === drawColor ? 'active' : ''}" data-color="${c}" style="background: ${c}" title="${c}"></button>`
      ).join('');
      colorRow.querySelectorAll('.color-swatch').forEach(sw => sw.addEventListener('click', () => {
        drawColor = sw.dataset.color;
        colorRow.querySelectorAll('.color-swatch').forEach(x => x.classList.toggle('active', x === sw));
      }));

      document.getElementById('drawWidthInput').addEventListener('input', e => {
        drawWidth = parseInt(e.target.value) || 3;
      });

      document.getElementById('btnDraw').addEventListener('click', () => setDrawMode(!drawMode));
      document.getElementById('btnErase').addEventListener('click', () => setEraseMode(!eraseMode));
      document.getElementById('btnClearDraw').addEventListener('click', clearDrawings);
    }

    function setDrawMode(on) {
      drawMode = on;
      if (on) {
        eraseMode = false;
        document.getElementById('btnErase').classList.remove('active');
        cancelPlacementMode();
      }
      document.getElementById('btnDraw').classList.toggle('active', on);
      setMapCursor();
    }

    function setEraseMode(on) {
      eraseMode = on;
      if (on) {
        drawMode = false;
        document.getElementById('btnDraw').classList.remove('active');
        cancelPlacementMode();
        map.dragging.disable();
      } else {
        map.dragging.enable();
      }
      document.getElementById('btnErase').classList.toggle('active', on);
      setMapCursor();
      drawingStrokes.forEach(st => {
        if (st.layer) {
          st.layer.setStyle({ interactive: on, weight: on ? Math.max(st.layer.options.weight || 3, 10) : (drawings.find(d => d.id === st.id)?.width || 3) });
          if (on) {
            st.layer.off('click');
            st.layer.on('click', (e) => { L.DomEvent.stop(e); if (eraseMode) deleteDrawing(st.id); });
          } else {
            st.layer.off('click');
          }
        }
      });
    }

    function cancelPlacementMode() {
      addBlipMode = false;
      document.getElementById('btnAddBlip').classList.remove('active');
      document.getElementById('btnAddBlip').title = 'Add blip at center';
      closeQuickForm();
    }

    function setMapCursor() {
      const el = map.getContainer();
      if (drawMode) el.style.cursor = 'crosshair';
      else if (eraseMode) el.style.cursor = 'pointer';
      else el.style.cursor = '';
    }

    function renderDrawings() {
      drawLayer.clearLayers();
      drawingStrokes = drawings.map(d => {
        const layer = L.polyline(d.points, {
          color: d.color,
          weight: eraseMode ? Math.max(d.width || 3, 8) : (d.width || 3),
          opacity: 0.9,
          interactive: !!eraseMode
        }).addTo(drawLayer).bringToFront();
        if (eraseMode) {
          layer.on('click', () => { if (eraseMode) deleteDrawing(d.id); });
        }
        return { id: d.id, points: d.points, layer };
      });
    }

    function startStroke(e) {
      if (!drawMode) return;
      strokePoints = [e.latlng];
      map.dragging.disable();
      map.getContainer().style.cursor = 'crosshair';
      map.on('mousemove touchmove', extendStroke);
      map.on('mouseup touchend', endStroke);
    }

    function extendStroke(e) {
      const last = strokePoints[strokePoints.length - 1];
      if (Math.abs(e.latlng.lat - last.lat) + Math.abs(e.latlng.lng - last.lng) < 0.02) return;
      strokePoints.push(e.latlng);
      if (!currentStroke) {
        currentStroke = L.polyline([strokePoints], {
          color: drawColor,
          weight: drawWidth,
          opacity: 0.9,
          interactive: false
        }).addTo(drawLayer).bringToFront();
      } else {
        currentStroke.setLatLngs(strokePoints);
      }
    }

    function endStroke() {
      map.dragging.enable();
      setMapCursor();
      map.off('mousemove touchmove', extendStroke);
      map.off('mouseup touchend', endStroke);
      const strokeLayer = currentStroke;
      const pts = strokePoints;
      currentStroke = null;
      strokePoints = [];
      if (strokeLayer && pts.length >= 2) {
        const payload = {
          color: drawColor,
          width: drawWidth,
          points: pts.map(p => [p.lat, p.lng])
        };
        api('/drawings', { method: 'POST', body: JSON.stringify(payload) })
          .then(saved => {
            strokeLayer._drawingId = saved.id;
            drawings.push(saved);
            drawingStrokes.push({ id: saved.id, points: payload.points, layer: strokeLayer });
          })
          .catch(err => {
            alert('Failed to save drawing: ' + err.message);
            if (strokeLayer) strokeLayer.remove();
          });
      } else if (strokeLayer) {
        strokeLayer.remove();
      }
    }

    function distToSegment(p, a, b) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      let t = len2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    }

    function onMapClickErase(e) {
      if (!eraseMode) return;
      const px = map.latLngToContainerPoint(e.latlng);
      let best = null, bestD = 30;
      const strokes = drawingStrokes.length > 0 ? drawingStrokes : drawings.map(d => ({ id: d.id, points: d.points }));
      strokes.forEach(st => {
        const pts = st.points;
        for (let i = 0; i < pts.length - 1; i++) {
          const a = map.latLngToContainerPoint([pts[i][0], pts[i][1]]);
          const b = map.latLngToContainerPoint([pts[i + 1][0], pts[i + 1][1]]);
          const d = distToSegment(px, a, b);
          if (d < bestD) { bestD = d; best = st; }
        }
      });
      if (best) deleteDrawing(best.id);
    }

    async function deleteDrawing(id) {
      try {
        await api('/drawings/' + id, { method: 'DELETE' });
      } catch (e) {
        alert('Failed to erase: ' + e.message);
      }
      drawings = drawings.filter(d => d.id !== id);
      const st = drawingStrokes.find(s => s.id === id);
      if (st && st.layer) drawLayer.removeLayer(st.layer);
      drawingStrokes = drawingStrokes.filter(s => s.id !== id);
    }

    async function clearDrawings() {
      if (drawings.length === 0) return;
      try {
        await api('/drawings', { method: 'DELETE' });
      } catch (e) {
        alert('Failed to clear drawings: ' + e.message);
      }
      drawings = [];
      renderDrawings();
    }

    function createBlipIcon(category, blip) {
      const color = category?.color || '#ffffff';
      const iconName = (blip && blip.icon) || category?.icon || 'marker';
      const rotation = parseFloat(blip && blip.rotation) || 0;
      const svg = ICON_SVG[iconName] || ICON_SVG.marker;
      const rotate = rotation ? ' rotate(' + rotation + 'deg)' : '';

      const iconHtml = `
        <div style="
          width: 30px; height: 30px;
          background: ${color};
          border: 2px solid #0b0d10;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.45);
          transform: translate(-50%, -50%)${rotate};
        ">
          ${svg.replace('currentColor', '#0b0d10').replace('<svg', '<svg width="16" height="16"')}
        </div>
      `;

      return L.divIcon({
        html: iconHtml,
        className: 'custom-blip-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
      });
    }

    function blipMatchesCategory(b) {
      const matchesCat = !categoryFilter || String(b.category_id) === String(categoryFilter);
      const matchesMap = (b.map_context || 'los_santos') === currentMap;
      return matchesCat && matchesMap;
    }

    function renderBlips(filter = '') {
      blipLayer.clearLayers();
      const filtered = blips.filter(b =>
        (b.name.toLowerCase().includes(filter.toLowerCase()) ||
        (b.description || '').toLowerCase().includes(filter.toLowerCase())) &&
        blipMatchesCategory(b)
      );

      filtered.forEach(blip => {
        const category = categories.find(c => c.id === blip.category_id);
        const marker = L.marker([blip.latitude, blip.longitude], {
          icon: createBlipIcon(category, blip),
          draggable: true
        }).addTo(blipLayer);

        marker.bindPopup(`
          <strong>${escapeHtml(blip.name)}</strong><br/>
          ${category ? `<span style="color:${category.color}">●</span> ${escapeHtml(category.name)}<br/>` : ''}
          ${blip.description ? `<em style="white-space:pre-line">${escapeHtml(blip.description)}</em><br/>` : ''}
          <small style="color:#8a93a0">Y: ${blip.latitude.toFixed(2)} &middot; X: ${blip.longitude.toFixed(2)}</small>
        `);

        marker.on('click', () => selectBlip(blip.id));
        marker.on('dragend', async () => {
          const pos = marker.getLatLng();
          try {
            await api('/blips/' + blip.id, { method: 'PUT', body: JSON.stringify({
              name: blip.name,
              description: blip.description || '',
              latitude: pos.lat,
              longitude: pos.lng,
              category_id: blip.category_id || null,
              map_context: blip.map_context || 'los_santos'
            })});
            blip.latitude = pos.lat;
            blip.longitude = pos.lng;
          } catch (e) {
            alert('Failed to move blip: ' + e.message);
            loadData();
          }
        });
        marker._blipId = blip.id;
      });

      renderBlipList(filter);
      updateStats();
    }

    function renderBlipList(filter = '') {
      const list = document.getElementById('blipList');
      const filtered = blips.filter(b =>
        (b.name.toLowerCase().includes(filter.toLowerCase()) ||
        (b.description || '').toLowerCase().includes(filter.toLowerCase())) &&
        blipMatchesCategory(b)
      ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state">No blips found</div>';
        return;
      }

      list.innerHTML = filtered.map(blip => {
        const category = categories.find(c => c.id === blip.category_id);
        const iconName = blip.icon || category?.icon || 'marker';
        const iconSvg = ICON_SVG[iconName] || ICON_SVG.marker;
        const color = category?.color || '#ffffff';
        const isSelected = blip.id === selectedBlipId;

        return `
          <div class="blip-item ${isSelected ? 'selected' : ''}" data-id="${blip.id}">
            <div class="blip-icon" style="background: ${color}">
              ${iconSvg.replace('currentColor', '#0b0d10').replace('<svg', '<svg width="14" height="14"')}
            </div>
            <div class="blip-info">
              <div class="blip-name">${escapeHtml(blip.name)}</div>
              <div class="blip-category">${category ? escapeHtml(category.name) : 'No category'}</div>
              ${blip.description ? `<div class="blip-desc">${escapeHtml(blip.description)}</div>` : ''}
            </div>
            <div class="blip-actions">
              <button class="btn-icon" onclick="event.stopPropagation(); editBlip(${blip.id})" title="Edit">${ICON_EDIT}</button>
              <button class="btn-icon delete" onclick="event.stopPropagation(); deleteBlip(${blip.id})" title="Delete">${ICON_TRASH}</button>
            </div>
          </div>
        `;
      }).join('');

      // Add click handlers
      list.querySelectorAll('.blip-item').forEach(item => {
        item.addEventListener('click', () => selectBlip(parseInt(item.dataset.id)));
      });
    }

    function selectBlip(id) {
      selectedBlipId = id;
      const blip = blips.find(b => b.id === id);
      if (!blip) return;

      // Center map on blip
      map.setView([blip.latitude, blip.longitude], 1);

      // Open popup
      blipLayer.eachLayer(layer => {
        if (layer._blipId === id) layer.openPopup();
      });

      renderBlipList(document.getElementById('searchInput').value);
    }

    function renderCategories() {
      const list = document.getElementById('categoryList');
      if (categories.length === 0) {
        list.innerHTML = '<div class="empty-state">No categories yet</div>';
      } else {
        list.innerHTML = categories.map(cat => `
          <div class="category-item" data-id="${cat.id}">
            <div class="category-color" style="background: ${cat.color}"></div>
            <span class="category-name">${escapeHtml(cat.name)}</span>
            <span class="category-icon">${ICON_SVG[cat.icon]?.replace('<svg', '<svg width="16" height="16"') || ''}</span>
            <button class="btn-icon" onclick="event.stopPropagation(); editCategory(${cat.id})" title="Edit">${ICON_EDIT}</button>
            <button class="btn-icon delete" onclick="event.stopPropagation(); deleteCategory(${cat.id})" title="Delete">${ICON_TRASH}</button>
          </div>
        `).join('');
      }

      // Update category selects
      const selects = ['blipCategory', 'editBlipCategory'];
      selects.forEach(selId => {
        const sel = document.getElementById(selId);
        const currentVal = sel.value;
        sel.innerHTML = '<option value="">None</option>' + categories.map(c =>
          `<option value="${c.id}">${escapeHtml(c.name)}</option>`
        ).join('');
        sel.value = currentVal;
      });

      // Update category filter dropdown
      const filterSel = document.getElementById('categoryFilter');
      const currentFilter = filterSel.value;
      filterSel.innerHTML = '<option value="">All categories</option>' + categories.map(c =>
        `<option value="${c.id}">${escapeHtml(c.name)}</option>`
      ).join('');
      filterSel.value = currentFilter;
    }

    function updateStats() {
      document.getElementById('statBlips').textContent = blips.length;
      document.getElementById('statCategories').textContent = categories.length;
    }

    function updateCoordDisplay() {
      const center = map.getCenter();
      document.getElementById('coordLat').textContent = center.lat.toFixed(1);
      document.getElementById('coordLng').textContent = center.lng.toFixed(1);
      document.getElementById('coordZoom').textContent = map.getZoom();
    }

    function onMapClick(e) {
      if (addBlipMode) {
        openQuickForm(e.latlng);
      }
    }

    function categoryOptionsHtml(selected = '') {
      return '<option value="">None</option>' + categories.map(c =>
        `<option value="${c.id}" ${String(c.id) === String(selected) ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
      ).join('');
    }

    function iconOptionsHtml() {
      return Object.keys(ICON_SVG).map(k =>
        `<option value="${k}">${k.replace(/_/g, ' ')}</option>`
      ).join('');
    }

    async function wireNewCategory(cfg) {
      const btn = document.getElementById(cfg.btnId);
      const form = document.getElementById(cfg.formId);
      btn.addEventListener('click', () => {
        form.style.display = form.style.display === 'none' ? 'flex' : 'none';
      });
      document.getElementById(cfg.cancelId).addEventListener('click', () => {
        form.style.display = 'none';
      });
      document.getElementById(cfg.saveId).addEventListener('click', async () => {
        const name = document.getElementById(cfg.nameId).value.trim();
        if (!name) return alert('Category name is required');
        const color = document.getElementById(cfg.colorId).value;
        const icon = document.getElementById(cfg.iconId).value;
        try {
          const cat = await api('/categories', { method: 'POST', body: JSON.stringify({ name, color, icon }) });
          categories = await api('/categories');
          document.getElementById(cfg.selectId).innerHTML = categoryOptionsHtml(cat.id);
          renderCategories();
          document.getElementById(cfg.nameId).value = '';
          form.style.display = 'none';
        } catch (e) {
          alert('Failed to add category: ' + e.message);
        }
      });
    }

    let quickLat = null, quickLng = null, quickMarker = null;
    let quickIcon = '', quickRotation = 0;
    let editIcon = '', editRotation = 0;

    function initIconPicker(containerId, selected, onPick) {
      const box = document.getElementById(containerId);
      if (!box) return;
      box.innerHTML = Object.keys(ICON_SVG).map(k => {
        const svg = ICON_SVG[k].replace('currentColor', '#0b0d10').replace('<svg', '<svg width="16" height="16"');
        return `<button type="button" class="icon-opt ${k === selected ? 'selected' : ''}" data-icon="${k}" title="${k.replace(/_/g, ' ')}">${svg}</button>`;
      }).join('');
      box.querySelectorAll('.icon-opt').forEach(b => b.addEventListener('click', () => {
        box.querySelectorAll('.icon-opt').forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
        onPick(b.dataset.icon);
      }));
    }

    function updateQuickMarker() {
      if (!quickMarker) return;
      quickMarker.setIcon(createBlipIcon(null, { icon: quickIcon, rotation: quickRotation }));
    }

    function openQuickForm(latlng) {
      quickLat = latlng.lat;
      quickLng = latlng.lng;
      quickIcon = '';
      quickRotation = 0;

      if (quickMarker) quickMarker.remove();
      quickMarker = L.marker(latlng, {
        icon: createBlipIcon(null, {}),
        interactive: false
      }).addTo(map);

      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div class="quick-form">
          <div class="quick-form-title">Add blip &middot; Y ${latlng.lat.toFixed(2)}, X ${latlng.lng.toFixed(2)}</div>
          <input type="text" id="quickName" placeholder="Name *" />
          <textarea id="quickDesc" rows="2" placeholder="Description (optional)"></textarea>
          <div class="cat-field">
            <select id="quickCategory">${categoryOptionsHtml()}</select>
            <button type="button" class="btn-new-cat" id="quickNewCat">+ New</button>
          </div>
          <div class="new-cat-form" id="quickNewCatForm">
            <input type="text" id="quickCatName" placeholder="New category name" />
            <div class="new-cat-row">
              <input type="color" id="quickCatColor" value="#d4af37" title="Category color" />
              <select id="quickCatIcon">${iconOptionsHtml()}</select>
            </div>
            <div class="new-cat-actions">
              <button class="btn btn-primary" id="quickCatSave">Add</button>
              <button class="btn btn-secondary" id="quickCatCancel">Cancel</button>
            </div>
          </div>
          <label>Icon</label>
          <div class="icon-picker" id="quickIconPicker"></div>
          <label>Angle <span id="quickAngleVal">0&deg;</span></label>
          <input type="range" id="quickAngle" min="0" max="359" value="0" />
          <div class="quick-actions">
            <button class="btn btn-primary" id="quickSave">Save</button>
            <button class="btn btn-secondary" id="quickCancel">Cancel</button>
          </div>
        </div>`;
      const content = wrap.firstElementChild;

      const popup = L.popup({ autoPan: true, maxWidth: 280, closeButton: true })
        .setLatLng(latlng)
        .setContent(content)
        .openOn(map);

      popup.on('remove', () => {
        if (quickMarker) { quickMarker.remove(); quickMarker = null; }
      });

      document.getElementById('quickName').focus();
      document.getElementById('quickSave').addEventListener('click', saveQuickBlip);
      document.getElementById('quickCancel').addEventListener('click', closeQuickForm);
      wireNewCategory({
        selectId: 'quickCategory',
        nameId: 'quickCatName',
        colorId: 'quickCatColor',
        iconId: 'quickCatIcon',
        saveId: 'quickCatSave',
        cancelId: 'quickCatCancel',
        formId: 'quickNewCatForm',
        btnId: 'quickNewCat'
      });
      initIconPicker('quickIconPicker', '', (icon) => {
        quickIcon = icon;
        updateQuickMarker();
      });
      const angleInput = document.getElementById('quickAngle');
      const angleVal = document.getElementById('quickAngleVal');
      angleInput.addEventListener('input', () => {
        quickRotation = parseInt(angleInput.value) || 0;
        angleVal.textContent = quickRotation + '\u00b0';
        updateQuickMarker();
      });
    }

    function closeQuickForm() {
      map.closePopup();
      if (quickMarker) { quickMarker.remove(); quickMarker = null; }
      quickLat = quickLng = null;
    }

    async function saveQuickBlip() {
      const name = document.getElementById('quickName').value.trim();
      if (!name) return alert('Name is required');
      try {
        await api('/blips', { method: 'POST', body: JSON.stringify({
          name,
          description: document.getElementById('quickDesc').value.trim(),
          latitude: quickLat,
          longitude: quickLng,
          category_id: document.getElementById('quickCategory').value || null,
          icon: quickIcon || null,
          rotation: quickRotation,
          map_context: currentMap
        })});
        closeQuickForm();
        addBlipMode = false;
        document.getElementById('btnAddBlip').classList.remove('active');
        document.getElementById('btnAddBlip').title = 'Add blip at center';
        loadData();
      } catch (e) {
        alert('Failed to save: ' + e.message);
      }
    }

    // API functions - localStorage fallback when no backend
    var MAP_API_BASE = window.MAP_API_BASE || '';
    var LS_KEY = 'rhmc_map_';
    function lsGet(k) { try { return JSON.parse(localStorage.getItem(LS_KEY + k)) || []; } catch(e) { return []; } }
    function lsSet(k, v) { localStorage.setItem(LS_KEY + k, JSON.stringify(v)); }
    var nextId = { blips: 100, categories: 100, drawings: 100 };
    function lsNextId(type) {
      var items = lsGet(type);
      var max = 0;
      items.forEach(function(i) { if (i.id > max) max = i.id; });
      return Math.max(max + 1, nextId[type]++);
    }

    async function api(endpoint, options) {
      if (MAP_API_BASE) {
        try {
          var res = await fetch(MAP_API_BASE + '/api' + endpoint, {
            headers: { 'Content-Type': 'application/json' },
            ...(options || {})
          });
          if (!res.ok) throw new Error(await res.text());
          return res.json();
        } catch(e) { /* fall through to localStorage */ }
      }
      return lsApi(endpoint, options);
    }

    function lsApi(endpoint, options) {
      var method = (options && options.method) || 'GET';
      var body = options && options.body ? JSON.parse(options.body) : null;
      var parts = endpoint.replace(/^\//, '').split('/');
      var resource = parts[0];
      var id = parts[1] ? parseInt(parts[1]) : null;

      if (resource === 'blips') {
        var items = lsGet('blips');
        if (method === 'GET' && !id) {
          var cat = new URLSearchParams(endpoint.split('?')[1]).get('category');
          var result = items;
          if (cat) result = result.filter(function(b) { return b.category_id === parseInt(cat); });
          return Promise.resolve(result);
        }
        if (method === 'GET' && id) {
          return Promise.resolve(items.find(function(b) { return b.id === id; }) || null);
        }
        if (method === 'POST') {
          var blip = Object.assign({ id: lsNextId('blips'), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, body);
          items.push(blip);
          lsSet('blips', items);
          return Promise.resolve(blip);
        }
        if (method === 'PUT' && id) {
          var idx = items.findIndex(function(b) { return b.id === id; });
          if (idx !== -1) { items[idx] = Object.assign(items[idx], body, { updated_at: new Date().toISOString() }); }
          lsSet('blips', items);
          return Promise.resolve(items[idx]);
        }
        if (method === 'DELETE' && id) {
          lsSet('blips', items.filter(function(b) { return b.id !== id; }));
          return Promise.resolve({ success: true });
        }
      }

      if (resource === 'categories') {
        var cats = lsGet('categories');
        if (method === 'GET' && !id) return Promise.resolve(cats);
        if (method === 'GET' && id) return Promise.resolve(cats.find(function(c) { return c.id === id; }) || null);
        if (method === 'POST') {
          var cat2 = Object.assign({ id: lsNextId('categories') }, body);
          cats.push(cat2);
          lsSet('categories', cats);
          return Promise.resolve(cat2);
        }
        if (method === 'PUT' && id) {
          var ci = cats.findIndex(function(c) { return c.id === id; });
          if (ci !== -1) cats[ci] = Object.assign(cats[ci], body);
          lsSet('categories', cats);
          return Promise.resolve(cats[ci]);
        }
        if (method === 'DELETE' && id) {
          lsSet('categories', cats.filter(function(c) { return c.id !== id; }));
          return Promise.resolve({ success: true });
        }
      }

      if (resource === 'drawings') {
        var drs = lsGet('drawings');
        if (method === 'GET') return Promise.resolve(drs);
        if (method === 'POST') {
          var dr = Object.assign({ id: lsNextId('drawings'), created_at: new Date().toISOString() }, body);
          drs.push(dr);
          lsSet('drawings', drs);
          return Promise.resolve(dr);
        }
        if (method === 'DELETE' && id) {
          lsSet('drawings', drs.filter(function(d) { return d.id !== id; }));
          return Promise.resolve({ success: true });
        }
        if (method === 'DELETE' && !id) {
          lsSet('drawings', []);
          return Promise.resolve({ success: true });
        }
      }

      if (resource === 'export' && method === 'GET') {
        return Promise.resolve({ blips: lsGet('blips'), categories: lsGet('categories'), exportedAt: new Date().toISOString() });
      }
      if (resource === 'import' && method === 'POST') {
        var data = body || {};
        var cats2 = lsGet('categories');
        var blips2 = lsGet('blips');
        if (data.categories) data.categories.forEach(function(c) {
          if (!cats2.find(function(e) { return e.name === c.name; })) cats2.push(Object.assign({ id: lsNextId('categories') }, c));
        });
        if (data.blips) data.blips.forEach(function(b) {
          blips2.push(Object.assign({ id: lsNextId('blips'), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, b));
        });
        lsSet('categories', cats2);
        lsSet('blips', blips2);
        return Promise.resolve({ success: true, imported: (data.blips || []).length });
      }

      if (resource === 'search') {
        var all = lsGet('blips');
        var q = (parts[1] || '').toLowerCase();
        return Promise.resolve(all.filter(function(b) {
          return b.name.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q);
        }));
      }

      return Promise.reject(new Error('Unknown endpoint: ' + endpoint));
    }

    async function loadData() {
      try {
        [blips, categories] = await Promise.all([
          api('/blips'),
          api('/categories')
        ]);
        try {
          drawings = await api('/drawings');
        } catch (e) {
          drawings = [];
        }
        renderBlips();
        renderCategories();
        renderDrawings();
      } catch (e) {
        console.error('Failed to load data:', e);
      }
    }

    // Blip CRUD
    function showBlipForm(blip = null) {
      document.getElementById('blipForm').style.display = blip ? 'none' : 'block';
      document.getElementById('blipEditForm').style.display = blip ? 'block' : 'none';

      if (blip) {
        editingBlipId = blip.id;
        document.getElementById('editBlipId').value = blip.id;
        document.getElementById('editBlipName').value = blip.name;
        document.getElementById('editBlipDesc').value = blip.description || '';
        document.getElementById('editBlipLat').value = blip.latitude;
        document.getElementById('editBlipLng').value = blip.longitude;
        document.getElementById('editBlipCategory').value = blip.category_id || '';
        editIcon = blip.icon || '';
        editRotation = parseFloat(blip.rotation) || 0;
        initIconPicker('editIconPicker', editIcon, (icon) => { editIcon = icon; });
        const ea = document.getElementById('editAngle');
        const ev = document.getElementById('editAngleVal');
        ea.value = editRotation;
        ev.textContent = editRotation + '\u00b0';
        ea.oninput = () => {
          editRotation = parseInt(ea.value) || 0;
          ev.textContent = editRotation + '\u00b0';
        };
      } else {
        editingBlipId = null;
        editIcon = '';
        editRotation = 0;
        document.getElementById('blipName').value = '';
        document.getElementById('blipDesc').value = '';
        document.getElementById('blipLat').value = map.getCenter().lat.toFixed(2);
        document.getElementById('blipLng').value = map.getCenter().lng.toFixed(2);
        document.getElementById('blipCategory').value = '';
      }
    }

    async function saveBlip() {
      const name = document.getElementById('blipName').value.trim();
      if (!name) return alert('Name is required');

      const blip = {
        name,
        description: document.getElementById('blipDesc').value.trim(),
        latitude: parseFloat(document.getElementById('blipLat').value),
        longitude: parseFloat(document.getElementById('blipLng').value),
        category_id: document.getElementById('blipCategory').value || null,
        map_context: currentMap
      };

      try {
        await api('/blips', { method: 'POST', body: JSON.stringify(blip) });
        showBlipForm();
        loadData();
      } catch (e) {
        alert('Failed to save: ' + e.message);
      }
    }

    async function updateBlip() {
      const name = document.getElementById('editBlipName').value.trim();
      if (!name) return alert('Name is required');

      const blip = {
        name,
        description: document.getElementById('editBlipDesc').value.trim(),
        latitude: parseFloat(document.getElementById('editBlipLat').value),
        longitude: parseFloat(document.getElementById('editBlipLng').value),
        category_id: document.getElementById('editBlipCategory').value || null,
        icon: editIcon || null,
        rotation: editRotation,
        map_context: currentMap
      };

      try {
        await api('/blips/' + editingBlipId, { method: 'PUT', body: JSON.stringify(blip) });
        showBlipForm();
        loadData();
      } catch (e) {
        alert('Failed to update: ' + e.message);
      }
    }

    async function deleteBlip(id) {
      if (!confirm('Delete this blip?')) return;
      try {
        await api('/blips/' + id, { method: 'DELETE' });
        if (selectedBlipId === id) selectedBlipId = null;
        loadData();
      } catch (e) {
        alert('Failed to delete: ' + e.message);
      }
    }

    function editBlip(id) {
      const blip = blips.find(b => b.id === id);
      if (blip) showBlipForm(blip);
    }

    // Category CRUD
    async function addCategory() {
      const name = document.getElementById('catName').value.trim();
      const color = document.getElementById('catColor').value;
      const icon = document.getElementById('catIcon').value;

      if (!name) return alert('Name is required');

      try {
        await api('/categories', { method: 'POST', body: JSON.stringify({ name, color, icon }) });
        document.getElementById('catName').value = '';
        loadData();
      } catch (e) {
        alert('Failed to add category: ' + e.message);
      }
    }

    async function editCategory(id) {
      const cat = categories.find(c => c.id === id);
      if (!cat) return;

      const name = prompt('Category name:', cat.name);
      if (!name) return;

      const color = prompt('Color (hex):', cat.color);
      if (!color) return;

      const icon = prompt('Icon (marker/star/diamond/car/crosshairs/home/gamepad/circle/flag/skull/crown):', cat.icon);
      if (!icon) return;

      try {
        await api('/categories/' + id, { method: 'PUT', body: JSON.stringify({ name, color, icon }) });
        loadData();
      } catch (e) {
        alert('Failed to update: ' + e.message);
      }
    }

    async function deleteCategory(id) {
      if (!confirm('Delete this category? Blips will be unassigned.')) return;
      try {
        await api('/categories/' + id, { method: 'DELETE' });
        loadData();
      } catch (e) {
        alert('Failed to delete: ' + e.message);
      }
    }

    // Import/Export
    async function exportData() {
      try {
        const data = await api('/export');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gta-blips-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        alert('Export failed: ' + e.message);
      }
    }

    function handleImportFile(e) {
      document.getElementById('btnImport').disabled = !e.target.files.length;
    }

    async function importData() {
      const file = document.getElementById('importFile').files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await api('/import', { method: 'POST', body: JSON.stringify(data) });
        document.getElementById('importFile').value = '';
        document.getElementById('btnImport').disabled = true;
        loadData();
      } catch (e) {
        alert('Import failed: ' + e.message);
      }
    }

    async function clearAll() {
      if (!confirm('Delete ALL blips? This cannot be undone!')) return;
      if (!confirm('Are you REALLY sure?')) return;

      try {
        for (const blip of blips) {
          await api('/blips/' + blip.id, { method: 'DELETE' });
        }
        selectedBlipId = null;
        loadData();
      } catch (e) {
        alert('Failed to clear: ' + e.message);
      }
    }

    // Search
    let searchDebounce;
    function onSearch(e) {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        renderBlips(e.target.value);
        const filter = e.target.value.toLowerCase();
        if (filter.length > 0) {
          const match = blips.find(b =>
            b.name.toLowerCase().includes(filter) ||
            (b.description || '').toLowerCase().includes(filter)
          );
          if (match && (match.map_context || 'los_santos') === currentMap) {
            map.setView([match.latitude, match.longitude], Math.max(map.getZoom(), 0), { animate: true });
            blipLayer.eachLayer(layer => {
              if (layer._blipId === match.id) {
                const el = layer.getElement();
                if (el) { el.classList.add('blip-highlight'); setTimeout(() => el.classList.remove('blip-highlight'), 3000); }
              }
            });
          }
        }
      }, 150);
    }

    // Theme toggle
    function toggleTheme() {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      localStorage.setItem('mapTheme', isLight ? 'light' : 'dark');
    }

    // Sidebar toggle
    function toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      sidebar.classList.toggle('collapsed');
      const collapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('sidebarCollapsed', collapsed);
      setTimeout(() => map.invalidateSize(), 350);
    }

    // Undo last drawing
    async function undoLastDrawing() {
      if (drawings.length === 0) return;
      const last = drawings[drawings.length - 1];
      await deleteDrawing(last.id);
    }

    // Export map as image
    function exportMapAsImage() {
      const mapEl = document.getElementById('map');
      if (window.html2canvas) {
        html2canvas(mapEl, { useCORS: true, scale: 2 }).then(c => {
          const a = document.createElement('a');
          a.download = `gta-map-${currentMap}-${Date.now()}.png`;
          a.href = c.toDataURL('image/png');
          a.click();
        });
      } else {
        alert('Image export is loading, please try again in a moment.');
      }
    }

    // Map switch with smooth transition
    function switchMap(mapId) {
      if (currentMap === mapId) return;
      const mapEl = document.getElementById('map');
      mapEl.style.opacity = '0';
      mapEl.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        try {
          currentMap = mapId;
          document.querySelectorAll('.map-switcher-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.map === mapId);
          });
          currentLayer = 'atlas';
          const atlasRadio = document.querySelector('input[name="layer"][value="atlas"]');
          if (atlasRadio) atlasRadio.checked = true;
          syncLayerUI();
          const cfg = MAP_CONFIGS[currentMap];
          map.setMinZoom(-3);
          map.setMaxZoom(2);
          addMapImage();
          map.fitBounds(cfg.bounds);
          if (map._gridOverlay) {
            map.removeLayer(map._gridOverlay);
            map._gridOverlay = null;
            updateGrid();
          }
          renderBlips(document.getElementById('searchInput').value);
          updateCoordDisplay();
        } catch(e) { console.error('switchMap error:', e); }
        mapEl.style.opacity = '1';
      }, 300);
    }

    // Tabs
    function switchTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
      document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tab));
    }

    // Map controls
    function locateMe() {
      map.fitBounds(MAP_CONFIGS[currentMap].bounds);
    }

    function toggleAddBlip() {
      addBlipMode = !addBlipMode;
      document.getElementById('btnAddBlip').classList.toggle('active', addBlipMode);
      if (addBlipMode) {
        document.getElementById('btnAddBlip').title = 'Click map to place blip (click button again to cancel)';
        if (drawMode) setDrawMode(false);
        if (eraseMode) setEraseMode(false);
      } else {
        document.getElementById('btnAddBlip').title = 'Add blip at center';
        closeQuickForm();
      }
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Event listeners
    document.addEventListener('DOMContentLoaded', () => {
      initMap();

      // Restore theme from localStorage
      if (localStorage.getItem('mapTheme') === 'light') document.body.classList.add('light-theme');

      // Restore sidebar from localStorage
      if (localStorage.getItem('sidebarCollapsed') === 'true') document.getElementById('sidebar').classList.add('collapsed');

      // Tabs
      document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

      // Search
      document.getElementById('searchInput').addEventListener('input', onSearch);

      // Category filter
      document.getElementById('categoryFilter').addEventListener('change', e => {
        categoryFilter = e.target.value;
        renderBlips(document.getElementById('searchInput').value);
      });

      // Draw control
      initDrawControl();

      // Blip form
      document.getElementById('btnSaveBlip').addEventListener('click', saveBlip);
      document.getElementById('btnCancelBlip').addEventListener('click', () => showBlipForm());
      document.getElementById('btnUpdateBlip').addEventListener('click', updateBlip);
      document.getElementById('btnCancelEdit').addEventListener('click', () => showBlipForm());
      document.getElementById('btnDeleteBlip').addEventListener('click', () => deleteBlip(editingBlipId));

      // Categories
      document.getElementById('btnAddCategory').addEventListener('click', addCategory);
      ['blip', 'edit'].forEach(prefix => wireNewCategory({
        selectId: prefix + 'BlipCategory',
        nameId: prefix + 'CatName',
        colorId: prefix + 'CatColor',
        iconId: prefix + 'CatIcon',
        saveId: prefix + 'CatSave',
        cancelId: prefix + 'CatCancel',
        formId: prefix + 'NewCatForm',
        btnId: prefix + 'NewCat'
      }));

      // Import/Export
      document.getElementById('btnExport').addEventListener('click', exportData);
      document.getElementById('importFile').addEventListener('change', handleImportFile);
      document.getElementById('btnImport').addEventListener('click', importData);
      document.getElementById('btnClearAll').addEventListener('click', clearAll);

      // Map controls
      document.getElementById('btnLocate').addEventListener('click', locateMe);
      document.getElementById('btnAddBlip').addEventListener('click', toggleAddBlip);
      document.getElementById('btnFullscreen').addEventListener('click', toggleFullscreen);

      // Theme toggle
      document.getElementById('btnTheme').addEventListener('click', toggleTheme);

      // Sidebar toggle
      document.getElementById('btnSidebarToggle').addEventListener('click', toggleSidebar);

      // Undo / Export
      document.getElementById('btnUndoDraw').addEventListener('click', undoLastDrawing);
      document.getElementById('btnExportImg').addEventListener('click', exportMapAsImage);

      // Map switcher
      document.querySelectorAll('.map-switcher-btn').forEach(btn => {
        btn.addEventListener('click', () => switchMap(btn.dataset.map));
      });

      // Layer control
      document.querySelectorAll('input[name="layer"]').forEach(r => {
        r.addEventListener('change', updateTileLayer);
      });
      document.getElementById('gridToggle').addEventListener('change', updateGrid);

      // Enter key in forms
      document.querySelectorAll('input, textarea').forEach(el => {
        el.addEventListener('keydown', e => {
          if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (document.getElementById('blipForm').style.display !== 'none') saveBlip();
            else if (document.getElementById('blipEditForm').style.display !== 'none') updateBlip();
          }
        });
      });

      // Esc cancels the quick-add form / placement mode
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          if (map.getContainer().querySelector('.leaflet-popup')) closeQuickForm();
          addBlipMode = false;
          document.getElementById('btnAddBlip').classList.remove('active');
          document.getElementById('btnAddBlip').title = 'Add blip at center';
        }
      });

      // Make layer control draggable
      (function() {
        var lc = document.querySelector('.layer-control');
        if (!lc) return;
        var dragging = false, startX, startY, origLeft, origTop;
        lc.style.cursor = 'grab';
        lc.addEventListener('mousedown', function(e) {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL' || e.target.closest('label')) return;
          dragging = true;
          startX = e.clientX;
          startY = e.clientY;
          origLeft = lc.offsetLeft;
          origTop = lc.offsetTop;
          lc.style.cursor = 'grabbing';
          e.preventDefault();
        });
        document.addEventListener('mousemove', function(e) {
          if (!dragging) return;
          var dx = e.clientX - startX;
          var dy = e.clientY - startY;
          lc.style.left = (origLeft + dx) + 'px';
          lc.style.top = (origTop + dy) + 'px';
          lc.style.right = 'auto';
        });
        document.addEventListener('mouseup', function() {
          if (dragging) { dragging = false; lc.style.cursor = 'grab'; }
        });
      })();
    });
})();
