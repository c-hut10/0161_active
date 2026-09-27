/* Map storage key: shared with the registration form for browser-local club entries. */
const CLUB_MAP_STORAGE_KEY = '0161-active-registered-clubs-v1';

/* Map setup: show Manchester, OpenStreetMap tiles, and visible map/data attribution. */
const clubMap = L.map('club-map', { scrollWheelZoom: false }).setView([53.4808, -2.2426], 12);
L.tileLayer(window.CLUB_MAP_CONFIG.tileUrl, {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(clubMap);

const clubMarkers = L.layerGroup().addTo(clubMap);
const mapEmptyMessage = document.querySelector('#map-empty');

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
  sport.textContent = club.sport || 'Local sports club';
  content.append(sport);

  const location = document.createElement('p');
  location.textContent = [club.meeting, club.area].filter(Boolean).join(', ');
  content.append(location);

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
  const clubs = getRegisteredClubs();
  clubMarkers.clearLayers();
  mapEmptyMessage.hidden = clubs.length > 0;

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
