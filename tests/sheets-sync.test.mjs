import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { registrationTransfer, LEGACY_MASTER_COLUMNS } from '../js/club-submission.mjs';

function script() {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(new URL('../tools/google-sheets/0161.gs', import.meta.url), 'utf8'), context);
  return context;
}

test('Verified is club-wide and starts Master exports while Clubs keeps its original order', () => {
  const gs = script();
  const fields = Array.from(vm.runInContext('schema0161_("master")', gs));
  const clubFields = Array.from(vm.runInContext('schema0161_("clubs")', gs));
  const sessionFields = Array.from(vm.runInContext('schema0161_("sessions")', gs));
  assert.deepEqual(fields.slice(0, 3), ['Verified', 'Club ID', 'Club name']);
  assert.equal(fields.at(-1), 'Update Timestamp');
  assert.equal(fields.indexOf('Payment options') + 1, fields.indexOf('Payment Type'));
  assert.equal(clubFields.indexOf('Payment options') + 1, clubFields.indexOf('Payment Type'));
  assert.deepEqual(clubFields.slice(-2), ['Verified', 'Update Timestamp']);
  assert.equal(sessionFields.includes('Verified'), false);
  for (const answer of ['', undefined, false, 'FALSE', 'Not confirmed'])
    assert.equal(gs.normalizeClub0161_({ Verified: answer }).Verified, false);
  assert.equal(gs.normalizeClub0161_({ Verified: 'TRUE' }).Verified, true);
  const original = model(gs);
  const edits = JSON.parse(JSON.stringify(original.baseline));
  edits.clubs[0].Verified = true;
  const approved = gs.reconcile0161_(original, edits, false);
  assert.ok(approved.baseline.master.every((row) => row.Verified === true));
  const revoke = JSON.parse(JSON.stringify(approved.baseline));
  revoke.clubs[0].Verified = false;
  const unverified = gs.reconcile0161_(approved, revoke, false);
  assert.ok(unverified.baseline.master.every((row) => row.Verified === false));
  assert.deepEqual(Object.keys(unverified.sessions), Object.keys(original.sessions));
});

test('optional payment choices sync club-wide and accept registrations from before the new column', () => {
  const gs = script();
  const store = stateStore(gs);
  const original = model(gs);
  const edited = JSON.parse(JSON.stringify(original.baseline));
  const choice = 'Monthly membership: £25/month\nMember sessions: £3/session';
  edited.clubs[0]['Payment options'] = choice;
  const next = gs.reconcile0161_(original, edited, false);
  assert.ok(next.baseline.master.every((row) => row['Payment options'] === choice));
  gs.save0161_(store.ss, next, false);
  assert.equal(gs.load0161_(store.ss).clubs['RULE-0042'].data['Payment options'], choice);
  const transfer = registrationTransfer(
    { name: 'Options test', sport: 'Korfball', paymentOptions: choice },
    [{ title: 'Training', dayOfWeek: 2, startTime: '19:00' }],
    'submission-options-compatibility'
  );
  const current = JSON.parse(transfer.importBlock);
  assert.equal(gs.parseRegistration0161_(JSON.stringify(current)).rows[0]['Payment options'], choice);
  const index = current.headings.indexOf('Payment options');
  current.headings.splice(index, 1);
  current.rows.forEach((row) => row.splice(index, 1));
  const old = gs.parseRegistration0161_(JSON.stringify(current));
  assert.equal(gs.normalizeClub0161_(old.rows[0])['Payment options'], 'Not confirmed');
  assert.equal(old.rows[0].Verified, true);
});

test('moving Verified to column A preserves export history and accepts older Verified-last registrations', () => {
  const gs = script();
  const store = stateStore(gs);
  const original = model(gs);
  const row = original.baseline.master[0];
  const oldOrder = Array.from(gs.exportFingerprintFields0161_());
  assert.equal(oldOrder.at(-2), 'Verified');
  const oldFingerprint = gs.stateDigest0161_([oldOrder.map((field) => (row[field] === undefined ? null : row[field]))]);
  original.exported = { [gs.identity0161_('master', row)]: oldFingerprint };
  gs.save0161_(store.ss, original, false);
  const loaded = gs.load0161_(store.ss);
  const synced = gs.reconcile0161_(loaded, JSON.parse(JSON.stringify(loaded.baseline)), false);
  assert.equal(gs.changedExportRows0161_(synced).length, 0);
  assert.deepEqual(Object.keys(synced.sessions), Object.keys(original.sessions));
  assert.equal(synced.clubs['RULE-0042'].updated, original.clubs['RULE-0042'].updated);
  const matrix = gs.exportMatrix0161_(synced.baseline.master);
  assert.equal(matrix[0][0], 'Verified');
  assert.equal(matrix[1][1], 'RULE-0042');
  const transfer = registrationTransfer(
    { name: 'Older layout', sport: 'Korfball', paymentOptions: 'Member sessions: £3/session' },
    [{ title: 'Training', dayOfWeek: 2, startTime: '19:00' }],
    'submission-verified-last-layout'
  );
  const payload = JSON.parse(transfer.importBlock);
  const values = Object.fromEntries(payload.headings.map((field, index) => [field, payload.rows[0][index]]));
  payload.headings = oldOrder;
  payload.rows = [oldOrder.map((field) => values[field])];
  const parsed = gs.parseRegistration0161_(JSON.stringify(payload));
  assert.equal(parsed.rows[0]['Club name'], 'Older layout');
  assert.equal(parsed.rows[0]['Payment options'], 'Member sessions: £3/session');
  assert.equal(parsed.rows[0].Verified, true);
  payload.headings[0] = payload.headings[1];
  assert.throws(() => gs.parseRegistration0161_(JSON.stringify(payload)), /headings do not match/);
});

test('Sessions column B derives club names by ID and follows renames without changing session identities', () => {
  const gs = script();
  const original = model(gs);
  const fields = Array.from(vm.runInContext('schema0161_("sessions")', gs));
  assert.deepEqual(fields.slice(0, 3), ['Club ID', 'Club name', 'Session ID']);
  assert.equal(fields.length, 13);
  const current = gs.rows0161_(original);
  assert.equal(current.sessions[0]['Club name'], 'Original');
  const edits = JSON.parse(JSON.stringify(current));
  edits.clubs[0]['Club name'] = 'Renamed Club';
  edits.sessions[0]['Club name'] = ''; // New manually inserted column is populated by sync.
  const next = gs.reconcile0161_(original, edits, false);
  assert.deepEqual(Object.keys(next.sessions), Object.keys(original.sessions));
  assert.equal(next.baseline.sessions[0]['Club name'], 'Renamed Club');
  assert.equal(next.baseline.master[0]['Club name'], 'Renamed Club');
  assert.equal(vm.runInContext('schema0161_("master").length', gs), 29);
  const attemptedRename = JSON.parse(JSON.stringify(next.baseline));
  attemptedRename.sessions[0]['Club name'] = 'Unlinked display edit';
  const restored = gs.reconcile0161_(next, attemptedRename, false);
  assert.equal(restored.clubs['RULE-0042'].data['Club name'], 'Renamed Club');
  assert.equal(restored.baseline.sessions[0]['Club name'], 'Renamed Club');
});

test('beginner eligibility belongs to individual sessions and syncs without changing sibling sessions', () => {
  const gs = script();
  const empty = { clubs: {}, sessions: {}, baseline: { master: [], clubs: [], sessions: [] } };
  const input = {
    clubs: [],
    sessions: [],
    master: [true, false, 'Not confirmed'].map((answer, index) => ({
      'Club name': 'Mixed sessions',
      'Sport or activity': 'Athletics',
      'Session Name': `Session ${index + 1}`,
      'Session beginner friendly?': answer
    }))
  };
  const original = gs.reconcile0161_(empty, input, true);
  const clubId = Object.keys(original.clubs)[0];
  const ids = Object.keys(original.sessions);
  assert.equal(Object.hasOwn(original.clubs[clubId].data, 'Session beginner friendly?'), false);
  assert.equal(Object.hasOwn(original.clubs[clubId].data, 'Beginner friendly?'), false);
  assert.deepEqual(
    ids.map((id) => original.sessions[id].data['Session beginner friendly?']),
    [true, false, 'Not confirmed']
  );
  const edits = JSON.parse(JSON.stringify(original.baseline));
  edits.sessions.find((row) => row['Session ID'] === ids[0])['Session beginner friendly?'] = false;
  const updated = gs.reconcile0161_(original, edits, false);
  assert.deepEqual(Object.keys(updated.sessions), ids);
  assert.equal(updated.sessions[ids[0]].data['Session beginner friendly?'], false);
  assert.equal(updated.sessions[ids[1]].data['Session beginner friendly?'], false);
  assert.equal(updated.sessions[ids[2]].data['Session beginner friendly?'], 'Not confirmed');
  const fields = vm.runInContext('schema0161_("master")', gs);
  const clubs = vm.runInContext('schema0161_("clubs")', gs);
  assert.equal(fields.length, 29);
  assert.equal(clubs.length, 19);
  assert.equal(clubs.includes('Session beginner friendly?'), false);
  const matrix = gs.exportMatrix0161_(original.baseline.master.map((row) => ({ ...row, 'Update Timestamp': null })));
  const column = fields.indexOf('Session beginner friendly?');
  assert.deepEqual(
    Array.from(matrix.slice(1), (row) => row[column]),
    ['TRUE', 'FALSE', 'Not confirmed']
  );
  assert.equal(gs.normalizeSession0161_({}, 'Free')['Session beginner friendly?'], 'Not confirmed');
});

test('old registration emails do not turn club-level answers into beginner session eligibility', () => {
  const gs = script();
  stateStore(gs);
  const transfer = registrationTransfer(
    { name: 'Legacy beginners', sport: 'Athletics', beginnerFriendly: 'yes' },
    [{ title: 'Open training', dayOfWeek: '1', startTime: '19:00' }],
    'submission-beginner-legacy'
  );
  const oldPayload = JSON.parse(transfer.importBlock);
  const newRow = Object.fromEntries(oldPayload.headings.map((heading, index) => [heading, oldPayload.rows[0][index]]));
  oldPayload.headings = LEGACY_MASTER_COLUMNS;
  oldPayload.rows = [
    LEGACY_MASTER_COLUMNS.map((heading) => (heading === 'Beginner friendly?' ? 'TRUE' : newRow[heading]))
  ];
  const legacy = gs.parseRegistration0161_(JSON.stringify(oldPayload));
  assert.equal(legacy.rows[0]['Session beginner friendly?'], 'Not confirmed');
  assert.equal(legacy.rows[0].Verified, true);
  assert.equal(Object.hasOwn(legacy.rows[0], 'Beginner friendly?'), false);
  const previousPayload = JSON.parse(transfer.importBlock);
  const approvalIndex = previousPayload.headings.indexOf('Verified');
  previousPayload.headings.splice(approvalIndex, 1);
  previousPayload.rows.forEach((row) => row.splice(approvalIndex, 1));
  assert.equal(gs.parseRegistration0161_(JSON.stringify(previousPayload)).rows[0].Verified, true);
  const headings = Array.from(vm.runInContext('schema0161_("master")', gs));
  const payload = {
    version: 1,
    submissionReference: 'submission-beginner-session',
    headings,
    rows: [headings.map((field) => (field === 'Session beginner friendly?' ? 'TRUE' : (legacy.rows[0][field] ?? '')))]
  };
  assert.equal(gs.parseRegistration0161_(JSON.stringify(payload)).rows[0]['Session beginner friendly?'], 'TRUE');
});

test('upgrading existing saved records preserves IDs and does not spread old club answers to sessions', () => {
  const gs = script();
  const before = model(gs);
  before.clubs['RULE-0042'].data['Beginner friendly?'] = true;
  for (const session of Object.values(before.sessions)) delete session.data['Session beginner friendly?'];
  before.baseline = gs.rows0161_(before);
  for (const row of before.baseline.master) delete row['Session beginner friendly?'];
  const edited = JSON.parse(JSON.stringify(before.baseline));
  for (const key of ['clubs', 'master']) for (const row of edited[key]) delete row['Beginner friendly?'];
  for (const key of ['sessions', 'master'])
    for (const row of edited[key]) row['Session beginner friendly?'] = 'Not confirmed';
  const after = gs.reconcile0161_(before, edited, false);
  assert.deepEqual(Object.keys(after.clubs), Object.keys(before.clubs));
  assert.deepEqual(Object.keys(after.sessions), Object.keys(before.sessions));
  assert.ok(
    Object.values(after.sessions).every((record) => record.data['Session beginner friendly?'] === 'Not confirmed')
  );
  assert.equal(Object.hasOwn(after.clubs['RULE-0042'].data, 'Beginner friendly?'), false);
});

test('readable club and session IDs reach their limits without wrapping', () => {
  const gs = script();
  assert.equal(gs.nextClubId0161_('Rugby League', new Set(['rule-9998'])), 'RULE-9999');
  assert.equal(gs.nextClubId0161_('Rugby Union', new Set()), 'RUUN-0001');
  assert.throws(() => gs.nextClubId0161_('Rugby League', new Set(['RULE-9999'])), /ID limit/);
  assert.equal(gs.nextSessionId0161_('RULE-0001', new Set(['RULE-0001-S99998'])), 'RULE-0001-S99999');
  assert.throws(() => gs.nextSessionId0161_('RULE-0001', new Set(['RULE-0001-S99999'])), /ID limit/);
  const counters = {};
  assert.equal(gs.nextClubId0161_('Rugby League', new Set(), counters), 'RULE-0001');
  assert.equal(gs.nextClubId0161_('Rugby League', new Set(), counters), 'RULE-0002');
});

test('sync keeps existing IDs and gives each new session a separate row', () => {
  const gs = script();
  const empty = { clubs: {}, sessions: {}, baseline: { master: [], clubs: [], sessions: [] } };
  const input = {
    clubs: [],
    sessions: [],
    master: [1, 2, 3].map((n) => ({
      'Club name': 'Test Club',
      'Sport or activity': 'Rugby League',
      'Session Name': `Session ${n}`
    }))
  };
  const first = gs.reconcile0161_(empty, input, true);
  assert.deepEqual(Object.keys(first.clubs), ['RULE-0001']);
  assert.deepEqual(Object.keys(first.sessions), ['RULE-0001-S00001', 'RULE-0001-S00002', 'RULE-0001-S00003']);
  assert.equal(first.baseline.master.length, 3);
  const unchanged = gs.reconcile0161_(first, first.baseline, false);
  assert.deepEqual(Object.keys(unchanged.sessions), Object.keys(first.sessions));
  const legacy = gs.reconcile0161_(
    empty,
    {
      clubs: [],
      sessions: [],
      master: [
        {
          'Club ID': 'club-old-uuid',
          'Club name': 'Legacy',
          'Session ID': 'session-old-uuid',
          'Session Name': 'Training'
        }
      ]
    },
    true
  );
  assert.ok(legacy.clubs['club-old-uuid']);
  assert.ok(legacy.sessions['session-old-uuid']);
});

test('batch formatting covers blank future rows and applies formats before data writes', () => {
  const gs = script();
  const formats = [];
  const validations = [];
  gs.SpreadsheetApp = {
    newDataValidation: () => ({
      requireValueInList() {
        return this;
      },
      setAllowInvalid() {
        return this;
      },
      setHelpText() {
        return this;
      },
      build() {
        return 'dropdown';
      }
    })
  };
  const headers = ['Club ID', 'Membership amount (£)', 'Update Timestamp', 'Payment Type'];
  const sheet = {
    getLastRow: () => 2,
    getMaxRows: () => 1201,
    getMaxColumns: () => 30,
    getLastColumn: () => headers.length,
    setFrozenRows() {},
    getRange(row, col, length, width) {
      return {
        getValues: () => [headers],
        setNumberFormats(matrix) {
          formats.push({ row, length, width, matrix });
        },
        setDataValidations(matrix) {
          validations.push(matrix);
        }
      };
    }
  };
  gs.formatTabs0161_({ clubs: sheet });
  assert.deepEqual(
    formats.map((batch) => batch.length),
    [500, 500, 200]
  );
  assert.equal(formats.at(-1).row, 1002);
  assert.equal(formats[0].matrix[0].join('|'), '@|0.00|dd/MM/yyyy HH:mm:ss|@');
  assert.equal(validations[0][0][3], 'dropdown');
  const events = [];
  gs.formatTabs0161_ = () => events.push('format');
  const target = {
    ...sheet,
    getDataRange: () => ({ clearDataValidations() {} }),
    clearContents() {},
    getRange() {
      return {
        setValues() {
          events.push('write');
        }
      };
    }
  };
  gs.render0161_({ clubs: target }, { clubs: [{ 'Club ID': 'RULE-0001' }] });
  assert.ok(events.lastIndexOf('write') > events.indexOf('format'));
  assert.throws(
    () =>
      gs.readTabs0161_({
        clubs: {
          getLastRow: () => 2,
          getName: () => 'Clubs',
          getDataRange: () => ({ getFormulas: () => [['=UPPER("a")']] })
        }
      }),
    /values only, not formulas/
  );
});

// Spreadsheet doubles exercise interrupted saves without accessing a Google account.
function stateStore(gs) {
  const sheets = new Map();
  let fault = null;
  let flushes = 0;
  function makeSheet(name) {
    return {
      name,
      cells: [],
      getName() {
        return this.name;
      },
      getLastRow() {
        return this.cells.reduce((last, row, i) => (row?.some((value) => value !== '') ? i + 1 : last), 0);
      },
      getMaxRows: () => 10000,
      getMaxColumns: () => 26,
      isSheetHidden: () => true,
      clearContents() {
        this.cells = [];
        if (fault === 'clear') {
          fault = null;
          throw new Error('Injected clear failure');
        }
      },
      getRange(row, col, count, width) {
        const target = this;
        return {
          setValues(values) {
            const isCommit = values[0][0] === 'commit';
            for (let r = 0; r < count; r++) {
              target.cells[row - 1 + r] = [...values[r]];
              if (
                (fault === 'header' && row === 1) ||
                (fault === 'body' && row === 2) ||
                (fault === 'commit' && isCommit)
              ) {
                fault = null;
                throw new Error('Injected write failure');
              }
            }
            if (fault === 'wrong-key' && row === 2) {
              target.cells[1][1] = 'wrong-key';
              fault = null;
            }
          },
          getValues() {
            return Array.from({ length: count }, (_, r) =>
              Array.from({ length: width }, (_, c) => target.cells[row - 1 + r]?.[col - 1 + c] ?? '')
            );
          }
        };
      }
    };
  }
  const ss = {
    getSheetByName: (name) => sheets.get(name),
    insertSheet(name) {
      const sheet = makeSheet(name);
      sheets.set(name, sheet);
      return sheet;
    }
  };
  gs.Utilities = {
    DigestAlgorithm: { SHA_256: 'sha256' },
    Charset: { UTF_8: 'utf8' },
    computeDigest: (algorithm, text) => Array.from(createHash(algorithm).update(text).digest())
  };
  gs.SpreadsheetApp = {
    flush() {
      flushes++;
      if (fault === 'flush-body' || (fault === 'flush-commit' && flushes === 2)) {
        fault = null;
        throw new Error('Injected flush failure');
      }
    }
  };
  return {
    ss,
    sheets,
    fail(kind) {
      fault = kind;
      flushes = 0;
    }
  };
}
function model(gs, name = 'Original') {
  return gs.reconcile0161_(
    { clubs: {}, sessions: {}, baseline: { master: [], clubs: [], sessions: [] } },
    {
      clubs: [],
      sessions: [],
      master: [
        {
          'Club ID': 'RULE-0042',
          'Club name': name,
          'Sport or activity': 'Rugby League',
          'Session ID': 'RULE-0042-S00300',
          'Session Name': 'Training'
        }
      ]
    },
    true
  );
}

test('imported club and session numbers stay reserved after deletion and state reload', () => {
  const gs = script();
  const store = stateStore(gs);
  const original = model(gs);
  gs.save0161_(store.ss, original, false);
  const saved = gs.load0161_(store.ss);
  assert.equal(saved.sequences['RULE-'], 42);
  assert.equal(saved.sequences['RULE-0042-S'], 300);
  const deleted = gs.reconcile0161_(saved, { ...saved.baseline, clubs: [] }, false);
  gs.save0161_(store.ss, deleted, false);
  const reloaded = gs.load0161_(store.ss);
  assert.equal(gs.nextClubId0161_('Rugby League', new Set(), reloaded.sequences), 'RULE-0043');
  assert.equal(gs.nextSessionId0161_('RULE-0042', new Set(), reloaded.sequences), 'RULE-0042-S00301');
});

test('older committed snapshots load and upgrade without resetting IDs, history or saved rows', () => {
  const gs = script();
  const store = stateStore(gs);
  const old = model(gs);
  for (const club of Object.values(old.clubs)) {
    club.data['Beginner friendly?'] = true;
    delete club.data.Verified;
    delete club.data['Payment options'];
  }
  for (const session of Object.values(old.sessions)) delete session.data['Session beginner friendly?'];
  old.clubs['RULE-0043'] = JSON.parse(JSON.stringify(old.clubs['RULE-0042']));
  old.clubs['RULE-0043'].data['Club name'] = 'No sessions yet';
  old.sequences['RULE-'] = 43;
  old.exported = { 'session:RULE-0042-S00300': 'a'.repeat(64) };
  const render = gs.rows0161_;
  gs.rows0161_ = (value) => {
    const rows = render(value);
    for (const row of rows.sessions) delete row['Club name'];
    for (const row of rows.master) delete row['Session beginner friendly?'];
    return rows;
  };
  old.baseline = gs.rows0161_(old);
  gs.save0161_(store.ss, old, false);
  gs.save0161_(store.ss, old, false); // Both saved generations use the previous layout.
  gs.rows0161_ = render;
  const bytes = JSON.stringify([...store.sheets.values()].map((sheet) => sheet.cells));
  const loaded = gs.load0161_(store.ss);
  assert.equal(JSON.stringify([...store.sheets.values()].map((sheet) => sheet.cells)), bytes);
  const input = JSON.parse(JSON.stringify(loaded.baseline));
  for (const key of ['master', 'clubs'])
    for (const row of input[key]) {
      delete row['Beginner friendly?'];
      row.Verified = 'FALSE';
    }
  for (const key of ['master', 'sessions'])
    for (const row of input[key]) row['Session beginner friendly?'] = 'Not confirmed';
  for (const row of input.sessions) row['Club name'] = '';
  const upgraded = gs.reconcile0161_(loaded, input, false);
  gs.save0161_(store.ss, upgraded, false);
  const saved = gs.load0161_(store.ss);
  assert.deepEqual(Object.keys(saved.clubs), Object.keys(old.clubs));
  assert.deepEqual(Object.keys(saved.sessions), Object.keys(old.sessions));
  assert.deepEqual(saved.sequences, old.sequences);
  assert.deepEqual(JSON.parse(JSON.stringify(saved.exported)), old.exported);
  assert.equal(saved.baseline.sessions[0]['Club name'], 'Original');
  assert.equal(saved.sessions['RULE-0042-S00300'].data['Session beginner friendly?'], 'Not confirmed');
});

test('saved snapshot comparison ignores field order but still rejects mismatched records', () => {
  const gs = script();
  const expected = gs.rows0161_(model(gs));
  const reordered = Object.fromEntries(Object.entries(expected.sessions[0]).reverse());
  assert.equal(gs.stateBaselineMatches0161_('sessions', expected.sessions, [reordered]), true);
  for (const field of ['Club name', 'Session ID', 'Session Name', 'Update Timestamp']) {
    const changed = { ...expected.sessions[0], [field]: 'Wrong value' };
    assert.equal(gs.stateBaselineMatches0161_('sessions', expected.sessions, [changed]), false);
  }
  const missing = { ...expected.sessions[0] };
  delete missing['Session Name'];
  assert.equal(gs.stateBaselineMatches0161_('sessions', expected.sessions, [missing]), false);
  assert.equal(gs.stateBaselineMatches0161_('sessions', expected.sessions, []), false);
});

test('prepared exports from the 28-column layout remain readable after adding optional payment choices', () => {
  const gs = script();
  const store = stateStore(gs);
  const previous = model(gs);
  for (const club of Object.values(previous.clubs)) delete club.data['Payment options'];
  previous.baseline = gs.rows0161_(previous);
  const row = JSON.parse(JSON.stringify(previous.baseline.master[0]));
  const fields = Array.from(gs.exportFingerprintFields0161_()).filter((field) => field !== 'Payment options');
  const fingerprint = gs.stateDigest0161_([fields.map((field) => (row[field] === undefined ? null : row[field]))]);
  previous.preparedExport = { id: 'before-payment-options', created: 100, rows: [{ row, fingerprint }] };
  gs.save0161_(store.ss, previous, false);
  const loaded = gs.load0161_(store.ss);
  assert.equal(loaded.preparedExport.rows[0].fingerprint, fingerprint);
  const tampered = { row: { ...row, 'Club name': 'Changed' }, fingerprint };
  assert.equal(gs.preparedFingerprintMatches0161_(tampered), false);
});

for (const fault of ['clear', 'header', 'body', 'wrong-key', 'commit', 'flush-body', 'flush-commit']) {
  test(`state save preserves a verified snapshot after ${fault} failure`, () => {
    const gs = script();
    const store = stateStore(gs);
    gs.save0161_(store.ss, model(gs), false);
    const originalBytes = JSON.stringify(store.sheets.get('_0161_State').cells);
    store.fail(fault);
    assert.throws(() => gs.save0161_(store.ss, model(gs, 'Updated'), true), /Injected|verification/);
    assert.equal(JSON.stringify(store.sheets.get('_0161_State').cells), originalBytes);
    const recovered = gs.load0161_(store.ss);
    assert.equal(recovered.pending, true);
    const expected = ['commit', 'flush-commit'].includes(fault) ? 'Updated' : 'Original';
    assert.equal(recovered.clubs['RULE-0042'].data['Club name'], expected);
    // Explicit recovery republishes verified records into the other slot.
    gs.save0161_(store.ss, recovered, false);
    const complete = gs.load0161_(store.ss);
    assert.equal(complete.pending, false);
    assert.equal(complete.clubs['RULE-0042'].data['Club name'], expected);
  });
}

test('legacy state migrates without clearing its original snapshot', () => {
  const gs = script();
  const store = stateStore(gs);
  const original = model(gs);
  const rows = [
    ['Kind', 'Key', 'JSON'],
    ['meta', 'status', JSON.stringify({ pending: false })]
  ];
  for (const kind of ['clubs', 'sessions'])
    for (const [id, value] of Object.entries(original[kind])) rows.push([kind, id, JSON.stringify(value)]);
  for (const [tab, values] of Object.entries(original.baseline))
    for (const row of values) rows.push(['baseline', tab, JSON.stringify(row)]);
  const legacy = store.ss.insertSheet('_0161_State');
  legacy.cells = rows;
  const bytes = JSON.stringify(legacy.cells);
  const saved = gs.load0161_(store.ss);
  const seeded = gs.reconcile0161_(saved, saved.baseline, false);
  gs.save0161_(store.ss, seeded, false);
  assert.equal(JSON.stringify(legacy.cells), bytes);
  assert.equal(gs.load0161_(store.ss).sequences['RULE-'], 42);
});

test('truncated or altered snapshots cannot silently become active', () => {
  const gs = script();
  const store = stateStore(gs);
  gs.save0161_(store.ss, model(gs), false);
  gs.save0161_(store.ss, model(gs, 'Updated'), false);
  const active = store.sheets.get('_0161_State_Standby');
  active.cells[2][1] = 'altered-id';
  assert.equal(gs.load0161_(store.ss).clubs['RULE-0042'].data['Club name'], 'Original');
  assert.equal(gs.load0161_(store.ss).pending, true);
  store.sheets.get('_0161_State').cells.pop();
  assert.throws(() => gs.load0161_(store.ss), /No valid saved state/);
});

test('FALSE session markers never collide or create fake sessions on Master', () => {
  const gs = script();
  const markers = [false, 'false', 'FALSE', ' False ', '', '   '];
  const input = {
    clubs: [],
    sessions: [],
    master: markers.map((marker, index) => ({
      'Club ID': `RULE-${String(index + 1).padStart(4, '0')}`,
      'Club name': `Club ${index + 1}`,
      'Sport or activity': 'Rugby League',
      'Session ID': marker,
      'Session Price (£)': 'false',
      'Training day': 'Not confirmed'
    }))
  };
  const original = gs.reconcile0161_(
    { clubs: {}, sessions: {}, baseline: { master: [], clubs: [], sessions: [] } },
    input,
    true
  );
  assert.equal(Object.keys(original.sessions).length, 0);
  assert.equal(original.baseline.master.length, markers.length);
  assert.ok(original.baseline.master.every((row) => row['Session ID'] === false));
  const nextInput = JSON.parse(JSON.stringify(original.baseline));
  nextInput.master[0]['Session ID'] = 'false';
  nextInput.master[1]['Session ID'] = 'FALSE';
  const unchanged = gs.reconcile0161_(original, nextInput, false);
  assert.equal(Object.keys(unchanged.sessions).length, 0);
  const sessions = gs.reconcile0161_(
    { clubs: {}, sessions: {}, baseline: { master: [], clubs: [], sessions: [] } },
    {
      clubs: [],
      sessions: [],
      master: markers.map((marker, index) => ({
        'Club name': 'Same Club',
        'Sport or activity': 'Rugby League',
        'Session ID': marker,
        'Session Name': `Session ${index + 1}`,
        'Training day': 'Monday'
      }))
    },
    true
  );
  assert.equal(Object.keys(sessions.sessions).length, markers.length);
  assert.ok(Object.keys(sessions.sessions).every((id) => id !== 'false' && id !== 'FALSE'));
});

test('one-time Master import resolves matching conflicts and keeps unrelated records', () => {
  const gs = script();
  const original = model(gs);
  const input = JSON.parse(JSON.stringify(original.baseline));
  input.clubs[0]['Booking required?'] = false;
  input.master[0]['Booking required?'] = true;
  input.sessions[0]['Session Name'] = 'Old name';
  input.master[0]['Session Name'] = 'Master name';
  input.clubs.push({ 'Club ID': 'DODG-0002', 'Club name': 'Other Club', 'Sport or activity': 'Dodgeball' });
  input.sessions.push({ 'Club ID': 'DODG-0002', 'Session ID': 'DODG-0002-S00001', 'Session Name': 'Other session' });
  assert.throws(() => gs.reconcile0161_(original, input, false), /Conflicting edits/);
  const imported = gs.masterImportModel0161_(original, input);
  assert.equal(imported.clubs['RULE-0042'].data['Booking required?'], true);
  assert.equal(imported.sessions['RULE-0042-S00300'].data['Session Name'], 'Master name');
  assert.ok(imported.clubs['DODG-0002']);
  assert.equal(imported.sessions['DODG-0002-S00001'].data['Session Name'], 'Other session');
  const conflicting = JSON.parse(JSON.stringify(imported.baseline));
  conflicting.master.find((row) => row['Club ID'] === 'RULE-0042')['Booking required?'] = false;
  conflicting.clubs.find((row) => row['Club ID'] === 'RULE-0042')['Booking required?'] = 'Not confirmed';
  assert.throws(() => gs.reconcile0161_(imported, conflicting, false), /Conflicting edits/);
  const store = stateStore(gs);
  gs.save0161_(store.ss, imported, false);
  const reloaded = gs.load0161_(store.ss);
  assert.equal(reloaded.masterImportComplete, true);
  assert.throws(() => gs.masterImportModel0161_(reloaded, input), /already completed/);
});

test('ID-less Master import reuses exact club names and unique matching sessions', () => {
  const gs = script();
  const original = model(gs);
  const input = JSON.parse(JSON.stringify(original.baseline));
  input.master[0]['Club ID'] = '';
  input.master[0]['Session ID'] = 'false';
  input.master.push({ ...input.master[0], 'Session Name': 'Second session' });
  const imported = gs.masterImportModel0161_(original, input);
  assert.deepEqual(Object.keys(imported.clubs), ['RULE-0042']);
  assert.equal(Object.keys(imported.sessions).length, 2);
  assert.ok(imported.sessions['RULE-0042-S00300']);
  assert.ok(imported.sessions['RULE-0042-S00301']);
  const empty = { clubs: {}, sessions: {}, baseline: { master: [], clubs: [], sessions: [] } };
  const draft = gs.masterImportModel0161_(empty, {
    master: [
      { 'Club name': 'Draft club', 'Sport or activity': 'BJJ', 'Session ID': 'FALSE', 'Session Price (£)': 'false' }
    ],
    clubs: [],
    sessions: []
  });
  assert.equal(Object.keys(draft.sessions).length, 0);
  assert.equal(Object.keys(draft.clubs).length, 1);
});

test('Master import rejects ambiguity and internal conflicts before publishing', () => {
  const gs = script();
  const original = model(gs);
  const input = JSON.parse(JSON.stringify(original.baseline));
  input.master.push({ ...input.master[0], 'Booking required?': true });
  assert.throws(() => gs.masterImportModel0161_(original, input), /Master has conflicting/);
  const ambiguous = JSON.parse(JSON.stringify(original.baseline));
  ambiguous.master[0]['Club ID'] = '';
  ambiguous.clubs.push({ ...ambiguous.clubs[0], 'Club ID': 'RULE-0050' });
  assert.throws(() => gs.masterImportModel0161_(original, ambiguous), /ambiguous club name/);
  assert.throws(() => gs.masterImportModel0161_(original, { clubs: [], sessions: [], master: [] }), /Master is empty/);
});

test('busy lock fails quickly with a clear retry message and never starts another sync', () => {
  const gs = script();
  let workStarted = false;
  let timeout;
  gs.LockService = {
    getDocumentLock: () => ({
      tryLock(ms) {
        timeout = ms;
        return false;
      }
    })
  };
  assert.throws(
    () =>
      gs.locked0161_(() => {
        workStarted = true;
      }),
    /already running/
  );
  assert.equal(timeout, 1000);
  assert.equal(workStarted, false);
});

test('fresh start ignores old IDs and counters, keeping one row per actual Master session', () => {
  const gs = script();
  const source = [
    {
      'Club ID': 'RULE-9999',
      'Club name': 'Club One',
      'Sport or activity': 'Rugby League',
      'Session ID': 'RULE-9999-S99999',
      'Session Name': 'Monday training',
      'Training day': 'Monday'
    },
    {
      'Club ID': 'RULE-9999',
      'Club name': 'Club One',
      'Sport or activity': 'Rugby League',
      'Session ID': 'RULE-9999-S99998',
      'Session Name': 'Tuesday training',
      'Training day': 'Tuesday'
    },
    {
      'Club ID': 'RULE-9998',
      'Club name': 'Club Two',
      'Sport or activity': 'Rugby League',
      'Session ID': 'false',
      'Session Price (£)': 'FALSE'
    }
  ];
  const original = JSON.stringify(source);
  const fresh = gs.freshStartModel0161_(source);
  assert.equal(JSON.stringify(source), original);
  assert.deepEqual(Object.keys(fresh.clubs), ['RULE-0001', 'RULE-0002']);
  assert.deepEqual(Object.keys(fresh.sessions), ['RULE-0001-S00001', 'RULE-0001-S00002']);
  assert.equal(fresh.baseline.master.length, 3);
  assert.equal(fresh.sequences['RULE-'], 2);
  assert.equal(fresh.sequences['RULE-0001-S'], 2);
  assert.throws(() => gs.freshStartModel0161_([]), /Master is empty/);
  const store = stateStore(gs);
  const old = model(gs, 'Old record to discard');
  gs.save0161_(store.ss, old, false);
  gs.save0161_(store.ss, fresh, true);
  gs.save0161_(store.ss, fresh, false);
  const loaded = gs.load0161_(store.ss);
  assert.equal(loaded.sequences['RULE-'], 2);
  assert.equal(loaded.pending, false);
  assert.equal(loaded.masterImportComplete, true);
  assert.equal(loaded.clubs['RULE-0042'], undefined);
  assert.equal(loaded.clubs['RULE-0001'].data['Club name'], 'Club One');
});

test('boolean display repair uses uppercase dropdown values without touching IDs or timestamps', () => {
  const gs = script();
  assert.equal(gs.booleanDisplay0161_('Booking required?', 'true'), 'TRUE');
  assert.equal(gs.booleanDisplay0161_('Booking required?', false), 'FALSE');
  assert.equal(gs.booleanDisplay0161_('Booking required?', 'Not confirmed'), 'Not confirmed');
  assert.equal(gs.booleanDisplay0161_('Session Price (£)', 'false'), 'FALSE');
  assert.equal(gs.booleanDisplay0161_('Club name', 'true'), 'true');
  const writes = [];
  const sheet = {
    getLastRow: () => 2,
    getDataRange: () => ({
      getValues: () => [
        ['Club ID', 'Club name', 'Booking required?', 'Update Timestamp'],
        ['RULE-0001', 'Keep this name', 'true', 'original timestamp']
      ]
    }),
    getRange(row, col, length, width) {
      return {
        setValues(values) {
          writes.push({ row, col, length, width, values });
        }
      };
    }
  };
  gs.repairBooleanDisplay0161_({ clubs: sheet });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].col, 3);
  assert.equal(writes[0].values[0][0], 'TRUE');
  const fields = vm.runInContext('schema0161_("clubs")', gs);
  const values = fields.map((field) =>
    field === 'Club ID' ? 'RULE-0001' : field === 'Booking required?' ? 'TRUE' : ''
  );
  const canonical = gs.readTabs0161_({
    clubs: {
      getLastRow: () => 2,
      getName: () => 'Clubs',
      getDataRange: () => ({
        getFormulas: () => [fields.map(() => ''), fields.map(() => '')],
        getValues: () => [fields, values]
      })
    }
  });
  assert.equal(canonical.clubs[0]['Booking required?'], true);
  let written;
  gs.formatTabs0161_ = () => {};
  gs.render0161_(
    {
      clubs: {
        getMaxRows: () => 1000,
        getMaxColumns: () => 30,
        getDataRange: () => ({ clearDataValidations() {} }),
        clearContents() {},
        getRange(row) {
          return {
            setValues(data) {
              if (row === 2) written = data;
            }
          };
        }
      }
    },
    { clubs: [{ 'Club ID': 'RULE-0001', 'Booking required?': true, 'Gender-specific?': false }] }
  );
  assert.equal(written[0][fields.indexOf('Booking required?')], 'TRUE');
  assert.equal(written[0][fields.indexOf('Gender-specific?')], 'FALSE');
});

function exportReady(gs) {
  const empty = { clubs: {}, sessions: {}, baseline: { master: [], clubs: [], sessions: [] } };
  const data = gs.reconcile0161_(
    empty,
    {
      clubs: [],
      sessions: [],
      master: [
        {
          'Club ID': 'ARCH-0001',
          'Club name': 'First',
          'Sport or activity': 'Archery',
          'Payment Type': 'Free',
          'Session ID': 'ARCH-0001-S00001',
          'Session Name': 'Archery',
          'Training day': 'Monday'
        },
        {
          'Club ID': 'RUNX-0001',
          'Club name': 'Second',
          'Sport or activity': 'Run Club',
          'Payment Type': 'Free',
          'Session ID': 'RUNX-0001-S00001',
          'Session Name': 'Run',
          'Training day': 'Tuesday'
        }
      ]
    },
    true
  );
  data.clubs['ARCH-0001'].updated = 3000;
  data.sessions['ARCH-0001-S00001'].updated = 3000;
  data.clubs['RUNX-0001'].updated = 1000;
  data.sessions['RUNX-0001-S00001'].updated = 1000;
  data.groupBySport = true;
  data.baseline = gs.rows0161_(data);
  return data;
}

test('all three tabs group by sport while exports use chronological order', () => {
  const gs = script();
  const data = exportReady(gs);
  const sports = new Map(data.baseline.clubs.map((row) => [row['Club ID'], row['Sport or activity']]));
  for (const key of ['master', 'clubs', 'sessions']) {
    const layout = gs.sportLayout0161_(key, data.baseline[key], true, sports);
    assert.deepEqual(
      Array.from(layout.sections, (section) => section.sport),
      ['Archery', 'Run Club']
    );
    assert.ok(layout.navigation.length);
    assert.equal(layout.rows.length, data.baseline[key].length + 2 + layout.navigation.length);
    for (const section of layout.sections) assert.equal(layout.rows[section.row - 2]['Club ID'], '#0161_SPORT_SECTION');
  }
  assert.equal(data.baseline.master[0]['Club ID'], 'ARCH-0001');
  assert.equal(gs.chronologicalMasterRows0161_(data)[0]['Club ID'], 'RUNX-0001');
  assert.ok(gs.chronologicalMasterRows0161_(data).every((row) => !row['Club ID'].startsWith('#')));
  const store = stateStore(gs);
  gs.save0161_(store.ss, data, false);
  assert.equal(gs.load0161_(store.ss).groupBySport, true);
});

test('generated section headings and links are not interpreted as club or session records', () => {
  const gs = script();
  const data = exportReady(gs);
  const sports = new Map(data.baseline.clubs.map((row) => [row['Club ID'], row['Sport or activity']]));
  const tabs = {};
  for (const key of ['master', 'clubs', 'sessions']) {
    const fields = vm.runInContext(`schema0161_('${key}')`, gs);
    const layout = gs.sportLayout0161_(key, data.baseline[key], true, sports);
    const table = [fields, ...layout.rows.map((row) => fields.map((field) => row[field] ?? ''))];
    tabs[key] = {
      getLastRow: () => table.length,
      getName: () => key,
      getDataRange: () => ({
        getFormulas: () => table.map((row) => row.map(() => '')),
        getValues: () => table.map((row) => [...row])
      })
    };
  }
  const read = gs.readTabs0161_(tabs);
  assert.equal(read.master.length, 2);
  assert.equal(read.clubs.length, 2);
  assert.equal(read.sessions.length, 2);
  assert.equal(read.master[0]._sheetRow, 4);
  assert.equal(Object.keys(read.master[0]).includes('_sheetRow'), false);
});

test('prepare and reopen preserve updates; acknowledgement confirms only the prepared versions', () => {
  const gs = script();
  const store = stateStore(gs);
  const data = exportReady(gs);
  gs.prepareExportModel0161_(data, false, 'batch-1', 5000);
  assert.equal(data.preparedExport.rows.length, 2);
  assert.equal(data.preparedExport.rows[0].row['Club ID'], 'RUNX-0001');
  assert.equal(gs.changedExportRows0161_(data).length, 2);
  gs.save0161_(store.ss, data, false);
  const loaded = gs.load0161_(store.ss);
  gs.prepareExportModel0161_(loaded, false, 'batch-reopen', 6000);
  assert.equal(loaded.preparedExport.id, 'batch-1');
  loaded.clubs['ARCH-0001'].data['About the club'] = 'Changed after preparation';
  loaded.clubs['ARCH-0001'].updated = 8000;
  loaded.baseline = gs.rows0161_(loaded);
  assert.throws(() => gs.confirmExportModel0161_(loaded, 'wrong-batch'), /no longer current/);
  gs.confirmExportModel0161_(loaded, 'batch-1');
  const pending = gs.changedExportRows0161_(loaded);
  assert.equal(pending.length, 1);
  assert.equal(pending[0]['Club ID'], 'ARCH-0001');
  gs.save0161_(store.ss, loaded, false);
  const again = gs.load0161_(store.ss);
  assert.equal(gs.changedExportRows0161_(again).length, 1);
  gs.prepareExportModel0161_(again, false, 'batch-2', 9000);
  assert.equal(again.preparedExport.rows.length, 1);
  gs.confirmExportModel0161_(again, 'batch-2');
  assert.equal(gs.changedExportRows0161_(again).length, 0);
  gs.prepareExportModel0161_(again, false, 'empty-batch', 10000);
  assert.equal(again.preparedExport, null);
});

test('new sessions and club-wide edits select the correct export rows without mutating the preview', () => {
  const gs = script();
  stateStore(gs);
  const data = exportReady(gs);
  data.sessions['ARCH-0001-S00002'] = {
    clubId: 'ARCH-0001',
    data: { ...data.sessions['ARCH-0001-S00001'].data, 'Session Name': 'Other day' },
    updated: 3000
  };
  data.baseline = gs.rows0161_(data);
  gs.prepareExportModel0161_(data, false, 'first', 5000);
  gs.confirmExportModel0161_(data, 'first');
  data.clubs['ARCH-0001'].data['Contact email'] = 'new@example.org';
  data.clubs['ARCH-0001'].updated = 6000;
  data.baseline = gs.rows0161_(data);
  assert.equal(gs.changedExportRows0161_(data).length, 2);
  gs.prepareExportModel0161_(data, false, 'second', 7000);
  data.baseline.master.find((row) => row['Club ID'] === 'ARCH-0001')['Contact email'] = 'later@example.org';
  assert.equal(data.preparedExport.rows[0].row['Contact email'], 'new@example.org');
  assert.equal(gs.csvSnapshotMatches0161_([['TRUE', '-text']], [['TRUE', "'-text"]]), true);
  assert.equal(gs.csvSnapshotMatches0161_([['FALSE']], [['TRUE']]), false);
});

test('grouped rendering creates clickable links on all tabs and reads back without changing records', () => {
  const gs = script();
  const data = exportReady(gs);
  const tabs = {};
  let linksBuilt = 0;
  for (const [index, key] of ['master', 'clubs', 'sessions'].entries()) {
    const sheet = {
      cells: [],
      frozen: 0,
      getSheetId: () => 100 + index,
      getName: () => key,
      getMaxRows: () => 1000,
      getMaxColumns: () => 30,
      getLastRow() {
        return this.cells.length;
      },
      setFrozenRows(n) {
        this.frozen = n;
      },
      clearContents() {
        this.cells = [];
      },
      getRange(row, col, count = 1, width = 1) {
        const range = {
          setValues(values) {
            for (let r = 0; r < count; r++)
              for (let c = 0; c < width; c++) {
                sheet.cells[row - 1 + r] ||= [];
                sheet.cells[row - 1 + r][col - 1 + c] = values[r][c];
              }
            return range;
          },
          setRichTextValues(values) {
            return range.setValues(values.map((line) => line.map((value) => value.text)));
          },
          getValues: () =>
            Array.from({ length: count }, (_, r) =>
              Array.from({ length: width }, (_, c) => sheet.cells[row - 1 + r]?.[col - 1 + c] ?? '')
            ),
          getFormulas: () => Array.from({ length: count }, () => Array(width).fill('')),
          setBackground: () => range,
          setFontColor: () => range,
          setFontWeight: () => range,
          setNumberFormat: () => range,
          clearDataValidations: () => range
        };
        return range;
      },
      getDataRange() {
        return this.getRange(1, 1, this.cells.length, this.cells[0]?.length || 1);
      }
    };
    tabs[key] = sheet;
  }
  gs.formatTabs0161_ = () => {};
  gs.SpreadsheetApp = {
    getActive: () => ({ getUrl: () => 'https://example.test/spreadsheet' }),
    newRichTextValue: () => ({
      text: '',
      setText(text) {
        this.text = text;
        return this;
      },
      setLinkUrl(url) {
        assert.match(url, /#gid=10[0-2]&range=A\d+$/);
        linksBuilt++;
        return this;
      },
      build() {
        return { text: this.text };
      }
    })
  };
  gs.render0161_(tabs, data.baseline, true);
  assert.equal(linksBuilt, 6);
  assert.ok(Object.values(tabs).every((tab) => tab.frozen === 2));
  const result = gs.readTabs0161_(tabs);
  for (const key of ['master', 'clubs', 'sessions']) {
    assert.equal(result[key].length, 2);
    assert.deepEqual(JSON.parse(JSON.stringify(result[key])), JSON.parse(JSON.stringify(data.baseline[key])));
  }
});

test('club deletion removes all linked records, invalidates CSV and preserves other IDs and counters', () => {
  const gs = script();
  const store = stateStore(gs);
  const original = exportReady(gs);
  original.sessions['ARCH-0001-S00002'] = {
    clubId: 'ARCH-0001',
    data: { ...original.sessions['ARCH-0001-S00001'].data, 'Session Name': 'Second archery' },
    updated: 3000
  };
  original.sequences['ARCH-0001-S'] = 2;
  original.baseline = gs.rows0161_(original);
  gs.prepareExportModel0161_(original, false, 'confirmed', 5000);
  gs.confirmExportModel0161_(original, 'confirmed');
  original.clubs['RUNX-0001'].updated = 6000;
  original.clubs['RUNX-0001'].data['About the club'] = 'Unrelated edit still pending';
  original.baseline = gs.rows0161_(original);
  gs.prepareExportModel0161_(original, true, 'old-preview', 7000);
  const deleted = gs.deleteClubModel0161_(original, 'ARCH-0001');
  assert.ok(original.clubs['ARCH-0001']);
  assert.equal(deleted.clubs['ARCH-0001'], undefined);
  assert.ok(Object.values(deleted.sessions).every((session) => session.clubId !== 'ARCH-0001'));
  for (const key of ['master', 'clubs', 'sessions'])
    assert.ok(deleted.baseline[key].every((row) => row['Club ID'] !== 'ARCH-0001'));
  assert.equal(deleted.preparedExport, null);
  assert.match(deleted.csvInvalidated.reason, /ARCH-0001/);
  assert.equal(deleted.exported['session:ARCH-0001-S00001'], undefined);
  assert.equal(deleted.sequences['ARCH-0001-S'], 2);
  assert.equal(deleted.clubs['RUNX-0001'].data['About the club'], 'Unrelated edit still pending');
  assert.equal(gs.changedExportRows0161_(deleted).length, 1);
  assert.throws(() => gs.confirmExportModel0161_(deleted, 'old-preview'), /no longer current/);
  gs.save0161_(store.ss, deleted, true);
  const pending = gs.load0161_(store.ss);
  assert.match(pending.csvInvalidated.reason, /ARCH-0001/);
  let cleared = false,
    header,
    note;
  const sheet = {
    getLastRow: () => 1,
    clearContents() {
      cleared = true;
    },
    getRange(row, col, count, width) {
      return {
        getValues: () => [vm.runInContext('schema0161_("master")', gs)],
        setValues(values) {
          header = values[0];
        },
        setNote(value) {
          note = value;
        }
      };
    }
  };
  gs.clearInvalidatedCsv0161_({ getSheetByName: () => sheet }, pending);
  assert.equal(cleared, true);
  assert.equal(header[0], 'Verified');
  assert.match(note, /INVALIDATED/);
  assert.equal(pending.csvInvalidated, null);
  gs.save0161_(store.ss, pending, false);
  const complete = gs.load0161_(store.ss);
  gs.prepareExportModel0161_(complete, false, 'new-preview', 8000);
  assert.equal(complete.preparedExport.rows.length, 1);
  assert.equal(complete.preparedExport.rows[0].row['Club ID'], 'RUNX-0001');
  assert.throws(() => gs.deleteClubModel0161_(complete, 'ARCH-0001'), /no longer exists/);
});

test('corrections after export keep Club and Session IDs when sports and row order change', () => {
  const gs = script();
  const store = stateStore(gs);
  const data = exportReady(gs);
  gs.prepareExportModel0161_(data, false, 'before-correction', 5000);
  gs.confirmExportModel0161_(data, 'before-correction');
  const edit = JSON.parse(JSON.stringify(data.baseline));
  const club = edit.clubs.find((row) => row['Club ID'] === 'ARCH-0001');
  club['Club name'] = 'Corrected club name';
  club['Sport or activity'] = 'Zumba';
  const updated = gs.reconcile0161_(data, edit, false);
  assert.ok(updated.clubs['ARCH-0001']);
  assert.ok(updated.sessions['ARCH-0001-S00001']);
  assert.equal(updated.baseline.master.at(-1)['Club ID'], 'ARCH-0001');
  const changes = gs.changedExportRows0161_(updated);
  assert.equal(changes.length, 1);
  assert.equal(changes[0]['Club ID'], 'ARCH-0001');
  assert.equal(changes[0]['Session ID'], 'ARCH-0001-S00001');
  assert.equal(changes[0]['Club name'], 'Corrected club name');
  gs.save0161_(store.ss, updated, false);
  const saved = gs.load0161_(store.ss);
  assert.equal(saved.lastExport.id, 'before-correction');
  assert.equal(saved.lastExport.count, 2);
});

test('typing stamps edited rows without locks, full-table sync, sorting or snapshot writes', () => {
  const gs = script();
  gs.LockService = {
    getDocumentLock() {
      throw new Error('Typing must not request a lock');
    }
  };
  gs.syncCore0161_ = () => {
    throw new Error('Typing must not sync');
  };
  gs.save0161_ = () => {
    throw new Error('Typing must not save state');
  };
  const fields = vm.runInContext('schema0161_("master")', gs);
  const values = [
    fields,
    fields.map((field) => (field === 'Club ID' ? '#0161_SPORT_SECTION' : field === 'Club name' ? 'Archery' : '')),
    fields.map((field) =>
      field === 'Club ID'
        ? 'ARCH-0001'
        : field === 'Club name'
          ? 'Changed name'
          : field === 'Update Timestamp'
            ? 1000
            : ''
    ),
    fields.map(() => '')
  ];
  const writes = [];
  const sheet = {
    getName: () => 'Master',
    getLastColumn: () => fields.length,
    getLastRow: () => values.length,
    getRange(row, col, count, width) {
      return {
        getValues: () => values.slice(row - 1, row - 1 + count).map((line) => line.slice(col - 1, col - 1 + width)),
        setNumberFormat() {
          return this;
        },
        setValues(matrix) {
          writes.push({ row, col, matrix });
        }
      };
    }
  };
  const event = {
    range: { getSheet: () => sheet, getNumColumns: () => 1, getColumn: () => 2, getRow: () => 2, getNumRows: () => 3 }
  };
  gs.activeEdit0161(event);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].col, fields.indexOf('Update Timestamp') + 1);
  assert.equal(writes[0].matrix[0][0], '');
  assert.ok(writes[0].matrix[1][0].getTime() > 1000);
  assert.equal(writes[0].matrix[2][0], '');
  gs.activeEdit0161({ ...event, range: { ...event.range, getSheet: () => ({ getName: () => 'CSV Export' }) } });
  assert.equal(writes.length, 1);
  gs.activeChange0161({ changeType: 'REMOVE_ROW', source: { toast() {} } });
});

test('manual sync retains the edit timestamp rather than the later sync time', () => {
  const gs = script();
  const data = exportReady(gs);
  const input = JSON.parse(JSON.stringify(data.baseline));
  const club = input.clubs.find((row) => row['Club ID'] === 'ARCH-0001');
  club['Club name'] = 'Edited earlier';
  club['Update Timestamp'] = 9000;
  const session = input.sessions.find((row) => row['Session ID'] === 'RUNX-0001-S00001');
  session['Session Name'] = 'Edited session';
  session['Update Timestamp'] = 8000;
  const synced = gs.reconcile0161_(data, input, false);
  assert.equal(synced.clubs['ARCH-0001'].updated, 9000);
  assert.equal(synced.sessions['RUNX-0001-S00001'].updated, 8000);
  const fallback = JSON.parse(JSON.stringify(data.baseline));
  fallback.clubs.find((row) => row['Club ID'] === 'ARCH-0001')['Club name'] = 'No edit trigger';
  const withoutTrigger = gs.reconcile0161_(data, fallback, false);
  assert.ok(withoutTrigger.clubs['ARCH-0001'].updated > 3000);
  const fresh = gs.reconcile0161_(
    { clubs: {}, sessions: {}, baseline: { master: [], clubs: [], sessions: [] } },
    {
      master: [{ 'Club name': 'New club', 'Sport or activity': 'Archery', 'Update Timestamp': 7000 }],
      clubs: [],
      sessions: []
    },
    false
  );
  assert.equal(Object.values(fresh.clubs)[0].updated, 7000);
});

test('registration import owns all IDs and rejects duplicate submissions after reload', () => {
  const gs = script();
  const store = stateStore(gs);
  const before = exportReady(gs);
  const values = {
    name: 'New Registration',
    sport: 'Archery',
    'price.type': 'free',
    beginnerFriendly: 'yes',
    kitRequired: 'no',
    genderSpecific: 'no',
    participatesInLeague: 'no',
    bookingRequired: 'no',
    description: 'Quoted "answer", with a newline\nkept.'
  };
  const reference = 'submission-test-12345678';
  const transfer = registrationTransfer(
    values,
    [1, 2, 3].map(() => ({
      id: 'untrusted-session',
      title: 'Same venue and day',
      dayOfWeek: '1',
      startTime: '19:00',
      meetingPoint: 'Venue',
      postcode: 'M20 2ET'
    })),
    reference
  );
  const payload = JSON.parse(transfer.importBlock);
  payload.rows.forEach((row) => {
    row[0] = 'HACK-9999';
    row[payload.headings.indexOf('Session ID')] = 'HACK-9999-S99999';
    row[payload.headings.indexOf('Update Timestamp')] = 'untrusted timestamp';
  });
  const parsed = gs.parseRegistration0161_(JSON.stringify(payload));
  assert.ok(
    parsed.rows.every((row) => row['Club ID'] === '' && row['Session ID'] === '' && row['Update Timestamp'] === null)
  );
  const result = gs.registrationModel0161_(before, parsed, 9000);
  const imported = result.importedRegistrations[reference];
  assert.equal(imported.clubId, 'ARCH-0002');
  assert.deepEqual(Array.from(imported.sessionIds), ['ARCH-0002-S00001', 'ARCH-0002-S00002', 'ARCH-0002-S00003']);
  assert.ok(result.clubs['ARCH-0001']);
  assert.equal(result.clubs['HACK-9999'], undefined);
  assert.equal(result.clubs['ARCH-0002'].updated, 9000);
  gs.save0161_(store.ss, result, false);
  const loaded = gs.load0161_(store.ss);
  assert.equal(loaded.importedRegistrations[reference].clubId, 'ARCH-0002');
  assert.throws(() => gs.registrationModel0161_(loaded, parsed, 10000), /already imported/);
  const resubmitted = gs.parseRegistration0161_(
    registrationTransfer(values, [], 'submission-other-12345678').importBlock
  );
  assert.throws(() => gs.registrationModel0161_(loaded, resubmitted, 10000), /exact name already exists/);
  const clubOnly = gs.parseRegistration0161_(
    registrationTransfer({ ...values, name: 'No training yet' }, [], 'submission-no-training-12345678').importBlock
  );
  const noTraining = gs.registrationModel0161_(loaded, clubOnly, 11000);
  const clubOnlyEntry = noTraining.importedRegistrations[clubOnly.reference];
  assert.equal(clubOnlyEntry.sessionIds.length, 0);
  const placeholder = noTraining.baseline.master.filter((row) => row['Club ID'] === clubOnlyEntry.clubId);
  assert.equal(placeholder.length, 1);
  assert.equal(placeholder[0]['Session ID'], false);
  const invalid = { ...payload, headings: ['Wrong headings'] };
  assert.throws(() => gs.parseRegistration0161_(JSON.stringify(invalid)), /headings/);
  assert.throws(() => gs.parseRegistration0161_('bad email copy'), /complete registrationImport/);
});

test('registration dialog renders valid JavaScript and readable preview lines', () => {
  const gs = script();
  let html;
  gs.HtmlService = {
    createHtmlOutput(value) {
      html = value;
      return {
        setWidth() {
          return this;
        },
        setHeight() {
          return this;
        }
      };
    }
  };
  gs.SpreadsheetApp = { getUi: () => ({ showModalDialog() {} }) };
  gs.importRegistration0161();
  const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new vm.Script(source);
  const elements = Object.fromEntries(['input', 'preview', 'commit', 'review', 'error'].map((id) => [id, {}]));
  let success;
  const run = {
    withFailureHandler() {
      return this;
    },
    withSuccessHandler(fn) {
      success = fn;
      return this;
    },
    previewRegistration0161() {}
  };
  vm.runInNewContext(source, { document: { getElementById: (id) => elements[id] }, google: { script: { run } } });
  elements.preview.onclick();
  success({ fingerprint: 'abc', name: 'Test Club', sport: 'Archery', sessions: 3 });
  assert.match(elements.review.textContent, /^Test Club\nArchery\n3 sessions\n/);
  assert.equal(elements.commit.disabled, false);
});
