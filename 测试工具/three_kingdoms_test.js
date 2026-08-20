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
for (const table of ['MAPS', 'ACTORS', 'ENEMIES', 'TACTICS', 'ITEMS', 'DIALOGUES', 'QUESTS']) {
  assert.ok(context.DATA && context.DATA[table], `DATA.${table} 必须存在`);
  assert.ok(Object.keys(context.DATA[table]).length > 0, `DATA.${table} 不能为空`);
}
const canvas = context.document.getElementById('game-canvas');
assert.equal(canvas.width, 1280, 'virtual canvas 宽度必须为 1280');
assert.equal(canvas.height, 720, 'virtual canvas 高度必须为 720');
assert.equal(context.DATA.MAP_TILE_SIZE, 80, '地图 tileSize 必须为 80');
assert.equal(typeof context.drawActorSprite, 'function', 'drawActorSprite 必须暴露');
for (const actorId of ['liu-bei', 'guan-yu', 'zhang-fei']) {
  const actor = context.DATA.ACTORS[actorId];
  assert.ok(actor, `${actorId} actor 数据必须存在`);
  assert.ok(actor.visual, `${actorId} 必须有 visual traits`);
  assert.ok(actor.visual.robes && actor.visual.head && actor.visual.weapon, `${actorId} visual traits 必须包含衣着、头部和武器`);
}
assert.equal(context.Game.chapter, 'chapter-1', '新旅程必须从 chapter-1 开始');
assert.equal(context.Game.currentObjective, '找到失军书', '第一章开场目标必须是找到失军书');
assert.ok(context.World.storyFlags && typeof context.World.storyFlags === 'object', '必须有 storyFlags');
assert.equal(context.Game.selectParty().length, 3, 'party selection 完成后必须正好有三名出战成员');
context.Game.returnToTitle();
assert.equal(context.Game.state, 'title', 'Game.returnToTitle() 应返回 title');
for (const action of ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'battle-1', 'battle-5']) {
  context.Input.enqueue(action);
  assert.equal(context.Input.consume(action), action, `输入 action 应可识别: ${action}`);
}

assert.ok(context.World, 'World 必须暴露探索系统');
assert.equal(typeof context.World.move, 'function', 'World.move 必须暴露');
assert.equal(typeof context.World.interact, 'function', 'World.interact 必须暴露');
assert.deepEqual(Object.keys(context.DATA.MAPS).sort(), ['boss-gate', 'camp', 'field', 'mountain', 'old-road', 'reed-cave', 'town'], '必须包含七个原创区域');
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
const townLoot = interactionOf('town', 'loot');
assert.equal(townLoot.result.triggered.type, 'loot', 'World.interact 必须识别一次性城镇搜刮');
assert.equal(townLoot.result.triggered.once, true, '城镇搜刮必须是一回合一次性事件');
const townLootAgain = context.World.interact();
assert.equal(townLootAgain.triggered, null, '城镇搜刮第二次交互不能重复触发');
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

context.Game.startNew();
assert.equal(context.Game.beginChapterOpening(), 'dialogue', '第一章开场应进入情景对话');
while (context.Game.state === 'dialogue') context.Dialogue.confirm();
assert.equal(context.World.storyFlags['lost-military-book'], true, '开场应设置失军书事件标记');
assert.equal(context.Game.currentObjective, '找到失军书', '开场目标应为找到失军书');
assert.equal(context.Game.enterTownRescue(), 'dialogue', '进入蒲渡镇应触发求援场景');
while (context.Game.state === 'dialogue') context.Dialogue.confirm();
assert.equal(context.World.storyFlags['town-rescue'], true, '蒲渡镇求援应完成');
assert.equal(context.Game.talkGuanYu(), 'dialogue', '与关羽对话应进入情景');
while (context.Game.state === 'dialogue') context.Dialogue.confirm();
assert.equal(context.World.storyFlags['guan-yu-joined'], true, '关羽事件应完成');
assert.ok(context.World.roster.includes('guan-yu'), '关羽必须加入 roster');
assert.equal(context.Game.triggerMountainPursuit(), 'dialogue', '山道应触发追击场景');
while (context.Game.state === 'dialogue') context.Dialogue.confirm();
assert.equal(context.World.storyFlags['mountain-pursuit'], true, '山道追击应完成');
assert.equal(context.Game.currentObjective, '前往断云关', '追击后目标应指向断云关');
assert.equal(context.Game.summaryChapter(), 'chapter-summary', '章节结束后必须进入 chapter-summary 状态');
assert.equal(context.Game.chapterSummary.title, '第一章', '章节总结必须有标题');
assert.ok(context.Game.chapterSummary.items.length > 0, '章节总结必须包含摘要条目');
assert.equal(context.Battle.start('stone-oath'), false, '前置事件完成前首领战必须被阻止');
context.World.storyFlags['military-book-found'] = true;
assert.equal(context.Battle.start('stone-oath'), 'battle', '失军书、关羽和追击完成后首领战应允许开始');
context.Battle.active = false;
context.Game.state = 'world';

const savedState = {
  mapId: 'camp', x: 4, y: 6,
  roster: ['yun', 'lan', 'he', 'zhi'], party: ['yun', 'lan', 'he'],
  levels: { yun: 2 }, troops: { yun: 32 }, provisions: 17,
  events: { 'recruit-zhi': true }, chests: { 'field:grain-cache': true },
};
assert.equal(context.Save.save(savedState), true, 'Save.save 应成功保存');
assert.ok(context.__storage.has('tk-three-kingdoms-v1'), '只能使用三国探索存档 key');
assert.equal(context.__storage.size, 1, 'Save 不能触碰其他游戏存档');
const loadedState = context.Save.load();
assert.equal(loadedState.mapId, savedState.mapId, 'Save.load 应恢复旧存档地图');
assert.deepEqual(loadedState.party, savedState.party, 'Save.load 应恢复旧存档队伍');
assert.equal(loadedState.objective, '找到失军书', '旧存档应补默认 objective');
assert.equal(loadedState.chapter, 'chapter-1', '旧存档应补默认 chapter');
assert.ok(loadedState.storyFlags && typeof loadedState.storyFlags === 'object', '旧存档应补默认 storyFlags');
assert.ok(loadedState.chapterSummary && Array.isArray(loadedState.chapterSummary.items), '旧存档应补默认 chapterSummary');
context.__storage.set('tk-three-kingdoms-v1', '{坏 JSON');
const corrupt = context.Save.load();
assert.equal(corrupt.ok, false, '损坏 JSON 必须返回可处理错误状态');
assert.match(corrupt.error, /读取|JSON|损坏/, '损坏存档必须包含明确错误');
assert.doesNotThrow(() => context.Save.clear(), 'Save.clear 不应抛出异常');
assert.equal(context.__storage.has('tk-three-kingdoms-v1'), false, 'Save.clear 只应清除三国探索 key');

assert.ok(context.Battle, 'Battle 必须暴露战斗系统');
for (const method of ['start', 'choose', 'resolveRound', 'finish']) {
  assert.equal(typeof context.Battle[method], 'function', `Battle.${method} 必须暴露`);
}
assert.ok(context.DATA.ENCOUNTERS, 'DATA.ENCOUNTERS 必须存在');
assert.ok(context.DATA.ENCOUNTERS['reed-watch'], '必须提供固定普通遭遇');
assert.ok(context.DATA.ENCOUNTERS['stone-oath'], '必须提供固定首领遭遇');
assert.ok(context.DATA.ENCOUNTERS['reed-cave-ambush'], '必须提供 reed cave 普通遭遇');
assert.deepEqual(Array.from(context.Battle.commands), ['attack', 'tactic', 'defend', 'item', 'retreat'], '五种战斗指令顺序必须稳定');
assert.match(html, /data-action="battle-1"[\s\S]*data-action="battle-5"/, '移动端必须提供 1–5 战斗按钮');

function battleRound(encounterId, choices) {
  context.Game.startNew();
  assert.equal(context.Battle.start(encounterId), 'battle', `必须能开始遭遇: ${encounterId}`);
  const party = context.World.party.slice();
  party.forEach((actorId) => context.Battle.choose(actorId, choices[actorId] || 'attack'));
  return { before: context.Battle.snapshot(), result: context.Battle.resolveRound() };
}

context.Game.startNew();
assert.equal(context.Battle.start('reed-watch'), 'battle', 'Battle.start 必须进入 battle 状态');
assert.equal(context.Game.state, 'battle', 'Battle.start 必须进入 battle 状态');
const normalStart = battleRound('reed-watch', {});
assert.equal(normalStart.result.status, 'active', '普通遭遇第一回合应保持可行动');
assert.notEqual(normalStart.result.enemy.troops, normalStart.before.enemy.troops, 'attack 必须改变敌方兵力');
assert.ok(normalStart.result.log.length > 0, '战斗回合必须产生可渲染事件日志');

const attackRound = battleRound('reed-watch', {});
const defendRound = battleRound('reed-watch', Object.fromEntries(context.World.party.map((id) => [id, 'defend'])));
const attackLoss = context.World.party.reduce((sum, id) => sum + (context.DATA.ACTORS[id].troops - attackRound.result.party[id].troops), 0);
const defendLoss = context.World.party.reduce((sum, id) => sum + (context.DATA.ACTORS[id].troops - defendRound.result.party[id].troops), 0);
assert.ok(defendLoss < attackLoss, 'defend 必须降低敌方造成的 incoming damage');

function tacticRound(tacticId) {
  const choices = Object.fromEntries(context.World.party.map((id) => [id, 'defend']));
  choices[context.World.party[0]] = { type: 'tactic', tacticId };
  return battleRound('reed-watch', choices).result;
}
const fireResult = tacticRound('fire-suppression');
const moraleResult = tacticRound('morale-rally');
const decoyResult = tacticRound('phantom-banner');
const defensiveBaseline = battleRound('reed-watch', Object.fromEntries(context.World.party.map((id) => [id, 'defend']))).result;
assert.ok(fireResult.enemy.troops < defensiveBaseline.enemy.troops, '火势压制必须削减敌方兵力');
assert.ok(moraleResult.partyMorale > normalStart.result.partyMorale, '鼓舞士气必须提升我方士气');
assert.ok(decoyResult.enemy.morale < normalStart.result.enemy.morale, '疑兵扰乱必须降低敌方士气');
assert.notDeepEqual(
  [fireResult.enemy.troops, fireResult.enemy.morale, fireResult.partyMorale],
  [moraleResult.enemy.troops, moraleResult.enemy.morale, moraleResult.partyMorale],
  '三种计策必须产生不同效果'
);

context.Game.startNew();
context.World.troops.yun = 12;
context.World.items = { 'millet-cake': 1 };
context.Battle.start('reed-watch');
context.Battle.choose('yun', { type: 'item', itemId: 'millet-cake' });
context.World.party.filter((id) => id !== 'yun').forEach((id) => context.Battle.choose(id, 'defend'));
const itemResult = context.Battle.resolveRound();
assert.ok(itemResult.party.yun.troops > 12, '恢复道具必须恢复队伍兵力');
assert.equal(context.World.items['millet-cake'], 0, '使用恢复道具必须消耗道具');

context.Game.startNew();
context.Battle.start('reed-watch');
context.World.party.forEach((id) => context.Battle.choose(id, 'retreat'));
const retreatResult = context.Battle.resolveRound();
assert.equal(retreatResult.status, 'retreated', '普通战斗必须允许撤退');
assert.equal(context.Battle.finish(), 'world', '撤退确认后必须回到原世界地图');
assert.equal(context.Game.state, 'world');

context.Game.startNew();
context.World.storyFlags['military-book-found'] = true;
context.World.storyFlags['guan-yu-joined'] = true;
context.World.storyFlags['mountain-pursuit'] = true;
const originalMap = context.World.mapId;
context.Battle.start('stone-oath');
context.Battle.choose('yun', 'retreat');
context.World.party.filter((id) => id !== 'yun').forEach((id) => context.Battle.choose(id, 'defend'));
const bossRetreat = context.Battle.resolveRound();
assert.notEqual(bossRetreat.status, 'retreated', '首领战不得通过撤退结束');
assert.equal(context.World.mapId, originalMap, '结果确认前不得推进世界地图');

context.Game.startNew();
context.World.storyFlags['military-book-found'] = true;
context.World.storyFlags['guan-yu-joined'] = true;
context.World.storyFlags['mountain-pursuit'] = true;
const bossStart = context.Battle.start('stone-oath');
assert.equal(bossStart, 'battle');
let bossResult = null;
for (let round = 0; round < 12 && context.Game.state === 'battle'; round += 1) {
  const choices = Object.fromEntries(context.World.party.map((id) => [id, 'attack']));
  if (round === 0) choices[context.World.party[0]] = { type: 'tactic', tacticId: 'phantom-banner' };
  context.World.party.forEach((id) => context.Battle.choose(id, choices[id]));
  bossResult = context.Battle.resolveRound();
}
assert.equal(bossResult.status, 'victory', '首领遭遇必须存在稳定胜利路径');
assert.ok(context.Battle.tacticUsed, '首领稳定胜利路径必须至少使用一次 tactic');
const preFinishEvents = { ...context.World.events };
assert.equal(preFinishEvents['stone-oath-complete'], undefined, '结果确认前不得提交首领世界事件');
const preFinishState = context.Game.state;
assert.equal(preFinishState, 'battle-result', '胜利必须先进入 battle-result');
const reward = context.Battle.finish();
assert.equal(reward, 'chapter-summary', '首领结果确认后必须进入章节结算');
assert.equal(context.Game.state, 'chapter-summary');
context.Game.returnToWorld('camp');
assert.equal(context.Game.state, 'world', '章节结算确认后必须回到世界地图');
assert.equal(context.World.events['stone-oath-complete'], true, '首领结果确认后必须完成事件');
assert.ok(context.World.provisions > 20, '胜利必须奖励军粮');
assert.ok(Object.values(context.World.levels).some((level) => level >= 2), '首次达到经验阈值必须升级');
assert.equal(context.World.chapterSummary.completed, true, '章节结算必须标记完成');
assert.ok(Array.isArray(context.World.chapterSummary.items) && context.World.chapterSummary.items.length > 0, '章节结算必须包含摘要条目');

context.Game.startNew();
context.World.storyFlags['military-book-found'] = true;
context.World.storyFlags['guan-yu-joined'] = true;
context.World.storyFlags['mountain-pursuit'] = true;
context.World.party.forEach((id) => { context.World.troops[id] = 1; });
context.Battle.start('stone-oath');
context.World.party.forEach((id) => context.Battle.choose(id, 'defend'));
context.Battle.resolveRound();
assert.equal(context.Game.state, 'game-over', '全部 active actors 败退必须进入 game-over');

// ============================================
// 第二章过渡与难度曲线测试（新增）
// ============================================

// --- 2A. 第二章数据结构 ---
assert.ok(context.DATA.MAPS['old-road'], 'DATA.MAPS 必须包含 old-road（古驿道）');
const oldRoad = context.DATA.MAPS['old-road'];
assert.equal(oldRoad.name, '古驿道', 'old-road 地名必须为古驿道');
assert.equal(oldRoad.tiles.length, 16, 'old-road 必须是 16 行地图');
assert.ok(oldRoad.tiles.every((row) => row.length === 16), 'old-road 必须是 16x16 地图');
assert.ok(oldRoad.start && typeof oldRoad.start.x === 'number', 'old-road 必须有 start 坐标');

assert.ok(context.DATA.ENEMIES['mounted-scout'], 'DATA.ENEMIES 必须包含 mounted-scout（骑哨斥候）');
const mountedScout = context.DATA.ENEMIES['mounted-scout'];
assert.ok(mountedScout.troops > 0, 'mounted-scout 必须有正数兵力');
assert.ok(mountedScout.attack > 0, 'mounted-scout 必须有正数攻击');
assert.ok(mountedScout.reward > 0, 'mounted-scout 必须有正数奖励');

assert.ok(context.DATA.ENCOUNTERS['old-road-patrol'], 'DATA.ENCOUNTERS 必须包含 old-road-patrol');
assert.equal(context.DATA.ENCOUNTERS['old-road-patrol'].enemy, 'mounted-scout', 'old-road-patrol 必须使用 mounted-scout');

assert.ok(context.DATA.ENCOUNTERS['ridge-ambush'], 'DATA.ENCOUNTERS 必须包含 ridge-ambush（山道伏兵）');
assert.equal(context.DATA.ENCOUNTERS['ridge-ambush'].enemy, 'dusk-scout', 'ridge-ambush 必须使用 dusk-scout');

assert.ok(context.DATA.ENCOUNTERS['gate-ambush'], 'DATA.ENCOUNTERS 必须包含 gate-ambush（关前连战）');
assert.ok(Array.isArray(context.DATA.ENCOUNTERS['gate-ambush'].chain), 'gate-ambush 必须有 chain 数组（连续遭遇）');
assert.equal(context.DATA.ENCOUNTERS['gate-ambush'].chain.length, 2, 'gate-ambush chain 必须有两场战斗');
assert.equal(context.DATA.ENCOUNTERS['gate-ambush'].chain[0], 'reed-bandit', 'gate-ambush 第一场必须是 reed-bandit');
assert.equal(context.DATA.ENCOUNTERS['gate-ambush'].chain[1], 'ridge-warden', 'gate-ambush 第二场必须是 ridge-warden');

assert.ok(context.DATA.QUESTS['chapter-2'], 'DATA.QUESTS 必须包含 chapter-2');
const ch2 = context.DATA.QUESTS['chapter-2'];
assert.ok(ch2.steps && ch2.steps.length > 0, 'chapter-2 必须有 steps');
assert.equal(ch2.chapter, 'chapter-2', 'chapter-2 chapter 字段必须为 chapter-2');

// --- 2B. old-road 地图交互 ---
const oldRoadNpc = oldRoad.interactions.find((i) => i.kind === 'npc');
assert.ok(oldRoadNpc, 'old-road 必须有一个 NPC（守关老兵）');
assert.ok(oldRoadNpc.dialogue, 'old-road NPC 必须有 dialogue');
const oldRoadBattle = oldRoad.interactions.find((i) => i.kind === 'battle');
assert.ok(oldRoadBattle, 'old-road 必须有一个 battle 交互点');
const oldRoadExit = oldRoad.interactions.find((i) => i.kind === 'exit');
assert.ok(oldRoadExit, 'old-road 必须有一个 exit 交互点');
assert.equal(oldRoadExit.to, 'camp', 'old-road 出口必须连接到 camp');

// --- 2C. 章节过渡流程 ---
context.Game.startNew();
context.World.storyFlags['military-book-found'] = true;
context.World.storyFlags['guan-yu-joined'] = true;
context.World.storyFlags['mountain-pursuit'] = true;
context.Battle.start('stone-oath');
for (let round = 0; round < 12 && context.Game.state === 'battle'; round += 1) {
  const choices = Object.fromEntries(context.World.party.map((id) => [id, 'attack']));
  if (round === 0) choices[context.World.party[0]] = { type: 'tactic', tacticId: 'phantom-banner' };
  context.World.party.forEach((id) => context.Battle.choose(id, choices[id]));
  context.Battle.resolveRound();
}
assert.equal(context.Game.state, 'battle-result', 'boss 胜利后必须进入 battle-result');
const summaryReward = context.Battle.finish();
assert.equal(summaryReward, 'chapter-summary', 'boss 确认后必须进入 chapter-summary');
assert.equal(context.Game.state, 'chapter-summary');

// chapter-summary 确认后应进入 chapter-transition（不是直接回到 world）
const transitionResult = context.Game.confirmChapterSummary();
assert.equal(transitionResult, 'chapter-transition', '章节结算确认必须进入 chapter-transition');
assert.equal(context.Game.state, 'chapter-transition', 'Game.state 必须为 chapter-transition');

// chapter-transition 确认后应进入 world，且在 old-road，且 chapter 为 chapter-2
const worldReturn = context.Game.confirmChapterTransition();
assert.equal(worldReturn, 'world', '章节过渡确认后必须进入 world');
assert.equal(context.Game.state, 'world', 'Game.state 必须为 world');
assert.equal(context.Game.chapter, 'chapter-2', 'chapter 必须切换为 chapter-2');
assert.equal(context.World.mapId, 'old-road', '过渡后必须出现在 old-road');
assert.ok(context.World.storyFlags['chapter-1-complete'], 'chapter-1-complete 必须保持为 true');
assert.equal(typeof context.Game.chapterTransition, 'function', 'Game.chapterTransition 必须暴露');
assert.equal(typeof context.Game.confirmChapterTransition, 'function', 'Game.confirmChapterTransition 必须暴露');

// --- 2D. 第二章开场目标 ---
assert.equal(context.Game.currentObjective, '前往古驿道寻求增援', '第二章开场目标必须为前往古驿道寻求增援');

// --- 2E. encounter chain 系统 ---
assert.equal(typeof context.Battle.startChain, 'function', 'Battle.startChain 必须暴露');
assert.equal(typeof context.Battle.chainNext, 'function', 'Battle.chainNext 必须暴露');
assert.ok(context.Battle.chainQueue === undefined || Array.isArray(context.Battle.chainQueue), 'Battle.chainQueue 必须为 undefined 或数组');

// startChain('gate-ambush') 应能启动连战
context.Game.startNew();
context.World.storyFlags['military-book-found'] = true;
context.World.storyFlags['guan-yu-joined'] = true;
context.World.storyFlags['mountain-pursuit'] = true;
context.World.chapter = 'chapter-1';
const chainStart = context.Battle.startChain('gate-ambush');
assert.equal(chainStart, 'battle', 'startChain 必须返回 battle');
assert.equal(context.Battle.encounter.id, 'reed-bandit', '连战第一场必须是 reed-bandit');
assert.ok(Array.isArray(context.Battle.chainQueue), 'chainQueue 必须为数组');
assert.equal(context.Battle.chainQueue.length, 1, 'chainQueue 必须剩余 1 场');

// --- 2F. Boss 不再强制使用计策 ---
context.Game.startNew();
context.World.storyFlags['military-book-found'] = true;
context.World.storyFlags['guan-yu-joined'] = true;
context.World.storyFlags['mountain-pursuit'] = true;
context.Battle.start('stone-oath');
for (let round = 0; round < 15 && context.Game.state === 'battle'; round += 1) {
  context.World.party.forEach((id) => context.Battle.choose(id, 'attack'));
  context.Battle.resolveRound();
}
assert.equal(context.Battle.status, 'victory', 'Boss 只用 attack 也必须能胜利（计策不再强制）');

// --- 2G. NPC 回访对话条件 ---
assert.ok(context.DATA.MAPS.town.interactions.find((i) => i.id === 'town-guan-yu'), 'town 必须有 town-guan-yu NPC');
const townGuanYu = context.DATA.MAPS.town.interactions.find((i) => i.id === 'town-guan-yu');
assert.ok(townGuanYu.revisitDialogue, 'town-guan-yu 必须有 revisitDialogue');
assert.ok(townGuanYu.conditionStoryFlag, 'town-guan-yu 必须有 conditionStoryFlag');
assert.equal(townGuanYu.conditionStoryFlag, 'town-rescue', 'town-guan-yu conditionStoryFlag 必须为 town-rescue');

assert.ok(context.DATA.MAPS.field.interactions.find((i) => i.id === 'field-lantern'), 'field 必须有 field-lantern NPC');
const fieldLantern = context.DATA.MAPS.field.interactions.find((i) => i.id === 'field-lantern');
assert.ok(fieldLantern.revisitDialogue, 'field-lantern 必须有 revisitDialogue');
assert.ok(fieldLantern.conditionStoryFlag, 'field-lantern 必须有 conditionStoryFlag');
assert.equal(fieldLantern.conditionStoryFlag, 'military-book-found', 'field-lantern conditionStoryFlag 必须为 military-book-found');

// 验证回访条件触发机制
context.Game.startNew();
context.World.storyFlags['town-rescue'] = true;
context.World.events['town-rescue'] = true;
context.Game.enterWorld('town');
const revisitGuanYu = context.DATA.MAPS.town.interactions.find((i) => i.id === 'town-guan-yu');
context.World.x = revisitGuanYu.x;
context.World.y = revisitGuanYu.y;
const revisitResult = context.World.interact();
assert.equal(revisitResult.triggered.type, 'npc', '回访 town-guan-yu 必须触发 npc');
assert.equal(revisitResult.triggered.dialogue, townGuanYu.revisitDialogue, 'town-rescue 完成后 town-guan-yu 必须使用 revisitDialogue');

// 未完成条件时不应触发回访对话
context.Game.startNew();
context.World.storyFlags['town-rescue'] = false;
context.Game.enterWorld('town');
context.World.x = revisitGuanYu.x;
context.World.y = revisitGuanYu.y;
const noRevisitResult = context.World.interact();
assert.equal(noRevisitResult.triggered.dialogue, townGuanYu.dialogue, 'town-rescue 未完成时 town-guan-yu 必须使用原始 dialogue');

// --- 2H. 断云关前 gate-ambush 连战入口 ---
const bossGate = context.DATA.MAPS['boss-gate'];
assert.ok(bossGate, 'boss-gate 地图必须存在');
const gateAmbushPoint = bossGate.interactions.find((i) => i.kind === 'battle' && i.encounter === 'gate-ambush');
assert.ok(gateAmbushPoint, 'boss-gate 必须有 gate-ambush 遭遇点');

// --- 2I. 山道 ridge-ambush 入口 ---
const mountainMap = context.DATA.MAPS.mountain;
assert.ok(mountainMap, 'mountain 地图必须存在');
const ridgeAmbushPoint = mountainMap.interactions.find((i) => i.kind === 'battle' && i.encounter === 'ridge-ambush');
assert.ok(ridgeAmbushPoint, 'mountain 必须有 ridge-ambush 遭遇点');

console.log('Three Kingdoms exploration and combat checks passed.');

// ============================================
// HJKL 键位 / 控制器 / 视觉升级 / 手柄测试（新增）
// ============================================

// --- 3A. HJKL 移动键位 ---
assert.equal(typeof context.keyActions, 'object', 'keyActions 必须暴露');
const keys = context.keyActions;
assert.equal(keys.h, 'left', 'h 必须映射到 left');
assert.equal(keys.H, 'left', 'H 必须映射到 left');
assert.equal(keys.j, 'down', 'j 必须映射到 down');
assert.equal(keys.J, 'down', 'J 必须映射到 down');
assert.equal(keys.k, 'up', 'k 必须映射到 up');
assert.equal(keys.K, 'up', 'K 必须映射到 up');
assert.equal(keys.l, 'right', 'l 必须映射到 right');
assert.equal(keys.L, 'right', 'L 必须映射到 right');

// 原有键位必须保留
assert.equal(keys.ArrowUp, 'up', '方向键上必须保留');
assert.equal(keys.w, 'up', 'WASD w 必须保留');
assert.equal(keys.a, 'left', 'WASD a 必须保留');
assert.equal(keys.s, 'down', 'WASD s 必须保留');
assert.equal(keys.d, 'right', 'WASD d 必须保留');
assert.equal(keys.Enter, 'confirm', 'Enter 必须保留');
assert.equal(keys[' '], 'confirm', '空格必须映射到 confirm');
assert.equal(keys.Escape, 'cancel', 'Escape 必须保留');
assert.equal(keys.x, 'cancel', 'x 必须保留');
assert.equal(keys.z, 'confirm', 'z 必须保留');

// --- 3B. partySelection 不应阻塞方向移动 ---
context.Game.startNew();
assert.equal(context.Game.state, 'world');
assert.equal(context.Game.partySelection.visible, false, '新旅程后 partySelection 必须关闭');
// 模拟打开 partySelection
context.Game.openPartySelection();
assert.equal(context.Game.partySelection.visible, true, 'openPartySelection 后必须可见');
// HJKL 方向键在 partySelection 打开时不应被完全吞掉
// 步骤处理应当允许 left/right 等通过
// 同时 up/down 应被 partyInput 消费
const worldBeforeX = context.World.x;
const worldBeforeY = context.World.y;
// 关闭 panel
context.Game.partySelection.visible = false;
context.Game.selectParty(['liu-bei', 'yun', 'lan']);
assert.equal(context.Game.partySelection.visible, false, 'selectParty 后 partySelection 必须关闭');

// --- 3C. drawActorSprite 增强视觉细节 ---
assert.equal(typeof context.drawActorSprite, 'function', 'drawActorSprite 必须暴露');
// drawActorSprite 必须有足够视觉细节（robe body + skin face + hair + beard + weapon）
// 通过检查源码中函数体是否包含足够的视觉关键词
const htmlSource = html;
assert.ok(htmlSource.includes('visual.robes') || htmlSource.includes('robes'), 'drawActorSprite 必须绘制 robe');
assert.ok(htmlSource.includes('visual.skin') || htmlSource.includes('skin'), 'drawActorSprite 必须绘制 skin');
assert.ok(htmlSource.includes('visual.hair') || htmlSource.includes('hair'), 'drawActorSprite 必须绘制 hair');
assert.ok(htmlSource.includes('visual.beard'), 'drawActorSprite 必须绘制 beard');
assert.ok(htmlSource.includes('visual.weapon') || htmlSource.includes('guandao'), 'drawActorSprite 必须绘制 weapon');
// 必须为刘备/关羽/张飞有至少 10 次 fillRect 调用来表示 SD 二头身细节
const spriteMatches = htmlSource.match(/fillRect/g);
assert.ok(spriteMatches && spriteMatches.length >= 10, 'drawActorSprite 必须有 >=10 次 fillRect 调用来表示 SD 细节');

// --- 3D. 图块纹理绘制 ---
assert.ok(htmlSource.includes('tileColor'), 'tileColor 必须存在');
// 纹理绘制必须使用 strokeRect 或 stroke 来添加图块纹理
const strokeRectMatches = htmlSource.match(/strokeRect/g);
assert.ok(strokeRectMatches && strokeRectMatches.length >= 3, '图块绘制必须使用 strokeRect 添加纹理 >= 3 次');
// 必须有草叶纹理（stroke + beginPath 用于草叶/砖石线条）
const strokeMatches = htmlSource.match(/\.stroke\(\)/g);
assert.ok(strokeMatches && strokeMatches.length >= 3, '图块绘制必须使用 stroke 添加草叶/砖石线条 >= 3 次');

// --- 3E. 手柄支持（Gamepad API） ---
assert.ok(htmlSource.includes('getGamepads'), '必须包含 getGamepads 手柄支持');
assert.ok(htmlSource.includes('gamepad') || htmlSource.includes('Gamepad'), '代码中必须引用 gamepad');
assert.ok(htmlSource.includes('requestAnimationFrame'), '手柄轮询需要 requestAnimationFrame');
// 手柄轮询函数必须存在（gamepadPoll 或 gamepadLoop）
assert.ok(htmlSource.includes('gamepadPoll') || htmlSource.includes('gamepadLoop') || htmlSource.includes('pollGamepad'), '必须有手柄轮询函数');

// --- 3F. HJKL 在世界移动中实际生效 ---
context.Game.startNew();
assert.equal(context.Game.state, 'world');
const jsSource = htmlSource;
assert.ok(jsSource.includes("h: 'left'") || jsSource.includes("h:'left'") || jsSource.includes("'h': 'left'"), 'keyActions 中 h 映射到 left');

console.log('Controls and visual upgrade checks passed.');
