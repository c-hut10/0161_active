/* Homepage intro. The detailed interactive map remains in the protected archive. */
(() => {
  if (!['/', '/index', '/index.html'].includes(location.pathname)) return;
  const replayEveryVisit = true; // Temporary design preview; set false to restore once per browser.
  const key = '0161active-home-intro-seen';
  if (!replayEveryVisit) try {
    if (localStorage.getItem(key) === '1') return;
    // Mark on entry so refresh, another tab and a later visit do not replay the intro.
    localStorage.setItem(key, '1');
  } catch { /* With storage blocked, the intro still ends normally but cannot remember this visit. */ }

  const root = document.documentElement;
  root.classList.add('home-intro-active');
  const order = ['bolton', 'bury', 'rochdale', 'oldham', 'tameside', 'stockport', 'manchester', 'trafford', 'salford', 'wigan'];
  const spinDuration = 1000;
  const step = spinDuration / order.length;
  const tailDuration = 2 * step + 160; // Last region traverses both trailing states, then its normal fade.
  const settleDuration = 450;
  const restDuration = 200;
  const cycleDuration = spinDuration + tailDuration + settleDuration + restDuration;
  const finalHold = 300;

  function start() {
    const intro = document.getElementById('home-entry');
    const content = document.getElementById('home-content');
    if (!intro || !content) { root.classList.remove('home-intro-active'); return; }
    const visuals = new Map([...intro.querySelectorAll('[data-region-visual]')].map(node => [node.dataset.regionVisual, node]));
    intro.style.setProperty('--intro-cycle-time', `${cycleDuration}ms`);
    const sportsTrack = intro.querySelector('[data-intro-sports]');
    if (sportsTrack) {
      const remaining = [...sportsTrack.children];
      const selected = [];
      while (remaining.length && selected.length < 14) {
        selected.push(remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0]);
      }
      // Six duplicates make the transform loop seamless; they are not extra sampled sports.
      sportsTrack.replaceChildren(...selected, ...selected.slice(0, 6).map(node => node.cloneNode(true)));
      sportsTrack.style.setProperty('--intro-sport-count', String(selected.length));
    }

    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = () => preference.matches || root.classList.contains('a11y-reduce-motion');
    const started = performance.now();
    let clock;
    let finished = false;
    content.inert = true;
    intro.classList.toggle('is-reduced-motion', reduced());
    intro.classList.toggle('is-spinning', !reduced());

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(clock);
      document.removeEventListener('visibilitychange', tick);
      preference.removeEventListener('change', updateMotion);
      content.inert = false;
      root.classList.remove('home-intro-active', 'home-intro-leaving');
      intro.remove();
    }
    function reveal(elapsed, finishAt) {
      root.classList.add('home-intro-leaving');
      // Only transforms/opacity change; the homepage and nav are already rendered beneath the intro.
      clock = setTimeout(finish, Math.max(0, finishAt - elapsed));
    }
    function tick() {
      if (finished || root.classList.contains('home-intro-leaving')) return;
      clearTimeout(clock);
      const elapsed = performance.now() - started;
      // The handover follows three full expand/spin/settle cycles, never a separate page timer.
      const revealAt = reduced() ? spinDuration : 2 * cycleDuration + spinDuration + finalHold;
      const finishAt = revealAt + (reduced() ? 160 : 650);
      if (elapsed >= finishAt) { finish(); return; }
      if (elapsed >= revealAt) { reveal(elapsed, finishAt); return; }
      const cycle = Math.min(2, Math.floor(elapsed / cycleDuration));
      const phase = elapsed - cycle * cycleDuration;
      const all = reduced() || elapsed >= 2 * cycleDuration + spinDuration;
      const index = phase < spinDuration + tailDuration ? Math.floor(phase / step) : -1;
      const selected = order[index];
      visuals.forEach((node, id) => {
        const latched = cycle === 2 && index >= 0 && order.indexOf(id) <= index;
        node.classList.toggle('is-lit', all || id === selected || latched);
        node.classList.toggle('is-latched', !reduced() && latched);
        node.classList.toggle('is-leading', !all && id === selected);
        node.classList.toggle('is-trail-near', !all && index > 0 && id === order[index - 1]);
        node.classList.toggle('is-trail-far', !all && index > 1 && id === order[index - 2]);
      });
      intro.classList.toggle('is-complete', !reduced() && all);
      // Two circuits rest in grey; the third latches each highlight and then grows into the reveal.
      const next = all ? revealAt : phase < spinDuration + tailDuration
        ? cycle * cycleDuration + Math.min((Math.floor(phase / step) + 1) * step, spinDuration + tailDuration)
        : (cycle + 1) * cycleDuration;
      clock = setTimeout(tick, Math.max(1, Math.min(next, revealAt) - elapsed));
    }
    function updateMotion() {
      intro.classList.toggle('is-reduced-motion', reduced());
      tick();
    }
    document.addEventListener('visibilitychange', tick);
    preference.addEventListener('change', updateMotion);
    // A page restored from browser history must not return to a partly finished loading screen.
    window.addEventListener('pagehide', finish, { once:true });
    tick();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
