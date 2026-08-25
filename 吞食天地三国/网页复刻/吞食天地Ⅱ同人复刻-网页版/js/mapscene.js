/* ============================================================
 * TnDT Engine - mapscene.js
 * 图块地图渲染（A1-A5 自动图块）、行走图精灵、地图场景
 * 自动图块四分格坐标表为公开格式规范中的功能性数据。
 * ============================================================ */
"use strict";

/* ---------------- 公开格式规范：自动图块坐标表 ---------------- */
const FLOOR_AUTOTILE_TABLE = [
  [[2,4],[1,4],[2,3],[1,3]], [[2,0],[1,4],[2,3],[1,3]],
  [[2,4],[3,0],[2,3],[1,3]], [[2,0],[3,0],[2,3],[1,3]],
  [[2,4],[1,4],[2,3],[3,1]], [[2,0],[1,4],[2,3],[3,1]],
  [[2,4],[3,0],[2,3],[3,1]], [[2,0],[3,0],[2,3],[3,1]],
  [[2,4],[1,4],[2,1],[1,3]], [[2,0],[1,4],[2,1],[1,3]],
  [[2,4],[3,0],[2,1],[1,3]], [[2,0],[3,0],[2,1],[1,3]],
  [[2,4],[1,4],[2,1],[3,1]], [[2,0],[1,4],[2,1],[3,1]],
  [[2,4],[3,0],[2,1],[3,1]], [[2,0],[3,0],[2,1],[3,1]],
  [[0,4],[1,4],[0,3],[1,3]], [[0,4],[3,0],[0,3],[1,3]],
  [[0,4],[1,4],[0,3],[3,1]], [[0,4],[3,0],[0,3],[3,1]],
  [[2,2],[1,2],[2,3],[1,3]], [[2,2],[1,2],[2,3],[3,1]],
  [[2,2],[1,2],[2,1],[1,3]], [[2,2],[1,2],[2,1],[3,1]],
  [[2,4],[3,4],[2,3],[3,3]], [[2,4],[3,4],[2,1],[3,3]],
  [[2,0],[3,4],[2,3],[3,3]], [[2,0],[3,4],[2,1],[3,3]],
  [[2,4],[1,4],[2,5],[1,5]], [[2,0],[1,4],[2,5],[1,5]],
  [[2,4],[3,0],[2,5],[1,5]], [[2,0],[3,0],[2,5],[1,5]],
  [[0,4],[3,4],[0,3],[3,3]], [[2,2],[1,2],[2,5],[1,5]],
  [[0,2],[1,2],[0,3],[1,3]], [[0,2],[1,2],[0,3],[3,1]],
  [[2,2],[3,2],[2,3],[3,3]], [[2,2],[3,2],[2,1],[3,3]],
  [[2,4],[3,4],[2,5],[3,5]], [[2,0],[3,4],[2,5],[3,5]],
  [[0,4],[1,4],[0,5],[1,5]], [[0,4],[3,0],[0,5],[1,5]],
  [[0,2],[3,2],[0,3],[3,3]], [[0,2],[1,2],[0,5],[1,5]],
  [[0,4],[3,4],[0,5],[3,5]], [[2,2],[3,2],[2,5],[3,5]],
  [[0,2],[3,2],[0,5],[3,5]], [[0,0],[1,0],[0,1],[1,1]],
];
const WALL_AUTOTILE_TABLE = [
  [[2,2],[1,2],[2,1],[1,1]], [[0,2],[1,2],[0,1],[1,1]],
  [[2,0],[1,0],[2,1],[1,1]], [[0,0],[1,0],[0,1],[1,1]],
  [[2,2],[3,2],[2,1],[3,1]], [[0,2],[3,2],[0,1],[3,1]],
  [[2,0],[3,0],[2,1],[3,1]], [[0,0],[3,0],[0,1],[3,1]],
  [[2,2],[1,2],[2,3],[1,3]], [[0,2],[1,2],[0,3],[1,3]],
  [[2,0],[1,0],[2,3],[1,3]], [[0,0],[1,0],[0,3],[1,3]],
  [[2,2],[3,2],[2,3],[3,3]], [[0,2],[3,2],[0,3],[3,3]],
  [[2,0],[3,0],[2,3],[3,3]], [[0,0],[3,0],[0,3],[3,3]],
  [[2,2],[1,2],[2,1],[1,1]], [[0,2],[1,2],[0,1],[1,1]],
  [[2,0],[1,0],[2,1],[1,1]], [[0,0],[1,0],[0,1],[1,1]],
  [[2,2],[3,2],[2,1],[3,1]], [[0,2],[3,2],[0,1],[3,1]],
  [[2,0],[3,0],[2,1],[3,1]], [[0,0],[3,0],[0,1],[3,1]],
  [[2,2],[1,2],[2,3],[1,3]], [[0,2],[1,2],[0,3],[1,3]],
  [[2,0],[1,0],[2,3],[1,3]], [[0,0],[1,0],[0,3],[1,3]],
  [[2,2],[3,2],[2,3],[3,3]], [[0,2],[3,2],[0,3],[3,3]],
  [[2,0],[3,0],[2,3],[3,3]], [[0,0],[3,0],[0,3],[3,3]],
  [[2,2],[1,2],[2,1],[1,1]], [[0,2],[1,2],[0,1],[1,1]],
  [[2,0],[1,0],[2,1],[1,1]], [[0,0],[1,0],[0,1],[1,1]],
  [[2,2],[3,2],[2,1],[3,1]], [[0,2],[3,2],[0,1],[3,1]],
  [[2,0],[3,0],[2,1],[3,1]], [[0,0],[3,0],[0,1],[3,1]],
  [[2,2],[1,2],[2,3],[1,3]], [[0,2],[1,2],[0,3],[1,3]],
  [[2,0],[1,0],[2,3],[1,3]], [[0,0],[1,0],[0,3],[1,3]],
  [[2,2],[3,2],[2,3],[3,3]], [[0,2],[3,2],[0,3],[3,3]],
  [[2,0],[3,0],[2,3],[3,3]], [[0,0],[3,0],[0,3],[3,3]],
];
const WATERFALL_AUTOTILE_TABLE =
  WALL_AUTOTILE_TABLE.map(e => e.map(([x, y]) => [x, y >= 2 ? y - 2 : y]));

/* 图块 id 常量 */
const TILE_B = 0, TILE_A5 = 1536, TILE_A1 = 2048, TILE_A2 = 2816,
      TILE_A3 = 4352, TILE_A4 = 5888;

function autotileKind(id) { return Math.floor((id - TILE_A1) / 48); }
function autotileShape(id) { return (id - TILE_A1) % 48; }

/* ---------------- 图块渲染器 ---------------- */
class TilemapRenderer {
  constructor() {
    this.sheets = [];       // 9 张图
    this.animationFrame = 0;
    this._tick = 0;
  }
  async load(tilesetName) {
    const names = tilesetName.tilesetNames || [];
    const imgs = await Promise.all(names.map(n => T.ImageManager.tileset(n)));
    this.sheets = imgs;
  }
  update() {
    this._tick++;
    if (this._tick % 20 === 0) this.animationFrame++;
  }
  waterSurfaceIndex() { return [0, 1, 2, 1][this.animationFrame % 4]; }

  drawLayer(ctx, layer, camX, camY) {
    const gm = T.$gameMap;
    const T_ = 32;
    const x0 = Math.floor(camX / T_), y0 = Math.floor(camY / T_);
    const x1 = Math.ceil((camX + T.SCREEN_W) / T_), y1 = Math.ceil((camY + T.SCREEN_H) / T_);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const id = gm.tileId(x, y, layer);
        if (!id) continue;
        const dx = x * T_ - camX, dy = y * T_ - camY;
        this.drawTile(ctx, id, dx, dy);
      }
    }
  }
  drawTile(ctx, id, dx, dy) {
    if (id >= TILE_A1 && id < TILE_A5) this.drawAutotile(ctx, id, dx, dy);
    else this.drawNormal(ctx, id, dx, dy);
  }
  sheet(n) { return this.sheets[n] || null; }
  drawNormal(ctx, id, dx, dy) {
    let setNumber, tid = id;
    if (id >= TILE_A5 && id < TILE_A1) setNumber = 4;
    else setNumber = 5 + Math.floor(id / 256);
    const img = this.sheet(setNumber);
    if (!img) return;
    const sx = ((Math.floor(tid / 128) % 2) * 8 + (tid % 8)) * 32;
    const sy = (Math.floor((tid % 256) / 8) % 16) * 32;
    ctx.drawImage(img, sx, sy, 32, 32, dx, dy, 32, 32);
  }
  drawAutotile(ctx, id, dx, dy) {
    const kind = autotileKind(id), shape = autotileShape(id);
    const tx = kind % 8, ty = Math.floor(kind / 8);
    let setNumber = 0, bx = 0, by = 0;
    let table = FLOOR_AUTOTILE_TABLE;
    const wsi = this.waterSurfaceIndex();
    if (kind < 16) {                       // A1 水/瀑布
      if (kind === 0) { bx = wsi * 2; by = 0; }
      else if (kind === 1) { bx = wsi * 2; by = 3; }
      else if (kind === 2) { bx = 6; by = 0; }
      else if (kind === 3) { bx = 6; by = 3; }
      else {
        bx = Math.floor(tx / 4) * 8;
        by = ty * 6 + ((Math.floor(tx / 2) % 2) * 3);
        if (kind % 2 === 0) bx += wsi * 2;
        else { bx += 6; table = WATERFALL_AUTOTILE_TABLE; by += this.animationFrame % 3; }
      }
    } else if (kind < 48) {                // A2 地面
      setNumber = 1;
      bx = tx * 2; by = (ty - 2) * 3;
    } else if (kind < 80) {                // A3 建筑
      setNumber = 2;
      bx = tx * 2; by = (ty - 6) * 2;
      table = WALL_AUTOTILE_TABLE;
    } else {                               // A4 墙壁
      setNumber = 3;
      bx = tx * 2;
      by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0));
      if (ty % 2 === 1) table = WALL_AUTOTILE_TABLE;
    }
    const entry = table[shape] || table[0];
    const img = this.sheet(setNumber);
    if (!img) return;
    for (let i = 0; i < 4; i++) {
      const qsx = entry[i][0], qsy = entry[i][1];
      const sx = (bx * 2 + qsx) * 16, sy = (by * 2 + qsy) * 16;
      const ddx = dx + (i % 2) * 16, ddy = dy + Math.floor(i / 2) * 16;
      ctx.drawImage(img, sx, sy, 16, 16, ddx, ddy, 16, 16);
    }
  }
}

/* ---------------- 行走图精灵 ---------------- */
T.charImgCache = new Map();
T.loadCharImg = async function (name) {
  if (!name) return null;
  if (!T.charImgCache.has(name)) {
    T.charImgCache.set(name, T.ImageManager.char(name));
  }
  return T.charImgCache.get(name);
};

class Sprite_Character {
  constructor(chr) {
    this.chr = chr;
    this.imgName = null;
    this.img = null;
  }
  async syncImage() {
    const info = this.chr.imageInfo ? this.chr.imageInfo() : null;
    const name = info ? info.name : (this.chr.imageCharName ? this.chr.imageCharName() : "");
    if (name !== this.imgName) {
      this.imgName = name;
      this.img = name ? await T.loadCharImg(name) : null;
    }
    if (this.img === undefined) this.img = null;
    if (this.img && this.img.then) { const p = this.img; p.then(v => { this.img = v; }); this.img = null; }
  }
  frameRect() {
    const name = this.imgName || "";
    const img = this.img;
    if (!img || !name) return null;
    const ci = (this.chr.imageIndex != null) ? this.chr.imageIndex()
             : (this.chr.imageInfo ? this.chr.imageInfo().index : 0);
    let fw, fh, ox, oy;
    if (name.startsWith("$")) { fw = img.width / 3; fh = img.height / 4; ox = 0; oy = 0; }
    else { fw = img.width / 12; fh = img.height / 8; ox = (ci % 4) * fw * 3; oy = Math.floor(ci / 4) * fh * 4; }
    const dirRow = { 2: 0, 4: 1, 6: 2, 8: 3 }[this.chr.direction()] || 0;
    const pat = this.chr.pattern();
    return { sx: ox + pat * fw, sy: oy + dirRow * fh, fw, fh };
  }
  draw(ctx, camX, camY) {
    const c = this.chr;
    if (c._transparent || c._erased) return;
    const r = this.frameRect();
    if (!r) return;
    const px = Math.round(c._realX * 32 - camX);
    const py = Math.round(c._realY * 32 - camY);
    const dh = r.fh;
    ctx.drawImage(this.img, r.sx, r.sy, r.fw, r.fh,
      px + (32 - r.fw) / 2, py + 32 - r.fh, r.fw, dh);
  }
}

/* ---------------- 地图场景 ---------------- */
class Scene_Map {
  constructor() { this.created = false; }
  async create(mapId, x, y, dir) {
    await T.DataManager.loadMapData(mapId);
    if (!T.$gameMap || !(T.$gameMap instanceof Game_Map)) T.$gameMap = new Game_Map();
    T.$gameMap.setup(mapId);
    if (!T.$gamePlayer) T.$gamePlayer = new Game_Player();
    T.$gamePlayer.x = x; T.$gamePlayer.y = y;
    T.$gamePlayer._prevX = x; T.$gamePlayer._prevY = y;   // 传送不算移动
    T.$gamePlayer._realX = x; T.$gamePlayer._realY = y;
    T.$gamePlayer.setDirection(dir || 2);
    this.tilemap = new TilemapRenderer();
    await this.tilemap.load(T.$gameMap.tileset());
    this.sprites = new Map();
    for (const ev of T.$gameMap.events) this.sprites.set(ev.eventId, new Sprite_Character(ev));
    this.playerSprite = new Sprite_Character(T.$gamePlayer);
    this.messageWindow = new Window_Message();
    this.goldWindow = new Window_Gold(8, 8, 160);
    this.goldWindow.close();
    this.menuPending = false;
    this._lastStepCheck = T.$gameParty.steps();
    this.created = true;
    // 地图 BGM
    const bgm = T.$dataMap.bgm;
    if (bgm && bgm.name) T.AudioManager.playBgm(bgm);
    else T.AudioManager.stopBgm();
    if (T.$dataMap.bgs && T.$dataMap.bgs.name) T.AudioManager.playBgs(T.$dataMap.bgs);
    // 开场自动事件
    T.$gameMap.refreshEvents();
  }
  camPos() {
    const p = T.$gamePlayer;
    const mw = T.$gameMap.width * 32, mh = T.$gameMap.height * 32;
    let cx = p._realX * 32 + 16 - T.SCREEN_W / 2;
    let cy = p._realY * 32 + 16 - T.SCREEN_H / 2;
    cx = mw > T.SCREEN_W ? T.clamp(cx, 0, mw - T.SCREEN_W) : -(T.SCREEN_W - mw) / 2;
    cy = mh > T.SCREEN_H ? T.clamp(cy, 0, mh - T.SCREEN_H) : -(T.SCREEN_H - mh) / 2;
    return { x: Math.round(cx), y: Math.round(cy) };
  }

  update() {
    if (!this.created) return;
    this.tilemap.update();
    T.$gameScreen.update();
    const interp = T.$gameMap.interpreter;

    /* 战斗挂起请求 */
    if (T.PendingBattle) {
      const req = T.PendingBattle; T.PendingBattle = null;
      T.SceneManager.startBattle(req, interp);
      return;
    }

    /* 菜单呼出 */
    if (!interp.isRunning() && !this.messageWindow.isOpen() &&
        T.Input.triggered("cancel") && !T.SceneManager.busy) {
      T.AudioManager.playSe({ name: "Ok", volume: 60 });
      T.SceneManager.openMenu();
      return;
    }

    /* 解释器驱动 */
    if (interp.isRunning()) {
      T.currentInterpreter = interp;
      interp.update();
    }

    /* 地图状态推进（事件动画、玩家移动输入） */
    T.$gameMap.update(true);

    /* 消息窗与选择窗（选择窗独立于解释器状态驱动） */
    this.messageWindow.update();
    if (this.messageWindow.choiceWindow) this.messageWindow.updateChoices();
    if (this.goldWindow.isOpen()) this.goldWindow.update();

    /* 自动事件（autorun）*/
    if (!interp.isRunning()) {
      for (const ev of T.$gameMap.events) {
        if (ev._erased || !ev.page) continue;
        if (ev.page.trigger === 2 && !ev._ranAuto) {
          ev._ranAuto = true;
          interp.setup(ev.list(), ev.eventId);
          break;
        }
      }
    }

    /* 并行事件（解释器挂全局池：跨地图传送后仍继续执行剩余命令） */
    T._parallelPool = T._parallelPool || {};
    const pool = T._parallelPool;
    const curMap = T.$gameMap.mapId;
    for (const ev of T.$gameMap.events) {
      if (ev._erased || !ev.page || ev.page.trigger !== 3) continue;
      const key = curMap + ":" + ev.eventId;
      let pi = pool[key];
      if (!pi || pi._pageKey !== ev.page || !pi.isRunning()) {
        pi = new Game_Interpreter(1);
        pi._pageKey = ev.page;
        pi.setup(ev.list(), ev.eventId);
        pool[key] = pi;
      }
      T.currentInterpreter = pi;
      pi.update();
      if (!pi.isRunning()) delete pool[key];
    }
    /* 驱动跨图残留的并行事件（传送后仍在收尾） */
    for (const key in pool) {
      const mid = +key.split(":")[0];
      if (mid === curMap) continue;
      const pi = pool[key];
      if (pi.isRunning()) { T.currentInterpreter = pi; pi.update(); }
      else delete pool[key];
    }

    /* 触发事件（消息窗完全关闭时才允许，避免同一帧 Enter 推进对话后重复触发） */
    if (!interp.isRunning() && T.$gameMessage.texts.length === 0 && !this.messageWindow.isOpen()) {
      this.checkTriggers();
      /* 消费 starting 标志：把被触发的事件装入主解释器 */
      const started = T.$gameMap.events.find(e => e.starting && !e._erased);
      if (started && started.page) {
        interp.setup(started.list(), started.eventId);
        started.clearStartingFlag();
      }
    }

    /* 遭遇 */
    if (!interp.isRunning() && !T.$gamePlayer.isMoving() &&
        T.$gameParty.steps() !== this._lastStepCheck) {
      this._lastStepCheck = T.$gameParty.steps();
      this.checkEncounter();
    }

    /* 同步精灵图像 */
    for (const sp of this.sprites.values()) sp.syncImage();
    this.syncPlayerSprite();
  }
  syncPlayerSprite() {
    const ps = this.playerSprite;
    const want = ps.imgName;
    const lead = $gameParty.battleMembers()[0] || $gameParty.allMembers()[0];
    const nm = lead ? "$" + lead.svBattlerName() : "$01";
    if (want !== nm) {
      ps.imgName = nm;
      ps.img = null;
      T.loadCharImg(nm).then(img => { ps.img = img; });
    }
  }
  checkTriggers() {
    const p = T.$gamePlayer;
    const abBtn = T.Input.triggered("ok");
    const [fx, fy] = DIRV[p.direction()];
    /* 玩家触碰触发：仅当玩家刚移动进入该格（传送/初始化不算移动），
       不要求完全停住——快速连续移动经过事件格时也应触发 */
    const justMoved = p._prevX !== undefined && (p._prevX !== p.x || p._prevY !== p.y);
    const targets = [];
    if (abBtn) {
      targets.push([p.x + fx, p.y + fy], [p.x, p.y]);
    } else if (justMoved) {
      targets.push([p.x, p.y]);
    }
    for (const [tx, ty] of targets) {
      for (const ev of T.$gameMap.events) {
        if (ev._erased || !ev.page || ev.starting) continue;
        if (!ev.pos(tx, ty)) continue;
        const trig = ev.page.trigger;
        if (trig === 0 && abBtn && !p.isMoving()) { ev.start(); return; }
        if (trig === 1 && p.pos(tx, ty)) { ev.start(); return; }
      }
    }
    if (abBtn && !p.isMoving()) {
      // 面向格无事件时的其他交互（暂无）
    }
  }
  checkEncounter() {
    const gm = T.$gameMap;
    if (!gm.encounterList.length) return;
    const stepsAvg = gm.encounterStep || 30;
    gm.encounterProgress += 1 + T.rand(Math.round(stepsAvg / 2));
    if (gm.encounterProgress >= stepsAvg) {
      const cands = gm.encounterCandidates();
      if (!cands.length) return;              // 无候选时保留进度，稍后再试
      gm.encounterProgress = 0;
      const totalW = cands.reduce((s, c) => s + (c.weight || 1), 0);
      let roll = Math.random() * totalW;
      let troopId = cands[0].troopId;
      for (const c of cands) { roll -= (c.weight || 1); if (roll < 0) { troopId = c.troopId; break; } }
      // 遭遇判定通过，发起战斗
      T.AudioManager.playSe({ name: "Battle1", volume: 90 });
      T.$gameMap.interpreter.processBattle(troopId, true, true);
    }
  }
  draw(ctx) {
    if (!this.created) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, T.SCREEN_W, T.SCREEN_H);
    const cam = this.camPos();
    const shx = T.$gameScreen.shakeOffsetX();
    ctx.save();
    ctx.translate(shx, 0);
    this.tilemap.drawLayer(ctx, 0, cam.x, cam.y);
    this.tilemap.drawLayer(ctx, 1, cam.x, cam.y);
    /* 低于角色层（priorityType 0）的事件：先画，作为地面装饰 */
    const below = [...this.sprites.entries()]
      .filter(([id]) => { const ev = T.$gameMap.event(id); return ev && !ev._erased && ev.priorityType() === 0; })
      .map(([, sp]) => sp);
    for (const sp of below) sp.draw(ctx, cam.x, cam.y);
    /* 精灵按 y 排序绘制 */
    const list = [...this.sprites.entries()]
      .filter(([id]) => { const ev = T.$gameMap.event(id); return ev && !ev._erased && ev.priorityType() === 1; })
      .map(([id, sp]) => ({ ev: T.$gameMap.event(id), sp }));
    if (!$gamePlayer._transparent) list.push({ ev: T.$gamePlayer, sp: this.playerSprite });
    list.sort((a, b) => a.ev._realY - b.ev._realY);
    for (const it of list) it.sp.draw(ctx, cam.x, cam.y);
    this.tilemap.drawLayer(ctx, 2, cam.x, cam.y);
    this.tilemap.drawLayer(ctx, 3, cam.x, cam.y);
    /* 高层事件（priorityType 2）再画一层保证覆盖 */
    const upper = [...this.sprites.entries()]
      .filter(([id]) => { const ev = T.$gameMap.event(id); return ev && !ev._erased && ev.priorityType() === 2; })
      .map(([, sp]) => sp);
    for (const sp of upper) sp.draw(ctx, cam.x, cam.y);
    ctx.restore();

    /* 图片 */
    this.drawPictures(ctx);

    /* 屏幕效果 */
    this.applyTone(ctx);
    this.applyFlash(ctx);

    /* UI */
    this.goldWindow.draw(ctx);
    this.messageWindow.draw(ctx);

    /* 渐变遮罩 */
    this.applyFade(ctx);
  }
  drawPictures(ctx) {
    const pics = Object.values(T.$gameScreen.pictures || {});
    for (const p of pics) {
      const img = p.img;
      if (!(img instanceof HTMLImageElement)) continue;
      ctx.save();
      ctx.globalAlpha = (p.opacity ?? 255) / 255;
      const sc = (p.scale ?? 100) / 100;
      const w = img.width * sc, h = img.height * sc;
      ctx.drawImage(img, p.x - w / 2, p.y - h / 2, w, h);
      ctx.restore();
    }
  }
  applyTone(ctx) {
    const t = T.$gameScreen._tone;
    if (Math.abs(t[0]) < 4 && Math.abs(t[1]) < 4 && Math.abs(t[2]) < 4 && t[3] < 4) return;
    ctx.save();
    if (t[3] > 4) {
      try { ctx.filter = `grayscale(${t[3]}%)`; ctx.fillStyle = "#000"; ctx.fillRect(-2, -2, 2, 2); } catch (e) {}
      ctx.filter = "none";
    }
    ctx.globalCompositeOperation = t[0] + t[1] + t[2] >= 0 ? "screen" : "multiply";
    const col = c => c > 0 ? c : 0;
    ctx.fillStyle = `rgba(${col(t[0])},${col(t[1])},${col(t[2])},0.45)`;
    ctx.fillRect(0, 0, T.SCREEN_W, T.SCREEN_H);
    ctx.restore();
  }
  applyFlash(ctx) {
    if (T.$gameScreen._flashDur <= 0) return;
    const c = T.$gameScreen._flashColor;
    ctx.save();
    ctx.globalAlpha = (c[3] ?? 1) * (T.$gameScreen._flashDur / 30);
    ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    ctx.fillRect(0, 0, T.SCREEN_W, T.SCREEN_H);
    ctx.restore();
  }
  applyFade(ctx) {
    const s = T.$gameScreen;
    if (s.fadeDuration <= 0 && s.fadeCount <= 0) return;
    const total = Math.max(1, s.fadeDuration);
    let alpha;
    if (s.fadeCount > 0) alpha = s.fadeCount / total;         // 正在变黑/变白过程
    else alpha = s.fadeType === 2 ? 0 : 1;
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = s.fadeColor || "#000";
    ctx.fillRect(0, 0, T.SCREEN_W, T.SCREEN_H);
    ctx.restore();
  }
}

/* 类导出 */
Object.assign(T, { Scene_Map, TilemapRenderer, Sprite_Character });
