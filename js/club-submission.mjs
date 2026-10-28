import { formatPostcodes, sportSlug, displaySportName, formatPrice, formatMembership, genderEligibilityLabel, DAY_NAMES } from './club-formatting.mjs';
import { sessionTitle, sessionPricingClub } from './session-details.mjs';
import { normaliseLeagues, leagueAnswers, LEAGUE_COVERAGES } from './club-leagues.mjs?v=20261026-sheet-fields';

/* Legacy CSV fields remain readable; the current form exports the agreed Master headings. */
export const CLUB_ANSWER_FIELDS = ['name', 'sport', 'beginnerFriendly', 'genderSpecific', 'genderEligibility', 'participatesInLeague', 'participatingLeagues.teamName', 'participatingLeagues.name', 'participatingLeagues.coverage', 'description', 'contact', 'onlineProfile.url',
  'price.type', 'price.amount', 'membership.period', 'membership.amount', 'membership.sessionAmount',
  'tasterSessionCount', 'bookingRequired', 'additionalInformation'];
export const SESSION_ANSWER_FIELDS = ['title', 'dayOfWeek', 'startTime', 'endTime',
  'meetingPoint', 'postcode', 'eligibility', 'specialConsiderations'];
export const CSV_COLUMNS = ['id', ...CLUB_ANSWER_FIELDS, ...SESSION_ANSWER_FIELDS.map(field => `sessions.${field}`)];
// Retired questions remain supported only when reading earlier CSV submissions.
export const FORM_ANSWER_FIELDS = CLUB_ANSWER_FIELDS.filter(field => ![
  'participatingLeagues.teamName', 'participatingLeagues.coverage', 'membership.period',
  'membership.amount', 'membership.sessionAmount', 'additionalInformation'
].includes(field)).concat(['kitRequired', 'kitDetails']);
export const MASTER_COLUMNS = [
  'Club ID', 'Club name', 'Sport or activity', 'Contact email', 'Website or social link',
  'Beginner friendly?', 'Kit requirements for newcomers?', 'Kit Details:', 'Gender-specific?',
  'Gender eligibility — if applicable', 'About the club', 'Payment Type', 'Membership amount (£)',
  'Booking required?', 'How many free taster sessions do you offer newcomers?',
  'Participate in a league?', 'League name', 'Session ID', 'Training day', 'Session Price (£)',
  'Session Name', 'Session address', 'Session Postcode', 'Start time', 'End time',
  'Any extra session info?', 'Update Timestamp'
];
const PAYMENT_LABELS = { free: 'Free', monthly_fee: 'Monthly membership', annual_fee: 'Annual membership', per_session: 'Per session', unknown: 'Not confirmed' };
export const PAID_PRICE_TYPES = ['monthly_fee', 'annual_fee', 'per_session'];
export const MEMBERSHIP_PERIODS = ['monthly', 'annual'];
const text = value => String(value ?? '').trim();
const optional = value => text(value) || null;

/* Normalised answers: the form and CSV importer produce the same club/session fields. */
export function sessionAnswers(values) {
  const session = Object.fromEntries(SESSION_ANSWER_FIELDS.map(field => [field, optional(values[field])]));
  if (text(values.id)) session.id = text(values.id);
  session.dayOfWeek = session.dayOfWeek ? Number(session.dayOfWeek) : null;
  session.meetingPoint = optional(formatPostcodes(session.meetingPoint));
  session.postcode = optional(formatPostcodes(session.postcode));
  session.title = sessionTitle(null, session);
  // A supplied session amount overrides the club rate; zero is an explicitly free session.
  const amount = values.price?.amount ?? values['price.amount'];
  if (amount !== null && amount !== undefined && text(amount) !== '') {
    session.price = { type:Number(amount) === 0 ? 'free' : 'per_session', amount:Number(amount), currency:'GBP' };
  }
  return session;
}

export function clubAnswers(values, sessions) {
  const type = text(values['price.type']) || 'unknown';
  const paid = PAID_PRICE_TYPES.includes(type);
  const url = optional(values['onlineProfile.url']);
  return {
    name: text(values.name), sport: sportSlug(values.sport), description: optional(values.description),
    // Club-wide beginner welcome is independent of individual session experience levels.
    kitRequired: values.kitRequired === 'yes' ? true : values.kitRequired === 'no' ? false : null,
    kitDetails: values.kitRequired === 'yes' ? optional(values.kitDetails) : null,
    beginnerFriendly: values.beginnerFriendly === 'yes' ? true : values.beginnerFriendly === 'no' ? false : null,
    // Unknown stays unknown; free text is stored only for a gender-specific club.
    genderSpecific: values.genderSpecific === 'yes' ? true : values.genderSpecific === 'no' ? false : null,
    genderEligibility: values.genderSpecific === 'yes' ? optional(values.genderEligibility) : null,
    participatesInLeague: values.participatesInLeague === 'yes' ? true : values.participatesInLeague === 'no' ? false : null,
    participatingLeagues: values.participatesInLeague === 'yes' ? normaliseLeagues(leagueAnswers(values).map(league => ({ ...league, teamName: league.teamName || text(values.name) }))) : [],
    contact: optional(values.contact), onlineProfile: url ? { url } : null,
    price: { type, amount: type === 'free' ? 0 : paid && text(values['price.amount']) ? Number(values['price.amount']) : null, currency: 'GBP' },
    // Optional membership supplements the standard pay-per-session rate, never replaces it.
    membership: type === 'per_session' && text(values['membership.period']) ? {
      period: text(values['membership.period']),
      amount: text(values['membership.amount']) ? Number(values['membership.amount']) : null,
      sessionAmount: text(values['membership.sessionAmount']) ? Number(values['membership.sessionAmount']) : null
    } : null,
    tasterSessionCount: text(values.tasterSessionCount) ? Number(values.tasterSessionCount) : null,
    // Explicit CSV answers apply at any price; unspecified booking is hidden by default.
    bookingRequired: text(values.bookingRequired) === 'yes' ? true : text(values.bookingRequired) === 'no' ? false : null,
    additionalInformation: optional(values.additionalInformation), sessions: sessions.map(sessionAnswers)
  };
}

/* CSV output: quote multiline answers and protect spreadsheet cells from formula interpretation. */
export function csvCell(value) {
  let cell = String(value ?? '');
  if (/^[=+@-]/.test(cell)) cell = `'${cell}`;
  return /[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}
/* Named mapping prevents the club-name/sport order from drifting between outputs. */
function submissionRows(values, sessions, id) {
  const club = clubAnswers(values, sessions);
  const known = value => value === null || value === undefined || value === '' ? 'Not confirmed' : value;
  const dependent = (flag, value) => flag === false ? false : known(value);
  return (club.sessions.length ? club.sessions : [null]).map(session => {
    const row = {
      'Club ID': id, 'Club name': known(club.name), 'Sport or activity': known(values.sport),
      'Contact email': known(club.contact), 'Website or social link': known(club.onlineProfile?.url),
      'Beginner friendly?': known(club.beginnerFriendly), 'Kit requirements for newcomers?': known(club.kitRequired),
      'Kit Details:': dependent(club.kitRequired, club.kitDetails), 'Gender-specific?': known(club.genderSpecific),
      'Gender eligibility — if applicable': dependent(club.genderSpecific, club.genderEligibility),
      'About the club': known(club.description), 'Payment Type': PAYMENT_LABELS[club.price.type] || 'Not confirmed',
      'Membership amount (£)': ['monthly_fee', 'annual_fee'].includes(club.price.type) ? known(club.price.amount) : false,
      'Booking required?': known(club.bookingRequired),
      'How many free taster sessions do you offer newcomers?': known(club.tasterSessionCount),
      'Participate in a league?': known(club.participatesInLeague),
      'League name': dependent(club.participatesInLeague, club.participatingLeagues.map(league => league.name).join('; ')),
      'Session ID': session ? (session.id || '') : false,
      'Training day': session ? known(DAY_NAMES[session.dayOfWeek]) : 'Not confirmed',
      'Session Price (£)': club.price.type === 'per_session' ? known(session?.price?.amount) : false,
      'Session Name': known(session?.title), 'Session address': known(session?.meetingPoint),
      'Session Postcode': known(session?.postcode), 'Start time': known(session?.startTime),
      'End time': session?.endTime || '', 'Any extra session info?': known(session?.specialConsiderations),
      // The spreadsheet owns its edit timestamp; no fabricated browser edit history.
      'Update Timestamp': ''
    };
    return MASTER_COLUMNS.map(field => typeof row[field] === 'boolean' ? String(row[field]).toUpperCase() : row[field]);
  });
}
function csvFromRows(rows) {
  const lines = rows.map(row => row.map(csvCell).join(','));
  return [MASTER_COLUMNS.map(csvCell).join(','), ...lines].join('\r\n') + '\r\n';
}

/* Paste into an existing sheet: data rows only, with paragraph breaks flattened inside cells. */
function spreadsheetFromRows(rows) {
  const cell = value => {
    let answer = String(value ?? '').replace(/[\t\r\n]+/g, ' ');
    if (/^\s*[=+@-]/.test(answer)) answer = `'${answer}`;
    return answer;
  };
  return rows.map(row => row.map(cell).join('\t')).join('\r\n');
}

export function submissionCsv(values, sessions, id = '') {
  return csvFromRows(submissionRows(values, sessions, id));
}
export function submissionSpreadsheet(values, sessions, id = '') {
  return spreadsheetFromRows(submissionRows(values, sessions, id));
}

/* Public registrations carry an import reference, never authoritative table IDs. */
export function registrationTransfer(values, sessions, reference) {
  const cleanSessions = sessions.map(session => {
    const copy = { ...session };
    delete copy.id;
    return copy;
  });
  const rows = submissionRows(values, cleanSessions, '');
  return {
    reference,
    csv: csvFromRows(rows),
    spreadsheet: spreadsheetFromRows(rows),
    sessionsJson: JSON.stringify(cleanSessions),
    importBlock: JSON.stringify({ version: 1, submissionReference: reference, headings: MASTER_COLUMNS, rows })
  };
}

/* One readable representation for the final review and Netlify notification summary. */
export function submissionReview(club) {
  const supplied = value => text(value) || 'Not supplied';
  const yesNo = value => value === true ? 'Yes' : value === false ? 'No' : 'Not supplied';
  const sections = [
    { title: 'Club', step: 0, lines: [
      `Name: ${supplied(club.name)}`, `Sport: ${supplied(displaySportName(club.sport))}`,
      `Beginners welcome: ${yesNo(club.beginnerFriendly)}`,
      `Kit required: ${yesNo(club.kitRequired)}`,
      ...(club.kitRequired === true ? [`Kit details: ${supplied(club.kitDetails)}`] : []),
      `Gender eligibility: ${supplied(genderEligibilityLabel(club))}`,
      `Description: ${supplied(club.description)}`
    ] },
    { title: 'Cost', step: 0, lines: [
      ...(club.sessions.some(session => session.price) ? club.sessions.map(session =>
        `${[DAY_NAMES[session.dayOfWeek], session.title].filter(Boolean).join(' · ')}: ${formatPrice(sessionPricingClub(club, session), { compact:true })}`
      ) : [`Price: ${formatPrice(club, { compact: true, minimumFractionDigits: 0 })}`]),
      ...(club.membership ? [`Optional membership: ${formatMembership(club, { minimumFractionDigits: 0 })}`] : []),
      `Free taster sessions: ${club.tasterSessionCount ?? 'Not supplied'}`,
      `Does a first-timer need to book before a session? ${yesNo(club.bookingRequired)}`
    ] },
    { title: 'Leagues', step: 0, lines: [
      `Participates in leagues: ${yesNo(club.participatesInLeague)}`,
      ...club.participatingLeagues.map(league => [league.teamName, league.name, LEAGUE_COVERAGES[league.coverage]].filter(Boolean).join(' — '))
    ] },
    { title: 'Training', step: 1, lines: club.sessions.flatMap((session, index) => [
      `${index + 1}. ${session.title}`,
      `${DAY_NAMES[session.dayOfWeek] || 'Day not supplied'} · ${[session.startTime, session.endTime].filter(Boolean).join('–') || 'Time not supplied'}`,
      `Location: ${supplied([session.meetingPoint, session.postcode].filter(Boolean).join(', '))}`,
      ...(session.specialConsiderations ? [`Special considerations: ${session.specialConsiderations}`] : [])
    ]) },
    { title: 'Contact', step: 2, lines: [
      `Public contact email: ${supplied(club.contact)}`,
      ...(club.onlineProfile ? [`Website or social link: ${club.onlineProfile.url}`] : []),
      ...(club.additionalInformation ? [`Additional information: ${club.additionalInformation}`] : [])
    ] }
  ];
  return sections;
}

export function submissionSummary(sections) {
  return sections.map(section => `${section.title.toUpperCase()}\n${section.lines.join('\n')}`).join('\n\n');
}

/* Translate the agreed spreadsheet schema into the existing club data model. */
export function masterRowAnswers(row) {
  const absent = value => /^(?:not confirmed|false)$/i.test(String(value ?? '').trim()) || !text(value);
  const answer = heading => absent(row[heading]) ? '' : text(row[heading]);
  const boolean = heading => {
    const value = text(row[heading]).toLowerCase();
    if (['true', 'yes'].includes(value)) return 'yes';
    if (['false', 'no'].includes(value)) return 'no';
    if (!value || value === 'not confirmed') return '';
    throw new Error(`${heading}: use TRUE, FALSE or Not confirmed.`);
  };
  const label = answer('Payment Type');
  const type = Object.keys(PAYMENT_LABELS).find(key => PAYMENT_LABELS[key].toLowerCase() === label.toLowerCase());
  if (label && !type) throw new Error(`Unknown Payment Type: ${label}`);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const day = answer('Training day');
  const dayNumber = day ? days.findIndex(name => name.toLowerCase() === day.toLowerCase()) + 1 : '';
  if (day && !dayNumber) throw new Error(`Unknown Training day: ${day}`);
  const values = Object.fromEntries(CSV_COLUMNS.map(field => [field, '']));
  Object.assign(values, {
    id: answer('Club ID'), name: answer('Club name'), sport: answer('Sport or activity'),
    contact: answer('Contact email'), 'onlineProfile.url': answer('Website or social link'),
    beginnerFriendly: boolean('Beginner friendly?'), kitRequired: boolean('Kit requirements for newcomers?'),
    kitDetails: answer('Kit Details:'), genderSpecific: boolean('Gender-specific?'),
    genderEligibility: answer('Gender eligibility — if applicable'), description: answer('About the club'),
    'price.type': type || 'unknown', 'price.amount': type === 'per_session' ? answer('Session Price (£)') : ['monthly_fee', 'annual_fee'].includes(type) ? answer('Membership amount (£)') : '',
    bookingRequired: boolean('Booking required?'), tasterSessionCount: answer('How many free taster sessions do you offer newcomers?'),
    participatesInLeague: boolean('Participate in a league?'), 'participatingLeagues.name': answer('League name').split(/;|\r?\n/).map(name => name.trim()).filter(Boolean).join('\n')
  });
  // FALSE session ID denotes a club without confirmed sessions, not an event.
  if (!answer('Session ID') && ['Training day', 'Session address', 'Session Postcode', 'Start time'].some(heading => answer(heading))) {
    throw new Error('Session ID is required when a row contains session information.');
  }
  if (answer('Session ID')) Object.assign(values, {
    'sessions.id': answer('Session ID'), 'sessions.title': answer('Session Name'),
    'sessions.dayOfWeek': String(dayNumber), 'sessions.startTime': answer('Start time'), 'sessions.endTime': answer('End time'),
    'sessions.meetingPoint': answer('Session address'), 'sessions.postcode': answer('Session Postcode'),
    'sessions.specialConsiderations': answer('Any extra session info?')
  });
  return values;
}
