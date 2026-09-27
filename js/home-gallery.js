/* Club gallery data: each item pairs its local photo with a profile and accessible name. */
const clubs = [
  { name: 'Not A Running Club', image: 'NotARunningClub.jpeg', alt: 'Members of Not A Running Club smiling together', page: 'NotARunningClub.html' },
  { name: 'Tiny Moves', image: 'TinyMoves.jpeg', alt: 'Runners from the Tiny Moves club', page: 'TinyMoves.html' },
  { name: 'Snappy Runners', image: 'SnappyRunner.png', alt: 'A group of Snappy Runners out together', page: 'SnappyRunners.html' },
  { name: 'Just A Run Club', image: 'JustARunClub.webp', alt: 'Members of Just A Run Club running together', page: 'JustARunClub.html' },
  { name: 'Redacted Run Club', image: 'RedactedRunClub.jpeg', alt: 'Members of Redacted Run Club', page: 'RedactedRunClub.html' },
  { name: 'Manchester Frontrunners', image: 'ManchesterFrontrunners.jpg', alt: 'Manchester Frontrunners club members', page: 'ManchesterFrontrunners.html' },
  { name: 'Mile Shy Club', image: 'MileShyClub.webp', alt: 'Mile Shy Club runners', page: 'MileShyClub.html' },
  { name: 'Didsbury Runners', image: 'DidsburyRunners.jpg', alt: 'Didsbury Runners club members', page: 'DidsburyRunners.html' },
  { name: 'Ancoats Run Club', image: 'AncoatRunClub.avif', alt: 'Ancoats Run Club runners', page: 'AncoatRunClub.html' }
];

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
  link.href = `html/running/${club.page}`;
    const image = document.createElement('img');
    image.src = `img/running/${club.image}`;
    image.alt = isDuplicate ? '' : club.alt;
    image.loading = 'lazy';
    const heading = document.createElement('h2');
    heading.textContent = club.name;
    link.append(image, heading);
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

/* Gallery setup: shuffle all clubs on each page load, then roll them through two rows. */
function renderRandomClubs() {
  const gallery = document.querySelector('#club-gallery');
  if (!gallery) return;

  const shuffled = [...clubs];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  const splitPoint = Math.ceil(shuffled.length / 2);
  const firstRow = shuffled.slice(0, splitPoint);
  const secondRow = shuffled.slice(splitPoint);
  gallery.replaceChildren(makeRollingRow(firstRow, 1), makeRollingRow(secondRow, 2));
}

renderRandomClubs();
