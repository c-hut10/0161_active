import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { savedClubsKey, readSavedClubs, writeSavedClubs } from '../js/saved-clubs.mjs';

test('redrawn calendar buttons settle without a repeated text mutation loop', () => {
  let writes = 0;
  let text = '';
  const button = {
    dataset: { favouriteId: 'club-a', clubName: 'Club A' },
    get textContent() {
      return text;
    },
    set textContent(value) {
      text = value;
      writes++;
    },
    setAttribute() {}
  };
  const element = () => ({ setAttribute() {}, querySelector: () => ({ addEventListener() {} }) });
  let observerCallback;
  const context = vm.createContext({
    key: 'saved',
    readSavedClubs: () => ({ ids: new Set(), error: false }),
    writeSavedClubs() {},
    document: {
      createElement: element,
      body: { append() {} },
      addEventListener() {},
      querySelector: () => ({}),
      querySelectorAll: () => [button]
    },
    window: { addEventListener() {} },
    MutationObserver: class {
      constructor(callback) {
        observerCallback = callback;
      }
      observe() {}
    }
  });
  const source = fs.readFileSync(new URL('../js/club-favourites.js', import.meta.url), 'utf8');
  vm.runInContext(source.replace(/^import .*;$/m, ''), context);
  assert.equal(text, 'Save To Calendar');
  assert.equal(writes, 1);
  observerCallback();
  observerCallback();
  assert.equal(writes, 1);
  vm.runInContext("ids.add('club-a'); enhance();", context);
  assert.equal(text, 'Saved');
  observerCallback();
  assert.equal(writes, 2);
});

function storageContext(t, initial = []) {
  const descriptors = ['localStorage', 'window'].map((name) => [
    name,
    Object.getOwnPropertyDescriptor(globalThis, name)
  ]);
  const values = new Map([[savedClubsKey, JSON.stringify(initial)]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: new EventTarget() });
  t.after(() => {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  return { values, storage };
}

test('favourite notifications expose the saved state and removing the last club clears storage', (t) => {
  const { values } = storageContext(t, ['club-a', 'club-b']);
  const notified = [];
  globalThis.window.addEventListener('saved-clubs-changed', () => notified.push([...readSavedClubs().ids]));
  writeSavedClubs(new Set(['club-b']));
  assert.deepEqual([...readSavedClubs().ids], ['club-b']);
  writeSavedClubs(new Set());
  assert.equal(values.has(savedClubsKey), false);
  assert.deepEqual(notified, [['club-b'], []]);
});

test('blocked favourite writes preserve the saved clubs and never announce success', (t) => {
  const { storage } = storageContext(t, ['club-a']);
  let notifications = 0;
  globalThis.window.addEventListener('saved-clubs-changed', () => notifications++);
  storage.setItem = () => {
    throw new Error('Storage blocked');
  };
  assert.throws(() => writeSavedClubs(new Set(['club-b'])), /Storage blocked/);
  storage.removeItem = () => {
    throw new Error('Storage blocked');
  };
  assert.throws(() => writeSavedClubs(new Set()), /Storage blocked/);
  assert.deepEqual([...readSavedClubs().ids], ['club-a']);
  assert.equal(notifications, 0);
});
