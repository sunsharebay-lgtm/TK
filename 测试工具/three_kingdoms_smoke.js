#!/usr/bin/env node
/* 吞食天地Ⅱ 烟雾测试 — 覆盖所有游戏状态的边界情况 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'three-kingdoms.html'), 'utf8');
const src = html.match(/<script>\n([\s\S]*)\n  <\/script>/)[1];

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
  return { width: 0, height: 0, style: {}, getContext: () => makeCtx(), setAttribute() {}, focus() {}, addEventListener() {} };
}
const sb = {
  console, Math, JSON, performance: { now: () => Date.now() },
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: () => 0,
  document: { getElementById: () => makeCanvas(), createElement: () => makeCanvas(), querySelectorAll: () => [], addEventListener() {} },
  window: {},
  navigator: { getGamepads: () => [] },
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } },
  AudioContext: undefined, webkitAudioContext: undefined,
};
sb.window = sb;
const vm = require('vm');
const context = vm.createContext(sb);
vm.runInContext(src, context, { filename: 'smoke.js' });
const T = sb.TKGame;
const { G, DB, MAPS } = T;

let ok = 0, fail = 0;
function check(cond, msg) {
  if (cond) { ok++; }
  else { fail++; console.log('  FAIL:', msg); }
}
function safe(fn, msg) {
  try { fn(); ok++; }
  catch (e) { fail++; console.log('  CRASH:', msg, e.message); }
}

console.log('=== 烟雾测试 ===\n');

// 1. 标题画面
console.log('标题画面');
safe(() => {
  T.step('up'); T.step('down');
  T.step('confirm');
  check(G.state === 'world', 'newGame → world');
}, 'title navigation');

// 2. 世界移动边界
console.log('世界移动');
safe(() => {
  for (let i = 0; i < 20; i++) T.step('up');
  for (let i = 0; i < 20; i++) T.step('left');
  for (let i = 0; i < 20; i++) T.step('down');
  for (let i = 0; i < 20; i++) T.step('right');
  check(G.state === 'world', 'still in world after wall bumps');
}, 'wall collision');

// 3. 对话系统
console.log('对话系统');
safe(() => {
  G.x = 13; G.y = 12; G.dir = 'left';
  T.step('confirm');
  if (G.state === 'dialogue') {
    for (let i = 0; i < 20 && G.state === 'dialogue'; i++) T.step('confirm');
  }
  check(G.state === 'world', 'dialogue resolves to world');
}, 'dialogue flow');

// 4. 菜单系统
console.log('菜单系统');
safe(() => {
  T.step('menu');
  check(G.state === 'menu', 'menu opens');
  T.step('down'); T.step('down'); T.step('down'); // cursor=3 → 存档
  T.step('confirm'); // 存档
  T.step('cancel'); // 关闭
  check(G.state === 'world', 'menu closes');
  // 状态
  console.log('    pre-status: state=', G.state, 'statusView=', T.statusView);
  T.step('status');
  console.log('    post-status: state=', G.state, 'statusView=', T.statusView);
  T.step('confirm');
  check(T.statusView === null, 'status view dismissed');
}, 'menu navigation');

// 5. 商店系统
console.log('商店系统');
safe(() => {
  // 进入武器店
  G.mapId = 'xuzhou'; G.x = 5; G.y = 7; G.dir = 'up';
  T.step('confirm');
  if (G.state === 'shop') {
    check(G.shop.kind === 'weapon', 'weapon shop opens');
    G.gold = 1000;
    T.step('down'); T.step('confirm'); // buy 短剑
    check(G.gold < 1000, 'gold deducted');
    T.step('right'); // 切换到卖出
    T.step('left'); // 切回买入
    T.step('cancel'); // 退出
  }
  check(G.state === 'world', 'shop closes');
}, 'shop flow');

// 6. 客栈
console.log('客栈');
safe(() => {
  G.mapId = 'inn'; G.x = 5; G.y = 6; G.dir = 'up';
  G.state = 'world'; // reset from previous
  // 直接模拟客栈状态
  G.gold = 500;
  // 通过NPC触发 innkeeper
  G.x = 4; G.y = 7; G.dir = 'up';
  T.step('confirm');
  // 可能触发 innkeeper 或者 exit
  if (G.state === 'shop' && G.shop.kind === 'inn') {
    T.step('confirm'); // 休息
    check(G.gold < 500, 'inn costs gold');
    // 等待关闭（setTimeout触发）
  }
}, 'inn flow');

// 7. 战斗系统边界
console.log('战斗系统边界');
safe(() => {
  T.newGame();
  T.joinActor(3); T.joinActor(4); T.joinActor(5); T.joinActor(6);
  // 给强装备
  for (const id of [2,3,4]) { const a = G.actors[id]; a.lvl = 15; T.recalc(a); a.eq = [12, 5]; a.hp = a.mhp; a.mp = a.mmp; }
  for (const id of [5,6]) { const a = G.actors[id]; a.lvl = 12; T.recalc(a); a.eq = [6, 3]; a.hp = a.mhp; a.mp = a.mmp; }

  // 战斗 vs 简单敌人
  T.startBattle(11, { flag: 'smoke_test' });
  check(G.state === 'battle', 'battle starts');

  // 推进 intro
  for (let i = 0; i < 5 && G.battle.phase === 'intro'; i++) T.step('confirm');

  // 自动战斗 500 步
  let guard = 0;
  while (G.battle && !G.battle.result && guard++ < 500) {
    const b = G.battle;
    if (b.phase === 'command') T.step('cmd-attack');
    else if (b.phase === 'targetE') T.step('confirm');
    else if (b.phase === 'submenu') T.step('cancel');
    else if (b.phase === 'targetA') T.step('cancel');
    else if (b.phase === 'msgview' || b.phase === 'intro') T.step('confirm');
    else if (b.phase === 'result') T.step('confirm');
    else break; // unexpected phase
  }
  check(G.battle === null || G.battle.result !== undefined, 'battle resolves');
  if (G.battle && G.battle.result) T.step('confirm');
}, 'battle auto-resolve');

// 9. 存档往返
console.log('存档往返');
safe(() => {
  T.newGame();
  T.joinActor(3);
  G.gold = 999;
  // 通过菜单存档：3次down到"存档"，确认，然后关闭
  T.step('menu');
  T.step('down'); T.step('down'); T.step('down'); // cursor=3 → 存档
  T.step('confirm'); // 存档
  T.step('cancel'); // 关闭菜单

  // 清空状态
  G.roster = []; G.actors = {}; G.gold = 0;
  G.state = 'title'; G.titleCursor = 1;
  T.step('confirm'); // 读档
  check(G.gold === 999, 'gold restored');
  check(G.roster.length >= 1, 'roster restored');
}, 'save/load roundtrip');

// 9. 所有地图可达
console.log('地图可达性');
safe(() => {
  for (const [mid, m] of Object.entries(MAPS)) {
    check(m.rows && m.rows.length >= 5, `${mid} has rows`);
    const w = Math.max(...m.rows.map(r => r.length));
    check(w >= 10, `${mid} width ok (${w})`);
    // 所有出口指向存在的地图
    for (const e of (m.events || [])) {
      if ((e.t === 'door' || e.t === 'exit') && !e.back && e.to) {
        check(!!MAPS[e.to], `${mid}出口→${e.to} 存在`);
      }
    }
  }
}, 'map integrity');

// 10. 数据完整性
console.log('数据完整性');
safe(() => {
  check(Object.keys(DB.cls).length >= 50, 'classes >= 50');
  check(Object.keys(DB.skill).length >= 100, 'skills >= 100');
  check(Object.keys(DB.enemy).length >= 300, 'enemies >= 300');
  check(Object.keys(DB.weapon).length >= 200, 'weapons >= 200');
  check(Object.keys(DB.troop).length >= 200, 'troops >= 200');
  // 公式校验
  check(T.classStat(2, 0, 10) > 700 && T.classStat(2, 0, 10) < 800, '刘备 lv10 hp');
  check(T.tacticDamage(320, 200, 256) > 200 && T.tacticDamage(320, 200, 256) < 300, '炼火计 damage');
  check(T.physDamage(50, 30) > 50, 'physical damage');
}, 'data checks');

console.log(`\n=== 结果: ${ok} 通过, ${fail} 失败 ===`);
process.exit(fail > 0 ? 1 : 0);
