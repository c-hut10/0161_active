import { escapeHtml } from './club-formatting.mjs';

/* Saved-club controls: share safe, accessible markup between profiles and club lists. */
export function favouriteButton(club) {
  return `<button type="button" class="club-favourite" data-favourite-id="${escapeHtml(club.id)}" data-club-name="${escapeHtml(club.name)}" aria-pressed="false" aria-label="Save To Calendar: ${escapeHtml(club.name)}" title="Save To Calendar" hidden>Save To Calendar</button>`;
}
