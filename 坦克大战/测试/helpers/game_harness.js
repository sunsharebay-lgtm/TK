'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

function eventTarget(target = {}) {
  const handlers = new Map();
  target.addEventListener = (type, fn) => {
    if (!handlers.has(type)) handlers.set(type, []);
    handlers.get(type).push(fn);
  };
  target.emit = (type, event = {}) => {
    for (const fn of handlers.get(type) || []) fn({ preventDefault() {}, ...event });
  };
  return target;
}

function loadGame(options = {}) {
  const elements = new Map();
  const storage = new Map(Object.entries(options.storage || {}));
  const timers = new Map();
  let timerId = 0;
  const makeElement = (id = '') => {
    const classes = new Set();
    const context = new Proxy({
      measureText: text => ({ width: String(text).length * 6 }),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    }, { get: (obj, key) => key in obj ? obj[key] : () => {} });
    return eventTarget({
      id, style: {}, value: '', textContent: '', innerHTML: '', children: [],
      width: 0, height: 0, offsetWidth: 100, offsetHeight: 100,
      classList: {
        add: key => classes.add(key), remove: key => classes.delete(key),
        contains: key => classes.has(key),
        toggle(key, force = !classes.has(key)) { force ? classes.add(key) : classes.delete(key); return force; },
      },
      getContext: () => context,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      appendChild(child) { this.children.push(child); },
      setAttribute() {}, focus() {}, blur() {}, select() {}, setPointerCapture() {},
      querySelectorAll() { return []; }, matches() { return false; },
    });
  };
  const document = eventTarget({
    readyState: 'loading', hidden: false, documentElement: makeElement('html'),
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement(id));
      return elements.get(id);
    },
    createElement: makeElement,
  });
  const sandbox = eventTarget({
    assert, console, document, location: { hash: '' }, screen: {},
    navigator: { getGamepads: () => [], maxTouchPoints: 0 },
    innerWidth: 1280, innerHeight: 800, performance: { now: () => 0 },
    matchMedia: () => ({ matches: false }),
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem(key, value) {
        if (options.storageFails) throw new Error('QuotaExceededError');
        storage.set(key, String(value));
      },
      removeItem: key => storage.delete(key),
    },
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; },
    clearTimeout: id => timers.delete(id),
    setInterval: fn => { timers.set(++timerId, fn); return timerId; },
    clearInterval: id => timers.delete(id),
    requestAnimationFrame() {},
  });
  sandbox.window = sandbox;
  const filename = options.file || path.resolve(__dirname, '../../tank-battle.html');
  const html = fs.readFileSync(filename, 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1, 'Expected exactly one inline game script');
  vm.createContext(sandbox);
  vm.runInContext(scripts[0][1], sandbox, { filename, timeout: 5000 });
  const run = code => vm.runInContext(typeof code === 'function' ? `(${code.toString()})()` : code,
    sandbox, { timeout: 5000 });
  run('srand(20261027); Input.init(); Game.init();');
  return { run, sandbox, storage, elements, document, timers };
}

module.exports = { loadGame };
