import { createCalendarLocation } from './calendar-location.mjs';
import { loadClubDirectory } from './site-data.mjs';
import { sessionSport } from './club-formatting.mjs';
import { sportName, matchesSessionPrice, matchesSessionStartTime } from './club-directory-filters.js';
import { enhanceFilterPickers, syncFilterPickers } from './filter-picker.mjs';

/* Homepage controls reuse session-level price, sport, time and postcode helpers. */
const sport = document.querySelector('#home-map-sport');
const price = document.querySelector('#home-map-price');
const time = document.querySelector('#home-map-time');
let timeSelected = false;
const flexibility = document.querySelector('#home-map-flexibility');
const panel = document.querySelector('[data-map-filters]');
const mobile = matchMedia('(max-width:1040px)');
const filterToggle = panel.querySelector('.home-map-filter-toggle');
const filterForm = panel.querySelector('form');
const postcodeInput = filterForm.querySelector('#calendar-home-postcode');
function updateFieldColours() {
  // Grey indicates an unchosen value, not a disabled control.
  [sport, price, flexibility].forEach(control => {
    control.closest('.filter-field, label')?.classList.toggle('is-filter-selected',
      control === flexibility || control.value !== 'all');
  });
  time.classList.toggle('is-filter-selected', timeSelected);
  postcodeInput.classList.toggle('is-filter-selected', Boolean(postcodeInput.value.trim()));
}
postcodeInput.addEventListener('input', updateFieldColours);
updateFieldColours();
let clubs = [];
const locationFilter = createCalendarLocation(render);
function render() {
  locationFilter.beginFiltering();
  const entries = clubs.map(club => ({ club, sessions:club.sessions.filter(session =>
    (sport.value === 'all' || sessionSport(club, session) === sport.value)
    && matchesSessionPrice(club,session,price.value)
    && matchesSessionStartTime(session,timeSelected ? time.value : '',flexibility.value)
    && locationFilter.matches(session)) })).filter(entry => entry.sessions.length);
  locationFilter.updateResults(entries);
  syncFilterPickers();
  updateFieldColours();
}
[sport,price,flexibility].forEach(control => control.addEventListener('change',render));
time.addEventListener('change', () => {
  timeSelected = Boolean(time.value);
  render();
});
document.querySelector('#home-map-clear-filters').addEventListener('click', () => {
  sport.value = price.value = 'all';
  time.value = '00:00'; timeSelected = false; flexibility.value = '0';
  locationFilter.clear(false);
  render();
});
function setPanelOpen(open) {
  panel.classList.toggle('is-open', open);
  filterToggle.setAttribute('aria-expanded', String(open));
  filterForm.hidden = !open;
}
filterToggle.addEventListener('click', () => {
  if (!mobile.matches) setPanelOpen(filterForm.hidden);
});
function sizePanel() {
  filterToggle.hidden = mobile.matches;
  setPanelOpen(true);
}
mobile.addEventListener('change',sizePanel);
sizePanel();
[sport,price].forEach(control => { control.disabled = true; });
loadClubDirectory().then(data => {
  clubs = data.clubs;
  const sports = [...new Set(clubs.flatMap(club => club.sessions.map(session => sessionSport(club,session))))].sort();
  sports.forEach(value => sport.add(new Option(sportName(value),value)));
  [sport,price].forEach(control => { control.disabled = false; });
  enhanceFilterPickers('.home-map-filter-fields select');
  render();
}).catch(() => {
  document.querySelector('#calendar-map-summary').textContent = 'Club filters could not load. The postcode reach zone is still available.';
});
