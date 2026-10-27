/* ============================================================
 * TnDT Engine - preview.js
 * 开发试玩中心：完整章节节点、现场快照和快速复现
 * 仅通过 ?debug=1 或 ?preview=... 启用，不污染正常存档。
 * ============================================================ */
"use strict";

T.Preview = {
  enabled: false,
  liveKey: "tndt_preview_live",
  nodes: [
    { id: "ch1-start", chapter: 1, stage: 5, title: "第一章 · 徐州出发", desc: "初始队伍、徐州城和第一章探索", mapId: 27, x: 11, y: 27, party: [2, 3, 4, 5, 6], level: 3, gold: 1200 },
    { id: "ch1-boss", chapter: 1, stage: 40, title: "第一章 · 袁术最终战前", desc: "寿春山洞北端，直接检查最终战和胜利回传", mapId: 31, eventId: 1, party: [2, 3, 4, 5, 6], level: 6, gold: 2400 },
    { id: "ch1-close", chapter: 1, stage: 65, title: "第一章收尾 · 郑玄居", desc: "检查郑玄修书、关键道具和投奔袁绍入口", mapId: 170, eventId: 3, party: [2, 3, 4, 5, 6], level: 8, gold: 3200, items: [27] },
    { id: "ch2-start", chapter: 2, stage: 80, title: "第二章 · 冀州城", desc: "袁绍授令、颜良文丑和河北路线", mapId: 32, eventId: 13, party: [2, 3, 4, 5, 6], level: 12, gold: 6000, items: [28] },
    { id: "ch2-gate", chapter: 2, stage: 150, title: "第二章 · 五关前", desc: "关羽线、连续战和关卡事件", mapId: 50, eventId: 1, party: [2, 3, 4, 5, 6], level: 15, gold: 9000, items: [28] },
    { id: "ch2-ancient", chapter: 2, stage: 260, title: "第二章收束 · 古城聚义", desc: "赵云、张飞和古城聚义后的队伍状态", mapId: 33, eventId: 12, party: [2, 3, 4, 5, 6, 7, 8], level: 20, gold: 12000, items: [28] },
    { id: "ch3-start", chapter: 3, stage: 260, title: "第三章 · 荆州城", desc: "刘表、新野和水镜先生路线", mapId: 57, eventId: 11, party: [2, 4, 5, 6, 7, 8], level: 20, gold: 14000, items: [37] },
    { id: "ch3-wolong", chapter: 3, stage: 350, title: "第三章 · 三顾茅庐", desc: "卧龙岗和诸葛亮入队前后事件", mapId: 62, eventId: 1, party: [2, 4, 5, 6, 7, 8], level: 24, gold: 18000, items: [37] },
    { id: "ch3-battle", chapter: 3, stage: 430, title: "第三章 · 博望坡连战", desc: "连续战、总攻、战斗事件回传", mapId: 66, eventId: 8, party: [2, 4, 5, 6, 7, 8], level: 27, gold: 22000, items: [37, 38] },
    { id: "ch4-start", chapter: 4, stage: 470, title: "第四章 · 江夏", desc: "赤壁前的火药、秘法书和水路", mapId: 68, eventId: 12, party: [2, 4, 5, 6, 7, 8], level: 30, gold: 26000, items: [33, 34, 35, 36] },
    { id: "ch4-chibi", chapter: 4, stage: 650, title: "第四章 · 赤壁", desc: "赤壁事件、船队和连续战", mapId: 288, x: 104, y: 61, party: [2, 4, 5, 6, 7, 8], level: 34, gold: 32000, items: [34, 35, 36, 39] },
    { id: "ch5-start", chapter: 5, stage: 830, title: "第五章 · 成都入川", desc: "西蜀路线、临时离队和剧情招募", mapId: 133, eventId: 14, party: [2, 4, 5, 6, 7, 8], level: 40, gold: 40000, items: [41, 42, 45, 47] },
    { id: "ch5-boss", chapter: 5, stage: 1100, title: "第五章 · 雒城决战前", desc: "巴关、建宁、绵竹和雒城收束", mapId: 132, eventId: 1, party: [2, 4, 5, 6, 7, 8], level: 44, gold: 46000, items: [41, 42, 45, 47] },
    { id: "ch6-start", chapter: 6, stage: 1165, title: "第六章 · 汉中", desc: "汉中、姜维和街亭军令线", mapId: 112, eventId: 3, party: [2, 4, 5, 6, 7, 8], level: 50, gold: 56000, items: [48, 50] },
    { id: "ch6-battle", chapter: 6, stage: 1350, title: "第六章 · 街亭与陈仓", desc: "姜维入队、街亭、陈仓连续战", mapId: 140, eventId: 1, party: [2, 4, 5, 6, 7, 8], level: 55, gold: 64000, items: [48, 50, 54] },
    { id: "ch7-start", chapter: 7, stage: 1440, title: "第七章 · 鲁城北伐", desc: "黄石公、五丈原、石阵和长安", mapId: 144, eventId: 12, party: [2, 4, 5, 6, 7, 8], level: 60, gold: 76000, items: [50, 54] },
    { id: "ch7-boss", chapter: 7, stage: 1560, title: "第七章 · 洛阳决战前", desc: "石阵出口、长安和洛阳终战", mapId: 152, eventId: 18, party: [2, 4, 5, 6, 7, 8], level: 66, gold: 90000, items: [50, 54] },
    { id: "ch8-start", chapter: 8, stage: 1605, title: "第八章 · 荆州告急", desc: "荆州终局、樊城和柴桑连续战", mapId: 71, eventId: 22, party: [2, 4, 5, 6, 7, 8], level: 72, gold: 110000, items: [46, 49] },
    { id: "ch9-start", chapter: 9, stage: 1655, title: "二周目 · 秦皇陵一层", desc: "秦皇陵特别篇和跨时代决战入口", mapId: 549, eventId: 1, party: [2, 3, 4, 5, 6], level: 80, gold: 150000, items: [54, 56] },
  ],

  liveSnapshot() {
    try { return JSON.parse(localStorage.getItem(this.liveKey) || "null"); } catch (e) { return null; }
  },
  saveLive() {
    if (!T.$gameParty || !T.$gameMap) return false;
    const snap = T.captureGameSnapshot();
    snap.savedAt = Date.now();
    snap.debugLabel = `现场 · ${T.$gameSystem.currentChapterName || "当前进度"}`;
    localStorage.setItem(this.liveKey, JSON.stringify(snap));
    if (T.$gameMessage) T.$gameMessage.add("试玩现场已保存。重新打开 ?debug=1 可从‘现场快照’恢复。");
    return true;
  },
  open() {
    this.enabled = true;
    T.SceneManager.stack = [new Scene_PreviewSelector()];
  },
  nodeById(id) {
    if (id === "live") return this.liveSnapshot() ? { id: "live", title: "现场快照 · 上次保存", desc: "恢复上次按 F6 保存的完整现场", snapshot: this.liveSnapshot() } : null;
    return this.nodes.find(n => n.id === id) || null;
  },
  async launchById(id) {
    const node = this.nodeById(id) || this.nodes[0];
    if (node) await this.launch(node);
  },
  makeNodeSnapshot(node) {
    if (node.snapshot) return node.snapshot;
    T.resetGameState();
    T.ActorRegistry = {};
    T.$gameVariables.setValue(1, node.stage);
    T.$gameVariables.setValue(4, 1);
    T.$gameParty._actors = [];
    T.$gameParty._gold = node.gold || 0;
    for (const id of node.party || [2]) T.$gameParty.addActor(id);
    for (const actor of T.$gameParty.allMembers()) {
      actor.changeLevel(node.level || 1, false);
      actor.recoverAll();
      for (const item of actor.equippedItems()) if (item) T.$gameParty.gainItem(item, 1);
    }
    /* 调试节点给出足量基础物资，便于检查系统，不会进入正常存档。 */
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8]) if (T.$dataItems[id]) T.$gameParty.gainItem(T.$dataItems[id], 8);
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) if (T.$dataWeapons[id]) T.$gameParty.gainItem(T.$dataWeapons[id], 2);
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) if (T.$dataArmors[id]) T.$gameParty.gainItem(T.$dataArmors[id], 2);
    for (const id of node.items || []) if (T.$dataItems[id]) T.$gameParty.gainItem(T.$dataItems[id], 3);
    T.$gameSystem.chapterGuides = {};
    T.$gameSystem.chapter1Complete = node.stage >= 80;
    const snapshot = T.captureGameSnapshot();
    /* 生成节点时还没有地图场景，必须显式写入目标地图，否则会落到默认地图1。 */
    snapshot.mapId = node.mapId;
    snapshot.player = { x: node.x || 8, y: node.y || 8, dir: 2 };
    return snapshot;
  },
  resolveSpawn(node) {
    const map = T.$gameMap;
    const target = node.eventId && map ? map.event(node.eventId) : null;
    const wanted = target ? { x: target.x, y: target.y } : { x: node.x || 8, y: node.y || 8 };
    const candidates = target
      ? [[0, 1, 8], [0, -1, 2], [-1, 0, 6], [1, 0, 4]]
      : [[0, 0, 2], [0, 1, 8], [0, -1, 2], [-1, 0, 6], [1, 0, 4]];
    const usable = (x, y) => map.isValid(x, y) && map.isPassable(x, y, 2) &&
      !map.events.some(e => !e._erased && e.page && e.priorityType() === 1 && e.pos(x, y));
    for (const [dx, dy, dir] of candidates) if (usable(wanted.x + dx, wanted.y + dy)) return { x: wanted.x + dx, y: wanted.y + dy, dir };
    for (let radius = 1; radius < 8; radius++) {
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        if (usable(wanted.x + dx, wanted.y + dy)) return { x: wanted.x + dx, y: wanted.y + dy, dir: 2 };
      }
    }
    return { x: wanted.x, y: wanted.y, dir: 2 };
  },
  async launch(node) {
    this.enabled = true;
    const snapshot = this.makeNodeSnapshot(node);
    await T.applyGameSnapshot(snapshot);
    const pos = this.resolveSpawn(node);
    if (T.$gamePlayer) {
      T.$gamePlayer.x = pos.x; T.$gamePlayer.y = pos.y;
      T.$gamePlayer._prevX = pos.x; T.$gamePlayer._prevY = pos.y;
      T.$gamePlayer._realX = pos.x; T.$gamePlayer._realY = pos.y;
      T.$gamePlayer.setDirection(pos.dir);
    }
    if (T.$gameMap && T.$gameMap.interpreter && T.$gameMap.interpreter.clear) T.$gameMap.interpreter.clear();
    T.$gameSystem.previewNode = node.id;
  },
};

class Scene_PreviewSelector {
  constructor() {
    this.index = 0;
    this.pageSize = 7;
    this.nodes = T.Preview.nodes.slice();
    if (T.Preview.liveSnapshot()) this.nodes.unshift({ id: "live", title: "现场快照 · 上次保存", desc: "恢复上次按 F6 保存的完整现场", chapter: 0 });
    this.loading = false;
  }
  update() {
    if (this.loading) return;
    if (T.Input.repeated("down")) this.index = (this.index + 1) % this.nodes.length;
    if (T.Input.repeated("up")) this.index = (this.index - 1 + this.nodes.length) % this.nodes.length;
    if (T.Input.repeated("right")) this.index = Math.min(this.nodes.length - 1, this.index + this.pageSize);
    if (T.Input.repeated("left")) this.index = Math.max(0, this.index - this.pageSize);
    if (T.Input.triggered("cancel")) { T.SceneManager.gotoTitle(); return; }
    if (T.Input.triggered("ok")) {
      this.loading = true;
      T.AudioManager.playSe({ name: "Ok", volume: 60 });
      T.Preview.launch(this.nodes[this.index]).catch(e => { console.error(e); this.loading = false; });
    }
  }
  draw(ctx) {
    ctx.fillStyle = "#070b14"; ctx.fillRect(0, 0, T.SCREEN_W, T.SCREEN_H);
    ctx.fillStyle = "#16243b"; ctx.fillRect(0, 0, T.SCREEN_W, 58);
    ctx.font = T.fontStr(28, true); ctx.fillStyle = "#ffd24d"; ctx.textBaseline = "top";
    ctx.fillText("章节试玩中心", 24, 14);
    ctx.font = T.fontStr(16); ctx.fillStyle = "#b9c7df";
    ctx.fillText("选择节点后直接进入完整现场 · F6 保存现场 · F8 返回本页", 260, 20);
    const start = Math.floor(this.index / this.pageSize) * this.pageSize;
    const end = Math.min(this.nodes.length, start + this.pageSize);
    for (let row = start; row < end; row++) {
      const y = 76 + (row - start) * 68;
      const n = this.nodes[row];
      ctx.fillStyle = row === this.index ? "rgba(55,104,163,0.72)" : "rgba(19,31,52,0.88)";
      T.roundRect(ctx, 18, y, 468, 58, 6, true);
      if (row === this.index) { ctx.strokeStyle = "#ffd24d"; ctx.lineWidth = 2; T.roundRect(ctx, 18, y, 468, 58, 6, false, true); }
      ctx.font = T.fontStr(20, true); ctx.fillStyle = row === this.index ? "#fff2b0" : "#fff";
      ctx.fillText(n.title, 34, y + 8);
      ctx.font = T.fontStr(15); ctx.fillStyle = "#b9c7df"; ctx.fillText(n.desc, 34, y + 34);
    }
    const n = this.nodes[this.index];
    ctx.fillStyle = "rgba(19,31,52,0.92)"; T.roundRect(ctx, 510, 76, 288, 420, 6, true);
    ctx.strokeStyle = "rgba(150,180,220,0.45)"; ctx.lineWidth = 2; T.roundRect(ctx, 510, 76, 288, 420, 6, false, true);
    ctx.font = T.fontStr(22, true); ctx.fillStyle = "#ffd24d"; ctx.fillText("节点信息", 532, 98);
    ctx.font = T.fontStr(18); ctx.fillStyle = "#fff";
    const lines = n.id === "live" ? ["完整恢复上次现场", "包含剧情、地图、队伍", "兵力、物品、装备和步数"] : [
      `章节：${n.chapter || "现场"}`, `阶段：${n.stage || "当前"}`, `地图：${(T.$dataMapInfos && T.$dataMapInfos[n.mapId] && T.$dataMapInfos[n.mapId].name) || n.mapId || "现场"}`,
      `队伍：${(n.party || []).length} 人`, `等级：${n.level || "当前"}`, `金钱：${T.fmt(n.gold || 0)}`,
    ];
    lines.forEach((line, i) => ctx.fillText(line, 534, 148 + i * 36));
    ctx.font = T.fontStr(16); ctx.fillStyle = "#9fb0c9";
    ctx.fillText(`第 ${Math.floor(this.index / this.pageSize) + 1} / ${Math.ceil(this.nodes.length / this.pageSize)} 页`, 34, 568);
    ctx.fillText("↑↓ 选择   ←→ 翻页   Enter 确认   Esc 返回标题", 260, 568);
    if (this.loading) { ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, 0, T.SCREEN_W, T.SCREEN_H); ctx.fillStyle = "#fff"; ctx.font = T.fontStr(24, true); ctx.fillText("正在载入试玩现场…", 300, 300); }
  }
}

Object.assign(T, { Scene_PreviewSelector });
