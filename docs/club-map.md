# Homepage club map

Currently paused: the homepage keeps the map markup in an inert template and does not load Leaflet or the map scripts. To restore it after confirming locations, unwrap template#paused-club-map and restore the Leaflet CSS/JS, css/club-map.css, js/club-map-config.js and the module js/club-map.js references. The code and cached locations remain available.

The map and sidebar read data/clubs.json. Sport, price and area filters use the same values and club/session-area matching as the calendar. No user geolocation is collected and no public geocoder is called by the browser.

Only valid numeric coordinates produce markers. Unmapped clubs remain in the matching-clubs list with profile links. Coincident and nearby markers share a popup showing every club; zooming changes the grouping. External map/library failures leave the matching list usable.

## Adding manual locations

For each club provide its name, sport or profile link (to distinguish repeated names), a public venue/address, latitude and longitude as decimal numbers, and whether this is a confirmed meeting venue or an approximate area. Use the primary public meeting venue for the current one-location-per-club map. Record additional session locations separately for a future multi-venue map.

Use the club id from data/clubs.json as the key in data/club-map-locations.json:

```json
{
  "locations": {
    "club-id": {
      "lat": 0,
      "lon": 0,
      "precision": "venue",
      "confirmed": true,
      "venue": "Public venue or address",
      "source": "Club confirmation or source URL"
    }
  }
}
```

The zero coordinates above demonstrate the structure only; replace them with actual coordinates. Set precision to `area` and confirmed to false for area-centre approximations. Do not describe an address lookup as confirmed by the club. Existing coordinates in clubs.json are fallback points labelled as needing confirmation. Unknown points are never placed at a guessed Manchester location.

On 4 October 2026, a one-time Nominatim lookup generated 83 cached points: 16 venue matches requiring confirmation and 67 approximate area matches. Combined with the existing fallback point, all 84 clubs can appear on the map. outputs/geocoded-clubs.csv contains the lookup report; data/geocoding-cache.json caches requests. Venue matches are not direct club confirmations.

Retain OpenStreetMap attribution for the map tiles. If a future one-time Nominatim lookup is used, first follow https://operations.osmfoundation.org/policies/nominatim/: use an identifying user agent, a single thread, no more than one request per second and cached results. This feature does not depend on that service.

When removing a club, remove its cached location too. Do not retain location entries for withdrawn listings. Deploy index.html, css/club-map.css, js/club-map.js, js/club-directory-filters.js and the shared data files together.
