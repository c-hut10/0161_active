# Registration form on Netlify

The static form in `html/register.html` is named `club-registration`. Its questions now follow the agreed Clubs / Master / Sessions spreadsheet fields. Netlify stores submissions for manual review; it does not directly write to Google Sheets or publish club records.

## Questions and conditions

- Club name, sport, payment type, beginner friendliness, kit requirements, gender eligibility, league participation, booking and free tasters are collected in The basics.
- Kit details appear and become required only when kit is required.
- Gender eligibility appears and becomes required only for a gender-specific club.
- League participation reveals league names only. Team name defaults to the club name; coverage is left unknown rather than guessed. Multiple league names can be added.
- Monthly/annual membership reveals Membership amount (£). Per session reveals a separate required price for every training session. Zero is allowed.
- Booking and free-taster questions are available for every payment type, including Free.
- Each training session collects its name, day, price when relevant, start time, optional end time, address, postcode and extra session information.
- Same location as previous session remains an input shortcut; the full address and postcode are copied into that session's own record.
- Contact email and website/social link are in Contact details.
- League scope, team-name questions, optional membership/member rates, session experience level and extra club information are no longer asked. Existing stored club records are not rewritten by changing the form.

## One session means one spreadsheet row

Every added session receives a stable Session ID. The application has one shared Club ID. Both IDs remain the same while editing the form, downloading answers and sending the application.

`registrationCsv` and the CSV download use the 27 Master headings in `templates/club-registration.csv`, in exactly the same order as `tools/google-sheets/0161.gs`. Three sessions produce three rows, repeating the club details on each. Two sessions at the same venue or time still remain separate rows. Multiple leagues do not multiply the session rows. Their names share one cell, separated by semicolons; the importer reads them as separate leagues.

`spreadsheetCopy` contains those same data rows as tab-separated text, without headings. Copy its complete value into the first empty Master row, starting in Club ID. The Apps Script then creates/updates the linked Clubs and Sessions views. No public copy control is added.

TRUE/FALSE answers export in uppercase. Unknown answers use Not confirmed. Inapplicable membership/session amounts and conditional answers use FALSE. Flexible end times remain blank. Update Timestamp is blank on form output because the spreadsheet owns its actual edit timestamp.

CSV retains paragraphs and quotes commas/newlines. The spreadsheet-copy version flattens internal tabs and newlines so each session occupies exactly one row when pasted. Formula-like text is escaped. Verify that Netlify's notification email preserves tabs before relying on email-to-spreadsheet copying.

The named `sessions` field separately holds the complete session JSON array, including each ID and its individual price. It is an additional representation, not a replacement for the separate CSV/spreadsheet rows. `submissionSummary` holds the readable review text shown to the applicant. Five yes/no answers use actual booleans in the JSON and TRUE/FALSE in the spreadsheet export; the underlying named select values remain yes/no.

## Deploy and verify

1. Enable form detection in the site's Netlify Forms settings if necessary.
2. Deploy the updated HTML and scripts so Netlify detects the revised named fields, including kitRequired and kitDetails.
3. Confirm `club-registration` appears in Forms. Configure an email notification to the intended receiving address in the Netlify dashboard if not already configured.
4. Submit one clearly labelled application with three sessions. Confirm the notification and stored submission contain three CSV/spreadsheet rows, distinct Session IDs and one shared Club ID.
5. Check kit Yes/No, league Yes/No, monthly/annual membership, Per session and Free. Confirm hidden conditional answers are absent from the active form submission and exported as FALSE where inapplicable.

Local form/output checks do not verify deployment, Netlify field detection or email rendering. No live submission was sent during this update. Older submissions retain their old fields; the importer still accepts the earlier JSON-path CSV schema.

## Submission and spam handling

The existing URL-encoded POST, bot-field honeypot, Netlify reCAPTCHA, retry handling and success screen remain. Required answers are validated before sending. Local previews do not submit to Netlify. Deployment is required to render and verify Netlify's CAPTCHA and form detection. Applications are reviewed manually before import.
