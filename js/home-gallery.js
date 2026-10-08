import { displaySportName, canonicalArea } from './club-formatting.mjs';
import { loadClubDirectory } from './site-data.mjs';

/* Show five photo tiles in each row, repeating available clubs if needed. */
const GALLERY_IMAGE_LIMIT = 10;

/* Build one rolling row; the second copy makes the movement loop without an empty gap. */
function makeRollingRow(clubList, rowNumber) {
  const row = document.createElement('div');
  row.className = 'gallery-row';
  row.setAttribute('aria-label', `Featured clubs row ${rowNumber}`);
  const track = document.createElement('div');
  track.className = 'gallery-track';
  track.style.setProperty('--gallery-card-count', String(clubList.length * 2));
  // Shared timing keeps both rows at the same speed and offsets row two by half a card.
  const durationSeconds = Math.max(50, clubList.length * 8 / 0.6);
  track.style.setProperty('--roll-duration', `${durationSeconds}s`);
  if (rowNumber === 2) {
    track.style.setProperty('--roll-phase-offset', `${-(durationSeconds / (clubList.length * 2))}s`);
  }

  const addClub = (club, isDuplicate = false) => {
    const card = document.createElement('section');
    card.className = 'gallery-card';
    // Club identity lets gallery-only photo framing apply to both looping copies.
    card.dataset.clubId = club.id;
    const link = document.createElement('a');
    link.href = club.profilePath;
    const image = document.createElement('img');
    image.src = club.imagePath;
    image.alt = isDuplicate ? '' : `${club.name} club photo`;
    // Animated duplicates must be ready before a resize or loop brings them into view.
    image.loading = 'eager';
    image.decoding = 'async';
    const caption = document.createElement('div');
    caption.className = 'gallery-caption';
    const heading = document.createElement('h2');
    heading.textContent = club.name;
    const subtitle = document.createElement('p');
    subtitle.className = 'gallery-caption__details';
    subtitle.textContent = [displaySportName(club.sport), canonicalArea(club.area)].filter(Boolean).join(' · ');
    caption.append(heading, subtitle);
    link.append(image, caption);
    card.append(link);

    if (isDuplicate) {
      card.setAttribute('aria-hidden', 'true');
      link.tabIndex = -1;
    }
    track.append(card);
  };

  clubList.forEach(club => addClub(club));
  clubList.forEach(club => addClub(club, true));
  row.append(track);
  return row;
}

/* Gallery setup: randomly sample clubs with photos, then roll the sample through two rows. */
async function renderRandomClubs() {
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

  try {
    const directory = await loadClubDirectory();
    const clubsWithPhotos = directory.clubs.filter(club => typeof club.imagePath === 'string'
        && club.imagePath.startsWith('img/')
        && typeof club.profilePath === 'string'
        && club.profilePath.startsWith('html/'));

    const shuffled = [...clubsWithPhotos];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    const selectedClubs = shuffled.slice(0, GALLERY_IMAGE_LIMIT);
    if (!selectedClubs.length) {
      gallery.replaceChildren();
      return;
    }
    while (selectedClubs.length < GALLERY_IMAGE_LIMIT) {
      selectedClubs.push(shuffled[selectedClubs.length % shuffled.length]);
    }
    const splitPoint = Math.ceil(selectedClubs.length / 2);
    const firstRow = selectedClubs.slice(0, splitPoint);
    const secondRow = selectedClubs.slice(splitPoint);
    const rows = [makeRollingRow(firstRow, 1), makeRollingRow(secondRow, 2)];
    await Promise.all(rows.flatMap(row => [...row.querySelectorAll('img')]).map(async image => {
      try {
        await image.decode();
      } catch {
        // A missing photo still gets a readable club label rather than a bright empty tile.
        image.closest('.gallery-card').classList.add('gallery-card--unavailable');
      }
    }));
    gallery.replaceChildren(...rows);
  } catch {
    gallery.replaceChildren();
  }
}

renderRandomClubs();
