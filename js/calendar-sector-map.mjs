import { escapeHtml } from './club-formatting.mjs';
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
    // Short, ordinary interactions: no continuous effects or animated viewport changes.
    map = L.map(element, { scrollWheelZoom:false, doubleClickZoom:false, zoomAnimation:false,
      fadeAnimation:false, markerZoomAnimation:false, inertia:false, boxZoom:false,
      minZoom:8, maxZoom:16, zoomDelta:.5, zoomSnap:0, smoothSensitivity:1, attributionControl:true }).setView([53.4808,-2.2426],10);
    map.zoomControl.setPosition('topleft');
    // Modifier-scroll zooms only this map; an ordinary wheel event still scrolls the page.
    const isMac = /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform || '');
    element.setAttribute('aria-description', `Hold ${isMac ? 'Command' : 'Ctrl'} and scroll to zoom the map. Scroll normally to move the page.`);
    attachSmoothWheelZoom(map);
    // Keep required map credits clear of the bottom filter bar on small screens.
    if (window.matchMedia('(max-width:1040px)').matches) map.attributionControl.setPosition('topright');
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
      layer.bindTooltip(escapeHtml(title)).bindPopup(() =>
        `<strong>${escapeHtml(title)}</strong>${record.clubs.size ? `<ul>${[...record.clubs.values()].map(club => `<li><a href="/${escapeHtml(club.profilePath)}">${escapeHtml(club.name)}</a></li>`).join('')}</ul>` : '<p>No clubs match the current filters in this ward.</p>'}`,
        { autoPan:false });
      layer.on('mouseover popupopen', () => highlightWard(feature));
      layer.on('mouseout popupclose', () => clearHover(feature.properties.code));
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
          if (!event.repeat) layer.openPopup();
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
      requested.layer.openPopup();
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
    const groups = new Map();
    let unassigned = 0;
    if (entries) entries.forEach(({ club,sessions }) => sessions.forEach(session => {
      const match = (session.postcode || session.meetingPoint || '').match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i);
      const postcode = match ? match[0].replace(/\s/g, '').toUpperCase() : '';
      const code = wards.postcodes[postcode];
      if (!code) { unassigned++; return; }
      if (!groups.has(code)) groups.set(code, new Map());
      groups.get(code).set(club.id, club);
    }));
    const coverage = document.querySelector('#calendar-ward-status');
    if (coverage) {
      coverage.hidden = !unassigned;
      coverage.textContent = `${unassigned} matching ${unassigned === 1 ? 'session has' : 'sessions have'} no ward assignment and ${unassigned === 1 ? 'is' : 'are'} not shown on the map.`;
    }
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
      if (record.layer.isPopupOpen()) record.layer.getPopup().update();
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
  return {
    selectWard,
    update(origin, radiusMiles, index = null, entries = null) { snapshot = { origin,radiusMiles,index,entries }; if (visible) draw(); }
  };
}
