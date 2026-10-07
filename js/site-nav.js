(async () => {
/* Shared navigation: render the same sport directory, destinations and mobile drawer site-wide. */
const siteNavMount = document.querySelector('[data-site-nav]');
const siteNavScript = document.currentScript;
const siteRoot = new URL('../', siteNavScript.src);
const { displaySportName, sportGlossaryUrl: glossaryUrl, escapeHtml: escapeNavText } = await import('./club-formatting.mjs');
const { visibleSportRecords } = await import('./sport-catalog.mjs');
const { loadClubDirectory, loadSportCatalog } = await import('./site-data.mjs');
const siteUrl = path => new URL(path, siteRoot).href;

function sportGlossaryUrl(sport) {
  return glossaryUrl(sport, null, siteUrl('html/sports/glossary.html'));
}

function currentPage() {
  const pathname = decodeURI(window.location.pathname).toLowerCase();
  if (pathname.endsWith('/calendar.html')) return 'calendar';
  if (pathname.endsWith('/register.html')) return 'register';
  if (pathname.endsWith('/contact.html')) return 'contact';
  if (pathname.endsWith('/sports/directory.html') || pathname.endsWith('/sports/glossary.html') || pathname.endsWith('/sports/run-club.html')) return 'sports';
  return '';
}

function buildSiteNav(sports) {
  if (!siteNavMount) return;
  const active = currentPage();
  const makeSportItems = list => list.map(sport => `<a href="${escapeNavText(sportGlossaryUrl(sport.slug))}">${escapeNavText(displaySportName(sport.name))}</a>`).join('');
  const sportItems = makeSportItems(sports.filter(sport => !sport.accessible));
  const accessibleSportItems = makeSportItems(sports.filter(sport => sport.accessible));
  siteNavMount.innerHTML = `<header class="site-navbar">
    <div class="site-navbar__bar">
      <a class="site-navbar__brand" href="${siteUrl('')}" aria-label="0161 Active home"><img src="${siteUrl('img/0161 Active_Logo_Transparent.png')}" alt="0161 Active"></a>
      <nav class="site-navbar__desktop" aria-label="Main navigation">
        <div class="site-navbar__sports">
          <a class="site-navbar__link" href="${siteUrl('html/sports/directory.html')}"${active === 'sports' ? ' aria-current="page"' : ''}>SPORTS</a>
          <div class="site-navbar__sports-panel" aria-label="Sports directory links">
            <a class="site-navbar__sports-all" href="${siteUrl('html/sports/directory.html')}">BROWSE ALL SPORTS →</a>
            <p class="site-navbar__sports-section-title">ACCESSIBLE SPORTS</p>
            <div class="site-navbar__sports-grid">${accessibleSportItems}</div>
            <p class="site-navbar__sports-section-title">OTHER SPORTS</p>
            <div class="site-navbar__sports-grid">${sportItems}</div>
          </div>
        </div>
        <a class="site-navbar__link" href="${siteUrl('html/calendar.html')}"${active === 'calendar' ? ' aria-current="page"' : ''}>CALENDAR</a>
        <a class="site-navbar__link" href="${siteUrl('html/register.html')}"${active === 'register' ? ' aria-current="page"' : ''}>REGISTER YOUR CLUB</a>
        <a class="site-navbar__link" href="${siteUrl('html/contact.html')}"${active === 'contact' ? ' aria-current="page"' : ''}>CONTACT US</a>
      </nav>
      <button class="site-navbar__menu-button" type="button" aria-controls="site-mobile-drawer" aria-expanded="false">MENU</button>
    </div>
    <button class="site-navbar__overlay" type="button" aria-label="Close menu" hidden></button>
    <nav class="site-navbar__drawer" id="site-mobile-drawer" aria-label="Mobile navigation" aria-hidden="true" inert>
      <div class="site-navbar__drawer-header">
        <p class="site-navbar__drawer-title">MENU</p>
        <button class="site-navbar__close" type="button">CLOSE ×</button>
      </div>
      <a class="site-navbar__drawer-link" href="${siteUrl('html/sports/directory.html')}"${active === 'sports' ? ' aria-current="page"' : ''}>SPORTS <span aria-hidden="true">↗</span></a>
      <a class="site-navbar__drawer-link" href="${siteUrl('html/calendar.html')}"${active === 'calendar' ? ' aria-current="page"' : ''}>CALENDAR <span aria-hidden="true">↗</span></a>
      <a class="site-navbar__drawer-link" href="${siteUrl('html/register.html')}"${active === 'register' ? ' aria-current="page"' : ''}>REGISTER YOUR CLUB <span aria-hidden="true">↗</span></a>
      <a class="site-navbar__drawer-link" href="${siteUrl('html/contact.html')}"${active === 'contact' ? ' aria-current="page"' : ''}>CONTACT US <span aria-hidden="true">↗</span></a>
    </nav>
  </header>`;

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

loadSportsForNavigation();
})();
