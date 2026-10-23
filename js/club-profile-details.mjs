import { displaySportName, formatMembership, escapeHtml, onlineProfileAction, genderEligibilityLabel, beginnerFriendlyLabel, clubSports } from './club-formatting.mjs';
import { clubSessionPriceLabel } from './session-details.mjs';
import { clubTrainingAreas } from './club-areas.mjs';
import { normaliseLeagues, leaguePageUrl, leagueProfileLabel } from './club-leagues.mjs';

/* Public actions: profiles and the registration preview use the same email and URL rules. */
export function clubProfileActions(club, pageUrl) {
  const email = club.contact?.trim() || '';
  const contact = email.includes('@') && !/^[a-z]+:/i.test(email)
    ? { label: 'CONTACT', href: new URL(`mailto:${email}`).href } : null;
  return { contact, online: onlineProfileAction(club.onlineProfile?.url, pageUrl) };
}

/* League names appear once; preview links wait until the application is published. */
function renderProfileLeagues(club, preview) {
  const leagues = new Map();
  normaliseLeagues(club.participatingLeagues).forEach(league => {
    const key = league.name.toLocaleLowerCase('en-GB');
    if (!leagues.has(key) || (!leagues.get(key).leagueUrl && league.leagueUrl)) leagues.set(key, league);
  });
  return [...leagues.values()].map(league => {
    const national = league.coverage === 'national';
    const href = preview || league.coverage === 'internal' ? null
      : national ? league.leagueUrl : club.sport ? leaguePageUrl(club.sport, league.name) : null;
    const label = escapeHtml(leagueProfileLabel(league));
    return href ? `<a class="profile-league-link" href="${escapeHtml(href)}"${national ? ' target="_blank" rel="noopener noreferrer" aria-description="Opens in a new tab"' : ''}>${label}</a>` : label;
  }).join(' · ');
}

/* Detail rows: one source owns labels, optional rows, prices and booking guidance in both views. */
export function renderProfileDetails(club, { onlineAction = null, timetableId = 'profile-week-title', preview = false } = {}) {
  const detailRow = (label, value) => `<div class="profile-detail-row"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`;
  const profileSports = clubSports(club);
  const sports = profileSports.map(sport => displaySportName(
    sport === profileSports[0] ? club.sport.replaceAll('-', ' ') : sport.replaceAll('-', ' '), { titleCase: true }
  ));
  const isPaidClub = ['monthly_fee', 'annual_fee', 'per_session', 'paid'].includes(club.price?.type);
  const leagues = renderProfileLeagues(club, preview);
  const gender = genderEligibilityLabel(club);
  const beginner = beginnerFriendlyLabel(club);
  const membership = formatMembership(club);
  const bookingContact = onlineAction
    ? `<a class="profile-booking-link" href="${escapeHtml(onlineAction.href)}" target="_blank" rel="noopener noreferrer" aria-description="Opens in a new tab">contact</a>` : 'contact';
  return [
    detailRow('SPORT', sports.join(' · ') || (preview ? 'Your sport' : 'To confirm')),
    gender ? detailRow('GENDER ELIGIBILITY', gender) : '',
    beginner ? detailRow('BEGINNER FRIENDLY', beginner) : '',
    leagues ? `<div class="profile-detail-row"><dt>LEAGUE(S)</dt><dd>${leagues}</dd></div>` : '',
    detailRow('AREA', clubTrainingAreas(club).join(' · ') || 'Area to confirm'),
    `<div class="profile-detail-row"><dt>TRAINING LOCATION(S)</dt><dd><a href="#${escapeHtml(timetableId)}">View Calendar</a></dd></div>`,
    detailRow('COST', clubSessionPriceLabel(club, { compact: true, unknown: 'Not listed', free: 'free', missingAmount: 'amount to confirm' })),
    membership ? detailRow('OPTIONAL MEMBERSHIP', membership) : '',
    club.pricingNotes ? detailRow('PRICING DETAILS', club.pricingNotes) : '',
    club.tasterNotes ? detailRow('TASTER DETAILS', club.tasterNotes) : '',
    club.bookingNotes ? detailRow('BOOKING DETAILS', club.bookingNotes) : '',
    isPaidClub && Number.isInteger(club.tasterSessionCount) && club.tasterSessionCount > 0
      ? detailRow('TASTER SESSION(S)', String(club.tasterSessionCount)) : '',
    isPaidClub && club.bookingRequired === true
      ? `<div class="profile-detail-row"><dt>BOOKING</dt><dd>Please ${bookingContact} the club for booking information</dd></div>` : ''
  ].join('');
}
