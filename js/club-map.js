import { PRICE_TYPE_LABELS, PRICE_TYPE_ORDER, priceType, priceLabel, sportName, matchesClubFilters, validCoordinates } from './club-directory-filters.js';

const mapElement = document.querySelector('#map');
const sportFilter = document.querySelector('#map-filter-sport');
const priceFilter = document.querySelector('#map-filter-price');
const areaFilter = document.querySelector('#map-filter-area');
const reset = document.querySelector('#map-reset');
const count = document.querySelector('#map-result-count');
const list = document.querySelector('#map-club-list');
const notice = document.querySelector('#map-notice');
const status = document.querySelector('#map-status');
const manchester = [53.4808, -2.2426];
let clubs = [];
let locations = {};
let map;
let layers;
let markers = new Map();

function showStatus(message) { status.textContent = message; status.hidden = !message; }
function profileUrl(club) {
  return typeof club.profilePath === 'string' && /^html\/[a-zA-Z0-9/-]+\.html$/.test(club.profilePath) ? `/${club.profilePath}` : null;
}
function clubPoint(club) {
  if (validCoordinates(locations[club.id])) return locations[club.id];
  if (validCoordinates(club.coordinates)) return {...club.coordinates, precision:'unconfirmed'};
  return null;
}
function positionLabel(club) {
  const point = clubPoint(club);
  return !point ? 'Location not mapped yet' : point.precision === 'area' ? 'Approximate area location'
    : point.precision === 'venue' && point.confirmed === true ? 'Confirmed meeting venue' : 'Location needs confirmation';
}
function addOption(select, value, label = value) { select.add(new Option(label, value)); }
function populateFilters() {
  [...new Set(clubs.map(c => c.sport).filter(Boolean))].sort().forEach(sport => addOption(sportFilter, sport, sportName(sport)));
  [...new Set(clubs.map(priceType))].sort((a,b) => PRICE_TYPE_ORDER.indexOf(a)-PRICE_TYPE_ORDER.indexOf(b)).forEach(type => addOption(priceFilter,type,PRICE_TYPE_LABELS[type] || 'Other price'));
  [...new Set(clubs.flatMap(c => [c.area,...(c.sessions || []).map(s => s.area)]).filter(Boolean))].sort().forEach(area => addOption(areaFilter,area));
  [sportFilter,priceFilter,areaFilter,reset].forEach(control => {control.disabled = false;});
}
function popup(entries) {
  const container = document.createElement('div');
  container.className = 'club-map-popup';
  for (const club of entries) {
    const item = document.createElement('div'); item.className = 'club-map-popup__club';
    const title = document.createElement('strong'); title.textContent = club.name; item.append(title);
    const detail = document.createElement('p'); detail.textContent = `${sportName(club.sport)} · ${club.area || 'Manchester'} · ${priceLabel(club)}`; item.append(detail);
    const accuracy = document.createElement('p'); accuracy.textContent = positionLabel(club); item.append(accuracy);
    const href = profileUrl(club);
    if (href) { const link = document.createElement('a'); link.href = href; link.textContent = 'View club profile'; item.append(link); }
    container.append(item);
  }
  return container;
}
function selectedClubs() {
  return clubs.filter(club => matchesClubFilters(club,{sport:sportFilter.value,price:priceFilter.value,area:areaFilter.value})).sort((a,b) => a.name.localeCompare(b.name));
}
function renderMarkers(visible) {
  if (!map) return;
  layers.clearLayers(); markers = new Map();
  const groups = new Map();
  for (const club of visible) {
    const point = clubPoint(club); if (!point) continue;
    // Nearby or coincident positions share an accessible popup instead of concealing clubs.
    const pixel = map.project([point.lat,point.lon],map.getZoom());
    const key = `${Math.floor(pixel.x/44)}:${Math.floor(pixel.y/44)}`;
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(club);
  }
  for (const entries of groups.values()) {
    const points = entries.map(clubPoint);
    const center = [points.reduce((n,p)=>n+p.lat,0)/points.length,points.reduce((n,p)=>n+p.lon,0)/points.length];
    const label = entries.length === 1 ? entries[0].name : `${entries.length} clubs in this location`;
    const icon = L.divIcon({className:'club-map-pin',html:`<span>${entries.length > 1 ? entries.length : '●'}</span>`,iconSize:[32,32],iconAnchor:[16,16]});
    const marker = L.marker(center,{icon,title:label,alt:label,keyboard:true}).bindPopup(popup(entries),{maxHeight:280});
    marker.addTo(layers);
    entries.forEach(club=>markers.set(club.id,marker));
  }
}
function render(fit = true) {
  const visible = selectedClubs();
  const mapped = visible.filter(club => clubPoint(club));
  count.textContent = `${visible.length} ${visible.length === 1 ? 'club' : 'clubs'} · ${mapped.length} mapped`;
  const approximate = mapped.filter(club => clubPoint(club).precision === 'area').length;
  const missing = visible.length-mapped.length;
  notice.textContent = [approximate ? `${approximate} locations show an approximate area, not a confirmed meeting point.` : '',missing ? `${missing} clubs still need map coordinates; their profiles are listed below.` : '', 'Confirm meeting points, sessions and prices with the club before attending.'].filter(Boolean).join(' ');
  notice.hidden = false;
  list.replaceChildren();
  if (!visible.length) {const empty=document.createElement('li');empty.className='club-map-no-results';empty.textContent='No clubs match these filters. Try another selection or reset the filters.';list.append(empty);}
  for (const club of visible) {
    const item=document.createElement('li');
    const href=profileUrl(club); const link=document.createElement(href ? 'a':'span');
    if(href)link.href=href; link.textContent=club.name;item.append(link);
    const detail=document.createElement('p');detail.textContent=`${sportName(club.sport)} · ${club.area || 'Manchester'} · ${priceLabel(club)}`;item.append(detail);
    const accuracy=document.createElement('small');accuracy.textContent=positionLabel(club);item.append(accuracy);
    if(map && clubPoint(club)) {const button=document.createElement('button');button.type='button';button.textContent='Show on map';button.setAttribute('aria-label',`Show ${club.name} on map`);button.addEventListener('click',()=>{const point=clubPoint(club);map.setView([point.lat,point.lon],14);markers.get(club.id)?.openPopup();mapElement.focus();});item.append(button);}
    list.append(item);
  }
  if(map && fit) {
    if(mapped.length>1)map.fitBounds(mapped.map(c=>{const p=clubPoint(c);return[p.lat,p.lon];}),{padding:[32,32],maxZoom:13});
    else if(mapped.length===1){const p=clubPoint(mapped[0]);map.setView([p.lat,p.lon],12);}
    else map.setView(manchester,10);
  }
  renderMarkers(visible);
}
function initialiseMap() {
  if(typeof L === 'undefined') {mapElement.textContent='Map unavailable. Use the club list to browse matching profiles.';showStatus('The map could not load, but the directory and filters are available.');return;}
  map=L.map(mapElement,{scrollWheelZoom:false}).setView(manchester,10);
  L.tileLayer(window.CLUB_MAP_CONFIG.tileUrl,{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).on('tileerror',()=>showStatus('Some map tiles could not load. You can still browse matching club profiles.')).addTo(map);
  layers=L.layerGroup().addTo(map);
  map.on('zoomend',()=>renderMarkers(selectedClubs()));
  if('ResizeObserver' in window)new ResizeObserver(()=>map.invalidateSize({pan:false})).observe(mapElement);
}
async function loadDirectory() {
  try {
    const [clubResponse,locationResponse]=await Promise.all([fetch('/data/clubs.json',{cache:'no-cache'}),fetch('/data/club-map-locations.json',{cache:'no-cache'}).catch(()=>null)]);
    if(!clubResponse.ok)throw new Error('The club directory could not load. Please try again later.');
    const data=await clubResponse.json();
    if(!Array.isArray(data.clubs))throw new Error('The club directory is unavailable.');
    clubs=data.clubs.filter(club=>club && typeof club.id==='string' && typeof club.name==='string');
    if(locationResponse?.ok) {try {locations=(await locationResponse.json()).locations || {};}catch {locations={};}}
    populateFilters(); initialiseMap(); render();
  } catch(error) {count.textContent='Clubs unavailable';showStatus(error.message);const link=document.createElement('a');link.href='/html/sports/directory.html';link.textContent='Browse the sports directory';list.append(link);}
}
[sportFilter,priceFilter,areaFilter].forEach(control=>control.addEventListener('change',()=>render()));
reset.addEventListener('click',()=>{[sportFilter,priceFilter,areaFilter].forEach(control=>{control.value='all';});render();});
loadDirectory();
