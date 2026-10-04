export function verificationDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return { date: value, label: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) };
}

export function trainingTimesConfirmation(club) {
  return club.confirmed === true ? verificationDate(club.verification?.trainingTimesConfirmedAt) : null;
}

export function trainingTimesBadge(club) {
  const confirmation = trainingTimesConfirmation(club);
  if (!confirmation) return '';
  const label = `Training times confirmed by the club on ${confirmation.label}`;
  return `<span class="club-verified" role="img" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="m6.5 12 3.5 3.5 7.5-7.5" fill="none" stroke="#111211" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
}
