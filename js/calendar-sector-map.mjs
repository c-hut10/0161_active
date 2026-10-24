import { escapeHtml } from './club-formatting.mjs';

/* One reach zone illustrates the same straight-line radius used by the calendar. */
export function createReachMap(element, status) {
  let map = null;
  let reachLayer = null;
  let trainingLayer = null;
  let contextLayer = null;
  let hoverLayer = null;
  let hoveredWard = null;
  let wards = null;
  let wardRequest = null;
  let contextShapes = [];
  let matchingWards = new Set();
  let snapshot = null;
  let visible = false;
  let zoneKey = null;
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
      minZoom:8, maxZoom:16, attributionControl:true }).setView([53.4808,-2.2426],10);
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
    // Surrounding areas sit below the selectable training zones and never intercept clicks.
    map.createPane('surroundingZones');
    map.getPane('surroundingZones').style.zIndex = '350';
    map.getPane('surroundingZones').style.pointerEvents = 'none';
    contextLayer = L.layerGroup().addTo(map);
    trainingLayer = L.featureGroup().addTo(map);
    reachLayer = L.layerGroup().addTo(map);
    // Decorative copies bulge without moving the geographic pointer targets.
    map.createPane('wardHover');
    map.getPane('wardHover').style.zIndex = '450';
    map.getPane('wardHover').style.pointerEvents = 'none';
    hoverLayer = L.layerGroup().addTo(map);
    map.on('movestart', clearHover);
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
    clearHover();
    hoveredWard = code;
    // Two lightweight SVG copies reproduce the retro map's halo and pale-edged fill.
    for (const halo of [true, false]) {
      window.L.geoJSON(feature, { pane:'wardHover', interactive:false, style:{
        className:'ward-hover-visual', color:halo ? '#dffc3a' : '#efffa2',
        weight:halo ? 10 : 1.2, opacity:halo ? .22 : 1,
        fill:!halo, fillColor:'#dffc3a', fillOpacity:.8,
        lineJoin:'round', smoothFactor:1
      } }).addTo(hoverLayer);
    }
  }
  function drawContext() {
    if (!map || !visible || !snapshot?.index) return;
    const L = window.L;
    if (!wards) return;
    // Cache bounds once; only draw nearby wards after the map stops moving.
    if (!contextShapes.length) contextShapes = wards.features.map(feature => ({
      feature, bounds:L.geoJSON(feature).getBounds()
    }));
    const viewport = map.getBounds();
    contextLayer.clearLayers();
    contextShapes.forEach(({ feature, bounds }) => {
      if (matchingWards.has(feature.properties.code) || !viewport.intersects(bounds)) return;
      L.geoJSON(feature, { pane:'surroundingZones', interactive:false,
        style:{ color:'#737773', weight:.75, fillColor:'#777d77', fillOpacity:.24,
          smoothFactor:1 } }).addTo(contextLayer);
    });
  }
  function draw() {
    if (!snapshot || !initialise()) return;
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
    clearHover();
    trainingLayer.clearLayers();
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
    matchingWards = new Set(groups.keys());
    wards.features.forEach(feature => {
      const group = groups.get(feature.properties.code);
      if (!group) return;
      const title = `${feature.properties.name}, ${feature.properties.borough}`;
      const polygon = L.geoJSON(feature, { style:{
        color:'#527000', weight:1.5, fillColor:'#b5e61d', fillOpacity:.5, smoothFactor:1
      } }).addTo(trainingLayer);
      const layer = polygon.getLayers()[0];
      layer.bindTooltip(escapeHtml(title)).bindPopup(`<strong>${escapeHtml(title)}</strong><ul>${[...group.values()].map(club => `<li><a href="/${escapeHtml(club.profilePath)}">${escapeHtml(club.name)}</a></li>`).join('')}</ul>`, { autoPan:false });
      layer.on('mouseover popupopen', () => highlightWard(feature));
      layer.on('mouseout popupclose', () => clearHover(feature.properties.code));
      const target = layer.getElement();
      if (target) {
        target.setAttribute('tabindex','0'); target.setAttribute('role','button');
        target.setAttribute('aria-label',`${title}: show matching clubs`);
        target.addEventListener('focus', () => highlightWard(feature));
        target.addEventListener('blur', () => clearHover(feature.properties.code));
        target.addEventListener('keydown',event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault(); layer.openPopup();
        });
      }
    });
    const nextKey = origin ? `${origin.sector}/${radiusMiles}` : [...groups.keys()].sort().join('|');
    if (nextKey === zoneKey) { drawContext(); return; }
    zoneKey = nextKey;
    reachLayer.clearLayers();
    if (!origin) {
      const bounds = trainingLayer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding:[24,24], maxZoom:12, animate:false });
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
      .bindTooltip('Your approximate location').addTo(reachLayer);
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
    update(origin, radiusMiles, index = null, entries = null) { snapshot = { origin,radiusMiles,index,entries }; if (visible) draw(); }
  };
}
