/* Detect overlap only while the cards are visible; blur changes once per overlap. */
(() => {
  const track = document.querySelector('[data-club-cards]');
  if (!track) return;
  const cards = [...track.querySelectorAll('.club-card')];
  const motion = matchMedia('(prefers-reduced-motion:no-preference) and (min-height:740px)');
  let visible = false;
  let queued = false;
  function update() {
    queued = false;
    if (!visible || !motion.matches) return;
    // Read all positions before changing classes to avoid repeated layout work.
    const bounds = cards.map(card => card.getBoundingClientRect());
    cards.forEach((card, index) => {
      const next = bounds[index + 1];
      card.classList.toggle('is-covered', Boolean(next && next.top < bounds[index].bottom - 12));
    });
  }
  function schedule() {
    if (!visible || !motion.matches || queued) return;
    queued = true;
    requestAnimationFrame(update);
  }
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) schedule();
  }).observe(track);
  window.addEventListener('scroll', schedule, { passive:true });
  window.addEventListener('resize', schedule, { passive:true });
  motion.addEventListener('change', () => {
    cards.forEach(card => card.classList.remove('is-covered'));
    schedule();
  });
})();
