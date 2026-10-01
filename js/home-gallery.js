/* Gallery cap: draw at most twenty image-backed clubs from the shared directory. */
const GALLERY_IMAGE_LIMIT = 20;

/* Gallery labels: use Run Club for display without renaming stored sport values. */
function displaySportName(name) {
  return String(name || '').toLocaleLowerCase() === 'running' ? 'Run Club' : name;
}

/* Build one rolling row; the second copy makes the movement loop without an empty gap. */
function makeRollingRow(clubList, rowNumber) {
  const row = document.createElement('div');
  row.className = 'gallery-row';
  row.setAttribute('aria-label', `Featured clubs row ${rowNumber}`);
  const track = document.createElement('div');
  track.className = 'gallery-track';
  // Shared timing keeps both rows at the same speed and offsets row two by half a card.
  const durationSeconds = Math.max(50, clubList.length * 8 / 0.6);
  track.style.setProperty('--roll-duration', `${durationSeconds}s`);
  if (rowNumber === 2) {
    track.style.setProperty('--roll-phase-offset', `${-(durationSeconds / (clubList.length * 2))}s`);
  }

  const addClub = (club, isDuplicate = false) => {
    const card = document.createElement('section');
    card.className = 'gallery-card';
    const link = document.createElement('a');
    link.href = club.profilePath;
    const image = document.createElement('img');
    image.src = club.imagePath;
    image.alt = isDuplicate ? '' : `${club.name} club photo`;
    image.loading = 'lazy';
    image.decoding = 'async';
    const caption = document.createElement('div');
    caption.className = 'gallery-caption';
    const heading = document.createElement('h2');
    heading.textContent = club.name;
    const subtitle = document.createElement('p');
    subtitle.className = 'gallery-caption__details';
    subtitle.textContent = [displaySportName(club.sport), club.area].filter(Boolean).join(' · ');
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

  try {
    const response = await fetch('data/clubs.json');
    if (!response.ok) throw new Error('Club gallery data could not be loaded.');
    const directory = await response.json();
    const clubsWithPhotos = Array.isArray(directory.clubs)
      ? directory.clubs.filter(club => typeof club.imagePath === 'string'
        && club.imagePath.startsWith('img/')
        && typeof club.profilePath === 'string'
        && club.profilePath.startsWith('html/'))
      : [];

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
    const splitPoint = Math.ceil(selectedClubs.length / 2);
    const firstRow = selectedClubs.slice(0, splitPoint);
    const secondRow = selectedClubs.slice(splitPoint);
    if (!secondRow.length) secondRow.push(...firstRow);
    gallery.replaceChildren(makeRollingRow(firstRow, 1), makeRollingRow(secondRow, 2));
  } catch {
    gallery.replaceChildren();
  }
}

renderRandomClubs();
