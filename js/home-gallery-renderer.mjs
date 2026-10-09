import { displaySportName, canonicalArea, escapeHtml } from './club-formatting.mjs';

export const GALLERY_IMAGE_LIMIT = 10;

/* Random order: the build chooses a photo set; visits shuffle only that existing set. */
export function shuffleGalleryItems(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

/* Initial gallery HTML: photos, captions and profile links arrive with the homepage. */
export function renderHomeGallery(clubs) {
  const selected = shuffleGalleryItems(clubs).slice(0, GALLERY_IMAGE_LIMIT);
  if (!selected.length) return '<p>No club photos are available yet.</p>';
  while (selected.length < GALLERY_IMAGE_LIMIT) selected.push(selected[selected.length % clubs.length]);
  const split = Math.ceil(selected.length / 2);
  return [selected.slice(0, split), selected.slice(split)].map((rowClubs, index) => {
    const duration = Math.max(50, rowClubs.length * 8 / 0.6);
    const phase = index === 1 ? -duration / (rowClubs.length * 2) : 0;
    const cards = duplicate => rowClubs.map(club => {
      const subtitle = [displaySportName(club.sport), canonicalArea(club.area)].filter(Boolean).join(' · ');
      return `<section class="gallery-card" data-club-id="${escapeHtml(club.id)}"${duplicate ? ' aria-hidden="true"' : ''}>
        <a href="/${escapeHtml(club.profilePath)}"${duplicate ? ' tabindex="-1"' : ''}>
          <img src="/${escapeHtml(club.imagePath)}" alt="${duplicate ? '' : escapeHtml(`${club.name} club photo`)}" loading="eager" decoding="async">
          <div class="gallery-caption"><h2>${escapeHtml(club.name)}</h2><p class="gallery-caption__details">${escapeHtml(subtitle)}</p></div>
        </a>
      </section>`;
    }).join('');
    return `<div class="gallery-row" aria-label="Featured clubs row ${index + 1}">
      <div class="gallery-track" style="--gallery-card-count:${rowClubs.length * 2};--roll-duration:${duration}s;--roll-phase-offset:${phase}s;">${cards(false)}${cards(true)}</div>
    </div>`;
  }).join('');
}
