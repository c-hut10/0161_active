import { regionShapes } from './home-region-shapes.mjs?v=20261023-all-wards';

/* Zoomed maps use ready-made paths; the browser performs no tracing or geographical lookup. */
export function mountRegionDetail(map, region, { selectArea, close, reducedMotion }) {
  const data = regionShapes[region.id];
  if (!data) throw new Error('Region shape unavailable');
  const ns = 'http://www.w3.org/2000/svg';
  // Keep the original SVG frame; one camera moves the borough and its internal paths together.
  const originalGroups = [...map.children].filter(node => node.tagName.toLowerCase() === 'g');
  const camera = document.createElementNS(ns, 'g');
  camera.classList.add('home-entry__map-camera');
  map.append(camera);
  originalGroups.forEach(group => camera.append(group));
  const selected = map.querySelector(`[data-region-base="${region.id}"]`);
  const bounds = selected.getBBox();
  selected.classList.add('is-zoom-selected');
  const originalTargets = [...map.querySelectorAll('[data-region]')];
  originalTargets.forEach(target => { target.setAttribute('tabindex', '-1'); target.setAttribute('aria-hidden', 'true'); });
  map.classList.add('is-detail');
  const originalClip = map.style.clipPath;
  let cameraFrame;
  let finishCamera;
  const cancelCamera = () => {
    cancelAnimationFrame(cameraFrame);
    finishCamera?.();
    finishCamera = null;
  };
  let alive = true;
  // Centre a modest 1.3x detail zoom in the left door, capped by its safe edges.
  const fittedTransform = () => {
    const door = map.closest('.home-entry__door--left').getBoundingClientRect();
    // Clip only the artwork; the door background must remain continuous at the seam.
    const frame = map.getBoundingClientRect();
    map.style.clipPath = `inset(${door.top+25-frame.top}px ${frame.right-door.right+25}px ${frame.bottom-door.bottom+25}px ${door.left+25-frame.left}px)`;
    const scene = map.closest('.home-entry');
    const copy = scene.querySelector('.home-entry__title').getBoundingClientRect();
    const centreX = door.left + door.width / 2;
    const centreY = door.top + door.height / 2;
    const halfWidth = Math.max(1, door.width / 2 - 37);
    const top = door.top + 37;
    const bottom = Math.min(door.bottom - 37, copy.top - 24);
    const halfHeight = Math.max(1, Math.min(centreY - top, bottom - centreY));
    const inverse = map.getScreenCTM().inverse();
    const centre = new DOMPoint(centreX, centreY).matrixTransform(inverse);
    const start = new DOMPoint(centreX-halfWidth, centreY-halfHeight).matrixTransform(inverse);
    const end = new DOMPoint(centreX+halfWidth, centreY+halfHeight).matrixTransform(inverse);
    const preferredScale = 1.3 * Math.min(330 / bounds.width, 230 / bounds.height);
    const scale = Math.min(preferredScale, (end.x-start.x)/bounds.width, (end.y-start.y)/bounds.height);
    const x = centre.x-scale*(bounds.x+bounds.width/2);
    const y = centre.y-scale*(bounds.y+bounds.height/2);
    return `matrix(${scale},0,0,${scale},${x},${y})`;
  };
  // Animate SVG coordinates directly so painting, hit areas and outside taps share one matrix.
  const moveCamera = (destination, duration) => {
    const from = new DOMMatrix(camera.getAttribute('transform') || undefined);
    const to = new DOMMatrix(destination);
    cancelCamera();
    if (reducedMotion()) {
      camera.setAttribute('transform', destination);
      return Promise.resolve();
    }
    return new Promise(resolve => {
      finishCamera = resolve;
      const started = performance.now();
      const tick = now => {
        const progress = Math.min(1, (now-started)/duration);
        const eased = 1-Math.pow(1-progress, 3);
        const values = ['a','b','c','d','e','f'].map(key => from[key]+(to[key]-from[key])*eased);
        camera.setAttribute('transform', `matrix(${values.join(',')})`);
        if (progress < 1) cameraFrame = requestAnimationFrame(tick);
        else { finishCamera = null; resolve(); }
      };
      cameraFrame = requestAnimationFrame(tick);
    });
  };
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'home-entry__map-back';
  back.textContent = '← Back to Greater Manchester';
  const svg = document.createElementNS(ns, 'g');
  svg.classList.add('home-entry__area-layer');
  const [, , width, height] = data.viewBox.split(' ').map(Number);
  svg.setAttribute('transform', `translate(${bounds.x} ${bounds.y}) scale(${bounds.width/(width-32)} ${bounds.height/(height-32)})`);
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', `${region.name}: explore internal areas`);
  camera.append(svg);
  const base = document.createElementNS(ns, 'g');
  const raised = document.createElementNS(ns, 'g');
  const targets = document.createElementNS(ns, 'g');
  // The outer edge is drawn by the original borough; only shared internal edges are added here.
  const borders = document.createElementNS(ns, 'path');
  borders.setAttribute('d', data.borders);
  borders.setAttribute('class', 'home-entry__area-outline');
  borders.setAttribute('aria-hidden', 'true');
  base.append(borders);
  const clip = document.createElementNS(ns, 'clipPath');
  clip.id = `entry-area-clip-${region.id}`;
  clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
  const perimeter = document.createElementNS(ns, 'path');
  perimeter.setAttribute('d', data.outline);
  clip.append(perimeter);
  svg.append(clip);
  raised.setAttribute('clip-path', `url(#${clip.id})`);
  svg.append(base, raised, targets);
  let active;
  const choose = (visual, button, area) => {
    active?.visual.classList.remove('is-active');
    active?.button.setAttribute('aria-pressed', 'false');
    active = { visual, button };
    raised.append(visual);
    visual.classList.add('is-active');
    button.setAttribute('aria-pressed', 'true');
    selectArea(area.name, area.confirmedName);
  };
  data.areas.forEach((area, index) => {
    const path = className => {
      const node = document.createElementNS(ns, 'path');
      node.setAttribute('d', area.path);
      node.setAttribute('class', className);
      node.setAttribute('fill-rule', 'evenodd');
      return node;
    };
    const visual = document.createElementNS(ns, 'g');
    visual.classList.add('home-entry__area-visual');
    visual.setAttribute('aria-hidden', 'true');
    visual.append(path('home-entry__area-halo'), path('home-entry__area-fill'));
    raised.append(visual);
    const target = path('home-entry__area-target');
    target.setAttribute('tabindex', '-1');
    target.setAttribute('role', 'button');
    target.setAttribute('aria-label', area.confirmedName
      ? `${area.name}${area.wardNumber ? `, ward ${area.wardNumber}` : ''} in ${region.name}`
      : `${area.name}, section ${index + 1} of ${region.name}`);
    target.setAttribute('aria-pressed', 'false');
    target.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') choose(visual, target, area);
    });
    target.addEventListener('focus', () => {
      choose(visual, target, area);
    });
    target.addEventListener('click', () => choose(visual, target, area));
    target.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      choose(visual, target, area);
    });
    const clear = () => {
      if ((document.activeElement === target && target.matches(':focus-visible')) || active?.button !== target) return;
      visual.classList.remove('is-active');
      target.setAttribute('aria-pressed', 'false');
      active = null;
      selectArea('');
    };
    target.addEventListener('pointerleave', clear);
    target.addEventListener('blur', clear);
    targets.append(target);
  });
  map.after(back);
  let closing = false;
  let revealTimer;
  const goBack = async () => {
    if (closing) return;
    closing = true;
    clearTimeout(revealTimer);
    back.disabled = true;
    svg.classList.remove('is-visible');
    targets.querySelectorAll('[tabindex]').forEach(target => target.setAttribute('tabindex', '-1'));
    map.classList.remove('is-detail');
    await moveCamera('matrix(1,0,0,1,0,0)', 650);
    if (alive) close();
  };
  back.addEventListener('click', goBack);
  /* Empty space returns to the overview; use the moving outline rather than its rectangular bounds. */
  const emptySpace = document.createElementNS(ns, 'rect');
  const frame = map.viewBox.baseVal;
  for (const key of ['x', 'y', 'width', 'height']) emptySpace.setAttribute(key, frame[key]);
  emptySpace.setAttribute('fill', 'transparent');
  emptySpace.setAttribute('pointer-events', 'all');
  emptySpace.setAttribute('aria-hidden', 'true');
  map.insertBefore(emptySpace, camera);
  const outline = map.querySelector(`#entry-shape-${region.id}`);
  const leftDoor = map.closest('.home-entry__door--left');
  leftDoor.classList.add('has-region-detail');
  const outsideClick = event => {
    if (closing || !alive || map.closest('.is-opening')) return;
    // Native ward targets are authoritative; never reinterpret their clicks as outside taps.
    if (event.target.closest?.('.home-entry__area-target')) return;
    // Keyboard activation has no pointer location; touchscreen clicks may still have detail zero.
    if (event.detail === 0 && event.clientX === 0 && event.clientY === 0) return;
    const matrix = camera.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    if (!outline.isPointInFill(point)) goBack();
  };
  leftDoor.addEventListener('click', outsideClick);
  const escape = event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    goBack();
  };
  map.parentElement.addEventListener('keydown', escape);
  // Reveal the internal lines halfway through the zoom, without shortening the camera motion.
  const revealAreas = () => {
    if (alive && !closing) {
      svg.classList.add('is-visible');
      targets.querySelectorAll('[tabindex]').forEach(target => target.setAttribute('tabindex', '0'));
    }
  };
  moveCamera(fittedTransform(), 850);
  // Browser zoom can change positions even when clamped map dimensions stay unchanged.
  let refitFrame;
  const refit = () => {
    cancelAnimationFrame(refitFrame);
    refitFrame = requestAnimationFrame(() => {
      if (!alive || closing) return;
      cancelCamera();
      camera.setAttribute('transform', fittedTransform());
    });
  };
  let previousSize = `${map.clientWidth}:${map.clientHeight}:${leftDoor.clientHeight}`;
  const resizeObserver = new ResizeObserver(() => {
    const size = `${map.clientWidth}:${map.clientHeight}:${leftDoor.clientHeight}`;
    if (size === previousSize) return;
    previousSize = size;
    refit();
  });
  resizeObserver.observe(map);
  resizeObserver.observe(leftDoor);
  window.addEventListener('resize', refit);
  window.visualViewport?.addEventListener('resize', refit);
  if (reducedMotion()) revealAreas();
  else revealTimer = setTimeout(revealAreas, 425);
  back.focus({ preventScroll: true });
  return { namedAreaCount: data.areas.filter(area => area.confirmedName).length, destroy() {
    alive = false;
    resizeObserver.disconnect();
    window.removeEventListener('resize', refit);
    window.visualViewport?.removeEventListener('resize', refit);
    cancelAnimationFrame(refitFrame);
    map.style.clipPath = originalClip;
    clearTimeout(revealTimer);
    cancelCamera();
    leftDoor.removeEventListener('click', outsideClick);
    leftDoor.classList.remove('has-region-detail');
    emptySpace.remove();
    map.parentElement.removeEventListener('keydown', escape);
    originalGroups.forEach(group => map.append(group));
    originalTargets.forEach(target => { target.setAttribute('tabindex', '0'); target.removeAttribute('aria-hidden'); });
    selected.classList.remove('is-zoom-selected');
    map.classList.remove('is-detail');
    camera.remove();
    back.remove();
  } };
}
