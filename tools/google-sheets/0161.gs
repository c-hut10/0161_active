/**
 * @OnlyCurrentDoc
 * Restrict spreadsheet access to the file where this script is installed.
 *
 * 0161 Active: editable Master / Clubs / Sessions with shared IDs and audit history.
 * Replace the earlier timestamp script; install by running setup0161 once.
 * These are data tabs: formulas and manually edited IDs are not supported.
 */
const ACTIVE = Object.freeze({
  master: 'Master', clubs: 'Clubs', sessions: 'Sessions',
  state: '_0161_State', log: '_0161_Changes',
  zone: 'Europe/London', dateFormat: 'dd/MM/yyyy HH:mm:ss',
  unknown: 'Not confirmed', autoSort: true
});
const CLUB_FIELDS = [
  'Club ID', 'Club name', 'Sport or activity', 'Contact email',
  'Website or social link', 'Beginner friendly?', 'Kit requirements for newcomers?',
  'Kit Details:', 'Gender-specific?', 'Gender eligibility — if applicable',
  'About the club', 'Payment Type', 'Membership amount (£)', 'Booking required?',
  'How many free taster sessions do you offer newcomers?', 'Participate in a league?', 'League name'
];
const SESSION_FIELDS = [
  'Session ID', 'Training day', 'Session Price (£)', 'Session Name',
  'Session address', 'Session Postcode', 'Start time', 'End time', 'Any extra session info?'
];
const STAMP = 'Update Timestamp';
const SPORT_SECTION_MARKER = '#0161_SPORT_SECTION';
const SPORT_NAV_MARKER = '#0161_SPORT_NAV';
const CSV_EXPORT_NAME = 'CSV Export';
const FALSE_MARKER_FIELDS = ['Session ID', 'Session Price (£)', 'Membership amount (£)', 'Kit Details:', 'Gender eligibility — if applicable', 'League name'];
const BOOL_FIELDS = [
  'Beginner friendly?', 'Kit requirements for newcomers?', 'Gender-specific?',
  'Booking required?', 'Participate in a league?'
];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('0161 Active')
    .addItem('Set up / install sync', 'setup0161')
    .addItem('Import Master as source (once)', 'importMaster0161')
    .addItem('Fresh start from Master / reset IDs', 'freshStart0161')
    .addItem('Group tabs by sport / refresh links', 'organiseSports0161')
    .addItem('Delete selected club (all 4 tabs)', 'deleteSelectedClub0161')
    .addItem('Prepare for CSV — new and changed', 'prepareCsv0161')
    .addItem('Mark prepared CSV as exported', 'markCsvExported0161')
    .addItem('Export status', 'exportStatus0161')
    .addItem('Sync changes', 'sync0161')
    .addItem('Import registration', 'importRegistration0161')
    .addItem('Apply dropdowns and column formats', 'format0161')
    .addItem('Repair club name / sport from Master', 'repairClubColumns0161')
    .addItem('Prepare CSV — all records', 'export0161')
    .addItem('Back up working tabs', 'backup0161')
    .addItem('Restore views from saved records', 'restore0161')
    .addToUi();
}

function setup0161() {
  locked0161_(function () {
    const ss = SpreadsheetApp.getActive();
    ss.setSpreadsheetTimeZone(ACTIVE.zone);
    const tabs = tabs0161_(ss, true);
    backupTabs0161_(ss, tabs);
    if (stateSheetNames0161_().some(function (name) { return ss.getSheetByName(name); })) {
      syncCore0161_(ss, tabs);
    } else {
      // First setup merges supplied data; conflicting answers stop before rewriting.
      const input = readTabs0161_(tabs);
      const empty = { clubs: {}, sessions: {}, baseline: { master: [], clubs: [], sessions: [] } };
      const next = reconcile0161_(empty, input, true);
      publish0161_(ss, tabs, next, empty);
    }
    // Also refresh dropdowns when an existing installation needs no data rewrite.
    formatTabs0161_(tabs);
    // Only replace triggers belonging to this component.
    ScriptApp.getProjectTriggers().forEach(function (trigger) {
      if (['activeEdit0161', 'activeChange0161'].indexOf(trigger.getHandlerFunction()) >= 0) {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    ScriptApp.newTrigger('activeEdit0161').forSpreadsheet(ss).onEdit().create();
    ScriptApp.newTrigger('activeChange0161').forSpreadsheet(ss).onChange().create();
    ss.toast('Sync installed. Do not edit IDs or hidden system tabs.', '0161 Active', 8);
  });
}

/** Explicit fresh start: Master alone supplies records; visible and saved IDs are archived first. */
function freshStartModel0161_(masterRows) {
  if (!masterRows.length) throw new Error('Master is empty. Paste the cleaned Master data before starting again.');
  const rows = masterRows.map(function (row) {
    return Object.assign({}, row, { 'Club ID': '', 'Session ID': '', [STAMP]: null });
  });
  const empty = { clubs: {}, sessions: {}, sequences: {}, baseline: { master: [], clubs: [], sessions: [] } };
  return masterImportModel0161_(empty, { master: rows, clubs: [], sessions: [] });
}
function freshStart0161() {
  locked0161_(function () {
    const ss = SpreadsheetApp.getActive();
    const tabs = tabs0161_(ss, true);
    // Read Master alone: stale headings or rows in the two old views cannot enter the fresh import.
    const input = readTabs0161_({ master: tabs.master }).master;
    const next = freshStartModel0161_(input);
    const slots = stateSlots0161_(ss);
    const previous = slots.valid.length ? slots.valid[0].model
      : { clubs: {}, sessions: {}, sequences: {}, baseline: { master: [], clubs: [], sessions: [] } };
    backupTabs0161_(ss, tabs);
    const stamp = Utilities.formatDate(new Date(), ACTIVE.zone, 'yyyyMMdd-HHmmss');
    stateSheetNames0161_().forEach(function (name) {
      const sheet = ss.getSheetByName(name);
      if (sheet) sheet.copyTo(ss).setName('_backup_state_' + stamp + '_' + Utilities.getUuid().slice(0, 8)).hideSheet();
    });
    if (!equal0161_(input, readTabs0161_({ master: tabs.master }).master)) throw new Error('Master changed during reset. Wait for editing to stop and try again.');
    // Keep the existing snapshot generations; reset only the imported records and ID counters.
    publish0161_(ss, tabs, next, previous);
    ss.toast('Fresh import completed from Master. IDs restarted; previous tabs and state were backed up.', '0161 Active', 10);
  });
}

/** One explicit import resolves cross-tab differences; routine sync stays strict. */
function importMaster0161() {
  locked0161_(function () {
    const ss = SpreadsheetApp.getActive();
    const tabs = tabs0161_(ss, false);
    const hasState = stateSheetNames0161_().some(function (name) { return ss.getSheetByName(name); });
    const previous = hasState ? load0161_(ss) : { clubs: {}, sessions: {}, sequences: {}, baseline: { master: [], clubs: [], sessions: [] } };
    if (previous.masterImportComplete) throw new Error('The one-time Master import has already completed. Use normal Sync changes.');
    const input = readTabs0161_(tabs);
    const next = masterImportModel0161_(previous, input);
    backupTabs0161_(ss, tabs);
    if (!equal0161_(input, readTabs0161_(tabs))) throw new Error('Data changed during import. Wait for editing to stop and try again.');
    publish0161_(ss, tabs, next, previous);
    ss.toast('Master imported. Matching records updated; other clubs and sessions preserved. Normal sync remains strict.', '0161 Active', 10);
  });
}
function masterImportModel0161_(previous, input) {
  if (previous.masterImportComplete) throw new Error('The one-time Master import has already completed.');
  if (!input.master.length) throw new Error('Master is empty. Paste the cleaned Master data before importing.');
  const next = JSON.parse(JSON.stringify(previous));
  next.sequences = next.sequences || {};
  const clubIds = new Set(Object.keys(next.clubs));
  const sessionIds = new Set(Object.keys(next.sessions));
  Object.keys(input).forEach(function (tab) {
    input[tab].forEach(function (row) {
      if (!blank0161_(row['Club ID'])) clubIds.add(String(row['Club ID']).trim());
      if (!noSessionId0161_(row['Session ID'])) sessionIds.add(String(row['Session ID']).trim());
    });
  });
  seedIdCounters0161_(clubIds, sessionIds, next.sequences);
  const now = Date.now();
  const names = new Map();
  function registerName(name, id) {
    if (unknown0161_(name)) return;
    const key = String(name).trim().toLowerCase();
    if (!names.has(key)) names.set(key, new Set());
    names.get(key).add(id);
  }
  Object.keys(next.clubs).forEach(function (id) { registerName(next.clubs[id].data['Club name'], id); });
  ['clubs', 'master'].forEach(function (tab) {
    input[tab].forEach(function (row) {
      if (!blank0161_(row['Club ID'])) registerName(row['Club name'], String(row['Club ID']).trim());
    });
  });
  function clubId(row, source) {
    if (!blank0161_(row['Club ID'])) return String(row['Club ID']).trim();
    const name = row['Club name'];
    if (unknown0161_(name)) throw new Error(source + ': Club name is required for an ID-less row.');
    const candidates = names.get(String(name).trim().toLowerCase());
    if (candidates && candidates.size > 1) throw new Error(source + ': ambiguous club name. Supply its Club ID.');
    const id = candidates && candidates.size ? [...candidates][0]
      : nextClubId0161_(unknown0161_(row['Sport or activity']) ? name : row['Sport or activity'], clubIds, next.sequences);
    clubIds.add(id); registerName(name, id);
    return id;
  }
  // First preserve the current Clubs view. Master will override matching IDs below.
  const seenClubs = new Set();
  input.clubs.forEach(function (row, index) {
    const id = clubId(row, 'Clubs row ' + (index + 2));
    if (seenClubs.has(id)) throw new Error('Clubs contains duplicate Club ID ' + id + '.');
    seenClubs.add(id);
    next.clubs[id] = { data: Object.assign({}, row), updated: now };
  });
  const masterClubs = new Map();
  const masterRows = input.master.map(function (row, index) {
    const id = clubId(row, 'Master row ' + (index + 2));
    const data = normalizeClub0161_(row);
    if (masterClubs.has(id) && !equal0161_(masterClubs.get(id), data)) throw new Error('Master has conflicting club answers for ' + id + '. Make its repeated rows agree first.');
    masterClubs.set(id, data);
    return { row: row, clubId: id, source: 'Master row ' + (index + 2) };
  });
  masterClubs.forEach(function (data, id) { next.clubs[id] = { data: data, updated: now }; });
  Object.keys(next.clubs).forEach(function (id) { next.clubs[id].data = normalizeClub0161_(next.clubs[id].data); });
  function hasSession(row) {
    return SESSION_FIELDS.slice(1).some(function (field) { return !unknown0161_(row[field]) && !false0161_(row[field]); });
  }
  const seenSessions = new Set();
  input.sessions.forEach(function (row, index) {
    const id = String(row['Club ID'] || '').trim();
    if (!id || !next.clubs[id]) throw new Error('Sessions row ' + (index + 2) + ': unknown Club ID.');
    if (noSessionId0161_(row['Session ID']) && !hasSession(row)) return;
    const sid = noSessionId0161_(row['Session ID']) ? nextSessionId0161_(id, sessionIds, next.sequences) : String(row['Session ID']).trim();
    if (seenSessions.has(sid)) throw new Error('Sessions contains duplicate Session ID ' + sid + '.');
    seenSessions.add(sid); sessionIds.add(sid);
    next.sessions[sid] = { clubId: id, data: Object.assign({}, row), updated: now };
  });
  // Master IDs take precedence before normalising legacy session answers in other views.
  const explicit = new Set();
  masterRows.forEach(function (entry) {
    if (noSessionId0161_(entry.row['Session ID'])) return;
    const sid = String(entry.row['Session ID']).trim();
    if (explicit.has(sid)) throw new Error('Master contains duplicate Session ID ' + sid + '.');
    explicit.add(sid);
    if (next.sessions[sid] && next.sessions[sid].clubId !== entry.clubId) throw new Error('Session ' + sid + ' belongs to a different Club ID.');
    next.sessions[sid] = { clubId: entry.clubId, data: Object.assign({}, entry.row), updated: now };
  });
  Object.keys(next.sessions).forEach(function (sid) {
    const session = next.sessions[sid];
    if (!next.clubs[session.clubId]) throw new Error('Session ' + sid + ' has an unknown Club ID.');
    session.data = normalizeSession0161_(session.data, next.clubs[session.clubId].data['Payment Type']);
  });
  masterRows.forEach(function (entry) {
    if (!noSessionId0161_(entry.row['Session ID']) || !hasSession(entry.row)) return;
    const data = normalizeSession0161_(entry.row, next.clubs[entry.clubId].data['Payment Type']);
    const matching = Object.keys(next.sessions).filter(function (sid) {
      return next.sessions[sid].clubId === entry.clubId && equal0161_(next.sessions[sid].data, data);
    });
    if (matching.length > 1) throw new Error(entry.source + ': multiple existing sessions match. Supply its Session ID.');
    const sid = matching[0] || nextSessionId0161_(entry.clubId, sessionIds, next.sequences);
    if (explicit.has(sid)) throw new Error(entry.source + ': duplicate Master session.');
    explicit.add(sid); sessionIds.add(sid);
    next.sessions[sid] = { clubId: entry.clubId, data: data, updated: now };
  });
  next.masterImportComplete = true;
  next.baseline = rows0161_(next);
  return next;
}

function workingTabKey0161_(name) {
  const value = heading0161_(name);
  const aliases = {
    master: [heading0161_(ACTIVE.master), 'master', 'mastersheet'],
    clubs: [heading0161_(ACTIVE.clubs), 'club', 'clubs', 'clubsheet'],
    sessions: [heading0161_(ACTIVE.sessions), 'session', 'sessions', 'sessionssheet', 'sessionsheet']
  };
  return Object.keys(aliases).find(function (key) { return aliases[key].includes(value); });
}
function activeEdit0161(e) {
  if (!e || !e.range || (e.value !== undefined && e.oldValue === e.value)) return;
  const sheet = e.range.getSheet();
  const key = workingTabKey0161_(sheet.getName());
  if (!key) return; // CSV Export is a snapshot, not an editable source.
  const width = sheet.getLastColumn();
  if (!width) return;
  const headers = sheet.getRange(1, 1, 1, width).getValues()[0].map(heading0161_);
  const stamp = headers.indexOf(heading0161_(STAMP));
  if (stamp < 0 || (e.range.getNumColumns() === 1 && e.range.getColumn() === stamp + 1)) return;
  const first = Math.max(2, e.range.getRow());
  const last = Math.min(sheet.getLastRow(), e.range.getRow() + e.range.getNumRows() - 1);
  if (last < first) return;
  const values = sheet.getRange(first, 1, last - first + 1, width).getValues();
  const idColumn = headers.indexOf(heading0161_('Club ID'));
  const fields = new Set(schema0161_(key).filter(function (field) { return field !== STAMP; }).map(heading0161_));
  const now = new Date();
  const timestamps = values.map(function (row) {
    if ([SPORT_NAV_MARKER, SPORT_SECTION_MARKER].includes(row[idColumn])) return [row[stamp]];
    return [row.some(function (value, index) { return fields.has(headers[index]) && !blank0161_(value); }) ? now : ''];
  });
  // This trigger only touches edited rows' timestamps. No locks, sorting, state saves or full sync.
  sheet.getRange(first, stamp + 1, timestamps.length, 1).setNumberFormat(ACTIVE.dateFormat).setValues(timestamps);
}
function activeChange0161(e) {
  if (e && ['REMOVE_ROW', 'REMOVE_COLUMN', 'INSERT_COLUMN'].includes(e.changeType)) {
    e.source.toast('Table structure changed. Choose 0161 Active → Sync changes when you finish editing.', '0161 Active', 6);
  }
}
function sync0161() {
  locked0161_(function () {
    const ss = SpreadsheetApp.getActive();
    syncCore0161_(ss, tabs0161_(ss, false));
    ss.toast('All three tabs synced.', '0161 Active', 5);
  });
}
function locked0161_(work) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(1000)) throw new Error('Another 0161 sync is already running. Wait for it to finish, then choose Sync changes.');
  try { work(); } finally { lock.releaseLock(); }
}
function schema0161_(key) {
  return (key === 'clubs' ? CLUB_FIELDS : key === 'sessions' ? ['Club ID'].concat(SESSION_FIELDS) : CLUB_FIELDS.concat(SESSION_FIELDS)).concat([STAMP]);
}
function heading0161_(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}
function tabs0161_(ss, create) {
  const result = {};
  const aliases = { master: ['master', 'mastersheet'], clubs: ['club', 'clubs', 'clubsheet'], sessions: ['session', 'sessions', 'sessionssheet', 'sessionsheet'] };
  Object.keys(aliases).forEach(function (key) {
    let sheet = ss.getSheetByName(ACTIVE[key]);
    if (!sheet) {
      const matches = ss.getSheets().filter(function (candidate) { return aliases[key].indexOf(heading0161_(candidate.getName())) >= 0; });
      if (matches.length > 1) throw new Error('More than one possible ' + key + ' tab. Set its exact name in ACTIVE.');
      sheet = matches[0];
    }
    if (!sheet && create) sheet = ss.insertSheet(ACTIVE[key]);
    if (!sheet) throw new Error('Missing tab: ' + ACTIVE[key]);
    result[key] = sheet;
  });
  return result;
}
function readTabs0161_(tabs) {
  const result = {};
  Object.keys(tabs).forEach(function (key) {
    const sheet = tabs[key];
    if (!sheet.getLastRow()) { result[key] = []; return; }
    const range = sheet.getDataRange();
    if (range.getFormulas().some(function (row) { return row.some(Boolean); })) {
      throw new Error(sheet.getName() + ': use values only, not formulas.');
    }
    const values = range.getValues();
    const headers = values.shift();
    const expected = schema0161_(key);
    const mapped = headers.map(function (header) {
      if (!String(header).trim()) return null;
      const found = expected.filter(function (field) { return heading0161_(field) === heading0161_(header); });
      if (found.length !== 1) throw new Error(sheet.getName() + ': unknown heading "' + header + '". Use the supplied headings.');
      return found[0];
    });
    const named = mapped.filter(Boolean);
    if (new Set(named).size !== named.length) throw new Error(sheet.getName() + ': duplicate headings.');
    // Missing columns on an existing tab must never be interpreted as erased answers.
    expected.filter(function (field) { return field !== STAMP; }).forEach(function (field) {
      if (named.indexOf(field) < 0) throw new Error(sheet.getName() + ': missing heading ' + field);
    });
    result[key] = values.map(function (row, index) {
      if (row[mapped.indexOf('Club ID')] === SPORT_NAV_MARKER) return null;
      if (row[mapped.indexOf('Club ID')] === SPORT_SECTION_MARKER) {
        const labelField = key === 'sessions' ? 'Session ID' : 'Club name';
        if (row.some(function (value, col) { return !blank0161_(value) && !['Club ID', labelField].includes(mapped[col]); })) throw new Error(sheet.getName() + ': edited sport heading at row ' + (index + 2));
        return null;
      }
      const record = {};
      mapped.forEach(function (field, col) {
        if (!field) {
          if (row[col] !== '') throw new Error(sheet.getName() + ': data in an unnamed column at row ' + (index + 2));
          return;
        }
        let value = row[col];
        if (value instanceof Date) {
          value = field === STAMP ? value.getTime() : Utilities.formatDate(value, ACTIVE.zone, 'HH:mm');
        }
        if (BOOL_FIELDS.indexOf(field) >= 0 && !blank0161_(value)) value = bool0161_(value);
        else if (FALSE_MARKER_FIELDS.indexOf(field) >= 0 && false0161_(value)) value = false;
        record[field] = field === STAMP && blank0161_(value) ? null : value;
      });
      Object.defineProperty(record, '_sheetRow', { value: index + 2, enumerable: false });
      return record;
    }).filter(function (record) {
      return record && expected.some(function (field) { return field !== STAMP && !blank0161_(record[field]); });
    });
  });
  return result;
}
function blank0161_(value) { return value === '' || value === null || value === undefined; }
function unknown0161_(value) {
  return blank0161_(value) || /^(not confirmed|unknown|tbc|not supplied|not listed|n\/a)$/i.test(String(value).trim());
}
function equal0161_(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
// Numbers grow to their documented limits; saved high-water marks prevent reusing deleted IDs.
function numberedId0161_(prefix, existingIds, width, counters) {
  const key = prefix.toUpperCase();
  let highest = counters[key] || 0;
  existingIds.forEach(function (id) {
    const text = String(id).toUpperCase();
    if (text.indexOf(key) !== 0) return;
    const suffix = text.slice(key.length);
    if (/^\d+$/.test(suffix)) highest = Math.max(highest, Number(suffix));
  });
  const limit = Math.pow(10, width) - 1;
  if (highest >= limit) throw new Error('ID limit reached for ' + prefix + ' (' + limit + '). No records were changed.');
  counters[key] = highest + 1;
  return prefix + String(highest + 1).padStart(width, '0');
}
function seedIdCounters0161_(clubs, sessions, counters) {
  function reserve(prefix, suffix) {
    const key = prefix.toUpperCase();
    const number = Number(suffix);
    if (!Number.isSafeInteger(number)) throw new Error('Invalid numeric ID: ' + prefix + suffix);
    counters[key] = Math.max(counters[key] || 0, number);
  }
  clubs.forEach(function (id) {
    const match = /^([A-Z0-9]{4}-)(\d+)$/i.exec(String(id).trim());
    if (match) reserve(match[1], match[2]);
  });
  sessions.forEach(function (id) {
    const match = /^(.+-S)(\d+)$/i.exec(String(id).trim());
    if (match) reserve(match[1], match[2]);
  });
}
function nextClubId0161_(sport, existingIds, counters = {}) {
  const words = String(sport || 'Club').replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/);
  const prefix = (words.length > 1 ? (words[0] + 'XX').slice(0, 2) + (words[1] + 'XX').slice(0, 2)
    : (words[0] + 'XXXX').slice(0, 4)).toUpperCase();
  return numberedId0161_(prefix + '-', existingIds, 4, counters);
}
function nextSessionId0161_(clubId, existingIds, counters = {}) {
  return numberedId0161_(String(clubId).trim() + '-S', existingIds, 5, counters);
}
// Sheets may return FALSE as a boolean or text, depending on cell formatting.
function false0161_(value) { return value === false || (typeof value === 'string' && /^false$/i.test(value.trim())); }
function noSessionId0161_(value) { return blank0161_(value) || false0161_(value) || (typeof value === 'string' && !value.trim()); }
function identity0161_(key, row) {
  if (key === 'clubs') return 'club:' + row['Club ID'];
  if (!noSessionId0161_(row['Session ID'])) return 'session:' + String(row['Session ID']).trim();
  return 'club:' + row['Club ID'];
}

function reconcile0161_(previous, input, initial) {
  const next = JSON.parse(JSON.stringify(previous));
  const patches = {};
  const deletedClubs = new Set();
  const deletedSessions = new Set();
  const touched = new Set();
  const touchedTimes = new Map();
  const now = Date.now();
  const prepared = {};
  next.sequences = next.sequences || {};
  const knownClubIds = new Set(Object.keys(next.clubs));
  const knownSessionIds = new Set(Object.keys(next.sessions));
  Object.keys(input).forEach(function (key) {
    input[key].forEach(function (row) {
      if (row['Club ID']) knownClubIds.add(String(row['Club ID']).trim());
      if (!noSessionId0161_(row['Session ID'])) knownSessionIds.add(String(row['Session ID']).trim());
    });
  });
  // Reserve imported numbers now, even when no new IDs are allocated in this sync.
  seedIdCounters0161_(knownClubIds, knownSessionIds, next.sequences);
  function patch(kind, id, field, value, source, editedAt) {
    const target = kind + ':' + id;
    if (!patches[target]) patches[target] = { kind: kind, id: id, values: {}, sources: {} };
    const item = patches[target];
    if (Object.prototype.hasOwnProperty.call(item.values, field) && !equal0161_(item.values[field], value)) {
      throw new Error('Conflicting edits to ' + id + ' / ' + field + ': ' + item.sources[field] + ' and ' + source + '. Make them agree, then Sync now.');
    }
    item.values[field] = value;
    item.sources[field] = source;
    if (!initial) {
      touched.add(target);
      if (typeof editedAt === 'number' && Number.isFinite(editedAt) && editedAt > 0 && editedAt <= now) {
        touchedTimes.set(target, Math.max(touchedTimes.get(target) || 0, editedAt));
      }
    }
  }
  // Reuse a unique exact club name only during initial import or for new ID-less rows.
  const names = {};
  Object.keys(next.clubs).forEach(function (id) {
    const name = String(next.clubs[id].data['Club name'] || '').trim().toLowerCase();
    if (!names[name]) names[name] = [];
    names[name].push(id);
  });
  ['clubs', 'master', 'sessions'].forEach(function (key) {
    const base = {};
    previous.baseline[key].forEach(function (row) { base[identity0161_(key, row)] = row; });
    const seen = new Set();
    prepared[key] = input[key].map(function (original, index) {
      const row = Object.assign({}, original);
      const source = key + ' row ' + (original._sheetRow || index + 2);
      let clubId = row['Club ID'];
      if (blank0161_(clubId)) {
        if (key === 'sessions') throw new Error(source + ': Club ID is required.');
        const name = String(row['Club name'] || '').trim().toLowerCase();
        if (!name || unknown0161_(name)) throw new Error(source + ': enter a club name before adding a club.');
        if (names[name] && names[name].length > 1) throw new Error(source + ': ambiguous club name; supply its Club ID.');
        const sport = unknown0161_(row['Sport or activity']) ? row['Club name'] : row['Sport or activity'];
        clubId = names[name] ? names[name][0] : nextClubId0161_(sport, knownClubIds, next.sequences);
        knownClubIds.add(clubId);
        names[name] = [clubId];
        row['Club ID'] = clubId;
      }
      clubId = String(clubId).trim();
      row['Club ID'] = clubId;
      let sessionId = row['Session ID'];
      if (noSessionId0161_(sessionId)) sessionId = '';
      // A generated club-only Master row is a placeholder, not a fake session.
      const placeholder = key === 'master' && base['club:' + clubId];
      const hasSession = SESSION_FIELDS.slice(1).some(function (field) {
        return !unknown0161_(row[field]) && !false0161_(row[field]);
      });
      const placeholderChanged = placeholder && SESSION_FIELDS.slice(1).some(function (field) {
        return !equal0161_(row[field], placeholder[field]);
      });
      if (!sessionId && (key === 'sessions' || (key === 'master' && (placeholder ? placeholderChanged : hasSession)))) {
        sessionId = nextSessionId0161_(clubId, knownSessionIds, next.sequences);
        knownSessionIds.add(sessionId);
      }
      if (key !== 'clubs') row['Session ID'] = sessionId ? String(sessionId).trim() : false;
      const identity = identity0161_(key, row);
      if (seen.has(identity)) throw new Error(source + ': duplicate ' + identity + '. Each session needs its own ID.');
      seen.add(identity);
      const old = base[identity];
      const editedAt = old && row[STAMP] <= (old[STAMP] || 0) ? undefined : row[STAMP];
      if (key !== 'sessions') {
        CLUB_FIELDS.slice(1).forEach(function (field) {
          if (old ? !equal0161_(row[field], old[field]) : !blank0161_(row[field])) patch('club', clubId, field, row[field], source, editedAt);
        });
        // Create a draft club even if only its ID is supplied.
        if (!next.clubs[clubId] && !patches['club:' + clubId]) patches['club:' + clubId] = { kind: 'club', id: clubId, values: {}, sources: {} };
      }
      if (sessionId) {
        SESSION_FIELDS.slice(1).forEach(function (field) {
          if (old ? !equal0161_(row[field], old[field]) : !blank0161_(row[field])) patch('session', sessionId, field, row[field], source, editedAt);
        });
        if (!old || old['Club ID'] !== clubId) patch('session', sessionId, 'Club ID', clubId, source, editedAt);
      }
      return row;
    });
    if (!initial) Object.keys(base).forEach(function (id) {
      if (!seen.has(id)) {
        if (id.indexOf('session:') === 0) deletedSessions.add(id.slice(8));
        else if (key !== 'master' || !prepared[key].some(function (row) { return row['Club ID'] === id.slice(5); })) deletedClubs.add(id.slice(5));
      }
    });
  });
  // A changed ID looks like deletion plus insertion. Stop rather than guessing intent.
  if (!initial) {
    ['clubs', 'sessions', 'master'].forEach(function (key) {
      const old = previous.baseline[key];
      const rows = prepared[key];
      if (old.length !== rows.length) return;
      old.forEach(function (row) {
        const id = identity0161_(key, row);
        if (rows.some(function (candidate) { return identity0161_(key, candidate) === id; })) return;
        const ownField = id.indexOf('session:') === 0 ? 'Session ID' : 'Club ID';
        const fields = schema0161_(key).filter(function (field) { return field !== ownField && field !== STAMP; });
        if (rows.some(function (candidate) { return fields.every(function (field) { return equal0161_(candidate[field], row[field]); }); })) {
          throw new Error('An existing ID was changed or cleared in ' + key + '. Restore the ID. Delete the entire row to delete a record.');
        }
      });
    });
  }
  Object.keys(patches).forEach(function (target) {
    const p = patches[target];
    const deleting = p.kind === 'club' ? deletedClubs.has(p.id) : deletedSessions.has(p.id) || deletedClubs.has((previous.sessions[p.id] || {}).clubId);
    if (deleting) throw new Error('Deletion conflicts with another edit to ' + p.id + '. Resolve the edits before syncing.');
    const collection = p.kind === 'club' ? next.clubs : next.sessions;
    const isNew = !collection[p.id];
    if (isNew) collection[p.id] = { data: {}, updated: initial ? null : now };
    const record = collection[p.id];
    Object.keys(p.values).forEach(function (field) {
      if (p.kind === 'session' && field === 'Club ID') record.clubId = p.values[field];
      else record.data[field] = p.values[field];
    });
    if (initial) {
      const times = [].concat(prepared.clubs, prepared.master, prepared.sessions).filter(function (row) {
        return p.kind === 'club' ? row['Club ID'] === p.id && typeof row[STAMP] === 'number' : row['Session ID'] === p.id && typeof row[STAMP] === 'number';
      }).map(function (row) { return row[STAMP]; });
      if (times.length) record.updated = Math.max.apply(null, times);
    }
    if (touched.has(target)) record.updated = Math.max(isNew ? 0 : record.updated || 0, touchedTimes.get(target) || now);
  });
  deletedClubs.forEach(function (id) { delete next.clubs[id]; });
  Object.keys(next.sessions).forEach(function (id) {
    if (deletedSessions.has(id) || deletedClubs.has(next.sessions[id].clubId)) delete next.sessions[id];
  });
  Object.keys(next.clubs).forEach(function (id) {
    const record = next.clubs[id];
    const before = JSON.stringify(record.data);
    record.data = normalizeClub0161_(record.data);
    if (!initial && before !== JSON.stringify(record.data) && !touched.has('club:' + id)) record.updated = now;
  });
  Object.keys(next.sessions).forEach(function (id) {
    const record = next.sessions[id];
    if (!next.clubs[record.clubId]) throw new Error('Session ' + id + ': unknown Club ID ' + record.clubId);
    const before = JSON.stringify(record.data);
    record.data = normalizeSession0161_(record.data, next.clubs[record.clubId].data['Payment Type']);
    if (!initial && before !== JSON.stringify(record.data) && !touched.has('session:' + id)) record.updated = now;
  });
  // Detect typing that happened while the script was preparing its changes.
  next.baseline = rows0161_(next);
  return next;
}

function bool0161_(value) {
  if (unknown0161_(value)) return ACTIVE.unknown;
  if (value === true || /^(yes|true|y|1)$/i.test(String(value).trim())) return true;
  if (value === false || /^(no|false|n|0)$/i.test(String(value).trim())) return false;
  throw new Error('Invalid yes/no answer: ' + value + '. Use TRUE, FALSE or Not confirmed.');
}
function text0161_(value) { return unknown0161_(value) ? ACTIVE.unknown : String(value).trim(); }
function amount0161_(value, integer) {
  if (unknown0161_(value) || value === false || value === 'FALSE') return ACTIVE.unknown;
  const number = typeof value === 'number' ? value : Number(String(value).replace(/[£,\s]/g, ''));
  if (!isFinite(number) || number < 0 || (integer && Math.floor(number) !== number)) throw new Error('Invalid non-negative amount: ' + value);
  return number;
}
function payment0161_(value) {
  if (unknown0161_(value)) return ACTIVE.unknown;
  const key = heading0161_(value);
  if (['persession', 'paypersession', 'persessionfee', 'payasyougo'].indexOf(key) >= 0) return 'Per session';
  if (['monthly', 'monthlymembership', 'monthlyfee'].indexOf(key) >= 0) return 'Monthly membership';
  if (['annual', 'annually', 'annualmembership', 'annualfee', 'yearly', 'yearlymembership'].indexOf(key) >= 0) return 'Annual membership';
  if (key === 'free') return 'Free';
  throw new Error('Payment Type must be Per session, Monthly membership, Annual membership, Free or Not confirmed.');
}
function dependent0161_(flag, value) {
  return flag === false ? false : (value === false || value === 'FALSE' ? ACTIVE.unknown : text0161_(value));
}
function normalizeClub0161_(data) {
  const result = {};
  CLUB_FIELDS.slice(1).forEach(function (field) { result[field] = text0161_(data[field]); });
  BOOL_FIELDS.forEach(function (field) { result[field] = bool0161_(data[field]); });
  result['Payment Type'] = payment0161_(data['Payment Type']);
  result['Membership amount (£)'] = /^(Monthly|Annual) membership$/.test(result['Payment Type']) ? amount0161_(data['Membership amount (£)'], false) : false;
  result['How many free taster sessions do you offer newcomers?'] = amount0161_(data['How many free taster sessions do you offer newcomers?'], true);
  result['Kit Details:'] = dependent0161_(result['Kit requirements for newcomers?'], data['Kit Details:']);
  result['League name'] = dependent0161_(result['Participate in a league?'], data['League name']);
  result['Gender eligibility — if applicable'] = dependent0161_(result['Gender-specific?'], data['Gender eligibility — if applicable']);
  return result;
}
function time0161_(value, optional) {
  if (unknown0161_(value)) return optional ? '' : ACTIVE.unknown;
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const minutes = Math.round(value * 1440) % 1440;
    return ('0' + Math.floor(minutes / 60)).slice(-2) + ':' + ('0' + minutes % 60).slice(-2);
  }
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(value).trim());
  if (!match || +match[1] > 23 || +match[2] > 59) throw new Error('Invalid time: ' + value + '. Use HH:mm.');
  return ('0' + match[1]).slice(-2) + ':' + match[2];
}
function normalizeSession0161_(data, payment) {
  const result = {};
  SESSION_FIELDS.slice(1).forEach(function (field) { result[field] = text0161_(data[field]); });
  result['Session Price (£)'] = payment === 'Per session' ? amount0161_(data['Session Price (£)'], false) : false;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const day = data['Training day'];
  if (!unknown0161_(day)) {
    const index = /^([1-7])$/.test(String(day)) ? Number(day) - 1 : days.findIndex(function (name) { return name.toLowerCase() === String(day).trim().toLowerCase(); });
    if (index < 0) throw new Error('Invalid Training day: ' + day);
    result['Training day'] = days[index];
  }
  if (!unknown0161_(data['Session Postcode'])) {
    const postcode = String(data['Session Postcode']).toUpperCase().replace(/\s/g, '');
    if (!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(postcode)) throw new Error('Invalid full Session Postcode: ' + data['Session Postcode']);
    result['Session Postcode'] = postcode.slice(0, -3) + ' ' + postcode.slice(-3);
  }
  result['Start time'] = time0161_(data['Start time'], false);
  result['End time'] = time0161_(data['End time'], true);
  return result;
}

function sportForRow0161_(model, row) {
  return String(row['Sport or activity'] || model.clubs[row['Club ID']]?.data['Sport or activity'] || ACTIVE.unknown);
}
function sportLayout0161_(key, rows, grouped, clubSports) {
  if (!grouped) return { rows: rows, sections: [], navigation: [] };
  const sports = [...new Set(rows.map(function (row) { return String(row['Sport or activity'] || clubSports.get(row['Club ID']) || ACTIVE.unknown); }))];
  const fields = schema0161_(key), capacity = fields.length - 1;
  const output = [], sections = [], navigation = [];
  // Short link rows stay above the data without creating a fifth tab or inserting formulas.
  for (let start = 0; start < sports.length; start += capacity) {
    const nav = { 'Club ID': SPORT_NAV_MARKER };
    const links = sports.slice(start, start + capacity);
    links.forEach(function (sport, index) { nav[fields[index + 1]] = sport; });
    navigation.push({ row: output.length + 2, sports: links });
    output.push(nav);
  }
  let current = null;
  rows.forEach(function (row) {
    const sport = String(row['Sport or activity'] || clubSports.get(row['Club ID']) || ACTIVE.unknown);
    if (sport !== current) {
      current = sport;
      const heading = { 'Club ID': SPORT_SECTION_MARKER };
      heading[key === 'sessions' ? 'Session ID' : 'Club name'] = sport;
      sections.push({ sport: sport, row: output.length + 2 }); output.push(heading);
    }
    output.push(row);
  });
  return { rows: output, sections: sections, navigation: navigation };
}
function renderSportLinks0161_(sheet, layout, width) {
  const sections = new Map(layout.sections.map(function (section) { return [section.sport, section.row]; }));
  layout.navigation.forEach(function (nav) {
    const links = nav.sports.map(function (sport) {
      return SpreadsheetApp.newRichTextValue().setText(sport)
        .setLinkUrl(SpreadsheetApp.getActive().getUrl() + '#gid=' + sheet.getSheetId() + '&range=A' + sections.get(sport)).build();
    });
    sheet.getRange(nav.row, 1, 1, width).clearDataValidations().setBackground('#eef0ec').setFontWeight('bold');
    sheet.getRange(nav.row, 1).setNumberFormat(';;;');
    sheet.getRange(nav.row, 2, 1, links.length).setRichTextValues([links]);
  });
  sheet.setFrozenRows(1 + layout.navigation.length);
}
function organiseSports0161() {
  locked0161_(function () {
    const ss = SpreadsheetApp.getActive();
    const tabs = tabs0161_(ss, false);
    syncCore0161_(ss, tabs);
    const previous = load0161_(ss);
    const next = JSON.parse(JSON.stringify(previous));
    next.groupBySport = true;
    next.baseline = rows0161_(next);
    backupTabs0161_(ss, tabs);
    publish0161_(ss, tabs, next, previous);
    ss.toast('All three tabs grouped by sport. Use the links below the column headings to jump to a section.', '0161 Active', 8);
  });
}

function rows0161_(model) {
  const result = { clubs: [], sessions: [], master: [] };
  Object.keys(model.clubs).forEach(function (id) {
    const club = model.clubs[id];
    const row = Object.assign({ 'Club ID': id }, club.data);
    row[STAMP] = club.updated;
    result.clubs.push(row);
    const ids = Object.keys(model.sessions).filter(function (sid) { return model.sessions[sid].clubId === id; });
    if (!ids.length) {
      const empty = normalizeSession0161_({}, club.data['Payment Type']);
      const placeholder = Object.assign({}, row, empty, { 'Session ID': false });
      result.master.push(placeholder);
    }
    ids.forEach(function (sid) {
      const session = model.sessions[sid];
      const srow = Object.assign({ 'Club ID': id, 'Session ID': sid }, session.data);
      srow[STAMP] = session.updated;
      result.sessions.push(srow);
      const mrow = Object.assign({}, row, srow);
      mrow[STAMP] = Math.max(club.updated || 0, session.updated || 0) || null;
      result.master.push(mrow);
    });
  });
  if (ACTIVE.autoSort) Object.keys(result).forEach(function (key) {
    result[key].sort(function (a, b) {
      const sportOrder = model.groupBySport ? sportForRow0161_(model, a).localeCompare(sportForRow0161_(model, b)) : 0;
      return sportOrder || (a[STAMP] || 0) - (b[STAMP] || 0) || identity0161_(key, a).localeCompare(identity0161_(key, b));
    });
  });
  return result;
}
// Two alternating snapshots: the newest valid snapshot is never cleared during a save.
function stateSheetNames0161_() { return [ACTIVE.state, ACTIVE.state + '_Standby']; }
function stateDigest0161_(rows) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(rows), Utilities.Charset.UTF_8)
    .map(function (byte) { return (byte & 255).toString(16).padStart(2, '0'); }).join('');
}
function decodeState0161_(rows) {
  const model = { clubs: {}, sessions: {}, baseline: { master: [], clubs: [], sessions: [] } };
  let meta = null;
  const exported = {}, prepared = [], registrations = {};
  const seen = new Set();
  rows.forEach(function (row) {
    const kind = row[0], key = row[1];
    const value = JSON.parse(row[2]);
    if (kind === 'meta') {
      if (key !== 'status' || meta) throw new Error('Invalid state metadata.');
      meta = value;
    } else if (kind === 'registration') {
      if (!key || Object.prototype.hasOwnProperty.call(registrations, key) || !value || typeof value.clubId !== 'string'
        || !Array.isArray(value.sessionIds) || !value.sessionIds.every(function (id) { return typeof id === 'string'; })
        || typeof value.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(value.fingerprint)) throw new Error('Invalid registration import history.');
      registrations[key] = value;
    } else if (kind === 'exported') {
      if (!key || Object.prototype.hasOwnProperty.call(exported, key) || typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new Error('Invalid export history.');
      exported[key] = value;
    } else if (kind === 'prepared') {
      if (!value || !value.row || key !== identity0161_('master', value.row) || seen.has('prepared:' + key)
        || value.fingerprint !== exportFingerprint0161_(value.row)) throw new Error('Invalid prepared export row.');
      seen.add('prepared:' + key); prepared.push(value);
    } else if (kind === 'baseline') {
      if (!Object.prototype.hasOwnProperty.call(model.baseline, key)) throw new Error('Invalid baseline tab.');
      model.baseline[key].push(value);
    } else {
      if (!['clubs', 'sessions'].includes(kind) || !key || seen.has(kind + ':' + key)) throw new Error('Invalid or duplicate saved record.');
      if (!value || !value.data || (value.updated !== null && !Number.isFinite(value.updated))) throw new Error('Invalid saved record data.');
      seen.add(kind + ':' + key);
      model[kind][key] = value;
    }
  });
  if (!meta || typeof meta.pending !== 'boolean') throw new Error('Missing state metadata.');
  model.pending = meta.pending;
  model.masterImportComplete = meta.masterImportComplete === true;
  model.groupBySport = meta.groupBySport === true;
  model.lastExport = meta.lastExport || null;
  model.csvInvalidated = meta.csvInvalidated || null;
  model.preparedExport = null;
  model.exported = exported;
  model.importedRegistrations = registrations;
  if (meta.preparedExport) {
    if (typeof meta.preparedExport.id !== 'string' || !meta.preparedExport.id || !Number.isFinite(meta.preparedExport.created)
      || meta.preparedExport.count !== prepared.length || !prepared.length) throw new Error('Invalid prepared export metadata.');
    model.preparedExport = Object.assign({}, meta.preparedExport, { rows: prepared });
  } else if (prepared.length) throw new Error('Missing prepared export metadata.');
  model.sequences = meta.sequences || {};
  if (typeof model.sequences !== 'object' || Array.isArray(model.sequences) || model.sequences === null
    || Object.values(model.sequences).some(function (value) { return !Number.isSafeInteger(value) || value < 0; })) throw new Error('Invalid saved ID counters.');
  Object.keys(model.sessions).forEach(function (id) {
    if (!Object.prototype.hasOwnProperty.call(model.clubs, model.sessions[id].clubId)) throw new Error('Saved session has no club.');
  });
  const expectedRows = rows0161_(model);
  if (Object.keys(expectedRows).some(function (key) { return !equal0161_(expectedRows[key], model.baseline[key]); })) throw new Error('Saved records and tab snapshots do not agree.');
  return { model: model, meta: meta };
}
function readStateSlot0161_(sheet, allowLegacy) {
  if (sheet.getLastRow() < 2) throw new Error('Empty saved state.');
  const values = sheet.getRange(1, 1, sheet.getLastRow(), 3).getValues();
  if (!equal0161_(values.shift(), ['Kind', 'Key', 'JSON'])) throw new Error('Invalid state headings.');
  const last = values[values.length - 1];
  let manifest = null;
  if (last && last[0] === 'commit') {
    values.pop();
    manifest = JSON.parse(last[2]);
    if (manifest.version !== 2 || !Number.isSafeInteger(manifest.generation) || manifest.generation < 1
      || last[1] !== 'generation-' + manifest.generation || manifest.rowCount !== values.length
      || manifest.digest !== stateDigest0161_(values)) throw new Error('State verification failed.');
  }
  const decoded = decodeState0161_(values);
  if (manifest) {
    if (decoded.meta.stateVersion !== 2 || decoded.meta.generation !== manifest.generation) throw new Error('State generation mismatch.');
  } else if (!allowLegacy || decoded.meta.stateVersion !== undefined) throw new Error('State save was interrupted before commit.');
  return { sheet: sheet, model: decoded.model, generation: manifest ? manifest.generation : 0 };
}
function stateSlots0161_(ss) {
  const valid = [], invalid = [];
  stateSheetNames0161_().forEach(function (name, index) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    try { valid.push(readStateSlot0161_(sheet, index === 0)); }
    catch (error) { invalid.push(name + ': ' + String(error.message || error)); }
  });
  valid.sort(function (a, b) { return b.generation - a.generation; });
  return { valid: valid, invalid: invalid };
}
function load0161_(ss) {
  const slots = stateSlots0161_(ss);
  if (!slots.valid.length) throw new Error('No valid saved state. ' + (slots.invalid.join(' ') || 'Run setup0161 first.'));
  const model = slots.valid[0].model;
  // An interrupted replacement needs explicit recovery before normal sync can rewrite the tabs.
  if (slots.invalid.length) model.pending = true;
  return model;
}
function save0161_(ss, model, pending) {
  const slots = stateSlots0161_(ss);
  if (!slots.valid.length && slots.invalid.length) throw new Error('No valid state remains. Preserve the working tabs and restore a spreadsheet backup.');
  const current = slots.valid[0];
  const generation = current ? current.generation + 1 : 1;
  const rows = [['meta', 'status', JSON.stringify({ pending: pending, sequences: model.sequences || {}, masterImportComplete: model.masterImportComplete === true, groupBySport: model.groupBySport === true, lastExport: model.lastExport || null, csvInvalidated: model.csvInvalidated || null, preparedExport: model.preparedExport ? { id: model.preparedExport.id, created: model.preparedExport.created, count: model.preparedExport.rows.length } : null, stateVersion: 2, generation: generation })]];
  ['clubs', 'sessions'].forEach(function (key) {
    Object.keys(model[key]).forEach(function (id) { rows.push([key, id, JSON.stringify(model[key][id])]); });
  });
  Object.keys(model.baseline).forEach(function (key) {
    model.baseline[key].forEach(function (row) { rows.push(['baseline', key, JSON.stringify(row)]); });
  });
  Object.keys(model.importedRegistrations || {}).forEach(function (reference) { rows.push(['registration', reference, JSON.stringify(model.importedRegistrations[reference])]); });
  Object.keys(model.exported || {}).forEach(function (id) { rows.push(['exported', id, JSON.stringify(model.exported[id])]); });
  if (model.preparedExport) model.preparedExport.rows.forEach(function (entry) { rows.push(['prepared', identity0161_('master', entry.row), JSON.stringify(entry)]); });
  if (rows.some(function (row) { return row[2].length > 45000; })) throw new Error('A record is too large to save safely. Shorten its long text fields before syncing.');
  decodeState0161_(rows); // Validate before touching either saved snapshot.
  const names = stateSheetNames0161_();
  const targetName = current && current.sheet.getName() === names[0] ? names[1] : names[0];
  const target = systemSheet0161_(ss, targetName);
  ensureSize0161_(target, rows.length + 2, 3);
  target.clearContents();
  target.getRange(1, 1, 1, 3).setValues([['Kind', 'Key', 'JSON']]);
  target.getRange(2, 1, rows.length, 3).setValues(rows);
  SpreadsheetApp.flush();
  // Verify kinds, IDs, JSON, headings and row count before writing the final commit marker.
  const written = target.getRange(1, 1, rows.length + 1, 3).getValues();
  if (target.getLastRow() !== rows.length + 1 || !equal0161_(written, [['Kind', 'Key', 'JSON']].concat(rows))) throw new Error('State verification failed. The previous snapshot is preserved.');
  const manifest = { version: 2, generation: generation, rowCount: rows.length, digest: stateDigest0161_(rows) };
  target.getRange(rows.length + 2, 1, 1, 3).setValues([['commit', 'generation-' + generation, JSON.stringify(manifest)]]);
  SpreadsheetApp.flush();
  const verified = readStateSlot0161_(target, false);
  if (verified.generation !== generation) throw new Error('State commit could not be verified.');
}
function systemSheet0161_(ss, name) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (!sheet.isSheetHidden()) sheet.hideSheet();
  return sheet;
}
function ensureSize0161_(sheet, rows, cols) {
  if (sheet.getMaxRows() < rows) sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
  if (sheet.getMaxColumns() < cols) sheet.insertColumnsAfter(sheet.getMaxColumns(), cols - sheet.getMaxColumns());
}
function syncCore0161_(ss, tabs) {
  const previous = load0161_(ss);
  if (previous.pending) throw new Error('Previous sync was interrupted. Use Restore views from saved records after reviewing the current tabs.');
  const input = readTabs0161_(tabs);
  const next = reconcile0161_(previous, input, false);
  if (!equal0161_(input, readTabs0161_(tabs))) throw new Error('Data changed during sync. Wait for editing to stop, then Sync now.');
  if (!equal0161_(previous.clubs, next.clubs) || !equal0161_(previous.sessions, next.sessions) || !equal0161_(previous.baseline, input) || !equal0161_(previous.sequences || {}, next.sequences)) {
    publish0161_(ss, tabs, next, previous);
  }
}
function publish0161_(ss, tabs, next, previous) {
  // Save intended records before writing views. A pending flag prevents unsafe retries.
  save0161_(ss, next, true);
  audit0161_(ss, previous, next);
  render0161_(tabs, next.baseline, next.groupBySport === true);
  clearInvalidatedCsv0161_(ss, next);
  SpreadsheetApp.flush();
  save0161_(ss, next, false);
}
function render0161_(tabs, rows, grouped = false) {
  const clubSports = new Map(rows.clubs.map(function (row) { return [row['Club ID'], row['Sport or activity']]; }));
  Object.keys(tabs).forEach(function (key) {
    const sheet = tabs[key];
    const fields = schema0161_(key);
    const layout = sportLayout0161_(key, rows[key], grouped, clubSports);
    const values = layout.rows.map(function (row) {
      return fields.map(function (field) {
        const value = row[field];
        if ([SPORT_NAV_MARKER, SPORT_SECTION_MARKER].includes(row['Club ID'])) return value === undefined ? '' : value;
        if (field === STAMP) return value ? new Date(value) : '';
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        // Escape formula-looking text on write; a leading apostrophe is not displayed.
        return typeof value === 'string' && /^[=+@-]/.test(value) ? "'" + value : value === undefined || value === null ? '' : value;
      });
    });
    ensureSize0161_(sheet, Math.max(values.length + 1, 2), fields.length);
    // Old validations may belong to columns that moved during first setup.
    sheet.getDataRange().clearDataValidations();
    sheet.clearContents();
    sheet.getRange(1, 1, 1, fields.length).setValues([fields]);
    // Apply text formats before writing, preserving midnight times and leading zeroes.
    formatTabs0161_({ [key]: sheet });
    if (values.length) {
      const body = sheet.getRange(2, 1, values.length, fields.length);
      body.setValues(values);
      if (grouped) {
        body.setBackground('#ffffff').setFontColor('#202220').setFontWeight('normal');
        layout.sections.forEach(function (section) {
          sheet.getRange(section.row, 1, 1, fields.length).clearDataValidations()
            .setBackground('#202220').setFontColor('#ffffff').setFontWeight('bold');
          sheet.getRange(section.row, 1).setNumberFormat(';;;');
        });
        renderSportLinks0161_(sheet, layout, fields.length);
      }
    }
  });
}
/**
 * Recover swapped name/sport cells using Master headings and stable Club IDs.
 * Other fields still use normal conflict checks; never guess a swap from content.
 */
function repairClubColumns0161() {
  locked0161_(function () {
    const ss = SpreadsheetApp.getActive();
    const tabs = tabs0161_(ss, false);
    const previous = load0161_(ss);
    if (previous.pending) throw new Error('An interrupted sync needs recovery before this repair.');
    const original = readTabs0161_(tabs);
    const input = JSON.parse(JSON.stringify(original));
    const authoritative = {};
    const fields = ['Club name', 'Sport or activity'];
    input.master.forEach(function (row) {
      const id = row['Club ID'];
      if (!id || !previous.clubs[id]) throw new Error('Master has an unsaved or unknown Club ID. Repair only established records.');
      const values = {};
      fields.forEach(function (field) { values[field] = text0161_(row[field]); });
      if (authoritative[id] && !equal0161_(authoritative[id], values)) {
        throw new Error('Master has conflicting name/sport answers for ' + id + '. Make its repeated rows agree first.');
      }
      authoritative[id] = values;
    });
    Object.keys(previous.clubs).forEach(function (id) {
      if (!authoritative[id]) throw new Error('Master is missing ' + id + '. Repair stopped to avoid interpreting missing rows as deletions.');
    });
    const baseline = {};
    previous.baseline.clubs.forEach(function (row) { baseline[row['Club ID']] = row; });
    const seen = new Set();
    input.clubs.forEach(function (row) {
      const id = row['Club ID'];
      if (!baseline[id] || seen.has(id)) throw new Error('Clubs has a new, unknown or duplicate Club ID. Resolve it before repairing.');
      seen.add(id);
      // Exclude only the two reported corrupt cells from incoming Clubs edits.
      fields.forEach(function (field) { row[field] = baseline[id][field]; });
    });
    if (seen.size !== Object.keys(previous.clubs).length) throw new Error('Clubs is missing records. Restore missing rows before this repair.');
    const next = reconcile0161_(previous, input, false);
    Object.keys(authoritative).forEach(function (id) {
      fields.forEach(function (field) {
        if (!equal0161_(next.clubs[id].data[field], authoritative[id][field])) {
          next.clubs[id].data[field] = authoritative[id][field];
          next.clubs[id].updated = Date.now();
        }
      });
    });
    next.baseline = rows0161_(next);
    // Preserve the pre-repair views and stop if someone changes them mid-repair.
    backupTabs0161_(ss, tabs);
    if (!equal0161_(original, readTabs0161_(tabs))) throw new Error('Data changed during repair. Wait for editing to stop and try again.');
    publish0161_(ss, tabs, next, previous);
    ss.toast('Club name and sport restored from Master by Club ID.', '0161 Active', 8);
  });
}

/** Repair boolean display and input controls without changing IDs or timestamps. */
function format0161() {
  locked0161_(function () {
    const ss = SpreadsheetApp.getActive();
    const tabs = tabs0161_(ss, false);
    // Check headings before applying controls; never assume the existing column order.
    readTabs0161_(tabs);
    formatTabs0161_(tabs);
    repairBooleanDisplay0161_(tabs);
    ss.toast('TRUE/FALSE display repaired. Payment, yes/no and day dropdowns applied.', '0161 Active', 6);
  });
}
function booleanDisplay0161_(field, value) {
  if (BOOL_FIELDS.indexOf(field) >= 0 && !blank0161_(value)) {
    const normal = bool0161_(value);
    return typeof normal === 'boolean' ? (normal ? 'TRUE' : 'FALSE') : normal;
  }
  if (FALSE_MARKER_FIELDS.indexOf(field) >= 0 && false0161_(value)) return 'FALSE';
  return value;
}
function repairBooleanDisplay0161_(tabs) {
  Object.keys(tabs).forEach(function (key) {
    const sheet = tabs[key];
    if (sheet.getLastRow() < 2) return;
    const values = sheet.getDataRange().getValues();
    const headers = values.shift();
    const idColumn = headers.findIndex(function (name) { return heading0161_(name) === heading0161_('Club ID'); });
    values.forEach(function (row, index) {
      if ([SPORT_NAV_MARKER, SPORT_SECTION_MARKER].includes(row[idColumn])) {
        sheet.getRange(index + 2, 1, 1, headers.length).clearDataValidations();
        sheet.getRange(index + 2, idColumn + 1).setNumberFormat(';;;');
      }
    });
    headers.forEach(function (header, index) {
      const field = schema0161_(key).find(function (candidate) { return heading0161_(candidate) === heading0161_(header); });
      if (BOOL_FIELDS.indexOf(field) < 0 && FALSE_MARKER_FIELDS.indexOf(field) < 0) return;
      const repaired = values.map(function (row) {
        const marker = row[headers.findIndex(function (name) { return heading0161_(name) === heading0161_('Club ID'); })];
        return [marker === SPORT_NAV_MARKER || marker === SPORT_SECTION_MARKER ? row[index] : booleanDisplay0161_(field, row[index])];
      });
      if (values.some(function (row, rowIndex) { return row[index] !== repaired[rowIndex][0]; })) {
        // Repair only the affected answer column. Do not rewrite IDs, timestamps or other text.
        sheet.getRange(2, index + 1, repaired.length, 1).setValues(repaired);
      }
    });
  });
}
function formatTabs0161_(tabs) {
  Object.keys(tabs).forEach(function (key) {
    const sheet = tabs[key];
    if (!sheet.getLastRow()) return;
    ensureSize0161_(sheet, 2, schema0161_(key).length);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const count = sheet.getMaxRows() - 1;
    const formats = [];
    const rules = headers.map(function (header) {
      const field = schema0161_(key).find(function (candidate) { return heading0161_(candidate) === heading0161_(header); });
      formats.push(field === STAMP ? ACTIVE.dateFormat
        : ['Membership amount (£)', 'Session Price (£)'].indexOf(field) >= 0 ? '0.00'
        : field === 'How many free taster sessions do you offer newcomers?' ? '0' : '@');
      let options = null;
      if (field === 'Payment Type') options = ['Per session', 'Monthly membership', 'Annual membership', 'Free', ACTIVE.unknown];
      else if (BOOL_FIELDS.indexOf(field) >= 0) options = ['TRUE', 'FALSE', ACTIVE.unknown];
      else if (field === 'Training day') options = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', ACTIVE.unknown];
      return options ? SpreadsheetApp.newDataValidation().requireValueInList(options, true)
        .setAllowInvalid(true).setHelpText('Choose an option. Recognised pasted answers are normalised by 0161 sync.').build() : null;
    });
    // Bounded batches cover future input rows without building an unbounded whole-sheet matrix.
    for (let offset = 0; offset < count; offset += 500) {
      const length = Math.min(500, count - offset);
      const range = sheet.getRange(offset + 2, 1, length, headers.length);
      range.setNumberFormats(Array.from({ length: length }, function () { return formats.slice(); }));
      range.setDataValidations(Array.from({ length: length }, function () { return rules.slice(); }));
    }
    sheet.setFrozenRows(1);
  });
}

function audit0161_(ss, before, after) {
  const changes = [];
  ['clubs', 'sessions'].forEach(function (kind) {
    const ids = new Set(Object.keys(before[kind]).concat(Object.keys(after[kind])));
    ids.forEach(function (id) {
      const old = before[kind][id];
      const next = after[kind][id];
      if (equal0161_(old, next)) return;
      changes.push([new Date(), kind, id, (next || old).clubId || id, !old ? 'CREATE' : !next ? 'DELETE' : 'UPDATE', JSON.stringify(old || null), JSON.stringify(next || null)]);
    });
  });
  if (!changes.length) return;
  const sheet = systemSheet0161_(ss, ACTIVE.log);
  if (!sheet.getLastRow()) sheet.appendRow(['Change timestamp', 'Record type', 'Record ID', 'Club ID', 'Operation', 'Before JSON', 'After JSON']);
  ensureSize0161_(sheet, sheet.getLastRow() + changes.length, 7);
  sheet.getRange(sheet.getLastRow() + 1, 1, changes.length, 7).setValues(changes);
}
function backup0161() {
  locked0161_(function () { const ss = SpreadsheetApp.getActive(); backupTabs0161_(ss, tabs0161_(ss, false)); });
}
function backupTabs0161_(ss, tabs) {
  const stamp = Utilities.formatDate(new Date(), ACTIVE.zone, 'yyyyMMdd-HHmmss');
  Object.keys(tabs).forEach(function (key) {
    tabs[key].copyTo(ss).setName('_backup_' + key + '_' + stamp + '_' + Utilities.getUuid().slice(0, 4)).hideSheet();
  });
}
function restore0161() {
  const ui = SpreadsheetApp.getUi();
  if (ui.alert('Restore saved records?', 'This backs up the current tabs, then replaces their contents with the last saved records. Unsynced edits will remain only in the backup.', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  locked0161_(function () {
    const ss = SpreadsheetApp.getActive();
    const tabs = tabs0161_(ss, false);
    const model = load0161_(ss);
    backupTabs0161_(ss, tabs);
    model.baseline = rows0161_(model);
    render0161_(tabs, model.baseline, model.groupBySport === true);
    clearInvalidatedCsv0161_(ss, model);
    SpreadsheetApp.flush();
    save0161_(ss, model, false);
  });
}

// Export identity includes IDs, values and timestamp, so edits after preparation stay pending.
function chronologicalMasterRows0161_(model) {
  return model.baseline.master.slice().sort(function (a, b) {
    return (a[STAMP] || 0) - (b[STAMP] || 0) || identity0161_('master', a).localeCompare(identity0161_('master', b));
  });
}
function exportFingerprint0161_(row) {
  return stateDigest0161_([schema0161_('master').map(function (field) { return row[field] === undefined ? null : row[field]; })]);
}
function changedExportRows0161_(model) {
  const exported = model.exported || {};
  return chronologicalMasterRows0161_(model).filter(function (row) {
    return exported[identity0161_('master', row)] !== exportFingerprint0161_(row);
  });
}
function validateExportRows0161_(rows) {
  rows.forEach(function (row) {
    if (unknown0161_(row['Club ID']) || unknown0161_(row['Club name'])) throw new Error('A Club ID and club name are required before export.');
    // Normalisation already checks supplied answers. Keep unknown prices and other draft answers
    // as Not confirmed rather than excluding a club or inventing missing details.
  });
}
function exportMatrix0161_(rows) {
  return [schema0161_('master')].concat(rows.map(function (row) {
    return schema0161_('master').map(function (field) {
      const value = row[field];
      if (field === STAMP) return value ? Utilities.formatDate(new Date(value), ACTIVE.zone, ACTIVE.dateFormat) : '';
      if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
      const text = String(value === null || value === undefined ? '' : value);
      return /^[=+@-]/.test(text) ? "'" + text : text;
    });
  }));
}
function prepareExportModel0161_(model, all, token, now) {
  // Reopening a prepared batch must show the same snapshot until it is confirmed.
  if (model.preparedExport) return model;
  const rows = all ? chronologicalMasterRows0161_(model) : changedExportRows0161_(model);
  if (!rows.length) return model;
  validateExportRows0161_(rows);
  model.preparedExport = { id: token, created: now, rows: rows.map(function (row) {
    return { row: JSON.parse(JSON.stringify(row)), fingerprint: exportFingerprint0161_(row) };
  }) };
  return model;
}
function confirmExportModel0161_(model, token) {
  if (!model.preparedExport || model.preparedExport.id !== token) throw new Error('This prepared export is no longer current. Prepare the CSV again.');
  model.exported = model.exported || {};
  model.preparedExport.rows.forEach(function (entry) { model.exported[identity0161_('master', entry.row)] = entry.fingerprint; });
  model.lastExport = { id: model.preparedExport.id, preparedAt: model.preparedExport.created, confirmedAt: Date.now(), count: model.preparedExport.rows.length };
  model.preparedExport = null;
  return model;
}
function writeCsvExportSheet0161_(ss, prepared) {
  const matrix = exportMatrix0161_(prepared.rows.map(function (entry) { return entry.row; }));
  let sheet = ss.getSheetByName(CSV_EXPORT_NAME);
  if (!sheet) sheet = ss.insertSheet(CSV_EXPORT_NAME);
  if (sheet.getLastRow() && !equal0161_(sheet.getRange(1, 1, 1, matrix[0].length).getValues()[0], matrix[0])) throw new Error('CSV Export already contains a different table. Rename that tab before preparing.');
  ensureSize0161_(sheet, matrix.length, matrix[0].length);
  sheet.clearContents();
  const range = sheet.getRange(1, 1, matrix.length, matrix[0].length);
  range.setNumberFormat('@'); range.setValues(matrix);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, matrix[0].length).setFontWeight('bold');
  sheet.getRange(1, 1).setNote('AWAITING EXPORT CONFIRMATION\nBatch: ' + prepared.id + '\nRows: ' + prepared.rows.length + '\nSuggested filename: ' + exportFilename0161_(prepared) + '\nDownload this tab, then use Mark prepared CSV as exported. Later edits stay pending.');
  ss.setActiveSheet(sheet);
}
function prepareCsv0161() { prepareCsvView0161_(false); }
function export0161() { prepareCsvView0161_(true); }
function prepareCsvView0161_(all) {
  locked0161_(function () {
    const ss = SpreadsheetApp.getActive();
    syncCore0161_(ss, tabs0161_(ss, false));
    let model = load0161_(ss);
    const reopening = Boolean(model.preparedExport);
    model = prepareExportModel0161_(model, all, Utilities.getUuid(), Date.now());
    if (!model.preparedExport) {
      const existing = ss.getSheetByName(CSV_EXPORT_NAME);
      if (existing && existing.getLastRow() && equal0161_(existing.getRange(1, 1, 1, schema0161_('master').length).getValues()[0], schema0161_('master'))) existing.clearContents();
      ss.toast('No new or changed records since the last confirmed export.', '0161 Active', 8); return;
    }
    if (!reopening) save0161_(ss, model, false);
    writeCsvExportSheet0161_(ss, model.preparedExport);
    ss.toast(model.preparedExport.rows.length + ' rows prepared, oldest edit first. Download this tab as CSV, then use Mark prepared CSV as exported. Preparing alone does not mark records as exported.', '0161 Active', 15);
  });
}
function csvSnapshotMatches0161_(actual, expected) {
  return actual.length === expected.length && actual.every(function (row, index) {
    return row.length === expected[index].length && row.every(function (value, col) {
      const text = typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : String(value === null || value === undefined ? '' : value);
      const wanted = expected[index][col];
      return text === wanted || (/^'[=+@-]/.test(wanted) && text === wanted.slice(1));
    });
  });
}
function markCsvExported0161() {
  locked0161_(function () {
    const ss = SpreadsheetApp.getActive();
    const model = load0161_(ss);
    if (model.pending) throw new Error('Recover the interrupted sync before confirming an export.');
    if (!model.preparedExport) throw new Error('No prepared CSV to confirm.');
    const sheet = ss.getSheetByName(CSV_EXPORT_NAME);
    const expected = exportMatrix0161_(model.preparedExport.rows.map(function (entry) { return entry.row; }));
    if (!sheet || sheet.getLastRow() !== expected.length) throw new Error('CSV Export was edited or replaced. Prepare again to restore its saved snapshot before confirming.');
    const range = sheet.getRange(1, 1, expected.length, expected[0].length);
    if (range.getFormulas().some(function (row) { return row.some(Boolean); }) || !csvSnapshotMatches0161_(range.getValues(), expected)) throw new Error('CSV Export was edited or replaced. Prepare again to restore its saved snapshot before confirming.');
    confirmExportModel0161_(model, model.preparedExport.id);
    save0161_(ss, model, false);
    sheet.getRange(1, 1).setNote('EXPORT CONFIRMED\nBatch: ' + model.lastExport.id + '\nRows: ' + model.lastExport.count + '\nChanges made afterward are pending for the next export.');
    ss.toast('Prepared batch marked as exported. Later edits remain pending for the next CSV.', '0161 Active', 8);
  });
}

function exportFilename0161_(prepared) {
  return '0161-updates-' + Utilities.formatDate(new Date(prepared.created), ACTIVE.zone, 'yyyyMMdd-HHmmss') + '-' + prepared.id.slice(0, 8) + '.csv';
}
function exportStatus0161() {
  let message;
  locked0161_(function () {
    const ss = SpreadsheetApp.getActive();
    syncCore0161_(ss, tabs0161_(ss, false));
    const model = load0161_(ss);
    message = 'New or changed rows since confirmed exports: ' + changedExportRows0161_(model).length;
    message += model.preparedExport ? '\nPrepared batch: ' + model.preparedExport.id + '\nPrepared rows: ' + model.preparedExport.rows.length
      + '\nSuggested filename: ' + exportFilename0161_(model.preparedExport) : '\nNo batch awaiting confirmation.';
    message += model.lastExport ? '\nLast confirmed batch: ' + model.lastExport.id + '\nConfirmed rows: ' + model.lastExport.count : '\nNo export has been confirmed yet.';
  });
  const ui = SpreadsheetApp.getUi();
  ui.alert('CSV export status', message, ui.ButtonSet.OK);
}
function deleteClubModel0161_(previous, id) {
  if (!Object.prototype.hasOwnProperty.call(previous.clubs, id)) throw new Error('Club ID no longer exists: ' + id);
  const next = JSON.parse(JSON.stringify(previous));
  const deletedSessions = new Set(Object.keys(next.sessions).filter(function (sid) { return next.sessions[sid].clubId === id; }));
  delete next.clubs[id];
  deletedSessions.forEach(function (sid) { delete next.sessions[sid]; });
  next.exported = next.exported || {};
  delete next.exported['club:' + id];
  deletedSessions.forEach(function (sid) { delete next.exported['session:' + sid]; });
  // Any previously downloaded snapshot cannot be rewritten. Require a newly prepared file.
  next.preparedExport = null;
  next.csvInvalidated = { reason: 'Deleted club ' + id, at: Date.now() };
  next.baseline = rows0161_(next);
  return next;
}
function clearInvalidatedCsv0161_(ss, model) {
  if (!model.csvInvalidated) return;
  const sheet = ss.getSheetByName(CSV_EXPORT_NAME);
  if (sheet) {
    if (sheet.getLastRow() && !equal0161_(sheet.getRange(1, 1, 1, schema0161_('master').length).getValues()[0], schema0161_('master'))) throw new Error('CSV Export contains a different table. Preserve it before completing recovery.');
    sheet.clearContents();
    sheet.getRange(1, 1, 1, schema0161_('master').length).setValues([schema0161_('master')]);
    sheet.getRange(1, 1).setNote('PREVIOUS CSV INVALIDATED\n' + model.csvInvalidated.reason + '\nPrepare a new batch. Do not use a previously downloaded file containing this club.');
  }
  model.csvInvalidated = null;
}
function deleteSelectedClub0161() {
  const ss = SpreadsheetApp.getActive();
  const tabs = tabs0161_(ss, false);
  const selected = ss.getActiveRange();
  if (ss.getActiveSheet().getSheetId() !== tabs.master.getSheetId() || !selected || selected.getNumRows() !== 1) throw new Error('Select one club data row in Master, then choose Delete selected club.');
  const row = readTabs0161_({ master: tabs.master }).master.find(function (record) { return record._sheetRow === selected.getRow(); });
  if (!row || blank0161_(row['Club ID'])) throw new Error('Select a saved club data row, not a sport heading or navigation link.');
  const id = String(row['Club ID']).trim();
  const ui = SpreadsheetApp.getUi();
  // Do not hold a document lock while waiting for a human confirmation dialog.
  if (ui.alert('Delete this club from all four tabs?', String(row['Club name']) + ' (' + id + ')\nAll its sessions will be removed. Tabs will be backed up first. The prepared CSV will be cleared and must be prepared again.', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  locked0161_(function () {
    syncCore0161_(ss, tabs);
    const previous = load0161_(ss);
    const next = deleteClubModel0161_(previous, id);
    backupTabs0161_(ss, tabs);
    const csv = ss.getSheetByName(CSV_EXPORT_NAME);
    if (csv) csv.copyTo(ss).setName('_backup_csv_' + Utilities.formatDate(new Date(), ACTIVE.zone, 'yyyyMMdd-HHmmss') + '_' + Utilities.getUuid().slice(0, 4)).hideSheet();
    publish0161_(ss, tabs, next, previous);
    ss.toast('Club ' + id + ' and its sessions removed from the four working tabs. Prepare a new CSV batch before downloading.', '0161 Active', 10);
  });
}

function parseRegistration0161_(text) {
  let payload;
  try { payload = JSON.parse(String(text).trim()); } catch { throw new Error('Paste the complete registrationImport block from the email. It must be valid JSON; no rows have been added.'); }
  const fields = schema0161_('master');
  if (!payload || payload.version !== 1 || typeof payload.submissionReference !== 'string'
    || !/^submission-[a-z0-9-]{8,100}$/i.test(payload.submissionReference)
    || !equal0161_(payload.headings, fields) || !Array.isArray(payload.rows) || !payload.rows.length) throw new Error('Registration format or headings do not match this sheet.');
  const rows = payload.rows.map(function (cells) {
    if (!Array.isArray(cells) || cells.length !== fields.length || cells.some(function (cell) { return typeof cell !== 'string' && typeof cell !== 'number' && typeof cell !== 'boolean'; })) throw new Error('Every registration row must contain the agreed 27 values.');
    const row = {};
    fields.forEach(function (field, index) { row[field] = cells[index]; });
    // The public form is untrusted: discard every supplied ID and timestamp, even if modified.
    row['Club ID'] = ''; row['Session ID'] = ''; row[STAMP] = null;
    return row;
  });
  const fingerprint = stateDigest0161_(rows.map(function (row) { return fields.map(function (field) { return row[field]; }); }));
  return { reference: payload.submissionReference, fingerprint: fingerprint, rows: rows };
}
function registrationModel0161_(previous, registration, receivedAt) {
  if (previous.pending) throw new Error('Recover the interrupted sync before importing.');
  if (previous.importedRegistrations?.[registration.reference]) throw new Error('This registration was already imported. No duplicate club or sessions were added.');
  const row = registration.rows[0];
  if (unknown0161_(row['Club name']) || unknown0161_(row['Sport or activity'])) throw new Error('A club name and sport are required.');
  const club = normalizeClub0161_(row);
  registration.rows.forEach(function (candidate) {
    if (!equal0161_(normalizeClub0161_(candidate), club)) throw new Error('Club details differ between the registration rows. Review the submission before importing.');
  });
  if (Object.values(previous.clubs).some(function (record) { return String(record.data['Club name']).trim().toLowerCase() === String(club['Club name']).trim().toLowerCase(); })) throw new Error('A club with this exact name already exists. Review it as an update to the existing club instead of importing a second club.');
  const input = JSON.parse(JSON.stringify(previous.baseline));
  const rows = registration.rows.map(function (candidate) { return Object.assign({}, candidate, { 'Club ID': '', 'Session ID': '', [STAMP]: receivedAt }); });
  input.master = input.master.concat(rows);
  const next = reconcile0161_(previous, input, false);
  const clubIds = Object.keys(next.clubs).filter(function (id) { return !Object.prototype.hasOwnProperty.call(previous.clubs, id); });
  if (clubIds.length !== 1) throw new Error('Registration must create exactly one club.');
  const clubId = clubIds[0];
  const sessionIds = Object.keys(next.sessions).filter(function (id) { return next.sessions[id].clubId === clubId; });
  next.importedRegistrations = next.importedRegistrations || {};
  next.importedRegistrations[registration.reference] = { clubId: clubId, sessionIds: sessionIds, fingerprint: registration.fingerprint, receivedAt: receivedAt };
  return next;
}
function previewRegistration0161(text) {
  let result;
  locked0161_(function () {
    const registration = parseRegistration0161_(text);
    const ss = SpreadsheetApp.getActive();
    const model = load0161_(ss);
    const next = registrationModel0161_(model, registration, Date.now());
    const entry = next.importedRegistrations[registration.reference];
    result = { fingerprint: registration.fingerprint, reference: registration.reference,
      name: next.clubs[entry.clubId].data['Club name'], sport: next.clubs[entry.clubId].data['Sport or activity'], sessions: entry.sessionIds.length };
  });
  return result;
}
function commitRegistration0161(text, fingerprint) {
  let result;
  locked0161_(function () {
    const registration = parseRegistration0161_(text);
    if (registration.fingerprint !== fingerprint) throw new Error('The pasted registration changed. Preview it again.');
    const ss = SpreadsheetApp.getActive(), tabs = tabs0161_(ss, false);
    syncCore0161_(ss, tabs);
    const previous = load0161_(ss);
    const next = registrationModel0161_(previous, registration, Date.now());
    backupTabs0161_(ss, tabs);
    publish0161_(ss, tabs, next, previous);
    result = next.importedRegistrations[registration.reference];
  });
  return result;
}
function importRegistration0161() {
  const html = '<!doctype html><html><head><meta charset="utf-8"><style>body{font:14px Arial;padding:16px}textarea{box-sizing:border-box;width:100%;height:200px}button{margin:12px 8px 0 0;padding:10px}p{white-space:pre-wrap}#error{color:#a71919}</style></head><body>' +
    '<p>Paste the complete registrationImport block from the notification email. Sheets assigns the IDs after you review it.</p><textarea id="input" aria-label="Registration import block"></textarea>' +
    '<button id="preview">Preview registration</button><button id="commit" disabled>Import registration</button><p id="review"></p><p id="error" role="alert"></p><script>' +
    'const input=document.getElementById("input"),preview=document.getElementById("preview"),commit=document.getElementById("commit"),review=document.getElementById("review"),error=document.getElementById("error");let fingerprint=null;' +
    'function fail(e){error.textContent=e.message||String(e);preview.disabled=false;commit.disabled=true;}' +
    'input.oninput=()=>{fingerprint=null;commit.disabled=true;review.textContent="";error.textContent="";};' +
    'preview.onclick=()=>{preview.disabled=true;commit.disabled=true;error.textContent="";google.script.run.withFailureHandler(fail).withSuccessHandler(r=>{fingerprint=r.fingerprint;review.textContent=r.name+"\\n"+r.sport+"\\n"+r.sessions+" sessions\\nOfficial IDs will be assigned by Sheets at import.";preview.disabled=false;commit.disabled=false;}).previewRegistration0161(input.value);};' +
    'commit.onclick=()=>{preview.disabled=true;commit.disabled=true;input.disabled=true;google.script.run.withFailureHandler(e=>{input.disabled=false;fail(e);}).withSuccessHandler(r=>{review.textContent="Imported as "+r.clubId+" with "+r.sessionIds.length+" sessions.";}).commitRegistration0161(input.value,fingerprint);};' +
    '</script></body></html>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(650).setHeight(470), 'Import registration');
}
