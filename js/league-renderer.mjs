import { escapeHtml } from './club-formatting.mjs';
import { leagueRecords, hasRecordedLeagues, LEAGUE_COVERAGES } from './club-leagues.mjs';
import { clubTrainingAreas } from './club-areas.mjs';

/* Team links: local teams open their club profile; guests use their supplied website. */
export function leagueTeamUrl(team) {
  const href = team.club.profilePath ? `/${team.club.profilePath}` : team.url;
  if (!href) return '';
  try { return ['http:', 'https:'].includes(new URL(href, 'https://0161active.co.uk').protocol) ? href : ''; }
  catch { return ''; }
}

/* Guest websites open separately; share this rule across glossary and league-page links. */
function leagueTeamLinkAttributes(team) {
  return team.club.profilePath ? '' : ' target="_blank" rel="noopener noreferrer" aria-description="Opens in a new tab"';
}

/* League pages identify both team and parent club without inventing team-specific schedules. */
export function renderLeagueTeamRows(league, { animated = false, namesOnly = false } = {}) {
  return [...league.teams].sort((a, b) => a.teamName.localeCompare(b.teamName)).map((team, index) => {
    const href = leagueTeamUrl(team);
    const linkAttributes = leagueTeamLinkAttributes(team);
    const title = escapeHtml(team.teamName);
    // Compact glossary bars contain only a clickable team name.
    if (namesOnly) return `<li${animated ? ` style="--team-order:${index}"` : ''}><div class="league-team-name-bar">${href ? `<a class="sport-club-name" href="${escapeHtml(href)}"${linkAttributes}>${title}</a>` : `<span>${title}</span>`}</div></li>`;
    return `<li${animated ? ` style="--team-order:${index}"` : ''}><article class="sport-club-row league-team-row">
      <span class="sport-club-row__number" aria-hidden="true"></span>
      <div class="sport-club-row__details"><h3>${href ? `<a class="sport-club-name" href="${escapeHtml(href)}"${linkAttributes}>${title}</a>` : title}</h3></div>
      <p class="sport-club-row__sessions league-team-club"><span>CLUB</span>${escapeHtml(team.club.name)}</p>
      <p class="sport-club-row__area">${escapeHtml(clubTrainingAreas(team.club).join(' · '))}</p>
      ${href ? `<a class="sport-club-link" href="${escapeHtml(href)}"${linkAttributes} aria-label="Visit ${escapeHtml(team.club.name)}">↗</a>` : ''}
    </article></li>`;
  }).join('');
}

/* Local league row: prepare page addresses but activate links only for existing league pages. */
export function renderLocalLeagues(clubs, sport, availableUrls = new Set(), leagueGuests = []) {
  const records = leagueRecords([...clubs, ...leagueGuests], sport);
  if (!hasRecordedLeagues(records.length)) return '';
  const cards = records.map(league => {
    const content = `<p class="league-card__eyebrow">${escapeHtml(LEAGUE_COVERAGES[league.coverage].toUpperCase())}</p>
      <h3>${availableUrls.has(league.url) ? `<a href="${escapeHtml(league.url)}">${escapeHtml(league.name)}</a>` : escapeHtml(league.name)}</h3>
      <p class="league-card__count">${league.clubs.length} ${league.clubs.length === 1 ? 'club' : 'clubs'} · ${league.teams.length} ${league.teams.length === 1 ? 'team' : 'teams'}</p>`;
    // The same numbered team bars serve league pages and animated glossary rosters.
    const teams = renderLeagueTeamRows(league, { animated: true, namesOnly: true });
    return `<article class="league-card" data-league-url="${escapeHtml(league.url)}">${content}<details class="league-card__teams"><summary>View teams</summary><ol class="sport-club-list" aria-label="Teams in ${escapeHtml(league.name)}">${teams}</ol></details></article>`;
  }).join('');
  return `<section class="local-leagues" aria-labelledby="local-leagues-title">
    <h2 id="local-leagues-title">Local leagues</h2>
    <div class="local-leagues__grid">${cards}</div>
  </section>`;
}
