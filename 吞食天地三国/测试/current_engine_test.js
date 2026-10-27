'use strict';
/* 当前网页复刻引擎回归；历史 three-kingdoms.html 的测试不能替代本文件。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const runtime = path.join(__dirname, '../网页复刻/吞食天地Ⅱ同人复刻-网页版');
const listeners = {}, docListeners = {}, buttons = [];
const sandbox = {
  console,
  addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
  document: {
    hidden: false,
    querySelectorAll: () => buttons,
    addEventListener: (type, fn) => { (docListeners[type] ||= []).push(fn); },
  },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(runtime, 'js/core.js'), 'utf8'), sandbox, { filename: 'current/core.js' });
const I = sandbox.T.Input;
I.init();
const emit = (type, code) => { for (const fn of listeners[type] || []) fn({ code, preventDefault() {} }); };
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS ' + name); };
test('地图持续移动在窗口失焦后释放', () => {
  emit('keydown', 'ArrowRight'); assert.equal(I.pressed('right'), true);
  emit('blur'); assert.equal(I.pressed('right'), false);
});
test('切后台清理确认边沿和按键重复计数', () => {
  emit('keydown', 'Enter'); I.repeated('ok');
  sandbox.document.hidden = true;
  for (const fn of docListeners.visibilitychange || []) fn();
  assert.equal(I.triggered('ok'), false);
  assert.equal(I.pressed('ok'), false);
  sandbox.document.hidden = false;
  emit('keydown', 'Enter'); assert.equal(I.triggered('ok'), true);
  emit('keyup', 'Enter');
});
test('松开一个方向键别名时保留另一个按住的别名', () => {
  emit('keydown', 'KeyD'); emit('keydown', 'ArrowRight');
  emit('keyup', 'KeyD'); assert.equal(I.pressed('right'), true);
  emit('keyup', 'ArrowRight'); assert.equal(I.pressed('right'), false);
});
async function saves() {
  const storage = {};
  sandbox.localStorage = { getItem: k => storage[k] ?? null, setItem: (k, v) => { storage[k] = String(v); } };
  sandbox.fetch = async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(runtime, url), 'utf8')) });
  vm.runInContext(fs.readFileSync(path.join(runtime, 'js/data.js'), 'utf8'), sandbox, { filename: 'current/data.js' });
  const T = sandbox.T;
  await T.DataManager.loadAll();
  T.$gameParty.addActor(2); T.$gameParty.addActor(3);
  const guanYu = T.getActor(3);
  guanYu.growParam(2, 35);
  assert.ok(guanYu.equipAt(1), '实际数据库中的关羽初始持有武器');
  guanYu.changeEquip(1, 0);
  T.$gameParty.removeActor(3);
  await T.saveGame(0); await T.loadGame(0);
  test('离队武将读档后仍保留永久成长和装备变更', () => {
    assert.equal(T.getActor(3)._paramBonus?.[2], 35);
    assert.equal(T.getActor(3).equipAt(1), null);
    assert.ok(!T.$gameParty._actors.includes(3), '读取离队武将不能把他强行加入队伍');
  });
  const hero = T.getActor(2), state = T.$dataStates[14];
  assert.equal(state.name, '杀毒');
  hero.addStateRaw(state.id); hero.registerStepState(state.id); hero.onMapStep();
  const remaining = hero._stateSteps['s' + state.id];
  await T.saveGame(1); await T.loadGame(1);
  test('地图持续状态及剩余步数经过存档往返后保持', () => {
    assert.equal(T.getActor(2).isStateAffected(state.id), true);
    assert.equal(T.getActor(2)._stateSteps['s' + state.id], remaining);
    T.getActor(2).onMapStep();
    assert.equal(T.getActor(2)._stateSteps['s' + state.id], remaining - 1);
  });
  const legacy = JSON.parse(storage.tndt_save_1);
  for (const actor of legacy.actorSnapshots) {
    delete actor.states; delete actor.stateSteps; delete actor.stateTurns; delete actor.buffs; delete actor.tp;
  }
  storage.tndt_save_2 = JSON.stringify(legacy);
  assert.equal(await T.loadGame(2), true);
  test('缺少新增状态字段的旧存档仍可读取', () => {
    assert.equal(T.$gameParty._actors[0], 2);
    assert.equal(T.getActor(2).states().length, 0);
    assert.equal(T.getActor(3)._paramBonus[2], 35);
  });
  const normal = storage.tndt_save_0;
  T.Preview = { enabled: true }; T.$gameParty.gainGold(123); await T.saveGame(0);
  test('调试存档与正常四槽存档隔离', () => {
    assert.equal(storage.tndt_save_0, normal);
    assert.ok(storage.tndt_debug_save_0);
  });
  console.log(`CURRENT_ENGINE_OK ${passed}`);
}
saves().catch(error => { console.error(error); process.exitCode = 1; });
