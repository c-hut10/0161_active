# 0161 Active spreadsheet sync

## Current editing workflow: lightweight edits, deliberate sync

Typing or pasting only updates Update Timestamp on the edited data rows. It does not acquire the document lock, read all three tables, save state, sort rows, rebuild links or rewrite the other tabs. Rows stay where they are while you edit. The existing `activeEdit0161` trigger calls this new lightweight handler after the script is replaced. No new trigger or permission is added.

When you finish editing, choose **0161 Active → Sync changes**. That performs validation, cross-tab reconciliation, ID allocation, grouping and verified state saving once. New IDs are therefore allocated at sync, not on each cell edit. Other tabs show the last synced data until you run this command. Preparing a CSV, grouping tabs, deleting a selected club and requesting export status sync first. Structural row/column changes show a reminder rather than starting a full sync in the background.

For ordinary edits, the timestamp stored by the lightweight edit trigger is carried into the later sync. If an edit has no newer valid timestamp, sync time is the fallback. A trigger can run after the edit rather than at the exact keystroke time. Do not edit during an explicitly requested sync.

To update an installed spreadsheet, wait for current executions to finish, replace all of `0161.gs`, save and reload. Existing triggers use the updated handlers. Do not run Fresh Start or Master import just to improve editing performance. If you have never installed this script's triggers, run `setup0161` once as usual.

Use **0161.gs**. It replaces the earlier `UpdateTimestamp.gs` component. Do not install both.

This is a Google Sheets Apps Script for one spreadsheet with three editable tabs. It does not access your account until you install and authorise it yourself. It never changes the website itself.

## Install

1. First make a separate copy of your spreadsheet. Try the script there before using your working data.
2. Name the three tabs `Master`, `Clubs`, `Sessions`. The script also recognises `mastersheet`, `club`, `club sheet`, `session` and `session sheet`. For other names change the first three settings in `ACTIVE`.
3. Row 1 must contain the headings below. Columns can initially be in a different order. An entirely empty tab can be created automatically. A partly populated tab must have every heading for that tab, except Update Timestamp which can be added automatically. Remove unnamed columns containing data and old headings that are no longer part of this schema, after preserving them in your separate copy.
4. Open **Extensions → Apps Script**. Remove the old timestamp script, including its `onEdit` function. Paste the complete contents of `0161.gs` into the editor and save.
5. Choose `setup0161` from the function selector and click **Run**. Review the Google permission request. Run this once as the spreadsheet owner, rather than separately for every editor.
6. Reload the spreadsheet. The **0161 Active** menu provides manual sync, export, backup and recovery.

Setup backs up the three tabs as hidden sheets before merging them. It installs one lightweight timestamp edit trigger and one structural-change reminder trigger. Running setup again replaces only this component's triggers. Do not manually run `activeEdit0161` or `activeChange0161`.

The installable trigger pattern follows [Google Workspace's official Apps Script examples](https://github.com/googleworkspace/apps-script-samples/blob/main/triggers/triggers.gs).

## Headings

### Final layout: Verified starts Master

Master starts `Verified`, `Club ID`, `Club name`, `Sport or activity`. Payment options is column L, immediately before Payment Type in M. Update Timestamp remains AC. There are still 29 columns. Clubs has Payment options K, immediately before Payment Type in L; Verified remains R and Update Timestamp S. Sessions keeps its 13-column layout, including Club name in column B.

Finish any pending CSV batch using your installed script, then make a separate spreadsheet copy. Move the **whole Verified column, including its answers**, to column A in Master. In both Master and Clubs, move the entire Payment options column immediately before Payment Type; if missing, insert it there. Do not merely paste new headings over unmoved data. Leave Sessions unchanged. Replace the complete 0161.gs, save, reload, run Sync changes, then Apply dropdowns and column formats. Do not run Fresh Start, change IDs or delete saved state sheets.

New form spreadsheet rows and CSV Export use Verified first. Paste new-format rows from column A (Verified), not column B (Club ID). Older positional paste blocks must not be pasted into this new layout. Import registration accepts older named formats and heading order. The website CSV importer also accepts the earlier formats. Moving a column alone preserves export fingerprints, IDs and edit timestamps; it does not make unchanged records need exporting again. Sport navigation still stores its hidden marker in the Club ID column, now B in Master.

### Optional payment options: compact profile table

The main Payment Type, Membership amount and per-session prices remain unchanged, including the map filters that use those structured prices. Clubs can optionally add other payment choices or additional fees. Registration places these in Payment options; each entry has an option name and price/details. Do not repeat the main price unless it is needed to explain a different option. Free tasters stay in the profile box. No price, inclusion or competition fee is inferred from free text.

Before updating, finish any pending CSV batch with your previous script, then duplicate the spreadsheet. Add or move the whole `Payment options` column immediately before Payment Type in Master and Clubs. Follow the Verified-first move above for Master. Leave existing IDs, prices, Verified values and timestamps unchanged. Leave Sessions unchanged. The final counts are Master 29, Clubs 19, Sessions 13. Save the revised 0161.gs, reload, choose Sync changes, then Apply dropdowns and column formats. Do not use Fresh Start or delete hidden state tabs. CSV Export creates its revised headings automatically.

Use one option per line in the same cell (or separate options with ` | ` when copying plain text). Repeat the same club-wide options on every Master session row. Examples of the format, not actual club prices:

```text
Monthly membership: £25/month. Includes weekly training.
Member sessions: £3/session, in addition to membership.
Competition fees: £10/event, only if competing.
```

The extra column is free text, not a Payment Type dropdown. Keep the main Payment Type identical across a club's Master rows; put alternatives in Payment options. If only the session amounts differ, keep Per session and enter each Session Price normally. Blank/Not confirmed optional entries add no extra profile rows. Existing numeric prices and all separate session rows are retained. Older 28-column exports and earlier 27-column form formats remain readable. An older file without Payment options does not erase previously saved website options; a new-format reviewed import can intentionally replace or clear them.

On profiles and the registration preview, the table shows Payment option and Details, with thin grey rules and stacked cells on narrow screens. Optional choices follow the recorded main price. Contact Club for Session/Membership details remains beneath the table. Booking appears only when explicitly required. Existing named social/competition memberships and known pricing notes are retained.


### Saved-state compatibility fix

If the schema upgrade reports `Saved records and tab snapshots do not agree` for both state sheets, preserve the spreadsheet and replace the complete script with this revision. It accepts the older Sessions snapshots without the derived Club name and older club-only placeholders without the unanswered session beginner field. Named values are compared independently of JSON property order; checksums, ID links and other saved-value checks still apply. It does not reset IDs, discard export history or rewrite state while reading it. After saving and reloading, use Sync changes. Do not delete the hidden state sheets or run Fresh Start for this error. If the error remains, stop and retain the copy for diagnosis rather than bypassing validation.

### Verified: explicit approval for the public green tick

Finish any pending CSV export with the previous script, then make a separate spreadsheet copy before upgrading. If missing, add `Verified` as column A in **Master**, and immediately before `Update Timestamp` in **Clubs**. If already present in Master, move its entire column to A. Leave **Sessions** unchanged. Replace the installed `0161.gs`, save and reload, run **Sync changes**, then **Apply dropdowns and column formats**. Do not reset IDs.

- TRUE gives the club profile a green tick after its CSV is imported into the website.
- FALSE, blank or Not confirmed does not give the tick. Manual entries default to FALSE on sync.
- Use the same club-wide value on every repeated Master session row. A change in Master or Clubs syncs to the other view. Contradictory edits stop for review.
- The public registration form automatically sends Verified = TRUE in its named email field and every CSV/spreadsheet row. Import registration also marks accepted club submissions TRUE, including older email formats. This is the owner's rule: club-supplied details count as confirmation; it is not independent identity checking.
- Verification is not inferred from merely uploading a CSV. Earlier CSV files without Verified remain readable, but do not automatically grant or retain a tick for the clubs they update. Review them and add Verified = TRUE explicitly if appropriate.
- A newly approved import receives its import date as Last Confirmed. An already verified club keeps its existing valid confirmation date; FALSE removes its tick and date. Other clubs not in an import are untouched.

The current Master/email export has 29 columns, with Verified first and Update Timestamp last. Clubs has 19 columns; Sessions retains 13. New CSV Export batches use the revised headings automatically. Adding new data fields can make existing records appear as changed; moving Verified alone does not. Neither editing Sheets nor preparing a CSV publishes the website; a reviewed website import and deployment are still required.

### Upgrade: beginner eligibility belongs to each session

First duplicate your spreadsheet to retain the old club-level answers. Replace the installed `0161.gs`, then update row 1 and the corresponding data columns before running Sync changes:

- **Clubs:** remove `Beginner friendly?` and its column. There is no club-wide replacement.
- **Master:** remove the old club-level `Beginner friendly?` column. Add `Session beginner friendly?` immediately after `Training day`.
- **Sessions:** add `Session beginner friendly?` immediately after `Training day`.
- Fill the new field with `Not confirmed` for existing sessions unless you have checked that specific session. Do not copy a club-level TRUE into all its sessions.
- Keep IDs and Update Timestamp values unchanged. Use **Sync changes**, then **Apply dropdowns and column formats**. Do not run Fresh Start or reset IDs.
- **CSV Export:** do not edit its headings manually. Finish any prepared batch using the previous script before replacing the script or changing the schema. The next newly prepared batch uses the revised headings.

The Master still has 29 columns. Clubs has 19 columns including the timestamp; Sessions has 13 including Club ID, Club name and the timestamp. The saved legacy club answer is retired when the records are normalised; your separate spreadsheet copy retains it. Existing session IDs and export history are retained. The changed session schema will cause existing sessions to appear as changed in the next export, even where the new answer is Not confirmed.

TRUE means the individual session welcomes beginners; FALSE means it does not; Not confirmed means unknown. Sessions in the same club may differ. Editing this field updates only that session and its matching Master row.

The public registration form now asks whether each individual session is open to beginners. The website CSV reader and form exports use the same revised 29-column schema. **Import registration** also accepts previous email payloads and matches fields by their supplied headings. An old club-level beginner answer is not treated as session evidence: those sessions receive Not confirmed. Do not paste old positional spreadsheet rows into the revised Master. On club profiles, only sessions marked TRUE show **Beginners Welcome** below their title and above the location. FALSE and unknown answers show no badge or line; no club-wide fallback is used.

**Clubs** has these headings, with `Update Timestamp` last:

```text
Club ID
Club name
Sport or activity
Contact email
Website or social link
Kit requirements for newcomers?
Kit Details:
Gender-specific?
Gender eligibility — if applicable
About the club
Payment options
Payment Type
Membership amount (£)
Booking required?
How many free taster sessions do you offer newcomers?
Participate in a league?
League name
Verified
Update Timestamp
```

**Sessions** has:

```text
Club ID
Club name
Session ID
Training day
Session beginner friendly?
Session Price (£)
Session Name
Session address
Session Postcode
Start time
End time
Any extra session info?
Update Timestamp
```

**Master** has Verified first, then club details (including Payment options before Payment Type), session details and Update Timestamp. Club ID and Club name appear only once. In Clubs, Verified remains immediately before Update Timestamp. It is not a session field.

In **Sessions**, insert a whole column B headed exactly `Club name`, leaving its data cells blank. Replace the installed script, save and reload, then use **Sync changes**. The script fills the name from the linked Club ID and refreshes it after a rename in Clubs or Master. This Sessions column is display-only: make name corrections in Clubs or Master. Names do not replace IDs as record identifiers. Master and CSV Export keep their existing 29-column layout; they do not gain a second Club name column.

Headings ignore differences in capitals, spacing and punctuation. Different words are not guessed or silently remapped.

## How to edit

- All three working tabs are editable. Run Sync changes when editing is finished. Script-generated changes do not need another round of triggers.
- Add a club in Clubs or Master with its club name and leave Club ID blank. The script generates a permanent ID.
- Add a session with its Club ID and leave Session ID blank. The script generates its ID. Use a separate row for each session.
- New club IDs use a sport prefix and four digits, for example `RULE-0001` or `RUUN-0001`. The club-number limit is `9999` per prefix.
- New session IDs use the unchanged Club ID plus `-S` and five digits, for example `RULE-0001-S00001`. The session-number limit is `99999` per club. Existing IDs are preserved.
- Reaching either limit stops the sync with an error. Numbers never wrap or truncate. Saved counters prevent reusing automatically generated IDs after deletion.
- Sessions must contain Club ID. It is the link to the club, not another session identifier.
- Initial import can link repeated ID-less Master rows using a unique exact club name, ignoring capitals. This is not fuzzy matching. Different spellings need explicit IDs.
- Do not edit or clear existing IDs. Delete the whole row when deleting a record.
- After Sync changes, editing shared club information in one Master row updates all its sessions' Master rows.
- Editing a session changes that session only.
- Multi-row pastes are supported. Paste values, then choose Sync changes. Do not paste formulas.
- Existing IDs are preserved. During first setup, supplied timestamps are retained when they are actual spreadsheet dates. Rows without known timestamps stay blank until edited.
- Use **Group tabs by sport / refresh links** to group all three working tabs by sport. Click the sport links below row 1 to jump to each section. Records remain oldest-to-newest within each sport. CSV preparation always sorts across all sports by Update Timestamp.
- For a club with no sessions, Master contains one placeholder row with Session ID FALSE. It is not an invented session. Enter session details there to create its first session.

Avoid simultaneous editing while a sync is writing. The script locks its own runs and checks for edits before publishing, but Sheets does not provide an atomic transaction covering human edits across three tabs. It cannot guarantee conflict-free collaboration under continuous simultaneous typing.

The script compares edits against saved copies of the three views. Untouched repeated fields do not overwrite a new answer. Conflicting edits to the same field stop the sync and identify the record and field. Make the conflicting answers agree, then use **Sync changes**. For first setup, repeated supplied answers must agree too; use matching values across the existing tabs.

## Formatting rules

| Field | Rule |
|---|---|
| Five club yes/no questions and Session beginner friendly? | Yes/No and True/False become actual boolean TRUE/FALSE. Blank, Unknown, TBC and Not confirmed become `Not confirmed`. |
| Payment Type | `Per session`, `Monthly membership`, `Annual membership`, `Free`, or `Not confirmed`. Monthly and annual stay distinct. |
| Membership amount (£) | Non-negative number for Monthly/Annual membership. FALSE for other types. Missing relevant amount stays Not confirmed, including in a prepared export. |
| Session Price (£) | Non-negative number for Per session, including zero. FALSE for other types. A missing price stays Not confirmed; supplied amounts must still be valid numbers. |
| Kit Details: | FALSE if kit is not required. Missing kit details remain Not confirmed. |
| League name | FALSE if league participation is false. Missing league details remain Not confirmed. |
| Gender eligibility | FALSE if gender-specific is false. Missing eligibility remains Not confirmed. |
| Free tasters | Whole number zero or above, or Not confirmed. Zero is different from unknown. |
| Training day | Monday–Sunday; numbers 1–7 are also accepted. |
| Session Postcode | Full UK postcode, uppercased and spaced. No address lookup or geocoding is performed. |
| Start time | 24-hour HH:mm, or Not confirmed. |
| End time | 24-hour HH:mm. Blank if finish times are flexible. |
| Other unanswered text | Not confirmed. |
| Update Timestamp | Real date/time, displayed dd/MM/yyyy HH:mm:ss in Europe/London. Managed by the script. |

Changing a controlling answer to FALSE replaces its inapplicable detail with FALSE. Changing payment type can therefore remove a previously entered amount from the active record. The prior value remains in the hidden change history. The script does not restore that amount automatically if you switch back.

Unknown is never silently changed into a negative answer to a yes/no question. Inapplicable price columns use FALSE according to your payment rule, including while Payment Type itself is unknown. Unconfirmed Payment Type remains Not confirmed in a prepared CSV; it is not inferred.

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
- `_0161_Changes` stores creations, updates and deletions, including before/after records. Confirmed export fingerprints and the current prepared batch are saved alongside the verified state, so incremental export history survives reload.
- `_backup_...` tabs contain setup/manual/recovery backups. Review and remove old backups manually when you no longer need them.
- Hidden sheets are **not private** from spreadsheet editors.

A sync interrupted during publication leaves a pending flag. Further syncing stops rather than interpreting half-written views as deletions. **Restore views from saved records** first backs up the current views, then publishes the saved intended records. Unsynced edits remain in that backup for manual recovery. This is recovery protection, not a transactional database or automatic Undo.

Keep long descriptions reasonably sized. Google Sheets cell limits and Apps Script quotas still apply. The change log grows over time; archive it separately when needed.

## Export

Use **0161 Active → Prepare for CSV — new and changed**. The fourth tab, **CSV Export**, contains only column headings and prepared data rows, sorted oldest edit first across all sports. The three working tabs remain grouped.

1. Prepare the CSV from the menu. The first batch contains all records because no export has yet been confirmed. Reopening preparation shows the same saved batch.
2. With CSV Export selected, use Google Sheets **File → Download → Comma-separated values (.csv, current sheet)**.
3. After successfully downloading and accepting that batch, choose **0161 Active → Mark prepared CSV as exported**. This confirms the exact prepared versions, not edits made after preparation.
4. The next preparation includes new records and changed records only. Editing club-level details exports all affected session rows. An individual session edit exports that session row. No-change preparation clears the previous generated view and reports no pending rows.

**Prepare CSV — all records** produces a full batch regardless of previous export history. If a batch is already pending, both commands reopen it instead of silently replacing it. CSV Export is a generated snapshot, not a fourth editable source. If it is edited, confirmation stops; Prepare restores the saved snapshot. The script cannot detect whether a download or website import actually succeeded. Confirm only the batch you intend to treat as exported.

The export retains the 28 Master headings, one row per session and Update Timestamp last. Clubs without sessions retain a placeholder row. It excludes section headings, navigation links and all grouping markers. TRUE/FALSE stays uppercase, unknown answers remain Not confirmed, and flexible End time stays blank. Formula-looking text is escaped. A Club ID and club name are required; supplied values still pass normal sync validation.

Deleted records are recorded in the audit history but cannot be represented as deletion commands by this existing CSV schema. Website deletions still need separate handling. Export history is for additions and updates, and it is reset by an explicitly requested Fresh Start.

**This revised Sheets schema moves beginner eligibility to sessions.** The public form and website CSV reader use these headings and also accept earlier files for reviewed imports. Imports still need manual review and an explicit write step; this spreadsheet script does not publish anything or send emails.

## Verification

The JavaScript syntax was checked locally. The script has not been installed or executed inside Google Sheets. Validate setup, edits, multi-row paste and deletion on a copied spreadsheet before using working data.

## Restricted authorisation

The file-level `@OnlyCurrentDoc` annotation limits automatically inferred spreadsheet permissions to the file where the script is installed. The script still needs permission to install automatic triggers. CSV export stays in a tab. The receiving-side registration importer uses a private HTML dialog for paste, preview and confirmation.

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
- The six yes/no fields: TRUE, FALSE, Not confirmed.
- Training day: Monday through Sunday, Not confirmed.

It also formats amount columns to two decimal places, tasters as whole numbers, timestamps as dates/times, and time/ID/text columns as text. Existing headings are used to locate columns.

For an existing installation, replace the full script, save, and run `format0161`. This adds the controls without changing stored answers or timestamps. Reload the spreadsheet to see **Apply dropdowns and column formats** in the 0161 Active menu. Setup and subsequent syncing also apply the controls automatically.

Dropdowns allow other pasted values so recognised aliases such as Yes/No can still be imported. The sync normaliser checks these values; unsupported answers stop syncing instead of being silently accepted. No dropdown colour styling is added.

## Repair a swapped Club name / Sport or activity pair

If Master is correct but Clubs has those two values swapped, replace the script with the updated `0161.gs`, save, then run `repairClubColumns0161` directly. Do not run ordinary sync/setup first: that could treat the incorrect Clubs values as intentional edits.

The command reads these fields by heading, matches records by Club ID, and uses Master as the authority for only Club name and Sport or activity. It backs up all three tabs before publication. Other fields go through the usual sync and conflict checks. It stops if existing club IDs are missing, unknown, or duplicated, or if repeated Master rows disagree. It does not infer correct values from whether text looks like a sport.

This repair corrects the demonstrated data mismatch. Its underlying cause has not been reproduced in Google Sheets.

Column formats and dropdowns are applied in batches of up to 500 rows, including blank future input rows. Text formatting is applied before writing data. Formula restrictions remain in place. Bulk pastes are timestamped automatically and reconciled when Sync changes is requested.

## Updated ID reservation and recovery

Imported numbered IDs now reserve their club and session numbers immediately, even when no new ID is created. These counters survive deletion and reload. Old UUID IDs remain unchanged. IDs already deleted before this version cannot be inferred from the current tabs alone.

Saved records alternate between two hidden sheets: `_0161_State` and `_0161_State_Standby`. Each new snapshot is checked against the full written content, then receives a commit marker with a generation number, row count and SHA-256 checksum. The current verified snapshot is not cleared while its replacement is written. No temporary sheet needs to be deleted or renamed.

The loader verifies snapshots and uses the newest valid committed generation. An incomplete or damaged snapshot stops normal sync, even if the other snapshot can be read. Use **0161 Active → Restore views from saved records** after reviewing the message. This backs up the working tabs, restores the newest verified records and repairs the alternate snapshot. A valid pending snapshot contains the intended records of an interrupted sync; recovery completes those records. If neither snapshot is valid, the script stops and requires a separate spreadsheet backup. It does not guess from damaged state.

Existing single-sheet state is read and validated automatically. The first successful new save keeps it intact while creating the alternate snapshot. Do not delete or edit either hidden state sheet.

### Replace an existing installation

1. Make a separate spreadsheet copy and test there first.
2. Open **Extensions → Apps Script**. Replace the complete contents of the existing `0161.gs` file with the supplied `0161.gs`. Do not add a second copy of the script.
3. Save, then run `setup0161` once. This refreshes this script's triggers and backs up the working tabs. Keep your current IDs and hidden state sheets.
4. Reload the spreadsheet. Check **0161 Active → Sync changes**, then verify that a club with several sessions still has one Master row per session.
5. If an interrupted sync is reported, use **Restore views from saved records** before running setup again.

This version has local automated tests for ID limits, imported numbers, separate session rows, legacy state migration and interrupted writes. Installation and execution inside Google Sheets have not been tested through your account.

## One-time reconciliation using the cleaned Master data

Use this only for the existing-sheet import where Master has been approved as the source of truth. It is a separate operation so routine sync cannot silently overwrite conflicts.

1. Wait until Apps Script **Executions** shows no running sync. Make a separate spreadsheet copy.
2. Replace the full contents of the existing `0161.gs` with this version and save.
3. Check that the Master tab contains the cleaned data you want to keep. Keep its headings and existing valid IDs.
4. Run **`importMaster0161`** from the Apps Script function selector. Alternatively reload the spreadsheet and choose **0161 Active → Import Master as source (once)**. Run this before setup or normal sync when those are failing with cross-tab conflicts.
5. After import succeeds, run **`setup0161`** once to refresh the edit/change triggers. Reload the spreadsheet.

The import backs up the working tabs before publishing. Matching Club IDs take club details from Master. Matching Session IDs take session details from Master, but moving a Session ID to a different club is rejected. Missing Club IDs reuse a unique exact club name, ignoring case. Missing Session IDs reuse a unique exact match of the normalised session fields within that club; otherwise a new ID is generated. Ambiguous matches stop for review. An incomplete or changed session without an ID may be treated as new, so keep existing IDs wherever available.

Clubs and sessions present only in the other working tabs or saved records are preserved. Master rows that disagree with each other remain errors. Blank/Not confirmed answers in Master are authoritative too; they do not silently fall back to old answers in Clubs.

Completion is saved in the verified state. The import cannot be repeated after success. Normal sync then uses the original conflict checks. If the import stops after saving a pending snapshot, use the Restore menu to complete recovery from the verified records rather than repeatedly running import.

The lock waits up to one second. If another sync holds it, this run stops with a clear message. Existing runs must finish before retrying; this does not cancel them or queue a background retry.

## Explicit fresh start from Master

Run `freshStart0161` only when you intentionally want new IDs and a fresh set of records. It reads Master alone, ignores its existing Club IDs, Session IDs and timestamps, and restarts the club counter at `0001` for each generated sport prefix. Session counters start at `00001` per club. It does not carry records found only in the old Clubs, Sessions or state snapshots into the fresh set.

Before publishing, it validates the fresh records, backs up all three working tabs and copies both existing state snapshots into hidden backup sheets. Existing state generations continue so the new, verified reset is selected by the loader; deleting state sheets is unnecessary. Normal sync keeps its strict conflict checks and subsequently continues the new counters.

Wait for running executions to finish. Replace the complete script, save, and run **`freshStart0161`** before running setup or sync. Run `setup0161` after the fresh start succeeds to refresh triggers. Reload the spreadsheet. The equivalent menu command is **0161 Active → Fresh start from Master / reset IDs**. Do not run the fresh-start command again for routine edits, because it intentionally replaces IDs each time.

If neither state snapshot is valid, the save guard stops rather than discarding damaged state automatically. Preserve the working tabs and use a separate spreadsheet backup in that case.

## Repair lowercase TRUE/FALSE display

This version writes boolean answers as uppercase `TRUE` / `FALSE` text to match the dropdown choices, while reading them back as booleans for syncing. Replace the script and run `format0161`, or use **0161 Active → Apply dropdowns and column formats**. This repairs existing boolean display and false markers in dependent fields without resetting IDs or changing timestamps. It does not resolve genuine conflicting answers between tabs. Do not run Fresh Start for a display repair.

## Enable sport sections and the fourth export tab

Replace the full `0161.gs` code, save and reload the spreadsheet. Choose **0161 Active → Group tabs by sport / refresh links** once (or run `organiseSports0161`). This backs up the three working tabs and enables grouping for future syncs. Do not run Fresh Start or the one-time Master import just to change the layout.

Sport links are rich-text links in generated rows immediately below the column headings. Sport sections have their own bold heading rows. The script recognises these generated rows and excludes them from data, saved baselines and export. Do not paste over, repurpose or change the hidden marker cells in those rows. Editing genuine data rows still follows the usual conflict rules. Multi-sport clubs appear under their combined Sport or activity value; session rows inherit their club's grouping.

**Prepare for CSV — new and changed** creates the fourth CSV Export tab when first used. No separate navigation tab is created. Grouping changes do not alter Update Timestamp or cause a new export by themselves. Export history and prepared snapshots are included in verified two-slot recovery.

## Delete a club from all four working tabs

Select one saved data row for the club in Master. Choose **0161 Active → Delete selected club (all 4 tabs)** and confirm the displayed club name and ID. A session row still identifies its parent club: this command deletes the entire club and every linked session. Sport headings and navigation rows cannot be selected as targets. The operation backs up Master, Clubs, Sessions and any existing CSV Export tab before deleting.

The deleted club is removed from the three data tabs. CSV Export is cleared to its headings, and the pending batch is invalidated so an old downloaded file cannot be accidentally confirmed. Prepare and download a new batch. Other clubs, their IDs, their confirmed export history and the reserved ID counters remain unchanged. Deleted IDs are not reused. Directly deleting an ordinary Master session row still removes only that session; use the named command for the entire club.

This deletes spreadsheet records, not the club already published on the website. Existing downloaded files cannot be changed, and the 29-column update CSV has no website-deletion operation. Request website deletion separately.

## Keep exports clear over time

Club ID identifies the club and Session ID identifies the session. Correcting a name, sport, time, price or address retains those IDs. Rows can move between sport sections or within chronological export order. Export tracking uses the ID and a fingerprint of the exact values and Update Timestamp, never a row number or a cut-off based on file download time.

**Export status** reports the pending row count, current prepared batch and last confirmed batch. The Club ID header cell in CSV Export has a note containing the batch ID and suggested unique filename. Notes are not CSV data. Keep batches in order: prepare, download, then confirm that prepared batch. Preparing again before confirmation reopens the saved batch. Edits made later stay pending even when that earlier batch is confirmed. Marking a batch exported is your acknowledgement, not detection of a successful website update.

## Website incremental import

The site importer now has an explicit incremental mode:

```text
node scripts/import-club-csv.mjs updates.csv --merge-sessions
```

This is review-only. Add `--write` only after reviewing the proposed updates. It updates existing sessions by Session ID, adds new IDs and retains unchanged sessions. Club IDs are matched case-insensitively while preserving the established website ID; Master files accept the spreadsheet's uppercase IDs. A matching club name under another ID blocks import instead of creating a duplicate. If old website sessions have no IDs, incremental import stops: first reconcile a complete club CSV and establish the shared IDs. Do not use the default full-schedule replacement mode for a partial export.

No spreadsheet download, confirmation or script installation publishes website changes automatically.


## Receiving registrations: Sheets owns the IDs

Replace the complete `0161.gs`, save and reload the spreadsheet to add **0161 Active → Import registration**. Existing saved records and ID counters are retained. Do not use Fresh Start for this update.

The updated website sends a `registrationImport` JSON block in each submission. Copy that complete block from the email, open **Import registration**, paste it, then choose **Preview registration**. Check the club name, sport and session count before choosing **Import registration**.

The public form leaves Club ID and Session ID blank. The importer also discards any IDs or timestamps someone supplies in the pasted block. Only Sheets allocates official numbered IDs, using the existing counters and limits. Every actual session gets a separate row and ID. A club without sessions keeps a club-only placeholder.

A separate submission reference is saved internally to reject a repeated application, including after reloading the spreadsheet. It never becomes a Club ID or Session ID. A matching existing club name is stopped for manual review as an update. It is not overwritten or automatically merged. Fresh Start resets this import history as well as the other saved history.

Preview does not write records or reserve IDs. Confirmed import first reconciles current sheet edits, backs up the working tabs and publishes the imported records through the normal sync process. It targets the existing Master, Clubs and Sessions tabs. CSV Export remains the generated fourth tab.

Deploying the website is necessary for new emails to contain this block. Local tests cover ID assignment, three separate session rows, supplied-ID rejection and duplicate protection after state reload. Actual Netlify email delivery and Google Sheets execution remain unverified.
