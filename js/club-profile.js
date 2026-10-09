import { CALENDAR_DOWNLOAD_LABEL, CALENDAR_FILE_LABEL, downloadClubCalendar } from './club-calendar.mjs';
import { loadClubDirectory } from './site-data.mjs';
const profileRoot = document.querySelector('#club-profile-root');
const clubId = profileRoot?.dataset.clubId;
/* Static profile enhancement: load club data only when the user downloads its calendar. */
function addCalendarDownload() {
  if (!profileRoot?.querySelector('#profile-title')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'profile-action profile-calendar-download';
  button.textContent = CALENDAR_DOWNLOAD_LABEL.toUpperCase();
  const label = document.createElement('small');
  label.textContent = CALENDAR_FILE_LABEL;
  button.append(label);
  const status = document.createElement('p');
  status.className = 'profile-status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  profileRoot.querySelector('.profile-week__heading')?.append(button);
  profileRoot.querySelector('.profile-week')?.append(status);
  button.addEventListener('click', async () => {
    button.disabled = true;
    /* Announce progress while the shared directory is fetched for the download. */
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Preparing calendar…';
    status.textContent = 'Preparing calendar…';
    status.hidden = false;
    try {
      const { clubs } = await loadClubDirectory();
      const club = clubs.find(item => item.id === clubId);
      if (!club) throw new Error('This club is not in the shared directory.');
      status.textContent = downloadClubCalendar(club, window.location.href.split(/[?#]/)[0]);
    } catch (error) {
      status.textContent = error.message;
    } finally {
      status.hidden = false;
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = CALENDAR_DOWNLOAD_LABEL.toUpperCase();
      button.append(label);
    }
  });
}

addCalendarDownload();

/* Mobile actions: reuse the rendered links without another JSON request or URL decision. */
function addMobileActions() {
  const titleActions = profileRoot?.querySelector('.profile-actions');
  if (!titleActions?.querySelector('a') || !('IntersectionObserver' in window)) return;
  const bar = document.createElement('nav');
  bar.className = 'profile-mobile-actions';
  bar.setAttribute('aria-label', 'Club contact links');
  bar.hidden = true;
  titleActions.querySelectorAll('a').forEach(link => bar.append(link.cloneNode(true)));
  document.body.append(bar);
  document.body.classList.add('profile-has-mobile-actions');

  /* Show the shortcut only after the original buttons pass above the mobile header. */
  const mobile = window.matchMedia('(max-width: 1040px)');
  function update() {
    bar.hidden = !mobile.matches || titleActions.getBoundingClientRect().bottom > 80;
  }
  const observer = new IntersectionObserver(update, { rootMargin: '-80px 0px 0px 0px' });
  observer.observe(titleActions);
  mobile.addEventListener('change', update);
  update();
}

addMobileActions();
