/* Only the homepage loads this script; direct links to other pages stay untouched. */
(() => {
  const root = document.documentElement;
  const key = '0161active-home-entered';
  // Show the welcome once per tab session; refreshes and return visits skip it.
  const showOnEveryVisit = false;
  const showGridAxes = true; // Temporary A/B/C and 1/2/3 labels for scene placement.
  if (!['/', '/index', '/index.html'].includes(location.pathname)) return;
  root.classList.add('home-entry-page');

  /* Visual prototype only: these sample figures never read or change club records. */
  const demoRegions = [
    { id: 'bolton', name: 'Bolton', clubs: 24, sports: [[9, 'Football clubs'], [6, 'Badminton clubs'], [4, 'Athletics clubs'], [5, 'Basketball clubs']] },
    { id: 'bury', name: 'Bury', clubs: 18, sports: [[7, 'Football clubs'], [5, 'Athletics clubs'], [3, 'Basketball clubs'], [3, 'Cycling clubs']] },
    { id: 'manchester', name: 'Manchester', clubs: 42, sports: [[12, 'Run clubs'], [10, 'Basketball clubs'], [8, 'Football clubs'], [7, 'Badminton clubs']] },
    { id: 'oldham', name: 'Oldham', clubs: 16, sports: [[6, 'Football clubs'], [4, 'Basketball clubs'], [3, 'Athletics clubs'], [3, 'Hockey clubs']] },
    { id: 'rochdale', name: 'Rochdale', clubs: 14, sports: [[5, 'Football clubs'], [4, 'Athletics clubs'], [3, 'Cycling clubs'], [2, 'Badminton clubs']] },
    { id: 'salford', name: 'Salford', clubs: 22, sports: [[8, 'Football clubs'], [6, 'Run clubs'], [5, 'Basketball clubs'], [3, 'Fitness clubs']] },
    { id: 'stockport', name: 'Stockport', clubs: 26, sports: [[9, 'Football clubs'], [7, 'Cycling clubs'], [6, 'Hockey clubs'], [4, 'Badminton clubs']] },
    { id: 'tameside', name: 'Tameside', clubs: 17, sports: [[6, 'Football clubs'], [5, 'Basketball clubs'], [4, 'Athletics clubs'], [2, 'Archery clubs']] },
    { id: 'trafford', name: 'Trafford', clubs: 30, sports: [[10, 'Football clubs'], [8, 'Run clubs'], [7, 'Squash clubs'], [5, 'Hockey clubs']] },
    { id: 'wigan', name: 'Wigan', clubs: 20, sports: [[8, 'Football clubs'], [5, 'Cycling clubs'], [4, 'Athletics clubs'], [3, 'Hockey clubs']] }
  ];

  /* Fixed SVG targets select a separate lifted layer, so movement never changes the hit area. */
  function initialiseRegionMap(dialog, reducedMotion) {
    const map = dialog.querySelector('.home-entry__map');
    const details = dialog.querySelector('.home-entry__region-details');
    if (!map || !details) return { setPaused() {}, destroy() {} };
    const targets = [...map.querySelectorAll('[data-region]')];
    const visuals = new Map([...map.querySelectorAll('[data-region-visual]')]
      .map(node => [node.dataset.regionVisual, node]));
    const bases = new Map([...map.querySelectorAll('[data-region-base]')]
      .map(node => [node.dataset.regionBase, node]));
    const liftLayer = map.querySelector('.home-entry__map-lifts');
    const overview = details.querySelector('.home-entry__region-overview');
    const name = details.querySelector('[data-region-name]');
    const count = details.querySelector('[data-region-count]');
    const stat = details.querySelector('[data-region-stat]');
    const announcement = details.querySelector('[data-region-announcement]');
    const listeners = new AbortController();
    let hovered = '';
    let focused = '';
    let tapped = '';
    let active = '';
    let lastRegion = '';
    let paused = true;
    let inputMode = 'pointer';
    let pointerType = 'mouse';
    let statIndex = 0;
    let rotationTimer;
    let overviewAnimation;
    let statAnimation;
    // Browser zoom can narrow a desktop viewport; retain clicks when a mouse is available.
    const mobileMap = window.matchMedia('(max-width: 640px) and (hover: none) and (pointer: coarse)');
    let detailView = null;
    let detailLoading = false;
    const animateText = element => {
      if (paused || reducedMotion() || !element.animate) return null;
      return element.animate([
        { opacity: .15, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 340, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    };
    const showStat = () => {
      const region = demoRegions.find(region => region.id === active);
      if (!region) return;
      const [number, label] = region.sports[statIndex];
      const value = document.createElement('span');
      value.className = 'home-entry__stat-number';
      value.textContent = String(number);
      statAnimation?.cancel();
      stat.replaceChildren(value, document.createTextNode(` ${label.toLocaleLowerCase('en-GB')}`));
      statAnimation = animateText(stat);
    };
    // One clock rotates sport facts during engagement, then tours random regions when idle.
    const scheduleRotation = () => {
      clearTimeout(rotationTimer);
      if (paused || detailView || detailLoading) return;
      rotationTimer = setTimeout(() => {
        if (hovered || focused) {
          const region = demoRegions.find(region => region.id === active);
          if (region) {
            statIndex = (statIndex + 1) % region.sports.length;
            showStat();
          }
        } else {
          tapped = '';
          const choices = demoRegions.filter(region => region.id !== lastRegion);
          const next = choices[Math.floor(Math.random() * choices.length)];
          if (next) selectRegion(next.id, true);
        }
        scheduleRotation();
      }, 5000);
    };
    const selectRegion = (next, automatic = false) => {
      if (next === active) return;
      stat.hidden = false;
      visuals.get(active)?.classList.remove('is-active');
      bases.get(active)?.classList.remove('is-selected');
      active = next;
      const region = demoRegions.find(region => region.id === active);
      targets.forEach(target => target.setAttribute('aria-pressed', String(target.dataset.region === active)));
      if (region) {
        lastRegion = region.id;
        const visual = visuals.get(active);
        // Raise only the decorative layer; keyboard order and pointer targets stay unchanged.
        if (visual) { liftLayer.append(visual); visual.classList.add('is-active'); }
        bases.get(active)?.classList.add('is-selected');
        name.textContent = region.name;
        count.textContent = `${region.clubs} clubs registered`;
        statIndex = Math.floor(Math.random() * region.sports.length);
        showStat();
      } else {
        name.textContent = 'Greater Manchester';
        count.textContent = 'Select a region';
        statAnimation?.cancel();
        stat.textContent = '';
        stat.hidden = true;
      }
      // Announce manual selections only; rotating demo figures remain quiet.
      if (announcement) announcement.textContent = automatic ? '' : region
        ? `${region.name}. ${region.clubs} clubs registered. Demo figures.` : 'Select a region.';
      overviewAnimation?.cancel();
      overviewAnimation = animateText(overview);
    };
    const engage = () => {
      if (detailView || detailLoading || dialog.classList.contains('is-opening')) return;
      selectRegion(hovered || focused || tapped);
      scheduleRotation();
    };
    /* Desktop loads internal shapes on activation; mobile keeps the borough overview. */
    const openRegion = async id => {
      if (mobileMap.matches) return;
      if (detailView || detailLoading || dialog.classList.contains('is-opening')) return;
      const region = demoRegions.find(item => item.id === id);
      detailLoading = true;
      clearTimeout(rotationTimer);
      overviewAnimation?.cancel();
      statAnimation?.cancel();
      count.textContent = 'Loading area map';
      try {
        const { mountRegionDetail } = await import('./home-region-detail.mjs?v=20261023-entry-handover');
        if (listeners.signal.aborted || mobileMap.matches || dialog.classList.contains('is-opening')) return;
        detailView = mountRegionDetail(map, region, {
          reducedMotion,
          selectArea(area) {
            name.textContent = area || region.name;
            // Detailed areas do not have real club counts connected yet.
            count.textContent = 'Club data coming soon';
            stat.hidden = true;
            announcement.textContent = `${area || region.name}. Club data coming soon.`;
          },
          close() {
            detailView?.destroy();
            detailView = null;
            active = '';
            selectRegion(id);
            targets.find(target => target.dataset.region === id)?.focus({ preventScroll: true });
            scheduleRotation();
          }
        });
        name.textContent = region.name;
        count.textContent = 'Club data coming soon';
        stat.hidden = true;
      } catch {
        stat.hidden = false;
        count.textContent = 'Area map unavailable';
        stat.textContent = 'Choose a region to try again';
      } finally {
        detailLoading = false;
        if (mobileMap.matches) {
          active = '';
          selectRegion(hovered || focused || tapped);
          scheduleRotation();
        }
      }
    };
    // Mouse focus must not behave like keyboard focus or retain a previous touch selection.
    const options = { signal: listeners.signal };
    // Crossing into mobile returns an open detail map to the normal overview.
    mobileMap.addEventListener('change', () => {
      if (!mobileMap.matches || !detailView) return;
      const region = active;
      detailView.destroy();
      detailView = null;
      active = '';
      selectRegion(region);
      scheduleRotation();
    }, options);
    document.addEventListener('keydown', () => { inputMode = 'keyboard'; }, { ...options, capture: true });
    document.addEventListener('pointerdown', event => {
      inputMode = 'pointer';
      pointerType = event.pointerType || 'mouse';
      if (focused) { focused = ''; engage(); }
    }, { ...options, capture: true });
    targets.forEach(target => {
      const id = target.dataset.region;
      target.addEventListener('pointerenter', event => {
        if (event.pointerType === 'touch') return;
        inputMode = 'pointer';
        focused = ''; tapped = ''; hovered = id;
        engage();
      }, options);
      target.addEventListener('pointerleave', event => {
        if (event.pointerType === 'touch') return;
        if (hovered === id) hovered = '';
        engage();
      }, options);
      target.addEventListener('focus', () => {
        if (inputMode !== 'keyboard') return;
        hovered = ''; tapped = ''; focused = id;
        engage();
      }, options);
      target.addEventListener('blur', event => {
        focused = inputMode === 'keyboard'
          ? event.relatedTarget?.closest?.('[data-region]')?.dataset.region || '' : '';
        engage();
      }, options);
      target.addEventListener('click', event => {
        if (event.detail === 0) {
          // Keyboard and assistive activation remain tied to keyboard focus.
          inputMode = 'keyboard';
          hovered = ''; tapped = ''; focused = id;
        } else if (pointerType === 'touch' || pointerType === 'pen') {
          hovered = ''; focused = ''; tapped = id;
        } else {
          focused = ''; tapped = ''; hovered = id;
        }
        engage();
        openRegion(id);
      }, options);
      target.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        hovered = ''; tapped = ''; focused = id;
        engage();
        openRegion(id);
      }, options);
    });
    // Also clear hover when exiting the SVG itself, including browser-specific group exits.
    map.addEventListener('pointerleave', event => {
      if (event.pointerType === 'touch' || !hovered) return;
      hovered = ''; engage();
    }, options);
    return {
      setPaused(value) {
        if (value === paused) return;
        paused = value;
        if (paused) { overviewAnimation?.cancel(); statAnimation?.cancel(); }
        scheduleRotation();
      },
      destroy() {
        listeners.abort();
        detailView?.destroy();
        clearTimeout(rotationTimer);
        overviewAnimation?.cancel();
        statAnimation?.cancel();
      }
    };
  }

  function showWelcome() {
  if (root.matches('.home-entry-pending, .home-entry-active')) return;
  if (!showOnEveryVisit) try {
    if (sessionStorage.getItem(key) === 'entered') return;
    // Check writes before gating the page: unavailable storage falls back to the normal home.
    sessionStorage.setItem(key, 'pending');
  } catch { return; }

  root.classList.add('home-entry-pending');
  let dialog;
  let cleanDialog;
  let finished = false;
  let cleanup = () => window.removeEventListener('pagereveal', skipIncomingTransition);
  let completionTimer;
  let revealTimer;
  const finish = (focusHome = false) => {
    if (finished) return;
    finished = true;
    clearTimeout(startupTimer);
    clearTimeout(completionTimer);
    clearTimeout(revealTimer);
    cleanup();
    if (dialog?.open) dialog.close();
    // Keep clean, closed markup in preview mode so browser Back can replay without a reload.
    if (showOnEveryVisit && cleanDialog) dialog?.replaceWith(cleanDialog.cloneNode(true));
    else dialog?.remove();
    root.classList.remove('home-entry-pending', 'home-entry-active', 'home-entry-revealing');
    window.dispatchEvent(new Event('home-entry:complete'));
    if (focusHome) document.getElementById('main-content')?.focus({ preventScroll: true });
  };
  // A failed stylesheet or interrupted setup must never leave visitors behind a blank gate.
  const startupTimer = setTimeout(() => finish(), 4000);
  const skipIncomingTransition = event => event.viewTransition?.skipTransition();
  window.addEventListener('pagereveal', skipIncomingTransition);

  const initialise = () => {
    if (finished) return;
    try {
      dialog = document.getElementById('home-entry');
      const enter = dialog?.querySelector('[data-home-enter]');
      const pause = dialog?.querySelector('[data-entry-pause]');
      if (!dialog || !enter || !pause || typeof dialog.showModal !== 'function'
        || getComputedStyle(dialog).getPropertyValue('--home-entry-ready').trim() !== '1') {
        finish();
        return;
      }
      cleanDialog = dialog.cloneNode(true);
      const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
      const universe = dialog.querySelector('.home-entry__universe');
      const items = [...dialog.querySelectorAll('[data-cell]')];
      const axes = dialog.querySelector('.home-entry__axes');
      let gridSignature = '';
      const columnLabel = index => {
        let label = '';
        for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
          label = String.fromCharCode(65 + (n - 1) % 26) + label;
        }
        return label;
      };
      // Cell addresses are literal: D5 always means column D, row 5, with A1 at top left.
      const positionGrid = () => {
        if (!universe) return;
        const cell = parseFloat(getComputedStyle(dialog).getPropertyValue('--entry-cell')) || 24;
        const columns = Math.max(1, Math.floor(universe.clientWidth / cell));
        const rows = Math.max(1, Math.floor(universe.clientHeight / cell));
        const mobile = window.matchMedia('(max-width: 640px)').matches;
        const signature = `${cell}:${columns}:${rows}:${mobile}`;
        if (signature === gridSignature) return;
        gridSignature = signature;
        items.forEach(item => {
          const address = mobile ? (item.dataset.mobileCell || item.dataset.cell) : item.dataset.cell;
          const match = /^([A-Z]+)([1-9]\d*)$/i.exec(address || '');
          let column = -1;
          let row = -1;
          if (match) {
            column = [...match[1].toUpperCase()].reduce((n, letter) => n * 26 + letter.charCodeAt(0) - 64, 0) - 1;
            row = Number(match[2]) - 1;
          }
          // Hide cells outside the screen instead of moving them to an incorrect address.
          item.hidden = column < 0 || row < 0 || column >= columns || row >= rows;
          if (!item.hidden) {
            item.style.left = `${column * cell}px`;
            item.style.top = `${row * cell}px`;
          }
        });
        if (!axes) return;
        axes.hidden = !showGridAxes;
        if (!showGridAxes) return;
        const labels = document.createDocumentFragment();
        const addLabel = (text, direction, offset) => {
          const label = document.createElement('span');
          label.className = `home-entry__axis-label home-entry__axis-label--${direction}`;
          label.textContent = text;
          label.style[direction === 'column' ? 'left' : 'top'] = `${offset}px`;
          labels.append(label);
        };
        // Label alternate cells so the denser grid keeps readable coordinate axes.
        for (let i = 0; i < columns; i += 2) addLabel(columnLabel(i), 'column', (i + .5) * cell);
        for (let i = 0; i < rows; i += 2) addLabel(String(i + 1), 'row', (i + .5) * cell);
        axes.replaceChildren(labels);
      };
      const sizeObserver = 'ResizeObserver' in window ? new ResizeObserver(positionGrid) : null;
      let userPaused = false;
      let opening = false;
      const reducedMotion = () => preference.matches || root.classList.contains('a11y-reduce-motion');
      const regionMap = initialiseRegionMap(dialog, reducedMotion);
      const updateMotion = () => {
        const reduced = reducedMotion();
        if (reduced && opening) { finish(true); return; }
        const stopped = reduced || userPaused || document.hidden || opening;
        dialog.classList.toggle('is-still', stopped);
        dialog.classList.toggle('is-reduced-motion', reduced);
        regionMap.setPaused(stopped);
        pause.hidden = reduced;
        pause.textContent = userPaused ? 'Resume effects' : 'Pause effects';
        pause.setAttribute('aria-pressed', String(userPaused));
      };
      const observer = new MutationObserver(updateMotion);
      cleanup = () => {
        document.removeEventListener('visibilitychange', updateMotion);
        preference.removeEventListener?.('change', updateMotion);
        window.removeEventListener('pagereveal', skipIncomingTransition);
        observer.disconnect();
        regionMap.destroy();
        sizeObserver?.disconnect();
        window.removeEventListener('resize', positionGrid);
      };
      document.addEventListener('visibilitychange', updateMotion);
      preference.addEventListener?.('change', updateMotion);
      observer.observe(root, { attributes: true, attributeFilter: ['class'] });
      pause.addEventListener('click', () => { userPaused = !userPaused; updateMotion(); });
      // Enter is required; native modal focus keeps hidden homepage controls out of tab order.
      dialog.addEventListener('cancel', event => event.preventDefault());
      dialog.addEventListener('animationend', event => {
        if (event.animationName === 'entry-curtain-up' && opening
          && event.target.classList.contains('home-entry__wash')) finish(true);
      });
      enter.addEventListener('click', () => {
        if (opening) return;
        opening = true;
        if (!showOnEveryVisit) try { sessionStorage.setItem(key, 'entered'); } catch { /* Enter still works if storage becomes unavailable. */ }
        enter.disabled = true;
        pause.disabled = true;
        if (reducedMotion()) { finish(true); return; }
        updateMotion();
        dialog.querySelectorAll('[data-region]').forEach(target => {
          target.setAttribute('tabindex', '-1');
          target.setAttribute('aria-disabled', 'true');
        });
        dialog.classList.add('is-opening');
        // First reach solid green; only then bring the page and its temporary reveal edge in.
        revealTimer = setTimeout(() => {
          if (finished) return;
          dialog.classList.add('is-transitioning');
          root.classList.add('home-entry-revealing');
        }, 900);
        // The timer also completes the transition when animations are disabled or interrupted.
        completionTimer = setTimeout(() => finish(true), 3100);
      });
      updateMotion();
      dialog.showModal();
      positionGrid();
      if (sizeObserver && universe) sizeObserver.observe(universe);
      else window.addEventListener('resize', positionGrid);
      root.classList.replace('home-entry-pending', 'home-entry-active');
      enter.focus({ preventScroll: true });
      clearTimeout(startupTimer);
    } catch { finish(); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialise, { once: true });
  else initialise();
  }

  showWelcome();
  if (showOnEveryVisit) window.addEventListener('pageshow', event => {
    if (event.persisted) showWelcome();
  });
})();
