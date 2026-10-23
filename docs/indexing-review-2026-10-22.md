# Indexing review — 22 October 2026

## Scope and evidence

Reviewed the 21 URLs supplied from Search Console's “Crawled — currently not indexed” report. Their reported crawls were 16–17 October. All 21 returned HTTP 200 during the public-page check, with no robots meta restriction or X-Robots-Tag restriction. Their canonical links use the existing `.html` URLs.

These checks establish public accessibility, not inclusion in Google's index. Search Console access was declined in the browser, so current private URL Inspection results could not be retrieved. Do not treat this report as proof of indexing or of Google's reasons for exclusion.

## Canonical URLs to inspect first

The four supplied extensionless addresses identify these preferred pages:

- https://0161active.co.uk/html/hockey/bowdon-club.html
- https://0161active.co.uk/html/run-club/chorlton-runners-running.html
- https://0161active.co.uk/html/sports/basketball.html
- https://0161active.co.uk/html/cycling/stockport-community-cycling-club.html

Use URL Inspection on these addresses before requesting indexing. The owner already confirmed that the main sports directory's `.html` page is on Google; its extensionless address was previously unknown to Google.

Other priority inspections:

- https://0161active.co.uk/html/athletics/sale-harriers.html
- https://0161active.co.uk/html/health-and-wellbeing/rehab-fitness.html
- https://0161active.co.uk/html/sports/hockey.html

If an inspection says “URL is on Google”, no resubmission is needed. A successful live test establishes eligibility, not guaranteed indexing. Do not repeatedly submit all 21 URLs.

## Local content improvements

Added short, paraphrased descriptions to eight previously blank club records, based on the official sources below. Each source is recorded with `supports: description` in `data/clubs.json`. Public research does not mark a club verified or change its Last Confirmed date.

| Club | Official description source |
| --- | --- |
| Bolton United Harriers & Athletics Club | https://www.boltonunitedharriers.co.uk/membership/ |
| Wigan & Orrell Archers | https://www.wiganandorrellarchers.club/ |
| Preston Basketball Club | https://www.prestonbasketball.com/ |
| Bowdon Club — Hockey | https://bowdonclub.com/ |
| Stockport Clarion Cycling Club | https://stockport-clarion.org.uk/ |
| Rochdale Harriers & AC | https://rochdaleharriers.org.uk/thinking-of-joining/ |
| Stockport Community Cycling Club | https://www.sccc.co.uk/ |
| Stalybridge Archery Club | https://www.stalybridgearcheryclub.uk/ |

The eight records still have no session entries. No training times, fees, contacts or club-verification claims were added. Preston's official website now uses “City of Preston Basketball”; its existing database name and league assignments have not been renamed.

## Chorlton Runners duplication

Two records identify the same club and official website:

| Record | Existing information |
| --- | --- |
| `chorlton-runners` — Athletics | Three user-submitted sessions: Tuesday, Friday and Sunday. No club description or contact email. |
| `chorlton-runners-running` — Run Club | Description, membership email and three-taster information. No session entries. |

Recommendation: combine them into one club record, retaining both sport categories, all three sessions, and the contact/description/taster information. Retain one established profile URL and permanently redirect the retired profile to it. Update saved-club ID handling so existing favourites continue to work. Do not simply delete one record or put the same schedule on two competing profiles.

This is a review recommendation. No records have been merged or deleted, and no redirects were changed.

## Remaining data issue

`radcliffe-borough-juniors` has an explicitly labelled demonstration session. Replace it with club-supplied information before treating it as a real attendance option. The owner previously authorised that demonstration data; this review did not silently remove or replace it.

## Publication and limits

Content changes are local until the owner deploys them. No Search Console requests, messages to clubs, commits, pushes or deployments were performed. Google may still choose not to index a technically accessible page.

References:

- https://support.google.com/webmasters/answer/7440203
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
