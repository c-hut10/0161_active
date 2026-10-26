# Social media map design

Recorded 25 October 2026 at the user's request.

Treat these five features as one temporary design for a social media post:

- The zoom interface used to look at the retro map.
- The button that highlights and unhighlights all regions.
- The Space bar command that opens a region.
- The full-screen map presentation.
- The hidden filter box.

Status: reverted locally on 25 October 2026 at the user's request.

Normal retro region activation and idle rotation are restored. The temporary
manual highlight mode, Space shortcut and bulk highlight button are removed.
The desktop main map returns to 60vw wide and 50vh tall. Filters remain
visible by default, with the existing desktop toggle and mobile layout.
Shared ward geometry, ward links and modifier-wheel zoom are retained.

## Reversion scope

Revert only the changes implementing this group. Preserve other map,
calendar, club-data and site work, including changes sharing the same files.
Do not reset entire files or the working tree to undo this design.

Relevant implementation locations to inspect when reverting:

- `index.html`: map markup and manual-region mode.
- `js/home-entry.js`: manual region highlights and Space activation.
- `js/home-region-detail.mjs`: retro region detail interaction.
- `css/home-entry.css`: retro map presentation.
- `js/calendar-sector-map.mjs`: map controls and highlight toggle.
- `js/home-reach-map.js`: filter-panel interaction.
- `css/location-filter.css`: map layout and hidden filter controls.

This record groups the requested behaviour. It does not change the design,
verify browser behaviour, or deploy anything.
