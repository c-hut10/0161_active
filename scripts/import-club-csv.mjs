import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CSV_COLUMNS, CLUB_ANSWER_FIELDS, SESSION_ANSWER_FIELDS, PAID_PRICE_TYPES, MEMBERSHIP_PERIODS, clubAnswers } from '../js/club-submission.mjs';
import { sportSlug, WEEK_DAYS } from '../js/club-formatting.mjs';
import { areaFromPostcode } from '../js/club-areas.mjs';
import { verificationDate } from '../js/club-verification.mjs';
import { leagueAnswers, LEAGUE_COVERAGES } from '../js/club-leagues.mjs';

/* CSV decoding: preserve quoted commas, line breaks and escaped quotes in club answers. */
function readCsv(source) {
  const rows = [];
  let row = [], cell = '', quoted = false, closed = false;
  function finishCell() {
    // Undo only the spreadsheet-formula protection applied by our CSV writer.
    row.push(cell.replace(/^'(?=[=+@-])/, '').trim());
    cell = ''; closed = false;
  }
  const text = source.replace(/^\uFEFF/, '');
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') { cell += '"'; index++; }
        else { quoted = false; closed = true; }
      } else cell += character;
    } else if (character === '"' && !cell && !closed) quoted = true;
    else if (character === ',') finishCell();
    else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index++;
      finishCell(); rows.push(row); row = [];
    } else if (closed || character === '"') throw new Error('Malformed CSV quoting. Export as comma-separated CSV.');
    else cell += character;
  }
  if (quoted) throw new Error('Unclosed quoted CSV field.');
  if (cell || row.length || closed) { finishCell(); rows.push(row); }
  return rows.filter(row => row.some(Boolean));
}

/* Import review: nothing is written unless the file is valid and --write is supplied. */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const file = args.find(argument => !argument.startsWith('--'));
if (!file || args.some(argument => argument.startsWith('--') && !['--write'].includes(argument))) {
  throw new Error('Usage: node scripts/import-club-csv.mjs <responses.csv> [--write]');
}
const rows = readCsv(fs.readFileSync(path.resolve(file), 'utf8'));
const headers = rows.shift() || [];
if (headers.length !== CSV_COLUMNS.length || new Set(headers).size !== headers.length
  || CSV_COLUMNS.some(column => !headers.includes(column))) throw new Error('CSV headings must match templates/club-registration.csv. Column order may vary.');
if (!rows.length) throw new Error('The CSV contains no club answers.');
const dataFile = path.join(root, 'data/clubs.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
if (data.schemaVersion !== 2) throw new Error('CSV imports require club schemaVersion 2.');
const sports = JSON.parse(fs.readFileSync(path.join(root, 'data/sports.json'), 'utf8'));
const knownSports = new Set(sports.sports.map(sport => sportSlug(typeof sport === 'string' ? sport : sport.name)));
data.clubs.forEach(club => knownSports.add(sportSlug(club.sport)));
const groups = new Map(), warnings = [], errors = [];
rows.forEach((row, index) => {
  const line = index + 2;
  if (row.length !== headers.length) { errors.push(`Row ${line}: expected ${headers.length} columns, received ${row.length}.`); return; }
  const values = Object.fromEntries(headers.map((header, position) => [header, row[position]]));
  if (!values.name || !values.sport) { errors.push(`Row ${line}: club name and sport are required.`); return; }
  const id = values.id || sportSlug(values.name);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) { errors.push(`Row ${line}: id must use lowercase words separated by hyphens.`); return; }
  const existing = data.clubs.find(club => club.id === id);
  if (!values.id && !existing && data.clubs.some(club => club.name.toLowerCase() === values.name.toLowerCase())) {
    errors.push(`Row ${line}: this club name already exists under another id. Supply its existing id to update it.`); return;
  }
  if (!groups.has(id)) groups.set(id, { values, rows: [] });
  const group = groups.get(id);
  for (const field of CLUB_ANSWER_FIELDS) if (values[field] !== group.values[field]) errors.push(`Row ${line}: ${field} conflicts with another row for ${id}. Repeat identical club details on every session row.`);
  const session = Object.fromEntries(SESSION_ANSWER_FIELDS.map(field => [field, values[`sessions.${field}`]]));
  // Empty session columns create a club with no listed sessions, never a fictitious training entry.
  if (Object.values(session).some(Boolean)) group.rows.push({ session, line });
});
const londonDate = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const [day, month, year] = londonDate.split('/');
const importDate = `${year}-${month}-${day}`;
if (!verificationDate(importDate)) throw new Error('Unable to determine the import date.');
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const updates = [];
for (const [id, group] of groups) {
  const answers = clubAnswers(group.values, group.rows.map(row => row.session));
  /* Preserve the club's wording and reject contradictory gender eligibility answers. */
  const genderSpecific = group.values.genderSpecific || '';
  const genderEligibility = group.values.genderEligibility || '';
  if (!['', 'yes', 'no'].includes(genderSpecific)) errors.push(`${id}: genderSpecific must be yes, no or blank when unknown.`);
  if (genderSpecific === 'yes' && !genderEligibility) errors.push(`${id}: gender-specific clubs require genderEligibility.`);
  if (genderEligibility.length > 150) errors.push(`${id}: genderEligibility must be up to 150 characters.`);
  if (genderSpecific !== 'yes' && genderEligibility) errors.push(`${id}: genderEligibility requires genderSpecific yes.`);
  /* Validate every submitted league before normalisation can drop incomplete answers. */
  const participation = group.values.participatesInLeague;
  const leagues = leagueAnswers(group.values);
  if (!['', 'yes', 'no'].includes(participation)) errors.push(`${id}: participatesInLeague must be yes, no or blank when unknown.`);
  if (participation === 'yes' && !leagues.length) errors.push(`${id}: Yes requires at least one league name and coverage.`);
  if (participation !== 'yes' && leagues.length) errors.push(`${id}: league details require participatesInLeague yes.`);
  const scopes = new Map();
  leagues.forEach((league, index) => {
    if (!league.teamName || league.teamName.length > 150) errors.push(`${id}: league ${index + 1} requires a team name of up to 150 characters.`);
    if (!league.name || league.name.length > 150) errors.push(`${id}: league ${index + 1} requires a name of up to 150 characters.`);
    if (!Object.hasOwn(LEAGUE_COVERAGES, league.coverage)) errors.push(`${id}: league ${index + 1} coverage must be local_county, regional or national.`);
    const key = league.name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-GB');
    if (scopes.has(key) && scopes.get(key) !== league.coverage) errors.push(`${id}: conflicting coverage for ${league.name}.`);
    scopes.set(key, league.coverage);
  });
  if (!knownSports.has(answers.sport)) errors.push(`${id}: sport is not in the approved directory.`);
  if (answers.contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.contact)) errors.push(`${id}: contact must be an email address or blank.`);
  if (answers.onlineProfile) {
    try { if (!['http:', 'https:'].includes(new URL(answers.onlineProfile.url).protocol)) throw new Error(); }
    catch { errors.push(`${id}: onlineProfile.url must be a complete HTTP or HTTPS URL.`); }
  }
  if (!['free', 'unknown', ...PAID_PRICE_TYPES].includes(answers.price.type)) errors.push(`${id}: invalid price.type.`);
  /* Optional membership must be complete and belong to a pay-per-session club. */
  const membershipValues = ['membership.period', 'membership.amount', 'membership.sessionAmount'].map(field => group.values[field]);
  if (membershipValues.some(Boolean)) {
    const membership = answers.membership;
    if (answers.price.type !== 'per_session') errors.push(`${id}: optional membership requires price.type per_session.`);
    else if (!membership || !MEMBERSHIP_PERIODS.includes(membership.period)) errors.push(`${id}: membership.period must be monthly or annual.`);
    else {
      if (!Number.isFinite(membership.amount) || membership.amount <= 0) errors.push(`${id}: membership.amount must be a positive amount in pounds.`);
      if (!Number.isFinite(membership.sessionAmount) || membership.sessionAmount < 0) errors.push(`${id}: membership.sessionAmount must be zero or a positive amount in pounds.`);
      if (Number.isFinite(answers.price.amount) && membership.sessionAmount > answers.price.amount) warnings.push(`${id}: member session price exceeds the standard price; please confirm.`);
    }
  }
  if (PAID_PRICE_TYPES.includes(answers.price.type)) {
    if (!Number.isFinite(answers.price.amount) || answers.price.amount <= 0) errors.push(`${id}: paid clubs require a positive price.amount.`);
    if (answers.bookingRequired === null) errors.push(`${id}: paid clubs require bookingRequired yes or no.`);
  } else if (group.values['price.amount'] || group.values.tasterSessionCount || group.values.bookingRequired) {
    warnings.push(`${id}: paid-only fields are ignored for free/unknown pricing.`);
  }
  if (answers.tasterSessionCount !== null && (!Number.isInteger(answers.tasterSessionCount) || answers.tasterSessionCount < 0)) errors.push(`${id}: tasterSessionCount must be a non-negative whole number.`);
  const times = new Set();
  answers.sessions.forEach((session, index) => {
    const line = group.rows[index].line;
    if (!WEEK_DAYS.some(day => day.number === session.dayOfWeek)) errors.push(`Row ${line}: sessions.dayOfWeek must be 1–7.`);
    if (!timePattern.test(session.startTime || '')) errors.push(`Row ${line}: sessions.startTime must be HH:MM.`);
    if (session.endTime && !timePattern.test(session.endTime)) errors.push(`Row ${line}: sessions.endTime must be HH:MM or blank.`);
    if (!session.meetingPoint || !session.postcode) errors.push(`Row ${line}: each session requires a training address and postcode.`);
    if (session.postcode && !/^(?:GIR|[A-Z]{1,2}\d[A-Z\d]?) \d[A-Z]{2}$/.test(session.postcode)) errors.push(`Row ${line}: supply a full postcode, for example M16 9PQ.`);
    if (session.eligibility && !['Beginner', 'Intermediate', 'Advanced', 'All Abilities'].includes(session.eligibility)) errors.push(`Row ${line}: use a standard experience level or leave it blank.`);
    if (!areaFromPostcode(session.postcode, session.meetingPoint)) warnings.push(`Row ${line}: postcode does not map to an approved area; it will display Area to confirm.`);
    const key = `${session.dayOfWeek}/${session.startTime}`;
    if (times.has(key)) warnings.push(`Row ${line}: another session for ${id} has the same day/start time. Both are retained; confirm this is intentional.`);
    times.add(key);
    if (session.specialConsiderations) warnings.push(`Row ${line}: special considerations are descriptive text; irregular dates are not calculated automatically.`);
    session.dataStatus = 'user-submitted';
  });
  const existing = data.clubs.find(club => club.id === id);
  // Existing photos, paths and sources remain; a response replaces the club's complete session list.
  updates.push({ ...(existing || {}), ...answers, id,
    imagePath: existing?.imagePath || null,
    profilePath: existing?.profilePath || `html/${answers.sport}/${id}.html`,
    coordinates: existing?.coordinates || null,
    sources: existing?.sources || [],
    // New answers supersede old public notes that may describe a previous schedule or price.
    pricingNotes: null, bookingNotes: null, tasterNotes: null,
    // A complete form response supersedes owner-held venues with its submitted sessions.
    trainingVenues: [],
    verification: { status: 'verified', lastConfirmed: importDate }
  });
}
if (warnings.length) console.log('Review issues:\n' + warnings.map(message => `- ${message}`).join('\n'));
if (errors.length) throw new Error('Import blocked; no records changed:\n' + errors.map(message => `- ${message}`).join('\n'));
console.log(`${updates.length} clubs prepared, ${updates.reduce((total, club) => total + club.sessions.length, 0)} sessions. Last Confirmed: ${importDate}.`);
if (args.includes('--write')) {
  for (const update of updates) {
    const index = data.clubs.findIndex(club => club.id === update.id);
    if (index < 0) data.clubs.push(update); else data.clubs[index] = update;
  }
  // One final write after every record has passed import validation.
  const temporary = `${dataFile}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(temporary, dataFile);
  console.log('Updated data/clubs.json. Run node scripts/build-site-metadata.cjs to regenerate profiles.');
} else console.log('Review only: no data changed. Add --write to apply the approved file.');
