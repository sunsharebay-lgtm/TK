/* ============================================================
 * TnDT Engine - battle.js
 * 侧视战斗：指令、行动顺序、伤害公式、状态、奖励
 * ============================================================ */
"use strict";

/* ---------------- 敌群 ---------------- */
class Game_Troop {
  constructor(troopId) {
    this.troopId = troopId;
    const t = T.$dataTroops[troopId] || { members: [] };
    this.members = t.members.map(m => new Game_Enemy(m.enemyId, m.x, m.y));
    this.turnCount = 0;
    this.name = t.name || "";
  }
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
    /* 敌人精灵图 */
    this.enemySprites = new Map();
    this.actorSprites = new Map();
    this._loadSprites();
    /* 窗口 */
    this.helpWin = new Window_Base(T.SCREEN_W / 2 - 150, 92, 300, 46);
    this.helpWin.fontSize = 22;
    this.cmdWin = new Window_Selectable(T.SCREEN_W - 328, T.SCREEN_H - 200, 320, 192);
    this.cmdWin.fontSize = 22;
    this.statusWin = new Window_Base(8, T.SCREEN_H - 200, 560, 192);
    this.statusWin.fontSize = 22;
    this.logWin = new Window_Base(8, T.SCREEN_H / 2 - 120, 440, 150);
    this.targetIdx = 0;
    this.selectMode = "";   // "" | target-enemy | target-ally | skill | item | skilltype
    this.skillWin = new Window_Selectable(8, T.SCREEN_H - 380, 500, 270);
    this.skillWin.fontSize = 22;
    this.itemWin = new Window_Selectable(8, T.SCREEN_H - 380, 500, 270);
    this.itemWin.fontSize = 22;
    this.bgmBackupName = null;
    this.roundLabel = null;
    this.roundLabelY = 0;
    this.actionVisual = null;
    this._actionFxLeft = 0;
    this.actionSeq = null;
    this._actionAdvance = 0;
    this.lastPopups = [];
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
    }
  }
  /* ---- 坐标 ---- */
  actorPos(a, iOffset = 0) {
    const idx = this.partyMembers.indexOf(a);
    return { x: 120, y: 84 + idx * 72 + iOffset };
  }
  enemyScreenPos(e) {
    const idx = this.troop.members.indexOf(e);
    return { x: T.SCREEN_W - 220, y: 84 + idx * 72 };
  }

  update() {
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

  startRound() {
    this.roundActions = [];
    const all = [...this.partyMembers.filter(a => !a.isDead()), ...this.troop.aliveMembers()];
    for (const b of all) b.makeSpeed();
    this.turnOrder = all.slice().sort((x, y) => y.turnAddSpeed - x.turnAddSpeed);
    this.actionIndex = 0;
    this.phase = "party-cmd";
    this.currentActor = this.partyMembers.find(a => !a.isDead());
    this.cmdIndex = 0;
    this.roundLabel = { text: `第 ${this.troop.turnCount + 1} 回合` };
    this.roundLabelY = T.SCREEN_H / 2 + 88;
    this.say(`第 ${this.troop.turnCount + 1} 回合`);
  }

  updatePartyCmd() {
    // 简化：直接进入角色指令
    this.phase = "actor-cmd";
  }
  updateActorCmd() {
    const a = this.currentActor;
    if (!a || a.isDead()) { this.nextActorOrResolve(); return; }
    if (this.cmds == null || this._cmdsFor !== a) {
      this.cmds = ["攻击", "计策", "兵法", "阵型", "歌唱", "奥义", "防御", "道具", "总攻", "情报", "逃跑"]; /* G1: 补歌唱战斗指令（skillTypes 含歌唱45技） */
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
    if (T.Input.repeated("down")) this.cmdIndex = (this.cmdIndex + 1) % avail.length;
    if (T.Input.repeated("up")) this.cmdIndex = (this.cmdIndex - 1 + avail.length) % avail.length;
    const sel = avail[this.cmdIndex];
    if (T.Input.triggered("ok")) {
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
    const alive = this.troop.aliveMembers();
    this.targets = alive;
    this.targetIdx = 0;
    this.phase = "select-target";
  }
  beginSelectTargetAlly(forItem) {
    this.selectMode = "target-ally";
    this.targets = this.partyMembers;
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
    for (const ac of this.partyMembers.filter(m => !m.isDead())) {
      ac.setAction(0, T.$dataSkills[1], -1);
      ac._guarding = false;
    }
    this.phase = "resolve";
    this._cmdsFor = null;
  }
  updateSkillList() {
    this.skillWin.updateInput();
    if (T.Input.triggered("cancel")) { this.phase = "actor-cmd"; return; }
    if (T.Input.triggered("ok")) {
      const s = this.skillList[this.skillWin.index];
      if (!s) return;
      if (s.mpCost > this.currentActor.mp) { T.AudioManager.playSe({ name: "Buzzer", volume: 50 }); return; }
      this.currentActor._pendingAction = { kind: "skill", skill: s };
      const scope = s.scope ?? s.damage?.scope;
      if ([1, 2, 9].includes(scope)) this.beginSelectTargetEnemy();       // 单体敌人
      else if ([7, 8, 11, 14].includes(scope)) this.beginSelectTargetAlly(); // 单体我方
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
      if ([7, 8, 11, 14].includes(scope)) this.beginSelectTargetAlly(true);
      else if ([1, 2, 9].includes(scope)) this.beginSelectTargetEnemy();
      else this.confirmActorAction();
    }
  }
  updateTarget() {
    const n = this.targets.length;
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
    this.startRound();
  }
  updateActionSeq() {
    const seq = this.actionSeq;
    if (!seq) { this.phase = "resolve"; return; }
    seq.t++;
    const b = seq.user;
    if (!seq.applied) {
      this._actionAdvance = Math.min(1, seq.t / 10);
      if (seq.t >= 10) {
        seq.applied = true; seq.t = 0;
        this.subject = b;
        if (b.isActor && b.isActor()) this.doActorAction(b);
        else this.doEnemyAction(b);
        if (this.animQueue.length) { const fn = this.animQueue.shift(); fn(); }
        if (this.phase === "anim") this.phase = "action";
        if (this.actionVisual && this.actionVisual.target) {
          const t = this.actionVisual.target;
          const pos = t.isActor ? this.actorPos(t) : this.enemyScreenPos(t);
          const dmg = (t.result && t.result.hpDamage) || 0;
          this.lastPopups.push({ x: pos.x + 16, y: pos.y - 8, text: `-${dmg}`, t: 40 });
        }
        this._actionFxLeft = 8;
      }
    } else {
      this._actionAdvance = Math.max(0, 1 - seq.t / 5);
      if (seq.t >= 5) {
        this.actionSeq = null;
        this._actionAdvance = 0;
        this.phase = "resolve";
      }
    }
  }
  doActorAction(a) {
    const act = a._actions[0];
    const item = act && act.item;
    if (!item) { if (a._guarding) { this.say(`${a.name} 摆出了防御态势。`); } return; }
    if (item.id === 1) {                       // 普通攻击
      const t = act.target && !act.target.isDead() ? act.target : this.pickRandomAliveEnemy();
      if (!t) return;
      this.actionVisual = { user: a, target: t };
      this.applyItem(a, T.$dataSkills[1], t);
    } else if (T.$dataSkills.includes(item)) {
      const t = act.target && !act.target.isDead() ? act.target : this.defaultTargetFor(item);
      if (!t) return;
      this.actionVisual = { user: a, target: t };
      a.paySkillCost(item);
      this.applyItem(a, item, t);
    } else if (T.$dataItems.includes(item)) {
      const t = act.target && !act.target.isDead() ? act.target : a;
      this.actionVisual = { user: a, target: t };
      $gameParty.consumeItem(item);
      this.applyItem(a, item, t);
    }
  }
  doEnemyAction(e) {
    const act = this.selectEnemyAction(e);
    if (!act) return;
    const skill = T.$dataSkills[act.skillId];
    if (!skill) {
      // 普通攻击
      const t = this.pickRandomAliveActor();
      if (t) { this.actionVisual = { user: e, target: t }; this.applyAttack(e, t); }
      return;
    }
    const t = this.defaultTargetFor(skill);
    if (!t) return;
    this.actionVisual = { user: e, target: t };
    if (skill.mpCost) e.mp -= Math.min(e.mp, skill.mpCost);
    this.applyItem(e, skill, t);
  }
  selectEnemyAction(e) {
    const acts = e.actions.filter(a => this.checkActionCondition(e, a));
    if (!acts.length) return null;
    const total = acts.reduce((s, a) => s + (a.rating || 5), 0);
    let roll = Math.random() * total;
    for (const a of acts) { roll -= a.rating || 5; if (roll < 0) return a; }
    return acts[acts.length - 1];
  }
  checkActionCondition(e, a) {
    const hpRate = e.hp / e.mhp;
    switch (a.conditionType) {
      case 0: return true;
      case 1: return hpRate >= (a.conditionParam1 || 0) / 100;
      case 2: return hpRate <= (a.conditionParam1 || 100) / 100;
      case 3: return true;                     // MP 条件简化
      case 4: return e.isStateAffected(a.conditionParam1);
      case 5: return $gameParty.highestLevel() >= a.conditionParam1;
      case 6: return T.$gameSwitches.value(a.conditionParam1);
      default: return false;
    }
  }
  defaultTargetFor(item) {
    const scope = item.scope ?? item.damage?.scope;
    if ([7, 8, 11, 14].includes(scope)) {
      const alive = this.partyMembers.filter(a => !a.isDead());
      return alive.length ? alive[T.rand(alive.length)] : this.partyMembers[0];
    }
    if ([1, 2, 9].includes(scope)) return this.pickRandomAliveEnemy();
    return this.subject;
  }
  pickRandomAliveEnemy() { const l = this.troop.aliveMembers(); return l[T.rand(l.length)] || null; }
  pickRandomAliveActor() { const l = this.partyMembers.filter(a => !a.isDead()); return l[T.rand(l.length)] || null; }
  /* 战斗事件引用敌人：按 troop.members 下标返回 */
  enemyAt(index) { return this.troop.members[index] || null; }

  applyAttack(user, target) { this.applyItem(user, T.$dataSkills[1], target); }

  applyItem(user, item, target) {
    const targets = this.expandTargets(item, target);
    const dmg = item.damage || {};
    for (const t of targets) this.applyToBattler(user, item, t);
    /* 动画与日志 */
    this.enqueueAnim(() => {
      if (dmg.type > 0) {
        T.AudioManager.playSe({ name: "Damage1", volume: 70 });
      }
    }, targets);
    if (item.message1) this.say(item.message1.replace("%1", user.name));
    /* 结算后检查 */
    if ($gameParty.isAllDead()) { this.phase = "defeat"; this.phaseTimer = 120; }
    else if (this.troop.isAllDead()) this.processVictory();
  }
  expandTargets(item, target) {
    const dmg = item.damage || {};
    const scope = dmg.scope ?? item.scope ?? 1;
    const effects = item.effects || [];
    const healScope = [11, 14].includes(scope);
    if ([1, 7, 9].includes(scope)) return [target];
    if (scope === 8) return this.partyMembers.filter(x => !x.isDead());   // 全体我方
    if (scope === 2) return this.troop.aliveMembers();                    // 全体敌方
    if (scope === 10) return [...this.partyMembers.filter(x => !x.isDead()), ...this.troop.aliveMembers()]; // 全体
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
      let v = T.evalFormula(dmg.formula, user, target);
      if (dmg.elementId != null && dmg.elementId > 0) v *= target.elementRate(dmg.elementId);
      if (dmg.critical && Math.random() < this.critChance(user, target)) {
        r.critical = true;
        v *= 3;
      }
      const varr = (dmg.variance || 0) / 100;
      v = Math.round(v * (1 - varr + Math.random() * varr * 2));
      v = Math.max(v > 0 ? 1 : 0, Math.round(v));
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
      this.applyEffect(user, target, eff);
    }
    if (target.hp <= 0) {
      target.die();
      this.say(`${target.name} 全军覆没！`);
      T.AudioManager.playSe({ name: "Collapse4", volume: 80 });
    }
  }
  applyEffect(user, target, eff) {
    switch (eff.code) {
      case 11: { const v = Math.max(0, Math.round(eff.value1 * target.mhp + eff.value2)); target.hp += v; this.say(`${target.name} 恢复了兵力`); break; }
      case 12: { const v = eff.value1 * target.mmp + eff.value2; target.mp += v; break; }
      case 21: if (target.addState(eff.dataId)) this.say(`${target.name} 陷入了异常状态！`); break;
      case 22: target.removeState(eff.dataId); break;
      case 31: target.addBuff(eff.dataId, eff.value2 || 3, false); break;
      case 32: target.addBuff(eff.dataId, eff.value2 || 3, true); break;
      case 42: break;   // 成长简化
      case 44: { this.runBattleCommonEvent(eff.dataId, user); break; }
    }
  }
  /* G2: 战斗内公共事件执行器（阵型切换/缩地计等 effect 44 链路）
     支持 111 脚本条件分支 / 117 调用公共事件 / 355 脚本 / 101+401+405 消息 / 121 开关 / 122 变量 / 249 音效 / 201 传送(撤离) */
  runBattleCommonEvent(ceId, user) {
    const ce = T.$dataCommonEvents[ceId];
    if (!ce) return;
    const prevFormation = T.$gameParty._formation;
    const stack = [{ list: ce.list || [], i: 0, skipping: false }];
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
          case 355: this.evalCommonScript(c.parameters[0]); break;
          case 101: case 401: case 405: {
            const txt = String(c.parameters[4] || "").replace(/%1/g, user ? user.name : "");
            if (txt) this.say(txt);
            break;
          }
          case 121: T.$gameSwitches.setValue(c.parameters[0], c.parameters[1] !== 0); break;
          case 122: T.$gameVariables.setValue(c.parameters[0], c.parameters[1]); break;
          case 249: T.AudioManager.playSe({ name: c.parameters[0], volume: c.parameters[1] != null ? c.parameters[1] : 90, pitch: c.parameters[2] != null ? c.parameters[2] : 100 }); break;
          case 201: {
            const t = c.parameters;
            T._pendingBattleTransfer = { mapId: t[0], x: t[1], y: t[2], dir: t[3] != null ? t[3] : 2 };
            this.phase = "escaped";
            this.phaseTimer = Math.min(this.phaseTimer || 60, 50);
            return;
          }
        }
        if (this.phase === "escaped") return;
      }
      if (fr.i >= list.length && stack.length) stack.pop();
    }
    if (T.$gameParty._formation !== prevFormation && T.$gameParty.formationName()) {
      this.say(`摆出了${T.$gameParty.formationName()}！`);
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
    if (this.phase !== "anim") return;
    if ($gameParty.isAllDead()) { this.phase = "defeat"; this.phaseTimer = 120; return; }
    if (this.troop.isAllDead()) { this.processVictory(); return; }
    this.phase = "resolve";
  }

  processVictory() {
    T.AudioManager.stopBgm(0.6);
    T.AudioManager.playMe({ name: "Victory1", volume: 90 });
    const exp = this.troop.expTotal();
    const gold = this.troop.goldTotal();
    const drops = this.troop.makeDropItems();
    this.say(`胜利！`);
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
    T.BattleScene = null;
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
    /* 敌人 */
    for (const en of this.troop.members) {
      if (en.hidden || en.isDead()) continue;
      const pos = this.enemyScreenPos(en);
      const img = this.enemySprites.get(en);
      const advX = -(22 * (this._actionAdvance || 0));
      const hit = !!(this.actionVisual && this.actionVisual.target === en && this._actionFxLeft > 0);
      if (img instanceof HTMLImageElement) {
        const isCharSheet = img.width / img.height < 1.6 && en.noteTags.svBattler;
        if (isCharSheet) {
          const fw = img.width / 3, fh = img.height / 4;
          ctx.drawImage(img, fw, 0, fw, fh, pos.x - 16 + advX, pos.y - fh + 32, fw, fh);
        } else {
          ctx.drawImage(img, pos.x + advX, pos.y);
        }
      }
      if (hit) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#ff4040";
        ctx.fillRect(pos.x - 6 + advX, pos.y - 6, 64, 64);
        ctx.restore();
      }
      /* 血条 */
      const bw = 56;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(pos.x - 2, pos.y + 34, bw + 4, 7);
      ctx.fillStyle = "#e05050";
      ctx.fillRect(pos.x, pos.y + 35, bw * Math.max(0, en.hp / en.mhp), 5);
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
    /* 我方 */
    for (let i = 0; i < this.partyMembers.length; i++) {
      const a = this.partyMembers[i];
      const pos = this.actorPos(a);
      const img = this.actorSprites.get(a);
      const dead = a.isDead();
      const advX = 22 * (this._actionAdvance || 0);
      const hit = !!(this.actionVisual && this.actionVisual.target === a && this._actionFxLeft > 0);
      if (img instanceof HTMLImageElement) {
        const fw = img.width / 3, fh = img.height / 4;
        ctx.save();
        ctx.globalAlpha = dead ? 0.25 : 1;
        const dirRow = dead ? 0 : ({ 2: 0, 8: 3, 4: 1, 6: 2 })[6]; // 面向右
        ctx.drawImage(img, fw, dirRow * fh, fw, fh, pos.x + advX, pos.y - fh + 32, fw, fh);
        ctx.restore();
      }
      if (hit) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#ff4040";
        ctx.fillRect(pos.x + advX - 8, pos.y - 12, 48, 48);
        ctx.restore();
      }
      /* 目标箭头 */
      if (this.phase === "select-target" && this.targets[this.targetIdx] === a) {
        ctx.fillStyle = "#7fd0ff";
        const bob = Math.sin(Date.now() / 120) * 3;
        ctx.beginPath();
        ctx.moveTo(pos.x + 16, pos.y - fh0(img) - 10 + bob);
        ctx.lineTo(pos.x + 32, pos.y - fh0(img) - 24 + bob);
        ctx.lineTo(pos.x + 32, pos.y - fh0(img) + 2 + bob);
        ctx.closePath(); ctx.fill();
      }
      function fh0(im) { return im instanceof HTMLImageElement ? im.height / 4 : 48; }
    }
    /* 状态窗 */
    this.statusWin.draw(ctx);
    let sy = this.statusWin.innerY + 4;
    for (const a of this.partyMembers) {
      drawActorRowCompact(this.statusWin, ctx, a, sy, this.currentActor === a && ["actor-cmd", "select-skill", "select-item"].includes(this.phase));
      sy += 36;
    }
    /* 指令窗 */
    if (this.phase === "actor-cmd") {
      this.cmdWin.draw(ctx);
      const avail = this.visibleCmds(this.currentActor);
      const rows = Math.max(1, Math.ceil(avail.length / 2));
      for (let i = 0; i < avail.length; i++) {
        const [nm] = avail[i];
        const col = Math.floor(i / rows), row = i % rows;
        this.cmdWin.drawText(ctx, nm, this.cmdWin.innerX + 12 + col * 155, this.cmdWin.innerY + 6 + row * 31);
      }
      const col = Math.floor(this.cmdIndex / rows), row = this.cmdIndex % rows;
      ctx.save();
      ctx.strokeStyle = "#ffd24d"; ctx.lineWidth = 2;
      ctx.strokeRect(this.cmdWin.x + 8 + col * 155, this.cmdWin.y + 12 + row * 31, 148, 28);
      ctx.restore();
      this.helpWin.draw(ctx);
      this.helpWin.drawText(ctx, `${this.currentActor.name} 的行动`, this.helpWin.innerX, this.helpWin.innerY + 10);
    }
    /* 技能/道具列表 */
    if (this.phase === "select-skill") {
      this.skillWin.draw(ctx);
      const ih = this.skillWin.itemHeight();
      let ly = this.skillWin.innerY + 4 - this.skillWin.topRow * ih;
      for (let i = 0; i < this.skillList.length; i++) {
        const s = this.skillList[i];
        this.skillWin.drawText(ctx, s.name, this.skillWin.innerX + 10, ly);
        this.skillWin.drawText(ctx, `${s.mpCost}`, this.skillWin.innerX + 360, ly, 80, "right");
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
        this.itemWin.drawText(ctx, `×${$gameParty.itemCount(it)}`, this.itemWin.innerX + 360, ly, 80, "right");
        ly += ih;
      }
      this.itemWin.drawCursorBox(ctx);
    }
    /* 战斗日志 */
    if (this.logLines.length) {
      this.logWin.draw(ctx);
      const recent = this.logLines.slice(-4);
      let lyy = this.logWin.innerY + 2;
      for (const line of recent) {
        this.logWin.drawText(ctx, line, this.logWin.innerX + 6, lyy);
        lyy += 30;
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
  visibleCmds(actor) {
    const names = ["攻击", "计策", "兵法", "阵型", "奥义", "防御", "道具", "总攻", "情报", "逃跑"];
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
    let y = this.skillWin.innerY + 4;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      this.skillWin.drawText(ctx, e.name, this.skillWin.innerX + 10, y);
      this.skillWin.drawText(ctx, `兵力 ${Math.round(e.hp)}/${Math.round(e.mhp)}  谋 ${Math.round(e.mp)}/${Math.round(e.mmp)}`,
        this.skillWin.innerX + 150, y, this.skillWin.innerW - 170, "right");
      if (i === this.targetIdx) {
        ctx.save();
        ctx.strokeStyle = "#ffd24d"; ctx.lineWidth = 2;
        ctx.strokeRect(this.skillWin.innerX + 4, y - 2, this.skillWin.innerW - 8, this.skillWin.itemHeight() - 2);
        ctx.restore();
      }
      y += this.skillWin.itemHeight();
    }
    const e = list[this.targetIdx];
    if (e) {
      const info = `武力 ${e.atk}　防御 ${e.def}　智 ${e.mat}　速度 ${e.agi}`;
      this.skillWin.drawText(ctx, info, this.skillWin.innerX + 10, this.skillWin.innerY + this.skillWin.innerH - 34);
    }
  }
  drawRoundLabel(ctx) {
    if (!this.roundLabel) return;
    ctx.save();
    ctx.font = T.fontStr(26, true);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(this.roundLabel.text, T.SCREEN_W / 2 + 2, this.roundLabelY + 2);
    ctx.fillStyle = "#ffd24d";
    ctx.fillText(this.roundLabel.text, T.SCREEN_W / 2, this.roundLabelY);
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
      ctx.fillStyle = "#ff7070";
      ctx.fillText(p.text, p.x, p.y - (40 - p.t) * 0.25);
    }
    ctx.restore();
  }
}
function drawActorRowCompact(win, ctx, a, y, highlight) {
  if (highlight) {
    ctx.save();
    ctx.strokeStyle = "#ffd24d"; ctx.lineWidth = 2;
    ctx.strokeRect(win.x + 4, win.y + 6 + (y - win.innerY) - 4, win.w - 8, 34);
    ctx.restore();
  }
  win.drawText(ctx, `${a.name}`, win.innerX + 4, y);
  win.drawGauge(ctx, win.innerX + 130, y + 8, 150, a.hp / a.mhp, "#40c060", "#a0ffb0");
  win.drawText(ctx, T.fmt(a.hp), win.innerX + 290, y, 110, "right");
  win.drawText(ctx, `谋${a.mp}`, win.innerX + 410, y, 90, "right");
}

/* 类导出 */
Object.assign(T, { Scene_Battle, Game_Troop });
