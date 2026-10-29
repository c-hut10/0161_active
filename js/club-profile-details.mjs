import { displaySportName, escapeHtml, onlineProfileAction, genderEligibilityLabel, clubSports, formatPrice, formatMembership } from './club-formatting.mjs';
import { clubSessionPriceLabel } from './session-details.mjs';
import { paymentOptions, paymentOptionParts } from './club-payment-options.mjs';
import { clubTrainingAreas } from './club-areas.mjs';
import { normaliseLeagues, leaguePageUrl, leagueProfileLabel } from './club-leagues.mjs?v=20261026-sheet-fields';

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
export function renderProfileDetails(club, { onlineAction = null, preview = false } = {}) {
  const detailRow = (label, value) => `<div class="profile-detail-row"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`;
  const profileSports = clubSports(club);
  const sports = profileSports.map(sport => displaySportName(
    sport === profileSports[0] ? club.sport.replaceAll('-', ' ') : sport.replaceAll('-', ' '), { titleCase: true }
  ));
  const leagues = renderProfileLeagues(club, preview);
  const gender = genderEligibilityLabel(club);
  return [
    detailRow('SPORT', sports.join(' · ') || (preview ? 'Your sport' : 'To confirm')),
    gender ? detailRow('GENDER ELIGIBILITY', gender) : '',
    detailRow('AREA', clubTrainingAreas(club).join(' · ') || 'Area to confirm'),
    club.tasterNotes ? detailRow('TASTER DETAILS', club.tasterNotes) : '',
    Number.isInteger(club.tasterSessionCount) && club.tasterSessionCount > 0
      ? detailRow('TASTER SESSION(S)', String(club.tasterSessionCount)) : '',
    leagues ? `<div class="profile-detail-row"><dt>LEAGUE(S)</dt><dd>${leagues}</dd></div>` : ''
  ].join('');
}

/* Payment section: reuse the same prices and optional payment notes in both profile views. */
export function renderProfileCost(club) {
  const row = (label, price, detail = '') => `<tr><th scope="row">${escapeHtml(label)}</th><td><strong class="profile-cost__amount">${escapeHtml(price)}</strong>${detail ? `<span class="profile-cost__details">${escapeHtml(detail)}</span>` : ''}</td></tr>`;
  const named = Array.isArray(club.pricingOptions) ? club.pricingOptions.filter(option => typeof option === 'string' && option.trim()) : [];
  const membership = formatMembership(club, { compact: true });
  let prices;
  // Named options and session-specific charges remain separate, visible alternatives.
  if (named.length) prices = named.map(option => {
    return row(...paymentOptionParts(option));
  }).join('');
  else if ((club.sessions || []).some(session => session.price)) {
    const seen = new Set();
    prices = club.sessions.map(session => {
      const price = formatPrice({ ...club, price: session.price || club.price }, { compact: true });
      if (price === 'Contact club') return '';
      const label = session.title || 'Session';
      const key = `${label}/${session.dayOfWeek}/${price}`;
      if (seen.has(key)) return ''; seen.add(key);
      const day = ['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][session.dayOfWeek];
      return row([day, label].filter(Boolean).join(' · '), price);
    }).join('');
  } else {
    const label = membership ? 'Pay as you go' : club.price?.type === 'free' ? 'Sessions' : club.price?.type === 'monthly_fee' ? 'Monthly membership' : club.price?.type === 'annual_fee' ? 'Annual membership' : 'Pay as you go';
    const price = clubSessionPriceLabel({ ...club, membership: null }, { compact: true });
    prices = price === 'Contact club' ? '' : row(label, price);
  }
  if (membership) prices += row(club.membership.period === 'monthly' ? 'Monthly membership' : 'Annual membership', membership,
    club.membership.sessionAmount === 0 ? 'Sessions included' : 'Includes the membership fee and member session charge');
  prices += paymentOptions(club.paymentOptions).map(option => row(...paymentOptionParts(option))).join('');
  const notes = club.pricingNotes?.trim();
  // Contact links prefer the supplied email, then fall back to the public online profile.
  const actions = clubProfileActions(club);
  const pricingContact = actions.contact || actions.online;
  const notesHtml = escapeHtml(notes || '').replaceAll('\n', '<br>').replace(/Contact Club/gi, label =>
    pricingContact ? `<a class="profile-booking-link" href="${escapeHtml(pricingContact.href)}">${label}</a>` : label);
  let paymentNotes = notes && notes.toLowerCase() !== 'contact club' && notes !== clubSessionPriceLabel(club, { compact: true }) && !notes.includes('Contact Club for Session/Membership details') ? `<p class="profile-cost__notes">${notesHtml}</p>` : '';
  if (paymentNotes && /^Membership:\s*\S/i.test(notes)) {
    prices += row('Membership', notes.replace(/^Membership:\s*/i, ''));
    paymentNotes = '';
  }
  // Missing pricing always has a useful contact route without replacing supplied payment notes.
  const contactButton = pricingContact ? `<a class="profile-action profile-action--secondary" href="${escapeHtml(pricingContact.href)}">CONTACT</a>` : '';
  const contact = `<div class="profile-cost__contact"><p class="profile-cost__notes">For more details on session/membership information:</p>${contactButton}</div>`;
  // Booking is displayed only when required; payment on arrival is never inferred.
  const bookingContact = actions.contact || actions.online;
  const bookingLabel = bookingContact ? `<a class="profile-booking-link" href="${escapeHtml(bookingContact.href)}">Contact club</a>` : 'Contact club';
  const booking = club.bookingRequired === true ? `<div class="profile-cost__booking"><h3>Booking required</h3><p>${bookingLabel} for booking information</p>${club.bookingNotes ? `<p>${escapeHtml(club.bookingNotes)}</p>` : ''}</div>` : '';
  const table = prices ? `<table class="profile-cost__table"><caption class="profile-cost__caption">Payment options</caption><thead><tr><th scope="col">Payment option</th><th scope="col">Details</th></tr></thead><tbody>${prices}</tbody></table>` : '';
  return `${table}${paymentNotes}${booking}${contact}`;
}

/* Only an explicit booking requirement adds Booking to the payment heading. */
export function profileCostHeading(club) {
  return club.bookingRequired === true ? 'Costs and Booking' : 'Costs';
}
