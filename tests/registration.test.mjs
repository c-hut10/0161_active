import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { renderClubProfile } from '../js/club-profile-renderer.mjs';
import { renderProfileCost } from '../js/club-profile-details.mjs';
import { paymentOptions } from '../js/club-payment-options.mjs';
import { verificationFromImport, clubVerificationBadge } from '../js/club-verification.mjs';
import { mergeCsvSessions } from '../scripts/merge-csv-sessions.mjs';
import {
  MASTER_COLUMNS,
  PRE_VERIFIED_MASTER_COLUMNS,
  PRE_OPTIONS_MASTER_COLUMNS,
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

test('compact cost table preserves rates, optional memberships, booking and safe contact fallbacks', () => {
  const club = {
    price: { type: 'per_session', amount: 5.5 },
    contact: 'hello@example.org',
    sessions: [],
    tasterSessionCount: 4,
    bookingRequired: true,
    paymentOptions: ['Annual membership: £40/year', 'Competition fees: Contact club <script>']
  };
  const html = renderProfileCost(club);
  assert.match(html, /<table class="profile-cost__table">/);
  assert.match(html, /scope="col">Payment option/);
  assert.match(html, /scope="row">Pay as you go/);
  assert.match(html, /£5\.50\/session/);
  assert.match(html, /Annual membership/);
  assert.match(html, /£40\/year/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|taster|Taster/);
  assert.match(html, /Booking required/);
  assert.match(html, /mailto:hello@example.org/);
  const member = renderProfileCost({
    ...club,
    paymentOptions: [],
    membership: { period: 'monthly', amount: 25, sessionAmount: 3 }
  });
  assert.match(member, /£25\/month \+ £3\/session/);
  const included = renderProfileCost({
    ...club,
    paymentOptions: [],
    membership: { period: 'monthly', amount: 25, sessionAmount: 0 }
  });
  assert.match(included, /Sessions included/);
  const unknown = renderProfileCost({ price: { type: 'unknown' }, onlineProfile: { url: 'https://example.org' } });
  assert.doesNotMatch(unknown, /<table|Booking required/);
  assert.match(unknown, /href="https:\/\/example.org\/"/);
  assert.match(unknown, /For more details on session\/membership information:/);
  assert.match(renderProfileCost({ price: { type: 'free' } }), /Free/);
});

test('extra payment options survive named export, copy-paste and website import without changing session row counts', () => {
  const options = 'Monthly membership: £25/month. Includes training.\nCompetition fees: £5/event, only when competing.';
  const transfer = registrationTransfer(
    { ...answers, paymentOptions: options },
    sessions,
    'submission-payment-options-test'
  );
  const payload = JSON.parse(transfer.importBlock);
  assert.equal(payload.rows.length, 3);
  const position = MASTER_COLUMNS.indexOf('Payment options');
  for (const row of payload.rows) {
    assert.equal(row.length, 29);
    assert.equal(row[position], options);
    const assigned = Object.fromEntries(MASTER_COLUMNS.map((field, index) => [field, row[index]]));
    assigned['Session ID'] = 'KORF-0001-S00001'; // Assigned by Sheets before website import.
    const converted = masterRowAnswers(assigned);
    assert.deepEqual(paymentOptions(converted.paymentOptions), paymentOptions(options));
  }
  for (const row of transfer.spreadsheet.split('\r\n')) {
    const cells = row.split('\t');
    assert.equal(cells.length, 29);
    assert.deepEqual(paymentOptions(cells[position]), paymentOptions(options));
  }
  assert.equal(PRE_OPTIONS_MASTER_COLUMNS.length, 28);
  const legacy = Object.fromEntries(PRE_OPTIONS_MASTER_COLUMNS.map((field) => [field, '']));
  assert.equal(masterRowAnswers(legacy).paymentOptions, '');
});

test('Week at a glance renders only scheduled days and keeps an empty-schedule message', () => {
  const sample = JSON.parse(fs.readFileSync(new URL('../data/clubs.json', import.meta.url), 'utf8')).clubs[0];
  const { html } = renderClubProfile({
    ...sample,
    sessions: [
      { title: 'Friday', dayOfWeek: 5, startTime: '19:00' },
      { title: 'Tuesday later', dayOfWeek: 2, startTime: '19:30' },
      { title: 'Tuesday earlier', dayOfWeek: 2, startTime: '09:30' },
      { title: 'No time yet', dayOfWeek: 3 }
    ]
  });
  assert.deepEqual(
    [...html.matchAll(/class="profile-day__name">([^<]+)/g)].map((match) => match[1]),
    ['TUE', 'FRI']
  );
  assert.equal((html.match(/class="profile-day"/g) || []).length, 2);
  assert.match(html, /--profile-training-days:2/);
  assert.doesNotMatch(html, /profile-day--empty|No time yet|profile-empty/);
  assert.ok(html.indexOf('Tuesday earlier') < html.indexOf('Tuesday later'));
  for (const incomplete of [[], [{ dayOfWeek: 1 }], [{ dayOfWeek: 9, startTime: '19:00' }]]) {
    const empty = renderClubProfile({ ...sample, sessions: incomplete }).html;
    assert.match(empty, /Training to be confirmed/);
    assert.doesNotMatch(empty, /class="profile-day"/);
  }
});

test('session notes precede Copy address and sharing is a secondary club action', () => {
  const sample = JSON.parse(fs.readFileSync(new URL('../data/clubs.json', import.meta.url), 'utf8')).clubs[0];
  const html = renderClubProfile({
    ...sample,
    sessions: [
      {
        title: 'Training',
        dayOfWeek: 2,
        startTime: '19:00',
        meetingPoint: 'Sports hall',
        postcode: 'M20 2ET',
        venueNotes: 'Use the side entrance.',
        specialConsiderations: 'Bring indoor shoes.'
      }
    ]
  }).html;
  const card = html.match(/<article class="profile-session">([\s\S]*?)<\/article>/)[1];
  assert.ok(card.indexOf('Use the side entrance.') < card.indexOf('data-copy-address='));
  assert.ok(card.indexOf('Bring indoor shoes.') < card.indexOf('data-copy-address='));
  assert.match(card, /Copy address<\/button>\s*$/);
  assert.match(html, /profile-action--secondary" data-share-club/);
});

test('only explicit CSV verification grants a green tick; online registrations stamp every session row TRUE', () => {
  const date = '2026-10-29';
  for (const flag of [false, undefined, null, '', 'Not confirmed']) {
    const verification = verificationFromImport(flag, {}, date);
    assert.equal(verification.status, 'unverified');
    assert.equal(clubVerificationBadge({ verification }), '');
  }
  const approved = verificationFromImport(true, {}, date);
  assert.match(clubVerificationBadge({ verification: approved }), /club-verified/);
  assert.equal(approved.lastConfirmed, date);
  const previous = { verification: { status: 'verified', lastConfirmed: '2026-10-20' } };
  assert.equal(verificationFromImport(true, previous, date).lastConfirmed, '2026-10-20');
  assert.equal(clubVerificationBadge({ verification: verificationFromImport(false, previous, date) }), '');
  const exported = rows();
  assert.ok(exported.every((row) => row.Verified === 'TRUE'));
  assert.deepEqual(MASTER_COLUMNS.slice(0, 3), ['Verified', 'Club ID', 'Club name']);
  assert.equal(MASTER_COLUMNS.at(-1), 'Update Timestamp');
  assert.equal(masterRowAnswers({ ...exported[0], Verified: 'FALSE' }).verified, 'no');
  assert.equal(masterRowAnswers({ ...exported[0], Verified: '' }).verified, '');
  assert.equal(masterRowAnswers({ ...exported[0], Verified: 'TRUE' }).verified, 'yes');
  const form = fs.readFileSync(new URL('../html/register.html', import.meta.url), 'utf8');
  assert.match(form, /<input type="hidden" name="Verified" value="TRUE">/);
});

test('website importer does not verify CSVs with false, missing or unknown approval', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), '0161-verification-test-'));
  const importer = new URL('../scripts/import-club-csv.mjs', import.meta.url);
  const csvCell = (value) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  try {
    for (const flag of ['TRUE', 'FALSE', 'Not confirmed', '', undefined]) {
      const headings = flag === undefined ? PRE_VERIFIED_MASTER_COLUMNS : MASTER_COLUMNS;
      const data = rows().map((row) => ({ ...row, Verified: flag }));
      const file = path.join(directory, 'verification.csv');
      fs.writeFileSync(
        file,
        [headings, ...data.map((row) => headings.map((field) => row[field]))]
          .map((row) => row.map(csvCell).join(','))
          .join('\r\n')
      );
      const result = spawnSync(process.execPath, [importer.pathname, file], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, new RegExp(`${flag === 'TRUE' ? 1 : 0} explicitly verified`));
      assert.match(result.stdout, /Review only: no data changed/);
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('beginner answers stay per session from registration through Master export and profile rendering', () => {
  const mixed = sessions.map((session, index) => ({ ...session, beginnerFriendly: ['yes', 'no', ''][index] }));
  const exported = rows(answers, mixed);
  assert.deepEqual(
    exported.map((row) => row['Session beginner friendly?']),
    ['TRUE', 'FALSE', 'Not confirmed']
  );
  assert.deepEqual(
    exported.map((row) => masterRowAnswers(row)['sessions.beginnerFriendly']),
    ['yes', 'no', '']
  );
  const sample = JSON.parse(fs.readFileSync(new URL('../data/clubs.json', import.meta.url), 'utf8')).clubs[0];
  const { html } = renderClubProfile({
    ...sample,
    beginnerFriendly: true,
    sessions: mixed.map((session, index) => ({ ...session, beginnerFriendly: [true, false, null][index] }))
  });
  assert.equal((html.match(/Beginners Welcome/g) || []).length, 1);
  const cards = [...html.matchAll(/<article class="profile-session">([\s\S]*?)<\/article>/g)].map((match) => match[1]);
  const beginnerCard = cards.find((card) => card.includes('Beginners Welcome'));
  assert.ok(beginnerCard.indexOf('session-title') < beginnerCard.indexOf('Beginners Welcome'));
  assert.ok(beginnerCard.indexOf('Beginners Welcome') < beginnerCard.indexOf('Didsbury High School'));
  assert.doesNotMatch(html, /<dt>BEGINNER FRIENDLY<\/dt>/);
});
function rows(values = answers, entries = sessions) {
  return submissionSpreadsheet(values, entries, 'club-registration-check')
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
  assert.equal(result['Session beginner friendly?'], 'Not confirmed');
  assert.equal(masterRowAnswers(result).beginnerFriendly, '');
});
test('Sheets session eligibility schema remains compatible with earlier form email headings', () => {
  const script = fs.readFileSync(new URL('../tools/google-sheets/0161.gs', import.meta.url), 'utf8');
  const columns = vm.runInNewContext(script + '\nschema0161_("master");');
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
  assert.ok(
    copied.every(
      (row) =>
        row.length === 29 &&
        row[0] === 'TRUE' &&
        row[MASTER_COLUMNS.indexOf('Club ID')] === '' &&
        row[MASTER_COLUMNS.indexOf('Session ID')] === ''
    )
  );
  assert.equal(JSON.stringify(sessions), before);
  const formCode = fs.readFileSync(new URL('../js/register.js', import.meta.url), 'utf8');
  assert.doesNotMatch(formCode, /club-\$\{crypto|session-\$\{crypto/);
});
