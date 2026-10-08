/* Weekday labels: keep calendar columns, form summaries and club schedules consistent. */
export const WEEK_DAYS = [
  { number: 1, name: 'Monday', short: 'MON' },
  { number: 2, name: 'Tuesday', short: 'TUE' },
  { number: 3, name: 'Wednesday', short: 'WED' },
  { number: 4, name: 'Thursday', short: 'THU' },
  { number: 5, name: 'Friday', short: 'FRI' },
  { number: 6, name: 'Saturday', short: 'SAT' },
  { number: 7, name: 'Sunday', short: 'SUN' }
];
export const DAY_NAMES = ['', ...WEEK_DAYS.map(day => day.name)];
export const DAY_NUMBERS = Object.fromEntries(WEEK_DAYS.map(day => [day.short.toLowerCase(), day.number]));

/* Display helpers: escape submitted text and format the same session time in every view. */
export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

export function sessionTime(session) {
  if (!session.startTime) return 'Time TBC';
  return session.endTime ? `${session.startTime}–${session.endTime}` : session.startTime;
}

/* Postcodes: uppercase full UK codes and put one space before their final three characters. */
export function formatPostcodes(value) {
  return String(value || '').replace(
    /\b(GIR|[A-Z]{1,2}\s*\d(?:\s*[A-Z\d])?)\s*(\d\s*[A-Z]\s*[A-Z])\b/gi,
    (_, outward, inward) => `${outward.replace(/\s/g, '').toUpperCase()} ${inward.replace(/\s/g, '').toUpperCase()}`
  );
}

/* Sport labels and routes: keep public names separate from stable data identifiers. */
export function sportSlug(value) {
  const slug = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // Previously shared links can still use the old sport identifier.
  return slug === 'running' ? 'run-club' : slug;
}

export function displaySportName(value, { titleCase = false, fallback = '' } = {}) {
  const name = String(value || fallback);
  if (sportSlug(name) === 'run-club') return 'Run Club';
  return titleCase ? name.replace(/\b\w/g, letter => letter.toUpperCase()) : name;
}

/* Area names: use City Centre and group directional Didsbury variants consistently. */
export function canonicalArea(value) {
  const area = String(value || '').trim();
  if (/^central manchester$/i.test(area)) return 'City Centre';
  return /didsbury/i.test(area) ? 'Didsbury' : area;
}

export function sportGlossaryUrl(sport, area, base = '../sports/glossary.html') {
  const params = new URLSearchParams({ sport: sportSlug(sport) });
  if (area) params.set('area', canonicalArea(area));
  return `${base}?${params.toString()}`;
}

/* Online club actions: validate a web URL once and identify its public button label. */
export function onlineProfileAction(value, base) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim(), base);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    const belongsTo = domain => host === domain || host.endsWith(`.${domain}`);
    const label = belongsTo('instagram.com') ? 'INSTAGRAM'
      : belongsTo('facebook.com') || belongsTo('fb.com') ? 'FACEBOOK' : 'WEBSITE';
    return { href: url.href, label };
  } catch {
    return null;
  }
}

/* Pricing: share fee types and currency formatting while retaining each view's wording. */
export const PRICE_TYPE_LABELS = {
  free: 'Free', monthly_fee: 'Monthly fee', annual_fee: 'Annual fee',
  per_session: 'Per-session fee', paid: 'Paid', unknown: 'Price not confirmed'
};
export const PRICE_TYPE_ORDER = ['free', 'monthly_fee', 'annual_fee', 'per_session', 'paid', 'unknown'];
const PRICE_PERIODS = {
  monthly_fee: { compact: '/month', full: 'per month' },
  annual_fee: { compact: '/year', full: 'per year' },
  per_session: { compact: '/session', full: 'per session' }
};

export function priceType(club) { return club.price?.type || 'unknown'; }

export function formatPrice(club, {
  compact = false, unknown = 'Price not confirmed', free = 'Free',
  missingAmount = 'amount not listed', minimumFractionDigits = 2
} = {}) {
  const price = club.price;
  if (!price || price.type === 'unknown') return unknown;
  if (price.type === 'free') return free;
  if (Number.isFinite(price.amount)) {
    const amount = new Intl.NumberFormat('en-GB', {
      style: 'currency', currency: price.currency || 'GBP', minimumFractionDigits,
      maximumFractionDigits: 2
    }).format(price.amount);
    const period = PRICE_PERIODS[price.type]?.[compact ? 'compact' : 'full'] || price.period;
    return period ? `${amount}${compact ? '' : ' '}${period}` : amount;
  }
  return `${PRICE_TYPE_LABELS[price.type] || 'Paid'} · ${missingAmount}`;
}
