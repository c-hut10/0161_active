# Metadata and club maintenance

`data/site.json` holds the public origin. Home links use `/`. After changing the origin, run both generators and deploy the generated HTML, images, sitemap and robots file together.

```sh
python3 scripts/generate-social-previews.py
node scripts/build-site-metadata.cjs
```

The image generator needs Pillow and currently uses macOS Arial fonts. The profile generator uses Node's standard library and the same profile renderer as the browser.

Run the profile generator after changes to club data, the profile renderer or indexing policy. It embeds all 84 profiles in the initial HTML, including details, sessions, links and source-check information. Generated profiles are displayed directly. JavaScript only fetches data and loads the renderer if the static profile content is missing. Rebuild and deploy profiles after data changes.

## Verification dates

Every club has a `verification` object:

- `lastSourceCheck`: copied from that club's `research.checkedAt`, or null when no dated research exists.
- `lastConfirmedByClub`: null unless someone has actually confirmed the details directly with the club. Record the evidence in the research notes before setting this date.
- `status`: generated as `unverified`, `public-sources-reviewed` or `club-confirmed`.

Research dates are not publication dates or direct club confirmations. Edit `research.checkedAt` only after checking the sources. Do not change it when rebuilding the site or editing layout. Session-level placeholder flags and existing confirmation notes remain in the data.

## Search indexing

The sitemap includes finished public pages and all club profiles. It excludes the 404 page, navigation fragment, Test and random demonstrations, About/Resources placeholders and the draft privacy policy, and the running redirect page. Full excluded pages carry `noindex, follow`; they remain crawlable so search engines can read that instruction. Remove finished pages from the exclusion set in the profile generator when ready.

The sitemap omits `lastmod` until real content-change dates can be tracked. Never replace research dates with build dates to manufacture freshness. The shared sport glossary still uses a general static canonical/preview; dedicated sport pages are a separate improvement.

## Release checks

Run `python3 scripts/check-site-metadata.py` and `git diff --check`. After deployment, check `/`, the `/index.html` redirect, `/sitemap.xml`, `/robots.txt`, a missing URL and a club profile. Confirm that public pages and share images return successful responses without requiring authentication. Record shipped changes separately from the Unreleased changelog.

## Shared footer and contact navigation

Edit templates/site-footer.inc and css/site-footer.css, then run the profile generator to update the footer in every full HTML page. The footer is static and does not depend on JavaScript. Contact us is the final link in both desktop and mobile shared navigation. The contact page is now included in the sitemap; privacy remains noindex until its draft is complete.

## Training-times confirmation badge

An explicit owner request can also set a club's `confirmed` field. Record the request and confirmation date, set `verification.trainingTimesConfirmedAt`, and rebuild profiles. Set `confirmed` to false when the owner withdraws confirmation.

No clubs currently have direct training-time confirmation. The lime check badge is shown on profiles, sport club lists and calendar names only when `confirmed` is true and `verification.trainingTimesConfirmedAt` contains a valid `YYYY-MM-DD` date. This field is separate from general club confirmation and public-source review. Record who confirmed the current schedule, when, and the evidence in the club research notes before setting it. Rebuild static profiles after changing it. Clear it when session times change without fresh club confirmation. The date appears in the profile text and in the badge's accessible label and hover tooltip.
