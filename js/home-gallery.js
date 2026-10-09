import { shuffleGalleryItems } from './home-gallery-renderer.mjs';

/* Gallery enhancement: shuffle the prerendered photos without fetching another set. */
function renderRandomClubs() {
  const gallery = document.querySelector('#club-gallery');
  if (!gallery) return;
  const pause = document.querySelector('[data-gallery-pause]');
  /* Pause/resume: translate the visible card position into a loop phase, including manual scrolling. */
  pause?.addEventListener('click', () => {
    const paused = !gallery.classList.contains('is-paused');
    const scrollPosition = gallery.scrollLeft;
    gallery.querySelectorAll('.gallery-track').forEach(track => {
      const cardWidth = track.querySelector('.gallery-card').getBoundingClientRect().width;
      if (paused) {
        const transform = getComputedStyle(track).transform;
        const offset = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41;
        track.style.setProperty('--paused-offset', String(offset / cardWidth));
      } else {
        const offset = Number(track.style.getPropertyValue('--paused-offset'));
        const loopCards = Number(track.style.getPropertyValue('--gallery-card-count')) / 2;
        const duration = parseFloat(track.style.getPropertyValue('--roll-duration'));
        // Whole-loop offsets are visually equivalent because the club sequence is repeated.
        const position = -offset + scrollPosition / cardWidth;
        const phase = ((position % loopCards) + loopCards) % loopCards;
        track.style.setProperty('--roll-phase-offset', `${-duration * phase / loopCards}s`);
        track.style.removeProperty('--paused-offset');
      }
    });
    gallery.classList.toggle('is-paused', paused);
    if (!paused) gallery.scrollLeft = 0;
    pause.setAttribute('aria-pressed', String(paused));
    pause.textContent = paused ? 'Resume gallery' : 'Pause gallery';
  });
  const sizeGallery = () => {
    gallery.style.setProperty('--gallery-card-width', `${gallery.clientWidth / 3}px`);
  };
  if (!CSS.supports('width', '1cqw')) {
    sizeGallery();
    if ('ResizeObserver' in window) new ResizeObserver(sizeGallery).observe(gallery);
    else window.addEventListener('resize', sizeGallery);
  }

  const tracks = [...gallery.querySelectorAll('.gallery-track')];
  const cards = shuffleGalleryItems([...gallery.querySelectorAll('.gallery-card:not([aria-hidden="true"])')]);
  if (!tracks.length || !cards.length) return;
  const split = Math.ceil(cards.length / 2);
  tracks.forEach((track, index) => {
    const rowCards = index === 0 ? cards.slice(0, split) : cards.slice(split);
    const duplicates = rowCards.map(card => {
      const copy = card.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelector('a').tabIndex = -1;
      copy.querySelector('img').alt = '';
      return copy;
    });
    track.replaceChildren(...rowCards, ...duplicates);
  });
  // Retain readable captions if a photo fails; no loading wait blocks the initial gallery.
  gallery.querySelectorAll('img').forEach(image => {
    image.decode().catch(() => image.closest('.gallery-card').classList.add('gallery-card--unavailable'));
  });
}

renderRandomClubs();
