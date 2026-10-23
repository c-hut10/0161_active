# Homepage opening

The homepage has a native modal opening with “DISCOVER YOUR NEXT SPORT” and “Enter 0161_Active”. The door faces cover both halves of the viewport, fading behind the heading through a static mask. No separate landing URL or additional index page is created. Club, directory and calendar links load normally.

## Session behaviour

**Temporary design mode is enabled:** `showOnEveryVisit = true` in `js/home-entry.js`. The welcome appears on every homepage visit, reload, and return through browser Back. It bypasses session storage and retains clean closed dialog markup for replay without reloading the page. Set the flag to `false` to restore the production behaviour below.

Only `index.html` loads `js/home-entry.js` and `css/home-entry.css`. The session-storage key `0161active-home-entered` becomes `entered` when Enter is pressed. Subsequent homepage visits in that tab skip the opening. Browser session restoration can preserve session storage; a new tab opened from an existing tab may inherit its initial storage. This is a tab-scoped convenience flag, not a user account or analytics identifier.

Storage or modal support failures reveal the normal homepage. A four-second startup watchdog handles interrupted initialisation. The Enter transition has an independent completion timer so a missing animation event cannot trap visitors. Without JavaScript, the dialog stays closed and the static homepage is available.

## Rendering budget

- A static 24px muted-green grid spans the viewport. Cubes and glows are placed using explicit cell addresses, with separate mobile addresses. The former repeating SVG cube tile has been replaced by individually addressable static cubes.
- One reusable SVG glow image, used by twelve moving dots (six on narrow screens).
- Dots only animate opacity, keeping their glow centred in each cell; there is no canvas/WebGL loop or live blur. A resize observer updates positions and temporary axes only when the cell count or breakpoint changes, and disconnects when the opening closes.
- Pause effects control, document-visibility pause and device/saved reduced-motion preferences.
- Enter opens the doors and fills the viewport with solid neon green over 900ms. A temporary two-viewport-high green-to-black-to-transparent gradient then translates upward for two seconds. The homepage slides into view during that reveal. The layer and dialog are removed afterwards, without changing scroll position or adding document space.
- The transition uses flat colour and a static CSS gradient, not the small pixel-dot glow image. Reduced-motion visitors enter immediately.
- Gallery animation remains paused until the opening finishes; the mission word sequence waits too.
- Dialog and listeners are removed after entering. Existing homepage content remains prerendered HTML, with the original title, canonical URL and metadata.

The privacy page describes the session-storage flag. No tracking service, additional dependencies, video download, account system or new network provider is introduced.

## Files

- `index.html`: homepage-only assets, dialog and content wrapper.
- `css/home-entry.css`: static scene, movement and responsive styling.
- `js/home-entry.js`: storage, modal, pause and completion handling.
- `img/home-entry-glow.svg`: reusable local glow image.
- `img/manchester-regions/hover/`: ten small pre-rendered halos for the interactive borough shapes.
- `js/home-panels.js`: defers the existing word animation until Enter completes.

The static pixel design is an initial treatment for later visual refinement. No automated or browser interaction tests were run for this change; build and syntax checks are separate from visual verification.

## Grid addresses and temporary axes

Columns run A, B, C… Z, AA, AB… from left to right. Rows run 1, 2, 3… from top to bottom. A1 is the top-left cell. Cells are 24px wide and tall. The axes label every other complete cell (A, C, E… and 1, 3, 5…) to keep labels readable; the grid itself also covers any clipped cells at the right and bottom edges. Cubes and glows use these smaller cells.

Change a cube or glow's `data-cell` in `index.html` to place it. For example, `data-cell="D5"` puts the cube in column D, row 5, or centres the glow in that cell. `data-mobile-cell` supplies the address at widths up to 640px. The value `off` hides an item at that size. Addresses outside the current visible grid are hidden rather than clamped or silently moved.

`showGridAxes = true` in `js/home-entry.js` displays temporary column letters and row numbers. Set it to `false` before launch to hide those labels without changing the grid or placements. The labels are decorative, do not receive keyboard focus, and disappear during the Enter transition.

## Interactive borough prototype

Click, tap or activate a borough with Enter/Space to zoom it within the existing SVG frame. One camera transform enlarges the selected borough over 850ms while surrounding boroughs fade away. Internal borders start fading in 425ms into the zoom and fade over 700ms. They use the outer border’s grey colour and sharp corners, with a thinner 0.5-unit stroke; the outer stroke remains unchanged. The back control reverses the camera over 650ms; it does not add another map. Back to Greater Manchester (or Escape inside the detail view) restores the overview. The borough tour stops while the detail view is open. Each internal shape has a fixed pointer target and a separate expanding neon visual; keyboard focus and touch selection use the same labels. Names remain `Area to confirm` and no club figures are assigned to these unconfirmed sections.

`scripts/build-region-details.py` traces the supplied cropped source maps from `archive/artwork/borough-source-cutouts/` into `js/home-region-shapes.mjs`. Run it with Python containing Pillow and NumPy when changing source shapes. The browser loads these prepared vector paths only after a borough is activated, through `js/home-region-detail.mjs`. Raster tracing and source images are not loaded by visitors. This remains an illustrative prototype; individual area boundaries and names require review before being presented as authoritative.

The left door contains ten inline SVG shapes traced directly from the approved pixel masks in `archive/artwork/manchester-regions/masks/`. These source masks are not deployed. The outer and borough borders follow the assembled image; no AI-generated outlines are used in this interaction. The neutral map is hollow with grey borders. Hovering over a borough expands its separate visual layer by 3.5% around its centre and fills it with #dffc3a. Internal areas expand by 2.5%. Neither hover effect translates upward; the neon glow is retained. The original pointer target does not move. Mouse clicks do not pin a selection, and the highlight clears when the pointer leaves. Keyboard focus has the same selection effect while focus remains on the map. A phone tap retains its selection until another interaction or the idle tour begins. The decorative layers never intercept pointer events or change keyboard order.

The left map has no visible headings or captions and is vertically centred within its desktop door. Instructions remain available to assistive technology through the SVG description. The right door has an ordered list of three stacked white, uppercase lines: borough name, “XX clubs registered”, and a sport-specific club count. The location retains its original 1.618em size. The supporting lines are now 0.85em (15% smaller than their original size), with a tighter 1.15 line height and reduced vertical gaps on desktop and mobile. The demo-data notice also uses white uppercase text.

All counts remain illustrative; the visible demo count eyebrow has been removed from all map views. Counts are stored separately as `demoRegions` in `js/home-entry.js`. The prototype does not read or update `data/clubs.json`, postcode rules or real club totals. The first sport statistic is chosen randomly; subsequent statistics rotate every five seconds while a region is hovered or keyboard-focused. After five seconds without active hover or keyboard focus, an idle tour selects a random borough every five seconds, avoiding consecutive repeats. Region interaction immediately takes control and resets that delay. The tour never moves keyboard focus. No automatic rotation occurs while paused, hidden, opening or using reduced motion. A separate visually hidden status announces manual region selections only; automatic sport and tour changes remain quiet.

Halos are small cached WebP images baked offline. Selection animates transforms and opacity; it does not use live blur, canvas, WebGL, map services or new dependencies. One shared five-second timer controls both sport updates and the idle tour. It and all map listeners are cleaned up when Enter completes. The original two-stage door reveal still controls entry to the homepage.

On screens up to 640px, the map and information stack while the door faces retain their central split. Short screens can scroll inside the welcome so the map, figures and Enter button do not overlap. Reduced motion keeps colour selection while removing region expansion and text movement. The preview mode and temporary coordinate axes remain enabled during design work.

### Shared internal borders

The detail generator expands area interiors into a complete partition of the approved borough silhouette. Shared edges between two areas are drawn once; edges adjoining the outside are omitted from the internal-line layer. Hover targets and neon fills use those same complete areas. The expanding neon layer is clipped to the borough silhouette, so no second inset perimeter is drawn and highlights stay within the outer boundary. Area names remain unconfirmed.

Clicking or tapping anywhere on the left door outside the selected borough reverses the zoom. The door receives these events across desktop and mobile layouts, including empty space beyond the SVG frame; the existing SVG background target also covers the map’s full-width mobile overflow. Hit detection uses the actual borough silhouette and current camera transform, so concave gaps count as outside and area clicks remain inside. The temporary background click target and listener are removed when the detail view closes.

Hover hand-off clears the previous green layer immediately, while the new highlight fades in over 120ms. Decorative descendants explicitly ignore pointer events; fixed original target shapes stay above them. Mouse-click focus no longer pins an internal highlight after the pointer leaves; visible keyboard focus retains its highlight.

### Manchester ward names

Manchester’s 32 shapes are labelled from the owner-supplied numbered ward map, preserved in `archive/artwork/borough-source-cutouts/manchester-ward-reference.png`. The positional component-to-ward mapping is stored beside it in `manchester-ward-labels.json`; reference ward numbers are retained for accessible labels. The generator reads those labels on rebuild. Other boroughs remain Area to confirm until their reference maps are supplied. These are map shape labels, not new postcode-sector assignments. Manchester shows ward names and a club-data placeholder; no ward club counts are invented.

### Oldham, Salford and larger detail maps

Oldham and Salford each have 20 ward names matched by shape position to the owner-supplied reference maps. Their reference images and component label files sit beside Manchester’s sources in `archive/artwork/borough-source-cutouts/`. These two references do not number wards; accessible labels omit ward numbers for them.

Each door has a thin grey frame inset 25px from its edges. The overview SVG frame retains its agreed size in both modes. Only the camera changes: detail maps fit their complete silhouette within the door frame with a further 12px gap for glow. Desktop detail maps use the available width and height between the logo and entry heading; mobile retains the stacked map and information layout. The region is centred within those available bounds without stretching its proportions. The camera refits when its frame changes size, including screen rotation. There is no fixed 2x multiplier or drag-to-pan. Postcode rulebook assignments and club counts remain unchanged.


### Mobile overview only

At widths of 640px or less, the landing map retains borough highlighting, selection and the idle tour, but does not open internal ward maps or load their module. Desktop retains internal maps. Resizing an open detail map into the mobile layout restores the overview. Detailed map assets remain available for a future homepage feature.


### Desktop detail size refinement

Desktop detail uses 1.3 times the original fitted regional zoom, capped by the available left-door width and height. Its centre matches the centre of the left door. A map-only clip follows the 25px door inset and prevents artwork crossing into the right door. The door background remains intact, avoiding a bright strip at the centre seam. The overview frame keeps its existing dimensions. Mobile still has no internal zoom.


### Detail information labels

The zoomed map shows two uppercase lines on the right: the selected region or hovered area name, followed by CLUB DATA COMING SOON until real counts are connected. Future counts should read XXX REGISTERED CLUBS. The third sport statistic is hidden only while zoomed; overview labels and demo statistics return on closing.


### Bury and Bolton ward labels

The owner-supplied Bury and Bolton images were matched by position to the existing 17 Bury and 20 Bolton components. Their labels are recorded in the corresponding ward-labels JSON files in archive/artwork/borough-source-cutouts. The source images were supplied as chat attachments; Downloads access was blocked by macOS, so those original image files have not been copied into the archive. No boundary geometry, postcode allocations or club counts were changed. Rochdale and Tameside PDFs were subsequently supplied in tmp/ward-maps and have now been processed.


### All ten boroughs labelled — 23 October 2026

The supplied files in tmp/ward-maps complete the remaining ward names: Rochdale 20, Tameside 19, Wigan 25, Stockport 21 and Trafford 21. There are now 215 named shapes across all ten boroughs. Original references are retained in archive/artwork/borough-source-cutouts, outside the packaged site.

Stockport's supplied 2022 electoral order map and Trafford's supplied May 2023 vector map differ from the older internal artwork. Their replacement partitions come from the PDF's ward/perimeter linework and the SVG's 21 ward polygons respectively. scripts/prepare-ward-partitions.py recreates those labelled raster partitions offline; scripts/build-region-details.py traces them into the existing browser module. Other borough names are matched by position to the existing traced components. The approved outer silhouettes are retained, so this remains a stylised map rather than a surveyed boundary service.

Postcode allocations and club counts are unchanged. Detailed views still show CLUB DATA COMING SOON. Mobile remains overview-only. No extra runtime library or external map service is added.


### Browser zoom alignment

Detail camera movement now animates the SVG transform attribute, keeping native path hit areas, drawing coordinates and outside-click conversion on the same matrix. Window and visual-viewport resize events trigger a refit even when CSS size limits leave the map's measured dimensions unchanged. Resize work is grouped into one animation frame. Mouse-click focus no longer keeps a ward highlighted after the pointer leaves; visible keyboard focus still does. All resize listeners and animation frames are removed when detail closes. Browser zoom interaction still requires a visual browser check.


### Clicks on zoomed desktop browsers

The overview-only restriction now requires a viewport at most 640px wide plus a coarse pointer with no hover. A desktop mouse keeps access to internal maps even when browser zoom narrows the CSS viewport below 640px. Clicks delivered to native ward targets are accepted directly and excluded from the separate outside-click coordinate check. This does not add new functionality to the phone layout.


### Entry handover and visit setting

showOnEveryVisit is false again. The existing sessionStorage entered flag skips the welcome on refresh and later homepage visits in the same tab session. New tab sessions can show it again; direct club links still bypass the welcome.

The reveal transforms only gallery-main, not the whole home-content wrapper containing the fixed navigation. Navigation fades in at its final viewport position during the same reveal. The homepage reserves scrollbar space to reduce width changes when the scroll lock ends. Temporary compositing hints are limited to the opening phase. Reduced-motion preferences still bypass the animation. The smoothness of the handover has not yet been verified visually in a browser.
