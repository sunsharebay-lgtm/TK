/* ============================================================
 * TnDT Engine - menus.js
 * 主菜单、物品、技能、装备、状态、存读档、商店
 * ============================================================ */
"use strict";

/* ---------------- 帮助：成员状态行 ---------------- */
function drawActorRow(win, ctx, a, y) {
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
    this.commandWindow = new Window_Selectable(8, 8, 180, 260);
    this.commandWindow.itemMax = 6;
    this.commandWindow.fontSize = 24;
    this.commands = ["物品", "技能", "装备", "状态", "存档", "离开"];
    this.statusWindow = new Window_Selectable(196, 8, T.SCREEN_W - 204, T.SCREEN_H - 16);
    this.statusWindow.fontSize = 22;
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
        case 3: {
          const m = $gameParty.battleMembers()[0] || $gameParty.allMembers()[0];
          if (m) T.SceneManager.push(new Scene_Status(m));
          break;
        }
        case 4: T.SceneManager.push(new Scene_Save()); break;
        case 5: T.SceneManager.popScene(); break;
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
    /* 成员状态 */
    this.statusWindow.draw(ctx);
    const members = $gameParty.battleMembers();
    let ry = this.statusWindow.innerY + 14;
    for (const a of members) {
      drawActorRow(this.statusWindow, ctx, a, ry);
      ry += 92;
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
    this.mode = "list";
    this.refreshList();
  }
  refreshList() {
    this.items = $gameParty.allItems()
      .filter(i => i && T.$dataItems.includes(i) && $gameParty.itemCount(i) > 0);
    this.window.itemMax = this.items.length;
    this.window.index = T.clamp(this.window.index, 0, Math.max(0, this.items.length - 1));
  }
  currentItem() { return this.items[this.window.index]; }
  update() {
    if (this.mode === "target" && this.memberWindow.active) {
      // 目标选择模式：仅成员窗响应
    } else {
      this.window.updateInput();
    }
    if (this.mode === "target") {
      this.memberWindow.updateInput();
      if (T.Input.triggered("cancel")) { this.mode = "list"; T.AudioManager.playSe({ name: "Cancel", volume: 50 }); return; }
      if (T.Input.triggered("ok")) {
        const members = $gameParty.battleMembers();
        const item = this.currentItem();
        const target = members[this.memberWindow.index % members.length];
        if (item && target && !target.isDead() && this.useItem(item, target)) {
          $gameParty.consumeItem(item);
          T.AudioManager.playSe({ name: "Recovery", volume: 80 });
          T.$gameMessage.add(`使用「${item.name}」！`);
          this.refreshList();
          if (!this.items.length) { this.mode = "list"; return; }
        } else T.AudioManager.playSe({ name: "Buzzer", volume: 60 });
      }
      return;
    }
    if (T.Input.triggered("cancel")) { T.SceneManager.popScene(); return; }
    if (!this.items.length) { if (T.Input.triggered("ok")) T.SceneManager.popScene(); return; }
    const item = this.currentItem();
    if (T.Input.triggered("ok")) {
      if (T.$dataItems.includes(item) && $gameParty.battleMembers().some(a => !a.isDead())) {
        this.mode = "target";
        this.memberWindow.index = 0;
        T.AudioManager.playSe({ name: "Cursor", volume: 50 });
      } else T.AudioManager.playSe({ name: "Buzzer", volume: 60 });
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
    this.memberWindow.draw(ctx);
    let ry = this.memberWindow.innerY + 8;
    const members = $gameParty.battleMembers();
    for (let i = 0; i < members.length; i++) {
      drawActorRow(this.memberWindow, ctx, members[i], ry + i * 88);
      if (this.mode === "target" && i === this.memberWindow.index % members.length) {
        ctx.save();
        ctx.strokeStyle = "#ffd24d"; ctx.lineWidth = 2;
        ctx.strokeRect(this.memberWindow.innerX + 2, ry + i * 88 - 8, this.memberWindow.w - 6, 84);
        ctx.restore();
      }
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
  update() {
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
      const scope = s.scope ?? (s.damage ? s.damage.scope : null) ?? 1;
      if ([1, 2, 9].includes(scope)) {   // 攻击敌方类：战斗外不可用
        T.AudioManager.playSe({ name: "Buzzer", volume: 50 });
        T.$gameMessage.add("该技能只能在战斗中使用！");
        return;
      }
      if (this.actor.mp < (s.mpCost || 0)) { T.AudioManager.playSe({ name: "Buzzer", volume: 50 }); T.$gameMessage.add("谋点不足！"); return; }
      if ([7, 11, 14].includes(scope)) {     // 单体我方：选目标
        this.pendingSkill = s;
        this.mode = "target";
        this.memberWindow.index = 0;
        T.AudioManager.playSe({ name: "Cursor", volume: 50 });
      } else {                              // 自身/全体
        this.applySkillOutOfBattle(s, scope === 8 || scope === 10 ? this.members.filter(a => !a.isDead()) : [this.actor]);
      }
    }
    if (this.mode === "target") {
      this.memberWindow.updateInput();
      if (T.Input.triggered("cancel")) { this.mode = "list"; T.AudioManager.playSe({ name: "Cancel", volume: 50 }); }
      if (T.Input.triggered("ok")) {
        const members = this.members.filter(a => !a.isDead());
        const t = members[this.memberWindow.index % members.length];
        if (t) { this.applySkillOutOfBattle(this.pendingSkill, [t]); this.mode = "list"; }
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
      this.listWindow.drawText(ctx, `${s.mpCost}`, this.listWindow.innerX + 380, y, 80, "right");
      y += ih;
    }
    this.listWindow.drawCursorBox(ctx);
    this.descWindow.draw(ctx);
    const s = this.skills[this.listWindow.index];
    if (s) {
      this.descWindow.drawRichText(ctx, s.description || s.message1 || s.name,
        this.descWindow.innerX, this.descWindow.innerY + 8);
    }
    this.actorWindow.draw(ctx);
    drawActorRow(this.actorWindow, ctx, this.actor, this.actorWindow.innerY + 26);
    this.actorWindow.drawText(ctx, "PgUp/PgDn 切换武将", this.actorWindow.innerX + 8, this.actorWindow.h - 26, 240, "left");
    if (this.mode === "target") {
      const members = this.members.filter(a => !a.isDead());
      const idx = this.memberWindow.index % members.length;
      ctx.save();
      ctx.strokeStyle = "#ffd24d"; ctx.lineWidth = 2;
      ctx.strokeRect(this.memberWindow.innerX + 2, this.memberWindow.innerY + 8 + idx * 88 - 8, this.memberWindow.w - 6, 84);
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
    if (this.mode === "slot") {
      this.slotWin.updateInput();
      this.refreshCandidates();
      if (T.Input.triggered("ok")) { this.mode = "item"; }
      else if (T.Input.triggered("cancel")) { T.SceneManager.popScene(); return; }
      else if (T.Input.repeated("pageup")) {
        const mem = $gameParty.battleMembers();
        const i = mem.indexOf(this.actor);
        this.actor = mem[(i - 1 + mem.length) % mem.length] || this.actor;
        this.rebuildSlots();
      } else if (T.Input.repeated("pagedown")) {
        const mem = $gameParty.battleMembers();
        const i = mem.indexOf(this.actor);
        this.actor = mem[(i + 1) % mem.length] || this.actor;
        this.rebuildSlots();
      }
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
    const rows = [
      `武力 ${a.atk}`, `防御 ${a.def}`, `谋略 ${a.mat}`, `智力 ${a.mdf}`,
      `速度 ${a.agi}`, `兵力 ${a.hp}/${a.mhp}`,
    ];
    let sy = this.statWin.innerY + 4;
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
        let py = this.itemWin.y + this.itemWin.h - 120;
        ctx.save();
        ctx.fillStyle = "rgba(16,24,48,0.9)";
        ctx.fillRect(this.itemWin.x + 4, py, this.itemWin.w - 8, 116);
        ctx.font = T.fontStr(20);
        ctx.fillStyle = "#cfd8ff";
        ctx.fillText("装备属性预览", this.itemWin.x + 16, py + 24);
        for (let li = 0; li < labels.length; li++) {
          const [nm, key] = labels[li];
          const d = Math.round(prev[key] - base[key]);
          ctx.fillStyle = d > 0 ? "#7dfa8a" : d < 0 ? "#ff9a9a" : "#9fb0d0";
          ctx.fillText(`${nm} ${base[key]} → ${prev[key]}${d !== 0 ? ` (${d > 0 ? "+" : ""}${d})` : ""}`, this.itemWin.x + 16, py + 50 + li * 22);
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
    if (this.members.length > 1) { this.win.drawText(ctx, "PgUp/PgDn 切换武将", this.win.innerX + 8, this.win.h - 40, 260, "left"); }
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
  update() {
    this.win.updateInput();
    if (T.Input.triggered("cancel")) { T.SceneManager.popScene(); return; }
    if (T.Input.triggered("ok")) {
      const slot = this.slots[this.win.index];
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
    this.win.drawCursorBox(ctx);
  }
}
class Scene_Save extends Scene_SaveLoad { constructor() { super("save"); } }
class Scene_Load extends Scene_SaveLoad { constructor() { super("load"); } }

/* ---------------- 商店 ---------------- */
class Scene_Shop {
  constructor(goods, purchaseOnly) {
    this.goods = goods;         // [[kind,id],...] kind 0物品 1武器 2防具
    this.purchaseOnly = purchaseOnly;
    this.win = new Window_Selectable(8, 8, 520, T.SCREEN_H - 16);
    this.win.fontSize = 22;
    this.infoWin = new Window_Base(532, 8, T.SCREEN_W - 540, 150);
    this.goldWin = new Window_Gold(532, 162, 276);
    this.memberWin = new Window_Base(532, 218, T.SCREEN_W - 540, 120);
    this.memberWin.fontSize = 22;
    this.refresh();
  }
  refresh() {
    this.entries = this.goods.map(([kind, id]) => {
      const item = kind === 0 ? T.$dataItems[id] : kind === 1 ? T.$dataWeapons[id] : T.$dataArmors[id];
      const price = item ? (item.price || 0) : 0;
      return { item, price };
    }).filter(e => e.item);
    this.win.itemMax = this.entries.length;
    this.win.index = 0;
  }
  update() {
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
    if (!e) { if (T.Input.triggered("ok")) { T.SceneManager.popScene(); return; } }
    if (T.Input.triggered("ok")) {
      if ($gameParty.gold >= e.price) {
        $gameParty.loseGold(e.price);
        $gameParty.gainItem(e.item, 1);
        T.AudioManager.playSe({ name: "Shop", volume: 80 });
      } else T.AudioManager.playSe({ name: "Buzzer", volume: 60 });
    }
  }
  draw(ctx) {
    T.drawMenuBackdrop(ctx);
    this.win.draw(ctx);
    const ih = this.win.itemHeight();
    let y = this.win.innerY + 4 - this.win.topRow * ih;
    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i];
      this.win.drawText(ctx, e.item.name, this.win.innerX + 8, y);
      this.win.drawText(ctx, T.fmt(e.price), this.win.innerX + 380, y, 100, "right");
      const owned = $gameParty.itemCount(e.item);
      if (owned) this.win.drawText(ctx, `持${owned}`, this.win.innerX + 420, y, 60, "right");
      y += ih;
    }
    this.win.drawCursorBox(ctx);
    this.infoWin.draw(ctx);
    const e = this.entries[this.win.index];
    if (e) this.infoWin.drawRichText(ctx, e.item.description || "", this.infoWin.innerX, this.infoWin.innerY + 8);
    this.goldWin.draw(ctx);
    this.memberWin.draw(ctx);
    let ry = this.memberWin.innerY + 2;
    for (const a of $gameParty.battleMembers()) { drawActorRow(this.memberWin, ctx, a, ry); ry += 42; }
  }
}

/* 类导出 */
Object.assign(T, { Scene_Menu, Scene_Item, Scene_Skill, Scene_Equip, Scene_Status, Scene_Save, Scene_Load, Scene_Shop });
