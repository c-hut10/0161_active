import { displaySportName, sportGlossaryUrl, escapeHtml as escapeDirectoryText } from './club-formatting.mjs';
import { hasRecordedLeagues } from './club-leagues.mjs';

/* Directory HTML: the build and browser search use the same sport cards. */
export function renderSportsDirectory(records) {
  const accessibleEntries = records.filter(sport => sport.accessible);
  const otherEntries = records.filter(sport => !sport.accessible);
  const groups = new Map();
  otherEntries.forEach(sport => {
    const letter = displaySportName(sport.name).charAt(0).toLocaleUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(sport);
  });

  const renderCards = entries => `<div class="sports-directory-grid">${entries.map(sport => `<a class="sports-directory-card" href="${escapeDirectoryText(sportGlossaryUrl(sport.slug, null, 'glossary.html'))}">
      <span class="sports-directory-card__name">${escapeDirectoryText(displaySportName(sport.name))}</span>
      <span class="sports-directory-card__meta"><span class="sports-directory-card__counts"><span>${sport.clubCount} ${sport.clubCount === 1 ? 'CLUB' : 'CLUBS'}</span>${hasRecordedLeagues(sport.leagueCount) ? `<span class="sports-directory-card__leagues">${sport.leagueCount} LOCAL ${sport.leagueCount === 1 ? 'LEAGUE' : 'LEAGUES'}</span>` : ''}</span><span class="sports-directory-card__arrow" aria-hidden="true">↗</span></span>
    </a>`).join('')}</div>`;
  const accessibleSection = accessibleEntries.length ? `<section class="sports-accessible-group" aria-labelledby="sports-accessible-title">
    <h2 id="sports-accessible-title" class="sports-accessible-group__title">ACCESSIBLE SPORTS</h2>
    ${renderCards(accessibleEntries)}
  </section>` : '';
  const otherSection = otherEntries.length ? `<section class="sports-other-group" aria-labelledby="sports-other-title">
    <h2 id="sports-other-title" class="sports-accessible-group__title">OTHER SPORTS</h2>
    ${[...groups.entries()].map(([letter, entries]) => `<section class="sports-letter-group" aria-labelledby="sports-letter-${letter}">
      <h3 id="sports-letter-${letter}" class="sports-letter-group__letter">${escapeDirectoryText(letter)}</h3>
      ${renderCards(entries)}
    </section>`).join('')}
  </section>` : '';

  return accessibleSection + otherSection;
}
