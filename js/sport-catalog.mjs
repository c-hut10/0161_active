import { sportSlug } from './club-formatting.mjs';

/* Catalog visibility: menus, directories and direct glossary links share these rules. */
export function visibleSportRecords(catalog, clubs) {
  const list = value => Array.isArray(value) ? value : [];
  const accessible = new Set(list(catalog.accessibleSports).map(sportSlug));
  const placeholders = new Set(list(catalog.visibleWhenEmpty).map(sportSlug));
  const hidden = new Set(list(catalog.hiddenSports).map(sportSlug));
  const counts = new Map();
  list(clubs).filter(club => club.hiddenFromSportList !== true).forEach(club => {
    const slug = sportSlug(club.sport);
    if (slug) counts.set(slug, (counts.get(slug) || 0) + 1);
  });
  const names = new Map([...list(catalog.sports), ...list(catalog.accessibleSports)]
    .map(name => [sportSlug(name), name]));
  return [...names].map(([slug, name]) => ({
    name, slug, clubCount: counts.get(slug) || 0, accessible: accessible.has(slug)
  })).filter(sport => sport.slug && !hidden.has(sport.slug)
    && (sport.clubCount > 0 || placeholders.has(sport.slug)))
    .sort((a, b) => a.name.localeCompare(b.name));
}
