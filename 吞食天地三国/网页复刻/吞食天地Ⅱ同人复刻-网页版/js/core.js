/* ============================================================
 * TnDT Engine - core.js
 * 自研运行时核心：工具、输入、音频、图像、字体
 * ============================================================ */
"use strict";
window.T = {};

T.SCREEN_W = 816;
T.SCREEN_H = 624;
T.TILE = 32;

/* ---------------- 工具 ---------------- */
T.rand = n => Math.floor(Math.random() * n);
T.randBetween = (a, b) => a + T.rand(b - a + 1);
T.clamp = (v, min, max) => v < min ? min : v > max ? max : v;
T.fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/* ---------------- 输入 ---------------- */
T.Input = {
  _down: {}, _prev: {}, _repTimer: {}, _repWaited: {},
  KEYMAP: {
    ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
    ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
    Enter: "ok", Space: "ok", KeyZ: "ok", KeyJ: "ok",
    Escape: "cancel", KeyX: "cancel", KeyK: "cancel",
    ShiftLeft: "shift", ShiftRight: "shift",
    PageUp: "pageup", KeyQ: "pageup", PageDown: "pagedown", KeyE: "pagedown",
  },
  init(canvas) {
    window.addEventListener("keydown", e => {
      const k = this.KEYMAP[e.code];
      if (k) { e.preventDefault(); if (!this._down[k]) this._down[k] = true; }
    });
    window.addEventListener("keyup", e => {
      const k = this.KEYMAP[e.code];
      if (k) { e.preventDefault(); this._down[k] = false; }
    });
    // 触屏按钮
    document.querySelectorAll(".pbtn").forEach(el => {
      const k = el.dataset.k;
      const on = ev => { ev.preventDefault(); el.style.background = "rgba(255,255,255,.4)"; this._down[k] = true; };
      const off = ev => { ev.preventDefault(); el.style.background = ""; this._down[k] = false; };
      el.addEventListener("pointerdown", on);
      el.addEventListener("pointerup", off);
      el.addEventListener("pointerleave", off);
      el.addEventListener("pointercancel", off);
    });
    if ("ontouchstart" in window) document.getElementById("pad").style.display = "flex";
  },
  update() {
    this._prev = Object.assign({}, this._down);
    /* autointro: 每N帧触发一次OK（仅在地图场景时生效，避免在标题画面误触） */
    if (T._autoIntroFrames) {
      const _sc = T.SceneManager.current();
      const _isMap = _sc && typeof Scene_Map !== "undefined" && _sc instanceof Scene_Map;
      if (_isMap) {
        T._autoIntroCounter = (T._autoIntroCounter || 0) + 1;
        if (T._autoIntroCounter >= T._autoIntroFrames) {
          T._autoIntroCounter = 0;
          this._down["ok"] = true;
          this._autoOk = true;
          if (_sc.messageWindow && _sc.messageWindow.choiceWindow) {
            _sc.messageWindow.choiceWindow.selectedIndex = 0;
            _sc.messageWindow.choiceWindow.finished = true;
          }
        } else if (this._autoOk) {
          this._down["ok"] = false;
          this._autoOk = false;
        }
      }
    }
  },
  pressed(k) { return !!this._down[k]; },
  triggered(k) { return !!this._down[k] && !this._prev[k]; },
  repeated(k) {
    if (this.triggered(k)) { this._repTimer[k] = 0; this._repWaited[k] = false; return true; }
    if (this.pressed(k)) {
      this._repTimer[k] = (this._repTimer[k] || 0) + 1;
      if (!this._repWaited[k]) { if (this._repTimer[k] >= 24) { this._repWaited[k] = true; this._repTimer[k] = 0; return true; } }
      else if (this._repTimer[k] >= 6) { this._repTimer[k] = 0; return true; }
    }
    return false;
  },
};

/* ---------------- 字体 ---------------- */
T.loadFonts = async function () {
  const defs = [
    ["mplus-1m", "assets/fonts/mplus-1m-regular.woff"],
    ["mplus-num", "assets/fonts/mplus-2p-bold-sub.woff"],
  ];
  await Promise.all(defs.map(async ([fam, url]) => {
    try {
      const face = new FontFace(fam, `url(${url})`);
      await face.load();
      document.fonts.add(face);
    } catch (e) { console.warn("font fail", url, e); }
  }));
};
T.fontStr = (size, bold) => `${bold ? "bold " : ""}${size}px mplus-1m,"PingFang SC","Microsoft Yahei",sans-serif`;
T.numFontStr = size => `bold ${size}px mplus-num,mplus-1m,sans-serif`;

/* ---------------- 图像管理 ---------------- */
T.ImageManager = {
  cache: new Map(),
  load(path) {
    let p = this.cache.get(path);
    if (!p) {
      p = new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => { console.warn("img miss:", path); res(null); };
        img.src = path;
      });
      this.cache.set(path, p);
    }
    return p;
  },
  char(name) { return name ? this.load(`assets/img/characters/${encodeURIComponent(name)}.png`) : Promise.resolve(null); },
  face(n) { return n ? this.load(`assets/img/faces/${encodeURIComponent(n)}.png`) : Promise.resolve(null); },
  enemy(name) { return name ? this.load(`assets/img/enemies/${encodeURIComponent(name)}.png`) : Promise.resolve(null); },
  svEnemy(name) { return name ? this.load(`assets/img/sv_enemies/${encodeURIComponent(name)}.png`) : Promise.resolve(null); },
  tileset(name) { return name ? this.load(`assets/img/tilesets/${encodeURIComponent(name)}.png`) : Promise.resolve(null); },
  picture(name) { return name ? this.load(`assets/img/pictures/${encodeURIComponent(name)}.png`) : Promise.resolve(null); },
  animation(name) { return name ? this.load(`assets/img/animations/${encodeURIComponent(name)}.png`) : Promise.resolve(null); },
  battleback1(n) { return n ? this.load(`assets/img/battlebacks1/${encodeURIComponent(n)}.png`) : Promise.resolve(null); },
  battleback2(n) { return n ? this.load(`assets/img/battlebacks2/${encodeURIComponent(n)}.png`) : Promise.resolve(null); },
  title1(n) { return n ? this.load(`assets/img/titles1/${encodeURIComponent(n)}.png`) : Promise.resolve(null); },
  title2(n) { return n ? this.load(`assets/img/titles2/${encodeURIComponent(n)}.png`) : Promise.resolve(null); },
  system(name) { return name ? this.load(`assets/img/system/${encodeURIComponent(name)}.png`) : Promise.resolve(null); },
  parallax(n) { return n ? this.load(`assets/img/parallaxes/${encodeURIComponent(n)}.png`) : Promise.resolve(null); },
};

/* ---------------- 音频管理（WebAudio）---------------- */
T.AudioManager = {
  ctx: null, buffers: new Map(),
  bgm: null, bgs: null, me: null,
  master: { bgm: 0.8, se: 0.9 },
  _bgmSrc: null, _bgmGain: null, _bgsSrc: null, _bgsGain: null,
  /* 引擎代码用标准 MZ 音效名，实际资源以 Tstd_* 命名，这里做映射 */
  SE_ALIAS: {
    Ok: "Tstd_Decision2",
    Cursor: "Tstd_Cursor_2",
    Buzzer: "Tstd_Buzzer2",
    Cancel: "Tstd_Cancel",
    Save: "Tstd_Save",
    Load1: "Tstd_Save",
    Load2: "Load2",
    Battle1: "Tstd_StartBattle",
    Collapse: "Tstd_Collapse",
    Collapse4: "Tstd_Collapse",
    Damage1: "Damage2",
    Escape1: "Run",
    Shop: "Shop1",
    Recovery: "Recovery",
    Equip1: "Equip1",
    GainItem: "Tstd_GainItem",
    Heal: "Tstd_Heal",
    Text: "Tstd_Move",
  },
  ensureCtx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },
  async buffer(dir, name) {
    if (dir === "se" && this.SE_ALIAS[name]) name = this.SE_ALIAS[name];
    const key = dir + "/" + name;
    let b = this.buffers.get(key);
    if (!b) {
      const exts = [".ogg", ".m4a", ".mp3"];
      for (const ext of exts) {
        try {
          const r = await fetch(`assets/audio/${dir}/${encodeURIComponent(name)}${ext}`);
          if (!r.ok) continue;
          b = await this.ensureCtx().decodeAudioData(await r.arrayBuffer());
          break;
        } catch (e) { /* try next */ }
      }
      this.buffers.set(key, b || null);
    }
    return b;
  },
  _play(buf, { volume = 90, pitch = 100, loop = false }, fadeSec = 0) {
    const ctx = this.ensureCtx();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    src.playbackRate.value = pitch / 100;
    const gain = ctx.createGain();
    gain.gain.value = Math.pow(volume / 100, 2) * 1;
    src.connect(gain).connect(ctx.destination);
    src.start(0);
    return { src, gain };
  },
  _stop(handle, fadeSec = 0.5) {
    if (!handle) return;
    const { src, gain } = handle;
    try {
      const t = this.ensureCtx().currentTime;
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + fadeSec);
      src.stop(t + fadeSec + 0.05);
    } catch (e) { /* already stopped */ }
  },
  async playBgm(obj) {
    if (!obj || !obj.name || this._bgmName === obj.name && this._bgmHandle) return;
    this.stopBgm(0.4);
    const buf = await this.buffer("bgm", obj.name);
    this._bgmName = obj && obj.name;
    if (buf) this._bgmHandle = this._play(buf, { ...obj, loop: true });
  },
  stopBgm(fade = 1) { this._stop(this._bgmHandle, fade); this._bgmHandle = null; this._bgmName = null; },
  saveBgm() { this._savedBgm = this._bgmName; },
  replaySavedBgm() {
    if (this._savedBgm) this.playBgm({ name: this._savedBgm, volume: 90, pitch: 100 });
  },
  async playBgs(obj) {
    this.stopBgs(0.3);
    if (!obj || !obj.name) return;
    const buf = await this.buffer("bgs", obj.name);
    if (buf) this._bgsHandle = this._play(buf, { ...obj, loop: true });
  },
  stopBgs(fade = 1) { this._stop(this._bgsHandle, fade); this._bgsHandle = null; },
  async playMe(obj) {
    this._stop(this._meHandle, 0.2);
    if (!obj || !obj.name) return;
    const buf = await this.buffer("me", obj.name);
    if (buf) this._meHandle = this._play(buf, { ...obj });
  },
  async playSe(obj) {
    if (!obj || !obj.name) return;
    const buf = await this.buffer("se", obj.name);
    if (buf) this._play(buf, { ...obj });
  },
};

/* ---------------- 屏幕适配 ---------------- */
T.fitScreen = function () {
  const cv = document.getElementById("game");
  const scale = Math.min(window.innerWidth / T.SCREEN_W, window.innerHeight / T.SCREEN_H);
  cv.style.width = Math.floor(T.SCREEN_W * scale) + "px";
  cv.style.height = Math.floor(T.SCREEN_H * scale) + "px";
};
window.addEventListener("resize", () => T.fitScreen());
