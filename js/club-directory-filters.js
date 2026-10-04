/* Match the calendar's price types and club/session area filtering. */
export const PRICE_TYPE_LABELS = {
  free: 'Free', monthly_fee: 'Monthly fee', annual_fee: 'Annual fee',
  per_session: 'Per-session fee', paid: 'Paid', unknown: 'Price not confirmed'
};
export const PRICE_TYPE_ORDER = ['free', 'monthly_fee', 'annual_fee', 'per_session', 'paid', 'unknown'];
export function priceType(club) { return club.price?.type || 'unknown'; }
export function sportName(value) {
  const title = String(value || 'Sport').replace(/\b\w/g, letter => letter.toUpperCase());
  return title.toLowerCase() === 'running' ? 'Run Club' : title;
}
export function matchesClubFilters(club, { sport = 'all', price = 'all', area = 'all' }) {
  return (sport === 'all' || club.sport === sport)
    && (price === 'all' || priceType(club) === price)
    && (area === 'all' || club.area === area || (club.sessions || []).some(session => (session.area || club.area) === area));
}
export function priceLabel(club) {
  const price = club.price;
  if (!price || price.type === 'unknown') return 'Price not confirmed';
  if (price.type === 'free') return 'Free';
  if (Number.isFinite(price.amount)) {
    const amount = new Intl.NumberFormat('en-GB', {style:'currency',currency:price.currency || 'GBP'}).format(price.amount);
    const period = {monthly_fee:'per month',annual_fee:'per year',per_session:'per session'}[price.type] || price.period;
    return period ? `${amount} ${period}` : amount;
  }
  const labels = {monthly_fee:'Monthly fee',annual_fee:'Annual fee',per_session:'Per-session fee'};
  return labels[price.type] ? `${labels[price.type]} · amount not listed` : 'Paid · amount not listed';
}
export function validCoordinates(point) {
  return point && typeof point.lat === 'number' && typeof point.lon === 'number'
    && Number.isFinite(point.lat) && Number.isFinite(point.lon)
    && point.lat >= -90 && point.lat <= 90 && point.lon >= -180 && point.lon <= 180;
}
