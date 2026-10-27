'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function target() {
  const handlers = {};
  return {
    style: {}, classList: { add() {}, remove() {} },
    addEventListener(type, fn) { (handlers[type] ||= []).push(fn); },
    removeEventListener() {},
    emit(type, extra = {}) {
      for (const fn of handlers[type] || []) fn({ preventDefault() {}, pointerId: 1, ...extra });
    },
    setPointerCapture() {},
  };
}
const elements = {};
const dom = target();
const browser = target();
let pads = [];
const sandbox = {
  console, ...browser,
  navigator: { getGamepads: () => pads },
  document: { ...dom, readyState: 'loading', getElementById: id => elements[id] ||= target() },
  localStorage: { getItem: () => null },
  requestAnimationFrame() {},
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const name of fs.readdirSync(path.join(__dirname, '../src')).filter(name => name.endsWith('.js')).sort()) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', name), 'utf8'), sandbox, { filename: name });
}
const { INP, G } = sandbox.__SPL;
INP.init();
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS ' + name); };
const key = (type, code) => browser.emit(type, { code });
const pad = (index = 0) => ({ index, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) });
const reset = () => { pads = []; browser.emit('blur'); INP.pollGamepad(); INP.endFrame(); };

test('手柄松开与拔出后停止移动', () => {
  const p = pad(); pads = [p]; p.axes[0] = 1; INP.pollGamepad();
  assert.equal(INP.keys.right, true);
  p.axes[0] = 0; INP.pollGamepad(); assert.equal(INP.keys.right, false);
  p.axes[0] = 1; INP.pollGamepad(); pads = []; INP.pollGamepad();
  assert.equal(INP.keys.right, false);
});
test('手柄释放不覆盖仍按住的键盘；多个键盘别名独立释放', () => {
  reset(); const p = pad(); pads = [p];
  key('keydown', 'KeyD'); key('keydown', 'ArrowRight');
  p.axes[0] = 1; INP.pollGamepad(); p.axes[0] = 0; INP.pollGamepad();
  assert.equal(INP.keys.right, true);
  key('keyup', 'KeyD'); assert.equal(INP.keys.right, true);
  key('keyup', 'ArrowRight'); assert.equal(INP.keys.right, false);
});
test('多个手柄合并输入，松开一个不覆盖另一个', () => {
  reset(); const a = pad(0), b = pad(1); pads = [a, b];
  a.axes[0] = b.axes[0] = 1; INP.pollGamepad();
  a.axes[0] = 0; INP.pollGamepad(); assert.equal(INP.keys.right, true);
  pads = [a]; INP.pollGamepad(); assert.equal(INP.keys.right, false);
});
test('手柄可导航标题并确认开始', () => {
  reset(); const p = pad(); pads = [p]; G.state = 'title'; G.menuSel = 0; G.howOpen = false;
  p.buttons[13].pressed = true; INP.pollGamepad(); G.upTitle(); INP.endFrame();
  assert.equal(G.menuSel, 1);
  p.buttons[13].pressed = false; INP.pollGamepad(); INP.endFrame();
  p.buttons[12].pressed = true; INP.pollGamepad(); G.upTitle(); INP.endFrame();
  assert.equal(G.menuSel, 0);
  p.buttons[0].pressed = true; INP.pollGamepad(); G.fadeCb = null; G.upTitle();
  assert.equal(typeof G.fadeCb, 'function');
});
test('触屏 A 可开始游戏，释放后不持续跳跃', () => {
  reset(); G.menuSel = 0; G.fadeCb = null;
  elements.bA.emit('pointerdown'); G.upTitle();
  assert.equal(typeof G.fadeCb, 'function');
  assert.equal(INP.keys.jump, true);
  elements.bA.emit('pointerup'); assert.equal(INP.keys.jump, false);
});
test('触屏和键盘同时按住同一动作时独立释放', () => {
  reset(); key('keydown', 'ArrowRight'); elements.bR.emit('pointerdown');
  key('keyup', 'ArrowRight'); assert.equal(INP.keys.right, true);
  elements.bR.emit('pointerup'); assert.equal(INP.keys.right, false);
});
test('失焦和切后台清理持续输入及未消费的确认事件', () => {
  reset(); key('keydown', 'Space'); elements.bR.emit('pointerdown'); browser.emit('blur');
  assert.equal(!!INP.keys.right, false); assert.equal(!!INP.keys.jump, false);
  assert.equal(INP.press('confirm'), false);
  key('keydown', 'ArrowRight'); sandbox.document.hidden = true; dom.emit('visibilitychange');
  assert.equal(!!INP.keys.right, false);
  sandbox.document.hidden = false;
});
test('不支持全屏 API 的浏览器点击按钮不会崩溃', () => {
  assert.doesNotThrow(() => elements.fs.emit('click'));
});
console.log(`INPUT_OK ${passed}`);
