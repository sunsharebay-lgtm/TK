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
    if (T._pendingBattleTransfer) {
      const t = T._pendingBattleTransfer; T._pendingBattleTransfer = null;
      T.SceneManager.gotoMap(t.mapId, t.x, t.y, [2,4,6,8].includes(t.dir) ? t.dir : 2);
    }
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
    /* A1-A4 自动图块范围 2048-8191；原判断用了 TILE_A5(1536) 导致 A 系列永远走普通图块 */
    if (id >= TILE_A1 && id < 8192) this.drawAutotile(ctx, id, dx, dy);
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


/* 跟随显示：>3人显示3人（刘备+2队友），≤3人显示实际人数 */
class FollowerChar {
  constructor(actor) {
    this.actor = actor;
    this._realX = 0; this._realY = 0; this._moving = false;
    this._direction = 2;
    this._pattern = 1;
  }
  x() { return this._tx; } y() { return this._ty; }
  direction() { return this._direction; }
  pattern() { return this._pattern; }
  imageInfo() { return { name: "$" + (this.actor.svBattlerName ? this.actor.svBattlerName() : ""), index: 0 }; }
  isMoving() { return this._moving; }
  get _transparent() { return false; }
  get _erased() { return false; }
}

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
    const px = Math.round(c._realX * 32 - camX);
    const py = Math.round(c._realY * 32 - camY);
    if (c.isOpenedChest && c.isOpenedChest()) { this.drawOpenedChest(ctx, px, py); return; }
    const r = this.frameRect();
    if (!r) return;
    const dh = r.fh;
    ctx.drawImage(this.img, r.sx, r.sy, r.fw, r.fh,
      px + (32 - r.fw) / 2, py + 32 - r.fh, r.fw, dh);
  }
  drawOpenedChest(ctx, px, py) {
    const x = px + 3, y = py + 8;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(x + 1, y + 17, 26, 7);
    ctx.fillStyle = "#6b2c16";
    ctx.fillRect(x + 2, y + 11, 25, 11);
    ctx.fillStyle = "#d8892b";
    ctx.fillRect(x + 4, y + 13, 21, 7);
    ctx.fillStyle = "#f4c05d";
    ctx.fillRect(x + 6, y + 14, 17, 2);
    ctx.fillStyle = "#5b2418";
    ctx.fillRect(x + 5, y + 3, 20, 7);
    ctx.fillStyle = "#c56b25";
    ctx.fillRect(x + 7, y + 4, 16, 4);
    ctx.fillStyle = "#f4c05d";
    ctx.fillRect(x + 9, y + 5, 12, 2);
    ctx.fillStyle = "#fff0a0";
    ctx.fillRect(x + 12, y + 11, 5, 3);
    ctx.restore();
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
    this.followerSprites = [];
    this._trail = [];
    this._lastTrailKey = "";
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

    this.updateFollowers();
    /* 同步精灵图像 */
    for (const sp of this.sprites.values()) sp.syncImage();
    this.syncPlayerSprite();
    this.showChapterGuide();
  }
  showChapterGuide() {
    const mapId = T.$gameMap.mapId;
    const stage = T.$gameVariables.value(1);
    const chapter = T.chapterForStage ? T.chapterForStage(stage) : null;
    let text = "";
    if (mapId === 23 && stage === 30) text = "纪灵已败。下一步请向东北前进，面向袁术按确认键，不必寻找渡船。";
    else if (mapId === 23 && stage === 35) text = "袁术已退入寿春。请进入寿春城，再到城内民居打听军情。";
    else if (mapId === 23 && stage === 40) text = "袁胤已败。请前往寿春山洞深处，消灭袁术残军。";
    else if (mapId === 23 && stage >= 45 && stage < 50) text = "袁术已败。请沿西南方向返回徐州，在城中复命，第一章就此收尾。";
    else if (mapId === 28 && stage === 35) text = "寿春城已攻下。请进入西侧民居，取得进入山洞的线索。";
    else if (mapId === 31 && stage < 40) text = "这里是寿春山洞，还不是最后战场。请从洞口返回大地图，先推进寿春城的军情。";
    else if (mapId === 31 && stage === 40) text = "寿春山洞中没有渡船。请先在中段找到高升，再前往洞窟北端。";
    else if (mapId === 31 && stage >= 45) text = "袁术已败，第一章完成。请向上方出口离开山洞，回到大地图后沿西南方向前往徐州复命。";
    else if (mapId === 29 && stage >= 45 && stage < 65) text = "袁术已败。郑家村北面的宅院通往郑玄居，取得书信后才能投奔袁绍。";
    else if (mapId === 29 && stage >= 65 && stage < 70) text = "郑家村北面的宅院就是郑玄居。请进去请先生为袁绍修书。";
    else if (mapId === 23 && stage >= 80 && stage < 260) text = "第二章「河北鏖战与千里走单骑」：向北进入冀州城，按袁绍军令推进颜良、文丑和关羽五关路线。";
    else if (mapId === 25 && stage >= 260 && stage < 470) text = "第三章「荆州新野与三顾茅庐」：先入荆州听取刘表军令，再推进水镜居、孔明局、博望坡和长坂坡。";
    else if (mapId === 25 && stage >= 470 && stage < 830) text = "第四章「赤壁之战与平定荆州」：准备火药和秘法书，完成赤壁后再攻略南郡与荆州诸郡。";
    else if (mapId === 25 && stage >= 830 && stage < 1165) text = "第五章「西蜀入川」：从新野出兵，沿成都、巴关、建宁、越隽和绵竹路线推进。";
    else if (mapId === 25 && stage >= 1165 && stage < 1440) text = "第六章「汉中争夺与姜维归汉」：先守汉中，再依军令前往南安、天水、街亭和陈仓。";
    else if (mapId === 25 && stage >= 1440 && stage < 1605) text = "第七章「北伐灭曹魏」：从鲁城向渭水关、五丈原和长安推进，石阵可用九转丹破局。";
    else if (mapId === 23 && stage >= 1605 && stage < 1655) text = "第八章「荆州终局与伐吴」：从洛阳水路返回荆州，按军令完成樊城与柴桑终战。";
    else if (mapId === 24 && stage >= 1655) text = "二周目特别篇「秦皇陵」：准备好队伍和补给，进入秦皇陵挑战葛玄、曹操、袁绍与秦始皇。";
    else if (mapId === 159 && stage >= 30 && stage < 45) text = "曹操暂时没有新的军令。请出城前往大地图，继续追击袁术。";
    if (!text && chapter && chapter.id >= 2) text = `当前主线：${chapter.name}。请查看城中人物和大地图入口，按对话推进。`;
    if (!text || !T.$gameSystem || T.$gameMessage.texts.length || this.messageWindow.isOpen()) return;
    T.$gameSystem.chapterGuides = T.$gameSystem.chapterGuides || {};
    const key = `${mapId}:${stage}`;
    if (T.$gameSystem.chapterGuides[key]) return;
    T.$gameSystem.chapterGuides[key] = true;
    T.$gameMessage.add(text);
  }
  updateFollowers() {
    const members = T.$gameParty.battleMembers();
    const count = Math.min(Math.max(0, members.length - 1), 2);
    if (!count) return;
    const p = T.$gamePlayer;
    const key = Math.round(p.x) + ',' + Math.round(p.y);
    if (key !== this._lastTrailKey) {
      this._trail.unshift({ x: Math.round(p.x), y: Math.round(p.y), d: p.direction() });
      if (this._trail.length > 30) this._trail.pop();
      this._lastTrailKey = key;
    }
    while (this.followerSprites.length < count) this.followerSprites.push(null);
    this.followerSprites.length = count;
    for (let i = 0; i < count; i++) {
      const actor = members[i + 1];
      let sp = this.followerSprites[i];
      if (!sp || sp.follow.actor !== actor) { sp = new Sprite_Character(new FollowerChar(actor)); sp.follow = { actor }; this.followerSprites[i] = sp; }
      const t = this._trail[(i + 1) * 4] || this._trail[this._trail.length - 1];
      const ch = sp.chr;
      if (t) {
        const tx = t.x + 0.5, ty = t.y + 0.5;
        ch._tx = t.x; ch._ty = t.y;
        ch._direction = t.d;
        if (Math.abs(ch._realX - tx) > 0.02 || Math.abs(ch._realY - ty) > 0.02) {
          ch._realX += Math.max(-0.12, Math.min(0.12, tx - ch._realX));
          ch._realY += Math.max(-0.12, Math.min(0.12, ty - ch._realY));
          ch._moving = true;
          ch._pattern = (ch._pattern || 1) % 2 === 1 ? 2 : 0;
        } else { ch._moving = false; ch._pattern = 1; }
      }
    }
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
    /* 第一章灭袁术后，西南返回门即使站位偏一格也能触发，避免回城入口被地图事件页挡住。 */
    if (abBtn && !p.isMoving() && T.$gameMap.mapId === 23 && T.$gameVariables.value(1) >= 45) {
      const gate = T.$gameMap.event(4);
      if (gate && gate.page && Math.abs(gate.x - p.x) + Math.abs(gate.y - p.y) <= 1) {
        gate.start(); return;
      }
    }
    /* 玩家触碰触发：仅当玩家刚移动进入该格（传送/初始化不算移动），
       不要求完全停住——快速连续移动经过事件格时也应触发 */
    const justMoved = p._prevX !== undefined && (p._prevX !== p.x || p._prevY !== p.y);
    const targets = [];
    if (abBtn) {
      /* 原版确认键优先触发“面前”的事件（宝箱/店主）；站立格用于隐藏光点；
         面前两格仅保留给跨柜台 NPC，不用于宝箱/光点，避免隔一格误开旁边的宝箱 */
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
        if (trig === 1 && abBtn && !p.isMoving() && ev.list().some(c => c && c.code === 301)) { ev.start(); return; }
        if (trig === 1 && abBtn && !p.isMoving() && ev.list().some(c => c && c.code === 201)) { ev.start(); return; }
        if (trig === 1 && p.pos(tx, ty)) { ev.start(); return; }
      }
    }
    if (abBtn && !p.isMoving()) {
      /* 跨柜台：仅对店主/掌柜这类事件允许面前两格触发 */
      const far = [p.x + fx * 2, p.y + fy * 2];
      for (const ev of T.$gameMap.events) {
        if (ev._erased || !ev.page || ev.starting || !ev.pos(...far)) continue;
        const img = ev.imageInfo ? ev.imageInfo().name : "";
        if (img.includes("$baoxiang") || img.includes("$guangdian")) continue;
        if (ev.page.trigger === 0) { ev.start(); return; }
      }
    }
    if (abBtn && !p.isMoving()) {
      // 面向格无事件时的其他交互（暂无）
    }
  }
  checkEncounter() {
    const gm = T.$gameMap;
    if (!gm.encounterList.length) return;
    if (T.PendingBattle || T.BattleScene || gm.interpreter.isRunning()) return;
    if (T.$gameSwitches.value(38)) return;   // G5: 护身烟/烟遁计/强身烟 禁止遇敌（136/公共事件链路）
    const stepsAvg = gm.encounterStep || 30;
    gm.encounterProgress += 1;
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
    const cam2 = this.camPos();
    for (const sp of this.followerSprites || []) { if (sp) sp.draw(ctx, cam2.x, cam2.y); }
    /* 低于角色层（priorityType 0）的事件：先画，作为地面装饰 */
    const below = [...this.sprites.entries()]
      .filter(([id]) => { const ev = T.$gameMap.event(id); return ev && !ev._erased && ev.priorityType() === 0; })
      .map(([, sp]) => sp);
    for (const sp of below) sp.draw(ctx, cam.x, cam.y);
    /* layer2 通常是桥面/地面装饰，应画在角色下方，避免桥覆盖队伍 */
    this.tilemap.drawLayer(ctx, 2, cam.x, cam.y);
    /* 精灵按 y 排序绘制 */
    const list = [...this.sprites.entries()]
      .filter(([id]) => { const ev = T.$gameMap.event(id); return ev && !ev._erased && ev.priorityType() === 1; })
      .map(([id, sp]) => ({ ev: T.$gameMap.event(id), sp }));
    if (!$gamePlayer._transparent) list.push({ ev: T.$gamePlayer, sp: this.playerSprite });
    list.sort((a, b) => a.ev._realY - b.ev._realY);
    for (const it of list) it.sp.draw(ctx, cam.x, cam.y);
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
