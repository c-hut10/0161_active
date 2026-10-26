/* Adapted from mutsuyuki/Leaflet.SmoothWheelZoom (MIT), Copyright (c) 2018 mutsuyuki.
 * Source: https://github.com/mutsuyuki/Leaflet.SmoothWheelZoom/blob/master/SmoothWheelZoom.js
 * Local changes: modifier gating, reduced motion, frame convergence and complete cleanup.
 * See LICENSE.txt in this directory. Leaflet's private movement API stays isolated here.
 */
export function attachSmoothWheelZoom(map) {
  const L = window.L;
  const isMac = /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform || '');
  const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');
  const Handler = L.Handler.extend({
    addHooks() {
      this._animationId = null;
      this._timeoutId = null;
      this._stepTimer = null;
      this._stepDelta = 0;
      this._isWheeling = false;
      this._element = this._map.getContainer();
      this._wheel = this._onWheelScroll.bind(this);
      this._stop = () => this._finish();
      this._keyUp = event => {
        if (event.key === (isMac ? 'Meta' : 'Control')) this._finish();
      };
      this._visibility = () => { if (document.hidden) this._finish(); };
      this._preference = () => {
        if (this._reduced()) this._finish();
      };
      this._element.addEventListener('wheel', this._wheel, { passive:false });
      this._element.addEventListener('mouseleave', this._stop);
      window.addEventListener('keyup', this._keyUp);
      window.addEventListener('blur', this._stop);
      document.addEventListener('visibilitychange', this._visibility);
      reducedMotion.addEventListener('change', this._preference);
      this._preferenceObserver = new MutationObserver(this._preference);
      this._preferenceObserver.observe(document.documentElement, { attributes:true, attributeFilter:['class'] });
    },
    removeHooks() {
      this._finish(false);
      this._element.removeEventListener('wheel', this._wheel);
      this._element.removeEventListener('mouseleave', this._stop);
      window.removeEventListener('keyup', this._keyUp);
      window.removeEventListener('blur', this._stop);
      document.removeEventListener('visibilitychange', this._visibility);
      reducedMotion.removeEventListener('change', this._preference);
      this._preferenceObserver.disconnect();
    },
    _reduced() {
      return reducedMotion.matches || document.documentElement.classList.contains('a11y-reduce-motion');
    },
    _onWheelScroll(event) {
      if (!(isMac ? event.metaKey : event.ctrlKey)) { this._finish(); return; }
      if (event.target instanceof Element && event.target.closest('.leaflet-control, .leaflet-popup')) return;
      const delta = L.DomEvent.getWheelDelta(event);
      if (!delta) return;
      event.preventDefault();
      event.stopPropagation();
      const map = this._map;
      this._wheelMousePosition = map.mouseEventToContainerPoint(event);
      if (this._reduced()) {
        // Keep discrete, gentle zoom steps for visitors who disable motion.
        this._stepDelta += delta;
        if (this._stepTimer !== null) return;
        this._stepTimer = setTimeout(() => {
          this._stepTimer = null;
          if (this._stepDelta) map.setZoomAround(this._wheelMousePosition,
            map.getZoom() + Math.sign(this._stepDelta) * map.options.zoomDelta, { animate:false });
          this._stepDelta = 0;
        }, 160);
        return;
      }
      if (!this._isWheeling) {
        map._stop();
        if (map._panAnim) map._panAnim.stop();
        this._isWheeling = true;
        this._moved = false;
        this._centerPoint = map.getSize().divideBy(2);
        this._goalZoom = map.getZoom();
        this._prevCenter = map.getCenter();
        this._prevZoom = map.getZoom();
      }
      this._wheelMouseLatLng = map.containerPointToLatLng(this._wheelMousePosition);
      this._goalZoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(),
        this._goalZoom + delta * .003 * (map.options.smoothSensitivity ?? 1)));
      clearTimeout(this._timeoutId);
      this._timeoutId = setTimeout(() => this._finish(), 200);
      this._schedule();
    },
    _schedule() {
      if (this._animationId === null) this._animationId = requestAnimationFrame(() => this._updateWheelZoom());
    },
    _updateWheelZoom() {
      this._animationId = null;
      if (!this._isWheeling) return;
      const map = this._map;
      // A filter, pan or zoom button can take over without leaving an orphaned frame loop.
      if (!map.getCenter().equals(this._prevCenter) || map.getZoom() !== this._prevZoom) {
        this._finish(false); return;
      }
      const remaining = this._goalZoom - map.getZoom();
      if (Math.abs(remaining) < .000001) return;
      const zoom = Math.abs(remaining) < .001 ? this._goalZoom : map.getZoom() + remaining * .3;
      const delta = this._wheelMousePosition.subtract(this._centerPoint);
      const center = map.unproject(map.project(this._wheelMouseLatLng, zoom).subtract(delta), zoom);
      if (!this._moved) { map._moveStart(true, false); this._moved = true; }
      map._move(center, zoom);
      this._prevCenter = map.getCenter();
      this._prevZoom = map.getZoom();
      if (Math.abs(this._goalZoom - zoom) >= .000001) this._schedule();
    },
    _finish(emitEnd = true) {
      cancelAnimationFrame(this._animationId);
      clearTimeout(this._timeoutId);
      clearTimeout(this._stepTimer);
      this._animationId = this._timeoutId = this._stepTimer = null;
      this._stepDelta = 0;
      this._isWheeling = false;
      const moved = this._moved;
      this._moved = false;
      if (moved && emitEnd && this._map._loaded) this._map._moveEnd(true);
    }
  });
  map.addHandler('smoothWheelZoom', Handler);
  map.smoothWheelZoom.enable();
  map.on('unload', () => map.smoothWheelZoom.disable());
  return map.smoothWheelZoom;
}
