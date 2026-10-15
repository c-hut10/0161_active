import { sportSlug } from './club-formatting.mjs';

export const LEAGUE_COVERAGES = { internal: 'Internal', local_county: 'Local/County league', regional: 'Regional', national: 'National' };

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

/* Retain every supported coverage, including a club's own members-only league. */
export function normaliseLeagues(value) {
  const unique = new Map();
  (Array.isArray(value) ? value : []).forEach(league => {
    const name = typeof league?.name === 'string' ? league.name.trim().replace(/\s+/g, ' ') : '';
    const teamName = typeof league?.teamName === 'string' ? league.teamName.trim().replace(/\s+/g, ' ') : '';
    if (!name || (!teamName && league.coverage !== 'internal') || !Object.hasOwn(LEAGUE_COVERAGES, league.coverage)) return;
    const key = JSON.stringify([name.toLocaleLowerCase('en-GB'), league.coverage, teamName.toLocaleLowerCase('en-GB')]);
    if (!unique.has(key)) {
      const entry = { teamName, name, leagueUrl: null, coverage: league.coverage };
      // Organiser links are independent of the team's own online profile.
      try { if (['https:', 'http:'].includes(new URL(league.leagueUrl).protocol)) entry.leagueUrl = league.leagueUrl; } catch {}
      // Team-specific source links preserve different teams' supplied online pages.
      try { if (['https:', 'http:'].includes(new URL(league.url).protocol)) entry.url = league.url; } catch {}
      unique.set(key, entry);
    }
  });
  return [...unique.values()];
}

/* Discovery includes local/county and regional leagues only; internal and national stay profile-only. */
export function discoverableLeagues(club) {
  return normaliseLeagues(club.participatingLeagues).filter(league => ['local_county', 'regional'].includes(league.coverage));
}

/* Profile and registration preview share the internal-league label. */
export function leagueProfileLabel(league) {
  return league.coverage === 'internal' ? `${league.name} · Internal` : league.name;
}

/* Profile labels: show each league once; team identities belong in league rosters. */
export function leagueNamesLabel(leagues) {
  const names = new Map();
  normaliseLeagues(leagues).forEach(league => {
    const key = league.name.toLocaleLowerCase('en-GB');
    if (!names.has(key)) names.set(key, leagueProfileLabel(league));
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
  /* Local roster placeholders link only when their real profile exists; never use a website fallback. */
  const profiles = clubs.filter(club => club.profilePath && club.profilePending !== true);
  const rosterClubs = clubs.map(club => {
    if (club.profilePending !== true) return club;
    const profile = profiles.find(candidate => sportSlug(candidate.sport) === sportSlug(club.sport)
      && (candidate.id === club.profileClubId || sportSlug(candidate.name) === sportSlug(club.name)));
    return profile ? { ...profile, participatingLeagues: club.participatingLeagues } : club;
  });
  rosterClubs.filter(club => sportSlug(club.sport) === sportSlug(sport) && club.hiddenFromSportList !== true).forEach(club => {
    discoverableLeagues(club).forEach(league => {
      const key = league.name.toLocaleLowerCase('en-GB');
      if (!records.has(key)) records.set(key, { name: league.name, coverage: league.coverage,
        url: leaguePageUrl(sport, league.name), leagueUrl: null, clubs: new Map(), teams: new Map() });
      const record = records.get(key);
      if (league.leagueUrl) {
        if (record.leagueUrl && new URL(record.leagueUrl).href !== new URL(league.leagueUrl).href) {
          throw new Error(`Conflicting organiser URLs for league: ${league.name}`);
        }
        record.leagueUrl = league.leagueUrl;
      }
      // Unassigned league teams have no known parent club and must not inflate club counts.
      if (club.teamOnly !== true) records.get(key).clubs.set(club.id, club);
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
