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

- Homepage gallery images are decoded before animation, with stable responsive loop widths to avoid blank tiles during resizing.

- Homepage links and canonical URL use the domain root, with Netlify redirects for /index and /index.html.
- Club page titles identify the individual club in the initial HTML.
- Profile content remains available if the shared-data request fails.

These changes have not yet been confirmed as deployed.

- Simplified cookie acknowledgement controls, removed unused footer styling, shared calendar/map filters, and exported the profile renderer for static generation without redundant browser rendering.

- Added Netlify-provided reCAPTCHA to club registration, token validation and retry handling, with updated privacy and cookie disclosures. Live deployment testing is outstanding.

- Added global skip links, accessibility preferences for larger body text and reduced motion, and a gallery pause control. Corrected decorative mission image alternatives and added image-alt validation.

- Reduced-motion gallery now scrolls both rows together in a single keyboard-accessible horizontal region.

- Pausing the homepage gallery enables shared manual scrolling; resuming resets the scroll position and restores the animated rows.

- Added a dated training-times confirmation badge to club profiles, lists and calendar. No clubs are marked confirmed yet.
