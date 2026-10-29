import { DAY_NAMES, displaySportName, escapeHtml, sportSlug } from './club-formatting.mjs';

// Associate only the currently filtered sessions with their actual ward, never every club session.
export function groupWardSessions(entries, postcodes) {
  const groups = new Map();
  let unassigned = 0;
  for (const { club, sessions } of entries || []) {
    for (const session of sessions) {
      const match = (session.postcode || session.meetingPoint || '').match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i);
      const postcode = match ? match[0].replace(/\s/g, '').toUpperCase() : '';
      const code = postcodes[postcode];
      if (!code) {
        unassigned++;
        continue;
      }
      if (!groups.has(code)) groups.set(code, new Map());
      const group = groups.get(code);
      if (!group.has(club.id)) group.set(club.id, { club, sessions: [] });
      group.get(club.id).sessions.push(session);
    }
  }
  return { groups, unassigned };
}

// A club gets one result per sport/day; multiple sessions on that day do not duplicate the card.
export function wardClubItems(group) {
  const items = [];
  for (const { club, sessions } of group.values()) {
    const seen = new Set();
    for (const session of sessions) {
      const sport = sportSlug(session.sport || club.sport);
      const key = `${sport}/${session.dayOfWeek}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ club, sport, day: session.dayOfWeek });
    }
  }
  return items.sort((a, b) => a.club.name.localeCompare(b.club.name, 'en-GB') || a.day - b.day);
}

export function renderWardClubList(group) {
  if (!group.size) return '<p class="map-zone-empty">No clubs match the current filters in this zone.</p>';
  const clubNumbers = new Map();
  let previousClubId;
  const items = wardClubItems(group).map(({ club, sport, day }) => {
    if (!clubNumbers.has(club.id)) clubNumbers.set(club.id, clubNumbers.size + 1);
    const number = previousClubId === club.id ? '' : clubNumbers.get(club.id);
    previousClubId = club.id;
    const eyebrow = `${displaySportName(sport.replaceAll('-', ' '), { titleCase: true })} · ${DAY_NAMES[day] || 'Day to confirm'}`;
    const name = escapeHtml(club.name);
    // Links stay on the site's generated profile routes, including for imported club names.
    const profile = String(club.profilePath || '').replace(/^\//, '');
    const title =
      profile.startsWith('html/') && !profile.includes('..')
        ? `<a href="/${escapeHtml(profile)}">${name}</a>`
        : `<span>${name}</span>`;
    return `<li><span class="map-zone-number">${number}</span><div class="map-zone-club-details"><p class="map-zone-eyebrow">${escapeHtml(eyebrow)}</p>${title}</div></li>`;
  });
  return `<ul class="map-zone-clubs">${items.join('')}</ul>`;
}
