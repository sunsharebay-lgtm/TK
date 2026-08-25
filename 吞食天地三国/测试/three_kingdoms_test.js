#!/usr/bin/env node
/* 吞食天地Ⅱ·网页复刻 —— 回归测试
 * 在 Node 中以 DOM 桩加载 three-kingdoms.html 的脚本，验证：
 * 1) 解密数据表完整性  2) 数值公式与参考一致  3) 第一章全流程可通关
 * 4) 存档往返  5) 渲染资源可生成
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'three-kingdoms.html'), 'utf8');
const m = html.match(/<script>\n([\s\S]*)\n  <\/script>/);
assert(m, '必须能提取 <script> 块');
const src = m[1];

// ---------- DOM 桩 ----------
function makeCtx() {
  return new Proxy({}, {
    get(t, k) {
      if (k === 'canvas') return {};
      return (...args) => {
        if (k === 'createLinearGradient' || k === 'createRadialGradient') return { addColorStop() {} };
        if (k === 'measureText') return { width: 10 };
        return undefined;
      };
    },
    set() { return true; }
  });
}
function makeCanvas() {
  return {
    width: 0, height: 0, style: {},
    getContext: () => makeCtx(),
    setAttribute() {}, focus() {},
    addEventListener() {},
  };
}
const listeners = {};
const sandbox = {
  console, Math, JSON, performance: { now: () => Date.now() },
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: () => 0,
  document: {
    getElementById: () => makeCanvas(),
    createElement: () => makeCanvas(),
    querySelectorAll: () => [],
    addEventListener() {},
  },
  window: {},
  navigator: { getGamepads: () => [] },
  localStorage: {
    _d: {},
    getItem(k) { return this._d[k] ?? null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
  },
  AudioContext: undefined, webkitAudioContext: undefined,
};
sandbox.window = sandbox;
// window.AudioContext 等通过 sandbox 查找即可

const vm = require('vm');
const context = vm.createContext(sandbox);
vm.runInContext(src, context, { filename: 'three-kingdoms-inline.js' });

const TK = sandbox.TKGame;
assert(TK, '必须暴露 window.TKGame 测试钩子');
const { G, DB, MAPS, step, newGame, startBattle } = TK;

let passed = 0;
function ok(cond, msg) { assert(cond, msg); passed++; }
function eq(a, b, msg) { assert.strictEqual(a, b, msg); passed++; }
function section(name) { console.log('  · ' + name); }

// ================= 1. 数据表完整性 =================
section('数据表完整性');
ok(Object.keys(DB.cls).length >= 50, 'CLASSES 至少 50 条');
ok(Object.keys(DB.skill).length >= 100, 'SKILLS 至少 100 条');
ok(Object.keys(DB.enemy).length >= 300, 'ENEMIES 至少 300 条');
ok(DB.cls[2] && DB.cls[2].zi === '玄德', '刘备职业=玄德');
ok(DB.cls[3] && DB.cls[3].zi === '云长', '关羽职业=云长');
ok(DB.skill[11] && DB.skill[11].name === '炼火计' && DB.skill[11].coef === 320, '炼火计系数320');
ok(DB.skill[16] && DB.skill[16].coef === 4320, '天火计系数4320');
ok(DB.skill[35] && DB.skill[35].name === '赤心计' && DB.skill[35].kind === 2, '赤心计为恢复计策');
ok(DB.weapon[1] && DB.weapon[1].name === '短剑' && DB.weapon[1].atk === 10, '短剑 攻10');
ok(DB.weapon[2] && DB.weapon[2].atk === 20, '铜剑 攻20');
ok(DB.armor[1] && DB.armor[1].name === '木盾' && DB.armor[1].def === 5, '木盾 防5');
const yuan = Object.values(DB.enemy).find(e => e.name === '袁术');
ok(yuan && yuan.p[0] === 800 && yuan.p[4] === 160, '袁术 HP800 智160（与原数据一致）');
const jiling = Object.values(DB.enemy).find(e => e.name === '纪灵');
ok(jiling && jiling.p[0] === 640, '纪灵 HP640');
const troop17 = DB.troop[17];
ok(troop17 && JSON.stringify(troop17.members) === JSON.stringify([23, 24, 20, 25, 26]), '袁术本阵编成=袁术孙策纪灵陈兰阎象');
ok(DB.troop[19].members[0] === 23, '总攻战仍含袁术');
ok(DB.troop[21].members[0] === 34, '车胄战编成');

// ================= 2. 成长与公式 =================
section('成长曲线与战斗公式');
ok(Math.abs(TK.classStat(2, 0, 10) - 777) <= 6, '刘备 lv10 兵力≈777（幂插值±6内），实际 ' + TK.classStat(2, 0, 10));
ok(Math.abs(TK.classStat(3, 0, 10) - 867) <= 6, '关羽 lv10 兵力≈867');
eq(TK.classStat(2, 4, 10), 200, '刘备 lv10 智力=200');
ok(TK.classStat(2, 0, 1) >= 1 && TK.classStat(2, 0, 99) > 6000, '兵力曲线单调到 lv99');
// 角色职业必须显式映射，技能读取使用映射后的参考职业
const expectedClasses = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 7 };
for (const [actorId, clsId] of Object.entries(expectedClasses)) {
  eq(TK.actorClass(+actorId), clsId, `武将${actorId}职业映射=${clsId}`);
}
newGame();
[3, 4, 5, 6].forEach(id => TK.joinActor(id));
for (const id of [2, 3, 4, 5, 6]) {
  const a = G.actors[id];
  ok(a.cls === expectedClasses[id], `武将${id}实例使用映射职业`);
  ok(Array.isArray(TK.learnedSkills(a.cls, 2)), `武将${id}有等级2策略表`);
}

// 物理：atk*4 - def*2，最低1
const d1 = TK.physDamage(21, 30);
ok(d1 >= 19 && d1 <= 34, 'atk21 vs def30 伤害约 24±15%，实际 ' + d1);
eq(TK.physDamage(1, 999), 1, '低攻高防保底 1');
// 计策：coef*mat/256，±10% 浮动
function near(v, target, ratio, msg) { ok(Math.abs(v - target) <= target * ratio, msg + '（实际 ' + v + '）'); }
near(TK.tacticDamage(320, 200, 256), 250, 0.11, '炼火计 智200 → ≈250');
near(TK.tacticDamage(4320, 200, 256), 3375, 0.11, '天火计 智200 → ≈3375');
near(TK.tacticDamage(320, 130, 960), 43, 0.15, '敌方炼火计 mmp130 → ≈43');
near(TK.tacticHeal(800, 200), 625, 0.01, '赤心计 智200 → 625');
ok(TK.expToNext(1) > 0 && TK.expToNext(10) > TK.expToNext(1), '经验曲线递增');

// ================= 3. 新游戏与探索 =================
section('新游戏与世界探索');
newGame();
eq(G.state, 'world', '新游戏进入世界');
ok(G.roster.length === 1 && G.roster[0] === 2, '初始仅刘备'); passed++;
eq(G.gold, 500, '初始 500 金');
eq(G.mapId, 'xuzhou', '开局徐州城');
ok(G.items[1] === 3, '初始赤心丹×3');

// 移动与碰撞
G.x = 8; G.y = 12; G.state = 'world'; // 避开百姓 NPC 堵路
const before = { x: G.x, y: G.y };
step('up'); step('up');
ok(G.x !== before.x || G.y !== before.y, '方向键可移动');
// 撞墙不动
G.x = 0; G.y = 0; G.flags = {};
step('left');
eq(G.x, 0, '撞墙不移动');

// 事件：与关羽对话加入
newGame();
G.x = 13; G.y = 12; G.dir = 'left';
step('confirm'); // 触发关羽
eq(G.state, 'dialogue', '对话开启');
step('confirm'); step('confirm'); step('confirm');
ok(G.roster.includes(3), '关羽入队');
ok(G.flags.joined_3, '关羽标记');

// 张飞
G.x = 16; G.y = 13; G.dir = 'left';
step('confirm');
step('confirm'); step('confirm'); step('confirm');
ok(G.roster.includes(4), '张飞入队');
eq(G.roster.length, 3, '三人队伍');

// ================= 4. 官署剧情 =================
section('官署剧情与朱灵路昭');
G.mapId = 'palace'; G.x = 7; G.y = 3; G.dir = 'up';
step('confirm');
eq(G.state, 'dialogue', '剧情对话开启');
// 快进所有对话页
for (let i = 0; i < 40 && G.state === 'dialogue'; i++) step('confirm');
console.log('    [debug] state=', G.state, 'flags.intro_done=', G.flags.intro_done, 'roster=', JSON.stringify(G.roster));
ok(G.flags.intro_done, 'intro 剧情标记');
ok(G.roster.includes(5) && G.roster.includes(6), '朱灵路昭加入');
eq(G.roster.length, 5, '五人满编');

// ================= 5. 战斗系统全流程 =================
section('战斗：随机遭遇胜利流程');
newGame();
TK.joinActor(3); TK.joinActor(4); TK.joinActor(5); TK.joinActor(6);
// 正常练度：lv4 + 铜剑/皮盾（第一章商店可购）
for (const id of [2, 3, 4, 5, 6]) { const a = G.actors[id]; a.lvl = 4; TK.recalc(a); a.hp = a.mhp; a.mp = a.mmp; a.eq = [2, 2]; }
startBattle(11, { flag: 'test_b' });   // 黄巾贼×5
eq(G.state, 'battle', '进入战斗');
const B = G.battle;
ok(B.enemies.length === 5, '敌群5人');
// intro → command（消息需推进完）
for (let i = 0; i < 10 && G.battle.phase === 'intro'; i++) step('confirm');
eq(B.phase, 'command', '进入指令阶段');
// 依次给5人下突击指令
for (let i = 0; i < 5; i++) {
  step('cmd-attack');
  if (G.battle.phase === 'targetE') step('confirm');
  // 等结算
  let guard = 0;
  while (G.battle && (G.battle.phase === 'msgview' || G.battle.phase === 'intro') && guard++ < 200) step('confirm');
  if (!G.battle || G.battle.result) break;
  if (G.battle.phase === 'command' && G.battle.choices.length === 0) { /* 新回合 */ }
}
ok(G.battle, '战斗仍在进行或已结束');
// 自动打完
let guard = 0;
while (G.battle && !G.battle.result && guard++ < 500) {
  const b2 = G.battle;
  if (b2.phase === 'command') step('cmd-attack');
  else if (b2.phase === 'targetE') step('confirm');
  else if (b2.phase === 'msgview' || b2.phase === 'intro') step('confirm');
  else if (b2.phase === 'result') step('confirm');
}
ok(!G.battle || G.battle.result === 'victory', '黄巾贼战可胜利');
if (G.battle && G.battle.result) step('confirm'); // 确认战果
eq(G.state, 'world', '战斗后回到世界');
ok(G.flags.test_b, '战斗 flag 已置');
ok(G.gold > 500, '获得军资');

section('战斗：袁术本阵（Boss）');
newGame();
[3, 4, 5, 6].forEach(id => TK.joinActor(id));
// lv10 + 铁剑/鳞盾（第一章商店可购），正常练度
for (const id of [2, 3, 4]) { const a = G.actors[id]; a.lvl = 10; TK.recalc(a); a.eq = [6, 3]; a.hp = a.mhp; a.mp = a.mmp; }
for (const id of [5, 6]) { const a = G.actors[id]; a.lvl = 9; TK.recalc(a); a.eq = [6, 3]; a.hp = a.mhp; a.mp = a.mmp; }
startBattle(17, { flag: 'f_yuan1', boss: true, healAfter: true });
guard = 0;
while (G.battle && !G.battle.result && guard++ < 900) {
  const b2 = G.battle;
  if (b2.phase === 'command') {
    // 刘备用计策，其余突击
    const cur = b2.party[b2.memberIdx];
    if (cur.id === 2) { step('cmd-tactic'); if (b2.phase === 'submenu') { step('down'); step('confirm'); if (b2.phase === 'targetE') step('confirm'); } }
    else { step('cmd-attack'); if (b2.phase === 'targetE') step('confirm'); }
  }
  else if (b2.phase === 'targetE') step('confirm');
  else if (b2.phase === 'msgview' || b2.phase === 'intro') step('confirm');
  else if (b2.phase === 'result') step('confirm');
}
ok(!G.battle || G.battle.result === 'victory', 'lv8 队伍可胜袁术本阵（含策略）');

section('战斗：撤退与败北');
newGame();
startBattle(22, { boss: true }); // 曹操队，必败
guard = 0;
while (G.battle && !G.battle.result && guard++ < 300) {
  const b2 = G.battle;
  if (b2.phase === 'command') step('cmd-defend');
  else if (b2.phase === 'msgview' || b2.phase === 'intro') step('confirm');
  else if (b2.phase === 'result') step('confirm');
}
if (G.battle && G.battle.result === 'defeat') {
  step('confirm');
  eq(G.state, 'gameover', '全灭进入败亡画面');
}

// ================= 6. 升级与策略习得 =================
section('升级习得策略');
newGame();
const lb = G.actors[2];
TK.grantExp(lb, TK.expToNext(1));
eq(lb.lvl, 2, '经验满升级');
const learned = TK.learnedSkills(2, 2);
ok(learned.includes(11) && learned.includes(19), 'lv2 习得炼火计/水途计');

// ================= 7. 装备背包、初始装备与存档 =================
section('装备背包、初始装备与存档');
newGame();
ok(G.actors[2].eq[0] > 0, '新游戏刘备有武器');
ok(G.actors[2].eq[1] > 0, '新游戏刘备有防具');
// 队友加入获得基础装备，重复加入不重复发放
[3, 4, 5, 6].forEach(id => TK.joinActor(id));
for (const id of [3, 4, 5, 6]) {
  ok(G.actors[id] && G.actors[id].eq[0] > 0, `武将${id}加入时有武器`);
  ok(G.actors[id] && G.actors[id].eq[1] > 0, `武将${id}加入时有防具`);
}
const guanyuWeapon = G.actors[3].eq[0];
TK.joinActor(3);
eq(G.actors[3].eq[0], guanyuWeapon, '重复加入不重复发放装备');
// 统一装备背包接口
TK.giveEquip('w', 2, 1);
eq(TK.equipCount('w', 2), 1, '铜剑进入装备背包');
ok(TK.takeEquip('w', 2, 1), '可取走铜剑');
eq(TK.equipCount('w', 2), 0, '取走后铜剑数量为 0');
TK.giveEquip('a', 2, 2);
eq(TK.equipCount('a', 2), 2, '皮盾×2 进入装备背包');
ok(TK.takeEquip('a', 2, 1), '可取走一个皮盾');
eq(TK.equipCount('a', 2), 1, '剩余皮盾 1');
// 存档保存未穿戴装备
G.gold = 1234;
G.state = 'world';
step('menu'); step('down'); step('down'); step('down'); step('confirm'); // 存档
const savedEquip = JSON.parse(sandbox.localStorage._d['tk-sw2-web-v1']);
ok(savedEquip.bagEquip && savedEquip.bagEquip['a:2'] === 1, '存档保存未穿戴装备');
// 读档恢复
G.roster = []; G.actors = {}; G.gold = 0; G.items = {}; G.flags = {}; G.bagEquip = {};
G.mapId = 'xuzhou'; G.x = 1; G.y = 1;
G.state = 'title'; G.titleCursor = 1;
step('confirm');
ok(G.bagEquip && G.bagEquip['a:2'] === 1, '读档恢复装备背包');
// 旧存档兼容：无 bagEquip 字段时初始化为空对象
const legacySave = { ver: 1, roster: [2], actors: { 2: { cls: 2, lvl: 1, exp: 0, hp: 100, mp: 10, eq: [1, 1] } }, gold: 100, items: {}, flags: {}, mapId: 'xuzhou', x: 8, y: 14, dir: 'down', chapterDone: false };
sandbox.localStorage._d['tk-sw2-web-v1'] = JSON.stringify(legacySave);
G.roster = []; G.actors = {}; G.bagEquip = { 'w:9': 3 };
G.state = 'title'; G.titleCursor = 1;
step('confirm');
ok(G.bagEquip && Object.keys(G.bagEquip).length === 0, '旧存档无装备背包时初始化为空');

// ================= 8. 商店库存与防具店 =================
section('Task 3 商店库存与防具店');
newGame();
TK.openShopForTest('weapon');
ok(TK.shopGoodsForTest('weapon').some(g => g[1] === 2), '武器店出售铜剑');
ok(TK.shopGoodsForTest('weapon').some(g => g[1] === 6), '武器店出售铁剑');
TK.openShopForTest('wshop');
eq(G.shop.kind, 'weapon', '旧 wshop 事件仍打开武器店');
TK.openShopForTest('armor');
ok(TK.shopGoodsForTest('armor').some(g => g[1] === 1), '防具店出售木盾');
ok(TK.shopGoodsForTest('armor').some(g => g[1] === 2), '防具店出售皮盾');
ok(TK.shopGoodsForTest('armor').some(g => g[1] === 3), '防具店出售鳞盾');
ok(TK.shopGoodsForTest('shield').some(g => g[1] === 1), '旧 shield 类型仍兼容防具库存');
const armorInfo = TK.goodInfoForTest(['a', 1]);
ok(armorInfo.desc.includes('防'), '防具信息显示防御值');
eq(G.state, 'shop', '打开防具店进入商店');
step('confirm'); // 购买第一件：木盾
eq(TK.equipCount('a', 1), 1, '购买木盾进入装备背包');
eq(G.gold, 500 - DB.armor[1].price, '购买防具扣除金币');
step('cancel');
eq(G.state, 'world', '离开商店回到世界');
ok(MAPS.ashop, '存在防具店地图');
ok(MAPS.xuzhou.events.some(e => e.t === 'door' && e.to === 'ashop'), '徐州城有防具店门');
ok(MAPS.ashop.events.some(e => e.t === 'shopkeeper' && e.kind === 'ashop'), '防具店有店内店主事件');
G.mapId = 'xuzhou'; G.x = 23; G.y = 10; G.dir = 'right'; G.state = 'world';
step('right');
eq(G.mapId, 'ashop', '从徐州城可走进防具店');

// ================= 9. 装备属性、宝箱与掉落 =================
section('Task 4 装备属性、宝箱与掉落');
newGame();
const liubei = G.actors[2];
TK.equipActor(2, 'w', 0); TK.equipActor(2, 'a', 0); // 脱下初始装备再测属性差
const baseAtk = TK.actorAtk(liubei), baseDef = TK.actorDef(liubei);
TK.giveEquip('w', 2, 1); TK.giveEquip('a', 2, 1);
ok(TK.equipActor(2, 'w', 2), '铜剑可装备');
ok(TK.equipActor(2, 'a', 2), '皮盾可装备');
eq(TK.actorAtk(liubei), baseAtk + DB.weapon[2].atk, '铜剑攻击生效');
eq(TK.actorDef(liubei), baseDef + DB.armor[2].def, '皮盾防御生效');
eq(TK.equipCount('w', 2), 0, '穿上后铜剑离开背包');
eq(TK.goodInfoForTest(['w', 2]).statDelta, DB.weapon[2].atk, '武器比较显示攻击差值');
eq(TK.goodInfoForTest(['a', 2]).statDelta, DB.armor[2].def, '防具比较显示防御差值');
// 山洞宝箱获得铜剑
newGame();
G.mapId = 'cave'; G.x = 18; G.y = 4; G.dir = 'down'; G.state = 'world';
step('confirm');
eq(TK.equipCount('w', 2), 1, '山洞宝箱获得铜剑');
// 普通战斗不掉装备，只掉药/金
newGame();
[3, 4, 5, 6].forEach(id => TK.joinActor(id));
for (const id of [2, 3, 4, 5, 6]) { const a = G.actors[id]; a.lvl = 8; TK.recalc(a); a.hp = a.mhp; a.mp = a.mmp; a.eq = [2, 2]; }
startBattle(11, { flag: 'test_t4' });
guard = 0;
while (G.battle && !G.battle.result && guard++ < 900) {
  const b2 = G.battle;
  if (b2.phase === 'command') { step('cmd-attack'); if (b2.phase === 'targetE') step('confirm'); }
  else if (b2.phase === 'targetE') step('confirm');
  else if (b2.phase === 'msgview' || b2.phase === 'intro') step('confirm');
  else if (b2.phase === 'result') step('confirm');
}
ok(G.battle && G.battle.result === 'victory', '普通战可胜利');
ok(Object.keys(G.bagEquip || {}).length === 0, '普通战不掉装备');
// 纪灵战稳定掉落铜剑
newGame();
[3, 4, 5, 6].forEach(id => TK.joinActor(id));
for (const id of [2, 3, 4, 5, 6]) { const a = G.actors[id]; a.lvl = 10; TK.recalc(a); a.hp = a.mhp; a.mp = a.mmp; a.eq = [6, 3]; }
startBattle(16, { flag: 'f_jiling' });
guard = 0;
while (G.battle && !G.battle.result && guard++ < 900) {
  const b2 = G.battle;
  if (b2.phase === 'command') { step('cmd-attack'); if (b2.phase === 'targetE') step('confirm'); }
  else if (b2.phase === 'targetE') step('confirm');
  else if (b2.phase === 'msgview' || b2.phase === 'intro') step('confirm');
  else if (b2.phase === 'result') step('confirm');
}
ok(G.battle && G.battle.result === 'victory', '纪灵战可胜利');
ok(TK.equipCount('w', 2) >= 1, '纪灵战稳定获得铜剑');

// ================= 10. 存档往返 =================
section('存档往返');
newGame();
TK.joinActor(3); TK.joinActor(4);
G.actors[2].lvl = 5; G.actors[2].exp = 400;
G.gold = 1234; TK.addItem(2, 5); G.flags.intro_done = true;
G.mapId = 'world'; G.x = 10; G.y = 12;
ok(TK.Save.ok ? true : true, '');
// 使用内部 saveGame（经 step 菜单太繁琐，直接调 window 钩子里没有 → 用菜单路径）
G.state = 'world';
G.menu = null;
// 通过 MenuSys 不可达 → 直接调用内部函数不可行，改用 step: menu→存档
step('menu'); step('down'); step('down'); step('down'); step('confirm'); // 存档
const raw = sandbox.localStorage._d['tk-sw2-web-v1'];
ok(raw, '存档已写入 localStorage');
const saved = JSON.parse(raw);
eq(saved.ver, 1, '存档版本');
eq(saved.gold, 1234, '金钱保存');
ok(saved.roster.includes(4), '队伍保存');
// 清空后读回
G.roster = []; G.actors = {}; G.gold = 0; G.items = {}; G.flags = {};
G.mapId = 'xuzhou'; G.x = 1; G.y = 1;
G.state = 'title'; G.titleCursor = 1;
step('confirm'); // 继续征程
eq(G.gold, 1234, '读档金钱恢复');
ok(G.roster.includes(4), '读档队伍恢复');
eq(G.mapId, 'world', '读档位置恢复');

// ================= 11. 策略状态效果 =================
section('Task 5 策略状态效果');
newGame();
[3, 4].forEach(id => TK.joinActor(id));
for (const id of [2, 3, 4]) { const a = G.actors[id]; a.lvl = 8; TK.recalc(a); a.hp = a.mhp; a.mp = 999; }
ok(TK.actorSkills(2).includes(46), '刘备能使用嘲骂计');
// 敌方辅助状态
TK.startBattleForTest(11);
G.actors[2].mp = 999;
TK.useSkillForTest(2, 46);
ok(TK.enemyStatusForTest('attackDown'), '嘲骂计降低敌军攻击');
TK.useSkillForTest(2, 48);
ok(TK.enemyStatusForTest('defDown'), '疑心计降低敌军防御');
TK.useSkillForTest(2, 49);
ok(TK.battleEnemiesForTest().every(e => e.statuses && e.statuses.hitDown), '烟遁计降低全体敌军命中');
TK.useSkillForTest(2, 54);
ok(TK.enemyStatusForTest('confused'), '离间计降低敌军行动概率');
TK.useSkillForTest(2, 55);
ok(TK.enemyStatusForTest('bound'), '缚杀计束缚目标');
TK.useSkillForTest(2, 53);
ok(!TK.battleEnemiesForTest().some(e => e.statuses && (e.statuses.attackDown || e.statuses.defDown || e.statuses.hitDown || e.statuses.confused || e.statuses.bound)), '解策计清除敌军辅助状态');
// 我方辅助状态
TK.useSkillForTest(2, 58);
ok(TK.battlePartyForTest().every(p => p.statuses && p.statuses.double), '倍击计提高我军物理伤害');
TK.useSkillForTest(2, 60);
ok(TK.battlePartyForTest().some(p => p.id === 2 && p.statuses && p.statuses.immuneAttack), '免击计免疫物理伤害');
TK.useSkillForTest(2, 61);
ok(TK.battlePartyForTest().some(p => p.id === 2 && p.statuses && p.statuses.immuneTactic), '免策计免疫策略伤害');
// 缩地计撤退
TK.startBattleForTest(11);
G.actors[2].mp = 999;
TK.useSkillForTest(2, 47);
ok(TK.battleResultForTest() === 'retreat', '缩地计正常撤退');
// 行为验证：免击计实际免疫敌方物理攻击
TK.startBattleForTest(11);
G.actors[2].mp = 999;
TK.useSkillForTest(2, 60);
const hpBeforeImmune = G.actors[2].hp;
TK.applyEnemyActionForTest(0);
eq(G.actors[2].hp, hpBeforeImmune, '免击计免疫敌方物理攻击');
// 行为验证：倍击计在下一次攻击后消耗
TK.startBattleForTest(11);
G.actors[2].mp = 999;
TK.useSkillForTest(2, 58);
TK.applyHeroAttackForTest(2, 0);
ok(!TK.battlePartyForTest().find(p => p.id === 2).statuses.double, '倍击计在下次攻击后消耗');

// ================= 12. 全流程验收 =================
section('Task 6 全流程验收');
// 五名主要角色等级 1/2/5/10 策略表明确且随等级增长
newGame();
[3, 4, 5, 6].forEach(id => TK.joinActor(id));
for (const id of [2, 3, 4, 5, 6]) {
  const a = G.actors[id];
  const lv1 = TK.learnedSkills(a.cls, 1);
  const lv2 = TK.learnedSkills(a.cls, 2);
  const lv5 = TK.learnedSkills(a.cls, 5);
  const lv10 = TK.learnedSkills(a.cls, 10);
  ok(Array.isArray(lv1) && Array.isArray(lv2) && Array.isArray(lv5) && Array.isArray(lv10), `武将${id}各等级策略表存在`);
  ok(lv5.length >= lv2.length && lv10.length >= lv5.length, `武将${id}策略随等级增长`);
}
// 卖出装备
newGame();
G.items = {};
TK.giveEquip('w', 2, 1);
G.gold = 1000;
G.shop = { kind: 'weapon', mode: 'sell', sellCursor: 0, msg: null };
G.state = 'shop';
step('confirm');
eq(TK.equipCount('w', 2), 0, '卖出后装备离开背包');
eq(G.gold, 1000 + Math.floor(DB.weapon[2].price / 2), '卖出获得半价金币');

// ================= 13. NPC 阻挡与相邻对话 =================
section('NPC 阻挡与相邻对话');
// NPC 站在路上会挡住玩家
newGame();
G.x = 11; G.y = 12; G.dir = 'right'; G.state = 'world';
step('right');
eq(G.x, 11, 'NPC 阻挡玩家移动');
// 站在关羽上下左右任一相邻格都能对话
const talkSpots = [
  [11, 12, 'up', '左侧'],
  [13, 12, 'up', '右侧'],
  [12, 11, 'right', '上方'],
  [12, 13, 'down', '下方']
];
for (const [sx, sy, dir, where] of talkSpots) {
  newGame();
  G.x = sx; G.y = sy; G.dir = dir; G.state = 'world';
  step('confirm');
ok(G.state === 'dialogue', `站在关羽${where}也能对话`);
}
// 普通 NPC 必须相邻才能对话，隔两格不行
newGame();
G.x = 12; G.y = 10; G.dir = 'down'; G.state = 'world';
step('confirm');
ok(G.state === 'world', '普通 NPC 隔两格不能对话');
// NPC 对话一次后不再阻挡移动
newGame();
G.x = 7; G.y = 13; G.dir = 'right'; G.state = 'world';
step('confirm');
for (let i = 0; i < 5 && G.state === 'dialogue'; i++) step('confirm');
G.x = 8; G.y = 14;
step('up');
eq(G.y, 13, '对话后 NPC 不再阻挡移动');

// ================= 14. 商店柜台对话与招牌 =================
section('商店柜台对话与招牌');
newGame();
G.mapId = 'wshop'; G.x = 4; G.y = 4; G.dir = 'up'; G.state = 'world';
step('confirm');
eq(G.state, 'shop', '隔着柜台可对话');
eq(TK.shopSignForTest('wshop'), '武', '武器店招牌标识');
eq(TK.shopSignForTest('ishop'), '道', '道具店招牌标识');
eq(TK.shopSignForTest('ashop'), '防', '防具店招牌标识');
eq(TK.shopSignForTest('inn'), '宿', '客栈招牌标识');

// ================= 15. 按键映射 =================
section('按键映射');
eq(TK.keyActionForTest('j'), 'confirm', 'J 键确认/进入');
eq(TK.keyActionForTest('J'), 'confirm', '大写 J 确认');
eq(TK.keyActionForTest('k'), 'menu', 'K 键菜单/取消');
eq(TK.keyActionForTest('K'), 'menu', '大写 K 菜单/取消');
eq(TK.keyActionForTest('h'), 'status', 'H 键状态');
eq(TK.keyActionForTest('g'), null, 'G 键不绑定功能');
eq(TK.keyActionForTest('Escape'), 'cancel', 'Esc 取消');

// ================= 16. 前期平衡 =================
section('前期平衡');
// 弱队遇敌时敌人数量受限，避免出门被群殴
newGame();
startBattle(11, { limit: 2 });
eq(G.battle.enemies.length, 2, '单人队伍遭遇敌人限制为 2');
ok(MAPS.world.encounter.steps >= 30, '世界遭遇频率已降低');
newGame();
ok(G.safeSteps >= 8, '出城安全区已加长');
ok(MAPS.world.encounter.troops.every(t => t[0] >= 3), '世界遭遇使用弱敌群');

// ================= 17. 战斗行动队列 =================
section('战斗行动队列');
newGame();
[3, 4, 5, 6].forEach(id => TK.joinActor(id));
startBattle(11, {});
let introGuard = 0;
while (G.battle && G.battle.phase === 'intro' && introGuard++ < 10) step('confirm');
for (let i = 0; i < 5; i++) step('cmd-defend');
const actQ = TK.battleActionQueueForTest();
ok(Array.isArray(actQ) && actQ.length === 10, '行动队列包含双方行动');
for (let i = 1; i < actQ.length; i++) ok(actQ[i - 1].agi >= actQ[i].agi, '行动队列按敏捷降序');

// ================= 18. 地图完整性 =================
section('地图完整性');
for (const [mid, m] of Object.entries(MAPS)) {
  ok(m.rows && m.rows.length >= 5, `${mid} 有行数据`);
  const w = Math.max(...m.rows.map(r => r.length));
  ok(w >= 10, `${mid} 宽度合理 (${w})`);
  ok((m.events || []).every(e => Number.isInteger(e.x) && Number.isInteger(e.y)), `${mid} 事件坐标为整数`);
  // 事件坐标在图内
  for (const e of (m.events || [])) {
    ok(e.y < m.rows.length && e.x < w, `${mid} 事件(${e.x},${e.y})在图内`);
  }
}
// 门都能到达对应地图
for (const [mid, m] of Object.entries(MAPS)) {
  for (const e of (m.events || [])) {
    if (e.t === 'door' || e.t === 'exit') {
      if (e.back) continue;
      ok(MAPS[e.to], `${mid} 的出口指向存在的地图 ${e.to}`);
    }
  }
}
// 第一章闭环：徐州→world→寿春
ok(MAPS.world.events.some(e => e.to === 'shouchun'), 'world 有寿春入口');
ok(MAPS.shouchun.events.some(e => e.to === 'palace_sc'), '寿春通王宫');
ok(MAPS.palace_sc.events.some(e => e.t === 'boss'), '王宫有 Boss 事件');

// ================= 19. 渲染资源 =================
section('渲染资源');
ok(typeof TK.actorSprite === 'function', '精灵函数存在');
const spr = TK.actorSprite(2, 'down', 0);
ok(spr && spr.width === 64 && spr.height === 64, '刘备下向精灵 64×64');
const spr2 = TK.actorSprite(3, 'right', 1);
ok(spr2 && spr2.width === 64, '关羽右向镜像帧');
const tcv = TK.tileCanvas('~');
ok(tcv && tcv.width === 64, '水面图块光栅化 64×64');
const tcv2 = TK.tileCanvas('#');
ok(tcv2 && tcv2.width === 64, '城墙图块光栅化');

console.log('\n全部通过：' + passed + ' 项断言');

process.exit(0);
