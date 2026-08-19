#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const requestedFile = process.argv[2];
const file = requestedFile && path.basename(requestedFile) !== 'tank-battle.html'
  ? requestedFile
  : path.join(__dirname, '..', 'three-kingdoms.html');
assert.ok(fs.existsSync(file), `游戏入口必须存在: ${file}`);
const html = fs.readFileSync(file, 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, '游戏页面必须包含 inline script');

function makeContext() {
  const noop = () => {};
  const ctx2d = new Proxy({ canvas: null, measureText: (value) => ({ width: String(value).length * 6 }) }, {
    get(target, key) {
      if (key in target) return target[key];
      return noop;
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  });
  const elements = {};
  function makeElement(id, tag = 'div') {
    const element = {
      id,
      tagName: tag.toUpperCase(),
      style: {},
      className: '',
      classList: { add: noop, remove: noop, toggle: () => false, contains: () => false },
      children: [],
      textContent: '',
      innerHTML: '',
      value: '',
      disabled: false,
      width: 0,
      height: 0,
      appendChild(child) { this.children.push(child); return child; },
      append(...children) { this.children.push(...children); },
      removeChild: noop,
      addEventListener: noop,
      removeEventListener: noop,
      setAttribute: noop,
      getAttribute: () => null,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 256, height: 240 }),
      querySelector: () => null,
      querySelectorAll: () => [],
      focus: noop,
      click: noop,
    };
    if (tag === 'canvas') {
      element.getContext = () => ctx2d;
      ctx2d.canvas = element;
    }
    return element;
  }
  elements['game-canvas'] = makeElement('game-canvas', 'canvas');
  const document = {
    readyState: 'complete',
    getElementById(id) {
      if (!elements[id]) elements[id] = makeElement(id);
      return elements[id];
    },
    createElement(tag) { return makeElement(`created-${tag}`, tag); },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: noop,
    removeEventListener: noop,
    body: makeElement('body'),
    documentElement: makeElement('html'),
  };
  const context = {
    console,
    document,
    navigator: { maxTouchPoints: 0 },
    location: { hash: '' },
    innerWidth: 1024,
    innerHeight: 768,
    devicePixelRatio: 1,
    requestAnimationFrame: noop,
    cancelAnimationFrame: noop,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    Uint8Array,
    Array,
  };
  context.window = context;
  context.globalThis = context;
  context.addEventListener = noop;
  context.removeEventListener = noop;
  context.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop });
  context.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
  return context;
}

const context = makeContext();
vm.runInNewContext(match[1], context, { filename: path.basename(file) });
assert.equal(context.Game.state, 'title', '启动时 Game.state 必须是 title');
assert.equal(typeof context.Game.startNew, 'function', 'Game.startNew 必须暴露');
assert.equal(typeof context.Game.enterWorld, 'function', 'Game.enterWorld 必须暴露');
assert.equal(typeof context.Game.returnToTitle, 'function', 'Game.returnToTitle 必须暴露');
assert.equal(context.Game.startNew(), 'world', 'Game.startNew() 应进入 world');
assert.equal(context.Game.state, 'world');
assert.equal(context.Game.enterWorld('field'), 'world', 'field 地图必须可进入');
assert.equal(context.Game.mapId, 'field');
for (const table of ['MAPS', 'ACTORS', 'ENEMIES', 'TACTICS', 'ITEMS', 'DIALOGUES']) {
  assert.ok(context.DATA && context.DATA[table], `DATA.${table} 必须存在`);
  assert.ok(Object.keys(context.DATA[table]).length > 0, `DATA.${table} 不能为空`);
}
const canvas = context.document.getElementById('game-canvas');
assert.equal(canvas.width, 256, 'virtual canvas 宽度必须为 256');
assert.equal(canvas.height, 240, 'virtual canvas高度必须为 240');
context.Game.returnToTitle();
assert.equal(context.Game.state, 'title', 'Game.returnToTitle() 应返回 title');
for (const action of ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'battle-1', 'battle-5']) {
  context.Input.enqueue(action);
  assert.equal(context.Input.consume(action), action, `输入 action 应可识别: ${action}`);
}
console.log('Three Kingdoms shell checks passed.');
