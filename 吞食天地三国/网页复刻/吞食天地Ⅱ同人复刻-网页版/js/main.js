/* ============================================================
 * TnDT Engine - main.js
 * 场景管理器、标题画面、结束画面、主循环与启动流程
 * ============================================================ */
"use strict";

/* ---------------- 场景管理器 ---------------- */
T.SceneManager = {
  stack: [],
  busy: false,
  current() { return this.stack[this.stack.length - 1]; },
  push(scene) { this.stack.push(scene); },
  popScene(silent) {
    this.stack.pop();
    if (!silent && !this.current()) this.gotoTitle();
  },
  async gotoMap(mapId, x, y, dir) {
    const mapScene = new Scene_Map();
    await mapScene.create(mapId, x, y, dir);
    this.stack = [mapScene];
  },
  async transferPlayer(mapId, x, y, dir, fadeType) {
    if (this.busy) return;
    if (T.$gameMap && [23, 24, 25].includes(T.$gameMap.mapId) && T.$gameSystem) {
      T.$gameSystem.worldPosition = { mapId: T.$gameMap.mapId, x: T.$gamePlayer.x, y: T.$gamePlayer.y };
    }
    this.busy = true;
    const s = T.$gameScreen;
    s.fadeColor = fadeType === 1 ? "#fff" : "#000";
    s.fadeDuration = 24; s.fadeCount = 24;
    await waitFrames(26);
    /* 清除并行解释器缓存 */
    if (T.$gameMap) T.$gameMap._parallel = null;
    await this.gotoMap(mapId, x, y, dir);
    s.fadeDuration = 24; s.fadeCount = 24;
    s.fadeType = 2; s.fadeColor = null;
    this.busy = false;
  },
  openMenu() { this.push(new Scene_Menu()); },
  startBattle(req, interp) {
    this.busy = true;
    T.AudioManager.saveBgm();
    T.AudioManager.stopBgs(0.3);
    T.AudioManager.playBgm(T.$dataSystem.battleBgm || { name: "Battle1", volume: 90 });
    setTimeout(() => { this.busy = false; }, 400);
    this.push(new Scene_Battle(req, interp));
  },
  returnToMapFromMenu() {
    // 读档后重建地图场景
    this.stack = [];
  },
  gameOver() {
    this.stack = [new Scene_GameOver()];
  },
  async fadeIn(f) { const s = T.$gameScreen; s.fadeColor = null; s.fadeDuration = f; s.fadeCount = 0; s.fadeType = 2; },
  async fadeOut(f) {
    const s = T.$gameScreen;
    s.fadeColor = "#000"; s.fadeDuration = f; s.fadeCount = f;
    await waitFrames(f + 2);
  },
};
function waitFrames(n) {
  return new Promise(res => {
    let c = n;
    const step = () => { if (--c <= 0) res(); else setTimeout(step, 0); };
    setTimeout(step, 0);
  });
}

/* ---------------- 标题画面 ---------------- */
class Scene_Title {
  constructor() { this.commands = ["开始游戏", "继续游戏"]; this.index = 0; this.img = null; this.img2 = null; }
  async create() {
    const t1 = T.$dataSystem.title1Name;
    const t2 = T.$dataSystem.title2Name;
    if (t1) T.ImageManager.title1(t1).then(i => { this.img = i; });
    if (t2) T.ImageManager.title2(t2).then(i => { this.img2 = i; });
    T.AudioManager.playBgm(T.$dataSystem.titleBgm || { name: "Theme1", volume: 90 });
    this.hasSave = [0, 1, 2, 3].some(i => T.hasSaveFile(i));
  }
  update() {
    if (T.Input.repeated("down")) { this.index = (this.index + 1) % this.commands.length; T.AudioManager.playSe({ name: "Cursor", volume: 70 }); }
    if (T.Input.repeated("up")) { this.index = (this.index - 1 + this.commands.length) % this.commands.length; T.AudioManager.playSe({ name: "Cursor", volume: 70 }); }
    if (T.Input.triggered("ok")) {
      if (this.index === 0) this.startNewGame();
      else this.continueGame();
    }
  }
  async startNewGame() {
    T.AudioManager.playSe({ name: "Ok", volume: 60 });
    T.resetGameState();
    T.ActorRegistry = {};
    T.$gameVariables.setValue(4, 1); // 跳过登录系统，直接激活开场剧情
    const sys = T.$dataSystem;
    await T.SceneManager.gotoMap(sys.startMapId || 19, sys.startX || 1, sys.startY || 24, 2);
  }
  async continueGame() {
    // 选择最新的存档
    let best = -1, bestTime = 0;
    for (let i = 0; i < 4; i++) {
      const inf = T.saveInfo(i);
      if (inf && inf.savedAt > bestTime) { bestTime = inf.savedAt; best = i; }
    }
    if (best < 0) { T.AudioManager.playSe({ name: "Buzzer", volume: 60 }); return; }
    await T.loadGame(best);
  }
  draw(ctx) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, T.SCREEN_W, T.SCREEN_H);
    if (this.img instanceof HTMLImageElement) ctx.drawImage(this.img, 0, 0, T.SCREEN_W, T.SCREEN_H);
    if (this.img2 instanceof HTMLImageElement) ctx.drawImage(this.img2, 0, 0, T.SCREEN_W, T.SCREEN_H);
    /* 标题文字：标题图已含品牌信息，仅在缺图时绘制文字 */
    if (!(this.img instanceof HTMLImageElement)) {
      const rawTitle = (T.$dataSystem.gameTitle || "").split(" - ")[0] || "吞食天地";
      ctx.save();
      ctx.font = T.fontStr(52, true);
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillText(rawTitle, T.SCREEN_W / 2 - ctx.measureText(rawTitle).width / 2 + 3, 63);
      ctx.fillStyle = "#ffd24d";
      const tw = ctx.measureText(rawTitle).width;
      ctx.fillText(rawTitle, T.SCREEN_W / 2 - tw / 2, 60);
      ctx.restore();
    }
    /* 指令 */
    const cy = T.SCREEN_H - 200;
    for (let i = 0; i < this.commands.length; i++) {
      const enabled = i === 0 || this.hasSave;
      const label = this.commands[i];
      const y = cy + i * 56;
      ctx.save();
      ctx.font = T.fontStr(28);
      const w = ctx.measureText(label).width;
      if (i === this.index) {
        ctx.fillStyle = "rgba(120,170,255,0.25)";
        T.roundRect(ctx, T.SCREEN_W / 2 - w / 2 - 20, y - 6, w + 40, 44, 8, true);
        ctx.strokeStyle = "rgba(190,215,255,0.8)";
        ctx.lineWidth = 2;
        T.roundRect(ctx, T.SCREEN_W / 2 - w / 2 - 20, y - 6, w + 40, 44, 8, false, true);
      }
      ctx.globalAlpha = enabled ? 1 : 0.4;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.fillText(label, T.SCREEN_W / 2, y + 16);
      ctx.restore();
    }
    ctx.font = T.fontStr(16);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.textAlign = "center";
    ctx.fillText("方向键移动 · Z/回车 确认 · X 取消/菜单", T.SCREEN_W / 2, T.SCREEN_H - 34);
    ctx.textAlign = "left";
  }
}

/* ---------------- 结束画面 ---------------- */
class Scene_GameOver {
  constructor() {
    this.commands = ["回到标题"];
    this.index = 0;
    T.AudioManager.stopBgm(1);
    const me = T.$dataSystem.gameoverMe || T.$dataSystem.defeatMe || { name: "Gameover1", volume: 90 };
    T.AudioManager.playMe(me);
  }
  update() {
    if (T.Input.triggered("ok") || T.Input.triggered("cancel")) {
      T.SceneManager.gotoTitle();
    }
  }
  async draw(ctx) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, T.SCREEN_W, T.SCREEN_H);
    const img = this._img;
    if (img) ctx.drawImage(img, 0, 0, T.SCREEN_W, T.SCREEN_H);
    if (this._loading == null) {
      this._loading = true;
      const n = T.$dataSystem.gameover1Name;
      if (n) T.ImageManager.system(n).then(i => { this._img = i; }).catch(() => {});
    }
    ctx.save();
    ctx.font = T.fontStr(44, true);
    ctx.fillStyle = "#c33";
    ctx.textAlign = "center";
    ctx.fillText("全 军 覆 没", T.SCREEN_W / 2, T.SCREEN_H / 2 - 80);
    ctx.font = T.fontStr(22);
    ctx.fillStyle = "#fff";
    ctx.fillText("按 确认键 返回标题", T.SCREEN_W / 2, T.SCREEN_H / 2 + 40);
    ctx.restore();
    ctx.textAlign = "left";
  }
}
T.SceneManager.gotoTitle = function () {
  if (T.Input && T.Input.ignoreOkUntilRelease) T.Input.ignoreOkUntilRelease();
  if (T.Preview) T.Preview.enabled = false;
  const t = new Scene_Title();
  this.stack = [t];
  t.create();
};

/* ---------------- 主循环 ---------------- */
T.GameMain = {
  frameCount: 0,
  started: false,
  async boot(onProgress) {
    const msg = document.getElementById("bootmsg");
    try {
      msg.textContent = "加载字体…";
      await T.loadFonts();
      await T.DataManager.loadAll((i, n, f) => {
        msg.textContent = `加载数据库 ${i}/${n} (${f})…`;
      });
      T.mainCtx = document.getElementById("game").getContext("2d");
      T.Input.init(document.getElementById("game"));
      T.fitScreen();
      msg.textContent = "";
      document.getElementById("boot").style.display = "none";
      T.SceneManager.gotoTitle();
      this.started = true;
      this.loop();
      /* 测试钩子：?autostart 自动开始新游戏；?goto=mapId,x,y 直接跳转。
         ?debug=1 打开章节试玩中心；?preview=node-id 直接恢复指定节点。 */
      const params = new URLSearchParams(location.search);
      if (params.has("debug") || params.has("preview")) {
        T.Preview.enabled = true;
        setTimeout(() => {
          const id = params.get("preview");
          if (id) T.Preview.launchById(id);
          else T.Preview.open();
        }, 600);
      } else if (params.has("autostart") && !params.has("goto")) {
        setTimeout(() => { const t = T.SceneManager.current(); if (t instanceof Scene_Title) t.startNewGame(); }, 600);
      }
      if (params.has("goto")) {
        const [mid, gx, gy] = params.get("goto").split(",").map(Number);
        setTimeout(async () => {
          T.resetGameState(); T.ActorRegistry = {};
          T.$gameVariables.setValue(4, 1); // 跳过登录系统
          $gameParty.addActor(2); $gameParty.addActor(3); $gameParty.addActor(4); $gameParty.addActor(5);
          await T.SceneManager.gotoMap(mid || 19, gx || 8, gy || 8, 2);
        }, 600);
      }
      /* ?autointro=N: 每N帧自动按确认键推进开场剧情 */
      if (params.has("autointro")) {
        T._autoIntroFrames = parseInt(params.get("autointro")) || 120;
        T._autoIntroCounter = 0;
      }
    } catch (e) {
      msg.innerHTML = `启动失败：${e.message}<br>请确认通过本地 HTTP 服务访问本页面。`;
      throw e;
    }
  },
  loop() {
    const step = () => {
      this.frameCount++;
      const sc = T.SceneManager.current();
      if (sc && !T.SceneManager.busy) sc.update();
      this.render();
      /* 输入采样放帧末：场景更新期间 _down=本帧按键、_prev=上帧按键，triggered() 才能检测到边沿 */
      T.Input.update();
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(step);
      else setTimeout(step, 16);
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(step);
    else setTimeout(step, 16);
  },
  render() {
    const ctx = T.mainCtx;
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, T.SCREEN_W, T.SCREEN_H);
    /* 只绘制栈顶场景，避免多层半透明窗口叠加变暗 */
    const sc = T.SceneManager.current();
    if (sc) sc.draw(ctx);
  },
};

/* 全局错误显示 */
window.addEventListener("error", e => {
  const b = document.getElementById("boot");
  if (b.style.display !== "none") {
    b.style.display = "flex";
    document.getElementById("bootmsg").textContent = "发生错误: " + (e.message || "");
  } else if (!window.__errShown) {
    window.__errShown = true;
    console.error(e.error || e.message);
  }
});

T.GameMain.boot();
