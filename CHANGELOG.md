# Changelog

## Unreleased

### Added

- Retention schedule for consent-based club inclusion, with listing removal within 48 hours of receiving notice.

- Contact us navigation and a complete contact page with correction and registration routes.
- Shared static footer with contact email, registration, correction and privacy links.
- Draft privacy policy identifying Cian Hutton as owner and recording the unsuccessful-application deletion rule.

- Custom 404 page matching the site design.
- Page-specific meta descriptions and branded social preview images.
- Static club profiles with visible public-source check dates and unverified status where research dates are missing.
- Generated sitemap and robots.txt, excluding unfinished and demonstration pages.
- Metadata generators and a shared public-domain setting.

### Changed

- Calendar navigation explains the combined day filter, places a complete filter reset below the weekday buttons, and gives every selected day its own animated top and bottom lines.
- Selected calendar days share one combined agenda and an eyebrow listing every chosen weekday, with weekday labels on individual sessions.
- Mobile homepage gallery captions stay visible over grayscale photos, using neon green text; desktop retains its original black captions and hazy green hover effect.
- Increased session text sizes across the calendar, club profiles and sport glossaries; enlarged small information controls and adapted narrow timetable layouts.
- Made sport-glossary club names link to their profiles while retaining the row arrows.
- Added a data-driven training summary near the top of every club profile, including booking notes, irregular schedule notes and a link to the full timetable.
- Calendar weekday selections now show only clubs with sessions on every selected day, including the active sport, price and area filters.
- Consolidated club/sport JSON loading and online-profile URL validation across shared page components.
- Removed the unused browser profile-rendering fallback, legacy component styles and experimental pages.
- Assigned all HTML metadata to the Node generator; share-image generation now reads resolved profile areas and writes images only.
- Calendar prepares matching sessions once and renders only the selected view, including multiple weekday agendas.

- Homepage gallery images are decoded before animation, with stable responsive loop widths to avoid blank tiles during resizing.

- Homepage links and canonical URL use the domain root, with Netlify redirects for /index and /index.html.
- Club page titles identify the individual club in the initial HTML.
- Profile content remains available if the shared-data request fails.

These changes have not yet been confirmed as deployed.

- Simplified cookie acknowledgement controls, removed unused footer styling, shared calendar/map filters, and exported the profile renderer for static generation without redundant browser rendering.

- Added Netlify-provided reCAPTCHA to club registration, token validation and retry handling, with updated privacy and cookie disclosures. Live deployment testing is outstanding.

- Added global skip links, accessibility preferences for larger body text and reduced motion, and a gallery pause control. Corrected decorative mission image alternatives and added image-alt validation.

- Reduced-motion gallery now scrolls both rows together in a single keyboard-accessible horizontal region.

- Pausing the homepage gallery enables shared manual scrolling; resuming continues from the chosen position while keeping both rows' looping motion.

- Added a dated training-times confirmation badge to club profiles, lists and calendar. No clubs are marked confirmed yet.
