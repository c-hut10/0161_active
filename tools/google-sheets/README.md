# 0161 Active spreadsheet sync

Use **0161.gs**. It replaces the earlier `UpdateTimestamp.gs` component. Do not install both.

This is a Google Sheets Apps Script for one spreadsheet with three editable tabs. It does not access your account until you install and authorise it yourself. No website files were changed.

## Install

1. First make a separate copy of your spreadsheet. Try the script there before using your working data.
2. Name the three tabs `Master`, `Clubs`, `Sessions`. The script also recognises `mastersheet`, `club`, `club sheet`, `session` and `session sheet`. For other names change the first three settings in `ACTIVE`.
3. Row 1 must contain the headings below. Columns can initially be in a different order. An entirely empty tab can be created automatically. A partly populated tab must have every heading for that tab, except Update Timestamp which can be added automatically. Remove unnamed columns containing data and old headings that are no longer part of this schema, after preserving them in your separate copy.
4. Open **Extensions → Apps Script**. Remove the old timestamp script, including its `onEdit` function. Paste the complete contents of `0161.gs` into the editor and save.
5. Choose `setup0161` from the function selector and click **Run**. Review the Google permission request. Run this once as the spreadsheet owner, rather than separately for every editor.
6. Reload the spreadsheet. The **0161 Active** menu provides manual sync, export, backup and recovery.

Setup backs up the three tabs as hidden sheets before merging them. It installs one edit trigger and one change trigger. Running setup again replaces only this component's triggers. Do not manually run `activeEdit0161` or `activeChange0161`.

The installable trigger pattern follows [Google Workspace's official Apps Script examples](https://github.com/googleworkspace/apps-script-samples/blob/main/triggers/triggers.gs).

## Headings

**Clubs** has these headings, with `Update Timestamp` last:

```text
Club ID
Club name
Sport or activity
Contact email
Website or social link
Beginner friendly?
Kit requirements for newcomers?
Kit Details:
Gender-specific?
Gender eligibility — if applicable
About the club
Payment Type
Membership amount (£)
Booking required?
How many free taster sessions do you offer newcomers?
Participate in a league?
League name
Update Timestamp
```

**Sessions** has:

```text
Club ID
Session ID
Training day
Session Price (£)
Session Name
Session address
Session Postcode
Start time
End time
Any extra session info?
Update Timestamp
```

**Master** has the Clubs fields, followed by the Sessions fields without repeating Club ID. Update Timestamp is the final column, appearing only once.

Headings ignore differences in capitals, spacing and punctuation. Different words are not guessed or silently remapped.

## How to edit

- All three working tabs are editable. Script-generated changes do not need another round of triggers.
- Add a club in Clubs or Master with its club name and leave Club ID blank. The script generates a permanent ID.
- Add a session with its Club ID and leave Session ID blank. The script generates its ID. Use a separate row for each session.
- Sessions must contain Club ID. It is the link to the club, not another session identifier.
- Initial import can link repeated ID-less Master rows using a unique exact club name, ignoring capitals. This is not fuzzy matching. Different spellings need explicit IDs.
- Do not edit or clear existing IDs. Delete the whole row when deleting a record.
- Editing shared club information in one Master row updates all its sessions' Master rows.
- Editing a session changes that session only.
- Multi-row pastes are supported. Paste values, not formulas.
- Existing IDs are preserved. During first setup, supplied timestamps are retained when they are actual spreadsheet dates. Rows without known timestamps stay blank until edited.
- Rows sort oldest first and newest last after sync. This means the row being edited may move. Set `autoSort: false` if that becomes disruptive.
- For a club with no sessions, Master contains one placeholder row with Session ID FALSE. It is not an invented session. Enter session details there to create its first session.

Avoid simultaneous editing while a sync is writing. The script locks its own runs and checks for edits before publishing, but Sheets does not provide an atomic transaction covering human edits across three tabs. It cannot guarantee conflict-free collaboration under continuous simultaneous typing.

The script compares edits against saved copies of the three views. Untouched repeated fields do not overwrite a new answer. Conflicting edits to the same field stop the sync and identify the record and field. Make the conflicting answers agree, then use **Sync and sort now**. For first setup, repeated supplied answers must agree too; use matching values across the existing tabs.

## Formatting rules

| Field | Rule |
|---|---|
| Five yes/no questions | Yes/No and True/False become actual boolean TRUE/FALSE. Blank, Unknown, TBC and Not confirmed become `Not confirmed`. |
| Payment Type | `Per session`, `Monthly membership`, `Annual membership`, `Free`, or `Not confirmed`. Monthly and annual stay distinct. |
| Membership amount (£) | Non-negative number for Monthly/Annual membership. FALSE for other types. Missing relevant amount stays Not confirmed while editing and blocks export. |
| Session Price (£) | Non-negative number for Per session, including zero. FALSE for other types. A missing price for an actual per-session session blocks export. |
| Kit Details: | FALSE if kit is not required. A confirmed kit requirement needs details before export. |
| League name | FALSE if league participation is false. Confirmed participation needs a league name before export. |
| Gender eligibility | FALSE if gender-specific is false. Confirmed gender-specific needs eligibility before export. |
| Free tasters | Whole number zero or above, or Not confirmed. Zero is different from unknown. |
| Training day | Monday–Sunday; numbers 1–7 are also accepted. |
| Session Postcode | Full UK postcode, uppercased and spaced. No address lookup or geocoding is performed. |
| Start time | 24-hour HH:mm, or Not confirmed. |
| End time | 24-hour HH:mm. Blank if finish times are flexible. |
| Other unanswered text | Not confirmed. |
| Update Timestamp | Real date/time, displayed dd/MM/yyyy HH:mm:ss in Europe/London. Managed by the script. |

Changing a controlling answer to FALSE replaces its inapplicable detail with FALSE. Changing payment type can therefore remove a previously entered amount from the active record. The prior value remains in the hidden change history. The script does not restore that amount automatically if you switch back.

Unknown is never silently changed into a negative answer to a yes/no question. Inapplicable price columns use FALSE according to your payment rule, including while Payment Type itself is unknown. Confirm Payment Type before exporting.

Columns remain visible in Sheets because they are shared by all rows. This script does not show or hide questions in the website registration form. Those conditions need to be implemented in the form separately.

## Deletions

Delete a complete row, or clear all its values:

- Deleting a club row from Clubs removes that club and every linked session from all views.
- Deleting a session row from Sessions or Master removes that session. The club remains, even after its last session is removed.
- Deleting a club-only placeholder row from Master removes that club.
- Deleting one of several Master session rows does **not** delete the club.

Deletion conflicting with an unsynced edit stops the sync. Resolve the conflict before retrying. Do not delete a working tab or its required columns.

## Hidden records and recovery

- `_0161_State` stores canonical club/session records and the last published views. Do not edit it.
- `_0161_Changes` stores creations, updates and deletions, including before/after records. This supports a later incremental export feature; a last-export checkpoint is not implemented yet.
- `_backup_...` tabs contain setup/manual/recovery backups. Review and remove old backups manually when you no longer need them.
- Hidden sheets are **not private** from spreadsheet editors.

A sync interrupted during publication leaves a pending flag. Further syncing stops rather than interpreting half-written views as deletions. **Restore views from saved records** first backs up the current views, then publishes the saved intended records. Unsynced edits remain in that backup for manual recovery. This is recovery protection, not a transactional database or automatic Undo.

Keep long descriptions reasonably sized. Google Sheets cell limits and Apps Script quotas still apply. The change log grows over time; archive it separately when needed.

## Export

Choose **Export Master CSV / copy rows**. It syncs first, then checks payment amounts and confirmed conditional requirements. Drafts remain editable even when they cannot be exported yet.

- The downloadable CSV contains headings, one row per session and Update Timestamp last. Clubs without sessions keep a placeholder row.
- CSV preserves paragraphs and escapes commas, quotes and newlines.
- The text box contains tab-separated **data rows only**, for pasting into a spreadsheet that already has headings. Internal line breaks become spaces in this copy only.
- TRUE/FALSE export in uppercase. Unknown stays Not confirmed. Flexible End time stays blank. An unknown historical timestamp also stays blank.
- Formula-looking text is escaped when writing or exporting.

**The website registration form and CSV importer now support these Master headings.** The importer also accepts earlier JSON-path files. Imports still need manual review and an explicit write step; this spreadsheet script does not publish anything or send emails.

## Verification

The JavaScript syntax was checked locally. The script has not been installed or executed inside Google Sheets. Validate setup, edits, multi-row paste and deletion on a copied spreadsheet before using working data.

## Restricted authorisation

The file-level `@OnlyCurrentDoc` annotation limits automatically inferred spreadsheet permissions to the file where the script is installed. The script still needs permission to install automatic triggers and display its export dialog.

To update an existing installation:

1. Cancel the old consent screen.
2. Replace the complete Apps Script code with the updated `0161.gs`, including its opening comment.
3. Save, select `setup0161`, and run it again.
4. Review the new permission request. Spreadsheet access should refer to the spreadsheet where the script is installed, rather than all spreadsheets.

If all-spreadsheet access still appears, stop before approving. Other script files or explicit `oauthScopes` in `appsscript.json` may still request it. The current-spreadsheet scope is `https://www.googleapis.com/auth/spreadsheets.currentonly`; a broad `https://www.googleapis.com/auth/spreadsheets` entry must not remain in an explicitly configured scope list. Preserve the trigger and container-UI scopes needed by this script.

Replacing local code does not revoke permissions already granted to an older installation. If you previously approved the broad request, remove the app's existing access from your Google Account connections, then authorise the revised script again. This does not make the app Google-verified or change its OAuth consent branding/privacy-policy settings.

Reference: [Google Workspace's official current-document example](https://github.com/googleworkspace/apps-script-samples/blob/main/docs/translate/translate.gs).

## Dropdowns and visible column formats

The updated script creates dropdowns across existing and empty input rows in all three tabs:

- Payment Type: Per session, Monthly membership, Annual membership, Free, Not confirmed.
- The five yes/no fields: TRUE, FALSE, Not confirmed.
- Training day: Monday through Sunday, Not confirmed.

It also formats amount columns to two decimal places, tasters as whole numbers, timestamps as dates/times, and time/ID/text columns as text. Existing headings are used to locate columns.

For an existing installation, replace the full script, save, and run `format0161`. This adds the controls without changing stored answers or timestamps. Reload the spreadsheet to see **Apply dropdowns and column formats** in the 0161 Active menu. Setup and subsequent syncing also apply the controls automatically.

Dropdowns allow other pasted values so recognised aliases such as Yes/No can still be imported. The sync normaliser checks these values; unsupported answers stop syncing instead of being silently accepted. No dropdown colour styling is added.

## Repair a swapped Club name / Sport or activity pair

If Master is correct but Clubs has those two values swapped, replace the script with the updated `0161.gs`, save, then run `repairClubColumns0161` directly. Do not run ordinary sync/setup first: that could treat the incorrect Clubs values as intentional edits.

The command reads these fields by heading, matches records by Club ID, and uses Master as the authority for only Club name and Sport or activity. It backs up all three tabs before publication. Other fields go through the usual sync and conflict checks. It stops if existing club IDs are missing, unknown, or duplicated, or if repeated Master rows disagree. It does not infer correct values from whether text looks like a sport.

This repair corrects the demonstrated data mismatch. Its underlying cause has not been reproduced in Google Sheets.
