import { nature } from './clubdata.js';

/* Map storage key: shared with the registration form for browser-local club entries. */
const CLUB_MAP_STORAGE_KEY = '0161-active-registered-clubs-v1';

/* Map target: support the current homepage #map element and the earlier #club-map id. */
const mapContainer = document.querySelector('#map, #club-map');
if (!mapContainer) throw new Error('Map container not found. Add an element with id="map" or id="club-map".');

/* Map setup: show Manchester, OpenStreetMap tiles, and visible map/data attribution. */
const clubMap = L.map(mapContainer, { scrollWheelZoom: false }).setView([53.4808, -2.2426], 12);
L.tileLayer(window.CLUB_MAP_CONFIG.tileUrl, {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(clubMap);

const clubMarkers = L.layerGroup().addTo(clubMap);
const mapEmptyMessage = document.querySelector('#map-empty');

/* Map sizing: refresh Leaflet's viewport after layout changes so it requests the full tile grid. */
let mapResizeFrame = 0;
function refreshClubMapSize() {
  cancelAnimationFrame(mapResizeFrame);
  mapResizeFrame = requestAnimationFrame(() => clubMap.invalidateSize({ pan: false }));
}

if ('ResizeObserver' in window) {
  new ResizeObserver(refreshClubMapSize).observe(mapContainer);
} else {
  window.addEventListener('resize', refreshClubMapSize);
}
window.addEventListener('load', refreshClubMapSize, { once: true });

/* Storage reader: ignore malformed or incomplete entries instead of breaking the map. */
function getRegisteredClubs() {
  try {
    const saved = JSON.parse(localStorage.getItem(CLUB_MAP_STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter(club =>
      club && typeof club.name === 'string' &&
      Number.isFinite(Number(club.lat)) && Number.isFinite(Number(club.lon)) &&
      Number(club.lat) >= -90 && Number(club.lat) <= 90 &&
      Number(club.lon) >= -180 && Number(club.lon) <= 180
    );
  } catch {
    return [];
  }
}

/* Popup builder: writes user-supplied details as text nodes to avoid HTML injection. */
function makeClubPopup(club) {
  const content = document.createElement('div');
  content.className = 'club-map-popup';
  const name = document.createElement('strong');
  name.textContent = club.name;
  content.append(name);

  const sport = document.createElement('p');
  sport.textContent = club.sport || club.tags?.[0] || 'Local sports club';
  content.append(sport);

  const location = document.createElement('p');
  location.textContent = [club.meeting || club.location, club.area].filter(Boolean).join(', ');
  content.append(location);

  if (club.description || club.title) {
    const description = document.createElement('p');
    description.textContent = club.description || club.title;
    content.append(description);
  }

  if (club.email) {
    const contact = document.createElement('a');
    contact.href = `mailto:${club.email}`;
    contact.textContent = 'Contact club';
    content.append(contact);
  }
  return content;
}

/* Marker rendering: refreshes all pins and frames the map around saved clubs. */
function renderRegisteredClubs() {
  const clubs = [...nature, ...getRegisteredClubs()];
  clubMarkers.clearLayers();
  if (mapEmptyMessage) mapEmptyMessage.hidden = clubs.length > 0;

  const bounds = [];
  clubs.forEach(club => {
    const position = [Number(club.lat), Number(club.lon)];
    const marker = L.marker(position, { title: club.name, alt: `${club.name} location` });
    marker.bindPopup(makeClubPopup(club));
    marker.addTo(clubMarkers);
    bounds.push(position);
  });

  if (bounds.length === 1) clubMap.setView(bounds[0], 14);
  else if (bounds.length > 1) clubMap.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
  else clubMap.setView([53.4808, -2.2426], 12);
}

renderRegisteredClubs();
/* Cross-tab updates: map changes when a registration is saved in another open tab. */
window.addEventListener('storage', event => {
  if (event.key === CLUB_MAP_STORAGE_KEY || event.key === null) renderRegisteredClubs();
});
