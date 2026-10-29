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

## Apply-only filtering and brief animation (25 October 2026)

The homepage controls are restored. Sport, price, starting time, flexibility, postcode and radius are draft values until Apply filters is submitted. Postcode is optional, but a supplied value must be valid and present in the sector lookup. The submitted values are captured, then committed after a deliberate 3,000 ms presentation delay. Applying again cancels the previous timer. Clearing filters resets the draft controls and cancels a pending application; Apply filters commits the cleared draft.

Only this pending period uses the diagonal SVG pattern, at its previously approved 1.666667-second cycle speed. Results and the postcode marker/radius are hidden during the animation. Completion restores matching green wards, surrounding grey wards, hover interactions and any applied location zone. All-ward and all-grey preview flags are removed. SVG animation is paused between submissions, when offscreen, in hidden tabs and for reduced-motion preferences. The persistent animation pause button is removed because the animation ends after three seconds. No animation library or continuous JavaScript frame loop is used.

## Static map restored (25 October 2026)

The apply-only transition above has been reverted. The homepage map no longer contains the SVG stripe animation, its observers or the artificial three-second timer. Sport, price, time/flexibility and an active radius update results immediately; submitting a postcode applies its location without a delay. Clearing filters also clears the applied postcode. The desktop section is again 60vw wide and the map is 50vh tall. Mobile retains its full-width, borderless map and permanently open filters below it.

## Smooth modifier-wheel zoom (25 October 2026)

The map now imports a self-hosted adaptation of mutsuyuki/Leaflet.SmoothWheelZoom from `vendor/leaflet-smooth-wheel-zoom/smooth-wheel-zoom.mjs`. Its MIT notice is retained in `LICENSE.txt`; there is no CDN or runtime GitHub request. The plugin's use of Leaflet's private `_move`, `_moveStart`, `_moveEnd` and `_stop` methods stays isolated in that module and should be reviewed when changing Leaflet versions.

Command-scroll on Mac and Ctrl-scroll elsewhere activate the handler. Ordinary scrolling, form controls and popup scrolling remain outside its zoom interception. Sensitivity is 0.5. Fractional wheel zoom requires zoomSnap 0, while the existing +/- buttons retain zoomDelta 0.5. There is no idle frame loop: animation frames run only while interpolating an active gesture, converge to its goal and stop after scrolling ends. Pending frames and timers are cancelled when interrupted or disabled. Centered cursor positions and convergence avoid the upstream early-return/stalling cases.

The OS reduced-motion preference and the site's `a11y-reduce-motion` class use discrete half-step zoom, batched at 160 ms. Site preferences, tab visibility, modifier release and window blur interrupt smooth zoom. Hover decoration clears at movement start; surrounding grey polygons still update at movement end. Public packaging now includes vendor `.mjs` modules. Packaged locally; browser behaviour has not been verified in this change.

## Reusable ward geometry (25 October 2026)

Each of the 215 wards is now converted into a Leaflet polygon once, with cached geographic bounds, popup/tooltip bindings and event handlers. The same polygon switches between green and grey styles when filters change. The viewport update compares cached bounds and attaches or detaches only wards whose visibility changes; wards that remain visible are left untouched. Matching bounds for camera fitting are computed from all matching records, so offscreen culling does not narrow the result extent.

Grey polygons are noninteractive and excluded from keyboard navigation. Matching polygons retain fixed pointer targets, keyboard opening and current club links. Hover decorations are created lazily the first time a ward is highlighted and reused thereafter. Filtering refreshes an open popup from the current matching club set. The entire ward layer sits below postcode markers and hover decoration. No vector-tile library, new network dependency or animation loop is introduced. The cache retains polygon objects to avoid repeated geometry conversion; SVG elements may still be recreated by Leaflet when a detached ward returns to view. Browser performance has not been measured for this change.

## Manual ward highlights (25 October 2026)

All wards now start grey and remain interactive. Clicking or pressing Enter/Space toggles an individual ward green or grey, with aria-pressed exposing the state. Multiple wards can remain selected. These choices last only for the current page and survive viewport culling and filter updates. Filters update the club links in each popup, without automatically colouring wards. Wards without matching clubs show an explicit empty message. Hover decoration applies only to selected wards, so an unselected ward remains grey until activated. Postcode/radius eligibility is unchanged.

## Retro ward links to the main map (25 October 2026)

Desktop borough clicks retain their existing inner-ward view. Clicking a ward, or activating it with Enter/Space, dispatches `0161-map-area-selected` with its shared ward code, name, borough and prepared geographic point. The homepage map queues early selections until directory/postcode data are ready, clears sport/price/time filters, sets a one-mile radius, highlights the ward and scrolls/focuses the main map. Reduced-motion users get an immediate scroll. Existing mobile borough-overview behaviour is unchanged; no mobile inner-map zoom has been reintroduced.

`scripts/build-retro-ward-links.py` now generates the pixel-style inner maps in `js/home-region-shapes.mjs` from the same 215 polygons used by the main map. This replaces older ward names and partitions that did not match the supplied May 2026 data. The original image references are retained in archive. `scripts/build-region-details.py` forwards to the geographic builder, preventing a later rebuild from restoring stale image-derived labels. Rebuild the retro module after regenerating or replacing `data/map-wards.json`.

Ward points use an area centroid, with an interior representative point when a concave outline or hole puts the centroid outside the ward. They are area centres, not user addresses or confirmed club locations. The main map measures approximate straight-line distance from that point to session postcode-sector centres. The location input displays the selected ward as its placeholder and its description explains the area origin; entering a postcode or clearing location replaces it normally. Selected areas are not persisted between visits. No external geocoding requests are added.
