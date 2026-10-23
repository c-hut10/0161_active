import { formatPostcodes, sportSlug, displaySportName, formatPrice, formatMembership, genderEligibilityLabel, DAY_NAMES } from './club-formatting.mjs';
import { sessionTitle } from './session-details.mjs';
import { normaliseLeagues, leagueAnswers, LEAGUE_COVERAGES } from './club-leagues.mjs';

/* Questionnaire contract: CSV headings mirror JSON paths, with one session per row. */
export const CLUB_ANSWER_FIELDS = ['name', 'sport', 'beginnerFriendly', 'genderSpecific', 'genderEligibility', 'participatesInLeague', 'participatingLeagues.teamName', 'participatingLeagues.name', 'participatingLeagues.coverage', 'description', 'contact', 'onlineProfile.url',
  'price.type', 'price.amount', 'membership.period', 'membership.amount', 'membership.sessionAmount',
  'tasterSessionCount', 'bookingRequired', 'additionalInformation'];
export const SESSION_ANSWER_FIELDS = ['title', 'dayOfWeek', 'startTime', 'endTime',
  'meetingPoint', 'postcode', 'eligibility', 'specialConsiderations'];
export const CSV_COLUMNS = ['id', ...CLUB_ANSWER_FIELDS, ...SESSION_ANSWER_FIELDS.map(field => `sessions.${field}`)];
export const PAID_PRICE_TYPES = ['monthly_fee', 'annual_fee', 'per_session'];
export const MEMBERSHIP_PERIODS = ['monthly', 'annual'];
const text = value => String(value ?? '').trim();
const optional = value => text(value) || null;

/* Normalised answers: the form and CSV importer produce the same club/session fields. */
export function sessionAnswers(values) {
  const session = Object.fromEntries(SESSION_ANSWER_FIELDS.map(field => [field, optional(values[field])]));
  session.dayOfWeek = session.dayOfWeek ? Number(session.dayOfWeek) : null;
  session.meetingPoint = optional(formatPostcodes(session.meetingPoint));
  session.postcode = optional(formatPostcodes(session.postcode));
  session.title = sessionTitle(null, session);
  return session;
}

export function clubAnswers(values, sessions) {
  const type = text(values['price.type']) || 'unknown';
  const paid = PAID_PRICE_TYPES.includes(type);
  const url = optional(values['onlineProfile.url']);
  return {
    name: text(values.name), sport: sportSlug(values.sport), description: optional(values.description),
    // Club-wide beginner welcome is independent of individual session experience levels.
    beginnerFriendly: values.beginnerFriendly === 'yes' ? true : values.beginnerFriendly === 'no' ? false : null,
    // Unknown stays unknown; free text is stored only for a gender-specific club.
    genderSpecific: values.genderSpecific === 'yes' ? true : values.genderSpecific === 'no' ? false : null,
    genderEligibility: values.genderSpecific === 'yes' ? optional(values.genderEligibility) : null,
    participatesInLeague: values.participatesInLeague === 'yes' ? true : values.participatesInLeague === 'no' ? false : null,
    participatingLeagues: values.participatesInLeague === 'yes' ? normaliseLeagues(leagueAnswers(values)) : [],
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
    bookingRequired: text(values.bookingRequired) === 'yes' ? true : text(values.bookingRequired) === 'no' ? false : paid ? null : false,
    additionalInformation: optional(values.additionalInformation), sessions: sessions.map(sessionAnswers)
  };
}

/* CSV output: quote multiline answers and protect spreadsheet cells from formula interpretation. */
export function csvCell(value) {
  let cell = String(value ?? '');
  if (/^[=+@-]/.test(cell)) cell = `'${cell}`;
  return /[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}
export function submissionCsv(values, sessions, id = '') {
  const rows = (sessions.length ? sessions : [{}]).map(session => CSV_COLUMNS.map(column => {
    const value = column === 'id' ? id : column.startsWith('sessions.') ? session[column.slice(9)] : values[column];
    return csvCell(value);
  }).join(','));
  return [CSV_COLUMNS.join(','), ...rows].join('\r\n') + '\r\n';
}

/* One readable representation for the final review and Netlify notification summary. */
export function submissionReview(club) {
  const supplied = value => text(value) || 'Not supplied';
  const yesNo = value => value === true ? 'Yes' : value === false ? 'No' : 'Not supplied';
  const sections = [
    { title: 'Club', step: 0, lines: [
      `Name: ${supplied(club.name)}`, `Sport: ${supplied(displaySportName(club.sport))}`,
      `Beginners welcome: ${yesNo(club.beginnerFriendly)}`,
      `Gender eligibility: ${supplied(genderEligibilityLabel(club))}`,
      `Description: ${supplied(club.description)}`
    ] },
    { title: 'Cost', step: 0, lines: [
      `Price: ${formatPrice(club, { compact: true, minimumFractionDigits: 0 })}`,
      ...(club.membership ? [`Optional membership: ${formatMembership(club, { minimumFractionDigits: 0 })}`] : []),
      ...(PAID_PRICE_TYPES.includes(club.price.type) ? [
        `Taster sessions: ${club.tasterSessionCount ?? 'Not supplied'}`,
        `Booking required: ${yesNo(club.bookingRequired)}`
      ] : [])
    ] },
    { title: 'Leagues', step: 0, lines: [
      `Participates in leagues: ${yesNo(club.participatesInLeague)}`,
      ...club.participatingLeagues.map(league => [league.teamName, league.name, LEAGUE_COVERAGES[league.coverage]].filter(Boolean).join(' — '))
    ] },
    { title: 'Training', step: 1, lines: club.sessions.flatMap((session, index) => [
      `${index + 1}. ${session.title}`,
      `${DAY_NAMES[session.dayOfWeek] || 'Day not supplied'} · ${[session.startTime, session.endTime].filter(Boolean).join('–') || 'Time not supplied'}`,
      `Location: ${supplied([session.meetingPoint, session.postcode].filter(Boolean).join(', '))}`,
      `Eligibility: ${supplied(session.eligibility)}`,
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
