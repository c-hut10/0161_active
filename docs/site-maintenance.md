# Metadata and club maintenance

`data/site.json` holds the public origin. Home links use `/`. After changing the origin, run the Node generator and deploy the generated HTML, sitemap and robots file together.

```sh
node scripts/build-site-metadata.cjs
```

Every page uses `img/0161 Active_Logo.png` for its favicon and Open Graph/Twitter image. The older social-card generator is not part of the current build workflow.

Run the profile generator after changes to club data, the profile renderer or indexing policy. It embeds every club profile in the initial HTML, including details, sessions, links and Last Confirmed information. Generated profiles are displayed directly. The profile script adds calendar downloads; page rendering happens during generation. Rebuild and deploy profiles after data changes.

## Local preview

Run `node scripts/preview-site.cjs` and open `http://127.0.0.1:5502/`. An optional port can be supplied, for example `node scripts/preview-site.cjs 5503`. Stop the preview with Ctrl+C.

This server explicitly sends AVIF as `image/avif` and disables asset caching. It serves project files on loopback only and does not accept form submissions. Refresh the browser after edits; it does not inject a live-reload script. This changes only the local preview, not Netlify hosting.

## Adding and updating profiles

`data/clubs.json` is the source for club details. `templates/club-profile.inc` defines the full HTML page shell, and `js/club-profile-renderer.mjs` defines the visible club layout. Edit these sources instead of editing generated profile HTML.

Add each club with a unique `id` and a `profilePath` of `html/<sport>/<club>.html`, then run `node scripts/build-site-metadata.cjs`. The generator creates missing sport folders and profile pages, updates existing pages, regenerates titles/descriptions/canonical and social tags, and includes the new pages in the sitemap. It does not need a copied profile page or change club verification dates. Profile filenames cannot be `index.html`.

## Homepage gallery

The generator chooses 10 available club photos for each build using `js/home-gallery-renderer.mjs`. Their images, captions and profile links are embedded directly in `index.html`. `js/home-gallery.js` shuffles only those prerendered cards on each visit and adds pause/resume controls. It does not fetch the club directory or choose another photo set. A rebuild rotates the set; deploy the rebuilt homepage to publish that selection.

## Generated sport pages and navigation

The build creates `html/sports/<sport-slug>.html` for each visible sport using `templates/sport-glossary.inc`. Each page contains its club list, title, description, canonical URL and sharing metadata in the initial HTML. Area/day/search controls enhance that list in the browser. Older `glossary.html?sport=...` links open the new sport page and retain the area filter. New links use the generated sport paths directly.

Visibility still follows `data/sports.json` through `visibleSportRecords`. When a sport is hidden, the build removes its marked generated glossary; hand-authored files are preserved. Rebuild after changing club records or sport visibility.

`js/sport-glossary-renderer.mjs`, `js/sports-directory-renderer.mjs`, `js/calendar-week-renderer.mjs` and `js/site-nav-renderer.mjs` share HTML rendering between the build and browser. The sports directory, full-week calendar and global navigation are embedded during generation. JavaScript adds search, filters, day selections, downloads and mobile menu controls. Data-loading failures retain the generated content.

## Shared session display

`js/club-formatting.mjs` defines weekday names, session-time formatting and HTML escaping for the calendar, profiles, sport directories, registration summaries and navigation.

`formatPostcodes` in that module standardises full postcodes to uppercase with one space before the final three characters, including codes embedded in addresses. `normalizeClubPostcodes` applies it to club and session address fields during data loading and profile generation. Registration uses the same formatter when a venue field loses focus and when serialising session answers.

`js/site-data.mjs` caches club and sport JSON requests for the current page, sharing the parsed data and resolved areas between navigation and page components. Failed requests can be retried. `onlineProfileAction` in the formatting module validates each web link once and provides its Website, Instagram or Facebook label.

`js/session-details.mjs` defines the Manchester Regional Arena track-access fee once in `ARENA_TRACK_FEE`. It applies automatically to Run Club and athletics sessions at that venue, including new entries. Change the amount there to update the note, green highlighting and calendar-download text together. Keep `venueNotes` for session-specific exceptions; do not duplicate the shared charge text in club records.

Club profiles include a training summary below their title and actions, generated by the shared profile renderer. It reads session days/times and club booking notes from the JSON, groups identical day/time/schedule-note combinations, and links to the full timetable where each session retains its title and attendance details. Missing schedules remain explicitly unlisted. `sessionScheduleNote` keeps irregular frequencies and special considerations consistent in the summary, profile timetable and calendar.

## Postcode area naming

`docs/postcode-area-rulebook.md` contains the single approved postcode-to-area table and all naming policies. Add or change mappings there only, then run `node scripts/build-site-metadata.cjs`; it generates `js/postcode-areas.mjs` and rebuilds the static profiles. The generated JavaScript lookup is not a second editable rulebook.

`js/club-areas.mjs` uses that generated lookup to resolve session and undated venue postcodes. It supplies the derived areas across the website without rewriting `data/clubs.json`. See the rulebook's Maintenance and implementation section for resolution behaviour. `docs/club-data-review.md` is a historical migration report, not a source of mapping rules.

The registration form collects a postcode per training session. “Same location as previous session” copies both the training address and postcode. The preview uses derived areas, but submitted session JSON contains only the underlying address and postcode. The named sessions field captures answers through Netlify, and registrationCsv supplies one CSV row per session.

## Club schema and verification

See docs/club-csv-format.md for the complete questionnaire mapping and CSV import process. Schema version 2 uses one contact-email string and session-level training addresses/postcodes. Areas and weekday labels are derived; raw research answers are replaced by source URLs.

Verification contains only status (verified or unverified) and lastConfirmed (YYYY-MM-DD or null). New club-response CSV imports and updates set verified and the Europe/London import date. Existing public-source research does not become club confirmation. Page generation never changes verification dates.

## Search indexing

The sitemap includes public pages, all club profiles and generated sport glossaries. It excludes the 404 page, draft privacy policy and generic glossary compatibility page; those carry `noindex, follow`. About, Resources and the former Run Club placeholder were removed. The Run Club sport now has a generated glossary at `html/sports/run-club.html`.

The sitemap omits `lastmod` until real content-change dates can be tracked. Never replace research dates with build dates to manufacture freshness. Sport canonicals are written directly into HTML and exclude optional area/day/search filters.

## Release checks

Run `python3 scripts/check-site-metadata.py` and `git diff --check`. After deployment, check `/`, the `/index.html` redirect, `/sitemap.xml`, `/robots.txt`, a missing URL and a club profile. Confirm that public pages and share images return successful responses without requiring authentication. Record shipped changes separately from the Unreleased changelog.

## Page styles

The registration page uses `css/site-base.css` for shared body defaults and `css/register.css` for its components. It no longer loads `css/0161_Page.css`. Other pages still depend on that legacy stylesheet; migrate and compare them individually before removing it.

## Shared footer and contact navigation

Edit templates/site-footer.inc and css/site-footer.css, then run the profile generator to update the footer in every full HTML page. The footer is static and does not depend on JavaScript. Contact us is the final link in both desktop and mobile shared navigation. The contact page is now included in the sitemap; privacy remains noindex until its draft is complete.

## Club verification badge

Profiles, calendars and sport lists display the same lime badge when verification.status is verified and lastConfirmed is a valid date. The profile shows Last Confirmed beneath the title. Unverified records show no badge and no invented date. Map coordinate confirmation is separate and remains in data/club-map-locations.json.
