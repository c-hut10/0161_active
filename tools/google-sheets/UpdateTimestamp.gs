/**
 * Timestamp component for the planned Master / Clubs / Sessions spreadsheet.
 * Change the tab names below to their exact names before running setup.
 * This component does not yet format answers, sync tabs, sort, or propagate deletions.
 * @OnlyCurrentDoc
 */
const ACTIVE_TIMESTAMP_SETTINGS = Object.freeze({
  tabs: ['Master', 'Clubs', 'Sessions'],
  heading: 'Update Timestamp',
  timeZone: 'Europe/London',
  displayFormat: 'dd/MM/yyyy HH:mm:ss'
});

/** Run once from Apps Script to add the final column and set its date display. */
function setupUpdateTimestamps() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  // Validate the tab names first so a spelling error does not partially configure the file.
  const sheets = ACTIVE_TIMESTAMP_SETTINGS.tabs.map(function (name) {
    const sheet = spreadsheet.getSheetByName(name);
    if (!sheet) throw new Error('Tab not found: ' + name + '. Update ACTIVE_TIMESTAMP_SETTINGS.tabs.');
    return sheet;
  });
  sheets.forEach(function (sheet) { timestampColumn_(sheet, true); });
  spreadsheet.setSpreadsheetTimeZone(ACTIVE_TIMESTAMP_SETTINGS.timeZone);
  sheets.forEach(function (sheet) {
    const column = timestampColumn_(sheet, false);
    if (sheet.getMaxRows() > 1) {
      sheet.getRange(2, column, sheet.getMaxRows() - 1, 1)
        .setNumberFormat(ACTIVE_TIMESTAMP_SETTINGS.displayFormat);
    }
  });
  spreadsheet.toast('Update Timestamp is ready. Existing rows will be dated when edited.', '0161 Active');
}

/**
 * Runs on user edits in this bound spreadsheet; do not also install an edit trigger for it.
 * If the final script already has onEdit(e), call stampEditedRows_(e) from that handler instead.
 */
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (ACTIVE_TIMESTAMP_SETTINGS.tabs.indexOf(sheet.getName()) === -1) return;
  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    stampEditedRows_(e);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

/** Stamp each affected data row once, including rectangular multi-row pastes. */
function stampEditedRows_(e, editedAt) {
  const sheet = e.range.getSheet();
  if (ACTIVE_TIMESTAMP_SETTINGS.tabs.indexOf(sheet.getName()) === -1) return;
  const column = timestampColumn_(sheet, false);
  if (!column) throw new Error('Run setupUpdateTimestamps before editing ' + sheet.getName() + '.');
  // The generated timestamp itself is not a content edit.
  if (e.range.getColumn() === column && e.range.getNumColumns() === 1) return;
  const first = Math.max(2, e.range.getRow());
  const last = e.range.getLastRow();
  if (last < first) return;
  const now = editedAt || new Date();
  const rows = sheet.getRange(first, 1, last - first + 1, column - 1).getValues();
  const timestamps = rows.map(function (row) {
    const containsData = row.some(function (value) { return value !== '' && value !== null; });
    return [containsData ? now : ''];
  });
  sheet.getRange(first, column, timestamps.length, 1)
    .setValues(timestamps)
    .setNumberFormat(ACTIVE_TIMESTAMP_SETTINGS.displayFormat);
}

/** Keep exactly one timestamp column, after all named data columns. */
function timestampColumn_(sheet, create) {
  const last = sheet.getLastColumn();
  if (!last) throw new Error('Add the headings to ' + sheet.getName() + ' first.');
  const headings = sheet.getRange(1, 1, 1, last).getDisplayValues()[0]
    .map(function (value) { return value.trim(); });
  const matches = [];
  headings.forEach(function (heading, index) {
    if (heading.toLowerCase() === ACTIVE_TIMESTAMP_SETTINGS.heading.toLowerCase()) matches.push(index + 1);
  });
  if (matches.length > 1) throw new Error('Duplicate Update Timestamp columns in ' + sheet.getName() + '.');
  if (matches.length) {
    if (matches[0] !== last) throw new Error('Move Update Timestamp to the final column in ' + sheet.getName() + '.');
    if (matches[0] === 1) throw new Error('Add data columns before Update Timestamp in ' + sheet.getName() + '.');
    return matches[0];
  }
  if (!create) return 0;
  if (last === sheet.getMaxColumns()) sheet.insertColumnAfter(last);
  sheet.getRange(1, last + 1).setValue(ACTIVE_TIMESTAMP_SETTINGS.heading);
  return last + 1;
}
