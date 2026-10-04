(() => {
/* Shared navigation: render the same sport directory, destinations and mobile drawer site-wide. */
const siteNavMount = document.querySelector('[data-site-nav]');
const siteNavScript = document.currentScript;
const siteRoot = new URL('../', siteNavScript.src);
const siteUrl = path => new URL(path, siteRoot).href;
const escapeNavText = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[character]);

function sportSlug(name) {
  return String(name).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* Sport labels: show the preferred public name while keeping canonical slugs unchanged. */
function displaySportName(name) {
  return sportSlug(name) === 'running' ? 'Run Club' : name;
}

function sportGlossaryUrl(sport) {
  return `${siteUrl('html/sports/glossary.html')}?sport=${encodeURIComponent(sportSlug(sport))}`;
}

function currentPage() {
  const pathname = decodeURI(window.location.pathname).toLowerCase();
  if (pathname.endsWith('/calendar.html')) return 'calendar';
  if (pathname.endsWith('/register.html')) return 'register';
  if (pathname.endsWith('/contact.html')) return 'contact';
  if (pathname.endsWith('/sports/directory.html') || pathname.endsWith('/sports/glossary.html') || pathname.endsWith('/sports/running.html')) return 'sports';
  return '';
}

function buildSiteNav(sports, accessibleSports = []) {
  if (!siteNavMount) return;
  const active = currentPage();
  const makeSportItems = list => list.map(sport => `<a href="${escapeNavText(sportGlossaryUrl(sport))}">${escapeNavText(displaySportName(sport))}</a>`).join('');
  const accessibleSportSlugs = new Set(accessibleSports.map(sportSlug));
  const otherSports = sports.filter(sport => !accessibleSportSlugs.has(sportSlug(sport)));
  const sportItems = makeSportItems(otherSports);
  const accessibleSportItems = makeSportItems(accessibleSports);
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
  let sports = ['Running'];
  let accessibleSports = [];
  try {
    const [sportsResponse, clubsResponse] = await Promise.all([
      fetch(siteUrl('data/sports.json')),
      fetch(siteUrl('data/clubs.json'))
    ]);
    if (!sportsResponse.ok || !clubsResponse.ok) throw new Error('Sport directory unavailable');
    const [data, clubsData] = await Promise.all([sportsResponse.json(), clubsResponse.json()]);
    if (Array.isArray(data.sports) && data.sports.length) sports = data.sports;
    const visibleWhenEmpty = new Set((data.visibleWhenEmpty || []).map(sportSlug));
    const hiddenSports = new Set((data.hiddenSports || []).map(sportSlug));
    const clubCounts = new Map();
    (clubsData.clubs || []).forEach(club => {
      const slug = sportSlug(club.sport || '');
      if (slug) clubCounts.set(slug, (clubCounts.get(slug) || 0) + 1);
    });
    const isVisible = sport => !hiddenSports.has(sportSlug(sport))
      && ((clubCounts.get(sportSlug(sport)) || 0) > 0 || visibleWhenEmpty.has(sportSlug(sport)));
    sports = sports.filter(isVisible);
    if (Array.isArray(data.accessibleSports)) accessibleSports = data.accessibleSports.filter(isVisible);
  } catch (error) {
    // Keep the navigation usable if the optional full sport list cannot be loaded.
  }
  sports.sort((a, b) => a.localeCompare(b));
  accessibleSports.sort((a, b) => a.localeCompare(b));
  buildSiteNav(sports, accessibleSports);
}

loadSportsForNavigation();
})();
