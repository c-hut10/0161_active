import { createCalendarLocation } from './calendar-location.mjs?v=20261029-sport-panel-close';
import { visibleSportRecords } from './sport-catalog.mjs';
import { loadClubDirectory, loadSportCatalog } from './site-data.mjs';
import { sessionSport } from './club-formatting.mjs';
import { sportName, matchesSessionPrice, matchesSessionBudget, matchesSessionStartTime } from './club-directory-filters.js?v=20261025-budget';
import { enhanceFilterPickers, syncFilterPickers } from './filter-picker.mjs';
import { selectedMapSports, addMapSport, removeMapSport, clearMapSports } from './map-sport-selection.mjs';

/* Directory map controls reuse session-level price, sport, time and postcode helpers. */
const sportSummary = document.querySelector('#home-map-sport-summary');
const sportList = document.querySelector('#home-map-sports-list');
let sportListSignature = '';
let availableSports = [];
const price = document.querySelector('#home-map-price');
const amount = document.querySelector('#home-map-amount');
const amountField = document.querySelector('#home-map-amount-field');
const amountUnit = document.querySelector('#home-map-amount-unit');
const amountHelp = document.querySelector('#home-map-amount-help');
const time = document.querySelector('#home-map-time');
let timeSelected = false;
const flexibility = document.querySelector('#home-map-flexibility');
const panel = document.querySelector('[data-map-filters]');
const filterForm = panel.querySelector('form');
const postcodeInput = filterForm.querySelector('#calendar-home-postcode');
/* Rebuild the checklist only when the ordered selection changes, preserving focus during other filtering. */
function updateSportSelection() {
  const sports = [...selectedMapSports];
  sportSummary.textContent = sports.length
    ? `${sportName(sports[0])}${sports.length > 1 ? ` + ${sports.length - 1} more` : ''}` : 'All sports';
  sportSummary.classList.toggle('is-filter-selected', sports.length > 0);
  const signature = `${availableSports.map(sport => sport.slug).join('|')}|${sports.join('|')}`;
  if (signature === sportListSignature) return;
  sportListSignature = signature;
  // The same complete sports checklist is available on desktop and mobile.
  const focusedSport = document.activeElement?.dataset.sportChoice;
  sportList.replaceChildren(...availableSports.map(sport => {
    const item = document.createElement('li');
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox'; input.checked = selectedMapSports.has(sport.slug);
    input.dataset.sportChoice = sport.slug;
    input.addEventListener('change', () => {
      if (input.checked) addMapSport(sport.slug); else removeMapSport(sport.slug);
      window.dispatchEvent(new Event('0161-map-overview-request'));
    });
    // Keep native selection and keyboard behaviour behind a lightweight power icon.
    const power = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    power.classList.add('home-map-sport-power');
    power.setAttribute('viewBox', '0 0 24 24');
    power.setAttribute('aria-hidden', 'true');
    power.innerHTML = '<path d="M12 2v10M6.3 5.3a9 9 0 1 0 11.4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    label.append(input, power, document.createTextNode(sportName(sport.slug)));
    item.append(label);
    return item;
  }));
  if (focusedSport) [...sportList.querySelectorAll('input')].find(input => input.dataset.sportChoice === focusedSport)?.focus({ preventScroll:true });
}
sportSummary.addEventListener('click', () => {
  sportList.hidden = !sportList.hidden;
  sportSummary.setAttribute('aria-expanded', String(!sportList.hidden));
});
panel.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || sportList.hidden) return;
  event.preventDefault();
  sportList.hidden = true;
  sportSummary.setAttribute('aria-expanded', 'false');
  sportSummary.focus({ preventScroll:true });
});
function updateFieldColours() {
  // Grey indicates an unchosen value, not a disabled control.
  [price, flexibility].forEach(control => {
    control.closest('.filter-field, label')?.classList.toggle('is-filter-selected',
      control === flexibility || control.value !== 'all');
  });
  updateSportSelection();
  amount.classList.toggle('is-filter-selected', amount.value !== '');
  time.classList.toggle('is-filter-selected', timeSelected);
  postcodeInput.classList.toggle('is-filter-selected', Boolean(postcodeInput.value.trim() || postcodeInput.dataset.selectedArea));
}
postcodeInput.addEventListener('input', updateFieldColours);
updateFieldColours();
let clubs = [];
let directoryReady = false;
let pendingArea = null;
// Retro-map links carry the selected public ward to the map's new directory location.
const linkedArea = new URLSearchParams(location.search).get('area');
if (linkedArea) {
  try { pendingArea = JSON.parse(linkedArea); } catch { /* Ignore malformed links; ordinary filters remain usable. */ }
}
const applyButton = filterForm.querySelector('[type="submit"]');
const locationFilter = createCalendarLocation(render);
window.addEventListener('0161-map-area-selected', event => {
  pendingArea = event.detail;
  render();
});
function showRetroArea(area) {
  clearMapSports();
  price.value = 'all';
  amount.value = '';
  time.value = '00:00'; timeSelected = false; flexibility.value = '0';
  if (!locationFilter.selectArea(area)) return;
  const destination = document.querySelector('#calendar-sector-map');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches
    || document.documentElement.classList.contains('a11y-reduce-motion');
  if (!destination.hasAttribute('tabindex')) destination.setAttribute('tabindex', '0');
  destination.focus({ preventScroll:true });
  destination.scrollIntoView({ behavior:reduced ? 'instant' : 'smooth', block:'start' });
}
function render() {
  applyButton.disabled = !directoryReady || !locationFilter.ready;
  if (!directoryReady) return;
  // Only paid price modes expose a budget; inactive amounts never affect the map.
  const hasBudget = ['per_session', 'membership'].includes(price.value);
  amountField.hidden = amountHelp.hidden = !hasBudget;
  amount.disabled = !hasBudget;
  amountField.parentElement.classList.toggle('has-budget', hasBudget);
  amountUnit.textContent = price.value === 'membership' ? '(£ per year)' : '(£ per session)';
  amountHelp.textContent = price.value === 'membership'
    ? 'Maximum yearly membership fee. Monthly fees are multiplied by 12. Extra session charges may apply.'
    : 'Maximum price per session.';
  if (pendingArea && locationFilter.ready) {
    const area = pendingArea;
    pendingArea = null;
    showRetroArea(area);
    return;
  }
  locationFilter.beginFiltering();
  const entries = clubs.map(club => ({ club, sessions:club.sessions.filter(session =>
    (!selectedMapSports.size || selectedMapSports.has(sessionSport(club, session)))
    && matchesSessionPrice(club,session,price.value)
    && matchesSessionBudget(club,session,price.value,amount.value)
    && matchesSessionStartTime(session,timeSelected ? time.value : '',flexibility.value)
    && locationFilter.matches(session)) })).filter(entry => entry.sessions.length);
  locationFilter.updateResults(entries);
  syncFilterPickers();
  updateFieldColours();
}
flexibility.addEventListener('change', render);
// A yearly figure and a session figure are different budgets; start blank when changing payment type.
price.addEventListener('change', () => { amount.value = ''; render(); });
amount.addEventListener('input', render);
time.addEventListener('change', () => {
  timeSelected = Boolean(time.value);
  render();
});
document.querySelector('#home-map-clear-filters').addEventListener('click', () => {
  clearMapSports();
  price.value = 'all';
  amount.value = '';
  time.value = '00:00'; timeSelected = false; flexibility.value = '0';
  locationFilter.clear(false);
  render();
});
window.addEventListener('0161-map-sports-input', render);
[sportSummary,price].forEach(control => { control.disabled = true; });
Promise.all([loadClubDirectory(), loadSportCatalog()]).then(([data, catalog]) => {
  clubs = data.clubs;
  availableSports = visibleSportRecords(catalog, clubs);
  directoryReady = true;
  [sportSummary,price].forEach(control => { control.disabled = false; });
  enhanceFilterPickers('.home-map-filter-fields select');
  render();
}).catch(() => {
  applyButton.disabled = true;
  document.querySelector('#calendar-map-summary').textContent = 'Club filters could not load. The postcode reach zone is still available.';
});
