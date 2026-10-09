import { displaySportName, sportGlossaryUrl, escapeHtml as escapeNavText } from './club-formatting.mjs';

/* Navigation HTML: shared by static generation and the browser fallback. */
export function renderSiteNav(sports, active = '') {
  const siteUrl = path => `/${path}`;
  const makeSportItems = list => list.map(sport => `<a href="${escapeNavText(sportGlossaryUrl(sport.slug, null, '/html/sports/glossary.html'))}">${escapeNavText(displaySportName(sport.name))}</a>`).join('');
  const sportItems = makeSportItems(sports.filter(sport => !sport.accessible));
  const accessibleSportItems = makeSportItems(sports.filter(sport => sport.accessible));
  return `<header class="site-navbar">
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
}
