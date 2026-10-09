import { sportSlug } from './club-formatting.mjs';

export const LEAGUE_COVERAGES = { local_county: 'Local/County league', regional: 'Regional', national: 'National' };

/* Pair names and coverage in CSV cells without multiplying the club's session rows. */
export function leagueAnswers(values) {
  const lines = value => String(value || '').trim() ? String(value).split(/\r?\n/).map(item => item.trim()) : [];
  const names = lines(values['participatingLeagues.name']);
  const coverages = lines(values['participatingLeagues.coverage']);
  const teams = lines(values['participatingLeagues.teamName']);
  return Array.from({ length: Math.max(names.length, coverages.length, teams.length) }, (_, index) => ({
    teamName: teams[index] || '', name: names[index] || '', coverage: coverages[index] || ''
  }));
}

/* Retain valid national participation as well as local/county and regional records. */
export function normaliseLeagues(value) {
  const unique = new Map();
  (Array.isArray(value) ? value : []).forEach(league => {
    const name = typeof league?.name === 'string' ? league.name.trim().replace(/\s+/g, ' ') : '';
    const teamName = typeof league?.teamName === 'string' ? league.teamName.trim().replace(/\s+/g, ' ') : '';
    if (!name || !teamName || !Object.hasOwn(LEAGUE_COVERAGES, league.coverage)) return;
    const key = JSON.stringify([name.toLocaleLowerCase('en-GB'), league.coverage, teamName.toLocaleLowerCase('en-GB')]);
    if (!unique.has(key)) {
      const entry = { teamName, name, coverage: league.coverage };
      // Team-specific source links preserve different teams' supplied online pages.
      try { if (['https:', 'http:'].includes(new URL(league.url).protocol)) entry.url = league.url; } catch {}
      unique.set(key, entry);
    }
  });
  return [...unique.values()];
}

/* National league names are profile-only and do not create glossary cards or counts. */
export function discoverableLeagues(club) {
  return normaliseLeagues(club.participatingLeagues).filter(league => league.coverage !== 'national');
}

/* Profile labels: show each league once; team identities belong in league rosters. */
export function leagueNamesLabel(leagues) {
  const names = new Map();
  normaliseLeagues(leagues).forEach(league => {
    const key = league.name.toLocaleLowerCase('en-GB');
    if (!names.has(key)) names.set(key, league.name);
  });
  return [...names.values()].join(' · ');
}

/* League routes belong to their sport; no additional index pages are introduced. */
export function leaguePageUrl(sport, name) {
  return `/html/leagues/${sportSlug(sport)}/${sportSlug(name) || 'league'}.html`;
}

/* Local league cards count each visible participating club once. */
export function leagueRecords(clubs, sport) {
  const records = new Map();
  clubs.filter(club => sportSlug(club.sport) === sportSlug(sport) && club.hiddenFromSportList !== true).forEach(club => {
    discoverableLeagues(club).forEach(league => {
      const key = league.name.toLocaleLowerCase('en-GB');
      if (!records.has(key)) records.set(key, { name: league.name, coverage: league.coverage,
        url: leaguePageUrl(sport, league.name), clubs: new Map(), teams: new Map() });
      records.get(key).clubs.set(club.id, club);
      records.get(key).teams.set(JSON.stringify([club.id, league.teamName.toLocaleLowerCase('en-GB')]), { teamName: league.teamName, url: league.url || club.onlineProfile?.url, club });
    });
  });
  return [...records.values()].map(record => ({ ...record, clubs: [...record.clubs.values()], teams: [...record.teams.values()] }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

/* Shared visibility: directory counts and sport league sections stay dormant when empty. */
export function hasRecordedLeagues(count) {
  return Number.isInteger(count) && count > 0;
}
