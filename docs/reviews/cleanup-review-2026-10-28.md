# Cleanup review — 28 October 2026

Read-only source review of recent owned website code and the Apps Script additions. No implementation, data, map geometry or archives were changed. This is a set of confirmed findings, not an exhaustive proof that the entire repository contains no other unused code.

## 1. Hidden sports browser still runs

Priority: medium. Sources: `js/sports-directory.js:9`, `js/sports-directory.js:33`, `js/sports-directory.js:65`, `js/sports-directory.js:88`; `css/sports-directory.css:88`, `css/sports-directory.css:145`.

The directory module still loads the catalog, calculates club counts, renders the old sports cards, updates their selected states and attaches search/click/key handlers. The enhanced desktop layout hides all original column children except the new filter panel. Mobile hides that original column entirely. These paths therefore maintain a second sports interface that visitors cannot currently use.

Keep the generated sport links as a deliberate fallback when scripts do not run. Remove the unnecessary browser-side rendering and handlers for that hidden fallback. Keep the small responsive filter-placement controller and the new shared selector. The shared `site-data.mjs` cache already prevents duplicate requests, so this finding is redundant processing and DOM, not evidence of a second network download.

Verify: desktop and mobile selection, multiple sports, clearing, full-height disclosure, resizing and the no-script fallback. Check whether the shared renderer remains used by static generation before considering any renderer-file removal.

## 2. Superseded CSS and an unused remove-button style

Priority: medium. Sources: `css/sports-directory.css:115-123`, `css/sports-directory.css:145-151`; `css/location-filter.css:75-76`.

The older desktop rules create a second filter column inside the map frame and hide the Sports box. Later rules change that frame back to a block and show the box again after the form moves to column one. This leaves a chain of old rules and compensating overrides. Some remain useful only for the no-script fallback; they should be explicitly scoped to that state rather than relied on as accidental cascade history.

The `.home-map-sport-remove` control and `li > span` layout belonged to the former selected-sports list. The current list creates labels containing power-icon checkboxes, and no code or live markup creates the old remove control.

Consolidate the active desktop layout and remove the unused control-specific rules. Preserve fallback links and mobile styles. Verify closed/open desktop menus, narrow desktop widths and mobile control alignment.

## 3. Unused distance-display helpers

Priority: low. Sources: `js/calendar-location.mjs:3`, `js/calendar-location.mjs:49`, `js/calendar-location.mjs:122`, `js/calendar-location.mjs:141-142`.

The only current caller of `createCalendarLocation` is `js/home-reach-map.js`. It never calls `decorate`, `active` or `label`. Those were useful when the location controller added distance text to calendar entries. The calendar now displays saved clubs without that filter interface.

Remove those unused return members and the local decoration function. Its `distanceLabel` import would then be unnecessary here. Do not remove the postcode lookup, radius calculation, distance cache or session matching. Do not delete the shared distance module or its other exports without checking its remaining consumers.

Verify: postcode radius, slider steps, unmapped locations and retro-map ward links still work.

## 4. Favourite storage writes are duplicated

Priority: low. Sources: `js/calendar.js:32-38`, `js/club-favourites.js:70-78`, `js/saved-clubs.mjs`.

Both the calendar removal action and the profile/directory favourite action separately implement writing IDs to local storage, removing the key when empty and dispatching `saved-clubs-changed`. Reading already uses a shared helper.

Put the storage write and change event in one small shared helper. Leave each page's notices, first-save explanation and keyboard focus handling in that page. Preserve failure behaviour: a failed write must not report success or discard the prior state.

## 5. Registration rows are normalised three times

Priority: low. Source: `js/club-submission.mjs:114-143`.

`registrationTransfer` builds `rows` once for the JSON import block, then calls CSV and TSV helpers that each call `submissionRows` again for the same answers. This can be simplified by formatting a single normalised row array into the three representations.

Keep the public export helpers if their callers and tests still require them. Preserve format-specific escaping, blank authoritative IDs, uppercase booleans, no TSV headings and one row per actual session. This is modest redundant work at export time, not evidence of a significant performance problem.

## 6. Redundant Apps Script assignment

Priority: low. Source: `tools/google-sheets/0161.gs:780-782`.

`decodeState0161_` assigns `model.exported = {}` and then immediately replaces it with the parsed `exported` object, without reading the empty object. The first assignment can be removed. Keep `model.preparedExport = null`, which supplies a valid default when no prepared batch exists.

No broader snapshot simplification is recommended here. The two saved-state slots, interrupted-sync checks, stable ID counters, duplicate-import history and export acknowledgements provide distinct protections.

## Explicitly retained

- The live retro map and everything protected by `AGENTS.md` and `archive/retro-map/README.md`.
- The older separate map in `index.html` under `template#paused-club-map`, plus `js/club-map.js`, `js/club-map-config.js`, `css/club-map.css` and its location data. `docs/club-map.md` explicitly records that feature as paused with restoration instructions. Missing live references are not grounds for deleting it.
- Generated HTML, offline build renderers, test fixtures and migration/recovery functions with documented callers. They are not dead merely because a browser does not import them.

## Validation

Ran `scripts/check-code.mjs`: all 43 tests passed; 162 pages, 123 static profiles and 159 sitemap URLs passed the existing checks. Lint reported no blocking errors. Existing legacy formatting remains advisory.

No browser-speed benchmark was performed. These findings describe maintainability and duplicated work, not measured speed gains. No code was deleted, no archive changed, and no commit, tag, push or deployment was made.


## Applied after approval

All six findings above were addressed after approval. The directory controller now only positions the shared filter form. Generated fallback sport links and their build renderer remain. Desktop fallback layout rules are explicitly scoped and unused selected-list/remove-button rules were removed. The unused location decoration members and their unreferenced `distanceLabel` formatter were removed; postcode/radius matching remains. Favourite writes and their success event now use one shared helper. All registration representations format the same normalised rows. The redundant saved-state assignment was removed.

Added two tests for favourite write notifications, last-club removal and blocked storage. All 45 tests and existing public-page metadata checks pass. Local browser checks confirmed desktop and mobile sports selection, multi-selection, clearing, menu expansion/collapse and matching time/flexibility field edges. Saving Manchester Warriors on its profile and removing it from the calendar worked; its initial unsaved state was restored. No browser errors were captured during those checks.

The protected and paused-map files were hash-checked against the pre-cleanup baseline and are unchanged. No commit, tag, push, deployment or Google account access was performed.
