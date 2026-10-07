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
    }
  });
}

addCalendarDownload();
