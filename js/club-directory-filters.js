import { canonicalArea, displaySportName, formatPrice, formatMembership, clubSports, sportSlug, timeMinutes } from './club-formatting.mjs';
export { PRICE_TYPE_LABELS, PRICE_TYPE_ORDER, priceType } from './club-formatting.mjs';
import { priceType } from './club-formatting.mjs';
import { clubTrainingAreas } from './club-areas.mjs';
import { sessionPricingClub } from './session-details.mjs';

/* Calendar pricing: retain the standard charge and explain optional member pricing together. */
export function priceLabel(club, session) {
  const pricedClub = sessionPricingClub(club, session);
  const membership = pricedClub.price?.type === 'free' ? '' : formatMembership(pricedClub);
  return [formatPrice(pricedClub), membership ? `Members: ${membership}` : ''].filter(Boolean).join(' · ');
}

/* Price filters match the actual session cost, including clubs offering paid and free sessions. */
export function matchesSessionPrice(club, session, price = 'all') {
  const pricedClub = sessionPricingClub(club, session);
  return price === 'all' || priceType(pricedClub) === price
    || (price === 'membership' && (['monthly_fee', 'annual_fee'].includes(priceType(pricedClub)) || Boolean(formatMembership(pricedClub))));
}

/* Compare recorded GBP charges only; annual membership budgets cover dues, not extra session fees. */
export function matchesSessionBudget(club, session, price = 'all', maximum = '') {
  if (!['per_session', 'membership'].includes(price) || String(maximum).trim() === '') return true;
  const limit = Number(maximum);
  if (!Number.isFinite(limit) || limit < 0) return false;
  const pricedClub = sessionPricingClub(club, session);
  const charge = pricedClub.price;
  if ((charge?.currency || 'GBP') !== 'GBP') return false;
  const amounts = [];
  if (price === 'per_session' && charge?.type === 'per_session') amounts.push(charge.amount);
  if (price === 'membership') {
    if (charge?.type === 'annual_fee') amounts.push(charge.amount);
    if (charge?.type === 'monthly_fee' && Number.isFinite(charge.amount)) amounts.push(charge.amount * 12);
    if (formatMembership(pricedClub)) {
      amounts.push(pricedClub.membership.amount * (pricedClub.membership.period === 'monthly' ? 12 : 1));
    }
  }
  return amounts.some(amount => Number.isFinite(amount) && amount >= 0 && amount <= limit + 1e-8);
}

/* Existing consumers share the same sport labels and canonical area comparisons. */
export function sportName(value) {
  return displaySportName(String(value || '').replaceAll('-', ' '), { titleCase: true, fallback: 'Sport' });
}
export function matchesClubFilters(club, { sport = 'all', price = 'all', area = 'all' }) {
  return (sport === 'all' || clubSports(club).includes(sportSlug(sport)))
    && ((club.sessions || []).length
      ? club.sessions.some(session => matchesSessionPrice(club, session, price))
      : matchesSessionPrice(club, null, price))
    && (area === 'all' || clubTrainingAreas(club).includes(canonicalArea(area)));
}
export function validCoordinates(point) {
  return point && typeof point.lat === 'number' && typeof point.lon === 'number'
    && Number.isFinite(point.lat) && Number.isFinite(point.lon)
    && point.lat >= -90 && point.lat <= 90 && point.lon >= -180 && point.lon <= 180;
}

/* Clock windows are shared by the calendar and homepage map, including midnight. */
export function matchesSessionStartTime(session, preferred = '', flexibility = 0) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(preferred)) return true;
  const minutes = timeMinutes(session.startTime);
  if (minutes === null) return false;
  const difference = Math.abs(minutes - timeMinutes(preferred));
  return Math.min(difference, 1440 - difference) <= Number(flexibility);
}
