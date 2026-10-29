import { escapeHtml } from './club-formatting.mjs';
import { groupWardSessions, renderWardClubList } from './map-zone-results.mjs?v=20261028-club-number-column';
import { attachSmoothWheelZoom } from '../vendor/leaflet-smooth-wheel-zoom/smooth-wheel-zoom.mjs';

/* One reach zone illustrates the same straight-line radius used by the calendar. */
export function createReachMap(element, status) {
  let map = null;
  let reachLayer = null;
  let wardLayer = null;
  let hoverLayer = null;
  let hoveredWard = null;
  let wards = null;
  let wardRequest = null;
  const wardRecords = new Map();
  const emptyClubs = new Map();
  const greyStyle = { color:'#737773', weight:.75, fillColor:'#777d77', fillOpacity:.24, smoothFactor:1 };
  const greenStyle = { color:'#527000', weight:1.5, fillColor:'#b5e61d', fillOpacity:.296875, smoothFactor:1 };
  const resultPanel = element.querySelector('[data-zone-results]');
  const resultTitle = resultPanel?.querySelector('[data-zone-title]');
  const resultList = resultPanel?.querySelector('[data-zone-clubs]');
  let selectedWard = null;
  const mobileSheet = matchMedia('(max-width: 800px)');
  const sheetHandle = resultPanel?.querySelector('[data-zone-handle]');
  let collapsedHeight = 0;
  let sheetExpanded = false;
  function sizeSheet(expanded = sheetExpanded) {
    if (!resultPanel || resultPanel.hidden || !mobileSheet.matches) return;
    const items = [...resultList.querySelectorAll('.map-zone-clubs > li')].slice(0, 3);
    // Measure actual wrapped entries so the resting sheet shows three clubs when space permits.
    collapsedHeight = Math.min(element.clientHeight, 24 + resultPanel.querySelector('.map-zone-heading').offsetHeight
      + items.reduce((sum, item) => sum + item.offsetHeight, 0) + 42);
    if (!items.length) collapsedHeight = Math.min(element.clientHeight, 160);
    setSheetHeight(expanded ? element.clientHeight : collapsedHeight);
  }
  function setSheetHeight(height) {
    const value = Math.min(element.clientHeight, Math.max(collapsedHeight, height));
    resultPanel.style.setProperty('--zone-sheet-height', `${value}px`);
    sheetExpanded = value >= element.clientHeight - 1;
    sheetHandle.setAttribute('aria-expanded', String(sheetExpanded));
    sheetHandle.setAttribute('aria-label', sheetExpanded ? 'Collapse club panel' : 'Expand club panel');
  }
  // Pointer capture keeps dragging on the handle; the club list retains ordinary touch scrolling.
  let sheetDrag = null;
  let suppressHandleClick = false;
  sheetHandle?.addEventListener('pointerdown', event => {
    if (!mobileSheet.matches || event.button !== 0) return;
    sheetDrag = { id:event.pointerId, y:event.clientY, height:resultPanel.offsetHeight };
    suppressHandleClick = false;
    sheetHandle.setPointerCapture(event.pointerId);
  });
  sheetHandle?.addEventListener('pointermove', event => {
    if (!sheetDrag || event.pointerId !== sheetDrag.id) return;
    const delta = sheetDrag.y - event.clientY;
    if (Math.abs(delta) > 4) suppressHandleClick = true;
    setSheetHeight(sheetDrag.height + delta);
  });
  function finishSheetDrag(event) {
    if (!sheetDrag || event.pointerId !== sheetDrag.id) return;
    sheetDrag = null;
    centreWard(wardRecords.get(selectedWard));
  }
  sheetHandle?.addEventListener('pointerup', finishSheetDrag);
  sheetHandle?.addEventListener('pointercancel', finishSheetDrag);
  sheetHandle?.addEventListener('click', () => {
    if (suppressHandleClick) { suppressHandleClick = false; return; }
    sizeSheet(!sheetExpanded);
    centreWard(wardRecords.get(selectedWard));
  });
  function centreWard(record, animate = true) {
    if (!map || !record) return;
    const size = map.getSize();
    // offsetWidth measures the drawer's final width, even while it slides in from offscreen.
    const rightInset = resultPanel && !resultPanel.hidden && !mobileSheet.matches ? resultPanel.offsetWidth : 0;
    const uncoveredRight = Math.max(0, size.x - rightInset);
    const filters = element.parentElement.querySelector('[data-map-filters]');
    let leftInset = 0;
    if (filters && getComputedStyle(filters).position === 'absolute') {
      leftInset = Math.max(0, filters.getBoundingClientRect().right - element.getBoundingClientRect().left);
    }
    leftInset = Math.min(leftInset, Math.max(0, uncoveredRight - 24));
    const bottomInset = resultPanel && !resultPanel.hidden && mobileSheet.matches ? resultPanel.offsetHeight : 0;
    if (size.y - bottomInset < 24) return; // A fully expanded sheet leaves no map area to centre within.
    const visibleCentre = window.L.point((leftInset + uncoveredRight) / 2, (size.y - bottomInset) / 2);
    const projectedWard = map.project(record.bounds.getCenter(), map.getZoom());
    const cameraCentre = projectedWard.add(size.divideBy(2).subtract(visibleCentre));
    const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches
      || document.documentElement.classList.contains('a11y-reduce-motion');
    // Pan once at the existing zoom; changing result text must not keep moving the visitor's map.
    map.panTo(map.unproject(cameraCentre, map.getZoom()), { animate:animate && !reduced, duration:.18 });
  }
  function openWard(record, focus = false, recenter = true) {
    if (!resultPanel) return;
    const previous = wardRecords.get(selectedWard);
    selectedWard = record.feature.properties.code;
    // Keep the panel heading to the selected zone; full place names remain on map targets.
    resultTitle.textContent = record.feature.properties.name;
    resultList.innerHTML = renderWardClubList(record.clubs);
    resultPanel.hidden = false;
    sizeSheet(previous !== record ? false : sheetExpanded);
    if (previous) syncWardTarget(previous);
    syncWardTarget(record);
    if (recenter) centreWard(record);
    if (focus) resultTitle.focus({ preventScroll: true });
  }
  function closeWard(restoreFocus = true) {
    const previous = wardRecords.get(selectedWard);
    selectedWard = null;
    if (resultPanel) resultPanel.hidden = true;
    sheetExpanded = false;
    if (previous) {
      syncWardTarget(previous);
      if (restoreFocus) previous.layer.getElement()?.focus({ preventScroll: true });
    }
  }
  resultPanel?.querySelector('[data-close-zone]').addEventListener('click', () => closeWard());
  // Adding or removing sports dismisses the previous area's results without stealing filter focus.
  window.addEventListener('0161-map-sports-input', () => closeWard(false));
  resultPanel?.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    closeWard();
  });
  let snapshot = null;
  let visible = false;
  let zoneKey = null;
  let requestedWard = null;
  let overviewRequested = false;
  let overviewBounds = null;
  // Sport-list selections reset only the camera; postcode, radius and other filters remain applied.
  window.addEventListener('0161-map-overview-request', () => {
    overviewRequested = true;
    if (visible && map && wardRecords.size) drawContext();
    else if (visible) draw();
  });
  function selectWard(code) {
    // A retro-map link opens the ward's information; only matching club data controls its colour.
    requestedWard = code;
    if (visible) draw();
  }
  function initialise() {
    if (map || !visible) return Boolean(map);
    const L = window.L;
    if (!L) {
      status.hidden = false;
      status.textContent = 'The map could not load. Use the calendar below.';
      return false;
    }
    // Ordinary interactions stay still; selecting a zone uses only one short pan at the current zoom.
    map = L.map(element, { scrollWheelZoom:false, doubleClickZoom:false, zoomAnimation:false,
      fadeAnimation:false, markerZoomAnimation:false, inertia:false, boxZoom:false,
      minZoom:8, maxZoom:16, zoomDelta:.5, zoomSnap:0, smoothSensitivity:1, attributionControl:false }).setView([53.4808,-2.2426],10);
    map.zoomControl.setPosition('topleft');
    // The menu scrolls independently; clicks and wheel input must not move the map underneath it.
    if (resultPanel) {
      L.DomEvent.disableClickPropagation(resultPanel);
      L.DomEvent.disableScrollPropagation(resultPanel);
    }
    // Modifier-scroll zooms only this map; an ordinary wheel event still scrolls the page.
    const isMac = /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform || '');
    element.setAttribute('aria-description', `Hold ${isMac ? 'Command' : 'Ctrl'} and scroll to zoom the map. Scroll normally to move the page.`);
    attachSmoothWheelZoom(map);
    // Keep data credits visible without the Leaflet prefix; mobile credits clear the bottom sheet.
    const mobileCredits = matchMedia('(max-width:1040px)');
    const credits = L.control.attribution({ position:mobileCredits.matches ? 'topright' : 'bottomleft', prefix:false }).addTo(map);
    mobileCredits.addEventListener('change', event => credits.setPosition(event.matches ? 'topright' : 'bottomleft'));
    let tileErrors = 0;
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:19, detectRetina:false, updateWhenIdle:true, updateWhenZooming:false, keepBuffer:1,
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Contains OS data © Crown copyright and database right'
    });
    tiles.on('loading', () => { tileErrors = 0; });
    tiles.on('tileerror', () => {
      tileErrors++;
      status.hidden = false;
      status.textContent = 'Some background map tiles could not load. The distance filter and calendar still work.';
    });
    tiles.on('load', () => { if (!tileErrors) status.hidden = true; });
    tiles.addTo(map);
    // Cached ward shapes stay below the location marker and decorative hover layer.
    map.createPane('wardZones');
    map.getPane('wardZones').style.zIndex = '350';
    wardLayer = L.layerGroup().addTo(map);
    reachLayer = L.layerGroup().addTo(map);
    // Decorative copies bulge without moving the geographic pointer targets.
    map.createPane('wardHover');
    map.getPane('wardHover').style.zIndex = '450';
    map.getPane('wardHover').style.pointerEvents = 'none';
    hoverLayer = L.layerGroup().addTo(map);
    map.on('movestart', () => clearHover());
    map.on('moveend', drawContext);
    return true;
  }
  function clearHover(code = null) {
    if (code && hoveredWard !== code) return;
    hoverLayer?.clearLayers();
    hoveredWard = null;
  }
  function highlightWard(feature) {
    const code = feature.properties.code;
    if (hoveredWard === code) return;
    const record = wardRecords.get(code);
    if (!record?.clubs.size) return;
    clearHover();
    hoveredWard = code;
    // Build decorative copies on first hover, then reuse them on later visits.
    if (!record.hoverLayers) record.hoverLayers = [true, false].map(halo =>
      window.L.geoJSON(feature, { pane:'wardHover', interactive:false, style:{
        className:'ward-hover-visual', color:halo ? '#dffc3a' : '#efffa2',
        weight:halo ? 10 : 1.2, opacity:halo ? .22 : 1,
        fill:!halo, fillColor:'#dffc3a', fillOpacity:.8,
        lineJoin:'round', smoothFactor:1
      } })
    );
    record.hoverLayers.forEach(layer => hoverLayer.addLayer(layer));
  }
  function syncWardTarget(record) {
    const target = record.layer.getElement();
    if (!target) return;
    target.style.pointerEvents = 'auto';
    target.setAttribute('tabindex', '0');
    target.setAttribute('role', 'button');
    target.setAttribute('aria-label', `${record.title}: view club information${record.clubs.size ? `, ${record.clubs.size} matching ${record.clubs.size === 1 ? 'club' : 'clubs'}` : ', no matching clubs'}`);
    target.removeAttribute('aria-pressed');
    if (resultPanel) {
      target.setAttribute('aria-controls', resultPanel.id);
      target.setAttribute('aria-expanded', String(selectedWard === record.feature.properties.code && !resultPanel.hidden));
    }
    target.removeAttribute('aria-hidden');
  }
  function prepareWardRecords() {
    if (wardRecords.size) return;
    wards.features.forEach(feature => {
      // One geometry conversion supplies both the polygon and its reusable bounds.
      const polygon = window.L.geoJSON(feature, { pane:'wardZones', style:greyStyle });
      const layer = polygon.getLayers()[0];
      const title = `${feature.properties.name}, ${feature.properties.borough}`;
      const record = { feature, polygon, layer, title, bounds:polygon.getBounds(), clubs:emptyClubs };
      wardRecords.set(feature.properties.code, record);
      if (!overviewBounds) overviewBounds = window.L.latLngBounds([]);
      overviewBounds.extend(record.bounds);
      layer.on('click', () => openWard(record));
      layer.on('mouseover', () => highlightWard(feature));
      layer.on('mouseout', () => clearHover(feature.properties.code));
      // Leaflet creates a fresh SVG target only when a detached ward is added again.
      layer.on('add', () => {
        syncWardTarget(record);
        const target = layer.getElement();
        if (!target) return;
        target.addEventListener('focus', () => highlightWard(feature));
        target.addEventListener('blur', () => clearHover(feature.properties.code));
        target.addEventListener('keydown', event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          if (!event.repeat) openWard(record, true);
        });
      });
    });
  }
  function drawContext() {
    if (!map || !visible || !snapshot?.index) return;
    if (overviewRequested && overviewBounds?.isValid()) {
      overviewRequested = false;
      map.fitBounds(overviewBounds, { padding:[24,24], animate:false });
    }
    const viewport = map.getBounds();
    // Diff visibility: leave wards already on screen untouched, and detach only those leaving.
    wardRecords.forEach(record => {
      const shouldShow = viewport.intersects(record.bounds);
      const shown = wardLayer.hasLayer(record.polygon);
      if (shouldShow && !shown) wardLayer.addLayer(record.polygon);
      else if (!shouldShow && shown) {
        clearHover(record.feature.properties.code);
        wardLayer.removeLayer(record.polygon);
      }
    });
    const requested = wardRecords.get(requestedWard);
    if (requested && wardLayer.hasLayer(requested.polygon)) {
      requestedWard = null;
      openWard(requested);
    }
  }
  function draw() {
    if (!visible || !snapshot || !initialise()) return;
    // Load boundaries only when the map is visible; no Google services are used.
    if (!wards) {
      if (!wardRequest) wardRequest = fetch('/data/map-wards.json', { credentials:'omit' })
        .then(response => {
          if (!response.ok) throw new Error('Ward data unavailable');
          return response.json();
        }).then(data => { wards = data; draw(); })
        .catch(() => {
          status.hidden = false;
          status.textContent = 'Ward boundaries could not load. The postcode distance filter still works.';
        });
      return;
    }
    const { origin, radiusMiles, entries } = snapshot;
    const L = window.L;
    prepareWardRecords();
    const { groups } = groupWardSessions(entries, wards.postcodes);
    wardRecords.forEach((record, code) => {
      const group = groups.get(code);
      const hadClubs = Boolean(record.clubs.size);
      record.clubs = group || emptyClubs;
      // Highlight every ward containing filtered club information, without manual colour toggles.
      if (hadClubs !== Boolean(record.clubs.size)) {
        record.polygon.setStyle(record.clubs.size ? greenStyle : greyStyle);
        if (!record.clubs.size) clearHover(code);
      }
      syncWardTarget(record);
      if (selectedWard === code && resultPanel && !resultPanel.hidden) openWard(record, false, false);
    });
    const nextKey = origin ? `${origin.key || origin.sector}/${radiusMiles}` : [...groups.keys()].sort().join('|');
    if (nextKey === zoneKey) { drawContext(); return; }
    zoneKey = nextKey;
    reachLayer.clearLayers();
    if (!origin) {
      // The default view always frames every ward, even when only one sport has results.
      if (overviewBounds?.isValid()) map.fitBounds(overviewBounds, { padding:[24,24], animate:false });
      else map.setView([53.4808,-2.2426],10, { animate:false });
      drawContext();
      return;
    }
    // Leaflet circle radii are metres; the filter uses the same distance in miles.
    if (Number.isFinite(radiusMiles)) {
      const zone = L.circle(origin.point, { radius:radiusMiles * 1609.344,
        color:'#527000', weight:1.5, fillColor:'#b5e61d', fillOpacity:.14,
        interactive:false }).addTo(reachLayer);
      map.fitBounds(zone.getBounds(), { padding:[24,24], maxZoom:12, animate:false });
    } else map.setView(origin.point,11, { animate:false });
    L.circleMarker(origin.point, { radius:6, color:'#111211', weight:2,
      fillColor:'#fff', fillOpacity:1 })
      .bindTooltip(origin.label ? escapeHtml(`${origin.label}: approximate area centre`) : 'Your approximate location').addTo(reachLayer);
    drawContext();
  }
  // No tile requests are made until a visitor approaches the map in the page.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) { map?.invalidateSize({ animate:false, pan:false }); draw(); }
    }).observe(element);
  } else visible = true;
  // Recalculate the uncovered centre after a real viewport resize, not on every pan or hover.
  if ('ResizeObserver' in window) new ResizeObserver(() => {
    if (!visible || !map || !resultPanel || resultPanel.hidden) return;
    map.invalidateSize({ animate:false, pan:false });
    sizeSheet();
    centreWard(wardRecords.get(selectedWard), false);
  }).observe(element);
  return {
    selectWard,
    update(origin, radiusMiles, index = null, entries = null) { snapshot = { origin,radiusMiles,index,entries }; if (visible) draw(); }
  };
}
