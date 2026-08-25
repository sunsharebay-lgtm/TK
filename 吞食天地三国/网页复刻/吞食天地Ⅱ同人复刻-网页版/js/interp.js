/* ============================================================
 * TnDT Engine - interp.js
 * 事件指令解释器 + 角色移动模拟（地图域状态对象）
 * 指令语义按公开的 MV 事件命令表实现。
 * ============================================================ */
"use strict";

/* ---------------- 角色基类 ---------------- */
class Game_CharacterBase {
  constructor() { this.initMembers(); }
  initMembers() {
    this.x = 0; this.y = 0;
    this._realX = 0; this._realY = 0;
    this._direction = 2;
    this._moving = false;
    this._moveSpeed = 4;
    this._moveFrequency = 6;
    this._stepAnime = true; this._walkAnime = true;
    this._through = false;
    this._animationId = 0;
    this._balloonId = 0;
    this._routeExecutor = null;
    this._animationCount = 0;
    this._pattern = 1;
    this._stopCount = 99;
    this._priorityType = 1;
  }
  pos(x, y) { return Math.round(this.x) === Math.round(x) && Math.round(this.y) === Math.round(y); }
  direction() { return this._direction; }
  setDirection(d) { if (![2, 4, 6, 8].includes(d)) d = 2; this._direction = d; }
  realPos() { return { x: this._realX, y: this._realY }; }
  isMoving() { return this._moving; }
  screenZ() { return this._priorityType * 2 + 1; }
  update() {
    if (this._routeExecutor) { this._routeExecutor.update(); }
    this.updateMove();
    this.updateAnimation();
    this._stopCount++;
  }
  updateMove() {
    if (!this._moving) return;
    const sp = (this._moveSpeed / 32);
    let arrived = true;
    const tx = this.x, ty = this.y;
    if (this._realX < tx) { this._realX = Math.min(tx, this._realX + sp); arrived = false; }
    else if (this._realX > tx) { this._realX = Math.max(tx, this._realX - sp); arrived = false; }
    if (this._realY < ty) { this._realY = Math.min(ty, this._realY + sp); arrived = false; }
    else if (this._realY > ty) { this._realY = Math.max(ty, this._realY - sp); arrived = false; }
    if (arrived) this._moving = false;
  }
  updateAnimation() {
    if (this.isMoving() && this._walkAnime) {
      this._animationCount += (this._moveSpeed >= 5 ? 1 : 0.5) + this._moveSpeed * 0.06;
    } else if (this._stepAnime || this.isMoving()) {
      this._animationCount += 0.12;
    } else return;
    if (this._animationCount >= 4) this._animationCount -= 4;
    const pat = [1, 2, 1, 0];
    this._pattern = pat[Math.floor(this._animationCount)];
  }
  pattern() { return this._walkAnime || this.isMoving() ? this._pattern : 1; }
}

class Game_Character extends Game_CharacterBase {
  constructor() { super(); }
  moveStraight(d) {
    this.setDirection(d);
    const [dx, dy] = DIRV[d];
    if (this.canPass(this.x, this.y, d)) {
      this._prevX = this.x; this._prevY = this.y;   // 记录移动前位置（触碰触发判定用）
      this.x += dx; this.y += dy;
      this._moving = true;
      this.increaseSteps();
      return true;
    }
    return false;
  }
  canPass(x, y, d) {
    const [dx, dy] = DIRV[d];
    const nx = x + dx, ny = y + dy;
    if (!T.$gameMap.isValid(nx, ny)) return false;
    if (this._through) return true;
    if (!T.$gameMap.isPassable(nx, ny, d)) return false;
    if (!this.isMapPassableFor(nx, ny)) return false;
    return !T.$gameMap.collidesWithCharacter(this, nx, ny);
  }
  isMapPassableFor() { return true; }
  setImage(name, index) { this._imgName = name; this._imgIndex = index; }
  increaseSteps() {
    if (this === T.$gamePlayer) {
      T.$gameParty.increaseSteps();
      T.$gameMap.onPlayerStep();
    }
  }
  forceMoveRoute(route) { this._routeExecutor = new MoveRouteExecutor(this, route); }
  cancelMoveRoute() { this._routeExecutor = null; }
}
const DIRV = { 2: [0, 1], 4: [-1, 0], 6: [1, 0], 8: [0, -1], 1: [-1, 1], 3: [1, 1], 7: [-1, -1], 9: [1, -1] };

/* ---------------- 移动路线执行器 ---------------- */
class MoveRouteExecutor {
  constructor(chr, route) {
    this.chr = chr; this.route = route;
    this.index = 0; this.wait = 0;
  }
  update() {
    if (this.wait > 0) { this.wait--; return; }
    if (this.chr.isMoving()) return;
    const list = this.route.list;
    while (this.index < list.length) {
      const cmd = list[this.index++];
      if (!this.execCmd(cmd)) break;         // 尚在等待（如移动中）
      if (cmd.code === 0) {                  // 结束
        if (this.route.repeat) { this.index = 0; continue; }
        this.chr.cancelMoveRoute();
        return;
      }
    }
  }
  execCmd(cmd) {
    const c = this.chr, p = cmd.parameters || [];
    switch (cmd.code) {
      case 1: case 2: case 3: case 4:
        c.moveStraight(cmd.code * 2); return !c.isMoving();
      case 15: this.wait = p[0]; return true;
      case 16: c.setDirection(2); return true;
      case 17: c.setDirection(4); return true;
      case 18: c.setDirection(6); return true;
      case 19: c.setDirection(8); return true;
      case 20: T.$gameSwitches.setValue(p[0], true); return true;
      case 21: T.$gameSwitches.setValue(p[0], false); return true;
      case 26: c._through = true; return true;
      case 27: c._through = false; return true;
      case 29: c._moveSpeed = p[0]; return true;
      case 33: return c.moveStraight(c.direction());
      case 34: { const opp = { 2: 8, 8: 2, 4: 6, 6: 4 }; return c.moveStraight(opp[c.direction()] || 2); }
      case 37: c._stepAnime = true; return true;
      case 38: c._stepAnime = false; return true;
      case 39: c._walkAnime = true; return true;
      case 40: c._walkAnime = false; return true;
      case 41: c.setImage(p[0], p[1]); return true;
      case 44: T.AudioManager.playSe(p[0]); return true;
      case 45: try { new Function(...p)(""); } catch (e) {} return true;
      default: return true; // 未支持的路线动作直接跳过
    }
  }
}

/* ---------------- 地图 ---------------- */
class Game_Map {
  constructor() {
    this.mapId = 0;
    this.interpreter = new Game_Interpreter();
    this.scrollX = 0; this.scrollY = 0;
    this.events = [];
    this.encounterProgress = 0;
    this.displayUpdated = false;
  }
  setup(mapId) {
    this.mapId = mapId;
    const m = T.$dataMap;
    this.width = m.width; this.height = m.height;
    this.data = m.data;
    this.encounterList = m.encounterList || [];
    this.encounterStep = m.encounterStep || 30;
    this.note = m.note || "";
    this.parallaxName = m.parallaxName || "";
    this.battleback1Name = m.battleback1Name || "";
    this.battleback2Name = m.battleback2Name || "";
    this.events = (m.events || []).filter(Boolean).map(ed => new Game_Event(this.mapId, ed));
    this.scrollX = 0; this.scrollY = 0;
    this.encounterProgress = 0;
  }
  tileId(x, y, layer) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    return this.data[(layer * this.height + y) * this.width + x] || 0;
  }
  isValid(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
  /* 通行判定：取四层中最上层的有效图块通行标志（flags 按原始 id 索引） */
  isPassable(x, y, d) {
    for (let layer = 3; layer >= 0; layer--) {
      const id = this.tileId(x, y, layer);
      if (id > 0) {
        const ts = this.tileset();
        const flag = ts ? (ts.flags[id] ?? 0) : 0;
        if (id >= 1024 && id < 1536) return true;
        return !(flag & 1);
      }
    }
    return true;
  }
  isDamageFloor(x, y) {
    for (let l = 0; l < 4; l++) {
      const id = this.tileId(x, y, l);
      if (id > 0) return !!((this.tileset().flags[id] ?? 0) & 0x20);
    }
    return false;
  }
  regionId(x, y) {
    const idx = (4 * this.height + y) * this.width + x;
    return this.data[idx] || 0;
  }
  terrainTag(x, y) {
    for (let l = 3; l >= 0; l--) {
      const id = this.tileId(x, y, l);
      if (id > 0 && id < 8192) {
        const tag = ((this.tileset().flags[id] ?? 0) >> 12) & 7;
        if (tag) return tag;
      }
    }
    return 0;
  }
  tileset() { return T.$dataTilesets[T.$dataMap.tilesetId] || null; }
  eventIdAt(x, y) {
    const ev = this.events.find(e => e.pos(x, y));
    return ev ? ev.eventId : 0;
  }
  event(id) { return this.events.find(e => e.eventId === id) || null; }
  collidesWithCharacter(self, x, y) {
    for (const ev of this.events) {
      if (ev === self || ev._erased || !ev.page || !ev.pos(x, y)) continue;
      if (ev.priorityType() >= 1 && !ev._through) return true;
    }
    if (self !== T.$gamePlayer && T.$gamePlayer &&
        T.$gamePlayer.pos(x, y) && !T.$gamePlayer._through) return true;
    return false;
  }
  onPlayerStep() { /* 遭遇判定在 Scene_Map 中 */ }
  encounterCandidates() {
    if (!this.encounterList.length) return [];
    if (T.$gameParty.encounterNone()) return [];
    let list = this.encounterList.filter(e =>
      !(e.regionSet && e.regionSet.length) || e.regionSet.includes(this.regionId(T.$gamePlayer.x, T.$gamePlayer.y)));
    if (T.$gameParty.encounterHalf()) list = list.filter(() => Math.random() < 0.5);
    return list;
  }
  update(sceneActive) {
    for (const e of this.events) e.update();
    if (T.$gamePlayer) T.$gamePlayer.update();
  }
  refreshEvents() { for (const e of this.events) e.refresh(); }
}

/* ---------------- 事件 ---------------- */
class Game_Event extends Game_Character {
  constructor(mapId, ed) {
    super();
    this.mapId = mapId;
    this.eventData = ed;
    this.eventId = ed.id;
    this.name = ed.name || "";
    this.x = ed.x; this.y = ed.y;
    this._realX = ed.x; this._realY = ed.y;
    this._erased = false;
    this.starting = false;
    this.refresh();
  }
  get dbEntry() { return this.eventData; }
  priorityType() { return this.page ? (this.page.priorityType ?? 1) : 1; }
  setImage(name, index) {
    this._imgName = name; this._imgIndex = index;
  }
  imageInfo() {
    const img = this.page ? this.page.image : { characterName: "", characterIndex: 0 };
    return { name: img.characterName, index: img.characterIndex };
  }
  meetConditions(page) {
    const c = page.conditions;
    if (c.switch1Valid && !T.$gameSwitches.value(c.switch1Id)) return false;
    if (c.switch2Valid && !T.$gameSwitches.value(c.switch2Id)) return false;
    if (c.variableValid && T.$gameVariables.value(c.variableId) < (c.variableValue || 0)) return false;
    if (c.selfSwitchValid) {
      const key = `${this.mapId},${this.eventId},${c.selfSwitchCh}`;
      if (!T.$gameSelfSwitches.value(key)) return false;
    }
    if (c.itemValid && !$gameParty.hasItem(T.$dataItems[c.itemId])) return false;
    if (c.actorValid && !$gameParty._actors.includes(c.actorId)) return false;
    return true;
  }
  findProperPage() {
    const pages = this.eventData.pages || [];
    for (let i = pages.length - 1; i >= 0; i--) {
      if (this.meetConditions(pages[i])) return pages[i];
    }
    return null;
  }
  refresh() {
    const newPage = this.findProperPage();
    if (newPage !== this.page) {
      this.page = newPage;
      if (this.page) {
        this._priorityType = this.page.priorityType ?? 1;
        this._through = !!this.page.through;
        this._stepAnime = !!this.page.stepAnime;
        this._walkAnime = this.page.walkAnime !== false;
        const img = this.page.image || {};
        this._imgName = img.characterName; this._imgIndex = img.characterIndex;
        if (this.page.moveType !== 0 && !this._routeExecutor) {
          // 简单随机走动
          this.setupAutoMove();
        }
      }
    }
  }
  setupAutoMove() {}
  update() {
    super.update();
    // 自动移动类型：1 随机 / 2 接近玩家
    if (this.page && !this._moving && !this._routeExecutor) {
      const mt = this.page.moveType;
      if (mt === 1 && T.rand(60) < 1) {
        const d = [2, 4, 6, 8][T.rand(4)];
        if (this.canPass(this.x, this.y, d)) this.moveStraight(d);
      } else if (mt === 2 && T.rand(30) < 1 && T.$gamePlayer) {
        const dx = T.$gamePlayer.x - this.x, dy = T.$gamePlayer.y - this.y;
        const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 6 : 4) : (dy > 0 ? 2 : 8);
        if (Math.abs(dx) + Math.abs(dy) <= 6 && this.canPass(this.x, this.y, d)) this.moveStraight(d);
        else if (T.rand(2)) this.moveStraight([2, 4, 6, 8][T.rand(4)]);
      }
    }
  }
  start() { this.starting = true; }
  clearStartingFlag() { this.starting = false; }
  list() { return this.page ? this.page.list : []; }
}

/* ---------------- 玩家 ---------------- */
class Game_Player extends Game_Character {
  constructor() {
    super();
    this._moveSpeed = 4;
    this._followersVisible = true;
    this._transparent = false;
  }
  imageInfo() {
    const lead = ($gameParty.battleMembers()[0] || $gameParty.allMembers()[0]);
    const nm = lead ? ("$" + lead.svBattlerName()) : "$01";
    return { name: nm, index: 0 };
  }
  isMapPassableFor(nx, ny) {
    // 玩家不可走进优先级1(与角色同层)且非贯通的事件格；0(低于)/2(高于)可踩；无激活页事件不挡路
    for (const ev of T.$gameMap.events) {
      if (ev._erased || !ev.page || !ev.pos(nx, ny)) continue;
      if (ev.priorityType() === 1) return false;
    }
    return true;
  }
  update() {
    super.update();
    if (!this.isMoving() && !T.$gameMap.interpreter.isRunning()) this.doInputMove();
  }
  doInputMove() {
    if (T.Input.pressed("shift")) this._moveSpeed = 5; else this._moveSpeed = 4;
    let d = null;
    if (T.Input.pressed("down")) d = 2;
    else if (T.Input.pressed("left")) d = 4;
    else if (T.Input.pressed("right")) d = 6;
    else if (T.Input.pressed("up")) d = 8;
    if (d) this.moveStraight(d);
  }
  checkTouchEvent() { /* 由场景处理 */ }
}

/* ---------------- 解释器 ---------------- */
class Game_Interpreter {
  constructor(depth = 0) {
    this.depth = depth;
    this.clear();
  }
  clear() {
    this.list = null; this.index = 0; this.mapId = 0; this.eventId = 0;
    this.child = null; this.waitCount = 0; this.waitMode = "";
    this._routeWaitChar = null;
    this.branches = {};
    this.onFinish = null;
  }
  setup(list, eventId = 0) {
    this.clear();
    this.list = list; this.eventId = eventId;
    this.mapId = T.$gameMap ? T.$gameMap.mapId : 0;
  }
  isRunning() { return !!this.list; }
  update() {
    while (this.isRunning()) {
      if (this.waitCount > 0) { this.waitCount--; return false; }
      if (this.child) {
        if (!this.child.update()) return false;
        this.child = null;
      }
      if (this.waitMode === "message" && this.hasMessage()) return false;
      if (this.waitMode === "route" && this.routeChar() != null) return false;
      if (this.waitMode === "choice" && this._choiceResult == null && !this.choiceResolved()) return false;
      if (this.waitMode === "async" && this._asyncPromise) return false;
      if (this.waitMode === "choice" && this.choiceResolved()) {
        // 记录结果并继续执行（402/403 会读取）
        const r = this._choiceResult;
        if (r.cancelled) this.branches["choice"] = { taken: -1, cancelled: true };
        else this.branches["choice"] = { taken: r.index, cancelled: false };
        T.$gameMessage.clear();
        this.waitMode = "";
      }
      const cmd = this.list[this.index++];
      if (!cmd) { this.terminate(); return true; }
      const ret = this.executeCommand(cmd);
      if (ret === false) return false;   // 异步等待
      if (ret === "skip") continue;
    }
    return true;
  }
  choiceResolved() { return this._choiceResult !== undefined; }
  onChoiceResult(index, cancelled) {
    if (this.waitMode === "choice") this._choiceResult = { index, cancelled: !!cancelled };
  }
  hasMessage() {
    const m = T.$gameMessage;
    return m.texts.length > 0 || m.choices.length > 0;
  }
  routeChar() {
    const ch = this._routeWaitChar;
    if (!ch) return null;
    if (ch._routeExecutor) return ch;   // 路线仍在执行
    this._routeWaitChar = null;
    this.waitMode = "";
    return null;
  }
  terminate() {
    this.list = null;
    if (this.onFinish) { const f = this.onFinish; this.onFinish = null; f(); }
  }
  skipBranch() {
    const targetIndent = this.currentIndent;
    let depth = 0;
    while (this.index < this.list.length) {
      const cmd = this.list[this.index++];
      if (!cmd) return;
      if (cmd.indent === targetIndent) {
        if (cmd.code === 0 || cmd.code === 412 || cmd.code === 413) {
          if (depth === 0) return;
          depth--;
        }
        if (cmd.code === 111) depth++;
      }
    }
  }
  jumpToLoopEnd() {
    let depth = 0;
    while (this.index < this.list.length) {
      const cmd = this.list[this.index++];
      if (!cmd) return true;
      if (cmd.code === 112) depth++;
      if (cmd.code === 413) {
        if (depth === 0) return true;
        depth--;
      }
    }
    return true;
  }
  executeCommand(cmd) {
    this.currentIndent = cmd.indent;
    try {
      return this.command(cmd);
    } catch (e) {
      console.error("指令异常:", cmd.code, cmd.parameters, e);
      return true;
    }
  }
  valueOperand(opType, params, base) {
    switch (opType) {
      case 0: return params[base];
      case 1: return T.$gameVariables.value(params[base]);
      case 2: return T.randBetween(Math.min(params[base], params[base + 1]), Math.max(params[base], params[base + 1]));
      case 4: try { return Math.trunc(new Function(`return (${params[base]})`)()); } catch (e) { return 0; }
      default: return params[base];
    }
  }
  command(cmd) {
    const c = cmd.code, p = cmd.parameters;
    const M = T.$gameMessage;
    switch (c) {
      case 0: return true;                       // 列表结束由外层处理
      /* ---- 消息 ---- */
      case 101:
        T.$gameMessage.clear();
        M.faceName = p[0] || ""; M.faceIndex = p[1] || 0;
        M.background = p[2] || 0; M.position = p[3] == null ? 2 : p[3];
        return true;
      case 401: {
        M.add(p[0]);
        const sc = T.SceneManager.current();
        const mw = sc && sc.messageWindow;
        if (mw && mw.state === "closed") mw.openAndStart();
        return true;
      }
      case 102:
        if (M.texts.length === 0) {
          // 没有消息体时直接弹出选择窗（补一条空消息）
          M.add("");
        }
        M.choices = p[0].slice(); M.choiceCancelType = p[1];
        M.choiceDefaultType = p[2] || 0;
        this._choiceResult = undefined;
        this._interpreterRef = this;
        this.waitMode = "choice";
        return false;
      case 402: { // 选择分支
        const st = this.branches["choice"];
        if (st && st.taken === p[0]) return true;
        // Skip entire choice branch: advance to next 402/404 at same indent
        const ci = cmd.indent;
        while (this.index < this.list.length) {
          const nx = this.list[this.index];
          if (!nx) break;
          if (nx.indent < ci) break;
          if (nx.indent === ci && (nx.code === 402 || nx.code === 404)) break;
          this.index++;
        }
        return true;
      }
      case 403: { // 取消分支
        const st = this.branches["choice"];
        if (st && st.cancelled) return true;
        const ci2 = cmd.indent;
        while (this.index < this.list.length) {
          const nx = this.list[this.index];
          if (!nx) break;
          if (nx.indent < ci2) break;
          if (nx.indent === ci2 && (nx.code === 402 || nx.code === 403 || nx.code === 404)) break;
          this.index++;
        }
        return true;
      }
      case 404:
        delete this.branches["choice"];
        return true;
      /* ---- 流程 ---- */
      case 111: {
        const result = this.commandConditional(p);
        if (!result) this.skipBranch();
        return true;
      }
      case 411: { // Else
        const st = this.branches[cmd.indent];
        if (st && st.taken) { this.skipBranch(); return true; }
        return true;
      }
      case 412: case 413: return true;           // 分支/循环结束
      case 112: return true;
      case 113: return this.jumpToLoopEnd(cmd.indent);
      case 115: this.terminate(); return true;
      case 117: {
        const ce = T.$dataCommonEvents[p[0]];
        if (ce && this.depth < 8) {
          this.child = new Game_Interpreter(this.depth + 1);
          this.child.setup(ce.list, this.eventId);
        }
        return true;
      }
      case 118: return true;                     // Label
      case 119: { // Jump to Label
        const li = this.list.findIndex((cc, i) =>
          i > 0 && cc.code === 118 && cc.parameters[0] === p[0]);
        if (li >= 0) this.index = li + 1;
        return true;
      }
      case 131: case 132: case 133:
        if (c === 132) T.AudioManager.playBgm({ name: p[0].name, volume: p[0].volume, pitch: p[0].pitch });
        if (c === 133) T.AudioManager.playBgs({ name: p[0].name, volume: p[0].volume, pitch: p[0].pitch });
        return true;
      /* ---- 开关 变量 ---- */
      case 121:
        for (let i = p[0]; i <= p[1]; i++) T.$gameSwitches.setValue(i, p[2] === 0);
        T.$gameMap.refreshEvents();
        return true;
      case 122: return this.commandVariables(p);
      case 123: {
        const key = `${T.$gameMap.mapId},${this.eventId},${p[0]}`;
        T.$gameSelfSwitches.setValue(key, p[1] === 0);
        T.$gameMap.refreshEvents();
        return true;
      }
      case 124:
        if (p[0] === 0) T.$gameTimer.start(p[2]); else T.$gameTimer.stop();
        return true;
      /* ---- 持有物 ---- */
      case 125: {
        const v = this.valueOperand(p[1], p, 2);
        p[0] === 0 ? $gameParty.gainGold(v) : $gameParty.loseGold(v);
        return true;
      }
      case 126: {
        const n = this.valueOperand(p[2], p, 3);
        const it = T.$dataItems[p[0]];
        p[1] === 0 ? $gameParty.gainItem(it, n) : $gameParty.loseItem(it, n);
        return true;
      }
      case 127: {
        const n = this.valueOperand(p[2], p, 3);
        const it = T.$dataWeapons[p[0]];
        p[1] === 0 ? $gameParty.gainItem(it, n) : $gameParty.loseItem(it, n);
        return true;
      }
      case 128: {
        const n = this.valueOperand(p[2], p, 3);
        const it = T.$dataArmors[p[0]];
        p[1] === 0 ? $gameParty.gainItem(it, n) : $gameParty.loseItem(it, n);
        return true;
      }
      case 129: { // 加入/离开队伍
        if (p[1] === 0) {
          if (!$gameParty._actors.includes(p[0])) $gameParty.addActor(p[0]);
        } else $gameParty.removeActor(p[0]);
        return true;
      }
      case 130: { // 全体恢复
        const targets = p[0] === 0 ? [$gameParty._actors[p[1]]] : $gameParty.allMembers().map(a => a.actorId);
        for (const id of targets) { const a = T.getActor(id); if (a) a.recoverAll(); }
        return true;
      }
      /* ---- 队伍位置 ---- */
      case 201: {
        const mode = p[0];
        const mapId = mode === 0 ? p[1] : T.$gameVariables.value(p[1]);
        const tx = mode === 0 ? p[2] : T.$gameVariables.value(p[2]);
        const ty = mode === 0 ? p[3] : T.$gameVariables.value(p[3]);
        const dir = p[4] || 0;
        const fadeType = p[5] != null ? p[5] : 0;
        const promise = T.SceneManager.transferPlayer(mapId, tx, ty, dir, fadeType);
        if (promise && typeof promise.then === "function") {
          this._asyncResolve = null;
          this._asyncPromise = promise;
          this.waitMode = "async";
          promise.then(() => { this.waitMode = ""; this._asyncPromise = null; });
        }
        return false;
      }
      case 202: return this.commandSetEventLocation(p);
      case 205: { // 移动路线
        const ch = this.character(p[0]);
        if (ch) ch.forceMoveRoute(p[1]);
        if (ch && p[1] && p[1].wait) { this._routeWaitChar = ch; this.waitMode = "route"; return false; }
        return true;
      }
      case 206: { // 位置信息
        const gm = T.$gameMap;
        const px = p[1], py = p[2];
        let val = 0;
        if (p[0] === 0) val = gm.terrainTag(px, py);
        else if (p[0] === 1) val = gm.regionId(px, py);
        else if (p[0] === 2) val = gm.eventIdAt(px, py);
        else if (p[0] === 3) val = gm.tileId(px, py, 0);
        T.$gameVariables.setValue(p[3], val);
        return true;
      }
      /* ---- 画面效果 ---- */
      case 211: T.$gamePlayer._transparent = !!p[0]; return true;
      case 212: return true;                     // 集合队员(无跟随者渲染则忽略)
      case 216: case 217: return true;
      case 221: T.SceneManager.fadeOut(30); this.waitCount = 30; return true;
      case 222: T.SceneManager.fadeIn(30); this.waitCount = 30; return true;
      case 223: T.$gameScreen.startTone(p.slice(0, 4), p[4]); return true;
      case 224: T.$gameScreen.startFlash(p.slice(0, 3).concat([p[3] / 255]), p[4]); return true;
      case 225: T.$gameScreen.shake(p[0], p[1], p[2]); return true;
      case 230: this.waitCount = Math.max(1, Math.round((p[0] || 1))); return true;
      case 231: {
        const pr = T.$gameScreen.showPicture(p[0], p[1],
          this.valueOperand(p[3] === 0 ? 0 : 1, p, 4),
          this.valueOperand(p[3] === 0 ? 0 : 1, p, 5), p[6]);
        return true;
      }
      case 235: T.$gameScreen.erasePicture(p[0]); return true;
      case 240: T.AudioManager.playBgm({ name: p[0].name, volume: p[0].volume, pitch: p[0].pitch }); return true;
      case 241: T.AudioManager.stopBgm(1); return true;
      case 245: T.AudioManager.saveBgm(); return true;
      case 246: T.AudioManager.replaySavedBgm(); return true;
      case 249: T.AudioManager.playMe(p[0]); return true;
      case 250: T.AudioManager.playSe(p[0]); return true;
      case 251: return true;
      case 283: T.$gameMap.battleback1Name = p[0]; T.$gameMap.battleback2Name = p[1]; return true;
      /* ---- 战斗 / 商店 ---- */
      case 301: {
        const troopId = p[0] === 0 ? p[1] : T.$gameVariables.value(p[1]);
        this.processBattle(troopId, !!p[2], !!p[3]);
        return false;                            // 战斗期间挂起
      }
      case 601: if (this._battleResult === "win") return true; return "skip";
      case 602: if (this._battleResult === "escape") return true; return "skip";
      case 603: if (this._battleResult === "lose") return true; return "skip";
      case 604: return true;
      case 302: {
        // 收集所有 302/605 商品行
        const goods = [[p[0], p[1]]];
        this._shopPurchaseOnly = !!p[2];
        while (this.index < this.list.length) {
          const next = this.list[this.index];
          if (!next) break;
          if (next.code === 605) { goods.push([next.parameters[0], next.parameters[1]]); this.index++; }
          else if (next.code === 302) { goods.push([next.parameters[0], next.parameters[1]]); this._shopPurchaseOnly = !!next.parameters[2]; this.index++; }
          else break;
        }
        this._shopGoods = goods;
        T.SceneManager.push(new Scene_Shop(goods, this._shopPurchaseOnly));
        this.waitMode = "async";
        this._asyncPromise = new Promise(res => { this._shopResolve = res; });
        T._shopInterpreter = this;
        return false;
      }
      case 605: return true;
      /* ---- 角色/敌人操作 ---- */
      case 311: return this.commandChangeHp(p);
      case 314: {
        if (p[0] === 0) { const a = T.getActor(p[1]); if (a) a.recoverAll(); }
        else for (const a of $gameParty.allMembers()) a.recoverAll();
        return true;
      }
      case 317: return this.commandChangeParam(p);
      case 318: { // 学会/遗忘技能
        const targets = p[0] === 0 ? [T.getActor(p[1])] : $gameParty.allMembers();
        for (const a of targets) {
          if (!a) continue;
          if (p[2] === 0) a.learnedSkillIds = [...new Set([...(a.learnedSkillIds || []), p[3]])];
        }
        return true;
      }
      case 319: { // 更换装备
        const a = T.getActor(p[0]);
        if (a) a.changeEquip(p[1], p[2] || 0);
        return true;
      }
      case 320: { const a = T.getActor(p[0]); if (a) a.name = p[1]; return true; }
      case 331: case 337: return true;            // 敌人相关简化处理
      case 340: return true;
      /* ---- 脚本 ---- */
      case 355: case 655:
        try { new Function(`with(T){${p[0]}}`).call(T.scriptContext || {}); }
        catch (e) { console.warn("script:", p[0], e.message); }
        return true;
      case 357: return true;                      // 插件命令（平台钩子，离线忽略）
      case 505: return true;                      // 移动路线续行（205已内嵌）
      default:
        return true;
    }
  }
  character(id) {
    if (id === -1) return T.$gamePlayer;
    if (id === 0) return T.$gameMap.event(this.eventId);
    return T.$gameMap.event(id);
  }
  commandConditional(p) {
    const t = p[0];
    let result = false;
    switch (t) {
      case 0: result = T.$gameSwitches.value(p[1]) === (p[2] === 0); break;
      case 1: {
        const v1 = T.$gameVariables.value(p[1]);
        const v2 = p[2] === 0 ? p[3] : T.$gameVariables.value(p[3]);
        const op = p[4];
        result = op === 0 ? v1 === v2 : op === 1 ? v1 >= v2 : op === 2 ? v1 <= v2 :
                 op === 3 ? v1 > v2 : op === 4 ? v1 < v2 : v1 !== v2;
        break;
      }
      case 2: result = T.$gameSelfSwitches.value(`${T.$gameMap.mapId},${this.eventId},${p[1]}`); break;
      case 3: result = T.$gameTimer._working && (p[2] === 0 ? T.$gameTimer.seconds() >= p[1] : T.$gameTimer.seconds() <= p[1]); break;
      case 4: {
        const a = T.getActor(p[1]);
        if (!a) break;
        const sub = p[2];
        if (sub === 0) result = $gameParty._actors.includes(p[1]);
        else if (sub === 1) result = a.nickname === p[3];
        else if (sub === 2) result = a.skills().some(s => s.id === p[3]);
        else if (sub === 3) result = Object.values(a._equips).includes(p[3]);
        else if (sub === 4) result = a.isStateAffected(p[3]);
        break;
      }
      case 5: {
        const en = T.BattleScene ? T.BattleScene.enemyAt(p[1]) : null;
        if (!en) break;
        result = p[2] === 0 ? en.appearOk() : en.isStateAffected(p[3]);
        break;
      }
      case 6: {
        // [6, charId, 方向(2下/4左/6右/8上)] 或 [6, charId, 0, x, y] 坐标形式
        const ch = this.character(p[1]);
        if (!ch) break;
        if (p[2] === 0 && p[3] === 1) result = ch.y === p[4];
        else if (p[2] === 0 && p[3] === 0) result = ch.x === p[4];
        else result = ch.direction() === p[2];
        break;
      }
      case 7: result = p[2] === 0 ? $gameParty.gold >= p[1] : $gameParty.gold <= p[1]; break;
      case 8: result = $gameParty.hasItem(T.$dataItems[p[1]]) === (p[2] === 0); break;
      case 9: result = $gameParty.itemCount(T.$dataWeapons[p[1]]) > 0 === (p[2] === 0); break;
      case 10: result = $gameParty.itemCount(T.$dataArmors[p[1]]) > 0 === (p[2] === 0); break;
      case 11: result = T.Input.pressed(p[1]); break;
      case 12: try { result = !!new Function(`with(T){return (${p[1]});}`)(); } catch (e) { result = false; } break;
      case 13: result = true; break;
    }
    this.branches[this.currentIndent] = { taken: result };
    return result;
  }
  commandVariables(p) {
    const [start, end, op, opt] = p;
    for (let i = start; i <= end; i++) {
      let v = 0;
      switch (opt) {
        case 0: v = p[4]; break;
        case 1: v = T.$gameVariables.value(p[4]); break;
        case 2: v = T.randBetween(Math.min(p[4], p[5]), Math.max(p[4], p[5])); break;
        case 3: v = this.gameDataOperand(p.slice(4)); break;
        case 4: try { v = Math.trunc(new Function(`with(T){return (${p[4]});}`)()); } catch (e) { v = 0; } break;
        case 5: { // 敌人数据（战斗中）
          const en = T.BattleScene ? T.BattleScene.enemyAt(p[4]) : null;
          v = en ? (p[5] === -1 ? en.hp : en.param(p[5])) : 0; break;
        }
        case 6: { // 角色数据
          const ch = this.character(p[4]);
          v = ch ? (p[5] === 0 ? ch.x : p[5] === 1 ? ch.y : ch.direction()) : 0; break;
        }
        case 7: { // 其他
          const o = p[4];
          v = o === 0 ? (T.$gameMap ? T.$gameMap.mapId : 0)
            : o === 1 ? $gameParty._actors.length
            : o === 2 ? $gameParty.gold
            : 0;
          break;
        }
      }
      const cur = T.$gameVariables.value(i);
      let nv = cur;
      if (op === 0) nv = v; else if (op === 1) nv = cur + v; else if (op === 2) nv = cur - v;
      else if (op === 3) nv = cur * v; else if (op === 4) nv = v !== 0 ? Math.trunc(cur / v) : 0;
      else if (op === 5) nv = v !== 0 ? cur % v : 0;
      T.$gameVariables.setValue(i, nv);
    }
    return true;
  }
  gameDataOperand(a) {
    const type = a[0], arg1 = a[1], arg2 = a[2];
    switch (type) {
      case 0: return $gameParty.itemCount(T.$dataItems[arg1]);
      case 1: return $gameParty.itemCount(T.$dataWeapons[arg1]);
      case 2: return $gameParty.itemCount(T.$dataArmors[arg1]);
      case 3: { const ac = T.getActor(arg1); return ac ? (arg2 === 0 ? ac.level : arg2 === 1 ? ac.exp : ac.hp) : 0; }
      case 4: { const en = T.BattleScene ? T.BattleScene.enemyAt(arg1) : null; return en ? (arg2 === -1 ? en.hp : en.param(arg2)) : 0; }
      case 5: { const ch = this.character(arg1); return ch ? (arg2 === 0 ? ch.x : arg2 === 1 ? ch.y : ch.direction()) : 0; }
      case 6: return arg1 === 0 ? $gameParty.gold : arg1 === 1 ? $gameParty.steps() : 0;
      case 7: return arg1 === 0 ? T.$gameMap.mapId : 0;
      default: return 0;
    }
  }
  commandSetEventLocation(p) {
    const ch = this.character(p[0]);
    if (!ch) return true;
    const mode = p[1];
    if (mode === 0) { ch.x = p[2]; ch.y = p[3]; }
    else if (mode === 1) { ch.x = T.$gameVariables.value(p[2]); ch.y = T.$gameVariables.value(p[3]); }
    else if (mode === 2 && p[0] !== -1) { /* 与其他事件交换：简化为不处理 */ }
    if (p[4] >= 2 && p[4] <= 8) ch.setDirection(p[4]);
    ch._realX = ch.x; ch._realY = ch.y;
    return true;
  }
  commandChangeHp(p) {
    const targets = p[0] === 0 ? [T.getActor(p[1])] : $gameParty.allMembers();
    const amount = this.valueOperand(p[3] === 0 ? 0 : 1, p, 4);
    for (const a of targets) {
      if (!a) continue;
      if (p[2] === 0) a.hp += amount; else a.hp -= amount;
      if (a.hp <= 0 && !p[5]) a.die();
      else a.refresh();
    }
    return true;
  }
  commandChangeParam(p) {
    const targets = p[0] === 0 ? [T.getActor(p[1])] : $gameParty.allMembers();
    const amount = this.valueOperand(p[3] === 0 ? 0 : 1, p, 4);
    for (const a of targets) {
      if (!a) continue;
      // 通过临时特性实现参数增减
      a._paramBonus = a._paramBonus || {};
      a._paramBonus[p[2]] = (a._paramBonus[p[2]] || 0) + (p[1] === 0 ? amount : -amount);
    }
    return true;
  }
  processBattle(troopId, canEscape, canLose) {
    T.PendingBattle = { troopId, canEscape, canLose, interpreter: this };
  }
}

/* 类导出 */
Object.assign(T, {
  Game_CharacterBase, Game_Character, MoveRouteExecutor,
  Game_Map, Game_Event, Game_Player, Game_Interpreter, DIRV,
});
