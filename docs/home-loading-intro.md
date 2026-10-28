# Homepage loading intro

The live homepage now uses a sequence-driven branded intro instead of the interactive landing-panel map. It does not measure network loading. The original homepage and navigation are already in the document beneath it.

The source ZIP, manifest and detailed regional view files remain protected. The ten overview outlines are reused without changing their path coordinates. Detailed region interactions are not loaded or exposed by the live intro.

## Temporary design preview

`replayEveryVisit` in `js/home-entry.js` is currently true. The intro plays on every homepage visit and refresh, ignoring the saved flag without clearing it or other browser data. Set it to false to restore the once-per-browser behaviour described below. Direct club links still bypass the intro.

## Sequence

- In once-per-browser mode only, at entry: store `0161active-home-intro-seen = 1` in local storage.
- Each of the first two rotations has a 1,000ms clockwise spin, 360ms for the final region to pass through both trailing states and fully fade, 450ms to shrink fully back, then 200ms resting in grey. Each complete cycle takes 2,010ms.
- The third rotation starts at 4,020ms. Each region stays neon once the highlight reaches it. The local leading bulge and trailing motion continue without dimming the completed regions.
- At 5,020ms, the complete neon map begins a larger 450ms swell from scale 1.07 to 1.18.
- After a 300ms final hold, the homepage rolls into view over 650ms while the larger swell completes.
- The current phases finish at about 5,970ms. This timing is derived from the complete phases, not a separate four/five-second cap that interrupts a cycle.
- After the reveal, remove the intro element and release homepage keyboard interaction. No intro timers keep running.

The white heading is beneath the map: MANCHESTER'S SPORTS LOADING. Three decorative dots cycle in four fixed steps without changing the heading width. Dots are hidden from accessibility announcements.

Reduced-motion visitors see a static neon map and static sports list for one second, followed by a 160ms fade. They do not get the regional tour, bulge, rolling movement, moving dots or scrolling sports.

The map stage is 25% smaller in both dimensions than the initial loading layout, on desktop and mobile. The whole-map bulge rises early, stays expanded through most of each clockwise circuit and returns to normal as that circuit finishes. Each leading region also expands locally, followed by two smaller, dimmer trailing regions. The 160ms transform/opacity easing lets the tail fade during the grey rest. Final full selection returns local region scales to normal while the complete map swells further into the reveal. No continuous JavaScript rendering loop is used.

## Sports ticker

The build embeds the current visible sports from the same catalog rules as the directory. The intro makes no new club-data or sports-data request. Each visit randomly draws fourteen different sports without replacement. Six rows are visible above the map. Six cloned rows allow a seamless transform-only scroll; they are not additional sampled sports. The ticker is decorative and is not repeatedly announced to screen readers. Its reference treatment uses compact monospaced white rows, a lime-highlighted band and fading edges.

The normal and narrow/landscape layouts preserve six visible rows. The heading remains beneath the map. A reload draws a new random selection; repeating a past selection remains mathematically possible.

## Persistence and resilience

Only `/`, `/index` and `/index.html` load this first-visit behaviour. Other pages, including direct club-profile links, do not mark the intro as seen. Return visits and refreshes in the same browser skip it. The flag is set on entry, so a refresh during the intro also skips it. Browser-history restoration clears an unfinished intro.

This remembers a browser, not a signed-in person. Clearing browser site data, using another browser or a private session can show it again. If storage is blocked, the intro still ends normally, but persistence is unavailable. With JavaScript disabled, the intro is hidden and the homepage remains available.

For local design testing only, `tmp/reset-home-intro-preview.html` resets just the intro flag using its button. It does not clear favourites or other site settings. The packaging script excludes `tmp` from publication.

## Verification

Local tests cover the clockwise order and timing, complete shrink/rest phases, cumulative third-pass selection, phase-derived handover, fourteen distinct sampled sports, catalogue parity, repeat visits, direct profile links, reduced motion, blocked storage and leaving during the intro. Desktop and mobile previews were checked. Archive/source hashes and all ten SVG outline paths were compared with their pre-change copies. No archive or detailed region source changed.
