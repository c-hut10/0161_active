/* Keep generated sport links as the no-script fallback; the map owns the interactive sports list. */
// One filter form moves between the desktop sidebar and its existing mobile position.
const filterPanel = document.querySelector('[data-map-filters]');
const sidebar = document.querySelector('.sports-directory-column');
const filterAnchor = document.createComment('Mobile map filters');
filterPanel.before(filterAnchor);
const desktopLayout = matchMedia('(min-width: 801px)');
function placeMapFilters() {
  if (desktopLayout.matches) sidebar.prepend(filterPanel);
  else filterAnchor.after(filterPanel);
  sidebar.setAttribute('aria-label', desktopLayout.matches ? 'Map filters' : 'Scrollable sports list');
}
document.querySelector('.sports-directory-layout').classList.add('has-filter-sidebar');
desktopLayout.addEventListener('change', placeMapFilters);
placeMapFilters();
