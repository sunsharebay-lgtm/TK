'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Fresh, deterministic browser boundary for each behavioral test.
function createGame(seed = 1, initialStorage = {}) {
  const storage = { ...initialStorage }, handlers = {}, elements = {};
  const context = new Proxy({}, { get(t, k) {
    if (k in t) return t[k];
    if (k === 'measureText') return s => ({ width: String(s).length * 7 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() {} });
    return () => {};
  }});
  const element = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, removeEventListener() {}, setAttribute() {},
    getContext: () => context, querySelectorAll: () => [], dataset: {} });
  const math = Object.create(Math);
  math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const s = { console, Math: math, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    navigator: {}, performance: { now: () => 0 }, requestAnimationFrame() {},
    setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {},
    addEventListener: (k, fn) => (handlers[k] ||= []).push(fn), removeEventListener() {},
    localStorage: { getItem: k => storage[k] ?? null, setItem: (k, v) => { storage[k] = String(v); } },
    document: { readyState: 'complete', hidden: false,
      getElementById: id => elements[id] ||= element(), createElement: element,
      addEventListener: (k, fn) => (handlers['doc_' + k] ||= []).push(fn) }
  };
  s.window = s;
  vm.createContext(s);
  const src = fs.readdirSync(path.join(__dirname, '../src')).filter(f => f.endsWith('.js')).sort()
    .map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
  vm.runInContext(src + '\nwindow.TEST={Player,Goomba,Koopa,Plant,Mover,FireBar,StaticCoin,Builder,areaOf,moveAndCollide,entTileAt,TL,CFG,SR};', s);
  const { G, INP } = s.__SPL;
  const step = (n = 1, keys = {}) => {
    for (let i = 0; i < n; i++) {
      INP.just = {};
      for (const k of new Set([...Object.keys(INP.keys), ...Object.keys(keys)])) {
        if (keys[k] && !INP.keys[k]) INP.just[k] = true;
        INP.keys[k] = !!keys[k];
      }
      G.step();
    }
  };
  const start = (level = 0) => {
    G.mode = 'classic'; G.pickLevel = level; G.newGame();
    for (let i = 0; i < 180 && G.state !== 'play'; i++) step();
    step(30); return G.player;
  };
  return { ...s.__SPL, ...s.TEST, storage, handlers, step, start, eval: code => vm.runInContext(code, s) };
}
module.exports = { createGame };
