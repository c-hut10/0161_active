import { createReachMap } from './calendar-sector-map.mjs';
import { postcodeSector } from './club-areas.mjs';
import { sessionSector, milesBetween, distanceLabel } from './postcode-distance.mjs';

/* This controller shares the calendar's filtered entries; it owns no second filter system. */
export function createCalendarLocation(onChange) {
  const form = document.querySelector('#calendar-location-filter');
  const postcode = form.querySelector('#calendar-home-postcode');
  const postcodePlaceholder = postcode.placeholder;
  const radius = form.querySelector('#calendar-radius');
  // Native slider positions map to half-mile steps through 3, then whole miles.
  const radiusStops = [0, .5, 1, 1.5, 2, 2.5, 3, ...Array.from({ length:17 }, (_, i) => i + 4)];
  const radiusMiles = () => radiusStops[Number(radius.value)];
  const radiusValue = document.querySelector('#calendar-radius-value');
  let radiusFrame = 0;
  const submit = form.querySelector('[type="submit"]');
  const clearButton = form.querySelector('[data-clear-location]');
  const message = document.querySelector('#calendar-location-status');
  const map = document.querySelector('#calendar-sector-map');
  const mapSummary = document.querySelector('#calendar-map-summary');
  let index = null;
  let origin = null;
  let ready = false;
  let unmappedDistances = 0;
  const cache = new Map();
  const reachMap = map ? createReachMap(map, document.querySelector('#calendar-map-status')) : null;

  function clear(notify = true) {
    origin = null;
    cache.clear();
    postcode.value = '';
    delete postcode.dataset.selectedArea;
    postcode.placeholder = postcodePlaceholder;
    postcode.dispatchEvent(new Event('input', { bubbles:true }));
    postcode.removeAttribute('aria-invalid');
    clearButton.hidden = true;
    message.textContent = '';
    if (notify) onChange();
  }
  function distance(session) {
    const sector = sessionSector(session);
    const point = index?.sectors[sector];
    if (!origin || !point) return null;
    if (!cache.has(sector)) cache.set(sector, milesBetween(origin.point, point));
    return cache.get(sector);
  }
  function decorate(session) {
    const miles = distance(session);
    return miles === null ? session : { ...session, distanceText:distanceLabel(miles, origin.sector === sessionSector(session)) };
  }
  function matches(session) {
    if (!origin) return true;
    const miles = distance(session);
    if (miles === null) unmappedDistances++;
    return miles !== null && miles <= radiusMiles();
  }
  /* Report filtered clubs while the map illustrates the chosen reach, not club pins. */
  function updateResults(entries = null) {
    if (!index) return;
    if (origin) message.textContent = `${origin.label ? `Within ${radiusMiles()} ${radiusMiles() === 1 ? 'mile' : 'miles'} of ${origin.label}. ` : ''}Distances are approximate straight-line estimates, not routes or journey times.${unmappedDistances ? ` ${unmappedDistances} sessions without mapped locations are excluded from the distance results.` : ''}`;
    if (!reachMap) return;
    mapSummary.textContent = 'Select a training zone to see its clubs';
    reachMap.update(origin, radiusMiles(), index, entries);
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!ready) return;
    const input = postcode.value.trim().toUpperCase().replace(/\s/g,'');
    if (!input) {
      postcode.removeAttribute('aria-invalid');
      message.textContent = '';
      clear();
      return;
    }
    const sector = postcodeSector(postcode.value);
    if (!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(input) && !/^[A-Z]{1,2}\d[A-Z\d]?\d$/.test(input)) {
      postcode.setAttribute('aria-invalid','true');
      message.textContent = 'Enter a postcode such as M30 0AA.';
      return;
    }
    const point = index.sectors[sector];
    if (!point) {
      postcode.setAttribute('aria-invalid','true');
      message.textContent = 'That postcode area is not in our lookup yet. Your existing filters have not changed.';
      return;
    }
    postcode.value = postcode.value.trim().toUpperCase();
    postcode.removeAttribute('aria-invalid');
    clearButton.hidden = false;
    message.textContent = `Distances are approximate straight-line estimates, not routes or journey times.`;
    origin = { sector, point };
    delete postcode.dataset.selectedArea;
    postcode.placeholder = postcodePlaceholder;
    cache.clear();
    onChange();
  });
  clearButton.addEventListener('click', () => clear());
  function updateRadiusLabel() {
    const value = `${radiusMiles()} ${radiusMiles() === 1 ? 'mile' : 'miles'}`;
    radiusValue.textContent = value;
    radius.setAttribute('aria-valuetext', radiusMiles() === 0 ? '0 miles, same approximate area' : value);
  }
  // Batch slider input while preserving ordinary keyboard and touch controls.
  radius.addEventListener('input', () => {
    updateRadiusLabel();
    if (!origin || radiusFrame) return;
    radiusFrame = requestAnimationFrame(() => { radiusFrame = 0; onChange(); });
  });
  submit.disabled = true;
  fetch('/data/postcode-sectors.json', { credentials:'omit' }).then(response => {
    if (!response.ok) throw new Error('Lookup unavailable');
    return response.json();
  }).then(data => {
    if (!data.sectors) throw new Error('Lookup invalid');
    index = data; ready = true; submit.disabled = false;
    onChange();
  }).catch(() => {
    message.textContent = 'Postcode distances are unavailable. Other calendar filters still work.';
    if (mapSummary) mapSummary.textContent = 'The reach map is unavailable. You can still browse the club calendar.';
  });
  return {
    clear, matches, decorate, updateResults,
    selectArea(area) {
      if (!ready || !area?.code || !Array.isArray(area.point) || area.point.length !== 2
        || !area.point.every(Number.isFinite)) return false;
      origin = { sector:null, key:`ward/${area.code}`, label:`${area.name}, ${area.borough}`, point:[...area.point] };
      cache.clear();
      radius.value = String(radiusStops.indexOf(1));
      updateRadiusLabel();
      postcode.value = '';
      postcode.dataset.selectedArea = origin.label;
      postcode.placeholder = area.name;
      postcode.removeAttribute('aria-invalid');
      clearButton.hidden = false;
      reachMap?.selectWard(area.code);
      onChange();
      return true;
    },
    get ready() { return ready; },
    beginFiltering() { unmappedDistances = 0; },
    get active() { return Boolean(origin); },
    get label() { return origin ? radiusMiles() === 0 ? 'Same approximate postcode area' : `Within approx. ${radiusMiles()} ${radiusMiles() === 1 ? 'mile' : 'miles'} of your postcode` : ''; }
  };
}
