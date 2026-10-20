import { escapeHtml } from './club-formatting.mjs';

/* Saved-club controls: share safe, accessible markup between profiles and club lists. */
export function favouriteButton(club) {
  return `<button type="button" class="club-favourite" data-favourite-id="${escapeHtml(club.id)}" data-club-name="${escapeHtml(club.name)}" aria-pressed="false" aria-label="Save club: ${escapeHtml(club.name)}" title="Save club" hidden><svg class="club-favourite-star" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.3.9-4.55 4.45 1.07 6.28L12 17.36l-5.62 2.97 1.07-6.28L2.9 9.6l6.3-.9Z"/></svg></button>`;
}
