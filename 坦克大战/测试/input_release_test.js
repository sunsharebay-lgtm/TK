'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../tank-battle.html'), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const listeners = {}, docListeners = {};
const element = () => {
  const handlers = {};
  return { style: {}, classList: { add() {}, remove() {}, contains: () => false },
    addEventListener: (type, fn) => { (handlers[type] ||= []).push(fn); },
    emit(type) { for (const fn of handlers[type] || []) fn({ pointerType: 'mouse', pointerId: 7, clientX: 90, clientY: 50, preventDefault() {} }); },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    getContext: () => new Proxy({}, { get: (obj, key) => obj[key] || (() => {}) }) };
};
const elements = {};
let pads = [];
const sandbox = {
  console, performance: { now: () => 0 }, location: { hash: '' },
  matchMedia: () => ({ matches: false }), innerWidth: 1280, innerHeight: 720,
  localStorage: { getItem: () => null },
  addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
  document: { readyState: 'loading', hidden: false,
    getElementById: id => (elements[id] ||= element()),
    createElement: element,
    documentElement: element(),
    addEventListener: (type, fn) => { (docListeners[type] ||= []).push(fn); },
  },
  navigator: { getGamepads: () => pads },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(code + '\nglobalThis.testInput = Input;', sandbox, { filename: 'tank-battle.html' });
const I = sandbox.testInput;
I.init();
const emit = (type, code) => { for (const fn of listeners[type] || []) fn({ code, preventDefault() {} }); };
emit('keydown', 'Space');
elements.tPad.emit('pointerdown'); elements.tFire.emit('pointerdown');
assert.equal(I.read(0, true, false).fire, true);
emit('blur');
assert.equal(I.read(0, true, false).fire, false, '失焦必须释放键盘和触屏开火');
assert.equal(I.read(0, true, false).rt, false, '失焦必须释放触屏摇杆');
assert.equal(I.hit('Space'), false, '失焦不能留下尚未消费的确认/开火边沿');
elements.tPad.emit('pointermove');
assert.equal(I.read(0, true, false).rt, false, '失焦结束旧拖动，回来只移动鼠标不能再次推摇杆');
emit('keydown', 'ArrowRight'); sandbox.document.hidden = true;
for (const fn of docListeners.visibilitychange || []) fn();
assert.equal(I.read(0, false, false).rt, false, '切后台必须释放方向键');
const pad = { axes: [0, 0], buttons: [{ pressed: true }] };
pads = [pad]; I.pollGamepads(1 / 60); assert.equal(!!I.ui.ok, true);
I.endFrame(); pads = []; I.pollGamepads(1 / 60);
pads = [pad]; I.pollGamepads(1 / 60);
assert.equal(!!I.ui.ok, true, '手柄拔出重连后第一次确认不能被旧按键历史吞掉');
sandbox.navigator.getGamepads = () => { throw new Error('Gamepad permission unavailable'); };
assert.doesNotThrow(() => I.pollGamepads(1 / 60));
assert.equal(I.read(0, false, false).fire, false, '手柄权限不可用时退回键盘且不留下开火');
console.log('INPUT_RELEASE_OK: 键盘、触屏、后台切换及手柄重连输入');
