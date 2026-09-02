/* ============================================================
 * TnDT Engine - menus.js
 * 主菜单、物品、技能、装备、状态、存读档、商店
 * ============================================================ */
"use strict";

/* ---------------- 帮助：成员状态行 ---------------- */
function drawActorRow(win, ctx, a, y) {
  if (win._compact) {
    const faceSize = Math.min(40, win.innerH - 8);
    win.drawActorFace(ctx, a.faceName, a.faceIndex, win.innerX, y - 4, faceSize);
    const tx = win.innerX + faceSize + 8;
    win.drawText(ctx, `${a.name}  Lv${a.level}`, tx, y);
    win.drawText(ctx, `${T.fmt(a.hp)}/${T.fmt(a.mhp)}`, tx, y + 22, win.innerW - faceSize - 8, "right");
    win.drawGauge(ctx, tx, y + 42, win.innerW - faceSize - 8, a.hp / Math.max(1, a.mhp), "#40c060", "#a0ffb0");
    return;
  }
  win.drawActorFace(ctx, a.faceName, a.faceIndex, win.innerX, y - 6, 52);
  const tx = win.innerX + 60;
  win.drawText(ctx, `${a.name}  Lv${a.level}`, tx, y + 2);
  const gx = tx + 150;
  win.drawText(ctx, "兵力", gx, y + 2);
  win.drawGauge(ctx, gx + 46, y + 10, 110, a.hp / a.mhp, "#40c060", "#a0ffb0");
  win.drawText(ctx, `${T.fmt(a.hp)}/${T.fmt(a.mhp)}`, gx + 46, y - 12, 110, "right");
  if (!win._compact) {
    win.drawText(ctx, "谋略", gx + 168, y + 2);
    win.drawGauge(ctx, gx + 214, y + 10, 90, a.mhp ? a.mp / Math.max(1, a.mmp) : 0, "#4080ff", "#a0d0ff");
    win.drawText(ctx, `${T.fmt(a.mp)}/${T.fmt(a.mmp)}`, gx + 214, y - 12, 90, "right");
  }
}

/* ---------------- 主菜单 ---------------- */
class Scene_Menu {
  constructor() {
    for (const a of $gameParty.battleMembers()) T.loadFace(a.faceName);   // 菜单预载头像
    this.commandWindow = new Window_Selectable(8, 8, 180, 300);
    this.commandWindow.itemMax = 7;
    this.commandWindow.fontSize = 24;
    this.commands = ["物品", "技能", "装备", "编成", "状态", "存档", "离开"];
    this.statusWindow = new Window_Selectable(196, 8, T.SCREEN_W - 204, T.SCREEN_H - 16);
    this.statusWindow.fontSize = 22;
    this.infoWin = new Window_Base(8, 316, 180, 120);
    this.infoWin.fontSize = 20;
    this.goldWindow = new Window_Gold(8, T.SCREEN_H - 60, 180);
    this.helpText = "";
  }
  update() {
    const cw = this.commandWindow;
    cw.updateInput();
    if (T.Input.triggered("cancel")) { T.SceneManager.popScene(); return; }
    if (T.Input.triggered("ok")) {
      T.AudioManager.playSe({ name: "Ok", volume: 60 });
      switch (cw.index) {
        case 0: T.SceneManager.push(new Scene_Item()); break;
        case 1: {
          const m = $gameParty.battleMembers()[0] || $gameParty.allMembers()[0];
          if (m) T.SceneManager.push(new Scene_Skill(m));
          break;
        }
        case 2: {
          const m = $gameParty.battleMembers()[0] || $gameParty.allMembers()[0];
          if (m) T.SceneManager.push(new Scene_Equip(m));
          break;
        }
        case 3: T.SceneManager.push(new Scene_Lineup()); break;   // G3-R8: 编成
        case 4: {
          const m = $gameParty.battleMembers()[0] || $gameParty.allMembers()[0];
          if (m) T.SceneManager.push(new Scene_Status(m));
          break;
        }
        case 5: T.SceneManager.push(new Scene_Save()); break;
        case 6: T.SceneManager.popScene(); break;
      }
    }
  }
  draw(ctx) {
    T.drawMenuBackdrop(ctx);
    this.commandWindow.draw(ctx);
    this.commandWindow.drawCursorBox(ctx);
    let y = this.commandWindow.innerY + 6;
    for (const c of this.commands) {
      this.commandWindow.drawText(ctx, c, this.commandWindow.innerX + 20, y);
      y += this.commandWindow.lineH();
    }
    /* 右侧内容随当前菜单栏目切换 */
    this.statusWindow.draw(ctx);
    const members = $gameParty.battleMembers();
    const title = this.commands[this.commandWindow.index] || "状态";
    this.statusWindow.drawText(ctx, title, this.statusWindow.innerX, this.statusWindow.innerY + 2,
      this.statusWindow.innerW, "center");
    const x = this.statusWindow.innerX + 12;
    const right = this.statusWindow.innerX + this.statusWindow.innerW - 12;
    let statusY = this.statusWindow.innerY + 44;
    const drawRows = (rows, step = 34) => {
      for (const row of rows) {
        if (statusY > this.statusWindow.y + this.statusWindow.h - 30) break;
        this.statusWindow.drawText(ctx, row[0], x, statusY);
        if (row[1] != null) this.statusWindow.drawText(ctx, String(row[1]), x + 300, statusY, right - x - 300, "right");
        statusY += step;
      }
    };
    switch (this.commandWindow.index) {
      case 0:
        drawRows($gameParty.allItems().filter(it => it && $gameParty.itemCount(it) > 0)
          .map(it => [it.name || "?", `×${$gameParty.itemCount(it)}`]));
        break;
      case 1: {
        const lead = members[0];
        drawRows(lead ? lead.skills().map(skill => [skill.name, `${T.skillCost(skill)} 谋点`]) : []);
        break;
      }
      case 2: {
        const lead = members[0];
        drawRows(lead ? T.$dataSystem.equipTypes.slice(1).map((slotName, i) => {
          const equip = lead.equipAt(i + 1);
          return [slotName || `槽${i + 1}`, equip ? equip.name : "----"];
        }) : []);
        break;
      }
      case 3:
        drawRows($gameParty.allMembers().map((actor, i) => [
          i < T.MAX_BATTLE_MEMBERS ? `出战 ${actor.name}` : `候补 ${actor.name}`,
          `Lv${actor.level}`,
        ]));
        break;
      case 4: {
        let ry = this.statusWindow.innerY + 42;
        for (const actor of members) {
          drawActorRow(this.statusWindow, ctx, actor, ry);
          ry += 92;
        }
        break;
      }
      case 5:
        drawRows([0, 1, 2, 3].map(i => {
          const info = T.saveInfo(i);
          return [`记录 ${i + 1}`, info ? `金 ${T.fmt(info.party.gold)}` : "---- 空 ----"];
        }), 42);
        break;
      default:
        drawRows(members.map(actor => [actor.name, `兵力 ${T.fmt(actor.hp)}`]));
        break;
    }
    this.infoWin.draw(ctx);
    const lead = members[0];
    if (lead) {
      const nextExp = Math.max(0, lead.expForLevel(lead.level + 1) - lead.exp);
      this.infoWin.drawText(ctx, `等级 ${lead.level}`, this.infoWin.innerX + 8, this.infoWin.innerY + 4);
      this.infoWin.drawText(ctx, `升级 ${T.fmt(nextExp)}`, this.infoWin.innerX + 8, this.infoWin.innerY + 28);
      this.infoWin.drawText(ctx, `难度 标准`, this.infoWin.innerX + 8, this.infoWin.innerY + 52);
      this.infoWin.drawText(ctx, `阵型 ${T.$gameParty.formationName() || "无"}`, this.infoWin.innerX + 8, this.infoWin.innerY + 76);
    }
    this.goldWindow.draw(ctx);
  }
}

/* ---------------- 物品 ---------------- */
class Scene_Item {
  constructor() {
    for (const a of $gameParty.battleMembers()) T.loadFace(a.faceName);
    this.window = new Window_Selectable(8, 8, 500, T.SCREEN_H - 16);
    this.window.fontSize = 20;   // 行高更紧凑，一屏能看到更多物品
    this.descWindow = new Window_Base(514, 8, T.SCREEN_W - 522, 120);
    this.memberWindow = new Window_Selectable(514, 132, T.SCREEN_W - 522, T.SCREEN_H - 140);
    this.memberWindow.fontSize = 20;
    this.memberWindow._compact = true;
    this.actionWindow = new Window_Selectable(514, 132, T.SCREEN_W - 522, 170);
    this.actionWindow.fontSize = 22;
    this.actionWindow.itemMax = 0;
    this.actionWindow.active = false;
    this.mode = "list";
    this.pendingItem = null;
    this.refreshList();
  }
  refreshList() {
    const current = Array.isArray(this.items) ? this.items[this.window.index] : null;
    const currentIndex = Number.isFinite(this.window.index) ? this.window.index : 0;
    this.items = $gameParty.allItems()
      .filter(i => i && $gameParty.itemCount(i) > 0);
    this.window.itemMax = this.items.length;
    const same = current ? this.items.findIndex(i => i.id === current.id &&
      (T.$dataItems.includes(i) === T.$dataItems.includes(current)) &&
      (T.$dataWeapons.includes(i) === T.$dataWeapons.includes(current))) : -1;
    this.window.index = same >= 0 ? same : T.clamp(currentIndex, 0, Math.max(0, this.items.length - 1));
  }
  currentItem() { return this.items[this.window.index]; }
  isConsumable(item) { return !!item && T.$dataItems.includes(item); }
  requiresDeadTarget(item) {
    const scope = item?.scope ?? item?.damage?.scope;
    return scope === 9 || /招魂|复活/.test(item?.name || "");
  }
  isRevivalItem(item) {
    const scope = item?.scope ?? item?.damage?.scope;
    return [9, 10, 13].includes(scope) || /招魂|复活|七星灯/.test(item?.name || "");
  }
  targetMembers() {
    const all = $gameParty.battleMembers();
    if (this.requiresDeadTarget(this.pendingItem)) return all.filter(actor => actor.isDead());
    return this.isRevivalItem(this.pendingItem) ? all : all.filter(actor => !actor.isDead());
  }
  itemKindName(item) {
    if (T.$dataWeapons.includes(item)) return "武器";
    if (T.$dataArmors.includes(item)) return "防具";
    return "道具";
  }
  openItemActions(item) {
    this.pendingItem = item;
    this.actionOptions = [];
    if (this.isConsumable(item)) this.actionOptions.push("使用");
    this.actionOptions.push("丢弃 1 个", "取消");
    this.actionWindow.itemMax = this.actionOptions.length;
    this.actionWindow.index = 0;
    this.actionWindow.active = true;
    this.mode = "action";
  }
  discardItem(item) {
    if (!item || $gameParty.itemCount(item) <= 0) return false;
    $gameParty.loseItem(item, 1);
    T.$gameMessage.add(`丢弃「${item.name}」×1`);
    T.AudioManager.playSe({ name: "Cancel", volume: 50 });
    this.pendingItem = null;
    this.refreshList();
    return true;
  }
  update() {
    if (this.mode === "list") {
      this.window.updateInput();
      if (T.Input.triggered("cancel")) { T.SceneManager.popScene(); return; }
      if (!this.items.length) { if (T.Input.triggered("ok")) T.SceneManager.popScene(); return; }
      if (T.Input.triggered("ok")) {
        this.openItemActions(this.currentItem());
        T.AudioManager.playSe({ name: "Cursor", volume: 50 });
      }
      return;
    }
    if (this.mode === "action") {
      this.actionWindow.updateInput();
      if (T.Input.triggered("cancel")) { this.pendingItem = null; this.mode = "list"; return; }
      if (T.Input.triggered("ok")) {
        const choice = this.actionOptions[this.actionWindow.index];
        if (choice === "使用" && this.isConsumable(this.pendingItem) && $gameParty.battleMembers().some(a => !a.isDead())) {
          this.mode = "target";
          this.memberWindow.active = true;
          this.memberWindow.index = 0;
          this.actionWindow.active = false;
          return;
        }
        if (choice === "丢弃 1 个") {
          this.discardItem(this.pendingItem);
          this.mode = "list";
          return;
        }
        this.pendingItem = null;
        this.mode = "list";
      }
      return;
    }
    if (this.mode === "target") {
      this.memberWindow.updateInput();
      if (T.Input.triggered("cancel")) { this.memberWindow.active = false; this.mode = "action"; this.actionWindow.active = true; return; }
      if (T.Input.triggered("ok")) {
        const members = this.targetMembers();
        const item = this.pendingItem;
        const target = members[this.memberWindow.index % members.length];
        const validTarget = target && (this.requiresDeadTarget(item) ? target.isDead() : !target.isDead());
        if (item && validTarget && this.useItem(item, target)) {
          $gameParty.consumeItem(item);
          T.AudioManager.playSe({ name: "Recovery", volume: 80 });
          T.$gameMessage.add(`使用「${item.name}」！`);
          this.memberWindow.active = false;
          this.pendingItem = null;
          this.refreshList();
          this.mode = "list";
        } else T.AudioManager.playSe({ name: "Buzzer", volume: 60 });
      }
    }
  }
  useItem(item, target) {
    let used = false;
    for (const eff of item.effects || []) {
      switch (eff.code) {
        case 11:
          const v = Math.round(eff.value1 * target.mhp + eff.value2);
          target.hp += v; used = true;
          if (target.isDead() && target.hp > 0) target.revive(); break;
        case 12: target.mp += eff.value1 * target.mmp + eff.value2; used = true; break;
        case 21: if (!target.isStateAffected(eff.dataId)) { target.addStateRaw(eff.dataId); used = true; } break;
        case 22: target.removeStateRaw(eff.dataId); used = true; break;
        case 42: { /* G3-R3: 永久成长（蛇胆/武力石等）菜单使用 */
          target.growParam(eff.dataId, eff.value1);
          T.$gameMessage.add(`${target.name} 的${["兵力","谋点","武力","智力","防御","抗智","速度","统率"][eff.dataId] || "能力"}提升了！`);
          used = true; break;
        }
        case 44: { const msgs = T.runMapCommonEvent(eff.dataId); for (const mt of msgs) T.$gameMessage.add(mt); used = true; break; }   // G5: 公共事件类道具（护身烟/强身烟）
      }
    }
    return used;
  }
  draw(ctx) {
    T.drawMenuBackdrop(ctx);
    this.window.draw(ctx);
    let y = this.window.innerY + 4 - this.window.topRow * this.window.itemHeight();
    for (let i = 0; i < this.items.length; i++) {
      if (y > this.window.y + this.window.h - 30 || y < this.window.y - 40) { y += this.window.itemHeight(); continue; }
      const it = this.items[i];
      this.window.drawText(ctx, it.name || "?", this.window.innerX + 8, y);
      this.window.drawText(ctx, `×${$gameParty.itemCount(it)}`,
        this.window.innerX + 300, y, 100, "right");
      y += this.window.itemHeight();
    }
    this.window.drawCursorBox(ctx);
    this.descWindow.draw(ctx);
    const it = this.currentItem();
    if (it) this.descWindow.drawRichText(ctx, it.description || it.name, this.descWindow.innerX, this.descWindow.innerY + 8);
    if (this.mode === "target") {
      this.memberWindow.draw(ctx);
      let ry = this.memberWindow.innerY + 8;
      const members = this.targetMembers();
      for (let i = 0; i < members.length; i++) {
        drawActorRow(this.memberWindow, ctx, members[i], ry + i * 88);
        if (i === this.memberWindow.index % members.length) {
          ctx.save();
          ctx.strokeStyle = "#ffd24d"; ctx.lineWidth = 2;
          ctx.strokeRect(this.memberWindow.innerX + 2, ry + i * 88 - 8, this.memberWindow.w - 6, 84);
          ctx.restore();
        }
      }
    } else if (this.mode === "action") {
      this.actionWindow.draw(ctx);
      this.actionWindow.drawText(ctx, `${this.itemKindName(this.pendingItem)}：${this.pendingItem?.name || ""}`,
        this.actionWindow.innerX + 8, this.actionWindow.innerY + 4, this.actionWindow.innerW - 16);
      let ay = this.actionWindow.innerY + 42;
      for (const option of this.actionOptions) {
        this.actionWindow.drawText(ctx, option, this.actionWindow.innerX + 18, ay);
        ay += this.actionWindow.itemHeight();
      }
      const cx = this.actionWindow.x + 8;
      const cy = this.actionWindow.innerY + 34 + this.actionWindow.index * this.actionWindow.itemHeight();
      ctx.save();
      ctx.fillStyle = "rgba(120,170,255,0.22)";
      T.roundRect(ctx, cx, cy, this.actionWindow.w - 16, this.actionWindow.itemHeight() - 4, 5, true);
      ctx.strokeStyle = "rgba(190,215,255,0.85)";
      ctx.lineWidth = 2;
      T.roundRect(ctx, cx, cy, this.actionWindow.w - 16, this.actionWindow.itemHeight() - 4, 5, false, true);
      ctx.restore();
    }
  }
}

/* ---------------- 技能 ---------------- */
class Scene_Skill {
  constructor(actor) {
    this.members = $gameParty.battleMembers();
    this.memberIndex = Math.max(0, this.members.indexOf(actor));
    this.actor = this.members[this.memberIndex] || actor;
    for (const a of this.members) T.loadFace(a.faceName);
    this.mode = "list";
    this.typeWindow = new Window_Selectable(8, 8, 220, 96);
    this.listWindow = new Window_Selectable(8, 108, 500, T.SCREEN_H - 116);
    this.listWindow.fontSize = 22;
    this.descWindow = new Window_Base(514, 8, T.SCREEN_W - 522, 130);
    this.memberWindow = new Window_Selectable(514, 142, T.SCREEN_W - 522, T.SCREEN_H - 150);
    this.memberWindow.fontSize = 22;
    this.types = ["攻击", ...[...actor.addedSkillTypes()].map(id => T.$dataSystem.skillTypes[id]).filter(Boolean)];
    this.typeIndex = 0;
    this.refresh();
  }
  refresh() {
    const stype = this.types[this.typeIndex] || null;
    /* "攻击" 页签（第一个）显示全部可用技能 */
    const stypeId = this.typeIndex === 0 || !stype ? null : T.$dataSystem.skillTypes.indexOf(stype);
    this.skills = this.actor.usableSkills(stypeId == null ? undefined : stypeId);
    this.listWindow.itemMax = this.skills.length;
    this.listWindow.index = 0;
  }
  skillScope(skill) { return skill?.scope ?? skill?.damage?.scope ?? 1; }
  isRevivalSkill(skill) {
    return [9, 10].includes(this.skillScope(skill)) || /复活|招魂/.test(skill?.name || "");
  }
  skillTargetMembers(skill = this.pendingSkill) {
    const members = this.members || [];
    const scope = this.skillScope(skill);
    if (scope === 9) return members.filter(actor => actor.isDead());
    if (scope === 10) return members.filter(actor => actor.isDead());
    return members.filter(actor => !actor.isDead());
  }
  skillNeedsTarget(skill) {
    return [7, 9, 12, 14].includes(this.skillScope(skill));
  }
  skillTargetsAvailable(skill) {
    const scope = this.skillScope(skill);
    if ([8, 10].includes(scope)) return this.skillTargetMembers(skill).length > 0;
    return this.skillTargetMembers(skill).length > 0;
  }
  isEnemySkill(skill) {
    return [1, 2].includes(this.skillScope(skill));
  }
  update() {
    if (this.mode === "target") {
      this.memberWindow.updateInput();
      if (T.Input.triggered("cancel")) {
        this.mode = "list";
        this.pendingSkill = null;
        this.memberWindow.active = false;
        T.AudioManager.playSe({ name: "Cancel", volume: 50 });
        return;
      }
      if (T.Input.triggered("ok")) {
        const members = this.skillTargetMembers(this.pendingSkill);
        if (!members.length) {
          this.mode = "list";
          this.pendingSkill = null;
          this.memberWindow.active = false;
          T.AudioManager.playSe({ name: "Buzzer", volume: 50 });
          return;
        }
        const t = members[this.memberWindow.index % members.length];
        this.applySkillOutOfBattle(this.pendingSkill, [t]);
        this.mode = "list";
        this.pendingSkill = null;
        this.memberWindow.active = false;
      }
      return;
    }
    if (this.typeWindow.active) {
      const prev = this.typeIndex;
      if (T.Input.repeated("left")) this.typeIndex = Math.max(0, this.typeIndex - 1);
      if (T.Input.repeated("right")) this.typeIndex = Math.min(this.types.length - 1, this.typeIndex + 1);
      if (prev !== this.typeIndex) { this.refresh(); return; }
      if (T.Input.triggered("down")) { this.typeWindow.active = false; this.listWindow.active = true; }
    } else {
      this.listWindow.updateInput();
      if (T.Input.triggered("up") && this.listWindow.index === 0) { this.typeWindow.active = true; this.listWindow.active = false; }
    }
    if (T.Input.triggered("cancel")) { T.SceneManager.popScene(); return; }
    if (T.Input.repeated("pageup")) { this.memberIndex = (this.memberIndex - 1 + this.members.length) % this.members.length; this.actor = this.members[this.memberIndex]; this.refresh(); T.AudioManager.playSe({ name: "Cursor", volume: 50 }); return; }
    if (T.Input.repeated("pagedown")) { this.memberIndex = (this.memberIndex + 1) % this.members.length; this.actor = this.members[this.memberIndex]; this.refresh(); T.AudioManager.playSe({ name: "Cursor", volume: 50 }); return; }
    if (T.Input.triggered("ok")) {
      const s = this.skills[this.listWindow.index];
      if (!s) { T.AudioManager.playSe({ name: "Buzzer", volume: 50 }); return; }
      const scope = this.skillScope(s);
      if (this.isEnemySkill(s)) {   // 攻击敌方类：战斗外不可用
        T.AudioManager.playSe({ name: "Buzzer", volume: 50 });
        T.$gameMessage.add("该技能只能在战斗中使用！");
        return;
      }
      if (this.actor.mp < T.skillCost(s)) { T.AudioManager.playSe({ name: "Buzzer", volume: 50 }); T.$gameMessage.add("谋点不足！"); return; }
      if (this.skillNeedsTarget(s)) {     // 单体我方/阵亡我方：选目标
        if (!this.skillTargetsAvailable(s)) {
          T.AudioManager.playSe({ name: "Buzzer", volume: 50 });
          T.$gameMessage.add(this.isRevivalSkill(s) ? "没有阵亡的武将可供复活！" : "没有可用的目标！");
          return;
        }
        this.pendingSkill = s;
        this.mode = "target";
        this.memberWindow.active = true;
        this.memberWindow.itemMax = this.skillTargetMembers(s).length;
        this.memberWindow.index = 0;
        T.AudioManager.playSe({ name: "Cursor", volume: 50 });
        return;
      } else {                              // 自身/全体
        const targets = [8, 10].includes(scope) ? this.skillTargetMembers(s) : [this.actor];
        if (!targets.length) {
          T.AudioManager.playSe({ name: "Buzzer", volume: 50 });
          T.$gameMessage.add(scope === 10 ? "没有阵亡的武将可供复活！" : "没有可用的目标！");
          return;
        }
        this.applySkillOutOfBattle(s, targets);
      }
    }
  }
  applySkillOutOfBattle(skill, targets) {
    this.actor.paySkillCost(skill);
    T.$gameMessage.add("使用「" + skill.name + "」！");
    const dmg = skill.damage || {};
    for (const target of targets) {
      /* damage 型恢复（赤心计等 kind=3/4） */
      if (dmg.type === 3 || dmg.type === 4) {
        try {
          let v = T.evalFormula(dmg.formula, this.actor, target);
          v = Math.max(0, Math.round(v));
          if (dmg.type === 3) {
            target.hp += v;
            if (target.isDead() && target.hp > 0) target.revive();
            T.$gameMessage.add("「" + target.name + "」恢复了 " + v + " 兵力");
          } else { target.mp += v; }
        } catch (e) { console.warn("skill-menu-formula:", e.message); }
      }
      for (const eff of skill.effects || []) {
        switch (eff.code) {
          case 11: {
            const v = Math.round(eff.value1 * target.mhp + eff.value2);
            target.hp += v;
            if (target.isDead() && target.hp > 0) target.revive();
            T.$gameMessage.add("「" + target.name + "」恢复了 " + v + " 兵力");
            break;
          }
          case 12: { target.mp += Math.round(eff.value1 * target.mmp + eff.value2); break; }
          case 21: if (!target.isStateAffected(eff.dataId)) target.addStateRaw(eff.dataId); break;
          case 22: target.removeStateRaw(eff.dataId); break;
          case 31: target.addBuff(eff.dataId, eff.value2 || 3, false); break;
          case 32: target.addBuff(eff.dataId, eff.value2 || 3, true); break;
          case 44: {
            const msgs = T.runMapCommonEvent(eff.dataId);
            for (const mt of msgs) T.$gameMessage.add(mt);
            break;
          }
        }
      }
    }
    T.AudioManager.playSe({ name: "Recovery", volume: 80 });
    this.refresh();
  }
  draw(ctx) {
    T.drawMenuBackdrop(ctx);
    this.actorWindow = this.actorWindow || (() => {
      const w = new Window_Base(T.SCREEN_W - 300, T.SCREEN_H - 160, 292, 152);
      w.fontSize = 22; return w;
    })();
    this.actorWindow._compact = true;
    this.typeWindow.draw(ctx);
    let ty = this.typeWindow.innerY + 4;
    this.types.forEach((tname, i) => {
      this.typeWindow.drawText(ctx, tname, this.typeWindow.innerX + 8 + i * 100, ty);
    });
    if (this.typeWindow.active) {
      this.typeWindow.save = null;
      ctx.save();
      ctx.strokeStyle = "#ffd24d"; ctx.lineWidth = 2;
      ctx.strokeRect(this.typeWindow.innerX + 4 + this.typeIndex * 100, this.typeWindow.y + 4,
        92, this.typeWindow.h - 8);
      ctx.restore();
    }
    this.listWindow.draw(ctx);
    const ih = this.listWindow.itemHeight();
    let y = this.listWindow.innerY + 4 - this.listWindow.topRow * ih;
    for (let i = 0; i < this.skills.length; i++) {
      const s = this.skills[i];
      this.listWindow.drawText(ctx, s.name, this.listWindow.innerX + 8, y);
      this.listWindow.drawText(ctx, `${T.skillCost(s)}`, this.listWindow.innerX + 380, y, 80, "right");
      y += ih;
    }
    this.listWindow.drawCursorBox(ctx);
    this.descWindow.draw(ctx);
    const s = this.skills[this.listWindow.index];
    if (s) {
      this.descWindow.drawRichText(ctx, s.description || s.message1 || s.name,
        this.descWindow.innerX, this.descWindow.innerY + 8);
    }
    if (this.mode !== "target") {
      this.actorWindow.draw(ctx);
      drawActorRow(this.actorWindow, ctx, this.actor, this.actorWindow.innerY + 26);
      this.actorWindow.drawText(ctx, "U/I 切换武将", this.actorWindow.innerX + 8, this.actorWindow.h - 26, 240, "left");
    }
    if (this.mode === "target") {
      const members = this.skillTargetMembers(this.pendingSkill);
      this.memberWindow._compact = true;
      this.memberWindow.itemMax = members.length;
      this.memberWindow.draw(ctx);
      this.memberWindow.drawText(ctx,
        `${this.isRevivalSkill(this.pendingSkill) ? "选择复活对象" : "选择目标"}：${this.pendingSkill?.name || ""}`,
        this.memberWindow.innerX + 8, this.memberWindow.innerY + 4, this.memberWindow.innerW - 16);
      const rowHeight = 72;
      let ry = this.memberWindow.innerY + 38;
      for (let i = 0; i < members.length; i++) {
        drawActorRow(this.memberWindow, ctx, members[i], ry + i * rowHeight);
      }
      const idx = members.length ? this.memberWindow.index % members.length : -1;
      ctx.save();
      if (idx >= 0) {
        ctx.strokeStyle = "#ffd24d"; ctx.lineWidth = 2;
        ctx.strokeRect(this.memberWindow.innerX + 2, this.memberWindow.innerY + 30 + idx * rowHeight,
          this.memberWindow.w - 6, 64);
      }
      ctx.restore();
    }
  }
}

/* ---------------- 装备 ---------------- */
class Scene_Equip {
  constructor(actor) {
    this.actor = actor;
    this.slotNames = T.$dataSystem.equipTypes;
    this.mode = "slot";   // slot | item | member
    this.slotWin = new Window_Selectable(8, 8, 320, 320);
    this.slotWin.fontSize = 22;
    this.itemWin = new Window_Selectable(332, 8, T.SCREEN_W - 340, T.SCREEN_H - 16);
    this.itemWin.fontSize = 22;
    this.candidates = [];
    this.statWin = new Window_Base(8, 336, 320, T.SCREEN_H - 344);
    this.statWin.fontSize = 20;
    this.rebuildSlots();
  }
  currentSlot() { return this.slots[this.slotWin.index]; }
  rebuildSlots() {
    /* G3: 显示全部 8 个槽位（武器/盾/头/身/坐骑/副将/饰品/饰品2），
       否则空槽位永远无法装备第一件坐骑/副将/饰品 */
    this.slots = [];
    for (let i = 1; i < this.slotNames.length; i++) this.slots.push(i);
    this.slotWin.itemMax = this.slots.length;
    this.slotWin.index = 0;
  }
  refreshCandidates() {
    const slot = this.currentSlot();
    const cur = this.actor.equipAt(slot);
    this.candidates = [null];   // 卸下
    let list;
    if (slot === 1) {
      list = $gameParty.weapons();
    } else {
      list = $gameParty.armors().filter(ar => ar && ar.etypeId === slot);
    }
    /* 库存记录的是未装备数量；其他武将装备同名物品不应屏蔽玩家手里的额外副本。 */
    /* 已装备的物品即使不在库存也加入候选（否则初始装备永远不可见） */
    if (cur && !list.some(it => it && it.id === cur.id)) list.push(cur);
    for (const it of list) this.candidates.push(it);
    this.curEquipId = cur ? cur.id : 0;
    this.itemWin.itemMax = this.candidates.length;
    this.itemWin.index = Math.max(0, this.candidates.findIndex(c => c && c.id === this.curEquipId));
  }
  paramPreview(item) {
    const old = this.actor.equipAt(this.currentSlot());
    const slot = this.currentSlot();
    this.actor.changeEquip(slot, item ? item.id : 0);
    const after = { atk: this.actor.atk, def: this.actor.def, mat: this.actor.mat, mdf: this.actor.mdf, agi: this.actor.agi };
    this.actor.changeEquip(slot, old ? old.id : 0);
    return after;
  }
  update() {
    if (T.Input.repeated("pageup") || T.Input.repeated("pagedown")) {
      const mem = $gameParty.battleMembers();
      const i = mem.indexOf(this.actor);
      const d = T.Input.pressed("pageup") ? -1 : 1;
      this.actor = mem[(i + d + mem.length) % mem.length] || this.actor;
      this.mode = "slot";
      this.rebuildSlots();
      return;
    }
    if (this.mode === "slot") {
      this.slotWin.updateInput();
      this.refreshCandidates();
      if (T.Input.triggered("ok")) { this.mode = "item"; }
      else if (T.Input.triggered("cancel")) { T.SceneManager.popScene(); return; }
    } else {
      this.itemWin.updateInput();
      if (T.Input.triggered("ok")) {
        const sel = this.candidates[this.itemWin.index];
        const old = this.actor.equipAt(this.currentSlot());
        this.actor.changeEquip(this.currentSlot(), sel ? sel.id : 0);
        if (old) $gameParty.gainItem(old, 1);
        if (sel) $gameParty.loseItem(sel, 1);
        T.AudioManager.playSe({ name: "Equip1", volume: 70 });
        this.mode = "slot";
      } else if (T.Input.triggered("cancel")) this.mode = "slot";
    }
  }
  draw(ctx) {
    T.drawMenuBackdrop(ctx);
    this.slotWin.draw(ctx);
    const sh = this.slotWin.itemHeight();
    let y = this.slotWin.innerY + 6;
    for (const slot of this.slots) {
      const nm = this.slotNames[slot] || `槽${slot}`;
      const eq = this.actor.equipAt(slot);
      this.slotWin.drawText(ctx, `${nm}:`, this.slotWin.innerX + 8, y);
      this.slotWin.drawText(ctx, eq ? eq.name : "----", this.slotWin.innerX + 90, y);
      y += sh;
    }
    if (this.mode === "slot") this.drawSlotCursor(ctx);
    this.statWin.draw(ctx);
    const a = this.actor;
    this.statWin.drawActorFace(ctx, a.faceName, a.faceIndex, this.statWin.innerX + 8, this.statWin.innerY + 2, 48);
    this.statWin.drawText(ctx, `${a.name} 的装备`, this.statWin.innerX + 68, this.statWin.innerY + 10);
    const rows = [
      `武力 ${a.atk}`, `防御 ${a.def}`, `谋略 ${a.mat}`, `智力 ${a.mdf}`,
      `速度 ${a.agi}`, `兵力 ${a.hp}/${a.mhp}`,
    ];
    let sy = this.statWin.innerY + 62;
    for (const r of rows) { this.statWin.drawText(ctx, r, this.statWin.innerX + 10, sy); sy += 28; }
    if (this.mode === "item") {
      this.itemWin.draw(ctx);
      const ih2 = this.itemWin.itemHeight();
      let iy = this.itemWin.innerY + 4 - this.itemWin.topRow * ih2;
      for (let i = 0; i < this.candidates.length; i++) {
        const it = this.candidates[i];
        this.itemWin.drawText(ctx, it ? it.name : "卸下", this.itemWin.innerX + 8, iy);
        iy += ih2;
      }
      this.itemWin.drawCursorBox(ctx);
      /* 选中候选时显示属性变化预览 */
      const sel = this.candidates[this.itemWin.index];
      const cur = this.actor.equipAt(this.currentSlot());
      if (sel || cur) {
        const prev = this.paramPreview(sel);
        const base = { atk: this.actor.atk, def: this.actor.def, mat: this.actor.mat, mdf: this.actor.mdf, agi: this.actor.agi };
        const labels = [["武力", "atk"], ["防御", "def"], ["谋略", "mat"], ["智力", "mdf"], ["速度", "agi"]];
        const py = this.itemWin.y + this.itemWin.h - 116;
        ctx.save();
        ctx.fillStyle = "rgba(16,24,48,0.9)";
        ctx.fillRect(this.itemWin.x + 4, py, this.itemWin.w - 8, 108);
        ctx.font = T.fontStr(20);
        ctx.fillStyle = "#cfd8ff";
        ctx.fillText("装备属性预览", this.itemWin.x + 16, py + 24);
        for (let li = 0; li < labels.length; li++) {
          const [nm, key] = labels[li];
          const d = Math.round(prev[key] - base[key]);
          ctx.fillStyle = d > 0 ? "#7dfa8a" : d < 0 ? "#ff9a9a" : "#9fb0d0";
          const col = li % 2, row = Math.floor(li / 2);
          ctx.fillText(`${nm} ${base[key]} → ${prev[key]}${d !== 0 ? ` (${d > 0 ? "+" : ""}${d})` : ""}`,
            this.itemWin.x + 16 + col * 250, py + 50 + row * 24);
        }
        ctx.restore();
      }
    }
  }
  drawSlotCursor(ctx) {
    const idx = this.slotWin.index;
    const ih = this.slotWin.itemHeight();
    const x = this.slotWin.x + 4, y = this.slotWin.y + 8 + idx * ih;
    ctx.save();
    ctx.strokeStyle = "rgba(190,215,255,0.85)"; ctx.lineWidth = 2;
    ctx.strokeRect(x, y, this.slotWin.w - 8, ih - 4);
    ctx.restore();
  }
}

/* ---------------- 状态 ---------------- */
class Scene_Status {
  constructor(actor) {
    this.members = $gameParty.battleMembers();
    this.memberIndex = Math.max(0, this.members.indexOf(actor));
    this.actor = this.members[this.memberIndex] || actor;
    T.loadFace(this.actor.faceName);
    this.win = new Window_Base(8, 8, T.SCREEN_W - 16, T.SCREEN_H - 16); this.win.fontSize = 24;
  }
  switchMember(d) {
    if (this.members.length < 2) return;
    this.memberIndex = (this.memberIndex + d + this.members.length) % this.members.length;
    this.actor = this.members[this.memberIndex];
    T.loadFace(this.actor.faceName);
    T.AudioManager.playSe({ name: "Cursor", volume: 50 });
  }
  update() {
    if (T.Input.repeated("pageup")) this.switchMember(-1);
    else if (T.Input.repeated("pagedown")) this.switchMember(1);
    if (T.Input.triggered("cancel") || T.Input.triggered("ok")) T.SceneManager.popScene();
  }
  draw(ctx) {
    T.drawMenuBackdrop(ctx);
    this.win.draw(ctx);
    const a = this.actor;
    this.win.drawActorFace(ctx, a.faceName, a.faceIndex, this.win.innerX, this.win.innerY, 144);
    const cx = this.win.innerX + 170;
    let y = this.win.innerY + 4;
    this.win.drawText(ctx, `${a.name}`, cx, y); y += 44;
    if (this.members.length > 1) { this.win.drawText(ctx, "U/I 切换武将", this.win.innerX + 8, this.win.h - 40, 260, "left"); }
    this.win.drawText(ctx, `等级 ${a.level}`, cx, y); y += 44;
    this.win.drawText(ctx, a.profile || "", cx, y); y += 44;
    const stats = [
      ["最大兵力", T.fmt(a.mhp)], ["谋略上限", T.fmt(a.mmp)],
      ["武力", a.atk], ["防御", a.def], ["谋略", a.mat], ["智略", a.mdf],
      ["速度", a.agi], ["运气", a.luk],
    ];
    let sx = this.win.innerX + 20; let sy = y + 20;
    for (const [k, v] of stats) {
      this.win.drawText(ctx, `${k}`, sx, sy);
      this.win.drawText(ctx, String(v), sx + 150, sy, 140, "right");
      sy += 38;
      if (sy > this.win.h - 60) { sy = y + 20; sx += 330; }
    }
  }
}

/* ---------------- 军物品合成（役店 BrotherJie_ItemSynthesis） ---------------- */
class Scene_Synthesis {
  constructor() {
    this.rec = (T._synthRecipes || [])[T._synthRecipes.length - 1] || { mats: [], prods: [] };
    this.lwin = new Window_Selectable(8, 60, 320, T.SCREEN_H - 68);
    this.rwin = new Window_Base(336, 60, T.SCREEN_W - 344, T.SCREEN_H - 68);
    this.lwin.fontSize = 20; this.rwin.fontSize = 18;
    this.lwin.itemMax = Math.max(1, this.rec.prods.length);
    this.lwin.index = 0;
    T.AudioManager.playSe({ name: "Equip1", volume: 60 });
  }
  canCraft() { return $gameParty.canSynth(this.rec.mats); }
  update() {
    if (T.Input.triggered("cancel")) { T.AudioManager.playSe({ name: "Cancel", volume: 50 }); T.SceneManager.popScene(); return; }
    this.lwin.updateInput();
    if (T.Input.triggered("ok")) {
      const prod = this.rec.prods[this.lwin.index];
      if (!prod) { T.SceneManager.popScene(); return; }
      if (this.canCraft()) {
        const ok = $gameParty.synth(this.rec.mats, prod);
        if (ok) {
          T.$gameMessage.add(`合成「${prod.name}」成功！`);
          T.AudioManager.playSe({ name: "Shop", volume: 80 });
        } else T.AudioManager.playSe({ name: "Buzzer", volume: 60 });
      } else T.AudioManager.playSe({ name: "Buzzer", volume: 60 });
    }
  }
  draw(ctx) {
    T.drawMenuBackdrop(ctx);
    this.lwin.draw(ctx); this.rwin.draw(ctx);
    this.lwin.drawText(ctx, "—— 合成品类 ——", this.lwin.innerX, this.lwin.innerY + 2, this.lwin.innerW, "center");
    let y = this.lwin.innerY + 24;
    for (let i = 0; i < this.rec.prods.length; i++) {
      if (y > this.lwin.y + this.lwin.h - 24) break;
      const p = this.rec.prods[i];
      const owned = $gameParty.itemCount(p);
      this.lwin.drawText(ctx, p.name || "？", this.lwin.innerX + 8, y);
      this.lwin.drawText(ctx, `×${owned}`, this.lwin.innerX + 240, y, 70, "right");
      y += this.lwin.itemHeight();
    }
    this.lwin.drawCursorBox(ctx);
    this.rwin.drawText(ctx, "—— 所需材料 ——", this.rwin.innerX, this.rwin.innerY + 2, this.rwin.innerW, "center");
    let ry = this.rwin.innerY + 30;
    for (const m of this.rec.mats) {
      if (ry > this.rwin.y + this.rwin.h - 30) break;
      const owned = $gameParty.itemCount(m);
      const has = owned >= 1;
      ctx.fillStyle = has ? "#7CFC00" : "#ff6b6b";
      this.rwin.drawText(ctx, `${has ? "✓" : "✗"} ${m.name}`, this.rwin.innerX + 8, ry);
      this.rwin.drawText(ctx, `×${owned}`, this.rwin.innerX + 200, ry, 60, "right");
      ry += 26;
    }
    ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(8, T.SCREEN_H - 34, T.SCREEN_W - 16, 28);
    ctx.fillStyle = "#ffd24d"; ctx.font = "18px 'PingFang SC',sans-serif";
    ctx.fillText("回车 → 合成     Esc 关闭", 16, T.SCREEN_H - 14);
  }
}

/* ---------------- 仓库（插件 BrotherJie_MenuBase/CallActorStorage） ---------------- */
class Scene_Storage {
  constructor() {
    for (const a of $gameParty.battleMembers()) T.loadFace(a.faceName);
    this.lwin = new Window_Selectable(8, 60, 400, T.SCREEN_H - 68);
    this.rwin = new Window_Selectable(416, 60, T.SCREEN_W - 424, T.SCREEN_H - 68);
    this.lwin.fontSize = 18; this.rwin.fontSize = 18;
    this.side = 0;   // 0=背包 1=仓库
    this.refresh();
    T.AudioManager.playSe({ name: "Equip1", volume: 60 });
  }
  refresh() {
    this.bag = $gameParty.allItems().filter(i => i && $gameParty.itemCount(i) > 0);
    this.sto = $gameParty.storageAll();
    this.lwin.itemMax = this.bag.length;
    this.rwin.itemMax = this.sto.length;
    this.lwin.index = T.clamp(this.lwin.index || 0, 0, Math.max(0, this.bag.length - 1));
    this.rwin.index = T.clamp(this.rwin.index || 0, 0, Math.max(0, this.sto.length - 1));
  }
  update() {
    if (T.Input.triggered("cancel")) { T.AudioManager.playSe({ name: "Cancel", volume: 50 }); T.SceneManager.popScene(); return; }
    if (T.Input.triggered("left")) { this.side = 0; this.lwin.updateInput(); return; }
    if (T.Input.triggered("right")) { this.side = 1; this.rwin.updateInput(); return; }
    const w = this.side === 0 ? this.lwin : this.rwin;
    w.updateInput();
    if (T.Input.triggered("ok")) {
      const it = this.side === 0 ? this.bag[w.index] : this.sto[w.index];
      if (!it) return;
      if (this.side === 0) {
        const n = $gameParty.itemCount(it);
        if (n <= 0) return;
        $gameParty.loseItem(it, n); $gameParty.storageGain(it, n);
        T.$gameMessage.add(`存入「${it.name}」×${n}`);
      } else {
        const n = $gameParty.storageCount(it);
        if (n <= 0) return;
        $gameParty.storageLose(it, n); $gameParty.gainItem(it, n);
        T.$gameMessage.add(`取出「${it.name}」×${n}`);
      }
      T.AudioManager.playSe({ name: "Equip1", volume: 70 });
      this.refresh();
    }
  }
  draw(ctx) {
    T.drawMenuBackdrop(ctx);
    this.lwin.draw(ctx); this.rwin.draw(ctx);
    this.lwin.drawText(ctx, "—— 背包 ——", this.lwin.innerX, this.lwin.innerY + 2, this.lwin.innerW, "center");
    this.rwin.drawText(ctx, "—— 仓库 ——", this.rwin.innerX, this.rwin.innerY + 2, this.rwin.innerW, "center");
    let y = this.lwin.innerY + 24;
    for (let i = 0; i < this.bag.length; i++) {
      if (y > this.lwin.y + this.lwin.h - 24) break;
      const it = this.bag[i];
      this.lwin.drawText(ctx, it.name || "?", this.lwin.innerX + 8, y);
      this.lwin.drawText(ctx, `×${$gameParty.itemCount(it)}`, this.lwin.innerX + 300, y, 90, "right");
      y += this.lwin.itemHeight();
    }
    this.lwin.drawCursorBox(ctx);
    let y2 = this.rwin.innerY + 24;
    for (let i = 0; i < this.sto.length; i++) {
      if (y2 > this.rwin.y + this.rwin.h - 24) break;
      const it = this.sto[i];
      this.rwin.drawText(ctx, it.name || "?", this.rwin.innerX + 8, y2);
      this.rwin.drawText(ctx, `×${$gameParty.storageCount(it)}`, this.rwin.innerX + 300, y2, 90, "right");
      y2 += this.rwin.itemHeight();
    }
    this.rwin.drawCursorBox(ctx);
    ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(8, T.SCREEN_H - 34, T.SCREEN_W - 16, 28);
    ctx.fillStyle = "#ffd24d"; ctx.font = "18px 'PingFang SC',sans-serif";
    ctx.fillText(`${this.side === 0 ? "回车 → 存入仓库" : "回车 → 取出到背包"}    左右键切换   Esc 关闭`, 16, T.SCREEN_H - 14);
  }
}
T.openStorage = function () { T.SceneManager.push(new T.Scene_Storage()); };

/* ---------------- 编成（出战/候补 换人；武将超 5 人时的首发选择） ---------------- */
class Scene_Lineup {
  constructor() {
    for (const a of $gameParty.allMembers()) T.loadFace(a.faceName);
    this.lwin = new Window_Selectable(8, 60, 400, T.SCREEN_H - 68);
    this.rwin = new Window_Selectable(416, 60, T.SCREEN_W - 424, T.SCREEN_H - 68);
    this.lwin.fontSize = 18; this.rwin.fontSize = 18;
    this.side = 0;
    this.refresh();
    T.AudioManager.playSe({ name: "Equip1", volume: 60 });
  }
  refresh() {
    this.all = $gameParty.allMembers();
    this.act = this.all.slice(0, T.MAX_BATTLE_MEMBERS);
    this.bench = this.all.slice(T.MAX_BATTLE_MEMBERS);
    this.lwin.itemMax = this.act.length;
    this.rwin.itemMax = Math.max(1, this.bench.length);
    this.lwin.index = T.clamp(this.lwin.index || 0, 0, Math.max(0, this.act.length - 1));
    this.rwin.index = T.clamp(this.rwin.index || 0, 0, Math.max(0, this.bench.length - 1));
  }
  update() {
    if (T.Input.triggered("cancel")) { T.AudioManager.playSe({ name: "Cancel", volume: 50 }); T.SceneManager.popScene(); return; }
    if (T.Input.triggered("left")) { this.side = 0; this.lwin.updateInput(); return; }
    if (T.Input.triggered("right")) { this.side = 1; this.rwin.updateInput(); return; }
    const w = this.side === 0 ? this.lwin : this.rwin;
    w.updateInput();
    if (T.Input.triggered("ok")) {
      const ia = this.lwin.index, ib = this.rwin.index;
      const aId = this.act[ia] ? this.act[ia].actorId : null;
      const bId = this.bench[ib] ? this.bench[ib].actorId : null;
      if (aId != null && bId != null) {
        const ids = $gameParty._actors;
        const pa = ids.indexOf(aId), pb = ids.indexOf(bId);
        if (pa >= 0 && pb >= 0) { ids[pa] = bId; ids[pb] = aId; }
        T.$gameMessage.add(`编成变更：${T.$dataActors[aId].name} ↔ ${T.$dataActors[bId].name}`);
        T.AudioManager.playSe({ name: "Equip1", volume: 70 });
        this.refresh();
      } else T.AudioManager.playSe({ name: "Buzzer", volume: 50 });
    }
  }
  draw(ctx) {
    T.drawMenuBackdrop(ctx);
    this.lwin.draw(ctx); this.rwin.draw(ctx);
    this.lwin.drawText(ctx, `—— 出战（${this.act.length}/${T.MAX_BATTLE_MEMBERS}） ——`, this.lwin.innerX, this.lwin.innerY + 2, this.lwin.innerW, "center");
    this.rwin.drawText(ctx, "—— 候补 ——", this.rwin.innerX, this.rwin.innerY + 2, this.rwin.innerW, "center");
    let y = this.lwin.innerY + 24;
    for (const a of this.act) {
      if (y > this.lwin.y + this.lwin.h - 24) break;
      this.lwin.drawText(ctx, a.name, this.lwin.innerX + 8, y);
      this.lwin.drawText(ctx, `Lv${a.level}`, this.lwin.innerX + 330, y, 60, "right");
      y += this.lwin.itemHeight();
    }
    this.lwin.drawCursorBox(ctx);
    let y2 = this.rwin.innerY + 24;
    for (const a of this.bench) {
      if (y2 > this.rwin.y + this.rwin.h - 24) break;
      this.rwin.drawText(ctx, a.name, this.rwin.innerX + 8, y2);
      this.rwin.drawText(ctx, `Lv${a.level}`, this.rwin.innerX + 330, y2, 60, "right");
      y2 += this.rwin.itemHeight();
    }
    this.rwin.drawCursorBox(ctx);
    ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(8, T.SCREEN_H - 34, T.SCREEN_W - 16, 28);
    ctx.fillStyle = "#ffd24d"; ctx.font = "18px 'PingFang SC',sans-serif";
    ctx.fillText(`${this.side === 0 ? "回车 → 换下候补" : "回车 → 换上出战"}    左右切换   Esc 关闭`, 16, T.SCREEN_H - 14);
  }
}
T.openLineup = function () { T.SceneManager.push(new T.Scene_Lineup()); };

/* ---------------- 存读档 ---------------- */
class Scene_SaveLoad {
  constructor(mode) {
    this.mode = mode;   // save | load
    this.win = new Window_Selectable(8, 8, T.SCREEN_W - 16, T.SCREEN_H - 16);
    this.win.fontSize = 24;
    this.slots = [0, 1, 2, 3];
    this.win.itemMax = 4;
  }
  info(i) { return T.saveInfo(i); }
  selectedSlot() {
    return this.slots[T.clamp(this.win.index, 0, this.slots.length - 1)] ?? this.slots[0];
  }
  update() {
    this.win.updateInput();
    if (T.Input.triggered("cancel")) { T.SceneManager.popScene(); return; }
    if (T.Input.triggered("ok")) {
      const slot = this.selectedSlot();
      if (this.mode === "save") {
        T.saveGame(slot).then(() => {
          T.AudioManager.playSe({ name: "Save", volume: 80 });
          T.SceneManager.popScene();
        });
      } else {
        T.loadGame(slot).then(ok => {
          if (ok) {
            // loadGame 内部已通过 gotoMap 重建地图场景栈
            T.AudioManager.playSe({ name: "Load1", volume: 80 });
          }
          else T.AudioManager.playSe({ name: "Buzzer", volume: 60 });
        });
      }
    }
  }
  draw(ctx) {
    T.drawMenuBackdrop(ctx);
    this.win.draw(ctx);
    const title = this.mode === "save" ? "—— 存档 ——" : "—— 读档 ——";
    this.win.drawText(ctx, title, this.win.innerX, this.win.innerY + 4, this.win.innerW, "center");
    let y = this.win.innerY + 40;
    for (let i = 0; i < 4; i++) {
      const inf = this.info(i);
      const label = `记录 ${i + 1}`;
      if (inf) {
        const names = (inf.party.actors || []).slice(0, 3).map(id => (T.$dataActors[id] || {}).name).join(" ");
        this.win.drawText(ctx, `${label}   ${names}   金 ${T.fmt(inf.party.gold)}`, this.win.innerX + 20, y);
        const d = new Date(inf.savedAt);
        this.win.drawText(ctx, d.toLocaleString(), this.win.x + this.win.w - 320, y, 280, "right");
      } else {
        this.win.textColor = "rgba(255,255,255,0.45)";
        this.win.drawText(ctx, `${label}   ---- 空 ----`, this.win.innerX + 20, y);
        this.win.textColor = "#fff";
      }
      y += 56;
    }
    /* 行文本从 innerY+40 开始，使用专用光标，避免通用窗口把光标画到标题上。 */
    const x = this.win.x + 10;
    const cursorY = this.win.innerY + 32 + T.clamp(this.win.index, 0, 3) * 56;
    ctx.save();
    ctx.fillStyle = "rgba(120,170,255,0.22)";
    T.roundRect(ctx, x, cursorY, this.win.w - 20, 46, 5, true);
    ctx.strokeStyle = "rgba(190,215,255,0.85)";
    ctx.lineWidth = 2;
    T.roundRect(ctx, x, cursorY, this.win.w - 20, 46, 5, false, true);
    ctx.restore();
  }
}
class Scene_Save extends Scene_SaveLoad { constructor() { super("save"); } }
class Scene_Load extends Scene_SaveLoad { constructor() { super("load"); } }

/* ---------------- 商店 ---------------- */
class Scene_Shop {
  constructor(goods, purchaseOnly) {
    this.goods = goods;         // [[kind,id],...] kind 0物品 1武器 2防具
    this.purchaseOnly = !!purchaseOnly;
    this.tradeMode = "buy";
    this.tabs = ["物品", "武器", "防具"];
    this.tabIndex = 0;
    this.win = new Window_Selectable(8, 8, 520, T.SCREEN_H - 16);
    this.win.fontSize = 22;
    this.infoWin = new Window_Base(532, 8, T.SCREEN_W - 540, 150);
    this.goldWin = new Window_Gold(532, 162, 276);
    this.memberWin = new Window_Base(532, 218, T.SCREEN_W - 540, T.SCREEN_H - 226);
    this.memberWin.fontSize = 18;
    this.memberWin._compact = true;
    this.tabY = this.win.innerY - 6;
    this.tabH = 36;
    this.listTop = this.win.innerY + this.tabH + 8;
    this.refresh();
  }
  salePrice(item) { return Math.max(0, Math.floor((item?.price || 0) * 0.75)); }
  setTradeMode(mode) {
    if (mode === "sell" && this.purchaseOnly) return;
    if (this.tradeMode === mode) return;
    this.tradeMode = mode;
    this.refresh();
    T.AudioManager.playSe({ name: "Cursor", volume: 60 });
  }
  refresh() {
    if (this.tradeMode === "buy") {
      this.entries = this.goods.filter(([kind]) => kind === this.tabIndex).map(([, id]) => {
        const item = this.tabIndex === 0 ? T.$dataItems[id] : this.tabIndex === 1 ? T.$dataWeapons[id] : T.$dataArmors[id];
        return { item, price: item ? (item.price || 0) : 0 };
      }).filter(e => e.item);
    } else {
      const list = this.tabIndex === 0 ? $gameParty.items()
        : this.tabIndex === 1 ? $gameParty.weapons() : $gameParty.armors();
      this.entries = list.map(item => ({ item, price: this.salePrice(item) }))
        .filter(e => e.item && e.price > 0 && $gameParty.itemCount(e.item) > 0);
    }
    this.win.itemMax = this.entries.length;
    this.win.index = T.clamp(this.win.index, 0, Math.max(0, this.entries.length - 1));
  }
  update() {
    if (T.Input.triggered("shopSell")) { this.setTradeMode("sell"); return; }
    if (T.Input.triggered("shopBuy")) { this.setTradeMode("buy"); return; }
    if (T.Input.repeated("left")) {
      this.tabIndex = (this.tabIndex - 1 + this.tabs.length) % this.tabs.length;
      T.AudioManager.playSe({ name: "Cursor", volume: 60 });
      this.refresh(); return;
    }
    if (T.Input.repeated("right")) {
      this.tabIndex = (this.tabIndex + 1) % this.tabs.length;
      T.AudioManager.playSe({ name: "Cursor", volume: 60 });
      this.refresh(); return;
    }
    this.win.updateInput();
    if (T.Input.triggered("cancel")) {
      /* 通知挂起的解释器继续执行 */
      if (T._shopInterpreter && T._shopInterpreter._shopResolve) {
        T._shopInterpreter._shopResolve();
        T._shopInterpreter._asyncPromise = null;
        T._shopInterpreter.waitMode = "";
        T._shopInterpreter = null;
      }
      T.SceneManager.popScene(); return;
    }
    const e = this.entries[this.win.index];
    if (!e) { if (T.Input.triggered("ok")) T.SceneManager.popScene(); return; }
    if (T.Input.triggered("ok")) {
      if (this.tradeMode === "buy") {
        if ($gameParty.gold() >= e.price) {
          $gameParty.loseGold(e.price);
          $gameParty.gainItem(e.item, 1);
          T.AudioManager.playSe({ name: "Shop", volume: 80 });
          T.$gameMessage.add(`买入「${e.item.name}」×1，花费 ${T.fmt(e.price)}金`);
        } else T.AudioManager.playSe({ name: "Buzzer", volume: 60 });
      } else {
        if ($gameParty.itemCount(e.item) > 0) {
          $gameParty.loseItem(e.item, 1);
          $gameParty.gainGold(e.price);
          T.AudioManager.playSe({ name: "Shop", volume: 80 });
          T.$gameMessage.add(`卖出「${e.item.name}」×1，获得 ${T.fmt(e.price)}金`);
          this.refresh();
        } else {
          this.refresh();
          T.AudioManager.playSe({ name: "Buzzer", volume: 60 });
        }
      }
    }
  }
  drawEntryCursor(ctx) {
    if (this.win.itemMax === 0) return;
    const row = Math.floor(this.win.index / this.win.colMax) - this.win.topRow;
    const x = this.win.innerX + 2;
    const y = this.listTop + row * this.win.itemHeight() + 2;
    ctx.save();
    ctx.fillStyle = "rgba(120,170,255,0.28)";
    T.roundRect(ctx, x, y, this.win.innerW - 4, this.win.itemHeight() - 4, 5, true);
    ctx.strokeStyle = "rgba(190,215,255,0.75)";
    ctx.lineWidth = 2;
    T.roundRect(ctx, x, y, this.win.innerW - 4, this.win.itemHeight() - 4, 5, false, true);
    ctx.restore();
  }
  draw(ctx) {
    T.drawMenuBackdrop(ctx);
    this.win.draw(ctx);
    const ih = this.win.itemHeight();
    /* 分类 tab */
    const tabGap = 4;
    const tabW = Math.floor((this.win.innerW - tabGap * (this.tabs.length - 1)) / this.tabs.length);
    for (let i = 0; i < this.tabs.length; i++) {
      const x = this.win.innerX + i * (tabW + tabGap);
      ctx.save();
      ctx.fillStyle = i === this.tabIndex ? "rgba(255,210,77,0.14)" : "rgba(0,0,0,0.35)";
      T.roundRect(ctx, x, this.tabY, tabW, this.tabH, 4, true);
      ctx.strokeStyle = i === this.tabIndex ? "#ffd24d" : "rgba(220,230,255,0.5)";
      ctx.lineWidth = i === this.tabIndex ? 2 : 1;
      T.roundRect(ctx, x, this.tabY, tabW, this.tabH, 4, false, true);
      this.win.drawText(ctx, this.tabs[i], x + 6, this.tabY + 7, tabW - 12, "center");
      ctx.restore();
    }
    let y = this.listTop - this.win.topRow * ih;
    for (let i = 0; i < this.entries.length; i++) {
      if (y + ih < this.listTop) { y += ih; continue; }
      if (y > this.win.y + this.win.h - 18) break;
      const e = this.entries[i];
      this.win.drawText(ctx, e.item.name, this.win.innerX + 8, y);
      this.win.drawText(ctx, T.fmt(e.price), this.win.innerX + 320, y, 80, "right");
      const owned = $gameParty.itemCount(e.item);
      if (owned) this.win.drawText(ctx, `持${owned}`, this.win.innerX + 420, y, 60, "right");
      y += ih;
    }
    this.drawEntryCursor(ctx);
    this.win.drawText(ctx, this.purchaseOnly ? "E：购买" : "Q：出售    E：购买",
      this.win.innerX + 8, this.win.y + this.win.h - 34, this.win.innerW - 16, "left");
    this.infoWin.draw(ctx);
    const e = this.entries[this.win.index];
    if (e) {
      this.infoWin.drawText(ctx, e.item.name, this.infoWin.innerX, this.infoWin.innerY + 6);
      this.infoWin.drawText(ctx, `${this.tradeMode === "buy" ? "买入价" : "卖出价"} ${T.fmt(e.price)}金`, this.infoWin.innerX, this.infoWin.innerY + 38);
      this.infoWin.drawText(ctx, `持有 ${$gameParty.itemCount(e.item)}`, this.infoWin.innerX + 132, this.infoWin.innerY + 38);
      this.infoWin.drawRichText(ctx, e.item.description || "", this.infoWin.innerX, this.infoWin.innerY + 72);
    }
    this.infoWin.drawText(ctx, this.tradeMode === "buy" ? "当前：购买" : "当前：出售",
      this.infoWin.innerX + 8, this.infoWin.y + this.infoWin.h - 26, this.infoWin.innerW - 16, "right");
    this.goldWin.draw(ctx);
    this.memberWin.draw(ctx);
    let ry = this.memberWin.innerY + 2;
    for (const a of $gameParty.battleMembers()) { drawActorRow(this.memberWin, ctx, a, ry); ry += 64; }
  }
}

/* 类导出 */
Object.assign(T, { Scene_Menu, Scene_Item, Scene_Skill, Scene_Equip, Scene_Status, Scene_Save, Scene_Load, Scene_Shop, Scene_Storage, Scene_Lineup });
