(async () => {
/* Shared navigation: render the same sport directory, destinations and mobile drawer site-wide. */
const siteNavMount = document.querySelector('[data-site-nav]');
const { renderSiteNav } = await import('./site-nav-renderer.mjs');
const { visibleSportRecords } = await import('./sport-catalog.mjs');
const { loadClubDirectory, loadSportCatalog } = await import('./site-data.mjs');
function currentPage() {
  const pathname = decodeURI(window.location.pathname).toLowerCase();
  if (pathname.endsWith('/calendar.html')) return 'calendar';
  if (pathname.endsWith('/register.html')) return 'register';
  if (pathname.endsWith('/contact.html')) return 'contact';
  if (pathname.includes('/sports/')) return 'sports';
  return '';
}

function buildSiteNav(sports) {
  if (!siteNavMount) return;
  const active = currentPage();
  if (!siteNavMount.querySelector('.site-navbar')) siteNavMount.innerHTML = renderSiteNav(sports, active);

  const menuButton = siteNavMount.querySelector('.site-navbar__menu-button');
  const drawer = siteNavMount.querySelector('.site-navbar__drawer');
  const overlay = siteNavMount.querySelector('.site-navbar__overlay');
  const closeButton = siteNavMount.querySelector('.site-navbar__close');

  function closeMenu(returnFocus = false) {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.inert = true;
    menuButton.setAttribute('aria-expanded', 'false');
    overlay.classList.remove('is-visible');
    window.setTimeout(() => {
      if (menuButton.getAttribute('aria-expanded') === 'false') overlay.hidden = true;
    }, 260);
    document.body.classList.remove('site-nav-open');
    if (returnFocus) menuButton.focus();
  }

  function openMenu() {
    overlay.hidden = false;
    drawer.inert = false;
    drawer.setAttribute('aria-hidden', 'false');
    menuButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('site-nav-open');
    requestAnimationFrame(() => {
      drawer.classList.add('is-open');
      overlay.classList.add('is-visible');
      closeButton.focus();
    });
  }

  menuButton.addEventListener('click', openMenu);
  closeButton.addEventListener('click', () => closeMenu(true));
  overlay.addEventListener('click', () => closeMenu(true));
  drawer.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  drawer.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...drawer.querySelectorAll('a[href], button:not([disabled])')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1040 && menuButton.getAttribute('aria-expanded') === 'true') closeMenu();
  });
}

/* Catalog loading: the desktop flyout and mobile drawer share the complete sport list. */
async function loadSportsForNavigation() {
  let sports = [{ name: 'Run Club', slug: 'run-club', accessible: false }];
  try {
    const [data, clubsData] = await Promise.all([loadSportCatalog(), loadClubDirectory()]);
    sports = visibleSportRecords(data, clubsData.clubs);
  } catch (error) {
    // Keep the navigation usable if the optional full sport list cannot be loaded.
  }
  buildSiteNav(sports);
}

// Generated navigation is ready immediately; fetch only for an unbuilt page.
if (siteNavMount?.querySelector('.site-navbar')) buildSiteNav([]);
else loadSportsForNavigation();
})();
