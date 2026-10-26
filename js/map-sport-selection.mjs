/* One ordered selection drives both the sports list and the map's session filter. */
export const selectedMapSports = new Set();

export function addMapSport(sport) {
  if (!sport || selectedMapSports.has(sport)) return;
  selectedMapSports.add(sport);
  window.dispatchEvent(new Event('0161-map-sports-input'));
}

export function removeMapSport(sport) {
  if (!selectedMapSports.delete(sport)) return;
  window.dispatchEvent(new Event('0161-map-sports-input'));
}

export function clearMapSports() {
  selectedMapSports.clear();
}
