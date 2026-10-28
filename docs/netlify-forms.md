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

The public form does not assign Club IDs or Session IDs. Their columns stay blank until the receiving spreadsheet imports the application. A separate submission reference identifies the application for duplicate-import checks; it is never used as a club or session ID.

`registrationCsv` and the CSV download use the 27 Master headings in `templates/club-registration.csv`, in exactly the same order as `tools/google-sheets/0161.gs`. Three sessions produce three rows, repeating the club details on each. Two sessions at the same venue or time still remain separate rows. Multiple leagues do not multiply the session rows. Their names share one cell, separated by semicolons; the importer reads them as separate leagues.

`spreadsheetCopy` contains those same data rows as tab-separated text, without headings. Its Club ID and real-session Session ID cells are blank. The preferred receiving workflow is the reviewed import below, rather than direct pasting, because direct pasting does not record the submission reference. No public copy control is added.

TRUE/FALSE answers export in uppercase. Unknown answers use Not confirmed. Inapplicable membership/session amounts and conditional answers use FALSE. Flexible end times remain blank. Update Timestamp is blank on form output because the spreadsheet owns its actual edit timestamp.

CSV retains paragraphs and quotes commas/newlines. The spreadsheet-copy version flattens internal tabs and newlines so each session occupies exactly one row when pasted. Formula-like text is escaped. Verify that Netlify's notification email preserves tabs before relying on email-to-spreadsheet copying.

The named `sessions` field separately holds the complete session JSON array, including each individual price, without IDs. It is an additional representation, not a replacement for the separate CSV/spreadsheet rows. `submissionSummary` holds the readable review text shown to the applicant. Five yes/no answers use actual booleans in the JSON and TRUE/FALSE in the spreadsheet export; the underlying named select values remain yes/no.

## Import a registration into Sheets

The hidden `registrationImport` field contains JSON with version 1, the submission reference, the agreed 27 headings and one row per session. The hidden `submissionReference` field also exposes the reference separately. Neither field changes the public form interface.

1. Copy the complete `registrationImport` JSON block from the notification email.
2. Choose **0161 Active → Import registration** in the spreadsheet.
3. Paste the block and choose **Preview registration**. Review the club name, sport and session count.
4. Choose **Import registration**. Sheets assigns the numbered Club ID and a distinct Session ID for every actual session, including sessions with identical schedules. It updates Master, Clubs and Sessions through the existing sync rules.
5. Use the normal CSV preparation workflow when ready to update the website. The public form download is not an authoritative website update file because it has no official IDs.

The importer discards all supplied IDs and timestamps, even if the pasted JSON was altered. It records imported submission references in the saved state and rejects repeat imports. A submission matching an existing club name is stopped for manual review as an update; it cannot silently overwrite that club. A club without sessions gets a club-only Master placeholder rather than an invented session.

## Deploy and verify

1. Deploy the updated HTML and scripts so Netlify detects the revised named fields, including `registrationImport` and `submissionReference`.
2. Replace the spreadsheet's complete Apps Script with the updated `tools/google-sheets/0161.gs`, save and reload Sheets. Do not run Fresh Start for this update.
3. Confirm the notification includes the complete import JSON. Submit one clearly labelled application with three sessions and verify three rows with blank IDs before import.
4. Preview and import on a copied spreadsheet. Verify one numbered Club ID, three distinct Session IDs and three Master rows. Try importing the same block again and confirm it is rejected.
5. Check kit Yes/No, league Yes/No, monthly/annual membership, Per session and Free. Confirm conditional answers export as FALSE where inapplicable.

Local form/output checks do not verify deployment, Netlify field detection or email rendering. No live submission was sent during this update. Older submissions retain their old fields and cannot use this JSON import unless converted and reviewed separately.

## Submission and spam handling

The existing URL-encoded POST, bot-field honeypot, Netlify reCAPTCHA, retry handling and success screen remain. Required answers are validated before sending. Local previews do not submit to Netlify. Deployment is required to render and verify Netlify's CAPTCHA and form detection. Applications are reviewed manually before import.
