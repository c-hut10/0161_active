# Calendar postcode distance and sector map

The calendar's existing filtered session entries feed both the map and schedule. Sport, price, area, starting time, selected days and postcode radius are applied together. A club with several venues is evaluated per session, never using one club-level address for all sessions.

## Local calculations

`js/postcode-distance.mjs` reuses `postcodeSector` from the approved area helpers. A sector is the outward code plus the first inward digit (`M1 7`, `M20 2`), not a fixed four-character substring. User input accepts a full postcode or a sector; it checks format and sector availability, not the existence of every full postcode.

The entered postcode is reduced to its sector. Haversine distance compares the two estimated sector centres in miles. Whole-mile labels and a same-sector label avoid implying address-level precision. This is not road distance, journey time or a travel guarantee. A radius can exclude a venue near a sector edge even if its actual address would be closer.

No entered postcode text is sent in a request, included in the URL, saved to local/session storage or used for geolocation. The browser downloads the same public lookup file regardless of the entered postcode. The Leaflet background requests map tiles from OpenStreetMap when the map becomes visible; those requests expose normal connection details and the map area being viewed, which can include the user sector. Clearing/reloading removes the entered location. Privacy copy is in `html/privacy.html`.

## Lookup and coverage

`data/postcode-sectors.json` contains Great Britain sector centres and North West approximate coverage shapes. It is built offline from GetTheData Open Postcode Geo, derived from the **August 2023** ONS Postcode Directory. New sectors may be absent. The source version is disclosed beneath the map. Northern Ireland is absent from this source.

`python3 scripts/build-postcode-sectors.py` downloads the licensed source ZIP only when it is not in the operating system's temporary cache, and generates the small public lookup. The original postcode records are not published. Live small-user postcodes with positional quality 1–5 contribute equally to a sector mean. Shapes are convex hulls around those postcode coordinates, not official boundaries; they may overlap. Source and licence attribution are retained in the JSON and displayed below the map.

When a session sector cannot be resolved, distance is unknown, never zero. Such sessions are excluded while the distance filter is active and the exclusion is reported. Without a distance filter they remain in the schedule; the map reports unmapped sessions. Known sectors without a prepared shape use a labelled sector-centre circle rather than an invented polygon.

## Map behaviour

Self-hosted Leaflet 1.9.4 uses OpenStreetMap Standard raster tiles to show roads, parks and place names. Green areas represent matching sessions, not exact venue pins. Buttons below the map offer the same sector selection for keyboard/touch access and reveal matching club profile links. Leaflet JavaScript, CSS, supporting icons and its BSD redistribution notice are in `vendor/leaflet/`. No CDN is used. OpenStreetMap requests use the browser cache and normal referrer policy; no prefetch, offline tile downloads or proxy is used. Attribution stays visible on the map. Scroll-wheel zoom, double-click zoom, inertia and map animations are disabled. Map construction and tile requests wait until the map enters view. Standard OSM tiles are best-effort and subject to https://operations.osmfoundation.org/policies/tiles/; a higher-traffic production service may need another provider. Day selections retain the calendar rule that a club must have a matching session on every selected day.

`scripts/package-site.cjs` publishes the sector lookup alongside `clubs.json` and `sports.json`. Existing calendar filters and static HTML remain usable if the lookup cannot load.

## Current reach-zone presentation

Club circles, sector borders and sector selection controls are no longer displayed. After a postcode is applied, Leaflet draws one `L.circle` centred on its approximate sector centre, using the selected radius in miles multiplied by 1609.344 metres. A white centre marker identifies the user's approximate location. Clearing the postcode removes both; Any distance removes the zone and retains the centre marker. Sport, price, area, time and day filters continue to narrow calendar results. Changing those filters does not refit the map if origin/radius are unchanged. The greyscale tile background remains.

## Radius control

The distance control is a native range slider from 0 to 20 miles in one-mile steps, initially 10 miles. The current value is visible and exposed to assistive technology. Input updates the zone and results through a batched animation-frame callback. At zero, sector-centre distance is zero for the same sector, displayed as the same approximate area rather than an exact home-address match. The Any distance option is no longer part of the control.

## Page placement

The interactive Leaflet map and its own postcode/radius controls now appear on the homepage directly below Movement for everyone. The calendar retains its postcode/radius filter, estimated session distances and all existing filters, with no displayed map or Leaflet CSS/JS. Both pages reuse `createCalendarLocation`; map initialization is optional when its DOM element is absent. Shared input/map styles are in `css/location-filter.css`. No user postcode or radius is passed between pages or stored.

## Homepage overlay filters

A collapsible filter panel now sits inside the homepage map frame. Desktop starts open; mobile starts collapsed. Sport, price, area, starting time/flexibility, postcode and radius use the same session helpers as the calendar. The map groups matching sessions into approximate postcode coverage polygons with club links in popups; there is no separate results list. The retro map's borough/ward names can inform grouping, but its image-coordinate paths have not been georeferenced and must not be overlaid as if they were accurate Leaflet boundaries. Geographic ward boundaries are a separate pending decision.

## Filled surrounding zones

Matching training polygons use a stronger green fill. Other available postcode coverage polygons in the visible map area have a muted grey fill beneath the selectable zones. Surrounding shapes are noninteractive and refresh only when filters change or map movement finishes. Their bounds are cached, and offscreen polygons are omitted. These approximate hulls can leave gaps or overlap; they do not form complete administrative ward boundaries.

## Ward boundaries replace sector shapes (24 October 2026)

This section supersedes the earlier polygon presentation. The homepage now uses all 215 Greater Manchester wards from the user-supplied `WD_MAY_2026_UK_BSC` GeoJSON. The original is retained in `archive/geo/wards-may-2026-source.geojson` and is excluded from deployment. Its source and licence have not been independently verified. Geometry is preserved as supplied, including its existing simplification; it should not be described as address-level boundary precision.

`python3 scripts/build-map-wards.py` produces `data/map-wards.json` (about 146 KB uncompressed). It keeps ward codes, names, boroughs and geographic polygons. It also assigns current session full postcodes to polygons using the existing offline August 2023 postcode cache. Polygon holes are respected, and ambiguous or unmatched locations are left unassigned. Re-run this builder after adding or changing session postcodes. No network requests or Google access are required by this builder.

Green wards contain matching sessions; muted grey wards provide surrounding context. Popups show ward name, borough and matching club links. Sessions without an assignment are counted beneath the map. The boundary file is fetched only when the map is visible. Geographic bounds are cached and offscreen grey wards are omitted; no continuous animation is used.

The postcode radius calculation remains sector-centre based on both home and calendar pages. Ward display does not change radius eligibility or the site's existing area allocations. Old sector hulls have been removed from the public lookup and its builder, leaving only sector centres. The supplied OS attribution remains on the map. No browser verification was performed for this change.
