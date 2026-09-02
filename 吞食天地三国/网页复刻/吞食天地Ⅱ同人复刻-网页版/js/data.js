/* ============================================================
 * TnDT Engine - data.js
 * 数据加载 + 游戏状态（开关/变量/屏幕/消息/角色/敌人/队伍/存档）
 * 数据为 MZ 系 JSON 结构；本运行时为独立实现。
 * ============================================================ */
"use strict";

T.$dataActors = null; T.$dataClasses = null; T.$dataSkills = null;
T.$dataItems = null; T.$dataWeapons = null; T.$dataArmors = null;
T.$dataEnemies = null; T.$dataTroops = null; T.$dataStates = null;
T.$dataAnimations = null; T.$dataTilesets = null; T.$dataCommonEvents = null;
T.$dataSystem = null; T.$dataMapInfos = null; T.$dataMap = null;
T.BATTLE_EXP_RATE = 1.25;
T.SKILL_COST_RATE = 2 / 3;
T.ENEMY_TACTIC_RATE_MIN = 0.10;
/* 轻度下调敌方策略频率，保留智力差异，避免前期被连续计策压垮。 */
T.ENEMY_TACTIC_RATE_MAX = 0.36;

/* 可见武将的历史武力基准。原始职业表把所有武将攻击力压成 5，
   这里只替换武将基准，不改动原始职业的兵力、智力和策略成长。 */
T.ACTOR_MARTIAL_FORCE = Object.freeze({
  2: 25, 3: 98, 4: 99, 5: 75, 6: 65, 7: 52, 8: 92, 9: 95, 10: 30,
  11: 85, 12: 96, 13: 85, 14: 55, 15: 45, 16: 35, 17: 93, 18: 92,
  19: 42, 20: 45, 21: 78, 22: 70, 23: 40, 24: 38, 25: 97, 26: 86,
  27: 88, 28: 75, 29: 85, 30: 82, 31: 38, 32: 76, 33: 86, 34: 90,
  35: 90, 36: 88, 37: 78, 38: 100, 41: 35, 42: 60, 43: 80, 44: 70,
  45: 32, 46: 30, 49: 88, 50: 36, 51: 60, 52: 87, 53: 65, 54: 100,
  55: 55, 56: 45, 57: 95,
});

T.skillCost = function (skill) {
  const raw = Math.max(0, Number(skill && skill.mpCost) || 0);
  return raw > 0 ? Math.max(1, Math.round(raw * T.SKILL_COST_RATE)) : 0;
};

async function jget(p) {
  const r = await fetch("assets/data/" + p);
  if (!r.ok) throw new Error("数据缺失: " + p);
  return r.json();
}

T.DataManager = {
  FILES: ["actors", "classes", "skills", "items", "weapons", "armors",
          "enemies", "troops", "states", "animations", "tilesets",
          "commonevents", "system", "mapinfos"],
  KEYS: {
    actors: "$dataActors", classes: "$dataClasses", skills: "$dataSkills",
    items: "$dataItems", weapons: "$dataWeapons", armors: "$dataArmors",
    enemies: "$dataEnemies", troops: "$dataTroops", states: "$dataStates",
    animations: "$dataAnimations", tilesets: "$dataTilesets",
    commonevents: "$dataCommonEvents", system: "$dataSystem",
    mapinfos: "$dataMapInfos",
  },
  /* G2b: MZ 标准 note 元数据提取（<Tag> / <Tag:value> → meta），缩地计等脚本依赖 $dataMap.meta */
  extractMetadata(data) {
    if (!data || !data.note) return data && (data.meta || (data.meta = {}));
    const meta = data.meta || (data.meta = {});
    const re = /<([^>]+)>/g;
    let m;
    while ((m = re.exec(data.note))) {
      const text = m[1].trim();
      const colon = text.indexOf(":");
      const key = colon >= 0 ? text.slice(0, colon).trim() : text;
      let val = colon >= 0 ? text.slice(colon + 1).trim() : true;
      if (key) {
        if (val === true || val === "true") meta[key] = true;
        else if (val === "false") meta[key] = false;
        else { const n = Number(val); meta[key] = Number.isNaN(n) ? val : n; }
      }
    }
    return meta;
  },
  extractMetadataAll(list) {
    if (!Array.isArray(list)) return;
    for (const it of list) if (it) this.extractMetadata(it);
  },
  async loadAll(onStep) {
    for (let i = 0; i < this.FILES.length; i++) {
      const f = this.FILES[i];
      T[this.KEYS[f]] = await jget(f + ".json");
      this.extractMetadataAll(T[this.KEYS[f]]);
      if (onStep) onStep(i + 1, this.FILES.length, f);
    }
    T.MAX_BATTLE_MEMBERS = 5;   // 敌群最多5人，我方同5人
  },
  async loadMapData(mapId) {
    T.$dataMap = await jget("map" + String(mapId).padStart(3, "0") + ".json");
    this.extractMetadata(T.$dataMap);
  },
};

/* ---------------- 状态容器 ---------------- */
class Game_Switches {
  constructor() { this._data = []; }
  value(id) { return !!this._data[id]; }
  setValue(id, v) {
    this._data[id] = !!v;
    if (T.$gameMap) T.$gameMap.refreshEvents();   // 开关变化后刷新事件页面
  }
}
class Game_Variables {
  constructor() { this._data = []; }
  value(id) { return this._data[id] || 0; }
  setValue(id, v) {
    this._data[id] = v;
    if (id === 1 && T.updateChapterState) T.updateChapterState(v);
    if (T.$gameMap) T.$gameMap.refreshEvents();   // 变量变化后刷新事件页面
  }
}
class Game_SelfSwitches {
  constructor() { this._data = {}; }
  value(key) { return !!this._data[key]; }
  setValue(key, v) { this._data[key] = v; }
}
class Game_Screen {
  constructor() { this.clear(); }
  clear() {
    this._tone = [0, 0, 0, 0]; this._toneTarget = [0, 0, 0, 0]; this._toneDuration = 0;
    this._flashColor = [255, 255, 255, 1]; this._flashDur = 0;
    this._shakePower = 0; this._shakeSpeed = 1; this._shakeDur = 0;
    this.pictures = {};
    this.fadeType = 0; this.fadeDuration = 0; this.fadeCount = 0;
  }
  startTone(tone, dur) { this._toneTarget = tone.slice(); this._toneDuration = Math.max(1, Math.round(dur)); }
  startFlash(color, dur) { this._flashColor = color.slice(); this._flashDur = Math.round(dur); }
  shake(power, speed, dur) { this._shakePower = power; this._shakeSpeed = Math.max(1, speed); this._shakeDur = dur * 2; }
  shakeOffsetX() {
    if (this._shakeDur > 0 && this._shakePower > 0) {
      const decay = Math.floor(this._shakePower * (this._shakeDur - this._shakeDur % this._shakeSpeed) / this._shakeSpeed);
      return T.randBetween(-decay, decay);
    }
    return 0;
  }
  showPicture(id, name, x, y, opacity = 255, scale = 100) {
    const entry = { name, x, y, opacity, scale, img: null };
    this.pictures[id] = entry;
    T.ImageManager.picture(name).then(img => { if (this.pictures[id] === entry) entry.img = img; });
    return null;
  }
  erasePicture(id) { delete this.pictures[id]; }
  update() {
    if (this._toneDuration > 0) {
      const d = this._toneDuration;
      for (let i = 0; i < 4; i++) this._tone[i] += (this._toneTarget[i] - this._tone[i]) / d;
      this._toneDuration--;
    }
    if (this._flashDur > 0) this._flashDur--;
    if (this._shakeDur > 0) this._shakeDur--;
    if (this.fadeCount > 0) this.fadeCount--;
  }
}
class Game_Timer {
  constructor() { this._frames = 0; this._working = false; }
  start(sec) { this._frames = Math.round(sec * 60); this._working = true; }
  stop() { this._working = false; }
  seconds() { return Math.ceil(this._frames / 60); }
  update() { if (this._working && this._frames > 0) this._frames--; }
}

/* ---------------- 消息 ---------------- */
class Game_Message {
  constructor() { this.clear(); }
  clear() {
    this.texts = []; this.faceName = ""; this.faceIndex = 0;
    this.background = 0; this.position = 2;
    this.choices = []; this.choiceCancelType = 0; this.choiceDefaultType = 0;
    this.choiceProc = null; this.scrollMode = false;
    this.numInputVariableId = 0; this.numInputMaxDigits = 0;
    this.itemChoiceVariableId = 0;
  }
  add(text) { this.texts.push(text); }

}

/* ---------------- 公式沙箱 ---------------- */
T.getAttackPower = (a, b) => {
  const isActor = !!(a && typeof a.isActor === "function" && a.isActor());
  const troop = Math.max(1, Number(a && a.hp) || Number(a && a.mhp) || 1);
  /* 武将兵力越多，实际能投入攻击的部队越多；对数缩放避免高等级伤害失控。 */
  const troopRate = isActor ? T.clamp(1 + Math.log10(troop / 200), 0.6, 3) : 1;
  return Math.max(1, Math.round((Number(a && a.atk) || 0) * troopRate * 4 - (Number(b && b.def) || 0) * 2));
};
T.evalFormula = function (formula, a, b) {
  try {
    /* 数据中的公式常以分号结尾，去掉以免 return(...;) 语法错误 */
    const f = String(formula || "").replace(/;\s*$/, "");
    const fn = new Function("a", "b", "v",
      `with(Math){return (${f});}`);
    return fn.call({ getAttackPower: T.getAttackPower }, a, b, 0);
  } catch (e) { console.warn("公式错误:", formula, e); return 0; }
};

/* ---------------- 特性代码（MZ 公开语义）---------------- */
const TRAIT = {
  ELEMENT_RATE: 11, DEBUFF_RATE: 12, STATE_RATE: 13, STATE_RESIST: 14,
  PARAM_RATE: 21, PARAM: 22, XPARAM: 23, SPARAM: 24,
  ATTACK_ELEMENT: 31, ATTACK_STATE: 32, ATTACK_SPEED: 33, ATTACK_TIMES: 34,
  STYPE_ADD: 41, STYPE_SEAL: 42, SKILL_ADD: 43, SKILL_SEAL: 44,
  EQUIP_WTYPE: 51, EQUIP_ATYPE: 52, ACTION_PLUS: 61,
  SPECIAL_FLAG: 62, PARTY_ABILITY: 64,
};

/* ---------------- 行动结果 ---------------- */
class Game_ActionResult {
  constructor() { this.clear(); }
  clear() {
    this.usedItem = null; this.missed = false; this.evaded = false;
    this.hpAffected = false; this.hpDamage = 0; this.mpDamage = 0;
    this.critical = false; this.addedStates = []; this.removedStates = [];
    this.effectNum = 0;
  }
  get hit() { return !this.missed && !this.evaded; }
}

/* ---------------- 战斗者基类 ---------------- */
class Game_BattlerBase {
  constructor() { this.initMembers(); }
  initMembers() {
    this._hp = 0; this._mp = 0; this._tp = 0;
    this._states = []; this._buffs = {};
    this._stateSteps = {};   // G3-R9: 地图步数解除状态计数（stepsToRemove>0）
    this.result = new Game_ActionResult();
    this.hidden = false;
    this.turnAddSpeed = 0;
  }
  /* G3-R9: 地图步数解除状态——玩家每走一步推进计数，归零移除（数据实证：烟遁256/杀毒128/灼伤中毒等100步） */
  onMapStep() {
    for (const id of this._states.slice()) {
      const st = T.$dataStates[id];
      if (!st || !(st.stepsToRemove > 0)) continue;
      const key = "s" + id;
      if (this._stateSteps[key] == null) this._stateSteps[key] = st.stepsToRemove;
      if (--this._stateSteps[key] <= 0) {
        delete this._stateSteps[key];
        this.removeStateRaw(id);
        this.result.removedStates.push(id);
      }
    }
  }
  /* 添加状态后登记步数计数（若该状态按步数解除） */
  registerStepState(id) {
    const st = T.$dataStates[id];
    if (st && st.stepsToRemove > 0) this._stateSteps["s" + id] = st.stepsToRemove;
  }
  allTraits() { return []; }
  traits(code) { return this.allTraits().filter(t => t.code === code); }
  traitsPi(code, id) {
    let r = 1;
    for (const t of this.traits(code)) if (t.dataId === id) r *= t.value;
    return r;
  }
  traitsSum(code, id) {
    let s = 0;
    for (const t of this.traits(code)) if (t.dataId === id) s += t.value;
    return s;
  }
  traitsSet(code) {
    const set = [];
    for (const t of this.traits(code)) if (!set.includes(t.dataId)) set.push(t.dataId);
    return set;
  }
  paramBase(i) { return 0; }
  paramMax(i) { return i === 0 ? 999999 : 9999; }
  buffLevel(pid) { const b = this._buffs[pid]; return b ? b.level : 0; }
  paramBuffRate(pid) {
    const lv = this.buffLevel(pid);
    return lv > 0 ? Math.pow(1.25, lv) : lv < 0 ? Math.pow(0.8, -lv) : 1;
  }
  addBuff(pid, turns, debuff = false) {
    let lv = this.buffLevel(pid) + (debuff ? -1 : 1);
    lv = T.clamp(lv, -2, 2);
    this._buffs[pid] = { level: lv, turns };
  }
  removeBuff(pid) { delete this._buffs[pid]; }
  /* G3-R3: 永久成长（道具效果码 42：蛇胆/武力石/智力石/速度石/统率石）
     累加到 _paramBonus（param() 已并入结算），随存档持久化 */
  growParam(pid, n) {
    this._paramBonus = this._paramBonus || {};
    this._paramBonus[pid] = (this._paramBonus[pid] || 0) + (n || 0);
    return this._paramBonus[pid];
  }
  isBuffAffected(pid) { return this.buffLevel(pid) !== 0; }
  updateBuffsTurns() {
    for (const pid in this._buffs) {
      const b = this._buffs[pid];
      if (--b.turns <= 0) this.removeBuff(+pid);
    }
  }
  param(i) {
    const base = this.paramBase(i);
    const rate = this.traitsPi(TRAIT.PARAM_RATE, i) * this.paramBuffRate(i);
    const plus = this.traitsSum(TRAIT.PARAM, i);
    const bonus = (this._paramBonus && this._paramBonus[i]) || 0;
    const equip = this.equipParam(i);
    /* G2-R3: 阵型按 FC 语义为【乘算倍率】——对最终属性（基础×成长×buff + 特性 + 装备）整体乘算
       （此前为 flat 加法，无法表达"背水阵攻2倍/防减半"这类随属性缩放的效果） */
    const v = Math.round((Math.round(base * rate) + plus + bonus + equip) * this.formationRate(i));
    /* 特性增量（如 0.95/0.05）可能带小数，最终属性一律取整 */
    return T.clamp(v, i === 0 ? 1 : 0, this.paramMax(i));
  }
  equipParam(i) { return 0; }
  /* G2-R3: 阵型倍率按阵营隔离——基类恒 1.0（不变），我方在 Game_Actor、敌方在 Game_Enemy 分别读取各自的阵型。
     （此前基类直接读 $gameParty，导致我方摆阵时敌方同受加成，两侧共用一套数值）
     i=2攻击 3防御 4智力 5抗智 6速度，数值来自 T.FORMATIONS（倍率，1.0=不变） */
  formationRate(i) { return 1.0; }
  get mhp() { return this.param(0); } get mmp() { return this.param(1); }
  get atk() { return this.param(2); } get def() { return this.param(3); }
  get mat() { return this.param(4); } get mdf() { return this.param(5); }
  get agi() { return this.param(6); } get luk() { return this.param(7); }
  xparam(id) {
    /* 命中(0)/目标率(9) 默认为 1，其余 X 参数默认 0，避免无再生特性的单位每回合回满血 */
    const def = id === 0 || id === 9 ? 1 : 0;
    for (const t of this.traits(TRAIT.XPARAM)) {
      if (t.dataId === id) return t.value;
    }
    return def;
  }
  sparam(id) { return this.traitsPi(TRAIT.SPARAM, id); }
  elementRate(el) { return el <= 0 ? 1 : this.traitsPi(TRAIT.ELEMENT_RATE, el); }
  debuffRate(el) { return this.traitsPi(TRAIT.DEBUFF_RATE, el); }
  isStateResist(id) { return this.traits(TRAIT.STATE_RESIST).some(t => t.dataId === id); }
  stateRate(id) { return this.traitsPi(TRAIT.STATE_RATE, id); }
  attackElements() { const s = this.traitsSet(TRAIT.ATTACK_ELEMENT); return s.length ? s : [1]; }
  attackStates() { return this.traitsSet(TRAIT.ATTACK_STATE); }
  attackSpeedAdd() { return this.traitsSum(TRAIT.ATTACK_SPEED, 0); }
  attackTimesAdd() {
    let n = 0;
    for (const t of this.traits(TRAIT.ATTACK_TIMES)) n += Math.max(0, t.value - 1);
    return n;
  }
  actionPlusSet() { return this.traits(TRAIT.ACTION_PLUS).map(t => t.value); }
  specialFlag(id) { return this.traits(TRAIT.SPECIAL_FLAG).some(t => t.dataId === id); }
  partyAbility(id) { return this.traits(TRAIT.PARTY_ABILITY).some(t => t.dataId === id); }
  /* ---- HP / MP / TP ---- */
  get hp() { return this._hp; }
  set hp(v) { this._hp = T.clamp(Math.round(v), 0, this.mhp); }
  get mp() { return this._mp; }
  set mp(v) { this._mp = T.clamp(Math.round(v), 0, this.mmp); }
  get tp() { return this._tp; }
  set tp(v) { this._tp = T.clamp(Math.round(v), 0, 100); }
  refresh() {
    if (this._hp <= 0) this.addStateRaw(1);
    else this.removeStateRaw(1);
  }
  recoverAll() {
    this.hp = this.mhp; this.mp = this.mmp; this._states = []; this._tp = 0;
  }
  /* ---- 状态 ---- */
  clearStates() { this._states = []; }
  states() { return this._states.map(id => T.$dataStates[id]).filter(Boolean); }
  isStateAffected(id) { return this._states.includes(id); }
  isDead() { return !this.hidden && this.isStateAffected(1); }
  addStateRaw(id) {
    if (!this._states.includes(id)) {
      this._states.push(id);
      this._states.sort((a, b) => ((T.$dataStates[a] || {}).priority || 0) - ((T.$dataStates[b] || {}).priority || 0));
      this.registerStepState(id);
    }
  }
  removeStateRaw(id) {
    const i = this._states.indexOf(id); if (i >= 0) this._states.splice(i, 1);
    delete this._stateSteps["s" + id];
  }
  die() { this._hp = 0; this.addStateRaw(1); }
  revive() { this.removeStateRaw(1); if (this._hp <= 0) this._hp = 1; }
  appear() { this.hidden = false; }
  hide() { this.hidden = true; }
  /* ---- 技能 ---- */
  addedSkillTypes() { return this.traitsSet(TRAIT.STYPE_ADD); }
  sealedSkillTypes() { return this.traitsSet(TRAIT.STYPE_SEAL); }
  addedSkills() { return this.traitsSet(TRAIT.SKILL_ADD); }
  sealedSkills() { return this.traitsSet(TRAIT.SKILL_SEAL); }
  canUse(item) {
    if (!item) return false;
    if (T.$dataSkills.includes(item)) {
      if (T.skillCost(item) > this.mp) return false;
      if (this.sealedSkillTypes().includes(item.stypeId)) return false;
      if (this.sealedSkills().includes(item.id)) return false;
      if (!this.addedSkillTypes().includes(item.stypeId) && !this.knowsSkill(item.id)) return false;
      return true;
    }
    if (T.$dataItems.includes(item)) return $gameParty.itemCount(item) > 0;
    return false;
  }
  paySkillCost(skill) { this.mp -= T.skillCost(skill); }
}

/* ---------------- 中间层：战斗内行为 ---------------- */
class Game_Battler extends Game_BattlerBase {
  constructor() { super(); }
  appearOk() { return true; }
  clearActions() { this._actions = []; this._actionInputIndex = 0; }
  numActions() { return 1 + this.attackTimesAdd(); }
  action(n) {
    while (this._actions.length <= n) this._actions.push({ item: null, targetIndex: -1 });
    return this._actions[n];
  }
  setAction(n, item, targetIndex) { this.action(n).item = item; this.action(n).targetIndex = targetIndex; }
  makeSpeed() {
    /* G3-R9: specialFlag(2)=必定先攻（MZ 语义）。数据：典韦×4/周泰。加成 10000 保证
       回合行动顺序吊顶优先（FC 原版猛将先手特性）。 */
    let sp = this.agi + T.rand(Math.floor(Math.abs(this.agi) / 4) + 1) + this.attackSpeedAdd();
    if (this.specialFlag(2)) sp += 10000;
    this.turnAddSpeed = sp; return sp;
  }
  onBattleStart() { this._tp = T.rand(25); this.clearActions(); }
  initMembers() {
    super.initMembers();
    this._actions = []; this._actionInputIndex = 0;
    this._stateTurns = {};
  }
  onTurnEnd() {
    const hr = Math.max(1, Math.round(this.mhp * this.xparam(7)));
    const mr = Math.round(this.mmp * this.xparam(8));
    if (this.xparam(7) > 0 && !this.isDead()) this.hp += hr;
    if (this.xparam(8) > 0 && !this.isDead()) this.mp += mr;
    this.updateBuffsTurns();
    for (const st of this.states()) {
      /* G3-R9: autoRemovalTiming 2(行动结束)也按回合推进解除——数据 20 个状态(灼伤/中毒/晕眩/
         嘲骂/击返/免费等)此前永不自动解除,只能战末 removeAtBattleEnd 清理;与 timing 1 同样
         以 min/max 回合计数,行动结束视为回合粒度近似。 */
      if (st.autoRemovalTiming !== 1 && st.autoRemovalTiming !== 2) continue;
      const key = "st" + st.id;
      if (this._stateTurns[key] == null)
        this._stateTurns[key] = T.randBetween(st.minTurns || 1, st.maxTurns || 1);
      if (--this._stateTurns[key] <= 0) {
        delete this._stateTurns[key];
        this.removeStateRaw(st.id);
        this.result.removedStates.push(st.id);
      }
    }
  }
  removeStateRaw(id) {
    super.removeStateRaw(id);
    delete this._stateTurns["st" + id];
  }
  addState(stateId) {
    const st = T.$dataStates[stateId];
    if (!st || this.isStateResist(stateId)) return false;
    if (this.isStateAffected(stateId)) return false;
    const chance = (st.rate || 100) / 100 * this.stateRate(stateId);
    if (Math.random() < chance) {
      this.addStateRaw(stateId);
      delete this._stateTurns["st" + stateId];
      this.result.addedStates.push(stateId);
      return true;
    }
    return false;
  }
  removeState(stateId) {
    if (this.isStateAffected(stateId)) {
      this.removeStateRaw(stateId);
      this.result.removedStates.push(stateId);
    }
  }
}

/* ---------------- 角色 ---------------- */
T.ActorRegistry = {};
T.getActor = function (id) {
  if (!T.ActorRegistry[id]) T.ActorRegistry[id] = new Game_Actor(id);
  return T.ActorRegistry[id];
};

class Game_Actor extends Game_Battler {
  constructor(actorId) {
    super();
    this.actorId = actorId;
    this.setup(T.$dataActors[actorId]);
  }
  setup(a) {
    this.initMembers();
    this.name = a.name; this.nickname = a.nickname || ""; this.profile = a.profile || "";
    this.classId = a.classId;
    this.level = a.initialLevel || 1;
    this.maxLevel = a.maxLevel || 99;
    this.faceName = a.faceName || ""; this.faceIndex = a.faceIndex || 0;
    this.characterName = a.characterName || ""; this.characterIndex = a.characterIndex || 0;
    this.exp = 0;
    this._equips = {};                       // slot -> itemId
    (a.equips || []).forEach((id, i) => { if (id) this._equips[i + 1] = id; });
    this.changeExp(this.expForLevel(this.level), false);
    this.recoverAll();
    this.noteTags = {};
    const m = /<SvBattler:\s*([^>]+)>/.exec(a.note || "");
    if (m) this.noteTags.svBattler = m[1].trim();
  }
  isActor() { return true; }
  get data() { return T.$dataActors[this.actorId]; }
  cls() { return T.$dataClasses[this.classId]; }
  faceImg() { return { name: this.faceName, index: this.faceIndex }; }
  charImg() { return { name: "$" + this.svBattlerName(), index: 0 }; }
  svBattlerName() { return this.noteTags.svBattler || this.characterName.replace(/^\$/, ""); }
  expForLevel(lv) {
    if (lv < 2) return 0;
    const ep = this.cls().expParams || [100, 0, 50, 50];
    const c = ep[0], e = ep[1], A = (ep[2] || 0) / 100, B = (ep[3] || 0) / 100;
    const v = c * Math.pow(lv - 1 + e, B) * Math.pow(lv - 1, A);
    return isFinite(v) ? Math.round(v) : (c * (lv - 1));
  }
  changeExp(exp, show) {
    const oldLevel = this.level;
    const oldMmp = this.mmp;
    const oldMp = this.mp;
    this.exp = exp;
    while (this.level < this.maxLevel && this.exp >= this.expForLevel(this.level + 1)) {
      this.level++;
      this.refresh();
      this._lastLevelUps = this._lastLevelUps || [];
      this._lastLevelUps.push({ level: this.level, learned: this.newSkillsAt(this.level) });
    }
    while (this.level > 1 && this.exp < this.expForLevel(this.level)) this.level--;
    this.refresh();
    if (this.level > oldLevel && oldMp >= oldMmp) this.mp = this.mmp;
  }
  newSkillsAt(level) {
    return (this.cls().learnings || []).filter(l => l.level === level).map(l => l.skillId);
  }
  takeLevelUpReport() { const r = this._lastLevelUps || []; this._lastLevelUps = []; return r; }
  /* G3-R1: 直接设定绝对等级（数据脚本 actor.changeLevel(level, show)：剧情升/降级、二周目重置）。
     与 changeExp 不同——不依赖经验值，直接把 level 设为目标；show=false 时不产出升级播报 */
  changeLevel(level, show) {
    const target = T.clamp(Math.round(level) || 1, 1, this.maxLevel);
    const delta = target - this.level;
    const oldMmp = this.mmp;
    const oldMp = this.mp;
    this.level = target;
    this.refresh();
    if (delta > 0 && oldMp >= oldMmp) this.mp = this.mmp;
    if (show !== false && delta > 0) {
      this._lastLevelUps = this._lastLevelUps || [];
      this._lastLevelUps.push({ level: this.level, learned: this.newSkillsAt(this.level) });
    }
    return this.level;
  }
  /* G3-R1: 武将天赋持有（数据脚本 actor.addOwnTalent(id)；天赋系统主体留待后续，先落存储避免脚本失效） */
  addOwnTalent(id) {
    this._ownTalents = this._ownTalents || [];
    if (id != null && !this._ownTalents.includes(id)) this._ownTalents.push(id);
    return this._ownTalents;
  }
  skills() {
    const ids = (this.cls().learnings || []).filter(l => l.level <= this.level)
      .sort((x, y) => x.level - y.level).map(l => l.skillId);
    for (const id of this.addedSkills()) if (!ids.includes(id)) ids.push(id);
    return [...new Set(ids)].filter(id => T.$dataSkills[id]).map(id => T.$dataSkills[id]);
  }
  usableSkills(stypeId) {
    return this.skills().filter(s =>
      (stypeId == null || s.stypeId === stypeId) &&
      this.addedSkillTypes().includes(s.stypeId) &&
      !this.sealedSkillTypes().includes(s.stypeId) &&
      !this.sealedSkills().includes(s.id));
  }
  paramBase(i) {
    const p = this.cls().params;
    const row = p[i];
    if (!row) return 0;
    const idx = T.clamp(this.level, 1, row.length - 1);
    if (i === 2 && T.ACTOR_MARTIAL_FORCE[this.actorId] != null) return T.ACTOR_MARTIAL_FORCE[this.actorId];
    const value = row[idx];
    /* 原表谋点成长偏慢，补充随等级增长的容量；实际消耗另按 skillCost 折算。 */
    return i === 1 ? value + Math.round(Math.max(0, this.level - 1) * 1.5) : value;
  }
  /* 装备加成：累加所有已装备物品的 params（MZ 中装备 params 直接加到属性） */
  equipParam(i) {
    let sum = 0;
    for (const it of this.equippedItems()) {
      if (it && it.params) sum += (it.params[i] || 0);
    }
    return sum;
  }
  /* G2-R3: 我方阵型倍率（读队伍阵型 $gameParty.setFormation 设置的 T.FORMATIONS 项，1.0=不变） */
  formationRate(i) {
    const f = T.$gameParty.formation();
    if (!f) return 1.0;
    return i === 2 ? f.atk : i === 3 ? f.def : i === 4 ? f.mat : i === 5 ? f.mdf : i === 6 ? f.agi : 1.0;
  }
  allTraits() {
    let ts = [];
    ts = ts.concat(this.data.traits || []);
    ts = ts.concat(this.cls().traits || []);
    for (const item of this.equippedItems()) ts = ts.concat((item && item.traits) || []);
    for (const st of this.states()) ts = ts.concat(st.traits || []);
    return ts;
  }
  equippedItems() {
    const list = [];
    for (const slot in this._equips) {
      const id = this._equips[slot];
      if (!id) continue;
      const s = +slot;
      /* 槽位1为武器，其余为防具（武器/防具 id 空间独立，必须按槽位区分） */
      list.push(s === 1 ? T.$dataWeapons[id] : T.$dataArmors[id] || null);
    }
    return list;
  }
  equipAt(slot) {
    const id = this._equips[slot];
    if (!id) return null;
    if (slot === 1) return T.$dataWeapons[id] || null;
    return T.$dataArmors[id] || null;
  }
  changeEquip(slot, itemId) {
    if (itemId === 0) { delete this._equips[slot]; return; }
    this._equips[slot] = itemId;
  }
  attackAnimationId() {
    const w = this.equipAt(1);
    const m = /<AttackAnimationId:\s*(\d+)>/.exec(this.data.note || "");
    if (m) return +m[1];
    return (w && w.animationId) || 1;
  }
}

/* ---------------- 敌人 ---------------- */
class Game_Enemy extends Game_Battler {
  constructor(enemyId, x, y) {
    super();
    this.enemyId = enemyId;
    this.screenX = x; this.screenY = y;
    this.setup(T.$dataEnemies[enemyId]);
  }
  setup(e) {
    this.initMembers();
    this.name = e.name;
    this.gold = e.gold || 0; this.expValue = e.exp || 0;
    this.dropItems = e.dropItems || [];
    this.actions = e.actions || [];
    this.itemStock = Object.assign({}, e.items || e.itemStock || {});
    this.hp = this.mhp; this.mp = this.mmp;
    this.noteTags = {};
    const m = /<SvBattler:\s*([^>]+)>/.exec(e.note || "");
    if (m) this.noteTags.svBattler = m[1].trim();
  }
  isActor() { return false; }
  get data() { return T.$dataEnemies[this.enemyId]; }
  paramBase(i) { return (this.data.params || [])[i] || 0; }
  allTraits() {
    let ts = (this.data.traits || []).slice();
    for (const st of this.states()) ts = ts.concat(st.traits || []);
    return ts;
  }
  xparam(id) {
    const value = super.xparam(id);
    return id === 7 || id === 8 ? 0 : value;
  }
  itemCount(item) { return item ? (this.itemStock[item.id] || 0) : 0; }
  consumeItem(item) {
    if (!item || this.itemCount(item) <= 0) return false;
    this.itemStock[item.id]--;
    return true;
  }
  /* G2-R3: 敌方阵型倍率（读敌群阵型 $gameTroop.setFormation 设置的 T.FORMATIONS 项，1.0=不变；
     战斗期 $gameTroop 由 Scene_Battle 绑定，战场外为 null → 1.0） */
  formationRate(i) {
    const f = T.$gameTroop ? T.$gameTroop.formation() : null;
    if (!f) return 1.0;
    return i === 2 ? f.atk : i === 3 ? f.def : i === 4 ? f.mat : i === 5 ? f.mdf : i === 6 ? f.agi : 1.0;
  }
  battlerImage() {
    if (this.noteTags.svBattler) return { type: "char", name: this.noteTags.svBattler };
    return { type: "front", name: this.data.battlerName };
  }
  makeDropItems() {
    const drops = [];
    for (const d of this.dropItems) {
      /* G3-R9: 掉落概率修正——MZ 语义 denominator = 1/N 概率（denominator=1 必掉）。
         此前误用 rand(100)<denominator，数据 768 条 denominator=1 的必掉物品只按 1% 掉落，
         玩家几乎打不出任何稀有掉落；现改为 rand(N)===0 判定。 */
      const n = Math.max(1, d.denominator || 1);
      const kind = d.kind, dataId = d.dataId;
      if (kind === 1 && T.rand(n) === 0) drops.push(T.$dataItems[dataId]);
      else if (kind === 2 && T.rand(n) === 0) drops.push(T.$dataWeapons[dataId]);
      else if (kind === 3 && T.rand(n) === 0) drops.push(T.$dataArmors[dataId]);
    }
    return drops.filter(Boolean);
  }
}

/* ---------------- 队伍 ---------------- */
class Game_Party {
  constructor() { this.initAllItems(); this._formation = -1; }
  /* G2: 阵型 */
  setFormation(n) { this._formation = T.clamp(n, 0, T.FORMATIONS.length - 1); return this._formation; }
  formation() { return this._formation < 0 ? null : T.FORMATIONS[this._formation]; }
  formationName() { const f = this.formation(); return f ? f.name : ""; }
  initAllItems() {
    this._gold = 0;
    this._items = {}; this._weapons = {}; this._armors = {};
    this._actors = []; this._lastItem = null;
    this._storage = {};   // G3-R7: 仓库
  }
  /* 数据脚本以方法调用形式使用 $gameParty.gold()（else 属 getter 兼容失败），故定义为方法 */
  gold() { return this._gold; }
  gainGold(n) { this._gold = T.clamp(this._gold + n, 0, 99999999); }
  loseGold(n) { this.gainGold(-n); }
  maxGold() { return 99999999; }
  /* G3-R1: 客栈价格（数据脚本 $gameParty.innPrice(rate)，rate=城镇档位 1/2/3/5）。
     公式为推定值（基础4金/档，待原版实机比对），与部分客栈硬编码 var6=4 一致 */
  innPrice(rate) { return Math.max(4, Math.min(40, Math.round(rate || 1) * 4)); }
  /* G3-R1: 收服敌将（颜良/文丑等投诚系统；数据脚本 addSurrenderedEnemy/hasSurrenderedEnemy） */
  addSurrenderedEnemy(id) { this._surrendered = this._surrendered || []; if (!this._surrendered.includes(id)) this._surrendered.push(id); return true; }
  hasSurrenderedEnemy(id) { return (this._surrendered || []).includes(id); }
  /* G3-R1: 胜点/剧情等级/pvp 计数（数据脚本引用，最小存储语义） */
  gainWinPoint(n) { this._winPoint = (this._winPoint || 0) + (n || 1); return this._winPoint; }
  changePvpLevel(n) { this._pvpLevel = T.clamp((this._pvpLevel || 0) + (n || 0), 0, 99); return this._pvpLevel; }
  addPvpCount() { this._pvpCount = (this._pvpCount || 0) + 1; return this._pvpCount; }
  /* G3-R1: 战斗中/菜单武将访问（数据脚本引用） */
  inBattle() { return !!T.BattleScene; }
  menuActor() { return this._menuActor || this.battleMembers()[0] || null; }
  /* G3-R1: 称号（封号）装备/隐藏（数据脚本 changeEquipChengHao/hideChengHao，最小存储：穿戴即替换） */
  changeEquipChengHao(actorId, chengHaoId) {
    const a = T.getActor(actorId);
    if (a) a._chengHao = [chengHaoId];
    return a;
  }
  hideChengHao(actorId) {
    const a = T.getActor(actorId);
    if (a) a._chengHao = [];
    return a;
  }
  items() { return Object.keys(this._items).filter(id => this._items[id] > 0).map(id => T.$dataItems[+id]); }
  weapons() { return Object.keys(this._weapons).filter(id => this._weapons[id] > 0).map(id => T.$dataWeapons[+id]); }
  armors() { return Object.keys(this._armors).filter(id => this._armors[id] > 0).map(id => T.$dataArmors[+id]); }
  allItems() { return [...this.items(), ...this.weapons(), ...this.armors()].filter(Boolean); }
  itemCount(item) {
    if (!item) return 0;
    const cont = T.$dataItems.includes(item) ? this._items
               : T.$dataWeapons.includes(item) ? this._weapons : this._armors;
    return cont[item.id] || 0;
  }
  maxItemCount(item) { return 99; }
  /* G3-R7: 仓库（插件 BrotherJie_MenuBase/CallActorStorage：背包 ⇄ 仓库双向存取，随存档持久化） */
  storageCount(item) { return item ? ((this._storage || {})[item.id] || 0) : 0; }
  storageGain(item, n) {
    if (!item) return;
    this._storage = this._storage || {};
    this._storage[item.id] = T.clamp((this._storage[item.id] || 0) + (n || 0), 0, 999);
  }
  storageLose(item, n) { this.storageGain(item, -(n || 0)); }
  storageAll() {
    return Object.keys(this._storage || {}).map(id => T.$dataItems[+id] || T.$dataWeapons[+id] || T.$dataArmors[+id]).filter(Boolean);
  }
  /* G3-R9: 军物品合成——役店配方（插件 BrotherJie_ItemSynthesis/AddRecipe）。
     配方载荷 = 字符串数组："[材料..., 产物...]"，材料取自 0-53，产物恒为 54-63。
     语义推定（FC 原版角色扮演惯例，无插件源码佐证）：持全部材料各≥1 → 各减 1 → 选一产物获得。 */
  canSynth(mats) { return (mats || []).every(m => m && this.itemCount(m) >= 1); }
  synth(mats, prod) {
    if (!this.canSynth(mats)) return false;
    for (const m of mats) if (m) this.loseItem(m, 1);
    if (prod) this.gainItem(prod, 1);
    return true;
  }
  gainItem(item, n) {
    if (!item) return;
    const cont = T.$dataItems.includes(item) ? this._items
               : T.$dataWeapons.includes(item) ? this._weapons : this._armors;
    const next = T.clamp((cont[item.id] || 0) + n, 0, this.maxItemCount(item));
    if (next > 0) cont[item.id] = next;
    else delete cont[item.id];
    if (n > 0) this._lastItem = item;
  }
  loseItem(item, n) { this.gainItem(item, -n); }
  hasItem(item) { return this.itemCount(item) > 0; }
  consumeItem(item) { if (T.$dataItems.includes(item)) this.loseItem(item, 1); }
  /* 成员 */
  allMembers() { return this._actors.map(id => T.getActor(id)); }
  battleMembers() { return this.allMembers().slice(0, T.MAX_BATTLE_MEMBERS); }
  addActor(id) {
    if (this._actors.includes(id)) return;
    const existing = this.allMembers();
    const averageLevel = existing.length
      ? Math.max(1, Math.round(existing.reduce((sum, actor) => sum + actor.level, 0) / existing.length))
      : 1;
    const actor = T.getActor(id);
    if (actor && existing.length && actor.level !== averageLevel) {
      actor.changeLevel(averageLevel, false);
      actor.recoverAll();
    }
    this._actors.push(id);
  }
  removeActor(id) { this._actors = this._actors.filter(x => x !== id); }
  storageRemoveActor(id) { this.removeActor(id); }
  storageAddActor(id) { this.addActor(id); }
  members() { return this.battleMembers(); }
  isAllDead() { return T.MAX_BATTLE_MEMBERS > 0 && this.battleMembers().every(a => a.isDead()); }
  steps() { return this._steps || 0; }
  increaseSteps() { this._steps = (this._steps || 0) + 1; }
  encounterHalf() { return this.battleMembers().some(a => a.partyAbility(0)); }
  encounterNone() { return this.battleMembers().some(a => a.partyAbility(1)); }
  goldDouble() { return this.battleMembers().some(a => a.partyAbility(3)); }
  dropDouble() { return this.battleMembers().some(a => a.partyAbility(4)); }
  highestLevel() { return Math.max(0, ...this.battleMembers().map(a => a.level)); }
  /* G3-R1: 剧情里程碑升/降级（数据脚本 $gameParty.changeLevel(N)，N=绝对目标等级，
     全队同步到该等级；配合 Game_Actor.changeLevel(level, show) 语义） */
  changeLevel(lv) {
    const target = T.clamp(Math.round(lv) || 1, 1, 99);
    for (const a of this.allMembers()) if (a) a.changeLevel(target, false);
    return target;
  }
}

/* ---------------- 全局状态 ---------------- */
T.resetGameState = function () {
  /* G2-R3: 阵型系统——FC 吞食天地2 机制为【乘算倍率】，对全队/敌群最终属性乘算。
     数值为按 FC 原版公开机制整定的【推定倍率】（1.0=不变），待原版实机比对校准：
       散开=极速 鹤翼=攻守兼 冲方=强攻 白马=全面小幅 鱼鳞=重守 锋箭=攻速换
       一字=守+抗计 两仪=计策强化 雁行=极速(降攻) 背水=攻2倍防减半 掎角=守+智 八卦=重守+计策 */
  T.FORMATIONS = [
    { name: "散开阵",  atk: 1.0,  def: 1.0,  mat: 1.0,  mdf: 1.0,  agi: 1.30 },
    { name: "鹤翼阵",  atk: 1.25, def: 1.25, mat: 1.0,  mdf: 1.0,  agi: 1.0  },
    { name: "冲方阵",  atk: 1.50, def: 0.85, mat: 1.0,  mdf: 1.0,  agi: 1.10 },
    { name: "白马阵",  atk: 1.15, def: 1.15, mat: 1.15, mdf: 1.15, agi: 1.15 },
    { name: "鱼鳞阵",  atk: 1.0,  def: 1.50, mat: 1.0,  mdf: 1.0,  agi: 0.90 },
    { name: "锋箭阵",  atk: 1.40, def: 1.0,  mat: 1.0,  mdf: 1.0,  agi: 0.85 },
    { name: "一字阵",  atk: 0.90, def: 1.50, mat: 1.0,  mdf: 1.40, agi: 0.80 },
    { name: "两仪阵",  atk: 1.0,  def: 1.0,  mat: 1.50, mdf: 1.40, agi: 1.0  },
    { name: "雁行阵",  atk: 0.90, def: 1.0,  mat: 1.0,  mdf: 1.0,  agi: 1.80 },
    { name: "背水阵",  atk: 2.0,  def: 0.50, mat: 1.0,  mdf: 0.80, agi: 1.0  },
    { name: "掎角阵",  atk: 1.0,  def: 1.40, mat: 1.30, mdf: 1.30, agi: 1.0  },
    { name: "八卦阵",  atk: 1.0,  def: 1.80, mat: 1.40, mdf: 1.60, agi: 0.80 },
  ];
  T.$gameTemp = { commonEventQueue: [], destinationX: null, destinationY: null };
  /* 标准载具状态：0小船、1大船、2飞行船；地图事件负责触发，实际位置独立保存。 */
  T.$gameVehicles = {
    0: { mapId: 0, x: 0, y: 0 },
    1: { mapId: 0, x: 0, y: 0 },
    2: { mapId: 0, x: 0, y: 0 },
  };

/* 主线阶段索引：原始地图用变量1推进剧情，网页端将它映射成可读章节状态。 */
T.CHAPTERS = [
  { id: 1, start: 5, name: "灭袁术", goal: "徐州、寿春与袁术最终战" },
  { id: 2, start: 80, name: "河北鏖战与千里走单骑", goal: "袁绍、颜良文丑、五关与古城聚义" },
  { id: 3, start: 260, name: "荆州新野与三顾茅庐", goal: "刘表、新野、孔明、博望坡与长坂坡" },
  { id: 4, start: 470, name: "赤壁之战与平定荆州", goal: "赤壁、南郡、四郡与黄忠" },
  { id: 5, start: 830, name: "西蜀入川", goal: "成都、巴关、建宁、绵竹与雒城" },
  { id: 6, start: 1165, name: "汉中争夺与姜维归汉", goal: "汉中、天水、姜维、街亭与陈仓" },
  { id: 7, start: 1440, name: "北伐灭曹魏", goal: "鲁城、五丈原、石阵、长安与洛阳" },
  { id: 8, start: 1605, name: "荆州终局与伐吴", goal: "荆州告急、樊城与柴桑终战" },
  { id: 9, start: 1655, name: "二周目特别篇：秦皇陵", goal: "秦皇陵、葛玄试炼与跨时代决战" },
];
T.chapterForStage = function (stage) {
  let current = T.CHAPTERS[0];
  for (const chapter of T.CHAPTERS) if (stage >= chapter.start) current = chapter;
  return current;
};
T.updateChapterState = function (stage) {
  const system = T.$gameSystem;
  if (!system) return;
  const chapter = T.chapterForStage(Number(stage) || 0);
  system.currentChapter = chapter.id;
  system.currentChapterName = chapter.name;
  system.chapterGoal = chapter.goal;
  system.chapterHistory = system.chapterHistory || {};
  for (const item of T.CHAPTERS) if (chapter.id > item.id) system.chapterHistory[item.id] = true;
};

/* G3-R9: 军物品合成——配方注册与界面入口（役店 BrotherJie_ItemSynthesis）
   配方为 JSON 字符串数组："[材料..., 产物...]"；材料 0-53，产物恒 54-63；
   界面打开时取最近一次 AddRecipe 注册的配方（役店事件顺序：AddRecipe→CallItemSynthesis）。 */
T._synthRecipes = [];
T.registerSynthRecipe = function (recipeStr) {
  void recipeStr;
};

/* G5: 菜单道具调用公共事件时，按 MV/MZ 事件参数同步执行。
   这些公共事件承载郑玄的信、胡班家书、炸药、锦囊、张松的信等主线道具，
   不能只收集对白；变量、条件、消耗、入队和分支都必须改变真实游戏状态。 */
T.runMapCommonEvent = function (ceId) {
  const ce = T.$dataCommonEvents[ceId];
  if (!ce) return [];
  const msgs = [];
  const stack = [{ list: ce.list || [], i: 0, branches: {} }];
  const actorOf = id => T.getActor(id);
  const characterOf = id => {
    if (id === -1) return T.$gamePlayer;
    const eventId = T.currentInterpreter && T.currentInterpreter.eventId;
    return T.$gameMap && T.$gameMap.event(id || eventId || 0);
  };
  const gameData = args => {
    const [type, arg1, arg2] = args;
    if (type === 0) return T.$gameParty.itemCount(T.$dataItems[arg1]);
    if (type === 1) return T.$gameParty.itemCount(T.$dataWeapons[arg1]);
    if (type === 2) return T.$gameParty.itemCount(T.$dataArmors[arg1]);
    if (type === 3) { const a = actorOf(arg1); return a ? (arg2 === 0 ? a.level : arg2 === 1 ? a.exp : a.hp) : 0; }
    if (type === 5) { const ch = characterOf(arg1); return ch ? (arg2 === 0 ? ch.x : arg2 === 1 ? ch.y : ch.direction()) : 0; }
    if (type === 6) return arg1 === 0 ? T.$gameParty.gold() : arg1 === 1 ? T.$gameParty.steps() : 0;
    if (type === 7) return T.$gameMap ? T.$gameMap.mapId : 0;
    return 0;
  };
  const operand = (mode, params, base) => {
    if (mode === 0) return params[base];
    if (mode === 1) return T.$gameVariables.value(params[base]);
    if (mode === 2) return T.randBetween(Math.min(params[base], params[base + 1]), Math.max(params[base], params[base + 1]));
    if (mode === 3) return gameData(params.slice(base));
    if (mode === 4) {
      try { return Math.trunc(new Function(`with(T){return (${params[base]});}`)()); } catch (e) { return 0; }
    }
    return params[base];
  };
  const setVariables = p => {
    const [start, end, op, mode] = p;
    for (let id = start; id <= end; id++) {
      const value = operand(mode, p, 4);
      const old = T.$gameVariables.value(id);
      const next = op === 0 ? value : op === 1 ? old + value : op === 2 ? old - value :
        op === 3 ? old * value : op === 4 ? (value ? Math.trunc(old / value) : 0) : value;
      T.$gameVariables.setValue(id, next);
    }
  };
  const condition = p => {
    switch (p[0]) {
      case 0: return T.$gameSwitches.value(p[1]) === (p[2] === 0);
      case 1: {
        const left = T.$gameVariables.value(p[1]);
        const right = p[2] === 0 ? p[3] : T.$gameVariables.value(p[3]);
        return p[4] === 0 ? left === right : p[4] === 1 ? left >= right : p[4] === 2 ? left <= right :
          p[4] === 3 ? left > right : p[4] === 4 ? left < right : left !== right;
      }
      case 2: return T.$gameSelfSwitches.value(`${T.$gameMap && T.$gameMap.mapId},${T.currentInterpreter && T.currentInterpreter.eventId},${p[1]}`);
      case 3: return !!(T.$gameTimer && T.$gameTimer._working);
      case 4: {
        const a = actorOf(p[1]); if (!a) return false;
        return p[2] === 0 ? T.$gameParty._actors.includes(p[1]) : p[2] === 1 ? a.nickname === p[3] :
          p[2] === 2 ? a.skills().some(s => s.id === p[3]) : p[2] === 3 ? Object.values(a._equips).includes(p[3]) :
          p[2] === 4 ? a.isStateAffected(p[3]) : false;
      }
      case 6: { const ch = characterOf(p[1]); return !!ch && (p[2] === 0 ? ch.x === p[3] : ch.direction() === p[2]); }
      case 7: return p[2] === 0 ? T.$gameParty.gold() >= p[1] : T.$gameParty.gold() <= p[1];
      case 8: return T.$gameParty.hasItem(T.$dataItems[p[1]]);
      case 9: return T.$gameParty.itemCount(T.$dataWeapons[p[1]]) > 0;
      case 10: return T.$gameParty.itemCount(T.$dataArmors[p[1]]) > 0;
      case 11: return T.Input.pressed(p[1]);
      case 12: try { return !!new Function(`with(T){return (${p[1]});}`)(); } catch (e) { return false; }
      case 13: return true;
      default: return false;
    }
  };
  const skipConditional = (fr, indent, toElse) => {
    while (fr.i < fr.list.length) {
      const next = fr.list[fr.i++];
      if (!next) return;
      if (next.indent < indent) return;
      if (next.indent !== indent) continue;
      if (toElse && next.code === 411) return;
      if (next.code === 0 || next.code === 412 || next.code === 413) return;
    }
  };
  const skipChoice = (fr, indent) => {
    while (fr.i < fr.list.length) {
      const next = fr.list[fr.i++];
      if (!next) return;
      if (next.indent < indent) return;
      if (next.indent === indent && [402, 403, 404].includes(next.code)) { fr.i--; return; }
    }
  };
  const systemMessage = text => {
    if (text != null && String(text).trim()) msgs.push(String(text));
  };
  T.TnUser = T.TnUser || { realName: "玩家" };
  const oldSystemMessage = T["发送系统信息"];
  T["发送系统信息"] = systemMessage;
  outer: while (stack.length) {
    const fr = stack[stack.length - 1];
    if (fr.i >= fr.list.length) { stack.pop(); continue; }
    const c = fr.list[fr.i++];
    if (!c) continue;
    const p = c.parameters || [];
    switch (c.code) {
      /* 分支内部的缩进 code 0 是空命令，只有列表末尾的 code 0 才结束当前公共事件。 */
      case 0: if (c.indent === 0 && fr.i >= fr.list.length) stack.pop(); break;
      case 101: break;
      case 401: case 405: { const text = String(p[0] || ""); if (text) msgs.push(text); break; }
      case 111: {
        const ok = condition(p); fr.branches[c.indent] = { taken: ok };
        if (!ok) skipConditional(fr, c.indent, true);
        break;
      }
      case 411: {
        const branch = fr.branches[c.indent];
        if (branch && branch.taken) skipConditional(fr, c.indent, false);
        break;
      }
      case 412: case 413: delete fr.branches[c.indent]; break;
      case 102: fr.branches[c.indent] = { choice: 0 }; break;
      case 402: {
        const branch = fr.branches[c.indent];
        if (!branch || branch.choice !== p[0]) skipChoice(fr, c.indent);
        break;
      }
      case 403: break;
      case 404: delete fr.branches[c.indent]; break;
      case 117: { const child = T.$dataCommonEvents[p[0]]; if (child) stack.push({ list: child.list || [], i: 0, branches: {} }); break; }
      case 121: for (let id = p[0]; id <= p[1]; id++) T.$gameSwitches.setValue(id, p[2] === 0); break;
      case 122: setVariables(p); break;
      case 123: {
        const key = `${T.$gameMap && T.$gameMap.mapId},${T.currentInterpreter && T.currentInterpreter.eventId},${p[0]}`;
        T.$gameSelfSwitches.setValue(key, p[1] === 0); break;
      }
      case 125: { const value = operand(p[1], p, 2); p[0] === 0 ? T.$gameParty.gainGold(value) : T.$gameParty.loseGold(value); break; }
      case 126: case 127: case 128: {
        const item = c.code === 126 ? T.$dataItems[p[0]] : c.code === 127 ? T.$dataWeapons[p[0]] : T.$dataArmors[p[0]];
        const value = operand(p[2], p, 3);
        if (item) p[1] === 0 ? T.$gameParty.gainItem(item, value) : T.$gameParty.loseItem(item, value);
        break;
      }
      case 129: p[1] === 0 ? T.$gameParty.addActor(p[0]) : T.$gameParty.removeActor(p[0]); break;
      case 130: {
        const actors = p[0] === 0 ? [T.$gameParty.allMembers()[p[1]]] : T.$gameParty.allMembers();
        for (const actor of actors) if (actor) actor.recoverAll();
        break;
      }
      case 136: T.$gameSwitches.setValue(38, (p[0] || 0) === 0); break;
      case 201: case 211: case 212: case 216: case 217: case 221: case 222: case 223: case 224: case 225: case 230: case 231: case 235: case 240: case 241: case 245: case 246: case 249: case 250: case 283: case 301: case 302: case 313: case 317: case 318: case 319: case 320: case 331: case 337: case 340: case 357: case 505: case 601: case 602: case 603: case 604: break;
      case 314: {
        if (p[0] === 0) { const actor = actorOf(p[1]); if (actor) actor.recoverAll(); }
        else for (const actor of T.$gameParty.allMembers()) actor.recoverAll();
        break;
      }
      case 355: {
        let script = String(p[0] || "");
        while (fr.i < fr.list.length && fr.list[fr.i] && fr.list[fr.i].code === 655) script += "\n" + String(fr.list[fr.i++].parameters?.[0] || "");
        try { new Function(`with(T){${script}}`)(); } catch (e) { console.warn("map-common-script:", script.slice(0, 80), e.message); }
        break;
      }
      case 655: break;
      default: break;
    }
  }
  if (oldSystemMessage) T["发送系统信息"] = oldSystemMessage;
  else delete T["发送系统信息"];
  return msgs;
};

  T.$gameSystem = { saveCount: 0, framesOnSave: 0, bgmOnSave: null, battleCount: 0, winCount: 0 };
  T.$gameSwitches = new Game_Switches();
  T.$gameVariables = new Game_Variables();
  T.$gameSelfSwitches = new Game_SelfSwitches();
  T.$gameScreen = new Game_Screen();
  T.$gameTimer = new Game_Timer();
  T.$gameMessage = new Game_Message();
  T.$gameParty = new Game_Party();
  /* G3-R1: 全局角色访问器（数据脚本 $gameActors.actor(id)，此前缺失导致 339 处脚本调用静默抛错） */
  T.$gameActors = { actor(id) { return T.getActor(id); } };
  T.$gameTroop = null;   // 战斗时创建
  T.$gameMap = null;     // 地图场景创建
  T.$gamePlayer = null;
  T.LastBattle = null;
  /* 网页版跳过原作登录插件；原始事件用开关55表示登录已完成。 */
  T.$gameSwitches._data[55] = true;
  if (T.updateChapterState) T.updateChapterState(0);
};
T.resetGameState();

/* ---------------- 存档与试玩快照 ---------------- */
function serializeActors(ids) {
  return ids.map(id => {
    const a = T.getActor(id);
    return { id: a.actorId, level: a.level, hp: a.hp, mp: a.mp, exp: a.exp, equips: a._equips,
             /* G3-R2: 天赋/称号并入存档 */
             talents: a._ownTalents, chengHao: a._chengHao,
             /* G3-R3: 永久成长（蛇胆/武力石等）并入存档 */
             paramBonus: a._paramBonus };
  });
}
T.captureGameSnapshot = function () {
  const pictures = {};
  for (const [id, p] of Object.entries(T.$gameScreen.pictures || {})) {
    pictures[id] = { name: p.name, x: p.x, y: p.y, opacity: p.opacity, scale: p.scale };
  }
  return {
    version: 2,
    system: JSON.parse(JSON.stringify(T.$gameSystem || {})),
    switches: (T.$gameSwitches._data || []).slice(),
    variables: (T.$gameVariables._data || []).slice(),
    selfSwitches: { ...(T.$gameSelfSwitches._data || {}) },
    screen: { pictures },
    party: {
      gold: T.$gameParty._gold, items: T.$gameParty._items,
      weapons: T.$gameParty._weapons, armors: T.$gameParty._armors,
      actors: T.$gameParty._actors, lastItem: T.$gameParty._lastItem ? T.$gameParty._lastItem.id : 0,
      /* G3-R2: c718918 新增字段并入存档 v2（旧档缺失时读取侧给默认值） */
      formation: T.$gameParty._formation,
      surrendered: T.$gameParty._surrendered,
      winPoint: T.$gameParty._winPoint,
      pvpLevel: T.$gameParty._pvpLevel,
      pvpCount: T.$gameParty._pvpCount,
      storage: T.$gameParty._storage,
      steps: T.$gameParty._steps || 0,
    },
    vehicles: JSON.parse(JSON.stringify(T.$gameVehicles || {})),
    actorSnapshots: serializeActors(T.$gameParty._actors),
    mapId: T.$gameMap ? T.$gameMap.mapId : 1,
    player: T.$gamePlayer ? {
      x: T.$gamePlayer.x, y: T.$gamePlayer.y, dir: T.$gamePlayer.direction(),
      vehicleType: T.$gamePlayer._vehicleType, vehicleEventId: T.$gamePlayer._vehicleEventId || 0,
    } : null,
    encounterProgress: T.$gameMap ? T.$gameMap.encounterProgress || 0 : 0,
  };
};
T.applyGameSnapshot = async function (s) {
  if (!s || !s.party) return false;
  T.ActorRegistry = {};
  T.$gameSystem = Object.assign({ saveCount: 0, framesOnSave: 0, bgmOnSave: null, battleCount: 0, winCount: 0 }, s.system || {});
  T.$gameSwitches._data = s.switches || [];
  /* 兼容旧存档：网页版没有登录页，恢复时也必须保持原始事件可推进。 */
  T.$gameSwitches._data[55] = true;
  T.$gameVariables._data = s.variables || [];
  if (T.updateChapterState) T.updateChapterState(T.$gameVariables.value(1));
  T.$gameSelfSwitches._data = s.selfSwitches || {};
  T.$gameScreen.pictures = {};
  for (const [id, p] of Object.entries((s.screen && s.screen.pictures) || {})) {
    T.$gameScreen.pictures[id] = { name: p.name, x: p.x, y: p.y, opacity: p.opacity, scale: p.scale, img: null };
    if (p.name) T.ImageManager.picture(p.name).then(img => {
      const current = T.$gameScreen.pictures[id];
      if (current) current.img = img;
    });
  }
  const party = s.party || {};
  T.$gameParty._gold = Number(party.gold) || 0;
  T.$gameParty._items = party.items || {};
  T.$gameParty._weapons = party.weapons || {};
  T.$gameParty._armors = party.armors || {};
  T.$gameParty._actors = Array.isArray(party.actors) ? party.actors.slice() : [];
  T.$gameParty._lastItem = null;
  /* G3-R2: 恢复新增字段（旧档缺失时使用兼容默认值） */
  T.$gameParty._formation = (party.formation != null) ? party.formation : -1;
  T.$gameParty._surrendered = party.surrendered || [];
  T.$gameParty._winPoint = party.winPoint || 0;
  T.$gameParty._pvpLevel = party.pvpLevel || 0;
  T.$gameParty._pvpCount = party.pvpCount || 0;
  T.$gameParty._storage = party.storage || {};
  T.$gameParty._steps = Number(party.steps) || 0;
  T.$gameVehicles = Object.assign({
    0: { mapId: 0, x: 0, y: 0 },
    1: { mapId: 0, x: 0, y: 0 },
    2: { mapId: 0, x: 0, y: 0 },
  }, s.vehicles || {});
  for (const snap of (s.actorSnapshots || [])) {
    const a = T.getActor(snap.id);
    a.level = snap.level; a.exp = snap.exp || a.expForLevel(snap.level);
    a._equips = snap.equips || {};
    a._ownTalents = snap.talents || [];
    a._chengHao = snap.chengHao || [];
    a._paramBonus = snap.paramBonus || {};
    a.refresh();
    a.hp = snap.hp == null ? a.mhp : snap.hp;
    a.mp = snap.mp == null ? a.mmp : snap.mp;
  }
  if (T.SceneManager) {
    await T.SceneManager.gotoMap(s.mapId || 1, s.player ? s.player.x : 1, s.player ? s.player.y : 1, s.player ? s.player.dir : 2);
    if (T.$gamePlayer) {
      T.$gamePlayer._vehicleType = s.player && s.player.vehicleType != null ? s.player.vehicleType : null;
      T.$gamePlayer._vehicleEventId = s.player && s.player.vehicleEventId || 0;
    }
    if (T.$gameMap) T.$gameMap.encounterProgress = Number(s.encounterProgress) || 0;
  }
  return true;
};
T.saveGame = async function (slot) {
  T.$gameSystem.framesOnSave = T.GameMain ? T.GameMain.frameCount : 0;
  const snap = T.captureGameSnapshot();
  snap.savedAt = Date.now();
  const prefix = T.Preview && T.Preview.enabled ? "tndt_debug_save_" : "tndt_save_";
  localStorage.setItem(prefix + slot, JSON.stringify(snap));
  T.$gameSystem.saveCount++;
};
T.savePrefix = () => T.Preview && T.Preview.enabled ? "tndt_debug_save_" : "tndt_save_";
T.hasSaveFile = slot => !!localStorage.getItem(T.savePrefix() + slot);
T.saveInfo = function (slot) {
  try { return JSON.parse(localStorage.getItem(T.savePrefix() + slot)); } catch (e) { return null; }
};
T.loadGame = async function (slot) {
  const raw = localStorage.getItem(T.savePrefix() + slot);
  if (!raw) return false;
  let s;
  try { s = JSON.parse(raw); } catch (e) { console.warn("坏档:", slot, e); return false; }
  return T.applyGameSnapshot(s);
};

/* ---------------- 全局别名：供事件脚本 eval 与引擎内部使用 ---------------- */
(function installGlobals() {
  const gameKeys = ["$gameTemp", "$gameSystem", "$gameSwitches", "$gameVariables",
    "$gameSelfSwitches", "$gameScreen", "$gameTimer", "$gameMessage",
    "$gameParty", "$gameTroop", "$gameMap", "$gamePlayer", "$gameActors"];
  const dataKeys = ["$dataActors", "$dataClasses", "$dataSkills", "$dataItems",
    "$dataWeapons", "$dataArmors", "$dataEnemies", "$dataTroops", "$dataStates",
    "$dataAnimations", "$dataTilesets", "$dataCommonEvents", "$dataSystem",
    "$dataMapInfos", "$dataMap"];
  for (const k of [...gameKeys, ...dataKeys]) {
    Object.defineProperty(window, k, {
      get() { return T[k]; },
      set(v) { T[k] = v; },
      configurable: true,
    });
  }
})();

/* 类导出（供事件脚本与跨模块使用） */
Object.assign(T, {
  Game_Switches, Game_Variables, Game_SelfSwitches, Game_Screen,
  Game_Timer, Game_Message, Game_ActionResult, Game_BattlerBase,
  Game_Battler, Game_Actor, Game_Enemy, Game_Party,
});
