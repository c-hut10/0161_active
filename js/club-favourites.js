import { loadClubDirectory } from './site-data.mjs';
import { renderSportClubRows } from './sport-glossary-renderer.mjs';

/* Browser-only favourites: persist club IDs only after an explicit save action. */
const key = '0161active-saved-clubs';
const noticeKey = '0161active-saved-clubs-notice';
const savedPage = document.querySelector('#your-clubs');
let ids = new Set();
let storageError = false;
let clubs = null;
let noticeTimer;
function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(value) || value.some(id => typeof id !== 'string')) throw new Error('Invalid saved list');
    ids = new Set(value);
    storageError = false;
  } catch { ids = new Set(); storageError = true; }
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
storageNotice.innerHTML = `<p role="status">Club saved. Your saved clubs are stored only in this browser. You can remove them at any time. <a href="/html/your-clubs.html">Your clubs</a> · <a href="/html/privacy.html#cookies">About storage</a></p><button type="button" aria-label="Dismiss saved clubs notice">Got it</button>`;
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

function announce(message) {
  clearTimeout(noticeTimer);
  storageNotice.hidden = true;
  announcement.textContent = message;
  announcement.hidden = false;
  noticeTimer = setTimeout(() => { announcement.hidden = true; }, 7000);
}

/* Controls remain hidden without JavaScript; reapply state after glossary filters redraw rows. */
function enhance() {
  document.querySelectorAll('[data-favourite-id]').forEach(button => {
    const selected = ids.has(button.dataset.favouriteId);
    const label = selected ? 'Unsave club' : 'Save club';
    button.hidden = false;
    if (button.textContent !== label) button.textContent = label;
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
    return true;
  } catch {
    announce('Your browser could not save this change. Check its site-storage settings and try again.');
    return false;
  }
}

/* Personal collection: reuse existing club rows, with loading, empty and retry states. */
function renderSavedPage() {
  if (!savedPage) return;
  const status = savedPage.querySelector('#saved-clubs-status');
  const list = savedPage.querySelector('#saved-clubs-list');
  if (storageError) {
    status.textContent = 'Your saved clubs could not be read. Check browser storage permissions, or clear site data in your browser settings to reset it.';
    list.replaceChildren();
    return;
  }
  const selected = (clubs || []).filter(club => ids.has(club.id)).sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
  savedPage.querySelector('#saved-count').textContent = `${selected.length} SAVED ${selected.length === 1 ? 'CLUB' : 'CLUBS'}`;
  list.innerHTML = renderSportClubRows(selected);
  status.textContent = selected.length
    ? (ids.size > selected.length ? 'Some saved clubs are no longer in the directory.' : '')
    : 'No saved clubs yet. Choose “Save club” on a club profile or listing to start your collection.';
  /* Saved-list rows: retain the profile link and place an accessible bin at the far right. */
  list.querySelectorAll('[data-favourite-id]').forEach(button => {
    const row = button.closest('.sport-club-row');
    const link = row.querySelector('.sport-club-link');
    const actions = document.createElement('div');
    actions.className = 'saved-row-actions';
    link.replaceWith(actions);
    actions.append(link);
    button.dataset.removeFavourite = button.dataset.favouriteId;
    button.removeAttribute('data-favourite-id');
    button.removeAttribute('aria-pressed');
    button.className = 'saved-club-bin';
    button.hidden = false;
    button.title = 'Remove from favourites';
    button.setAttribute('aria-label', `Remove ${button.dataset.clubName} from favourites`);
    button.setAttribute('aria-haspopup', 'dialog');
    button.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
    actions.append(button);
  });
}
async function loadSavedPage() {
  if (!savedPage) return;
  try {
    ({ clubs } = await loadClubDirectory());
    renderSavedPage();
  } catch {
    const status = savedPage.querySelector('#saved-clubs-status');
    status.textContent = 'The club directory could not be loaded. Your saved selections have been kept. ';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'club-favourite';
    retry.textContent = 'Try again';
    retry.addEventListener('click', () => {
      retry.disabled = true;
      status.textContent = 'Loading your saved clubs…';
      loadSavedPage();
    });
    status.append(retry);
  }
}
/* Removal confirmation: use a native modal with keyboard cancellation and safe text insertion. */
let pendingRemoval = null;
const removalDialog = document.createElement('dialog');
removalDialog.className = 'saved-removal-dialog';
removalDialog.setAttribute('aria-labelledby', 'saved-removal-title');
removalDialog.setAttribute('aria-describedby', 'saved-removal-text');
removalDialog.innerHTML = `<h2 id="saved-removal-title">Remove favourite?</h2><p id="saved-removal-text"></p><p data-removal-error role="status"></p><div><button type="button" data-cancel-removal autofocus>Cancel</button><button type="button" data-confirm-removal>Remove</button></div>`;
if (savedPage) document.body.append(removalDialog);
function focusSavedRow() {
  const button = [...savedPage.querySelectorAll('[data-remove-favourite]')].find(item => item.dataset.removeFavourite === pendingRemoval?.id)
    || savedPage.querySelector('[data-remove-favourite], a');
  button?.focus({ preventScroll: true });
}
removalDialog.querySelector('[data-cancel-removal]').addEventListener('click', () => removalDialog.close());
removalDialog.addEventListener('close', focusSavedRow);
removalDialog.querySelector('[data-confirm-removal]').addEventListener('click', () => {
  if (!pendingRemoval) return;
  readSaved();
  if (storageError) {
    removalDialog.querySelector('[data-removal-error]').textContent = 'Saved clubs could not be read. Check browser storage permissions and try again.';
    return;
  }
  const next = new Set(ids);
  next.delete(pendingRemoval.id);
  if (!persist(next)) {
    removalDialog.querySelector('[data-removal-error]').textContent = 'Your browser could not remove this favourite. Please try again.';
    return;
  }
  renderSavedPage();
  removalDialog.close();
  announce(`${pendingRemoval.name} removed from your favourites.`);
});
document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const bin = event.target.closest('[data-remove-favourite]');
  if (bin) {
    pendingRemoval = { id: bin.dataset.removeFavourite, name: bin.dataset.clubName, button: bin };
    removalDialog.querySelector('#saved-removal-text').textContent = `Remove ${pendingRemoval.name} from your favourites? This removes it only from your saved list.`;
    removalDialog.querySelector('[data-removal-error]').textContent = '';
    removalDialog.showModal();
    return;
  }
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
  announce(removing ? 'Club removed from Your clubs.' : 'Club saved in this browser. Find it in Your clubs.');
  if (savedPage && clubs) {
    renderSavedPage();
    // Removing a row must not leave keyboard focus on a detached button.
    const target = savedPage.querySelector('[data-favourite-id]') || savedPage.querySelector('a');
    target?.focus();
  } else enhance();
  if (!removing) showFirstSaveNotice();
});
window.addEventListener('storage', event => {
  if (event.key !== key && event.key !== null) return;
  readSaved();
  if (savedPage && clubs) renderSavedPage();
  else enhance();
});
enhance();
// Only filtered club lists redraw controls; avoid observing unrelated page animations.
const filteredList = document.querySelector('#club-list');
if (filteredList) new MutationObserver(enhance).observe(filteredList, { childList: true, subtree: true });
loadSavedPage();
