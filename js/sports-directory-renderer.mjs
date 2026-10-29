import { displaySportName, sportGlossaryUrl, escapeHtml as escapeDirectoryText } from './club-formatting.mjs';

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

  const renderCards = entries => `<div class="sports-directory-grid">${entries.map(sport => `<a class="sports-directory-card" data-sport="${escapeDirectoryText(sport.slug)}" href="${escapeDirectoryText(sportGlossaryUrl(sport.slug, null, 'glossary.html'))}">
      <svg class="sports-directory-card__power" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v10M6.3 5.3a9 9 0 1 0 11.4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <span class="sports-directory-card__name">${escapeDirectoryText(displaySportName(sport.name))}</span>
      <span class="sports-directory-card__meta"><span class="sports-directory-card__counts"><span>${sport.clubCount} ${sport.clubCount === 1 ? 'CLUB' : 'CLUBS'}</span></span><span class="sports-directory-card__arrow" aria-hidden="true">↗</span></span>
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
