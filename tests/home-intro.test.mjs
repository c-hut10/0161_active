import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { visibleSportRecords } from '../js/sport-catalog.mjs';
import { displaySportName, escapeHtml } from '../js/club-formatting.mjs';

const source = fs.readFileSync(new URL('../js/home-entry.js', import.meta.url), 'utf8');
const order = [
  'bolton',
  'bury',
  'rochdale',
  'oldham',
  'tameside',
  'stockport',
  'manchester',
  'trafford',
  'salford',
  'wigan'
];
function classes() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
    toggle(name, active) {
      if (active) values.add(name);
      else values.delete(name);
    }
  };
}
function events() {
  const listeners = new Map();
  return {
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name) => listeners.delete(name),
    fire: (name) => listeners.get(name)?.()
  };
}
function intro({ seen = false, path = '/', reduced = false, blocked = false, seed = 1 } = {}) {
  let now = 0,
    next = 0;
  const timers = new Map();
  const storage = new Map(seen ? [['0161active-home-intro-seen', '1']] : []);
  const root = { classList: classes() };
  const regions = order.map((id) => ({ dataset: { regionVisual: id }, classList: classes() }));
  let removed = false;
  const properties = new Map();
  const style = { setProperty: (name, value) => properties.set(name, value) };
  const sportNode = (textContent) => ({ textContent, cloneNode: () => sportNode(textContent) });
  const track = {
    style,
    children: Array.from({ length: 21 }, (_, index) => sportNode(`Sport ${index}`)),
    replaceChildren(...nodes) {
      this.children = nodes;
    }
  };
  const math = Object.create(Math);
  math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const panel = {
    classList: classes(),
    style,
    querySelector: () => track,
    querySelectorAll: () => regions,
    remove: () => {
      removed = true;
    }
  };
  const content = { inert: false };
  const document = {
    ...events(),
    readyState: 'complete',
    documentElement: root,
    getElementById: (id) => (id === 'home-entry' ? panel : content)
  };
  const window = events();
  vm.runInNewContext(source, {
    document,
    window,
    Math: math,
    location: { pathname: path },
    sessionStorage: {
      getItem: (key) => {
        if (blocked) throw new Error('Storage blocked');
        return storage.get(key);
      },
      setItem: (key, value) => storage.set(key, value)
    },
    matchMedia: () => ({ ...events(), matches: reduced }),
    performance: { now: () => now },
    setTimeout: (fn, delay) => {
      const id = ++next;
      timers.set(id, { fn, at: now + delay });
      return id;
    },
    clearTimeout: (id) => timers.delete(id)
  });
  return {
    root,
    panel,
    content,
    storage,
    document,
    window,
    timers,
    track,
    properties,
    removed: () => removed,
    trail: () =>
      regions
        .filter((node) => node.classList.contains('is-trail-near') || node.classList.contains('is-trail-far'))
        .map((node) => node.dataset.regionVisual),
    lit: () => regions.filter((node) => node.classList.contains('is-lit')).map((node) => node.dataset.regionVisual),
    advance(until) {
      for (;;) {
        const due = [...timers].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = until;
    }
  };
}
test('two clockwise pulses settle before a third pass accumulates highlights and grows into the reveal', () => {
  const page = intro();
  assert.equal(page.content.inert, true);
  assert.equal(page.panel.classList.contains('is-spinning'), true);
  assert.equal(page.properties.get('--intro-cycle-time'), '2010ms');
  for (let cycle = 0; cycle < 3; cycle++) {
    order.forEach((region, index) => {
      page.advance(cycle * 2010 + index * 100);
      assert.deepEqual(page.lit(), cycle < 2 ? [region] : order.slice(0, index + 1));
      assert.deepEqual(page.trail(), order.slice(Math.max(0, index - 2), index));
    });
    if (cycle < 2) {
      page.advance(cycle * 2010 + 1000);
      assert.deepEqual(page.lit(), []);
      assert.deepEqual(page.trail(), order.slice(-2));
      page.advance(cycle * 2010 + 1100);
      assert.deepEqual(page.trail(), order.slice(-1));
      page.advance(cycle * 2010 + 1200);
      assert.deepEqual(page.trail(), []);
      page.advance(cycle * 2010 + 2009);
      assert.deepEqual(page.lit(), []);
    }
  }
  page.advance(5020);
  assert.deepEqual(page.lit(), order);
  assert.deepEqual(page.trail(), []);
  assert.equal(page.panel.classList.contains('is-complete'), true);
  page.advance(5319);
  assert.equal(page.root.classList.contains('home-intro-leaving'), false);
  page.advance(5320);
  assert.equal(page.root.classList.contains('home-intro-leaving'), true);
  page.document.fire('visibilitychange');
  page.advance(5970);
  assert.equal(page.removed(), true);
  assert.equal(page.content.inert, false);
  assert.equal(page.root.classList.contains('home-intro-active'), false);
  assert.equal(page.timers.size, 0);
  assert.equal(page.storage.get('0161active-home-intro-seen'), '1');
});
test('repeat homepage visits in the same tab skip the intro while direct profile visits remain untouched', () => {
  const repeat = intro({ seen: true });
  assert.equal(repeat.root.classList.contains('home-intro-active'), false);
  assert.equal(repeat.content.inert, false);
  assert.equal(repeat.timers.size, 0);
  assert.equal(repeat.storage.get('0161active-home-intro-seen'), '1');
  const profile = intro({ path: '/html/korfball/manchester-warriors.html' });
  assert.equal(profile.storage.size, 0);
  assert.equal(profile.timers.size, 0);
});
test('reduced motion keeps a static neon map then clears the intro without a roll', () => {
  const page = intro({ reduced: true });
  assert.deepEqual(page.lit(), order);
  assert.equal(page.panel.classList.contains('is-reduced-motion'), true);
  assert.equal(page.panel.classList.contains('is-complete'), false);
  page.advance(5970);
  assert.equal(page.removed(), true);
  assert.equal(page.content.inert, false);
});
test('blocked storage cannot strand the homepage behind the intro', () => {
  const page = intro({ blocked: true });
  page.advance(5970);
  assert.equal(page.removed(), true);
  assert.equal(page.content.inert, false);
});
test('leaving during the intro cleans it up before browser history restores the page', () => {
  const page = intro();
  page.advance(600);
  page.window.fire('pagehide');
  assert.equal(page.removed(), true);
  assert.equal(page.content.inert, false);
  assert.equal(page.timers.size, 0);
});

test('each intro selects fourteen distinct sports and repeats only six rows for a seamless loop', () => {
  const first = intro({ seed: 42 });
  const second = intro({ seed: 101 });
  const names = (page) => page.track.children.map((node) => node.textContent);
  assert.equal(first.track.children.length, 20);
  assert.equal(new Set(names(first).slice(0, 14)).size, 14);
  assert.deepEqual(names(first).slice(14), names(first).slice(0, 6));
  assert.notDeepEqual(names(first).slice(0, 14), names(second).slice(0, 14));
  assert.equal(first.properties.get('--intro-sport-count'), '14');
});

test('intro sport options match the current visible directory rather than the full hidden catalogue', () => {
  const read = (file) => JSON.parse(fs.readFileSync(new URL(file, import.meta.url), 'utf8'));
  const visible = visibleSportRecords(read('../data/sports.json'), read('../data/clubs.json').clubs);
  const page = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const track = page.match(/<ul class="home-entry__sports-track" data-intro-sports>([\s\S]*?)<\/ul>/)[1];
  assert.deepEqual(
    [...track.matchAll(/<li>(.*?)<\/li>/g)].map((match) => match[1]),
    visible.map((sport) => escapeHtml(displaySportName(sport.name)))
  );
});
