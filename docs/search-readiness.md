# Search readiness — 9 October 2026

## Implemented locally

- The homepage title is `0161 Active: Sport Club Database`, including social sharing titles.
- The build prerenders 87 club profiles, 15 sport glossaries, navigation, the sports directory and the full-week calendar.
- The sitemap contains 107 unique public URLs. Privacy, 404 and the generic glossary compatibility page remain excluded.
- Club profiles with no supplied About copy now include factual summaries derived from their name, sport and known training areas. The existing invitation to supply fuller information remains. No history, achievements, prices or verification status were invented, and JSON description fields were not overwritten.
- JSON-LD describes the site organization, website, club organizations and directory lists. It does not treat training venues as headquarters, invent dated events, or claim rich-result eligibility.
- Off-screen mission images use lazy loading and asynchronous decoding.
- Mobile calendar select widths and download tooltips no longer widen the page.

## Checks completed

- Existing metadata checker: 110 pages, 87 profiles, 107 sitemap URLs passed.
- JSON-LD parsed successfully on all 110 pages.
- `git diff --check` passed.
- All 17 AVIF images decoded with Pillow.
- Browser checks at 390 × 844: homepage, athletics glossary, Sale Harriers profile and registration fit the viewport. Mobile menu opened, glossary search returned Sale Harriers, and Tuesday + Thursday calendar selection returned 12 clubs / 25 sessions with no page overflow.
- Desktop athletics glossary at 1440 × 900: desktop navigation visible; no page overflow.

These are local checks, not a live Core Web Vitals result or proof of Google indexing. Registration was not submitted during these checks.

## Prerendered homepage gallery

The build now selects up to 10 club photos and embeds their images, captions and profile links directly in the homepage HTML, with repeated copies for the two looping rows. Visits shuffle this existing set between the two rows without fetching the club JSON or selecting a second photo set. Each rebuild rotates the selection. If fewer than 10 photos exist, available photos are repeated.

The loop speed, second-row offset, photo framing and pause/manual-scroll controls are preserved. Without JavaScript, the gallery stops moving, permits horizontal browsing, and hides the inactive pause button.

## Performance follow-up

The selected logo PNG is about 1.3 MB and is used for the favicon and social image. A smaller derived favicon would reduce transfer size, but the requested original logo has been retained. Local file sizes and responsive checks do not establish real-user loading speed.

## After the owner deploys

1. Deploy the generated HTML, changed JavaScript/CSS, templates, JSON, `robots.txt`, `_redirects` and `sitemap.xml` together using the existing project workflow.
2. In Search Console, select `0161active.co.uk`, open **Sitemaps**, and submit `https://0161active.co.uk/sitemap.xml`.
3. Use **URL inspection → Test live URL** for the homepage, `/html/sports/athletics.html`, `/html/sports/run-club.html`, `/html/athletics/sale-harriers.html` and `/html/calendar.html`.
4. Inspect the rendered HTML and confirm club lists, sessions, the canonical URL and metadata are present. Request indexing for the homepage and representative new sport pages; the sitemap covers the remaining pages.
5. Run PageSpeed Insights for the deployed homepage and calendar on mobile. Review loading metrics and any image-size recommendations. Newly verified properties may not yet have field-data reports.

Deployment and Search Console actions are being handled by the owner. Google chooses its displayed titles and may take time to recrawl changes.

Official guidance: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization), [requesting a recrawl](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl), [search result titles](https://developers.google.com/search/docs/appearance/title-link).
