'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const runtime = path.join(__dirname, '../网页复刻/吞食天地Ⅱ同人复刻-网页版');

async function engine() {
  const stored = {};
  const context = {
    console: { ...console, warn() {} }, addEventListener() {},
    localStorage: { getItem: k => stored[k] ?? null, setItem: (k, v) => { stored[k] = String(v); } },
    fetch: async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(runtime, url), 'utf8')) }),
  };
  context.window = context; vm.createContext(context);
  for (const file of ['core', 'data', 'preview']) {
    vm.runInContext(fs.readFileSync(path.join(runtime, `js/${file}.js`), 'utf8'), context, { filename: file + '.js' });
  }
  const T = context.T;
  await T.DataManager.loadAll();
  T.$gameParty.addActor(2); T.$gameParty.gainGold(321);
  T.SceneManager = { stack: [], busy: false, async gotoMap(mapId, x, y, dir) {
    T.$gameMap = { mapId, encounterProgress: 7, events: [], isValid: () => true, isPassable: () => true, interpreter: { clear() {} } };
    T.$gamePlayer = { x, y, _direction: dir, direction() { return this._direction; }, setDirection(d) { this._direction = d; } };
    this.stack = [{ mapId }];
  } };
  await T.SceneManager.gotoMap(27, 17, 23, 6);
  return { T, context, stored };
}
let passed = 0, failed = 0;
async function check(name, fn) {
  try { await fn(await engine()); passed++; console.log('PASS ' + name); }
  catch (e) { failed++; console.error('FAIL ' + name + ': ' + e.message); }
}
(async () => {
  await check('读档地图失败时完整保留当前队伍、地图、变量与场景', async ({ T, stored }) => {
    await T.saveGame(0);
    const saved = JSON.parse(stored.tndt_save_0); saved.party.gold = 9999; saved.variables[1] = 1655;
    stored.tndt_save_0 = JSON.stringify(saved);
    const before = { party: T.$gameParty, gold: T.$gameParty.gold(), actors: T.ActorRegistry, map: T.$gameMap,
      player: T.$gamePlayer, variables: T.$gameVariables, stage: T.$gameVariables.value(1), stack: T.SceneManager.stack };
    T.SceneManager.gotoMap = async function () {
      T.$gameMap = { mapId: 999 }; T.$gamePlayer = { x: 0, y: 0 };
      throw new Error('mock map request failed');
    };
    let result;
    try { result = await T.loadGame(0); } catch (_) { result = false; }
    assert.equal(result, false);
    assert.equal(T.$gameParty, before.party); assert.equal(T.$gameParty.gold(), before.gold);
    assert.equal(T.ActorRegistry, before.actors); assert.equal(T.$gameVariables, before.variables);
    assert.equal(T.$gameVariables.value(1), before.stage);
    assert.equal(T.$gameMap, before.map); assert.equal(T.$gamePlayer, before.player);
    assert.equal(T.SceneManager.stack, before.stack); assert.equal(T.SceneManager.busy, false);
  });
  await check('JSON 可解析但结构损坏的存档不显示为有效记录、不改变当前状态', async ({ T, stored }) => {
    const before = T.$gameParty;
    stored.tndt_save_0 = JSON.stringify({ savedAt: Date.now(), party: { actors: [999999] }, actorSnapshots: [{ id: 999999, level: 1 }] });
    assert.equal(T.saveInfo(0), null);
    assert.equal(T.hasSaveFile(0), false);
    assert.equal(await T.loadGame(0), false);
    assert.equal(T.$gameParty, before);
  });
  await check('存储写入失败保留原记录和存档计数，并返回失败', async ({ T, context, stored }) => {
    await T.saveGame(0);
    const before = stored.tndt_save_0, count = T.$gameSystem.saveCount, frames = T.$gameSystem.framesOnSave;
    T.GameMain = { frameCount: 987 };
    context.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    assert.equal(await T.saveGame(0), false);
    assert.equal(stored.tndt_save_0, before); assert.equal(T.$gameSystem.saveCount, count);
    assert.equal(T.$gameSystem.framesOnSave, frames);
  });
  await check('URL live 入口完整恢复现场坐标与方向，保留正常存档', async ({ T, stored }) => {
    await T.saveGame(0); const normal = stored.tndt_save_0;
    T.Preview.enabled = true; T.Preview.saveLive();
    await T.SceneManager.gotoMap(31, 8, 8, 2);
    await T.Preview.launchById('live');
    assert.equal(T.$gameMap.mapId, 27); assert.equal(T.$gamePlayer.x, 17); assert.equal(T.$gamePlayer.y, 23);
    assert.equal(T.$gamePlayer.direction(), 6); assert.equal(stored.tndt_save_0, normal);
  });
  await check('试玩选择器的现场条目读取 live 快照，而不是创建默认新游戏', async ({ T, context }) => {
    T.Preview.enabled = true; T.Preview.saveLive();
    const selector = vm.runInContext('new Scene_PreviewSelector()', context);
    const node = selector.nodes.find(n => n.id === 'live'); assert.ok(node);
    await T.Preview.launch(node);
    assert.equal(T.$gameMap.mapId, 27); assert.equal(T.$gamePlayer.x, 17); assert.equal(T.$gamePlayer.y, 23);
    assert.equal(T.$gameParty.gold(), 321);
  });
  await check('普通试玩节点生成与失败加载不会覆盖现有进度或存档命名空间', async ({ T }) => {
    const previous = T.captureRuntimeState();
    const node = T.Preview.nodes[0];
    const snapshot = T.Preview.makeNodeSnapshot(node);
    assert.equal(snapshot.mapId, node.mapId);
    assert.equal(T.$gameParty, previous.$gameParty);
    assert.equal(T.$gamePlayer, previous.$gamePlayer);
    T.SceneManager.gotoMap = async () => { throw new Error('mock map offline'); };
    await assert.rejects(T.Preview.launch(node));
    assert.equal(T.$gameParty, previous.$gameParty);
    assert.equal(T.$gameParty.gold(), 321);
    assert.equal(T.Preview.enabled, false);
  });
  await check('浏览器禁用存储时安全返回没有存档，保存现场失败不崩溃', async ({ T, context }) => {
    context.localStorage.getItem = () => { throw new Error('SecurityError'); };
    context.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    assert.equal(T.hasSaveFile(0), false); assert.equal(T.saveInfo(0), null);
    assert.equal(await T.loadGame(0), false);
    assert.equal(T.Preview.liveSnapshot(), null); assert.equal(T.Preview.saveLive(), false);
  });
  await check('保存菜单遇到写入失败保留页面并显示错误，不报告保存成功', async ({ T, context }) => {
    for (const file of ['windows', 'menus']) vm.runInContext(fs.readFileSync(path.join(runtime, `js/${file}.js`), 'utf8'), context);
    context.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    const sounds = []; let popped = false;
    T.AudioManager.playSe = effect => sounds.push(effect.name);
    T.SceneManager.popScene = () => { popped = true; };
    const menu = new T.Scene_Save(); menu.win.updateInput = () => {};
    T.Input.triggered = key => key === 'ok';
    menu.update(); await new Promise(resolve => setImmediate(resolve));
    assert.equal(popped, false); assert.match(menu.error, /存档失败/);
    assert.ok(sounds.includes('Buzzer')); assert.ok(!sounds.includes('Save'));
  });
  console.log(`SNAPSHOT_RECOVERY ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
})();
