'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const runtime = path.resolve(__dirname, '../../网页复刻/吞食天地Ⅱ同人复刻-网页版');

async function engine() {
  const stored = {}, messages = [];
  const ctx = new Proxy({ measureText: text => ({ width: String(text).length * 12 }),
    createLinearGradient: () => ({ addColorStop() {} }) }, { get: (target, key) => target[key] || (() => {}) });
  const canvas = { style: {}, width: 816, height: 624, getContext: () => ctx };
  const context = {
    console: { log() {}, warn: (...args) => messages.push(args.join(' ')), error: (...args) => messages.push(args.join(' ')) },
    setTimeout, clearTimeout, URLSearchParams, HTMLImageElement: class {}, addEventListener() {},
    document: { hidden: false, querySelectorAll: () => [], addEventListener() {},
      getElementById: () => canvas, createElement: () => canvas },
    localStorage: { getItem: k => stored[k] ?? null, setItem: (k, v) => { stored[k] = String(v); } },
    fetch: async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(runtime, url), 'utf8')) }),
    Math: Object.create(Math),
  };
  context.Math.random = () => 0.5;
  context.window = context;
  vm.createContext(context);
  for (const file of ['core', 'data', 'interp', 'windows', 'mapscene', 'menus', 'battle', 'preview', 'main']) {
    let source = fs.readFileSync(path.join(runtime, `js/${file}.js`), 'utf8');
    // Load the real scene manager without starting the browser's perpetual render loop.
    if (file === 'main') source = source.replace(/T\.GameMain\.boot\(\);\s*$/, '');
    vm.runInContext(source, context, { filename: file + '.js' });
  }
  const T = context.T;
  const audioMethods = { ...T.AudioManager };
  T.ImageManager.load = async () => null;
  for (const key of Object.keys(T.AudioManager)) if (typeof T.AudioManager[key] === 'function') T.AudioManager[key] = () => {};
  T.mainCtx = ctx;
  await T.DataManager.loadAll();
  for (const id of [2, 3, 4, 5, 6]) T.$gameParty.addActor(id);
  await T.SceneManager.gotoMap(27, 17, 23, 2);
  const press = (scene, key) => {
    T.Input.clear(); T.Input._down[key] = true; scene.update(); T.Input.update();
    T.Input._down = {}; T.Input.update();
  };
  const battle = (id = 16) => new T.Scene_Battle({ troopId: id, canEscape: true, canLose: true }, T.$gameMap.interpreter);
  return { T, context, stored, messages, press, battle, ctx, audioMethods };
}
module.exports = { engine, runtime };
