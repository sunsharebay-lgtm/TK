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
  const storage = new Map();
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); },
  };
  context.__storage = storage;
  context.localStorage = localStorage;
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

assert.ok(context.World, 'World 必须暴露探索系统');
assert.equal(typeof context.World.move, 'function', 'World.move 必须暴露');
assert.equal(typeof context.World.interact, 'function', 'World.interact 必须暴露');
assert.deepEqual(Object.keys(context.DATA.MAPS).sort(), ['boss-gate', 'camp', 'field', 'mountain', 'town'], '必须包含五个原创区域');
for (const map of Object.values(context.DATA.MAPS)) {
  assert.equal(map.tiles.length, 16, `${map.id} 必须是 16 行地图`);
  assert.ok(map.tiles.every((row) => row.length === 16), `${map.id} 必须是 16x16 地图`);
  assert.ok(map.name && map.interactions, `${map.id} 必须有地点名和交互数据`);
}

context.Game.startNew();
const fieldStart = context.DATA.MAPS.field.start;
context.World.x = fieldStart.x;
context.World.y = fieldStart.y;
const startX = context.World.x;
const openMove = context.World.move('right');
assert.equal(openMove.moved, true, '开放格移动必须成功');
assert.equal(openMove.blocked, false, '开放格移动不能标记 blocked');
assert.equal(context.World.x, startX + 1, '开放格移动应更新坐标');
context.World.x = 1;
context.World.y = 1;
const wallMove = context.World.move('up');
assert.equal(wallMove.moved, false, '撞墙不能移动');
assert.equal(wallMove.blocked, true, '撞墙必须返回 blocked');

function interactionOf(mapId, kind) {
  const point = context.DATA.MAPS[mapId].interactions.find((item) => item.kind === kind);
  assert.ok(point, `${mapId} 必须有 ${kind} 交互点`);
  context.Game.enterWorld(mapId);
  context.World.x = point.x;
  context.World.y = point.y;
  return { point, result: context.World.interact() };
}
const npc = interactionOf('field', 'npc');
assert.equal(npc.result.triggered.type, 'npc', 'World.interact 必须识别 NPC');
const chest = interactionOf('field', 'chest');
assert.equal(chest.result.triggered.type, 'chest', 'World.interact 必须识别宝箱');
assert.ok(chest.result.triggered.content, '宝箱必须有原创内容');
const chestAgain = context.World.interact();
assert.equal(chestAgain.triggered, null, '宝箱第二次交互不能重复触发');
const recovery = interactionOf('town', 'recovery');
assert.equal(recovery.result.triggered.type, 'recovery', 'World.interact 必须识别恢复点');
assert.equal(recovery.result.triggered.area, 'town', '恢复点必须标记所在区域');
const exit = interactionOf('field', 'exit');
assert.equal(exit.result.triggered.type, 'exit', 'World.interact 必须识别区域出口');
assert.equal(exit.result.triggered.to, 'town', 'field 出口必须进入 town');
assert.equal(context.World.mapId, 'town', '从 field 进入 town 后应更新区域');

const recruitPoint = context.DATA.MAPS.mountain.interactions.find((item) => item.kind === 'npc' && item.dialogue);
assert.ok(recruitPoint, 'mountain 必须有可触发招募事件的 NPC');
context.Game.enterWorld('mountain');
context.World.x = recruitPoint.x;
context.World.y = recruitPoint.y;
const recruitInteraction = context.World.interact();
assert.equal(recruitInteraction.triggered.type, 'npc', '招募 NPC 应先触发 NPC 对话');
assert.equal(context.Dialogue.start(recruitPoint.dialogue), 'dialogue', 'Dialogue.start 必须切换到 dialogue');
while (context.Game.state === 'dialogue') context.Dialogue.confirm();
assert.equal(context.World.roster.length, 4, '招募事件完成后 roster 必须增加第 4 名武将');
assert.equal(context.Game.partySelection.visible, true, '招募完成后必须显示 party selection');
assert.equal(context.World.events['recruit-zhi'], true, '招募事件必须持久化完成标志');
const rosterAfterRecruit = context.World.roster.length;
assert.equal(context.Dialogue.start(recruitPoint.dialogue), false, '已完成招募事件不能重复开始');
assert.equal(context.World.roster.length, rosterAfterRecruit, '招募事件不能重复增加武将');

const savedState = {
  mapId: 'camp', x: 4, y: 6,
  roster: ['yun', 'lan', 'he', 'zhi'], party: ['yun', 'lan', 'he'],
  levels: { yun: 2 }, troops: { yun: 32 }, provisions: 17,
  events: { 'recruit-zhi': true }, chests: { 'field:grain-cache': true },
};
assert.equal(context.Save.save(savedState), true, 'Save.save 应成功保存');
assert.ok(context.__storage.has('tk-three-kingdoms-v0'), '只能使用三国探索存档 key');
assert.equal(context.__storage.size, 1, 'Save 不能触碰其他游戏存档');
assert.deepEqual(context.Save.load(), savedState, 'Save.load 应恢复完整探索状态');
context.__storage.set('tk-three-kingdoms-v0', '{坏 JSON');
const corrupt = context.Save.load();
assert.equal(corrupt.ok, false, '损坏 JSON 必须返回可处理错误状态');
assert.match(corrupt.error, /读取|JSON|损坏/, '损坏存档必须包含明确错误');
assert.doesNotThrow(() => context.Save.clear(), 'Save.clear 不应抛出异常');
assert.equal(context.__storage.has('tk-three-kingdoms-v0'), false, 'Save.clear 只应清除三国探索 key');
console.log('Three Kingdoms exploration checks passed.');
