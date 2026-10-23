/* Apply saved motion preferences before rendering, without changing normal link navigation. */
(() => {
  const root = document.documentElement;
  try {
    const preferences = JSON.parse(localStorage.getItem('0161active-accessibility'));
    if (preferences?.reduceMotion === true) root.classList.add('a11y-reduce-motion');
  } catch { /* Storage is optional; the device preference still works through CSS. */ }

  function respectMotionPreference(event) {
    if (root.classList.contains('a11y-reduce-motion')
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      event.viewTransition?.skipTransition();
    }
  }
  // These events run only in supporting browsers; other browsers keep ordinary page loads.
  window.addEventListener('pageswap', respectMotionPreference);
  window.addEventListener('pagereveal', respectMotionPreference);
  /* Homepage loops start after navigation, avoiding motion both inside and after the page snapshot. */
  window.addEventListener('pagereveal', event => {
    if (!event.viewTransition || !document.querySelector('#club-gallery')) return;
    root.classList.add('gallery-navigating');
    const resume = () => root.classList.remove('gallery-navigating');
    event.viewTransition.finished.then(resume, resume);
  });
})();
