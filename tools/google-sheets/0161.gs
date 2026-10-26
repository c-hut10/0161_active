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
const BOOL_FIELDS = [
  'Beginner friendly?', 'Kit requirements for newcomers?', 'Gender-specific?',
  'Booking required?', 'Participate in a league?'
];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('0161 Active')
    .addItem('Set up / install sync', 'setup0161')
    .addItem('Sync and sort now', 'sync0161')
    .addItem('Apply dropdowns and column formats', 'format0161')
    .addItem('Repair club name / sport from Master', 'repairClubColumns0161')
    .addItem('Export Master CSV / copy rows', 'export0161')
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
    if (ss.getSheetByName(ACTIVE.state)) {
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

function activeEdit0161(e) {
  if (!e || !e.range) return;
  handle0161_(e.source, function (tabs) {
    return Object.keys(tabs).some(function (key) { return tabs[key].getSheetId() === e.range.getSheet().getSheetId(); });
  });
}
function activeChange0161(e) {
  // EDIT is already handled by the edit trigger. Row removals need a change trigger.
  if (e && ['REMOVE_ROW', 'REMOVE_COLUMN', 'INSERT_COLUMN', 'OTHER'].indexOf(e.changeType) >= 0) {
    handle0161_(e.source, function () { return true; });
  }
}
function handle0161_(ss, applies) {
  try {
    locked0161_(function () {
      const tabs = tabs0161_(ss, false);
      if (applies(tabs)) syncCore0161_(ss, tabs);
    });
  } catch (error) {
    ss.toast(String(error.message || error), '0161 sync stopped — resolve then Sync now', 20);
    throw error;
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
  lock.waitLock(30000);
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
        record[field] = field === STAMP && blank0161_(value) ? null : value;
      });
      return record;
    }).filter(function (record) {
      return expected.some(function (field) { return field !== STAMP && !blank0161_(record[field]); });
    });
  });
  return result;
}
function blank0161_(value) { return value === '' || value === null || value === undefined; }
function unknown0161_(value) {
  return blank0161_(value) || /^(not confirmed|unknown|tbc|not supplied|not listed|n\/a)$/i.test(String(value).trim());
}
function equal0161_(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function uid0161_(prefix) { return prefix + '-' + Utilities.getUuid(); }
function identity0161_(key, row) {
  if (key === 'clubs') return 'club:' + row['Club ID'];
  if (row['Session ID'] && row['Session ID'] !== false && row['Session ID'] !== 'FALSE') return 'session:' + row['Session ID'];
  return 'club:' + row['Club ID'];
}

function reconcile0161_(previous, input, initial) {
  const next = JSON.parse(JSON.stringify(previous));
  const patches = {};
  const deletedClubs = new Set();
  const deletedSessions = new Set();
  const touched = new Set();
  const now = Date.now();
  const prepared = {};
  function patch(kind, id, field, value, source) {
    const target = kind + ':' + id;
    if (!patches[target]) patches[target] = { kind: kind, id: id, values: {}, sources: {} };
    const item = patches[target];
    if (Object.prototype.hasOwnProperty.call(item.values, field) && !equal0161_(item.values[field], value)) {
      throw new Error('Conflicting edits to ' + id + ' / ' + field + ': ' + item.sources[field] + ' and ' + source + '. Make them agree, then Sync now.');
    }
    item.values[field] = value;
    item.sources[field] = source;
    if (!initial) touched.add(target);
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
      const source = key + ' row ' + (index + 2);
      let clubId = row['Club ID'];
      if (blank0161_(clubId)) {
        if (key === 'sessions') throw new Error(source + ': Club ID is required.');
        const name = String(row['Club name'] || '').trim().toLowerCase();
        if (!name || unknown0161_(name)) throw new Error(source + ': enter a club name before adding a club.');
        if (names[name] && names[name].length > 1) throw new Error(source + ': ambiguous club name; supply its Club ID.');
        clubId = names[name] ? names[name][0] : uid0161_('club');
        names[name] = [clubId];
        row['Club ID'] = clubId;
      }
      clubId = String(clubId).trim();
      row['Club ID'] = clubId;
      let sessionId = row['Session ID'];
      if (sessionId === false || sessionId === 'FALSE') sessionId = '';
      // A generated club-only Master row is a placeholder, not a fake session.
      const placeholder = key === 'master' && base['club:' + clubId];
      const hasSession = SESSION_FIELDS.slice(1).some(function (field) {
        return !unknown0161_(row[field]) && row[field] !== false && row[field] !== 'FALSE';
      });
      const placeholderChanged = placeholder && SESSION_FIELDS.slice(1).some(function (field) {
        return !equal0161_(row[field], placeholder[field]);
      });
      if (!sessionId && (key === 'sessions' || (key === 'master' && (placeholder ? placeholderChanged : hasSession)))) {
        sessionId = uid0161_('session');
      }
      if (sessionId) row['Session ID'] = String(sessionId).trim();
      const identity = identity0161_(key, row);
      if (seen.has(identity)) throw new Error(source + ': duplicate ' + identity + '. Each session needs its own ID.');
      seen.add(identity);
      const old = base[identity];
      if (key !== 'sessions') {
        CLUB_FIELDS.slice(1).forEach(function (field) {
          if (old ? !equal0161_(row[field], old[field]) : !blank0161_(row[field])) patch('club', clubId, field, row[field], source);
        });
        // Create a draft club even if only its ID is supplied.
        if (!next.clubs[clubId] && !patches['club:' + clubId]) patches['club:' + clubId] = { kind: 'club', id: clubId, values: {}, sources: {} };
      }
      if (sessionId) {
        SESSION_FIELDS.slice(1).forEach(function (field) {
          if (old ? !equal0161_(row[field], old[field]) : !blank0161_(row[field])) patch('session', sessionId, field, row[field], source);
        });
        if (!old || old['Club ID'] !== clubId) patch('session', sessionId, 'Club ID', clubId, source);
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
    if (touched.has(target)) record.updated = now;
  });
  deletedClubs.forEach(function (id) { delete next.clubs[id]; });
  Object.keys(next.sessions).forEach(function (id) {
    if (deletedSessions.has(id) || deletedClubs.has(next.sessions[id].clubId)) delete next.sessions[id];
  });
  Object.keys(next.clubs).forEach(function (id) {
    const record = next.clubs[id];
    const before = JSON.stringify(record.data);
    record.data = normalizeClub0161_(record.data);
    if (!initial && before !== JSON.stringify(record.data)) record.updated = now;
  });
  Object.keys(next.sessions).forEach(function (id) {
    const record = next.sessions[id];
    if (!next.clubs[record.clubId]) throw new Error('Session ' + id + ': unknown Club ID ' + record.clubId);
    const before = JSON.stringify(record.data);
    record.data = normalizeSession0161_(record.data, next.clubs[record.clubId].data['Payment Type']);
    if (!initial && before !== JSON.stringify(record.data)) record.updated = now;
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
      return (a[STAMP] || 0) - (b[STAMP] || 0) || identity0161_(key, a).localeCompare(identity0161_(key, b));
    });
  });
  return result;
}
function load0161_(ss) {
  const sheet = ss.getSheetByName(ACTIVE.state);
  if (!sheet || sheet.getLastRow() < 2) throw new Error('Run setup0161 first.');
  const model = { clubs: {}, sessions: {}, baseline: { master: [], clubs: [], sessions: [] } };
  sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues().forEach(function (row) {
    const value = JSON.parse(row[2]);
    if (row[0] === 'meta') model.pending = value.pending;
    else if (row[0] === 'baseline') model.baseline[row[1]].push(value);
    else model[row[0]][row[1]] = value;
  });
  return model;
}
function save0161_(ss, model, pending) {
  const rows = [['meta', 'status', JSON.stringify({ pending: pending })]];
  ['clubs', 'sessions'].forEach(function (key) {
    Object.keys(model[key]).forEach(function (id) { rows.push([key, id, JSON.stringify(model[key][id])]); });
  });
  Object.keys(model.baseline).forEach(function (key) {
    model.baseline[key].forEach(function (row) { rows.push(['baseline', key, JSON.stringify(row)]); });
  });
  // Validate size before touching the previous saved state.
  if (rows.some(function (row) { return row[2].length > 45000; })) {
    throw new Error('A record is too large to save safely. Shorten its long text fields before syncing.');
  }
  const sheet = systemSheet0161_(ss, ACTIVE.state);
  sheet.clearContents();
  ensureSize0161_(sheet, rows.length + 1, 3);
  sheet.getRange(1, 1, 1, 3).setValues([['Kind', 'Key', 'JSON']]);
  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
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
  if (!equal0161_(previous.clubs, next.clubs) || !equal0161_(previous.sessions, next.sessions) || !equal0161_(previous.baseline, input)) {
    publish0161_(ss, tabs, next, previous);
  }
}
function publish0161_(ss, tabs, next, previous) {
  // Save intended records before writing views. A pending flag prevents unsafe retries.
  save0161_(ss, next, true);
  audit0161_(ss, previous, next);
  render0161_(tabs, next.baseline);
  SpreadsheetApp.flush();
  save0161_(ss, next, false);
}
function render0161_(tabs, rows) {
  Object.keys(tabs).forEach(function (key) {
    const sheet = tabs[key];
    const fields = schema0161_(key);
    const values = rows[key].map(function (row) {
      return fields.map(function (field) {
        const value = row[field];
        if (field === STAMP) return value ? new Date(value) : '';
        // Escape formula-looking text on write; a leading apostrophe is not displayed.
        return typeof value === 'string' && /^[=+@-]/.test(value) ? "'" + value : value === undefined || value === null ? '' : value;
      });
    });
    ensureSize0161_(sheet, Math.max(values.length + 1, 2), fields.length);
    // Old validations may belong to columns that moved during first setup.
    sheet.getDataRange().clearDataValidations();
    sheet.clearContents();
    sheet.getRange(1, 1, 1, fields.length).setValues([fields]);
    sheet.setFrozenRows(1);
    if (values.length) {
      // Store times and IDs as text, retaining 00:00 and leading zeroes.
      sheet.getRange(2, 1, values.length, fields.length).setNumberFormat('@');
      sheet.getRange(2, 1, values.length, fields.length).setValues(values);
      fields.forEach(function (field, index) {
        if (field === STAMP) sheet.getRange(2, index + 1, values.length, 1).setNumberFormat(ACTIVE.dateFormat);
        else if (['Membership amount (£)', 'Session Price (£)'].indexOf(field) >= 0) sheet.getRange(2, index + 1, values.length, 1).setNumberFormat('0.00');
        else if (field === 'How many free taster sessions do you offer newcomers?') sheet.getRange(2, index + 1, values.length, 1).setNumberFormat('0');
      });
    }
  });
  formatTabs0161_(tabs);
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

/** Reapply visible input controls without changing answers, IDs or timestamps. */
function format0161() {
  locked0161_(function () {
    const ss = SpreadsheetApp.getActive();
    const tabs = tabs0161_(ss, false);
    // Check headings before applying controls; never assume the existing column order.
    readTabs0161_(tabs);
    formatTabs0161_(tabs);
    ss.toast('Payment, yes/no and day dropdowns applied.', '0161 Active', 6);
  });
}
function formatTabs0161_(tabs) {
  Object.keys(tabs).forEach(function (key) {
    const sheet = tabs[key];
    if (!sheet.getLastRow()) return;
    ensureSize0161_(sheet, 2, schema0161_(key).length);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const count = sheet.getMaxRows() - 1;
    headers.forEach(function (header, index) {
      const field = schema0161_(key).find(function (candidate) { return heading0161_(candidate) === heading0161_(header); });
      if (!field) return;
      const range = sheet.getRange(2, index + 1, count, 1);
      let options = null;
      if (field === 'Payment Type') options = ['Per session', 'Monthly membership', 'Annual membership', 'Free', ACTIVE.unknown];
      else if (BOOL_FIELDS.indexOf(field) >= 0) options = ['TRUE', 'FALSE', ACTIVE.unknown];
      else if (field === 'Training day') options = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', ACTIVE.unknown];
      if (options) {
        // Permit pasted aliases such as Yes/No; syncing normalises or rejects them.
        range.setDataValidation(SpreadsheetApp.newDataValidation()
          .requireValueInList(options, true)
          .setAllowInvalid(true)
          .setHelpText('Choose an option. Recognised pasted answers are normalised by 0161 sync.')
          .build());
      }
      if (field === STAMP) range.setNumberFormat(ACTIVE.dateFormat);
      else if (['Membership amount (£)', 'Session Price (£)'].indexOf(field) >= 0) range.setNumberFormat('0.00');
      else if (field === 'How many free taster sessions do you offer newcomers?') range.setNumberFormat('0');
      else range.setNumberFormat('@');
    });
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
    render0161_(tabs, model.baseline);
    SpreadsheetApp.flush();
    save0161_(ss, model, false);
  });
}

function export0161() {
  let payload;
  locked0161_(function () {
    const ss = SpreadsheetApp.getActive();
    syncCore0161_(ss, tabs0161_(ss, false));
    const rows = load0161_(ss).baseline.master;
    // Drafts stay editable but must not leave as incomplete registration records.
    rows.forEach(function (row) {
      ['Club name', 'Payment Type'].forEach(function (field) { if (unknown0161_(row[field])) throw new Error(row['Club ID'] + ': complete ' + field + ' before export.'); });
      if (/^(Monthly|Annual) membership$/.test(row['Payment Type']) && typeof row['Membership amount (£)'] !== 'number') throw new Error(row['Club ID'] + ': membership amount required.');
      if (row['Session ID'] !== false && row['Payment Type'] === 'Per session' && typeof row['Session Price (£)'] !== 'number') throw new Error(row['Session ID'] + ': Session Price required for Per session.');
      [['Kit requirements for newcomers?', 'Kit Details:'], ['Participate in a league?', 'League name'], ['Gender-specific?', 'Gender eligibility — if applicable']].forEach(function (pair) {
        if (row[pair[0]] === true && unknown0161_(row[pair[1]])) throw new Error(row['Club ID'] + ': complete ' + pair[1] + ' before export.');
      });
    });
    const fields = schema0161_('master');
    const matrix = rows.map(function (row) {
      return fields.map(function (field) {
        const value = row[field];
        if (field === STAMP) return value ? Utilities.formatDate(new Date(value), ACTIVE.zone, ACTIVE.dateFormat) : '';
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        const text = String(value === null || value === undefined ? '' : value);
        return /^[=+@-]/.test(text) ? "'" + text : text;
      });
    });
    const csv = [fields].concat(matrix).map(function (row) {
      return row.map(function (value) { return '"' + String(value).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    payload = { csv: Utilities.base64Encode('\uFEFF' + csv, Utilities.Charset.UTF_8), tsv: matrix.map(function (row) { return row.map(function (value) { return value.replace(/[\t\r\n]+/g, ' '); }).join('\t'); }).join('\n') };
  });
  const data = JSON.stringify(payload).replace(/</g, '\\u003c');
  const html = '<!doctype html><meta charset="utf-8"><style>body{font:14px Arial;padding:16px}textarea{width:100%;height:250px}a{display:block;margin-bottom:16px}</style>' +
    '<p>CSV includes headings. Spreadsheet copy below contains data rows only.</p><a id="download" download="0161-active-master.csv">Download Master CSV</a><textarea id="rows" readonly></textarea>' +
    '<p>Select the text and copy it into your existing spreadsheet. Line breaks inside answers become spaces in this copy only.</p><script>const data=' + data + ';const bytes=Uint8Array.from(atob(data.csv),c=>c.charCodeAt(0));document.getElementById("download").href=URL.createObjectURL(new Blob([bytes],{type:"text/csv;charset=utf-8"}));document.getElementById("rows").value=data.tsv;document.getElementById("rows").onclick=function(){this.select();};</script>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(750).setHeight(450), '0161 Active export');
}
