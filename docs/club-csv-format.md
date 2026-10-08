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
| `description` | About the club | `description` |
| `contact` | Public contact email | String email or `null` |
| `onlineProfile.url` | Website or social link | URL or `onlineProfile: null` |
| `price.type` | Pricing type | `free`, `monthly_fee`, `annual_fee`, `per_session`, `unknown` |
| `price.amount` | Amount in pounds | Number; free becomes 0, unknown becomes `null` |
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

“Same location as previous session” copies the previous address and postcode; it is an input convenience, not a second stored fact. The CSV still contains the copied values. reCAPTCHA/honeypot/form-name are submission controls, not club answers.

Areas and weekday labels are derived. Do not add `area`, `day`, `group`, club `title`, `regularSessionAttendance`, `location`, `phone`, or `onlineProfile.platform` columns. Photos, page paths, coordinates, source URLs, visibility and verification are owner-managed data outside the questionnaire. Existing session `subtitle`, `venueNotes` and `everyOtherWeek` remain available for legacy records; they are not questions in the current form.

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
