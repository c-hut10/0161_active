import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { mergeCsvSessions } from '../scripts/merge-csv-sessions.mjs';
import {
  MASTER_COLUMNS,
  submissionCsv,
  submissionSpreadsheet,
  masterRowAnswers,
  registrationTransfer
} from '../js/club-submission.mjs';

// Exercise real exports and the import dry run: this guards the receiving spreadsheet contract.
const answers = {
  name: 'Registration Check',
  sport: 'Korfball',
  contact: 'example@example.org',
  beginnerFriendly: 'yes',
  kitRequired: 'no',
  genderSpecific: 'no',
  participatesInLeague: 'no',
  bookingRequired: 'yes',
  tasterSessionCount: '0',
  description: 'A description with a comma, and a newline\nfor export checks.',
  'price.type': 'per_session'
};
const sessions = [0, 1, 2].map((index) => ({
  id: `session-check-${index}`,
  title: `Training ${index + 1}`,
  dayOfWeek: '2',
  startTime: '19:00',
  endTime: '',
  meetingPoint: 'Didsbury High School',
  postcode: 'M20 2ET',
  'price.amount': String(index * 3)
}));
function rows(values = answers) {
  return submissionSpreadsheet(values, sessions, 'club-registration-check')
    .split('\r\n')
    .map((line) => {
      const cells = line.split('\t');
      assert.equal(cells.length, MASTER_COLUMNS.length);
      return Object.fromEntries(MASTER_COLUMNS.map((field, index) => [field, cells[index]]));
    });
}
test('each session gets a separate row and ID, including identical training days and venues', () => {
  const result = rows();
  assert.equal(result.length, 3);
  assert.equal(new Set(result.map((row) => row['Session ID'])).size, 3);
  assert.equal(new Set(result.map((row) => row['Club ID'])).size, 1);
  for (const row of result) {
    assert.equal(row['Club name'], answers.name);
    assert.equal(row['Sport or activity'], answers.sport);
    assert.equal(row['End time'], '');
    assert.equal(row['Membership amount (£)'], 'FALSE');
    assert.equal(row['Kit Details:'], 'FALSE');
    assert.equal(row['How many free taster sessions do you offer newcomers?'], '0');
  }
  assert.equal(result[0]['Session Price (£)'], '0');
});
test('monthly membership has its own amount; unanswered booleans stay unknown', () => {
  const result = rows({ ...answers, 'price.type': 'monthly_fee', 'price.amount': '25', beginnerFriendly: '' })[0];
  assert.equal(result['Membership amount (£)'], '25');
  assert.equal(result['Session Price (£)'], 'FALSE');
  assert.equal(result['Beginner friendly?'], 'Not confirmed');
  assert.equal(masterRowAnswers(result).beginnerFriendly, '');
});
test('form exports, CSV template and Apps Script agree on every heading and its order', () => {
  const script = fs.readFileSync(new URL('../tools/google-sheets/0161.gs', import.meta.url), 'utf8');
  const columns = vm.runInNewContext(
    script.split('function onOpen()')[0] + '\nCLUB_FIELDS.concat(SESSION_FIELDS, [STAMP]);'
  );
  assert.equal(JSON.stringify(columns), JSON.stringify(MASTER_COLUMNS));
  assert.equal(
    fs.readFileSync(new URL('../templates/club-registration.csv', import.meta.url), 'utf8').trim(),
    MASTER_COLUMNS.join(',')
  );
});
test('CSV with three sessions and multiline copy passes the importer without writing data', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), '0161-registration-test-'));
  try {
    const file = path.join(directory, 'answers.csv');
    fs.writeFileSync(file, submissionCsv(answers, sessions, 'club-registration-check'));
    const result = spawnSync(process.execPath, ['scripts/import-club-csv.mjs', file], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /1 clubs prepared, 3 sessions/);
    assert.match(result.stdout, /Review only: no data changed/);
    const numbered = path.join(directory, 'numbered.csv');
    fs.writeFileSync(
      numbered,
      submissionCsv(
        answers,
        sessions.map((session, index) => ({ ...session, id: `RULE-0001-S${String(index + 1).padStart(5, '0')}` })),
        'RULE-0001'
      )
    );
    const incremental = spawnSync(process.execPath, ['scripts/import-club-csv.mjs', numbered, '--merge-sessions'], {
      encoding: 'utf8'
    });
    assert.equal(incremental.status, 0, incremental.stderr);
    assert.match(incremental.stdout, /1 clubs prepared, 3 sessions/);
    assert.match(incremental.stdout, /Review only: no data changed/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('incremental CSV session import preserves unchanged IDs and blocks ambiguous legacy schedules', () => {
  const existing = [
    { id: 'RULE-0001-S00001', title: 'Old name', startTime: '19:00' },
    { id: 'RULE-0001-S00002', title: 'Untouched', startTime: '20:00' }
  ];
  const merged = mergeCsvSessions(
    existing,
    [
      { id: 'rule-0001-s00001', title: 'Corrected' },
      { id: 'RULE-0001-S00003', title: 'New session' }
    ],
    'RULE-0001'
  );
  assert.equal(merged.length, 3);
  assert.equal(merged[0].id, 'RULE-0001-S00001');
  assert.equal(merged[0].title, 'Corrected');
  assert.equal(merged[0].startTime, '19:00');
  assert.deepEqual(merged[1], existing[1]);
  assert.equal(existing[0].title, 'Old name');
  assert.throws(
    () => mergeCsvSessions([{ title: 'Legacy session' }], [{ id: 'session-new' }], 'Club'),
    /unique Session IDs/
  );
  assert.throws(() => mergeCsvSessions(existing, [{ title: 'Missing ID' }], 'Club'), /require Session IDs/);
});

test('public registration transfers contain no authoritative club or session IDs', () => {
  const reference = 'submission-test-12345678';
  const before = JSON.stringify(sessions);
  const transfer = registrationTransfer(answers, sessions, reference);
  const payload = JSON.parse(transfer.importBlock);
  assert.equal(payload.submissionReference, reference);
  assert.equal(payload.rows.length, 3);
  assert.deepEqual(payload.headings, MASTER_COLUMNS);
  assert.ok(
    payload.rows.every(
      (row) => row[MASTER_COLUMNS.indexOf('Club ID')] === '' && row[MASTER_COLUMNS.indexOf('Session ID')] === ''
    )
  );
  assert.ok(JSON.parse(transfer.sessionsJson).every((session) => !Object.hasOwn(session, 'id')));
  const copied = transfer.spreadsheet.split('\r\n').map((row) => row.split('\t'));
  assert.ok(copied.every((row) => row.length === 27 && row[0] === '' && row[17] === ''));
  assert.equal(JSON.stringify(sessions), before);
  const formCode = fs.readFileSync(new URL('../js/register.js', import.meta.url), 'utf8');
  assert.doesNotMatch(formCode, /club-\$\{crypto|session-\$\{crypto/);
});
