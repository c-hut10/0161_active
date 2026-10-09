# Club responses: CSV and JSON

`templates/club-registration.csv` is the universal questionnaire table. Its column names are JSON paths. `js/club-submission.mjs` defines those columns and normalises answers for both registration and CSV imports. Keep the headings intact; column order may vary.

## One row per session

Repeat the same club answers on every row for that club. Use a separate row for every training session, even when sessions share a time or venue. Conflicting club answers block an import. Same-day/start-time sessions are retained but reported for review.

Leave `id` blank for a new club to generate it from its name. For an existing club, supply its existing JSON `id`, especially when changing its name. All sessions in a new response replace that club's previous session list; include its complete schedule. Existing photos and profile paths are retained. An import does not remove clubs absent from the CSV.

For a club without a known schedule, supply one club row and leave every `sessions.*` column blank. This creates `sessions: []`.

## Questionnaire mapping

| CSV heading | Questionnaire answer | JSON value |
| --- | --- | --- |
| `id` | Owner identifier, not a question | `id` |
| `name` | Club name | `name` |
| `sport` | Sport or activity | `sport`, normalised sport identifier |
| `genderSpecific` | Is your team/club gender-specific? | `yes` → true, `no` → false, unknown blank → `null` |
| `genderEligibility` | Who is it for? | User's own wording, required for Yes; otherwise blank/null |
| `participatesInLeague` | Do you participate in a league? | `yes` → true, `no` → false, unknown blank → `null` |
| `participatingLeagues.teamName` | Team name | Actual team name on each matching line |
| `participatingLeagues.name` | What's the name of the league? | One name per line in the CSV cell |
| `participatingLeagues.coverage` | How far does the league cover? | Matching lines: `local_county`, `regional`, `national` |
| `description` | About the club | `description` |
| `contact` | Public contact email | String email or `null` |
| `onlineProfile.url` | Website or social link | URL or `onlineProfile: null` |
| `price.type` | Pricing type | `free`, `monthly_fee`, `annual_fee`, `per_session`, `unknown` |
| `price.amount` | Standard price (£) | Standard session price or membership-only price; free becomes 0, unknown becomes `null` |
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

## Optional membership alongside session pricing

The CSV now has 28 columns. Older 26-column files need `genderSpecific` and `genderEligibility`; leave both blank for clubs that have not answered. Replace the former `participatingLeagues` column with `participatesInLeague`, `participatingLeagues.teamName`, `participatingLeagues.name` and `participatingLeagues.coverage`. Older 25-column files also need the team name column; older 22-column files need all four league columns. Older 19-column files also need the three membership columns. Leave unknown cells blank and do not invent eligibility, team names, league coverage or memberships.

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

Readable Google Sheet headings for the pricing block are Pricing Type, Standard Price (£), Membership Period, Membership Price (£), Member Session Price (£). Export using the exact CSV field names above for direct import.

## Participating leagues

The basics asks Yes/No for league participation. Yes reveals required team name, coverage and league name questions, with Add another league for multiple team/league combinations. Users enter each team name directly. No hides the follow-up fields and stores an empty league list. Existing records with no answer keep `participatesInLeague: null` rather than an invented No.

In CSV, place each team name on a separate line within its cell, with the corresponding league name and coverage on matching lines of their cells. For example teams `Manchester Titans 1` then `Manchester Titans 2` pair with their respective league names and coverages. Repeat the same complete answers on each session row for the club. Do not create extra training rows just to list leagues. CSV quoting preserves multiline cells; commas and semicolons can remain part of league names.

JSON stores `participatingLeagues: [{ teamName: "Manchester Titans 1", name: "Manchester League", leagueUrl: null, coverage: "local_county" }]`. The shared JSON format includes `leagueUrl` directly after `name`: supply the organiser's HTTP(S) URL or leave it `null` when unknown. This owner-maintained field is separate from a team's optional `url` and is not a registration question or CSV column. League pages show a grey “League Website” link beneath the title only when `leagueUrl` is supplied; it opens in a new tab. Use the same organiser URL across records for the same league; conflicting supplied URLs stop the build for review.

Names are trimmed, repeated spaces collapsed and exact team/name/coverage duplicates removed ignoring name case. Import review rejects missing team or league names, missing/invalid coverage and conflicting coverage for the same league within a club. Use consistent names across clubs; different abbreviations are not automatically merged.

Profiles display each league name once in the LEAGUE row, including national leagues, without team names, coverage labels or links. The preview uses the same rule. Team names remain stored and displayed in the glossary's league rosters. Individual sport glossary club rows do not display league membership text. Local leagues cards and Sports directory league counts use only Local/County and Regional records; National records do not get league pages or count towards discovery. League sections remain dormant when their qualifying list is empty.

Sport glossaries include Local leagues above their filters, with coverage-labelled cards and separate participating-club and team counts. Card headings link to generated pages at `/html/leagues/<sport>/<league>.html`; expandable team lists remain in the glossary. `templates/league-page.inc` supplies the shared page layout, showing each team and its parent club with a profile or external website link. The build generates qualifying Local/County and Regional league pages, checks for filename collisions and includes titles, descriptions, sharing metadata, structured team lists and sitemap entries. National leagues remain profile-only. Club training sessions are not assigned to individual teams by these league fields and are not displayed as team schedules on league pages.

“Same location as previous session” copies the previous address and postcode; it is an input convenience, not a second stored fact. The CSV still contains the copied values. reCAPTCHA/honeypot/form-name are submission controls, not club answers.

Areas and weekday labels are derived. Do not add `area`, `day`, `group`, club `title`, `regularSessionAttendance`, `location`, `phone`, or `onlineProfile.platform` columns. Photos, page paths, coordinates, source URLs, visibility and verification are owner-managed data outside the questionnaire. Existing session `subtitle`, `venueNotes` and `everyOtherWeek` remain available for legacy records; they are not questions in the current form.

### Basketball league roster import

Men and Women together display as All Welcome in profiles and the registration preview. The original gender eligibility wording remains stored in JSON and CSV.

The October 2026 basketball roster was reviewed separately from the universal form-response CSV. Multiple teams merge into one club; multiple supplied gender labels display separated by ` · `. Each participating league can retain a team-specific `url`, useful when teams such as YMCA have different source pages. Non-email contact cells and all first-column notes/phone numbers are omitted.

Owner-approved undated venues are stored as `trainingVenues: [{ meetingPoint, postcode }]`, separate from `sessions`. They support postcode-derived areas without appearing as calendar sessions. Broad town suffixes and embedded postcodes are removed from the venue text, with the postcode retained separately. This is an owner-managed roster field, not an additional registration question. All postcode grouping rules and the list of covered sectors are maintained in `docs/postcode-area-rulebook.md`; unlisted sectors remain uncategorised.

The top-level `leagueGuests` list holds Liverpool and Northwest Warriors for league rosters only. These records have no profile path and do not enter the club finder or calendar. Glossary and league-page roster links open their supplied HTTP/HTTPS URLs in a new tab with `rel="noopener noreferrer"`; local teams link to their parent club profile in the current tab. This compiled roster does not mark clubs verified or refresh Last Confirmed dates.

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
