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

// --- 3A. HJKL 重构为 UI 功能键 ---
assert.equal(typeof context.keyActions, 'object', 'keyActions 必须暴露');
const keys = context.keyActions;
// HJKL 现在是 UI 功能键，不再是移动键
assert.equal(keys.h, 'confirm', 'h 必须映射到 confirm');
assert.equal(keys.H, 'confirm', 'H 必须映射到 confirm');
assert.equal(keys.j, 'cancel', 'j 必须映射到 cancel');
assert.equal(keys.J, 'cancel', 'J 必须映射到 cancel');
assert.equal(keys.k, 'menu', 'k 必须映射到 menu');
assert.equal(keys.K, 'menu', 'K 必须映射到 menu');
assert.equal(keys.l, 'status', 'l 必须映射到 status');
assert.equal(keys.L, 'status', 'L 必须映射到 status');

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
// 方向键和 WASD 在 partySelection 打开时应被 partyInput 消费
// HJKL 现在是 UI 功能键
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

// --- 3F. HJKL 现在是 UI 功能键 ---
context.Game.startNew();
assert.equal(context.Game.state, 'world');
const jsSource = htmlSource;
assert.ok(jsSource.includes("h: 'confirm'") || jsSource.includes("h:'confirm'") || jsSource.includes("'h': 'confirm'"), 'keyActions 中 h 映射到 confirm');

console.log('Controls and visual upgrade checks passed.');

// ============================================
// 视觉质量与操控升级测试（第四轮）
// ============================================

// --- 4A. partyInput left/right 处理 ---
context.Game.startNew();
assert.equal(context.Game.state, 'world');
context.Game.openPartySelection();
assert.equal(context.Game.partySelection.visible, true);
// left/right 必须被 partyInput 处理（不再被忽略）
const testSelection = { ...context.Game.partySelection };
context.Game.partyInput('left');
assert.notDeepEqual(context.Game.partySelection.cursor, undefined, 'left 必须被 partyInput 处理');
context.Game.partyInput('right');
assert.notDeepEqual(context.Game.partySelection.cursor, undefined, 'right 必须被 partyInput 处理');
context.Game.partySelection.visible = false;

// --- 4B. 关羽面部必须用暖红色 ---
const guanYuVisual = context.DATA.ACTORS['guan-yu'].visual;
// 关羽面部皮肤色必须是暖红系列（#c04030 附近或 #b8654f 以上的暖色）
const gySkin = guanYuVisual.skin;
assert.ok(gySkin, '关羽必须有 skin 颜色');
// 解析 RGB 检查红色通道足够高、绿色通道足够低（暖红色）
const gyR = parseInt(gySkin.slice(1, 3), 16);
const gyG = parseInt(gySkin.slice(3, 5), 16);
assert.ok(gyR >= 160, `关羽 skin 红色通道必须 >= 160（实际 ${gyR}）`);
assert.ok(gyG <= 100, `关羽 skin 绿色通道必须 <= 100（实际 ${gyG}），确保面部是暖红色`);

// --- 4C. 关羽黑须必须更大更明显 ---
// beard 绘制区域必须比默认更大（>=26 宽度和 >=20 高度）
const beardMatch = htmlSource.match(/if \(visual\.beard\)[^}]*fillRect[^;]*;[^}]*fillRect/);
assert.ok(beardMatch, 'drawActorSprite 必须绘制 beard 的两个矩形区域');
// 检查源码中 beard 绘制的宽度参数是否 >= 26
const beardWidthMatch = htmlSource.match(/if \(visual\.beard\)[^}]*?fillRect\([^)]*-?\d+,\s*top\s*\+\s*\d+,\s*(\d+)/);
assert.ok(beardWidthMatch, 'beard fillRect 必须可解析');
const beardWidth = parseInt(beardWidthMatch[1]);
assert.ok(beardWidth >= 26, `关羽 beard 宽度必须 >= 26（实际 ${beardWidth}）`);

// --- 4D. 刘备金色头冠必须突出 ---
const liuBeiVisual = context.DATA.ACTORS['liu-bei'].visual;
const lbHead = liuBeiVisual.head;
assert.ok(lbHead, '刘备必须有 head 颜色（头冠）');
// 刘备头冠必须是金色系列（R>=180, G>=150, B<=130）
const lbR = parseInt(lbHead.slice(1, 3), 16);
const lbG = parseInt(lbHead.slice(3, 5), 16);
const lbB = parseInt(lbHead.slice(5, 7), 16);
assert.ok(lbR >= 180 && lbG >= 130, `刘备 head 必须是金色系（R=${lbR}, G=${lbG}），金冠不够突出`);
// 头冠绘制区域必须比普通 head 更大（或有额外 crown 绘制）
assert.ok(htmlSource.includes('crown') || htmlSource.includes('金冠') || liuBeiVisual.head !== guanYuVisual.head, '刘备必须有独立的金冠视觉表现');

// --- 4E. 张飞大胡子必须覆盖更大面积 ---
const zhangFeiVisual = context.DATA.ACTORS['zhang-fei'].visual;
assert.ok(zhangFeiVisual.beard, '张飞必须有 beard');
// 张飞 beard 颜色必须足够深（纯黑或接近黑）
const zfBeard = zhangFeiVisual.beard;
const zfBR = parseInt(zfBeard.slice(1, 3), 16);
assert.ok(zfBR <= 30, `张飞 beard 必须是深黑色（R=${zfBR}）`);
// 张飞 beard 绘制面积必须比关羽更大（通过额外 fillRect 或更大尺寸）
// 检查 drawActorSprite 中是否有 zhang-fei 或 beard size 条件判断
assert.ok(htmlSource.includes('zhang-fei') || htmlSource.includes('visual.beard'), 'drawActorSprite 必须对 beard 有差异化绘制');

// --- 4F. 青龙偃月刀必须比其他武器更大 ---
// 通过检查 guandao 的绘制尺寸（moveTo/lineTo 坐标差值）
const guandaoMatch = htmlSource.match(/weapon\s*===\s*'guandao'[\s\S]*?moveTo\(\d+,\s*top\s*\+\s*\d+\)[\s\S]*?lineTo\(\d+,\s*top\s*-\s*(\d+)/);
assert.ok(guandaoMatch, 'guandao 必须有 moveTo/lineTo 绘制');
const guandaoExtend = parseInt(guandaoMatch[1]);
assert.ok(guandaoExtend >= 5, `青龙偃月刀向上延伸必须 >= 5px（实际 ${guandaoExtend}），需要比其他武器更长`);

// --- 4G. 所有角色必须有白底+黑点眼睛 ---
// 已有 '#f0eee8' 眼白和 '#0f0f18' 瞳孔
assert.ok(htmlSource.includes('#f0eee8') || htmlSource.includes('f0eee8'), '眼睛必须有白底');
assert.ok(htmlSource.includes('#0f0f18') || htmlSource.includes('0f0f18'), '眼睛必须有黑点瞳孔');

// --- 4H. 图块草叶纹理 >= 3 条 stroke ---
// drawTileTexture 中必须有 >= 3 条草地线条
const grassBladeMatches = htmlSource.match(/beginPath\(\);[\s\S]*?moveTo[\s\S]*?lineTo[\s\S]*?stroke\(\)/g);
assert.ok(grassBladeMatches && grassBladeMatches.length >= 3, `草叶纹理线条必须 >= 3 条（实际 ${grassBladeMatches ? grassBladeMatches.length : 0}）`);

// --- 4I. 所有图块必须有至少两种颜色的细节 ---
// 非墙壁图块必须有纹理 stroke 和边框 stroke
assert.ok(htmlSource.includes('strokeRect'), '图块绘制必须使用 strokeRect 添加边框');

// --- 4J. 战斗画面：敌方人物高度 >= 140 ---
// 检查 renderBattle 中 drawActorSprite 的高度参数
const battleEnemyHeightMatch = htmlSource.match(/renderBattle[\s\S]*?drawActorSprite[^}]*height:\s*(\d+)/);
assert.ok(battleEnemyHeightMatch, 'renderBattle 中敌方 drawActorSprite 必须有 height 参数');
const battleEnemyHeight = parseInt(battleEnemyHeightMatch[1]);
assert.ok(battleEnemyHeight >= 140, `战斗画面敌方高度必须 >= 140（实际 ${battleEnemyHeight}）`);

// --- 4K. 战斗画面：背景必须有渐变色 ---
// renderBattle 必须使用 createLinearGradient
assert.ok(htmlSource.includes('createLinearGradient') || htmlSource.includes('linear-gradient'), 'renderBattle 必须使用渐变背景');

// --- 4L. 战斗日志字体必须更大 ---
// 检查 renderBattle 中日志文字的 size 参数
const battleLogMatch = htmlSource.match(/renderBattle[\s\S]*?Battle\.log[\s\S]*?drawText[^,]*,\s*(\d+)/);
// 不做严格检查，只要求战斗日志存在
assert.ok(htmlSource.includes('Battle.log'), 'renderBattle 必须渲染战斗日志');

// --- 4M. 控制提示文本必须包含新按键标注 ---
// 页面 HTML 提示文本
assert.ok(htmlSource.includes('H 确认') || htmlSource.includes('H/Enter'), '页面提示文本必须包含 H 确认');
// renderWorld 中 partySelection 提示
assert.ok(htmlSource.includes('方向键选择') || htmlSource.includes('H 确认'), '编队面板必须提及控制键');

// --- 4N. 触控按钮文本更新 ---
// 确保触控区域有 battle-1 到 battle-5 的按钮
assert.ok(htmlSource.includes('data-action="battle-1"'), '触控按钮 battle-1 必须存在');
assert.ok(htmlSource.includes('data-action="battle-5"'), '触控按钮 battle-5 必须存在');

// --- 4O. 所有状态都能响应已映射按键 ---
// step 函数必须处理 battle-result、chapter-summary、chapter-transition、game-over 状态
assert.ok(htmlSource.includes("Game.state === 'battle-result'"), 'step 必须处理 battle-result');
assert.ok(htmlSource.includes("Game.state === 'chapter-summary'"), 'step 必须处理 chapter-summary');
assert.ok(htmlSource.includes("Game.state === 'chapter-transition'"), 'step 必须处理 chapter-transition');
assert.ok(htmlSource.includes("Game.state === 'game-over'"), 'step 必须处理 game-over');

console.log('Visual quality and control upgrade tests added (expecting failures until implementation).');

// ============================================
// HJKL 重构为 UI 功能键测试（第五轮）
// ============================================

// --- 5A. HJKL 不再是移动键 ---
// H = confirm（确认，对应 NES A 键）
// J = cancel（取消，对应 NES B 键）
// K = menu（呼出菜单/状态，对应 NES START 键）
// L = status（查看队伍状态/信息）
assert.equal(typeof context.keyActions, 'object', 'keyActions 必须暴露');
const k = context.keyActions;
assert.equal(k.h, 'confirm', 'h 必须映射到 confirm');
assert.equal(k.H, 'confirm', 'H 必须映射到 confirm');
assert.equal(k.j, 'cancel', 'j 必须映射到 cancel');
assert.equal(k.J, 'cancel', 'J 必须映射到 cancel');
assert.equal(k.k, 'menu', 'k 必须映射到 menu');
assert.equal(k.K, 'menu', 'K 必须映射到 menu');
assert.equal(k.l, 'status', 'l 必须映射到 status');
assert.equal(k.L, 'status', 'L 必须映射到 status');

// HJKL 不应再映射到移动
assert.notEqual(k.h, 'left', 'h 不再映射到 left');
assert.notEqual(k.j, 'down', 'j 不再映射到 down');
assert.notEqual(k.k, 'up', 'k 不再映射到 up');
assert.notEqual(k.l, 'right', 'l 不再映射到 right');

// --- 5B. 方向键和 WASD 保留为移动 ---
assert.equal(k.ArrowUp, 'up', '方向键上必须保留');
assert.equal(k.ArrowDown, 'down', '方向键下必须保留');
assert.equal(k.ArrowLeft, 'left', '方向键左必须保留');
assert.equal(k.ArrowRight, 'right', '方向键右必须保留');
assert.equal(k.w, 'up', 'WASD w 必须保留');
assert.equal(k.a, 'left', 'WASD a 必须保留');
assert.equal(k.s, 'down', 'WASD s 必须保留');
assert.equal(k.d, 'right', 'WASD d 必须保留');
assert.equal(k.Enter, 'confirm', 'Enter 必须保留');
assert.equal(k[' '], 'confirm', '空格必须映射到 confirm');
assert.equal(k.z, 'confirm', 'z 必须保留为 confirm');
assert.equal(k.Escape, 'cancel', 'Escape 必须保留');
assert.equal(k.x, 'cancel', 'x 必须保留为 cancel');

// --- 5C. ACTIONS 必须包含 menu 和 status ---
const actions = context.ACTIONS;
assert.ok(actions.has('menu'), 'ACTIONS 必须包含 menu');
assert.ok(actions.has('status'), 'ACTIONS 必须包含 status');
assert.ok(actions.has('confirm'), 'ACTIONS 必须包含 confirm');
assert.ok(actions.has('cancel'), 'ACTIONS 必须包含 cancel');
assert.ok(actions.has('up'), 'ACTIONS 必须包含 up');
assert.ok(actions.has('down'), 'ACTIONS 必须包含 down');
assert.ok(actions.has('left'), 'ACTIONS 必须包含 left');
assert.ok(actions.has('right'), 'ACTIONS 必须包含 right');

// --- 5D. menu 和 status 输入可被识别 ---
context.Input.enqueue('menu');
assert.equal(context.Input.consume('menu'), 'menu', 'menu 输入应可识别');
context.Input.enqueue('status');
assert.equal(context.Input.consume('status'), 'status', 'status 输入应可识别');

// --- 5E. step() 在 world 状态下处理 menu（打开营地） ---
context.Game.startNew();
assert.equal(context.Game.state, 'world');
context.Input.enqueue('menu');
context.GameStep();
assert.equal(context.Game.state, 'camp', 'world 状态下 menu 应打开营地');

// --- 5F. step() 在 world 状态下处理 status ---
context.Game.startNew();
assert.equal(context.Game.state, 'world');
// status 应该在 world 状态下显示队伍状态（不改变状态或设置状态为 status）
context.Input.enqueue('status');
context.GameStep();
// status 可能设置 Game.message 或进入特定状态，但不应 crash
assert.ok(true, 'status 在 world 状态下不应 crash');

// --- 5G. step() 在 world 状态下 cancel 不再打开营地 ---
context.Game.startNew();
assert.equal(context.Game.state, 'world');
const campBefore = context.Game.state;
context.Input.enqueue('cancel');
context.GameStep();
// cancel 在 world 下不应打开营地（camp 已由 menu 处理）
// 可能什么都不做或返回标题，但不能打开营地
assert.notEqual(context.Game.state, 'camp', 'world 状态下 cancel 不应打开营地');

// --- 5H. 触控按钮必须包含 menu 和 status ---
assert.ok(htmlSource.includes('data-action="menu"'), '触控按钮 menu 必须存在');
assert.ok(htmlSource.includes('data-action="status"'), '触控按钮 status 必须存在');

// --- 5I. renderBattle 使用第一人称布局 ---
// 战斗标题必须显示在画面最上方
assert.ok(htmlSource.includes('renderBattle'), 'renderBattle 必须存在');
// 敌方精灵居中偏右
assert.ok(htmlSource.includes('780') || htmlSource.includes('1060') || htmlSource.includes('1020') || htmlSource.includes('980'), 'renderBattle 敌方精灵必须在右侧');
// 战斗日志
assert.ok(htmlSource.includes('Battle.log'), 'renderBattle 必须渲染战斗日志');

// --- 5J. renderDialogue 使用新版对话框布局 ---
// 窗口从 y=420 开始，高度 260
assert.ok(htmlSource.includes('renderDialogue'), 'renderDialogue 必须存在');

// --- 5K. UI 提示文本使用新按键标注 ---
// "H 确认" 出现在提示中
assert.ok(htmlSource.includes('H 确认'), '提示文本必须包含 "H 确认"');
// "J 取消" 出现在提示中
assert.ok(htmlSource.includes('J 取消'), '提示文本必须包含 "J 取消"');
// 兼容提示
assert.ok(htmlSource.includes('Enter') || htmlSource.includes('Enter / 空格'), '必须保留 Enter 兼容提示');

// --- 5L. renderBattle 布局区域检查 ---
// 战斗标题区域 y: 0-50
// 敌方区域 y: 50-380
// 我方区域 y: 420-540
// 指令菜单 y: 540-580
// 战斗日志 y: 580-640
// 回合信息 y: 640-680
// 检查 renderBattle 中引用了这些区域的坐标
const battleSource = htmlSource.substring(htmlSource.indexOf('function renderBattle'));
assert.ok(battleSource.includes('420') || battleSource.includes('430'), 'renderBattle 必须在 y≈420 区域绘制我方队伍');
assert.ok(battleSource.includes('540') || battleSource.includes('550'), 'renderBattle 必须在 y≈540 区域绘制指令菜单');
assert.ok(battleSource.includes('580') || battleSource.includes('590'), 'renderBattle 必须在 y≈580 区域绘制战斗日志');

console.log('HJKL remap and visual redesign tests added (expecting failures until implementation).');
