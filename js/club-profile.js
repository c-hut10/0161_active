import { CALENDAR_DOWNLOAD_LABEL, CALENDAR_IMPORT_HINT, downloadClubCalendar } from './club-calendar.mjs?v=20261029-download-club';
import { loadClubDirectory } from './site-data.mjs';
import { clubShareData, shareClub } from './club-share.mjs';
const profileRoot = document.querySelector('#club-profile-root');
const clubId = profileRoot?.dataset.clubId;

/* On-demand sharing needs no directory fetch, background work or third-party widget. */
const shareButton = profileRoot?.querySelector('[data-share-club]');
if (shareButton) {
  shareButton.hidden = false;
  const feedback = profileRoot.querySelector('.profile-share-feedback');
  const status = feedback.querySelector('[role="status"]');
  const manual = feedback.querySelector('input');
  shareButton.addEventListener('click', async () => {
    shareButton.disabled = true;
    feedback.hidden = true;
    manual.hidden = true;
    try {
      const data = clubShareData(shareButton.dataset.shareName,
        document.querySelector('link[rel="canonical"]')?.href, location.href);
      const result = await shareClub(data, navigator);
      if (result === 'cancelled' || result === 'shared') return;
      status.textContent = result === 'copied' ? 'Club link copied' : 'Copy the club link below.';
      feedback.hidden = false;
      if (result === 'manual') {
        manual.value = data.url;
        manual.hidden = false;
        manual.focus({ preventScroll: true });
        manual.select();
      }
    } finally { shareButton.disabled = false; }
  });
}

/* Profile addresses: copy the rendered venue and postcode without requesting club data again. */
profileRoot?.querySelectorAll('[data-copy-address]').forEach(button => { button.hidden = false; });
profileRoot?.addEventListener('click', async event => {
  const button = event.target.closest('[data-copy-address]');
  if (!button || button.disabled) return;
  const session = button.closest('.profile-session');
  const status = session.querySelector('.profile-copy-address-status');
  const address = button.dataset.copyAddress;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  button.classList.remove('is-copied');
  status.classList.remove('profile-copy-address-status--success');
  status.hidden = true;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(address);
    button.classList.add('is-copied');
    status.classList.add('profile-copy-address-status--success');
    status.textContent = 'Address copied';
  } catch {
    status.textContent = 'Could not copy automatically. Copy the selected address below.';
    // Provide an editable-browser selection when clipboard permission or support is unavailable.
    let manual = session.querySelector('.profile-address-manual');
    if (!manual) {
      manual = document.createElement('textarea');
      manual.className = 'profile-address-manual';
      manual.readOnly = true;
      manual.rows = 3;
      manual.setAttribute('aria-label', 'Training address for manual copying');
      session.insertBefore(manual, button);
    }
    manual.value = address;
    manual.focus({ preventScroll: true });
    manual.select();
  } finally {
    status.hidden = false;
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
});
/* Static profile enhancement: load club data only when the user downloads its calendar. */
function addCalendarDownload() {
  if (!profileRoot?.querySelector('#profile-title')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'profile-action profile-calendar-download';
  button.textContent = CALENDAR_DOWNLOAD_LABEL.toUpperCase();
  const action = document.createElement('div');
  action.className = 'profile-calendar-action';
  const hint = document.createElement('small');
  hint.className = 'profile-calendar-hint';
  hint.textContent = CALENDAR_IMPORT_HINT;
  hint.id = 'profile-calendar-import-hint';
  hint.hidden = true;
  action.append(hint, button);
  const status = document.createElement('p');
  status.className = 'profile-status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  profileRoot.querySelector('.profile-week__heading')?.append(action);
  profileRoot.querySelector('.profile-week')?.append(status);
  button.addEventListener('click', async () => {
    hint.hidden = false;
    button.setAttribute('aria-describedby', hint.id);
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

/* Mobile session sizing: match this profile's tallest entry, without clipping or internal scrolling. */
function equaliseMobileSessions() {
  const grid = profileRoot?.querySelector('.profile-week__grid');
  const sessions = [...(grid?.querySelectorAll('.profile-session') || [])];
  if (!sessions.length) return;
  const mobile = window.matchMedia('(max-width: 1040px)');
  let frame = 0;
  let height = 0;
  const widths = new WeakMap();
  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!mobile.matches) {
        height = 0;
        grid.style.removeProperty('--profile-session-height');
        return;
      }
      // Measure natural heights in one frame so the previous minimum cannot prevent shrinking.
      grid.classList.add('profile-week__grid--measuring');
      height = Math.ceil(Math.max(...sessions.map(session => session.getBoundingClientRect().height)));
      grid.style.setProperty('--profile-session-height', `${height}px`);
      grid.classList.remove('profile-week__grid--measuring');
    });
  }
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(entries => {
      if (!mobile.matches) return;
      const changed = entries.some(entry => {
        const size = entry.target.getBoundingClientRect();
        const previousWidth = widths.get(entry.target);
        widths.set(entry.target, size.width);
        // Ignore height changes caused by equalising; react to new wrapping or growing content.
        return size.width !== previousWidth || Math.abs(size.height - height) > .5;
      });
      if (changed) schedule();
    });
    sessions.forEach(session => observer.observe(session));
  }
  const contentObserver = new MutationObserver(schedule);
  sessions.forEach(session => contentObserver.observe(session, {
    childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden']
  }));
  // Larger-text preferences and completed font loading can change natural text height too.
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  document.fonts?.ready.then(schedule);
  document.fonts?.addEventListener('loadingdone', schedule);
  mobile.addEventListener('change', schedule);
  window.addEventListener('resize', schedule);
  schedule();
}

equaliseMobileSessions();
