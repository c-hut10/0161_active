/* Map providers: keep service URLs in one place so providers can be swapped without changing map logic. */
window.CLUB_MAP_CONFIG = Object.freeze({
  tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  geocoderUrl: 'https://nominatim.openstreetmap.org/search'
});
