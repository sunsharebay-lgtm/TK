/* ============================================================
 * TnDT Engine - battle.js
 * 侧视战斗：指令、行动顺序、伤害公式、状态、奖励
 * ============================================================ */
"use strict";

/* 普通行动给玩家留出看清攻击者、受击者和伤害结果的时间。总攻也复用同一节奏。 */
const ACTION_APPROACH_FRAMES = 24;
const ACTION_RETURN_FRAMES = 14;

/* ---------------- 敌群 ---------------- */
class Game_Troop {
  constructor(troopId) {
    this.troopId = troopId;
    const t = T.$dataTroops[troopId] || { members: [] };
    this.members = t.members.map(m => new Game_Enemy(m.enemyId, m.x, m.y));
    this.turnCount = 0;
    this.name = t.name || "";
    this._formation = -1;   // G2-R2: 敌方阵型（CE 121-132 脚本 $gameTroop.setFormation(N)）
  }
  /* G2-R2: 敌方阵型，与 $gameParty 同构；n=-1 为无阵型（解阵/初始状态） */
  setFormation(n) { this._formation = T.clamp(n, -1, T.FORMATIONS.length - 1); return this._formation; }
  formation() { return this._formation < 0 ? null : T.FORMATIONS[this._formation]; }
  formationName() { const f = this.formation(); return f ? f.name : ""; }
  aliveMembers() { return this.members.filter(m => !m.isDead() && m.appearOk()); }
  isAllDead() { return this.aliveMembers().length === 0; }
  expTotal() { return this.members.reduce((s, m) => s + m.expValue, 0); }
  goldTotal() {
    let g = this.members.reduce((s, m) => s + m.gold, 0);
    if ($gameParty.goldDouble()) g *= 2;
    return g;
  }
  makeDropItems() {
    const drops = [];
    for (const m of this.members) drops.push(...m.makeDropItems());
    return drops;
  }
}

/* ---------------- 战斗场景 ---------------- */
class Scene_Battle {
  constructor(request, interpreter) {
    this.req = request;
    this.interpreterRef = interpreter;
    this.troop = new Game_Troop(request.troopId);
    /* G3-R4: 敌群事件页执行记录（每页一次） */
    this._battleEventsDone = new Set();
    /* G2-R2: 战斗期绑定 $gameTroop（此前恒为 null，敌方阵型脚本 $gameTroop.setFormation 必然抛错被吞） */
    T.$gameTroop = this.troop;
    this.phase = "intro";
    this.phaseTimer = 30;
    this.logLines = [];
    this.logDirty = true;
    this.subject = null;
    this.turnOrder = [];
    this.actionIndex = 0;
    this.animQueue = [];
    this.battlebackNames = {
      bb1: T.$gameMap.battleback1Name || T.$dataSystem.battleback1Name || "",
      bb2: T.$gameMap.battleback2Name || T.$dataSystem.battleback2Name || "",
    };
    T.BattleScene = this;
    /* 我方出战成员 */
    this.partyMembers = $gameParty.battleMembers().filter(a => !a.isDead());
    for (const a of this.partyMembers) a.onBattleStart();
    for (const e of this.troop.aliveMembers()) e.onBattleStart();
    this.partyBarRefHp = Math.max(1, ...this.partyMembers.map(a => a.hp));
    this.enemyBarRefHp = Math.max(1, ...this.troop.members.map(e => e.hp));
    /* 敌人精灵图 */
    this.enemySprites = new Map();
    this.actorSprites = new Map();
    this._loadSprites();
    /* 窗口 */
    this.helpWin = new Window_Base(T.SCREEN_W / 2 - 150, 54, 300, 46);
    this.helpWin.fontSize = 22;
    this.cmdWin = new Window_Selectable(T.SCREEN_W - 352, T.SCREEN_H - 228, 344, 220);
    this.cmdWin.fontSize = 20;
    this.cmdWin.lineHeight = 26;
    this.logWin = new Window_Base(12, T.SCREEN_H - 132, 440, 116);
    this.logWin.fontSize = 20;
    this.logWin.lineHeight = 28;
    this.targetIdx = 0;
    this.selectMode = "";   // "" | target-enemy | target-ally | skill | item | skilltype
    this.skillWin = new Window_Selectable(12, T.SCREEN_H - 232, 560, 190);
    this.skillWin.fontSize = 20;
    this.skillWin.lineHeight = 26;
    this.itemWin = new Window_Selectable(12, T.SCREEN_H - 232, 560, 190);
    this.itemWin.fontSize = 20;
    this.itemWin.lineHeight = 26;
    this.bgmBackupName = null;
    this.roundLabel = null;
    this.roundLabelY = 0;
    this.actionVisual = null;
    this._actionFxLeft = 0;
    this.actionSeq = null;
    this._actionAdvance = 0;
    this.lastPopups = [];
    this.totalAssaultActive = false;
    this._stopTotalAssault = false;
    this.messageActor = null;
  }
  async _loadSprites() {
    for (const en of this.troop.members) {
      const info = en.battlerImage();
      const img = info.type === "char"
        ? await T.loadCharImg("$" + info.name)
        : await T.ImageManager.enemy(info.name);
      this.enemySprites.set(en, img);
    }
    for (const a of this.partyMembers) {
      const img = await T.loadCharImg("$" + a.svBattlerName());
      this.actorSprites.set(a, img);
      T.loadFace(a.faceName);
    }
  }
  /* ---- 坐标 ---- */
  actorPos(a, iOffset = 0) {
    const idx = this.partyMembers.indexOf(a);
    return { x: 430, y: 64 + idx * 72 + iOffset };
  }
  enemyScreenPos(e) {
    const idx = this.troop.members.indexOf(e);
    return { x: 520, y: 64 + idx * 64 };
  }

  update() {
    if (this.totalAssaultActive && !this._stopTotalAssault &&
        !["intro", "actor-cmd", "select-skill", "select-item", "select-target", "enemy-info", "victory", "defeat", "escaped"].includes(this.phase)) {
      if (T.Input.triggered("cancel")) {
        this._stopTotalAssault = true;
        this.say("总攻将在本回合结束后停止");
        T.AudioManager.playSe({ name: "Cancel", volume: 50 });
      }
    }
    if (this.lastPopups.length) {
      this.lastPopups = this.lastPopups.filter(p => --p.t > 0);
    }
    switch (this.phase) {
      case "intro":
        if (--this.phaseTimer <= 0) this.startRound();
        break;
      case "party-cmd": this.updatePartyCmd(); break;
      case "actor-cmd": this.updateActorCmd(); break;
      case "select-skilltype": this.updateSkillType(); break;
      case "select-skill": this.updateSkillList(); break;
      case "select-item": this.updateItemList(); break;
      case "select-target": this.updateTarget(); break;
      case "enemy-info": this.updateEnemyInfo(); break;
      case "action": this.updateActionSeq(); break;
      case "resolve": this.resolveNext(); break;
      case "victory": case "defeat": case "escaped":
        if (--this.phaseTimer <= 0) this.finish();
        break;
      case "anim":
        this.animQueue.shift()();
        if (!this.animQueue.length) this.afterAction();
        break;
    }
  }

  say(line) { this.logLines.push(line); this.logDirty = true; }

  /* G3-R9: 构建回合行动顺序——按 numActions()(攻击次数 trait 34)重复插入多动战斗者。
     数据：陈兰/李蒙/宋宪/张允/黄忠/李湛/候选/李严/曹休/高览/满宠/曹植/韩当/丁奉/李广/泥弓 等 22 个×2 动，
     ACTION_PLUS(61) 秦始皇/王皇帝/田丰/秘将军/幻钟王 追加行动。 */
  buildTurnOrder() {
    const all = [...this.partyMembers.filter(a => !a.isDead()), ...this.troop.aliveMembers()];
    for (const b of all) b.makeSpeed();
    const order = [];
    for (const b of all.slice().sort((x, y) => y.turnAddSpeed - x.turnAddSpeed)) {
      const n = Math.max(1, Math.round((b.numActions ? b.numActions() : 1) + (b.actionPlusSet ? b.actionPlusSet().reduce((s, v) => s + Math.max(0, v), 0) : 0)));
      for (let i = 0; i < n; i++) order.push(b);
    }
    return order;
  }
  startRound() {
    this.roundActions = [];
    this.turnOrder = this.buildTurnOrder();
    this.actionIndex = 0;
    this.phase = "party-cmd";
    this.currentActor = this.partyMembers.find(a => !a.isDead());
    this.cmdIndex = 0;
    this.roundLabel = { text: `回合 ${this.troop.turnCount + 1}` };
    this.roundLabelY = 8;
    this.say(`回合 ${this.troop.turnCount + 1}`);
    /* G3-R4: 敌群战斗事件页（回合起触发；事件消灭全部敌人时直接胜利） */
    this.runTroopEvents();
    if (this.troop.isAllDead()) this.processVictory();
  }

  updatePartyCmd() {
    // 简化：直接进入角色指令
    this.phase = "actor-cmd";
  }
  updateActorCmd() {
    const a = this.currentActor;
    if (!a || a.isDead()) { this.nextActorOrResolve(); return; }
    if (this.cmds == null || this._cmdsFor !== a) {
      this.cmds = ["攻击", "总攻", "计策", "兵法", "阵型", "歌唱", "奥义", "防御", "道具", "情报", "逃跑"]; /* G1: 补歌唱战斗指令（skillTypes 含歌唱45技） */
      this._cmdsFor = a;
      this.cmdIndex = 0;
    }
    const avail = this.cmds.map((c, i) => [c, i]).filter(([c]) => {
      if (c === "防御" || c === "攻击" || c === "道具") return true;
      if (c === "逃跑") return this.req.canEscape !== false;
      if (c === "总攻" || c === "情报") return true;
      const stypeId = T.$dataSystem.skillTypes.indexOf(c);
      if (stypeId < 0) return false;
      return a.usableSkills(stypeId).length > 0;
    });
    if (this.cmdIndex >= avail.length) this.cmdIndex = Math.max(0, avail.length - 1);
    /* 双列指令：左右在同排移动，上下跨行；攻击 → 右 → 总攻 */
    if (T.Input.repeated("right")) this.cmdIndex = (this.cmdIndex + 1) % avail.length;
    if (T.Input.repeated("left")) this.cmdIndex = (this.cmdIndex - 1 + avail.length) % avail.length;
    if (T.Input.repeated("down")) this.cmdIndex = (this.cmdIndex + 2) % avail.length;
    if (T.Input.repeated("up")) this.cmdIndex = (this.cmdIndex - 2 + avail.length) % avail.length;
    const sel = avail[this.cmdIndex];
    if (T.Input.triggered("ok")) {
      if (!sel) return;
      T.AudioManager.playSe({ name: "Cursor", volume: 60 });
      const name = sel[0];
      if (name === "逃跑") { this.tryEscape(); return; }
      if (name === "攻击") { a._pendingAction = { kind: "attack" }; this.beginSelectTargetEnemy(); }
      else if (name === "防御") { a._pendingAction = { kind: "guard" }; this.nextActorOrResolve(); }
      else if (name === "道具") { this.phase = "select-item"; this.itemList = $gameParty.allItems().filter(i => T.$dataItems.includes(i)); this.itemWin.index = 0; this.itemWin.itemMax = this.itemList.length; }
      else if (name === "总攻") { this.doTotalAssault(); return; }
      else if (name === "情报") { this.phase = "enemy-info"; this.targets = this.troop.aliveMembers(); this.targetIdx = 0; return; }
      else {
        const stypeId = T.$dataSystem.skillTypes.indexOf(name);
        this.pendingStype = stypeId;
        this.phase = "select-skill";
        this.skillList = a.usableSkills(stypeId);
        this.skillWin.itemMax = this.skillList.length;
        this.skillWin.index = 0;
      }
    } else if (T.Input.triggered("cancel")) {
      // 返回上一名角色
    }
  }
  updateSkillType() {}
  beginSelectTargetEnemy() {
    this.selectMode = "target-enemy";
    this._targetDead = false;
    const alive = this.troop.aliveMembers();
    this.targets = alive;
    this.targetIdx = 0;
    this.phase = "select-target";
  }
  beginSelectTargetAlly(forItem, scope = 7) {
    this.selectMode = "target-ally";
    this._targetDead = [9, 10].includes(scope);
    this.targets = this._targetDead ? this.partyMembers.filter(a => a.isDead()) : this.partyMembers.filter(a => !a.isDead());
    this.targetIdx = 0;
    this._targetForItem = !!forItem;
    this.phase = "select-target";
  }
  tryEscape() {
    const partyAgi = this.partyMembers.reduce((s, a) => s + (a.isDead() ? 0 : a.agi), 0);
    const troopAgi = this.troop.aliveMembers().reduce((s, e) => s + e.agi, 0) || 1;
    const chance = Math.max(0.05, Math.min(1, 0.5 + (partyAgi - troopAgi) / troopAgi * 0.5));
    if (Math.random() < chance) {
      T.AudioManager.playSe({ name: "Escape1", volume: 80 });
      this.phase = "escaped"; this.phaseTimer = 60;
      this.say("成功逃跑了！");
    } else {
      T.AudioManager.playSe({ name: "Buzzer", volume: 60 });
      this.say("逃跑失败了！");
      this.phase = "resolve";   // 消耗当前回合
    }
  }
  updateEnemyInfo() {
    const n = this.targets.length;
    if (!n) { this.phase = "actor-cmd"; this._cmdsFor = null; return; }
    if (T.Input.repeated("up") || T.Input.repeated("left")) this.targetIdx = (this.targetIdx - 1 + n) % n;
    if (T.Input.repeated("down") || T.Input.repeated("right")) this.targetIdx = (this.targetIdx + 1) % n;
    if (T.Input.triggered("cancel") || T.Input.triggered("ok")) {
      this.phase = "actor-cmd";
      this._cmdsFor = null;
    }
  }
  doTotalAssault() {
    this.totalAssaultActive = true;
    this._stopTotalAssault = false;
    this.say("总攻！");
    this.issueTotalAssaultActions();
    this.phase = "resolve";
    this._cmdsFor = null;
  }
  issueTotalAssaultActions() {
    const all = [...this.partyMembers.filter(a => !a.isDead()), ...this.troop.aliveMembers()];
    for (const b of all) b.makeSpeed();
    this.turnOrder = all.slice().sort((x, y) => y.turnAddSpeed - x.turnAddSpeed);
    this.actionIndex = 0;
    for (const ac of this.partyMembers.filter(m => !m.isDead())) {
      ac.setAction(0, T.$dataSkills[1], -1);
      ac._guarding = false;
      ac._actions[0].target = this.pickRandomAliveEnemy();
    }
  }
  updateSkillList() {
    this.skillWin.updateInput();
    if (T.Input.triggered("cancel")) { this.phase = "actor-cmd"; return; }
    if (T.Input.triggered("ok")) {
      const s = this.skillList[this.skillWin.index];
      if (!s) return;
      if (T.skillCost(s) > this.currentActor.mp) { T.AudioManager.playSe({ name: "Buzzer", volume: 50 }); return; }
      this.currentActor._pendingAction = { kind: "skill", skill: s };
      const scope = s.scope ?? s.damage?.scope;
      if ([1, 2, 3, 4, 5, 6].includes(scope)) this.beginSelectTargetEnemy(); // 敌方目标
      else if ([7, 9, 12, 14].includes(scope)) this.beginSelectTargetAlly(false, scope); // 我方单体/阵亡目标
      else this.confirmActorAction();                                      // 全体/自身
    }
  }
  updateItemList() {
    this.itemWin.updateInput();
    if (T.Input.triggered("cancel")) { this.phase = "actor-cmd"; return; }
    if (T.Input.triggered("ok")) {
      const it = this.itemList[this.itemWin.index];
      if (!it || !$gameParty.hasItem(it)) return;
      this.currentActor._pendingAction = { kind: "item", item: it };
      const scope = it.scope ?? it.damage?.scope;
      if ([7, 9, 12, 14].includes(scope)) this.beginSelectTargetAlly(true, scope);
      else if ([1, 2, 3, 4, 5, 6].includes(scope)) this.beginSelectTargetEnemy();
      else this.confirmActorAction();
    }
  }
  updateTarget() {
    const n = this.targets.length;
    if (!n) {
      this.say(this._targetDead ? "没有可用的阵亡武将。" : "没有可用的目标。");
      this.phase = "actor-cmd";
      this._cmdsFor = null;
      return;
    }
    if (T.Input.repeated("up") || T.Input.repeated("left")) this.targetIdx = (this.targetIdx - 1 + n) % n;
    if (T.Input.repeated("down") || T.Input.repeated("right")) this.targetIdx = (this.targetIdx + 1) % n;
    if (T.Input.triggered("cancel")) { this.phase = "actor-cmd"; return; }
    if (T.Input.triggered("ok")) {
      const act = this.currentActor._pendingAction;
      act.target = this.targets[this.targetIdx];
      this.confirmActorAction();
    }
  }
  confirmActorAction() {
    const a = this.currentActor;
    a.setAction(0, a._pendingAction.kind === "attack" ? T.$dataSkills[1] :
      a._pendingAction.kind === "skill" ? a._pendingAction.skill :
      a._pendingAction.kind === "item" ? a._pendingAction.item : null,
      -1);
    if (a._actions[0]) a._actions[0].target = a._pendingAction.target;
    a._guarding = a._pendingAction.kind === "guard";
    this.nextActorOrResolve();
  }
  nextActorOrResolve() {
    const idx = this.partyMembers.indexOf(this.currentActor);
    const next = this.partyMembers.slice(idx + 1).find(a => !a.isDead());
    if (next) { this.currentActor = next; this._cmdsFor = null; this.phase = "actor-cmd"; }
    else { this.phase = "resolve"; this._cmdsFor = null; }
  }

  /* ---- 行动结算 ---- */
  resolveNext() {
    if (this.animQueue.length) return;
    if (this._actionFxLeft > 0) { this._actionFxLeft--; return; }
    while (this.actionIndex < this.turnOrder.length) {
      const b = this.turnOrder[this.actionIndex++];
      if (b.isDead() || !b.appearOk()) continue;
      this.subject = b;
      this.actionSeq = { user: b, t: 0, applied: false };
      this.phase = "action";
      return;
    }
    // 回合结束
    this.troop.turnCount++;
    for (const b of [...this.partyMembers, ...this.troop.members]) b.onTurnEnd();
    if ($gameParty.isAllDead()) { this.phase = "defeat"; this.phaseTimer = 90; return; }
    if (this.troop.isAllDead()) { this.processVictory(); return; }
    if (this.totalAssaultActive && !this._stopTotalAssault) {
      this.issueTotalAssaultActions();
      this.phase = "resolve";
      return;
    }
    if (this.totalAssaultActive && this._stopTotalAssault) {
      this.totalAssaultActive = false;
      this._stopTotalAssault = false;
      this.say("总攻结束");
    }
    this.startRound();
  }
  updateActionSeq() {
    const seq = this.actionSeq;
    if (!seq) { this.phase = "resolve"; return; }
    seq.t++;
    const b = seq.user;
    const timing = this.actionTiming();
    const approachFrames = timing.approach;
    const returnFrames = timing.return;
    if (this.actionVisual && this.actionVisual.hitT > 0) this.actionVisual.hitT--;
    if (!seq.applied) {
      this._actionAdvance = Math.min(1, seq.t / approachFrames);
      this._actionUser = b;
      if (seq.t >= approachFrames) {
        seq.applied = true; seq.t = 0;
        this.subject = b;
        if (b.isActor && b.isActor()) this.doActorAction(b);
        else this.doEnemyAction(b);
        if (this.animQueue.length) { const fn = this.animQueue.shift(); fn(); }
        if (this.phase === "anim") this.phase = "action";
        if (this._EscapeGuard) { this._EscapeGuard = false; this.phase = "escaped"; this.phaseTimer = 45; return; }
        if (this.actionVisual) this.actionVisual.hitT = this.totalAssaultActive ? 8 : 16;
        this._actionFxLeft = this.totalAssaultActive ? 6 : 12;
      }
    } else {
      this._actionAdvance = Math.max(0, 1 - seq.t / returnFrames);
      if (seq.t >= returnFrames) {
        this.actionSeq = null;
        this._actionUser = null;
        this._actionAdvance = 0;
        this.phase = "resolve";
      }
    }
  }
  doActorAction(a) {
    this.messageActor = a;
    const act = a._actions[0];
    const item = act && act.item;
    if (!item) { if (a._guarding) { this.say(`${a.name} 摆出了防御态势。`); } return; }
    if (item.id === 1) {                       // 普通攻击
      const t = act.target && !act.target.isDead() ? act.target : this.pickRandomAliveEnemy();
      if (!t) return;
      this.actionVisual = { user: a, target: t, hitT: 0 };
      this.applyItem(a, T.$dataSkills[1], t);
    } else if (T.$dataSkills.includes(item)) {
      const scope = item.scope ?? item.damage?.scope;
      const targetOk = act.target && ([9, 10].includes(scope) ? act.target.isDead() : !act.target.isDead());
      const t = targetOk ? act.target : this.defaultTargetFor(item, a);
      if (!t) return;
      this.actionVisual = { user: a, target: t, hitT: 0 };
      a.paySkillCost(item);
      this.applyItem(a, item, t);
    } else if (T.$dataItems.includes(item)) {
      const scope = item.scope ?? item.damage?.scope;
      const targetOk = act.target && ([9, 10].includes(scope) ? act.target.isDead() : !act.target.isDead());
      const t = targetOk ? act.target : a;
      this.actionVisual = { user: a, target: t, hitT: 0 };
      $gameParty.consumeItem(item);
      this.applyItem(a, item, t);
    }
  }
  doEnemyAction(e) {
    this.messageActor = null;
    const act = this.selectEnemyAction(e);
    if (!act) return;
    const item = act.itemId ? T.$dataItems[act.itemId] : T.$dataSkills[act.skillId];
    if (!item) {
      // 普通攻击
      const t = this.pickRandomAliveActor();
      if (t) { this.actionVisual = { user: e, target: t, hitT: 0 }; this.applyAttack(e, t); }
      return;
    }
    const t = this.defaultTargetFor(item, e);
    if (!t) return;
    if (act.itemId) e.consumeItem(item);
    else e.mp -= T.skillCost(item);
    this.actionVisual = { user: e, target: t, hitT: 0 };
    this.applyItem(e, item, t);
    if (act.itemId) {
      this.say(`${e.name} 剩余${item.name} ×${e.itemCount(item)}`);
      if (e.itemCount(item) <= 0) this.say(`${e.name} 的${item.name}用完了！`);
    } else if (item.mpCost || item.damage?.type === 4) {
      this.say(`${e.name} 剩余谋点 ${e.mp}/${e.mmp}`);
      if (e.mp <= 0) this.say(`${e.name} 的谋略点耗尽了！`);
    }
  }
  selectEnemyAction(e) {
    const acts = e.actions.filter(a => this.checkActionCondition(e, a) && this.enemyActionUsable(e, a));
    if (!acts.length) return { skillId: 1 };
    const attacks = acts.filter(a => !a.itemId && a.skillId === 1);
    const tactics = acts.filter(a => a.itemId || a.skillId !== 1);
    if (attacks.length && tactics.length && Math.random() >= this.enemyTacticRate(e)) return this.weightedEnemyAction(attacks);
    return this.weightedEnemyAction(tactics.length ? tactics : attacks);
  }
  weightedEnemyAction(acts) {
    const total = acts.reduce((s, a) => s + (a.rating || 5), 0);
    let roll = Math.random() * total;
    for (const a of acts) { roll -= a.rating || 5; if (roll < 0) return a; }
    return acts[acts.length - 1];
  }
  enemyActionUsable(e, action) {
    if (action.itemId) return e.itemCount(T.$dataItems[action.itemId]) > 0;
    const skill = T.$dataSkills[action.skillId];
    if (!skill || skill.damage?.type === 4) return false;
    return e.mp >= T.skillCost(skill);
  }
  enemyTacticRate(e) {
    return T.clamp((T.ENEMY_TACTIC_RATE_MIN || 0.1) + e.mat / 600,
      T.ENEMY_TACTIC_RATE_MIN || 0.1, T.ENEMY_TACTIC_RATE_MAX || 0.42);
  }
  enemyHealValue(user, item, target) {
    if (item.id === 96 || item.name === "完复计") return Math.max(0, target.mhp - target.hp);
    const baseBySkill = { 93: 100, 94: 200, 95: 400, 97: 800, 98: 1600 };
    const base = baseBySkill[item.id] || 100;
    return Math.min(Math.max(0, target.mhp - target.hp), Math.round(base * (1 + user.mat / 500)));
  }
  enemyDamageValue(user, item, target) {
    const formula = String(item.damage && item.damage.formula || "").replace(/\ba\.mmp\b/g, "a.mat");
    return T.evalFormula(formula, user, target);
  }
  checkActionCondition(e, a) {
    const hpRate = e.hp / e.mhp;
    switch (a.conditionType) {
      case 0: return true;
      case 1: return hpRate >= (a.conditionParam1 || 0) / 100;
      /* G3-R9: 比例条件纳入 param2（数据实证：type2 290条 param2=0.5 低血回复计，
         type3 290条 param2=0.2 低蓝回蓝计；引擎此前忽略 param2 导致敌人满血乱放回复/回蓝永远可用）。
         阈值取 param2>0 优先，回退 param1/100；param1=0 无 param2 → 恒真（兼容旧行为）。 */
      case 2: {
        const thr = (a.conditionParam2 > 0) ? a.conditionParam2 : (a.conditionParam1 || 100) / 100;
        return hpRate <= thr;
      }
      case 3: {
        const mpRate = e.mmp > 0 ? e.mp / e.mmp : 0;
        const thr = (a.conditionParam2 > 0) ? a.conditionParam2 : (a.conditionParam1 || 100) / 100;
        return mpRate <= thr;
      }
      case 4: return e.isStateAffected(a.conditionParam1);
      case 5: return $gameParty.highestLevel() >= a.conditionParam1;
      case 6: return T.$gameSwitches.value(a.conditionParam1);
      default: return false;
    }
  }
  defaultTargetFor(item, user = this.subject) {
    const scope = item.scope ?? item.damage?.scope;
    const enemyUser = !!(user && user.isActor && !user.isActor());
    if ([7, 8, 12, 13, 14].includes(scope)) {
      if (enemyUser) return user.isDead() ? null : user;
      const alive = this.partyMembers.filter(a => !a.isDead());
      return alive.length ? alive[T.rand(alive.length)] : this.partyMembers[0];
    }
    if ([9, 10].includes(scope)) {
      const dead = enemyUser ? this.troop.members.filter(e => e.isDead()) : this.partyMembers.filter(a => a.isDead());
      return dead[T.rand(dead.length)] || null;
    }
    if ([1, 2, 3, 4, 5, 6].includes(scope)) return enemyUser ? this.pickRandomAliveActor() : this.pickRandomAliveEnemy();
    return this.subject;
  }
  pickRandomAliveEnemy() { const l = this.troop.aliveMembers(); return l[T.rand(l.length)] || null; }
  pickRandomAliveActor() { const l = this.partyMembers.filter(a => !a.isDead()); return l[T.rand(l.length)] || null; }
  /* 战斗事件引用敌人：按 troop.members 下标返回 */
  enemyAt(index) { return this.troop.members[index] || null; }

  applyAttack(user, target) { this.applyItem(user, T.$dataSkills[1], target); }

  applyItem(user, item, target) {
    const targets = this.expandTargets(item, target, user);
    const dmg = item.damage || {};
    for (const t of targets) this.applyToBattler(user, item, t);
    for (const t of targets) this.pushResultPopup(t);
    /* 动画与日志 */
    this.enqueueAnim(() => {
      if (dmg.type > 0) {
        T.AudioManager.playSe({ name: "Damage1", volume: 70 });
      }
    }, targets);
    if (item.message1) this.say(item.message1.replace("%1", user.name).replace("%2", item.name));
    /* 结算后检查 */
    if ($gameParty.isAllDead()) { this.phase = "defeat"; this.phaseTimer = 120; }
    else if (this.troop.isAllDead()) this.processVictory();
  }
  pushResultPopup(t) {
    const r = t.result;
    const isActor = typeof t.isActor === "function" && t.isActor();
    const pos = isActor ? this.actorPos(t) : this.enemyScreenPos(t);
    const popupY = Math.max(42, pos.y - 10);
    if (r.hpDamage > 0) {
      this.lastPopups.push({ x: pos.x + 16, y: popupY, text: `-${T.fmt(r.hpDamage)}`, t: 46, color: "#ff7070" });
    } else if (r.evaded) {
      this.lastPopups.push({ x: pos.x + 16, y: popupY, text: "闪避", t: 36, color: "#a0d0ff" });
    } else if (r.critical) {
      this.lastPopups.push({ x: pos.x + 16, y: popupY, text: "会心！", t: 40, color: "#ffd24d" });
    }
  }
  expandTargets(item, target, user = this.subject) {
    const dmg = item.damage || {};
    const scope = dmg.scope ?? item.scope ?? 1;
    const effects = item.effects || [];
    const healScope = [11, 14].includes(scope);
    const enemyUser = !!(user && user.isActor && !user.isActor());
    if ([1, 7, 9].includes(scope)) return target ? [target] : [];
    if (scope === 8) return (enemyUser ? this.troop.aliveMembers() : this.partyMembers.filter(x => !x.isDead()));
    if (scope === 2) return (enemyUser ? this.partyMembers.filter(x => !x.isDead()) : this.troop.aliveMembers());
    if (scope === 10) return enemyUser ? this.troop.members.filter(x => x.isDead()) : this.partyMembers.filter(x => x.isDead());
    if (healScope) return [target];
    if (effects.some(e => [21, 31].includes(e.code)) && [11, 14].includes(scope)) return [target];
    return [target];
  }
  applyToBattler(user, item, target) {
    const r = target.result;
    r.clear(); r.usedItem = item;
    const dmg = item.damage || {};
    /* 命中判定 */
    const hitType = dmg.hitType ?? 0;
    if (hitType === 1) {   // 物理可闪避
      if (Math.random() < Math.max(0.05, target.xparam(1) * 0.5)) {
        r.evaded = true;
        this.say(`${target.name} 避开了攻击！`);
        return;
      }
    }
    if (dmg.missed === false) {}
    /* 伤害/恢复值 */
    if (dmg.type > 0) {
      let v = !(user.isActor && user.isActor()) && T.$dataSkills.includes(item)
        ? (dmg.type === 3 ? this.enemyHealValue(user, item, target) : this.enemyDamageValue(user, item, target))
        : T.evalFormula(dmg.formula, user, target);
      if (dmg.elementId != null && dmg.elementId > 0) v *= target.elementRate(dmg.elementId);
      if (dmg.critical && Math.random() < this.critChance(user, target)) {
        r.critical = true;
        v *= 3;
      }
      const fullEnemyHeal = !(user.isActor && user.isActor()) && dmg.type === 3 &&
        (item.id === 96 || item.name === "完复计");
      if (!fullEnemyHeal) {
        const varr = (dmg.variance || 0) / 100;
        v = Math.round(v * (1 - varr + Math.random() * varr * 2));
      }
      /* G5: 伤害下限——物理/谋略伤害至少 1（原版公式 max(1, atk*4-def*2)），
         否则 Lv1 队伍打高防敌人 0 伤害死循环 */
      v = (dmg.type === 1 || dmg.type === 2) ? Math.max(1, v) : Math.max(0, v);
      /* 防御减伤 */
      if (target._guarding) v = Math.floor(v / 2);
      if (dmg.type === 1) {
        r.hpAffected = true; r.hpDamage += v;
        target.hp -= v;
        this.say(r.critical ? `会心一击！ ${target.name} 受到 ${T.fmt(Math.max(0,v))} 点损伤！`
                            : `${target.name} 受到 ${T.fmt(Math.max(0,v))} 点损伤`);
      } else if (dmg.type === 2) {
        r.mpDamage += v; target.mp -= v;
      } else if (dmg.type === 3) {
        target.hp += v;
        if (target.isDead() && target.hp > 0) { target.revive(); target.hp = Math.max(1, target.hp); }
        this.say(`${target.name} 恢复了 ${T.fmt(v)} 兵力`);
      } else if (dmg.type === 4) {
        target.mp += v;
      }
      /* 攻击附带状态（武器特性）*/
      if (item.id === 1) {
        for (const stId of user.attackStates()) {
          if (Math.random() < 0.3) target.addState(stId);
        }
      }
    }
    /* 附加效果 */
    for (const eff of item.effects || []) {
      this.applyEffect(user, target, eff, item);
    }
    if (target.hp <= 0) {
      target.die();
      this.say(`${target.name} 全军覆没！`);
      T.AudioManager.playSe({ name: "Collapse4", volume: 80 });
    }
  }
  applyEffect(user, target, eff, item = null) {
    switch (eff.code) {
      case 11: {
        const enemyItem = !(user.isActor && user.isActor()) && item && T.$dataItems.includes(item);
        const missing = Math.max(0, target.mhp - target.hp);
        const v = enemyItem
          ? (eff.value1 >= 1 ? missing : Math.min(missing, Math.round((eff.value2 || 0) * (1 + user.mat / 500))))
          : Math.max(0, Math.round(eff.value1 * target.mhp + eff.value2));
        target.hp += v;
        if (target.isDead() && target.hp > 0) target.revive();
        this.say(`${target.name} 恢复了 ${T.fmt(v)} 兵力`);
        break;
      }
      case 12: { const v = eff.value1 * target.mmp + eff.value2; target.mp += v; break; }
      case 21: if (target.addState(eff.dataId)) this.say(`${target.name} 陷入了异常状态！`); break;
      case 22: target.removeState(eff.dataId); break;
      case 31: target.addBuff(eff.dataId, eff.value2 || 3, false); break;
      case 32: target.addBuff(eff.dataId, eff.value2 || 3, true); break;
      case 42: { // G3-R3: 永久成长（蛇胆/武力石等；此前为占位 break，道具无效）
        const names = ["兵力", "谋点", "武力", "智力", "防御", "抗智", "速度", "统率"];
        target.growParam(eff.dataId, eff.value1);
        this.say(`${target.name} 的${names[eff.dataId] || "能力"}提升了！`);
        break;
      }
      case 41: { // 逃跑技能（数据技能3；无敌人/脚本引用，actor 触发则纳入逃跑判定）
        if (this.partyMembers.includes(target) && this.tryEscape) { try { this.tryEscape(); } catch (e) { /* 忽略 */ } }
        break;
      }
      case 44: { this.runBattleCommonEvent(eff.dataId, user); break; }
    }
  }
  /* G2: 战斗内公共事件执行器（阵型切换/缩地计等 effect 44 链路）
     支持 111 脚本条件分支 / 117 调用公共事件 / 355 脚本 / 101+401+405 消息 / 121 开关 / 122 变量 / 249 音效 / 201 传送(撤离)
     G3-R4: 同时也执行敌群战斗事件页（331-334/337 敌出现/变身/消灭/恢复） */
  runBattleCommonEvent(ceId, user) {
    const ce = T.$dataCommonEvents[ceId];
    if (!ce) return;
    this.execBattleEventList(ce.list, user);
  }
  execBattleEventList(listArg, user) {
    const prevFormation = T.$gameParty._formation;
    const prevTroopFormation = T.$gameTroop ? T.$gameTroop._formation : prevFormation;
    const stack = [{ list: listArg || [], i: 0, skipping: false }];
    outer: while (stack.length) {
      const fr = stack[stack.length - 1];
      const list = fr.list;
      while (fr.i < list.length) {
        const c = list[fr.i++];
        if (!c) continue;
        if (fr.skipping) { if (c.code === 411 || c.code === 412) fr.skipping = false; continue; }
        switch (c.code) {
          case 0:
            stack.pop(); continue outer;
          case 111: {
            const p = c.parameters || [];
            const script = p[0] === 12 ? (p[1] || "") : null;
            const truthy = script ? !!this.evalCommonExpr(script) : true;
            if (!truthy) fr.skipping = true;
            break;
          }
          case 117: {
            const sub = T.$dataCommonEvents[c.parameters[0]];
            if (sub) stack.push({ list: sub.list || [], i: 0, skipping: false });
            break;
          }
          case 355: {
            /* G3-R1: 多行脚本——655 续行收集后一次执行（与地图解释器同语义） */
            let scr = String((c.parameters || [])[0] || "");
            while (fr.i < list.length) {
              const nx = list[fr.i];
              if (nx && nx.code === 655) { scr += "\n" + String((nx.parameters || [])[0] || ""); fr.i++; }
              else break;
            }
            this.evalCommonScript(scr);
            break;
          }
          case 655: break;
          case 101: case 401: case 405: {
            const p = c.parameters || [];
            const raw = c.code === 101 ? p[4] : p[0];
            const txt = String(raw || "").replace(/%1/g, user ? user.name : "");
            if (txt) this.say(txt);
            break;
          }
          case 121: T.$gameSwitches.setValue(c.parameters[0], c.parameters[1] !== 0); break;
          case 122: { // G3-R4: 变量操作——标准参数位 [start,end,op,opt,value/script]
            const p = c.parameters || [];
            const st = p[0] != null ? p[0] : 0, en2 = p[1] != null ? p[1] : st;
            const op = p[2] != null ? p[2] : 0, opt = p[3] != null ? p[3] : 0;
            for (let v = st; v <= en2; v++) {
              let val = 0;
              if (opt === 0) val = p[4] != null ? p[4] : 0;
              else if (opt === 1) val = T.$gameVariables.value(p[4]);
              else if (opt === 2) val = T.randBetween(Math.min(p[4] || 0, p[5] || 0), Math.max(p[4] || 0, p[5] || 0));
              else if (opt === 4) { try { val = Math.trunc(new Function(`with(T){return (${p[4]});}`)()); } catch (e) { val = 0; } }
              const cur = T.$gameVariables.value(v);
              let nv = cur;
              if (op === 0) nv = val; else if (op === 1) nv = cur + val; else if (op === 2) nv = cur - val;
              else if (op === 3) nv = cur * val; else if (op === 4) nv = val !== 0 ? Math.trunc(cur / val) : 0;
              else if (op === 5) nv = val !== 0 ? cur % val : 0;
              T.$gameVariables.setValue(v, nv);
            }
            break;
          }
          case 249: T.AudioManager.playSe({ name: c.parameters[0], volume: c.parameters[1] != null ? c.parameters[1] : 90, pitch: c.parameters[2] != null ? c.parameters[2] : 100 }); break;
          /* G3-R4: 敌群事件页命令——出现/变身/消灭/恢复（索引 -1 = 全体） */
          case 331: case 332: case 333: case 334: case 337: {
            const p = c.parameters || [];
            const idx = p[0] != null ? p[0] : -1;
            const targets = idx === -1 ? this.troop.members : (this.troop.members[idx] ? [this.troop.members[idx]] : []);
            for (const en of targets) {
              if (c.code === 333) { en.die(); }  // 消灭（隐藏≠死亡：isDead=!hidden&&state1，故只用 die）
              else if (c.code === 331) { en.appear(); if (en.isDead()) en.revive(); }
              else if (c.code === 334) { en.appear(); if (en.isDead()) en.revive(); }
              else if (c.code === 332) { const nd = T.$dataEnemies[p[1]]; if (nd && en.setup) { en.setup(nd); en.appear(); } }
              else if (c.code === 337) { en.hp += Math.round((en.mhp || 0) * ((p[2] != null ? p[2] : 20) / 100)); }
            }
            break;
          }
          case 201: {
            const t = c.parameters;
            T._pendingBattleTransfer = { mapId: t[0], x: t[1], y: t[2], dir: t[3] != null ? t[3] : 2 };
            this._EscapeGuard = true;
            return;
          }
        }
        if (this._EscapeGuard) return;
      }
      if (fr.i >= list.length && stack.length) stack.pop();
    }
    if (T.$gameParty._formation !== prevFormation && T.$gameParty.formationName()) {
      this.say(`摆出了${T.$gameParty.formationName()}！`);
    }
    /* G2-R2: 敌方阵型（CE 121-132）变化日志 */
    if (T.$gameTroop && T.$gameTroop._formation !== prevTroopFormation && T.$gameTroop.formationName()) {
      this.say(`敌方摆出了${T.$gameTroop.formationName()}！`);
    }
  }
  /* G3-R4: 敌群战斗事件页评估（MZ 语义：回合数/敌HP/武将HP/开关条件；每页执行一次） */
  runTroopEvents() {
    const pages = (T.$dataTroops[this.troop.troopId] || {}).pages || [];
    const turn = this.troop.turnCount + 1;
    for (let i = 0; i < pages.length; i++) {
      const pg = pages[i];
      if (!pg || this._battleEventsDone.has(i)) continue;
      const c = pg.conditions || {};
      let hit = false;
      if (c.turnValid) hit = turn >= (c.turnA || 0) && turn <= (c.turnB == null ? (c.turnA || 0) : c.turnB);
      else if (c.enemyValid) { const en = this.troop.members[c.enemyIndex]; hit = !!en && en.mhp > 0 && en.hp / en.mhp <= ((c.enemyHp || 0) / 100); }
      else if (c.actorValid) { const ac = T.getActor(c.actorId); hit = !!ac && ac.mhp > 0 && ac.hp / ac.mhp <= ((c.actorHp || 0) / 100); }
      else if (c.switchValid) hit = T.$gameSwitches.value(c.switchId);
      else hit = true;
      if (hit) {
        this._battleEventsDone.add(i);
        this.execBattleEventList(pg.list || [], this.partyMembers[0]);
      }
    }
  }
  evalCommonScript(script) {
    if (!script) return;
    try { new Function(`with(T){${script}}`).call(T.scriptContext || {}); }
    catch (e) { console.warn("battle-common-script:", script, e.message); }
  }
  evalCommonExpr(script) {
    try { return new Function(`with(T){return (${script});}`).call(T.scriptContext || {}); }
    catch (e) { console.warn("battle-common-expr:", script, e.message); return false; }
  }
  critChance(user, target) {
    const c = 0.03 + user.xparam(2) - target.xparam(3);
    return T.clamp(c, 0, 0.5);
  }

  enqueueAnim(fn, targets) {
    this.animTargets = targets;
    this.animQueue.push(fn);
    this.phase = "anim";
    this._animWait = 18;
  }

  afterAction() {
    if (this._EscapeGuard) { this._EscapeGuard = false; this.phase = "escaped"; this.phaseTimer = 50; return; }
    if (this.phase !== "anim") return;
    if ($gameParty.isAllDead()) { this.phase = "defeat"; this.phaseTimer = 120; return; }
    if (this.troop.isAllDead()) { this.processVictory(); return; }
    this.phase = "resolve";
  }
  actionTiming() {
    return {
      approach: this.totalAssaultActive
        ? Math.max(1, Math.round(ACTION_APPROACH_FRAMES / 2)) : ACTION_APPROACH_FRAMES,
      return: this.totalAssaultActive
        ? Math.max(1, Math.round(ACTION_RETURN_FRAMES / 2)) : ACTION_RETURN_FRAMES,
    };
  }

  processVictory() {
    T.AudioManager.stopBgm(0.6);
    T.AudioManager.playMe({ name: "Victory1", volume: 90 });
    const exp = Math.max(1, Math.round(this.troop.expTotal() * (T.BATTLE_EXP_RATE || 1)));
    const gold = this.troop.goldTotal();
    const drops = this.troop.makeDropItems();
    this.chapter1Complete = this.req.sourceMapId === 31 && this.req.sourceEventId === 1 && this.req.troopId === 19;
    if (this.chapter1Complete) {
      T.$gameSystem.chapter1Complete = true;
      /* 45 是原始事件数据中第一章灭袁术后的剧情节点，保证跳过战斗测试也能进入出口状态。 */
      T.$gameVariables.setValue(1, Math.max(45, T.$gameVariables.value(1)));
    }
    this.say(`胜利！`);
    if (this.chapter1Complete) this.say("第一章「灭袁术」完成！山洞出口已开放。");
    this.say(`获得经验 ${exp}，金 ${gold}`);
    for (const d of drops) {
      $gameParty.gainItem(d, 1);
      this.say(`获得物品 ${d.name}`);
    }
    $gameParty.gainGold(gold);
    for (const a of this.partyMembers) a.changeExp(a.exp + exp, true);
    for (const a of this.partyMembers) {
      for (const lu of a.takeLevelUpReport()) {
        this.say(`${a.name} 升级了！(Lv${lu.level})`);
        for (const sk of lu.learned) {
          const s = T.$dataSkills[sk];
          if (s) this.say(`${a.name} 学会了【${s.name}】`);
        }
      }
    }
    this.phase = "victory"; this.phaseTimer = 160;
  }
  finish() {
    const result = this.phase === "victory" ? "win" : this.phase === "escaped" ? "escape" : "lose";
    if (result === "lose" && !this.req.canLose) {
      T.SceneManager.gameOver();
      return;
    }
    if (result === "lose") {
      // 战败但剧情允许：全员恢复至1并回城由事件处理，这里直接恢复
      for (const a of $gameParty.allMembers()) { if (a.isDead()) { a.hp = 1; a.revive(); } }
    }
    T.LastBattle = {
      result,
      troopId: this.req.troopId,
      turnCount: this.troop.turnCount,
      logLines: this.logLines.slice(),
      enemyCount: this.troop.members.length,
      enemiesRemaining: this.troop.aliveMembers().length,
      chapter1Complete: !!this.chapter1Complete,
    };
    T.BattleScene = null;
    T.$gameTroop = null;   // G2-R2: 战斗结束解绑敌群引用
    if (this.interpreterRef) this.interpreterRef._battleResult = result;
    T.AudioManager.replaySavedBgm();
    T.SceneManager.popScene(true);
  }

  /* ---- 绘制 ---- */
  async draw(ctx) {
    void this.async;
    ctx.fillStyle = "#101020";
    ctx.fillRect(0, 0, T.SCREEN_W, T.SCREEN_H);
    /* 背景图 */
    const bg = this._bgImg;
    if (bg) ctx.drawImage(bg, 0, 0, T.SCREEN_W, T.SCREEN_H);
    if (this._bgLoading == null) {
      this._bgLoading = true;
      const bb2 = this.battlebackNames.bb2;
      if (bb2) T.ImageManager.battleback2(bb2).then(i => { this._bgImg = i; });
    }
    /* 敌人：只攻击者前冲，被击者受击后退 */
    for (const en of this.troop.members) {
      if (en.hidden || en.isDead()) continue;
      const pos = this.enemyScreenPos(en);
      const img = this.enemySprites.get(en);
      const advX = this.enemyMoveX(en);
      const knock = this.hurtKnock(en);
      const hit = !!(this.actionVisual && this.actionVisual.hitT > 0 && this.actionVisual.target === en);
      const attackDip = !!(this.actionVisual && this.actionVisual.user === en && this.actionVisual.hitT > 0) ? -3 : 0;
      if (img instanceof HTMLImageElement) {
        const isCharSheet = img.width / img.height < 1.6 && en.noteTags.svBattler;
        if (isCharSheet) {
          const fw = img.width / 3, fh = img.height / 4;
          ctx.drawImage(img, fw, 0, fw, fh, pos.x - 16 + advX + knock, pos.y - fh + 32 + attackDip, fw, fh);
        } else {
          ctx.drawImage(img, pos.x + advX + knock, pos.y + attackDip);
        }
      }
      if (hit) {
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(Date.now() / 45);
        ctx.fillStyle = "#ff4040";
        ctx.fillRect(pos.x - 16 + advX + knock, pos.y - 8, 72, 72);
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x - 16 + advX + knock, pos.y - 8, 72, 72);
        ctx.restore();
      }
      /* 目标箭头 */
      if (this.phase === "select-target" && this.targets[this.targetIdx] === en) {
        ctx.fillStyle = "#ffd24d";
        const bob = Math.sin(Date.now() / 120) * 3;
        ctx.beginPath();
        ctx.moveTo(pos.x + 28, pos.y - 14 + bob);
        ctx.lineTo(pos.x + 44, pos.y - 26 + bob);
        ctx.lineTo(pos.x + 44, pos.y - 2 + bob);
        ctx.closePath(); ctx.fill();
      }
    }
    this.drawEnemyStatus(ctx);
    /* 我方 */
    for (let i = 0; i < this.partyMembers.length; i++) {
      const a = this.partyMembers[i];
      const pos = this.actorPos(a);
      const img = this.actorSprites.get(a);
      const dead = a.isDead();
      const advX = this.actorMoveX(a);
      const knock = this.hurtKnock(a);
      const hit = !!(this.actionVisual && this.actionVisual.hitT > 0 && this.actionVisual.target === a);
      const attackDip = !!(this.actionVisual && this.actionVisual.user === a && this.actionVisual.hitT > 0) ? -3 : 0;
      if (img instanceof HTMLImageElement) {
        const fw = img.width / 3, fh = img.height / 4;
        ctx.save();
        ctx.globalAlpha = dead ? 0.25 : 1;
        const dirRow = dead ? 0 : 2; // 面向右
        ctx.drawImage(img, fw, dirRow * fh, fw, fh, pos.x + advX + knock, pos.y - fh + 32 + attackDip, fw, fh);
        ctx.restore();
      }
      if (hit) {
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(Date.now() / 45);
        ctx.fillStyle = "#ff4040";
        ctx.fillRect(pos.x + advX + knock - 10, pos.y - 14, 56, 56);
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x + advX + knock - 10, pos.y - 14, 56, 56);
        ctx.restore();
      }
      /* 目标箭头 */
      if (this.phase === "select-target" && this.targets[this.targetIdx] === a) {
        ctx.fillStyle = "#7fd0ff";
        const bob = Math.sin(Date.now() / 120) * 3;
        const fh = (img instanceof HTMLImageElement ? img.height / 4 : 48);
        ctx.beginPath();
        ctx.moveTo(pos.x + 16, pos.y - fh - 10 + bob);
        ctx.lineTo(pos.x + 32, pos.y - fh - 24 + bob);
        ctx.lineTo(pos.x + 32, pos.y - fh + 2 + bob);
        ctx.closePath(); ctx.fill();
      }
    }
    /* 我方面板：左列头像 + 兵力条，替代底部大状态窗 */
    this.drawPartyStatus(ctx);
    /* 指令窗 */
    if (this.phase === "actor-cmd") {
      this.cmdWin.draw(ctx);
      const avail = this.visibleCmds(this.currentActor);
      const cols = 2;
      for (let i = 0; i < avail.length; i++) {
        const [nm] = avail[i];
        const col = i % cols, row = Math.floor(i / cols);
        this.cmdWin.drawText(ctx, nm, this.cmdWin.innerX + 14 + col * 166, this.cmdWin.innerY + 6 + row * 33);
      }
      const col = this.cmdIndex % cols, row = Math.floor(this.cmdIndex / cols);
      ctx.save();
      ctx.strokeStyle = "#ffd24d"; ctx.lineWidth = 2;
      ctx.strokeRect(this.cmdWin.x + 10 + col * 166, this.cmdWin.y + 14 + row * 33, 158, 27);
      ctx.restore();
    }
    /* 技能/道具列表 */
    if (this.phase === "select-skill") {
      this.skillWin.draw(ctx);
      const ih = this.skillWin.itemHeight();
      let ly = this.skillWin.innerY + 4 - this.skillWin.topRow * ih;
      for (let i = 0; i < this.skillList.length; i++) {
        const s = this.skillList[i];
        this.skillWin.drawText(ctx, s.name, this.skillWin.innerX + 10, ly);
        this.skillWin.drawText(ctx, `${T.skillCost(s)}`, this.skillWin.innerX + 420, ly, 80, "right");
        ly += ih;
      }
      this.skillWin.drawCursorBox(ctx);
    }
    if (this.phase === "select-item") {
      this.itemWin.draw(ctx);
      const ih = this.itemWin.itemHeight();
      let ly = this.itemWin.innerY + 4 - this.itemWin.topRow * ih;
      for (let i = 0; i < this.itemList.length; i++) {
        const it = this.itemList[i];
        this.itemWin.drawText(ctx, it.name, this.itemWin.innerX + 10, ly);
        this.itemWin.drawText(ctx, `×${$gameParty.itemCount(it)}`, this.itemWin.innerX + 420, ly, 80, "right");
        ly += ih;
      }
      this.itemWin.drawCursorBox(ctx);
    }
    /* 战斗文字：放在下方中央，不再与指令窗叠在一起 */
    if (this.logLines.length && !["select-skill", "select-item", "enemy-info"].includes(this.phase)) {
      this.logWin.draw(ctx);
      const recent = this.logLines.slice(-3);
      const av = this.actionVisual && this.actionVisual.user;
      const face = this.messageActor || (av && av.isActor && av.isActor() ? av : null) ||
        this.partyMembers.find(a => recent.some(l => l.includes(a.name + "的攻击") || l.includes(a.name + "布下") ||
          l.includes(a.name + "使出") || l.includes(a.name + "使用了"))) || null;
      const tx = this.logWin.innerX + (face ? 76 : 10);
      if (face) {
        this.logWin.drawActorFace(ctx, face.faceName, face.faceIndex, this.logWin.innerX + 8, this.logWin.innerY + 8, 52);
      }
      let lyy = this.logWin.innerY + 8;
      for (const line of recent) {
        this.logWin.drawText(ctx, line, tx, lyy, face ? this.logWin.innerW - 82 : this.logWin.innerW - 20);
        lyy += 28;
      }
    }
    this.drawEnemyInfo(ctx);
    this.drawRoundLabel(ctx);
    this.drawPopups(ctx);
    if (this.phase === "victory") {
      this.helpWin.draw(ctx);
      this.helpWin.drawText(ctx, "战 斗 胜 利", this.helpWin.innerX, this.helpWin.innerY + 10, this.helpWin.innerW, "center");
    }
  }
  drawPartyStatus(ctx) {
    ctx.save();
    for (let i = 0; i < this.partyMembers.length; i++) {
      const a = this.partyMembers[i];
      const y = 58 + i * 58;
      const isCurrent = this.currentActor === a && ["actor-cmd", "select-skill", "select-item"].includes(this.phase);
      const isActing = this.messageActor === a;
      const face = T.faceCache.get(a.faceName);
      if (face && face.img) {
        this.logWin.drawActorFace(ctx, a.faceName, a.faceIndex, 8, y, 34);
      } else {
        ctx.fillStyle = "#22334d";
        T.roundRect(ctx, 8, y, 34, 34, 6, true);
        ctx.fillStyle = "#ffd24d";
        ctx.font = T.fontStr(18, true);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((a.name || "?").charAt(0), 25, y + 18);
      }
      const nx = 58;
      if (isActing) {
        ctx.font = T.fontStr(16, true);
        ctx.fillStyle = "#ffd24d";
        ctx.fillText("▶", 46, y);
      }
      ctx.font = T.fontStr(20, true);
      ctx.fillStyle = isCurrent || isActing ? "#ffd24d" : "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(a.name, nx, y);
      ctx.font = T.numFontStr(16);
      ctx.fillStyle = "#d8ffe0";
      ctx.fillText(T.fmt(a.hp), nx, y + 24);
      const bx = nx, bw = 170;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(bx - 1, y + 38, bw + 2, 12);
      ctx.fillStyle = a.hp / a.mhp > 0.5 ? "#40c060" : a.hp / a.mhp > 0.25 ? "#f0a040" : "#f06060";
      const fillW = this.partyBarRate(a) * bw;
      ctx.fillRect(bx, y + 39, fillW, 10);
      if (isCurrent && !isActing) {
        ctx.fillStyle = "#ffd24d";
        ctx.fillRect(nx, y - 2, 320, 2);
      }
    }
    ctx.restore();
  }
  drawEnemyStatus(ctx) {
    ctx.save();
    for (let i = 0; i < this.troop.members.length; i++) {
      const en = this.troop.members[i];
      const y = 58 + i * 56;
      const dead = en.isDead();
      ctx.globalAlpha = dead ? 0.4 : 1;
      const x = 650, bw = 140;
      ctx.font = T.fontStr(20, true);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(en.name, x, y);
      ctx.font = T.numFontStr(16);
      ctx.fillStyle = dead ? "#ff4040" : "#ffe0e0";
      ctx.fillText(T.fmt(en.hp), x, y + 24);
      ctx.textAlign = "right";
      ctx.fillStyle = "#b8d5ff";
      ctx.fillText(`谋${T.fmt(en.mp)}/${T.fmt(en.mmp)}`, x + bw, y + 24);
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(x - 1, y + 38, bw + 2, 12);
      ctx.fillStyle = dead ? "#ff4040" : "#4080ff";
      const fillW = this.enemyBarRate(en) * bw;
      ctx.fillRect(x + bw - fillW, y + 39, fillW, 10);
    }
    ctx.restore();
  }
  actorMoveX(actor) {
    if (this.totalAssaultActive && actor && !actor.isDead()) return 18;
    const adv = this._actionAdvance || 0;
    return this._actionUser === actor && actor && actor.isActor && actor.isActor() ? 26 * adv : 0;
  }
  enemyMoveX(enemy) {
    if (this.totalAssaultActive && enemy && !enemy.isDead()) return -18;
    const adv = this._actionAdvance || 0;
    return this._actionUser === enemy && enemy && !(enemy.isActor && enemy.isActor()) ? -26 * adv : 0;
  }
  partyBarRate(actor) {
    return Math.max(0, Math.min(1, actor.hp / (this.partyBarRefHp || 1)));
  }
  enemyBarRate(enemy) {
    return Math.max(0, Math.min(1, enemy.hp / (this.enemyBarRefHp || 1)));
  }
  hurtKnock(target) {
    if (!this.actionVisual || this.actionVisual.hitT <= 0 || this.actionVisual.target !== target) return 0;
    const user = this.actionVisual.user;
    return (user && user.isActor && user.isActor()) ? 7 : -7;
  }
  visibleCmds(actor) {
    const names = ["攻击", "总攻", "计策", "兵法", "阵型", "歌唱", "奥义", "防御", "道具", "情报", "逃跑"];
    const all = names.map(nm => {
      if (["攻击", "防御", "道具", "总攻", "情报", "逃跑"].includes(nm)) return [nm, -2];
      return [nm, T.$dataSystem.skillTypes.indexOf(nm)];
    });
    return all.filter(([nm, st]) => {
      if (nm === "攻击" || nm === "防御" || nm === "道具" || nm === "总攻" || nm === "情报") return true;
      if (nm === "逃跑") return this.req.canEscape !== false;
      return actor.usableSkills(st).length > 0;
    });
  }
  drawEnemyInfo(ctx) {
    if (this.phase !== "enemy-info") return;
    const list = this.targets || [];
    this.skillWin.draw(ctx);
    const ix = this.skillWin.innerX, iy = this.skillWin.innerY;
    const tabs = list.slice(0, 5);
    const tabW = Math.min(108, Math.floor((this.skillWin.innerW - 20) / Math.max(1, tabs.length)));
    for (let i = 0; i < tabs.length; i++) {
      const x = ix + 8 + i * tabW;
      ctx.save();
      ctx.fillStyle = i === this.targetIdx ? "rgba(255,210,77,0.14)" : "rgba(0,0,0,0.3)";
      T.roundRect(ctx, x, iy + 2, tabW - 4, 24, 4, true);
      ctx.strokeStyle = i === this.targetIdx ? "#ffd24d" : "rgba(220,230,255,0.5)";
      ctx.lineWidth = i === this.targetIdx ? 2 : 1;
      T.roundRect(ctx, x, iy + 2, tabW - 4, 24, 4, false, true);
      this.skillWin.drawText(ctx, tabs[i].name, x + 4, iy + 6, tabW - 12, "center");
      ctx.restore();
    }
    const e = tabs[this.targetIdx];
    if (!e) return;
    const face = this.enemySprites.get(e);
    if (face instanceof HTMLImageElement) {
      ctx.save();
      ctx.fillStyle = "#0c1018";
      T.roundRect(ctx, ix + 8, iy + 34, 64, 64, 6, true);
      ctx.drawImage(face, ix + 12, iy + 38, 56, 56);
      ctx.restore();
    }
    const dx = ix + 86;
    const bar = (label, val, max, x, y, color) => {
      this.skillWin.drawText(ctx, label, x, y, 60);
      this.skillWin.drawText(ctx, `${T.fmt(val)}/${T.fmt(max)}`, x + 66, y, 92, "right");
      this.skillWin.drawGauge(ctx, x + 162, y + 2, 110, max ? val / max : 0, color, color);
    };
    bar("兵力", Math.round(e.hp), Math.round(e.mhp), dx, iy + 34, "#40c060");
    bar("谋点", Math.round(e.mp), Math.round(e.mmp), dx, iy + 56, "#4080ff");
    const stats = [
      ["武力", e.atk], ["智力", e.mat], ["速度", e.agi],
      ["防御", e.def], ["攻击", e.atk], ["经验", e.expValue, "right"]
    ];
    let sy = iy + 84;
    for (let i = 0; i < stats.length; i++) {
      const sx = i % 2 === 0 ? dx : dx + 170;
      const row = Math.floor(i / 2);
      this.skillWin.drawText(ctx, stats[i][0], sx, sy + row * 22, 60);
      this.skillWin.drawText(ctx, `${T.fmt(stats[i][1])}`, sx + 62, sy + row * 22, 74, "right");
    }
    const drop = e.makeDropItems()[0];
    if (drop) this.skillWin.drawText(ctx, `掉落 ${drop.name}`, dx, sy + 72, this.skillWin.innerW - dx, "left");
    this.skillWin.drawText(ctx, `金 ${T.fmt(e.gold)}`, dx + 170, sy + 72, 120, "right");
  }
  drawRoundLabel(ctx) {
    const label = this.totalAssaultActive
      ? (this._stopTotalAssault ? "总攻 · 本回合后停止" : "总攻中")
      : (this.roundLabel ? this.roundLabel.text : "");
    ctx.save();
    if (label) {
      ctx.font = T.fontStr(24, true);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillText(label, T.SCREEN_W / 2 + 2, this.roundLabelY + 2);
      ctx.fillStyle = "#ffd24d";
      ctx.fillText(label, T.SCREEN_W / 2, this.roundLabelY);
    }
    const pf = T.$gameParty.formationName();
    const ef = this.troop.formationName();
    ctx.font = T.fontStr(18, true);
    ctx.textBaseline = "top";
    if (pf) {
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillText(pf, 10 + 2, 30 + 2);
      ctx.fillStyle = "#a0ffb0";
      ctx.fillText(pf, 10, 30);
    }
    if (ef) {
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillText(ef, T.SCREEN_W - 10 + 2, 30 + 2);
      ctx.fillStyle = "#ffd2a0";
      ctx.fillText(ef, T.SCREEN_W - 10, 30);
    }
    ctx.restore();
  }
  drawPopups(ctx) {
    if (!this.lastPopups.length) return;
    ctx.save();
    ctx.font = T.fontStr(22, true);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const p of this.lastPopups) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.t / 40));
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillText(p.text, p.x + 1, p.y + 1 - (40 - p.t) * 0.25);
      ctx.fillStyle = p.color || "#ff7070";
      ctx.fillText(p.text, p.x, p.y - (40 - p.t) * 0.25);
    }
    ctx.restore();
  }
}
/* 类导出 */
Object.assign(T, { Scene_Battle, Game_Troop });
