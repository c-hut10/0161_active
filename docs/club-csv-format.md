# Club responses: CSV and JSON

`templates/club-registration.csv` now uses the 27 agreed Master headings. The form CSV download and receiving-side spreadsheet copy share this column order. `js/club-submission.mjs` owns the headings and the named-field mapping. The importer matches by headings, so column order may vary.

## Current Master format

Use one row per session, repeating the club details. Each row has Club ID and Session ID. The registration form generates stable IDs; do not merge sessions into a single cell. The final Update Timestamp column belongs to the spreadsheet and is blank when exported directly from the form.

The five yes/no columns use TRUE/FALSE or Not confirmed. Payment Type retains Per session, Monthly membership, Annual membership, Free or Not confirmed. Membership amount (£) applies only to Monthly/Annual membership; Session Price (£) applies only to Per session. Other payment cells use FALSE. Zero is valid. Kit details, gender eligibility and league names use FALSE when their controlling answer is FALSE. End time may be blank.

Separate multiple league names with semicolons or line breaks. League names are supplied without scope; their team name defaults to the club name. Kit answers are retained as kitRequired and kitDetails in imported club records. Session IDs are retained as each session's id. The importer rejects duplicate Session IDs and missing IDs on rows containing session details. A FALSE Session ID denotes a club-only placeholder, not a session.

Review with `node scripts/import-club-csv.mjs <responses.csv>`. It does not write unless `--write` is explicitly added. New/changed responses replace the specified club's session list; include all its sessions. Existing images and profile routes remain attached. Clubs absent from the CSV are not deleted.

## Legacy JSON-path CSV compatibility

The remaining mapping below describes earlier submissions. These headings remain accepted by the importer; they are no longer emitted by the current registration form. The legacy header template is `templates/club-registration-legacy.csv`. Retired questions remain supported for historical imports, without being shown to new applicants.

## One row per session

Repeat the same club answers on every row for that club, except that `price.amount` may vary by row for `per_session` payment. Use a separate row for every training session, even when sessions share a time or venue. Conflicting club-wide answers block an import. Same-day/start-time sessions are retained but reported for review.

Leave `id` blank for a new club to generate it from its name. For an existing club, supply its existing JSON `id`, especially when changing its name. All sessions in a new response replace that club's previous session list; include its complete schedule. Existing photos and profile paths are retained. An import does not remove clubs absent from the CSV.

For a club without a known schedule, supply one club row and leave every `sessions.*` column blank. This creates `sessions: []`.

The flat `clubs` array in `data/clubs.json` is sorted by displayed sport name A–Z, then club name A–Z (case-insensitive, with ID as a tie-breaker). CSV imports retain this ordering. There are no comment or heading records; league-only participants remain in the separate `leagueGuests` array.

## Questionnaire mapping

| CSV heading | Questionnaire answer | JSON value |
| --- | --- | --- |
| `id` | Owner identifier, not a question | `id` |
| `name` | Club name | `name` |
| `sport` | Sport or activity | `sport`, normalised sport identifier |
| `beginnerFriendly` | Is your club beginner friendly? | `yes` → true, `no` → false, blank → `null`; separate from session experience levels |
| `genderSpecific` | Is your team/club gender-specific? | `yes` → true, `no` → false, unknown blank → `null` |
| `genderEligibility` | Who is it for? | User's own wording, required for Yes; otherwise blank/null |
| `participatesInLeague` | Do you participate in a league? | `yes` → true, `no` → false, unknown blank → `null` |
| `participatingLeagues.teamName` | Team name | Actual team name on each matching line |
| `participatingLeagues.name` | What's the name of the league? | One name per line in the CSV cell |
| `participatingLeagues.coverage` | How far does the league cover? | Matching lines: `internal`, `local_county`, `regional`, `national` |
| `description` | About the club | `description` |
| `contact` | Public contact email | String email or `null` |
| `onlineProfile.url` | Website or social link | URL or `onlineProfile: null` |
| `price.type` | Payment type | `free`, `monthly_fee`, `annual_fee`, `per_session`, `unknown` |
| `price.amount` | Session or membership price (£) | For `per_session`, the charge for the session on this row (zero is free); for monthly/annual membership, the club membership charge. Free becomes 0, unknown becomes `null`. |
| `membership.period` | Optional membership period | `monthly`, `annual`, or blank |
| `membership.amount` | Optional membership price (£) | Positive amount in pounds |
| `membership.sessionAmount` | Member session price (£) | Zero or positive amount in pounds |
| `tasterSessionCount` | Taster sessions | Non-negative whole number or `null` |
| `bookingRequired` | Booking required | `yes` becomes true; `no` becomes false |
| `additionalInformation` | Additional information | Public profile text or `null` |
| `sessions.title` | What would you like this session to be called? | Session `title` |
| `sessions.dayOfWeek` | Day | Monday 1 through Sunday 7 |
| `sessions.startTime` | Start time | `HH:MM`, 24-hour time |
| `sessions.endTime` | End time | `HH:MM` or blank |
| `sessions.meetingPoint` | Training address | Session `meetingPoint` |
| `sessions.postcode` | Postcode | Uppercase postcode with one space before final three characters |
| `sessions.eligibility` | Experience level | `Beginner`, `Intermediate`, `Advanced`, `All Abilities`, or blank |
| `sessions.specialConsiderations` | Special considerations | Public session note or `null` |

Currency defaults to GBP. Paid pricing requires an amount and explicit booking yes/no. Leave paid-only columns blank for Free or Unknown. Unknown answers stay null rather than becoming invented values. Empty session names default to Training followed by the supplied experience level.

For `per_session`, `price.amount` belongs to the session on that row and may vary between rows for the same club. Enter zero for a free session; do not leave a confirmed per-session charge blank. The importer stores an explicit session price for each row. All other club-wide answers must still match across rows. Monthly and annual membership amounts remain club-wide. Registration's Payment type selection uses these same stored types and keeps the existing 29-column export order.

## Optional membership alongside session pricing

The CSV now has 29 columns. Older 28-column files need `beginnerFriendly`; leave it blank for clubs that have not answered. Older 26-column files also need `genderSpecific` and `genderEligibility`; leave both blank for clubs that have not answered. Replace the former `participatingLeagues` column with `participatesInLeague`, `participatingLeagues.teamName`, `participatingLeagues.name` and `participatingLeagues.coverage`. Older 25-column files also need the team name column; older 22-column files need all four league columns. Older 19-column files also need the three membership columns. Leave unknown cells blank and do not invent beginner friendliness, eligibility, team names, league coverage or memberships.

Beginner friendliness is a required Yes/No question in section 01 of the public form. It appears as BEGINNER FRIENDLY: Yes or No in the profile and live preview; the row is hidden while the answer is unknown. Existing clubs use `beginnerFriendly: null` until they supply an answer. Never infer this club-wide answer from session eligibility or a description mentioning beginners.

Gender eligibility is club-wide. Yes reveals an initially empty, required text box accepting the club's own wording (up to 150 characters). No stores `genderSpecific: false` and `genderEligibility: null`, displayed as All genders. Unknown answers remain null and the profile row stays hidden. Profiles and the registration preview show GENDER ELIGIBILITY immediately below SPORT. These fields do not change session experience levels or assign gender eligibility to individual league teams.

For a pay-per-session club with an £8 standard price and an optional £30 annual membership reducing each session to £5, use:

| Field | Value |
| --- | --- |
| `price.type` | `per_session` |
| `price.amount` | `8` |
| `membership.period` | `annual` |
| `membership.amount` | `30` |
| `membership.sessionAmount` | `5` |

This stores `membership: { period: "annual", amount: 30, sessionAmount: 5 }` alongside the existing `price` object. All three membership answers are required when an optional membership is offered. Set member session price to `0` when sessions are included. Repeat membership answers on every row for the club.

Optional membership applies only to `per_session`. Leave all three fields blank for no optional membership or membership-only clubs. Membership-only clubs continue to use `monthly_fee`/`annual_fee` and `price.amount`; the public labels are Monthly membership and Annual membership. No optional membership is stored as `membership: null`.

Profiles show COST for the standard price and OPTIONAL MEMBERSHIP for the recurring price plus member session price. Calendar Membership matches membership-only clubs and pay-per-session clubs with a complete optional membership; the latter also match Pay-per-session. An imported member session price higher than the standard price is flagged for owner review.

Readable Google Sheet headings for the pricing block are Payment Type, Standard Price (£), Membership Period, Membership Price (£), Member Session Price (£). Export using the exact CSV field names above for direct import.

## Participating leagues

The basics asks Yes/No for league participation. Yes reveals required team name, coverage and league name questions, with Add another league for multiple team/league combinations. Users enter each team name directly. No hides the follow-up fields and stores an empty league list. Existing records with no answer keep `participatesInLeague: null` rather than an invented No.

In CSV, place each team name on a separate line within its cell, with the corresponding league name and coverage on matching lines of their cells. For example teams `Manchester Titans 1` then `Manchester Titans 2` pair with their respective league names and coverages. Repeat the same complete answers on each session row for the club. Do not create extra training rows just to list leagues. CSV quoting preserves multiline cells; commas and semicolons can remain part of league names.

JSON stores `participatingLeagues: [{ teamName: "Manchester Titans 1", name: "Manchester League", leagueUrl: null, coverage: "local_county" }]`. The shared JSON format includes `leagueUrl` directly after `name`: supply the organiser's HTTP(S) URL or leave it `null` when unknown. This owner-maintained field is separate from a team's optional `url` and is not a registration question or CSV column. League pages show a grey “League Website” link beneath the title only when `leagueUrl` is supplied; it opens in a new tab. Use the same organiser URL across records for the same league; conflicting supplied URLs stop the build for review.

Names are trimmed, repeated spaces collapsed and exact team/name/coverage duplicates removed ignoring name case. Import review rejects missing team or league names, missing/invalid coverage and conflicting coverage for the same league within a club. Use consistent names across clubs; different abbreviations are not automatically merged.

Profiles display each league name once in the LEAGUE row without team names. Internal leagues display as “League name · Internal”, with no link; the registration preview uses the same label. Local/County and Regional names link to their league pages, while National names can link to a supplied organiser URL. Team names remain stored and displayed in the glossary's league rosters. Individual sport glossary club rows do not display league membership text. Local leagues cards and Sports directory league counts use only Local/County and Regional records; Internal and National records do not get league pages or count towards discovery. Use `internal` for a league organised by the club for its own members. League sections remain dormant when their qualifying list is empty.

Sport glossaries include Local leagues above their filters, with coverage-labelled cards and separate participating-club and team counts. Card headings link to generated pages at `/html/leagues/<sport>/<league>.html`; expandable team lists remain in the glossary. `templates/league-page.inc` supplies the shared page layout, showing each team and its parent club with a profile or external website link. The build generates qualifying Local/County and Regional league pages, checks for filename collisions and includes titles, descriptions, sharing metadata, structured team lists and sitemap entries. Internal and National leagues remain profile-only. Club training sessions are not assigned to individual teams by these league fields and are not displayed as team schedules on league pages.

“Same location as previous session” copies the previous address and postcode; it is an input convenience, not a second stored fact. The CSV still contains the copied values. reCAPTCHA/honeypot/form-name are submission controls, not club answers.

Areas and weekday labels are derived. Do not add `area`, `day`, `group`, club `title`, `regularSessionAttendance`, `location`, `phone`, or `onlineProfile.platform` columns. Photos, page paths, coordinates, source URLs, visibility and verification are owner-managed data outside the questionnaire. Existing session `subtitle`, `venueNotes` and `everyOtherWeek` remain available for legacy records; they are not questions in the current form.

### Basketball league roster import

Men and Women together display as All Welcome in profiles and the registration preview. The original gender eligibility wording remains stored in JSON and CSV.

The October 2026 basketball roster was reviewed separately from the universal form-response CSV. Multiple teams merge into one club; multiple supplied gender labels display separated by ` · `. Each participating league can retain a team-specific `url`, useful when teams such as YMCA have different source pages. Non-email contact cells and all first-column notes/phone numbers are omitted.

Owner-approved undated venues are stored as `trainingVenues: [{ meetingPoint, postcode }]`, separate from `sessions`. They support postcode-derived areas without appearing as calendar sessions. Broad town suffixes and embedded postcodes are removed from the venue text, with the postcode retained separately. This is an owner-managed roster field, not an additional registration question. All postcode grouping rules and the list of covered sectors are maintained in `docs/postcode-area-rulebook.md`; unlisted sectors remain uncategorised.

For profiles with no derived area, restore an already recorded training venue and postcode into `trainingVenues` where available. Do not create sessions, infer postcodes from club names, use correspondence addresses as training venues, or mark historical records as club-confirmed. Conflicting venue records require clarification. On 11 October 2026, 19 such venues were restored from `docs/club-data-review.md`; 18 resolve through the current rulebook, while Stalybridge Archery Club's SK15 2QS remains unmapped. The migration review document retains its historical snapshot.

The top-level `leagueGuests` list holds participants for league rosters only. These records have no profile path and do not enter the club finder or calendar. Guests with a known club and supplied HTTP/HTTPS URL open that URL in a new tab with `rel="noopener noreferrer"`; local teams link to their parent club profile in the current tab. Teams whose parent club is unknown use `teamOnly: true`, have no website links, and count as teams but not known clubs. This compiled roster does not mark clubs verified or refresh Last Confirmed dates.

## Session-specific costs and booking

Owner-managed session records can include `price: { type, amount, currency }` and `bookingRequired: true | false | null`. A missing session price inherits `club.price`; an explicit `free` price is zero, and an explicit `unknown` price remains unknown. Session booking answers describe that session only. Profile timetables, weekly/daily calendars and calendar downloads show these session terms, while calendar price filters match each session's actual price. The profile COST row lists the distinct session costs.

These optional overrides are not additional public registration questions or columns in the standard registration CSV yet. The Ultimate Frisbee roster supplied on 11 October 2026 uses its per-row pricing and booking columns to populate the overrides. DUFFA and Manchester Ultimate each offer a £5 session and a free outdoor session; Black Sheep's price remains unknown. “Manchester Academy School” is the owner-approved correction, with M14 4PX retained. New Manchester Ultimate and Black Sheep records remain unverified because a compiled team list is not itself a club-confirmed registration response.

## Reviewing and applying a response file

```sh
node scripts/import-club-csv.mjs /path/to/responses.csv
node scripts/import-club-csv.mjs /path/to/responses.csv --write
node scripts/build-site-metadata.cjs
```

The first command reviews the CSV without writing. The second applies the reviewed file. Invalid fields/conflicting answers block the whole import. Unmapped postcodes and same-time sessions are reported and must be reviewed; neither is silently guessed away. Special considerations remain descriptive text, not calculated recurrence dates. Check irregular schedules before offering calendar downloads.

Only import club form-response CSVs through this tool: the owner has specified that these responses count as verification. On applying the file, each imported or updated record becomes `verification: { status: "verified", lastConfirmed: "YYYY-MM-DD" }`, dated in Europe/London. Page generation never refreshes this date. Existing researched/placeholder records remain unverified until a club response is imported.

The profile's grey text reads Last Confirmed followed by the date, or Unverified · Last Confirmed: not yet recorded. The same verification status/date controls badges in profiles, calendars and sport directories.

## Netlify submission

Each visible form answer has the matching named JSON field. Repeated session answers are collected into the named `sessions` field as JSON. A named `registrationCsv` field contains the matching CSV table with one row per session. Copy its text into a `.csv` file for import, or use the template to organise responses from another questionnaire. Netlify continues to store named answers and will not display a spreadsheet table in its dashboard. Its ordinary export may include submission metadata and a JSON sessions cell; that export is not automatically the expanded session-row CSV.

The CSV writer quotes commas and multiline answers. Text starting with a spreadsheet formula character is protected with a leading apostrophe, which the importer removes before storing the answer.

## Existing records needing attention

See `docs/club-data-review.md` for missing/unmapped postcode details and addresses preserved from the migration. These records do not gain an invented postcode or confirmation date. Some clubs have no sessions and therefore no derived area yet.


## Readable master CSV (adopted 15 October 2026)

The owner's master sheet uses readable question headings, rather than JSON paths. Each upload is reviewed and translated into the canonical importer format before use; the command-line importer does not directly accept these readable headings. Column order may vary. The canonical form export remains supported unchanged.

- Repeat Club name on every meaningful row. Club ID may be blank: match existing names/websites carefully before generating a new ID. History Log is owner bookkeeping, not automatically a confirmation date. The agreed import date sets Last Confirmed for approved club responses.
- A row can provide a session, a pricing option, a league, or a combination. Empty session fields on pricing/league rows do not create fictitious sessions. Exact repeated sessions are merged after review; flag coinciding but different sessions for confirmation.
- Payment type uses Free, Unknown, Per session, Membership - Monthly, or Membership - Annual. Standard price (£) is the amount for that row's option. A separate membership row can accompany a per-session row. Member session price (£) must explicitly be 0 when included; blank means not supplied and must be clarified, not assumed free. Retain one optional membership period in the present schema; multiple alternative memberships need review.
- The existing Optional membership, Membership price (£) and Member session price (£) columns can still provide a supplementary membership on a pay-per-session row. If providing separate pricing rows, avoid conflicting amounts in those columns.
- Repeat the club name on league rows; different team/league combinations are collected together. Internal coverage does not require a team name. Other coverages do.
- Session days are 1 (Monday) through 7 (Sunday), times HH:MM, and postcodes complete. Add Experience level for Beginner, Intermediate, Advanced or All Abilities; beginner friendliness does not imply a session experience level.
- Remove unnamed spacer columns and ignore rows containing only an unchecked same-location checkbox. A checked same-location box must refer to an actual preceding session for that club, not a pricing-only row.
- Blank club fields are reviewed against existing records before replacement, especially contact details. Never erase known information silently. The supplied session list replaces the previous schedule after removals are flagged, including removal of historical invented sessions.
- A multi-sport club keeps one profile, primary sport in `sport`, extra memberships in `additionalSports`, and optional session `sport` overrides. Both sports list the same profile; their glossary and calendar filters show the corresponding sessions. This additional owner-maintained information is not a new form question or canonical CSV column. Preserve/review it on future imports.

For the 15 October batch, South Manchester's £7/session plus £16/month with included sessions and NQ Rebels' £5/session plus £15/month with included sessions were explicitly confirmed by the owner. Manchester Korfball's four league rows describe one shared Thursday training session. The incomplete Spartans row retains the existing touch@villagespartans.co.uk email and known undated venue. The uploaded CSV is not published as a website asset.

## League-roster sheets

League mastersheets describe membership only: they never generate club profiles, replace training sessions, change pricing, or update confirmation dates. Rows inherit the preceding league heading. Team names remain exactly as supplied; in future master sheets the literal shorthand `""` expands to that row's club name, with any suffix retained (for example `"" 1`). Review ambiguous parent-club names before import.

- “No club profile” TRUE: retain the supplied HTTP(S) website, use a league-only guest record, and open its roster link in a new tab.
- FALSE: remove its website cell from the reviewed CSV and do not store a team website fallback. An existing profile is linked directly. Otherwise retain one league-only parent record with `profilePending: true`, `profileClubId` for the intended parent, and no website URL. Teams display as plain text until a matching real profile exists.
- `leagueRecords` resolves pending parents on each build by matching the intended club ID or the parent name within the sport, so the next build after a profile is added activates its team links. These placeholders never appear in the club directory/calendar or create profiles.
- Keep multiple teams under one parent. Match existing clubs before changing membership names; preserve unrelated leagues, schedules and contact data. Reimporting an approved complete roster replaces that roster's memberships rather than appending duplicate teams.

The October 2026 Korfball roster has 37 teams: Northern Regional League (9), North West Korfball League 1 (9), League 2 (9), and League 3 (10). Manchester KC maps to the existing Manchester Korfball profile. Manchester Hawks, Manchester Warriors and University of Manchester await profiles. The 20 local team rows have no website links; the 17 external team rows retain their supplied links. Existing league coverage values are retained.

Booking display: bookingRequired yes explicitly enables public booking guidance and any stored booking notes, regardless of price. No or an unspecified value does not show booking details. Paid rows still require an explicit yes/no answer during import.

Taster counts are independent of regular pricing: tasterSessionCount can be supplied and displayed even when price.type is unknown. A positive count appears on the profile; blank or zero does not.

### Missing training information

Week at a glance displays “Training to be confirmed” when no session has both a valid weekday and a start time. Do not invent missing times. Store supplied venues without a usable schedule in `trainingVenues`, separate from calendar sessions. This also applies to future imports.

### 23 October 2026: v1.2 spreadsheet review

Imported ten clubs from `0161_ACTIVE - v1.2.csv` after review. Row 60's Saturday session and £6 price belong to Salford Basketball; its description belongs to Manchester Sharks Water Polo. Sharks' Sunday venue is the same as Thursday's. These allocations were confirmed by the owner. Manchester Bees has a Wednesday venue but no time, so no calendar session was created. Existing korfball league rosters and contact details absent from the spreadsheet were retained. MCR YMCA Harriers' supplied Tuesday/Thursday venues replace the previous schedule; social and competition annual prices remain distinct. Stretford's last-Sunday condition remains explicit descriptive text, not a weekly attendance claim.
