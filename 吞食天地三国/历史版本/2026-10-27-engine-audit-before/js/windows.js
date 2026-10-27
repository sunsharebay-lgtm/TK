/* ============================================================
 * TnDT Engine - windows.js
 * 窗口渲染（深色圆角风格）、文字控制符解析、消息窗、选择窗
 * ============================================================ */
"use strict";

/* ---------------- 调色板 ---------------- */
T.TEXT_COLORS = [
  "#ffffff", "#ffd24d", "#ff8080", "#a0ffa0", "#80c0ff",
  "#ffb060", "#ffffff", "#ffffff", "#ffffff", "#ffffff",
];

/* 文字控制符解析：返回 {segments:[{text,color}], pauses:[index]} */
T.parseEscapes = function (raw) {
  const segs = [];
  let cur = "", color = 0;
  const pauses = [];
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch !== "\\") { cur += ch; i++; continue; }
    const nx = raw[i + 1];
    switch (nx) {
      case "C": {
        const m = /^\[(-?\d+)\]/.exec(raw.slice(i + 2));
        if (m) { if (cur) { segs.push({ text: cur, color }); cur = ""; } color = Math.max(0, +m[1] % T.TEXT_COLORS.length); i += 2 + m[0].length; break; }
        cur += ch; i++; break;
      }
      case "N": {
        const m = /^\[(\d+)\]/.exec(raw.slice(i + 2));
        if (m) { const a = T.getActor(+m[1]); cur += a ? a.name : ""; i += 2 + m[0].length; break; }
        cur += ch; i++; break;
      }
      case "V": {
        const m = /^\[(\d+)\]/.exec(raw.slice(i + 2));
        if (m) { cur += T.$gameVariables.value(+m[1]); i += 2 + m[0].length; break; }
        cur += ch; i++; break;
      }
      case "I": {
        const m = /^\[(\d+)\]/.exec(raw.slice(i + 2));
        if (m) { cur += `\u3000`; i += 2 + m[0].length; break; } // 图标简化为空位
        cur += ch; i++; break;
      }
      case "G": cur += T.$dataSystem.currencyUnit || "两"; i += 2; break;
      case ".": cur += ch; pauses.push(cur.length); i += 2; break;
      case "|": cur += ch; pauses.push(cur.length); pauses.push(cur.length); pauses.push(cur.length);
        pauses.push(cur.length); i += 2; break;
      case "!": case "^": i += 2; break;   // 特殊等待由消息层统一处理
      case "\\": cur += "\\"; i += 2; break;
      case "{": case "}": i += 2; break;   // 字号缩放暂不支持
      default: cur += ch; i++; break;
    }
  }
  if (cur) segs.push({ text: cur, color });
  return { segments: segs, pauses };
};

/* ---------------- 窗口基类 ---------------- */
T.drawMenuBackdrop = function (ctx) {
  ctx.save();
  ctx.fillStyle = "rgba(4,8,20,0.82)";
  ctx.fillRect(0, 0, T.SCREEN_W, T.SCREEN_H);
  ctx.restore();
};
class Window_Base {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.openness = 255;
    this.opacityBase = 0.88;
    this.padding = 12;
    this.fontSize = 24;
    this.lineHeight = Math.round(this.fontSize * 1.6);
    this.textColor = "#fff";
  }
  get innerX() { return this.x + this.padding; }
  get innerY() { return this.y + this.padding; }
  get innerW() { return this.w - this.padding * 2; }
  get innerH() { return this.h - this.padding * 2; }
  lineH() { return this.lineHeight; }
  fntSize() { return this.fontSize; }
  isOpen() { return this.openness > 0; }
  update() {
    if (this._opening && this.openness < 255) this.openness = Math.min(255, this.openness + 32);
    if (this._closing && this.openness > 0) this.openness = Math.max(0, this.openness - 32);
    if (this.openness >= 255) this._opening = false;
    if (this.openness <= 0) this._closing = false;
  }
  open() { this._opening = true; this._closing = false; }
  close() { this._closing = true; this._opening = false; }

  draw(ctx) {
    if (!this.isOpen()) return;
    const a = this.openness / 255;
    ctx.save();
    // 背景
    ctx.globalAlpha = a * this.opacityBase;
    ctx.fillStyle = "#101830";
    T.roundRect(ctx, this.x, this.y + (this.h * (1 - a)) / 2, this.w, this.h * a, 10, true);
    // 边框
    ctx.globalAlpha = a * 0.95;
    ctx.strokeStyle = "rgba(220,230,255,0.85)";
    ctx.lineWidth = 3;
    T.roundRect(ctx, this.x, this.y + (this.h * (1 - a)) / 2, this.w, this.h * a, 10, false, true);
    ctx.restore();
  }

  /* ---- 文本绘制 ---- */
  drawText(ctx, text, x, y, maxWidth = 0, align = "left") {
    ctx.save();
    ctx.font = T.fontStr(this.fntSize());
    ctx.textBaseline = "top";
    if (maxWidth > 0) {
      const w = ctx.measureText(text).width;
      if (align === "right") x += maxWidth - w;
      else if (align === "center") x += (maxWidth - w) / 2;
    }
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(text, x + 1.5, y + 1.5);
    ctx.fillStyle = this.textColor;
    ctx.fillText(text, x, y);
    ctx.restore();
    return ctx.measureText(text).width;
  }
  drawRichText(ctx, raw, x, y) {
    const { segments } = T.parseEscapes(raw);
    let cx = x;
    ctx.save();
    ctx.font = T.fontStr(this.fntSize());
    ctx.textBaseline = "top";
    for (const s of segments) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillText(s.text, cx + 1.5, y + 1.5);
      ctx.fillStyle = T.TEXT_COLORS[s.color];
      ctx.fillText(s.text, cx, y);
      cx += ctx.measureText(s.text).width;
    }
    ctx.restore();
    return cx - x;
  }
  textWidth(text) {
    const c = T.mainCtx;
    c.save(); c.font = T.fontStr(this.fntSize());
    const w = c.measureText(text).width; c.restore();
    return w;
  }
  drawGauge(ctx, x, y, w, rate, c1, c2) {
    const h = 8;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, Math.max(0, Math.min(1, rate)) * w, h);
    ctx.restore();
  }
  drawActorFace(ctx, faceName, faceIndex, x, y, size = 72) {
    const p = T.faceCache.get(faceName);
    if (!p || !p.img) return;
    const img = p.img;
    /* 单脸文件（如本作 128×128）直接整图；否则按 MZ 4×2 网格切 */
    let fw, fh, sx, sy;
    if (img.width <= 160) {
      fw = img.width; fh = img.height; sx = 0; sy = 0;
    } else {
      fw = img.width / 4; fh = img.height / 2;
      sx = (faceIndex % 4) * fw; sy = Math.floor(faceIndex / 4) * fh;
    }
    ctx.drawImage(img, sx, sy, fw, fh, x, y, size, size);
  }
}
T.faceCache = new Map();
T.loadFace = async function (name) {
  if (!name || T.faceCache.has(name)) return T.faceCache.get(name);
  const entry = { img: null };
  T.faceCache.set(name, entry);
  const img = await T.ImageManager.face(name);
  entry.img = img;
  return entry;
};
T.roundRect = function (ctx, x, y, w, h, r, fill, stroke) {
  if (h < 1 || w < 1) return;
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
};

/* ---------------- 可选窗口 ---------------- */
class Window_Selectable extends Window_Base {
  constructor(x, y, w, h) {
    super(x, y, w, h);
    this.index = 0;
    this.itemMax = 0;
    this.rowMax = 1;
    this.colMax = 1;
    this.topRow = 0;
    this.spacing = 8;
    this.active = true;
  }
  itemHeight() { return this.lineH(); }
  visibleRows() { return Math.floor(this.innerH / this.itemHeight()); }
  maxRows() { return Math.ceil(this.itemMax / this.colMax); }
  updateInput() {
    if (!this.active || this.itemMax === 0) return false;
    const prev = this.index;
    if (T.Input.repeated("down")) this.cursorDown();
    if (T.Input.repeated("up")) this.cursorUp();
    if (this.colMax > 1) {
      if (T.Input.repeated("right")) this.cursorRight();
      if (T.Input.repeated("left")) this.cursorLeft();
    }
    if (this.index !== prev) T.AudioManager.playSe({ name: "Cursor", volume: 70 });
    return this.index !== prev;
  }
  cursorDown() {
    const cols = this.colMax;
    let i = this.index + cols;
    if (i < this.itemMax) { this.index = i; this.scrollToFit(); }
  }
  cursorUp() {
    const cols = this.colMax;
    let i = this.index - cols;
    if (i >= 0) { this.index = i; this.scrollToFit(); }
    else if (this.wrapAllowed()) { this.index = this.itemMax - 1; this.scrollToFit(); }
  }
  cursorRight() {
    if ((this.index % this.colMax) < this.colMax - 1 && this.index + 1 < this.itemMax)
      { this.index++; this.scrollToFit(); }
  }
  cursorLeft() {
    if (this.index % this.colMax > 0) { this.index--; this.scrollToFit(); }
  }
  wrapAllowed() { return false; }
  scrollToFit() {
    const row = Math.floor(this.index / this.colMax);
    const vis = this.visibleRows();
    if (row < this.topRow) this.topRow = row;
    if (row >= this.topRow + vis) this.topRow = row - vis + 1;
  }
  drawCursorBox(ctx) {
    if (this.index < 0 || this.itemMax === 0) return;
    const row = Math.floor(this.index / this.colMax) - this.topRow;
    const col = this.index % this.colMax;
    const cw = this.innerW / this.colMax;
    const x = this.innerX + col * cw + 2;
    const y = this.innerY + row * this.itemHeight() + 2;
    const w = cw - 4, h = this.itemHeight() - 4;
    ctx.save();
    ctx.fillStyle = "rgba(120,170,255,0.28)";
    T.roundRect(ctx, x, y, w, h, 5, true);
    ctx.strokeStyle = "rgba(190,215,255,0.75)";
    ctx.lineWidth = 2;
    T.roundRect(ctx, x, y, w, h, 5, false, true);
    ctx.restore();
  }
}

/* ---------------- 消息窗 ---------------- */
class Window_Message extends Window_Base {
  constructor() {
    super(T.SCREEN_W / 2 - 380, T.SCREEN_H - 176, 760, 160);
    this.padding = 14; this.fontSize = 24;
    this.openness = 0;       // 消息窗初始隐藏，对话时才打开
    this.charIndex = 0;
    this.pauseSign = false;
    this.choiceWindow = null;
    this.state = "closed";   // closed | typing | waitinput
  }
  openAndStart() {
    this.open(); this.state = "typing";
    this.charIndex = 0;
    this.pauseSign = false;
    if (T.$gameMessage.faceName) T.loadFace(T.$gameMessage.faceName);
  }
  update() {
    super.update();
    const m = T.$gameMessage;
    if (m.texts.length === 0) return;
    if (this.state === "closed") { this.openAndStart(); }
    if (this.state === "typing") {
      const full = m.texts.join("\n");
      const total = full.length;
      if (this.charIndex < total) {
        this.charIndex += 2;
        if (T.rand(4) === 0) T.AudioManager.playSe({ name: "Text", volume: 25 });
      }
      if (this.charIndex >= total) { this.charIndex = total; this.finishTyping(); }
      if (T.Input.triggered("ok")) {
        this.charIndex = total;
        this.finishTyping();
      }
    } else if (this.state === "waitinput") {
      this.pauseSign = true;
      if (T.Input.triggered("ok")) {
        T.AudioManager.playSe({ name: "Ok", volume: 60 });
        this.advance();
      }
    }
  }
  finishTyping() { this.state = "waitinput"; this.pauseSign = false; }
  advance() {
    const m = T.$gameMessage;
    const shown = m.texts.splice(0, 1)[0];
    void shown;
    if (m.texts.length === 0) {
      // 全部显示完：若有选项则进入选择，否则关闭
      if (m.choices.length > 0) this.openChoices();
      else this.closeAll();
    } else {
      this.state = "typing";
      this.charIndex = 0;
    }
  }
  openChoices() {
    const m = T.$gameMessage;
    const w = 200, rows = m.choices.length;
    const h = Math.max(56, rows * 44 + 20);
    const x = this.x + this.w - w - 8;
    const y = Math.max(8, this.y - h + 12);
    this.choiceWindow = new Window_ChoiceList(x, y, w, h, m.choices.slice(), m.choiceCancelType);
    this.state = "choosing";
  }
  updateChoices() {
    const cw = this.choiceWindow;
    if (!cw) return;
    cw.update();
    if (cw.finished) {
      const idx = cw.selectedIndex, cancelled = cw.cancelled;
      this.choiceWindow = null;
      const interp = T.currentInterpreter;
      this.closeAll();
      if (interp && interp.waitMode === "choice") {
        interp.onChoiceResult(idx, cancelled);
      }
    }
  }
  closeAll() {
    T.$gameMessage.clear();
    this.close();
    this.state = "closed";
    this.pauseSign = false;
    /* 对话结束恢复玩家可见（开场剧情 211 透明 + 对话的常见组合） */
    if (T.$gamePlayer && T.$gamePlayer._transparent) T.$gamePlayer._transparent = false;
  }
  draw(ctx) {
    const m = T.$gameMessage;
    if (!this.isOpen() && m.texts.length === 0 && !this.choiceWindow) return;
    super.draw(ctx);
    // 头像
    let tx = this.innerX;
    if (m.faceName) {
      this.drawActorFace(ctx, m.faceName, m.faceIndex, this.x + 14, this.y + 14, 96);
      tx += 104;
    }
    // 正文（打字机）
    if (m.texts.length > 0) {
      const full = m.texts.join("\n");
      const shown = full.slice(0, this.charIndex);
      const lines = shown.split("\n");
      ctx.save();
      ctx.font = T.fontStr(this.fntSize());
      ctx.textBaseline = "top";
      let ly = this.innerY + 2;
      for (const line of lines) {
        let cx = tx;
        const { segments } = T.parseEscapes(line);
        for (const s of segments) {
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillText(s.text, cx + 1.5, ly + 1.5);
          ctx.fillStyle = T.TEXT_COLORS[s.color];
          ctx.fillText(s.text, cx, ly);
          cx += ctx.measureText(s.text).width;
        }
        ly += this.lineH();
      }
      ctx.restore();
    }
    // 停顿指示 ▼
    if (this.pauseSign) {
      ctx.save();
      ctx.fillStyle = "#fff";
      const bx = this.x + this.w - 34, by = this.y + this.h - 26;
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(bx + 18, by); ctx.lineTo(bx + 9, by + 11);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (this.choiceWindow) this.choiceWindow.draw(ctx);
  }
}

class Window_ChoiceList extends Window_Selectable {
  constructor(x, y, w, h, items, cancelType) {
    super(x, y, w, h);
    this.items = items; this.cancelType = cancelType ?? 0;
    this.itemMax = items.length;
    this.fontSize = 22;
    this.index = 0;
    this.finished = false; this.cancelled = false; this.selectedIndex = -1;
    this._inputDelay = 1;
    this.open();
  }
  itemHeight() { return 44; }
  update() {
    super.update();
    /* 创建后的首帧不响应输入：避免与推进文本的同一按键重复触发 */
    if (this._inputDelay > 0) { this._inputDelay--; return; }
    this.updateInput();
    if (T.Input.triggered("ok")) {
      this.selectedIndex = this.index;
      this.finished = true;
      T.AudioManager.playSe({ name: "Ok", volume: 60 });
    } else if (T.Input.triggered("cancel")) {
      if (this.cancelType <= 0) { T.AudioManager.playSe({ name: "Buzzer", volume: 60 }); }
      else if (this.cancelType === 1) { this.cancelled = true; this.selectedIndex = -1; this.finished = true; }
      else { this.selectedIndex = this.cancelType - 2; this.finished = true; }
    }
  }
  draw(ctx) {
    super.draw(ctx);
    this.drawCursorBox(ctx);
    let y = this.innerY + 11;
    for (let i = 0; i < this.items.length; i++) {
      this.drawText(ctx, this.items[i], this.innerX + 14, y, this.innerW - 28, "center");
      y += this.itemHeight();
    }
  }
}

/* ---------------- 金钱窗 ---------------- */
class Window_Gold extends Window_Base {
  constructor(x, y, w) {
    super(x, y, w, 52);
    this.fontSize = 22;
  }
  draw(ctx) {
    super.draw(ctx);
    const unit = T.$dataSystem.currencyUnit || "两";
    this.drawText(ctx, `${T.fmt($gameParty.gold())} ${unit}`, this.innerX, this.innerY + 4,
      this.innerW, "right");
  }
}

/* 类导出 */
Object.assign(T, { Window_Base, Window_Selectable, Window_Message, Window_ChoiceList, Window_Gold });
