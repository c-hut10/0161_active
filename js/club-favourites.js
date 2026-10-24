/* Browser-only favourites: persist club IDs only after an explicit save action. */
import { savedClubsKey as key, readSavedClubs } from './saved-clubs.mjs';
const noticeKey = '0161active-saved-clubs-notice';
let ids = new Set();
let storageError = false;
let noticeTimer;
function readSaved() {
  const saved = readSavedClubs();
  ids = saved.ids;
  storageError = saved.error;
}
readSaved();
const announcement = document.createElement('p');
announcement.className = 'club-favourites-status';
announcement.setAttribute('role', 'status');
announcement.hidden = true;
document.body.append(announcement);
/* First save: explain persistent storage once without interrupting the user's navigation. */
const storageNotice = document.createElement('section');
storageNotice.className = 'club-favourites-storage-notice';
storageNotice.setAttribute('aria-label', 'Saved clubs and browser storage');
storageNotice.hidden = true;
storageNotice.innerHTML = `<p role="status">Club saved. Your saved clubs are stored only in this browser. You can remove them at any time. <a href="/html/calendar.html">The Calendar</a> · <a href="/html/privacy.html#cookies">About storage</a></p><button type="button" aria-label="Dismiss saved clubs notice">Got it</button>`;
document.body.append(storageNotice);
storageNotice.querySelector('button').addEventListener('click', () => {
  storageNotice.hidden = true;
  // Return focus to a useful control if dismissing the popup removed keyboard focus.
  document.querySelector('[data-favourite-id]')?.focus({ preventScroll: true });
});
function showFirstSaveNotice() {
  try {
    if (localStorage.getItem(noticeKey) === '1') return;
    localStorage.setItem(noticeKey, '1');
  } catch { /* If the flag cannot be stored, show the explanation again next time. */ }
  clearTimeout(noticeTimer);
  announcement.hidden = true;
  storageNotice.hidden = false;
}

function announce(message, linkToClubs = false) {
  clearTimeout(noticeTimer);
  storageNotice.hidden = true;
  announcement.textContent = message;
  /* Save confirmations provide a direct route to the collection without inserting club data as HTML. */
  if (linkToClubs) {
    const link = document.createElement('a');
    link.href = '/html/calendar.html';
    link.textContent = 'The Calendar';
    announcement.append(' ', link);
  }
  announcement.hidden = false;
  noticeTimer = setTimeout(() => {
    // Keep a keyboard-focused link available until the visitor leaves or acts again.
    if (!announcement.contains(document.activeElement)) announcement.hidden = true;
  }, 7000);
}

/* Controls remain hidden without JavaScript; reapply state after glossary filters redraw rows. */
function enhance() {
  document.querySelectorAll('[data-favourite-id]').forEach(button => {
    const selected = ids.has(button.dataset.favouriteId);
    const label = selected ? 'Unsave club' : 'Save club';
    button.hidden = false;
    // Retain the icon; pressed state controls its fill while labels explain the action.
    button.title = label;
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', `${label}: ${button.dataset.clubName}`);
  });
}
function persist(next) {
  try {
    // Do not report success or change the UI unless the browser accepts the write.
    if (next.size) localStorage.setItem(key, JSON.stringify([...next]));
    else localStorage.removeItem(key);
    ids = next;
    storageError = false;
    window.dispatchEvent(new Event('saved-clubs-changed'));
    return true;
  } catch {
    announce('Your browser could not save this change. Check its site-storage settings and try again.');
    return false;
  }
}

document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest('[data-favourite-id]');
  if (!button) return;
  // Read again so saves in another tab are not accidentally overwritten.
  readSaved();
  if (storageError) {
    announce('Saved clubs could not be read. Check browser storage permissions or clear site data to reset the list.');
    return;
  }
  const next = new Set(ids);
  const id = button.dataset.favouriteId;
  const removing = next.has(id);
  if (removing) next.delete(id);
  else next.add(id);
  if (!persist(next)) return;
  announce(removing ? 'Club removed from The Calendar.' : 'Club saved in this browser.', !removing);
  enhance();
  if (!removing) showFirstSaveNotice();
});
window.addEventListener('storage', event => {
  if (event.key !== key && event.key !== null) return;
  readSaved();
  enhance();
});
enhance();
// Only filtered club lists redraw controls; avoid observing unrelated page animations.
const filteredList = document.querySelector('#club-list');
if (filteredList) new MutationObserver(enhance).observe(filteredList, { childList: true, subtree: true });
