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
  async loadAll(onStep) {
    for (let i = 0; i < this.FILES.length; i++) {
      const f = this.FILES[i];
      T[this.KEYS[f]] = await jget(f + ".json");
      if (onStep) onStep(i + 1, this.FILES.length, f);
    }
    T.MAX_BATTLE_MEMBERS = 5;   // 敌群最多5人，我方同5人
  },
  async loadMapData(mapId) {
    T.$dataMap = await jget("map" + String(mapId).padStart(3, "0") + ".json");
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
T.getAttackPower = (a, b) => Math.max(0, Math.round(a.atk * 4 - b.def * 2));
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
    this.result = new Game_ActionResult();
    this.hidden = false;
    this.turnAddSpeed = 0;
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
    const form = this.formationBonus(i);
    /* 特性增量（如 0.95/0.05）可能带小数，最终属性一律取整 */
    return T.clamp(Math.round(Math.round(base * rate) + plus + bonus + equip + form), i === 0 ? 1 : 0, this.paramMax(i));
  }
  equipParam(i) { return 0; }
  formationBonus(i) { return 0; }
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
    }
  }
  removeStateRaw(id) { const i = this._states.indexOf(id); if (i >= 0) this._states.splice(i, 1); }
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
      if ((item.mpCost || 0) > this.mp) return false;
      if (this.sealedSkillTypes().includes(item.stypeId)) return false;
      if (this.sealedSkills().includes(item.id)) return false;
      if (!this.addedSkillTypes().includes(item.stypeId) && !this.knowsSkill(item.id)) return false;
      return true;
    }
    if (T.$dataItems.includes(item)) return $gameParty.itemCount(item) > 0;
    return false;
  }
  paySkillCost(skill) { this.mp -= skill.mpCost || 0; }
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
    let sp = this.agi + T.rand(Math.floor(Math.abs(this.agi) / 4) + 1) + this.attackSpeedAdd();
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
      if (st.autoRemovalTiming !== 1) continue;
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
    this.exp = exp;
    while (this.level < this.maxLevel && this.exp >= this.expForLevel(this.level + 1)) {
      this.level++;
      this.refresh();
      this._lastLevelUps = this._lastLevelUps || [];
      this._lastLevelUps.push({ level: this.level, learned: this.newSkillsAt(this.level) });
    }
    while (this.level > 1 && this.exp < this.expForLevel(this.level)) this.level--;
    this.refresh();
  }
  newSkillsAt(level) {
    return (this.cls().learnings || []).filter(l => l.level === level).map(l => l.skillId);
  }
  takeLevelUpReport() { const r = this._lastLevelUps || []; this._lastLevelUps = []; return r; }
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
    return row[idx];
  }
  /* 装备加成：累加所有已装备物品的 params（MZ 中装备 params 直接加到属性） */
  equipParam(i) {
    let sum = 0;
    for (const it of this.equippedItems()) {
      if (it && it.params) sum += (it.params[i] || 0);
    }
    return sum;
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
  battlerImage() {
    if (this.noteTags.svBattler) return { type: "char", name: this.noteTags.svBattler };
    return { type: "front", name: this.data.battlerName };
  }
  makeDropItems() {
    const drops = [];
    for (const d of this.dropItems) {
      const kind = d.kind, dataId = d.dataId;
      if (kind === 1 && T.rand(100) < d.denominator) drops.push(T.$dataItems[dataId]);
      else if (kind === 2 && T.rand(100) < d.denominator) drops.push(T.$dataWeapons[dataId]);
      else if (kind === 3 && T.rand(100) < d.denominator) drops.push(T.$dataArmors[dataId]);
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
  }
  get gold() { return this._gold; }
  gainGold(n) { this._gold = T.clamp(this._gold + n, 0, 99999999); }
  loseGold(n) { this.gainGold(-n); }
  maxGold() { return 99999999; }
  items() { return Object.keys(this._items).map(id => T.$dataItems[+id]); }
  weapons() { return Object.keys(this._weapons).map(id => T.$dataWeapons[+id]); }
  armors() { return Object.keys(this._armors).map(id => T.$dataArmors[+id]); }
  allItems() { return [...this.items(), ...this.weapons(), ...this.armors()].filter(Boolean); }
  itemCount(item) {
    if (!item) return 0;
    const cont = T.$dataItems.includes(item) ? this._items
               : T.$dataWeapons.includes(item) ? this._weapons : this._armors;
    return cont[item.id] || 0;
  }
  maxItemCount(item) { return T.$dataItems.includes(item) ? 99 : 1; }
  gainItem(item, n) {
    if (!item) return;
    const cont = T.$dataItems.includes(item) ? this._items
               : T.$dataWeapons.includes(item) ? this._weapons : this._armors;
    cont[item.id] = T.clamp((cont[item.id] || 0) + n, 0, this.maxItemCount(item));
    if (n > 0) this._lastItem = item;
  }
  loseItem(item, n) { this.gainItem(item, -n); }
  hasItem(item) { return this.itemCount(item) > 0; }
  consumeItem(item) { if (T.$dataItems.includes(item)) this.loseItem(item, 1); }
  /* 成员 */
  allMembers() { return this._actors.map(id => T.getActor(id)); }
  battleMembers() { return this.allMembers().slice(0, T.MAX_BATTLE_MEMBERS); }
  addActor(id) { if (!this._actors.includes(id)) this._actors.push(id); }
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
}

/* ---------------- 全局状态 ---------------- */
T.resetGameState = function () {
  /* G2: 阵型系统（FC 吞食天地2 机制：全队持续参数加成）
   数值为暂定初版（攻击/防御/智力/抗智/速度增减），待对照原版数值校准 */
T.FORMATIONS = [
  { name: "散开阵",  atk: 0,  def: 0,  mat: 0,  mdf: 0,  agi: 20 },
  { name: "鹤翼阵",  atk: 15, def: 15, mat: 0,  mdf: 0,  agi: 0 },
  { name: "冲方阵",  atk: 30, def: -15, mat: 0,  mdf: 0,  agi: 10 },
  { name: "白马阵",  atk: 10, def: 10, mat: 10, mdf: 10, agi: 10 },
  { name: "鱼鳞阵",  atk: 20, def: 20, mat: 0,  mdf: 0,  agi: -10 },
  { name: "锋箭阵",  atk: 25, def: 0,  mat: 0,  mdf: 0,  agi: -15 },
  { name: "一字阵",  atk: 10, def: 10, mat: 0,  mdf: 20, agi: -25 },
  { name: "两仪阵",  atk: 0,  def: 0,  mat: 25, mdf: 25, agi: 0 },
  { name: "雁行阵",  atk: -10, def: 10, mat: 0,  mdf: 0,  agi: 30 },
  { name: "背水阵",  atk: 40, def: -40, mat: 0,  mdf: -20, agi: 0 },
  { name: "掎角阵",  atk: -15, def: 25, mat: 15, mdf: 15, agi: 0 },
  { name: "八卦阵",  atk: 0,  def: 35, mat: 20, mdf: 35, agi: -20 },
];
T.$gameTemp = { commonEventQueue: [], destinationX: null, destinationY: null };
  T.$gameSystem = { saveCount: 0, framesOnSave: 0, bgmOnSave: null, battleCount: 0, winCount: 0 };
  T.$gameSwitches = new Game_Switches();
  T.$gameVariables = new Game_Variables();
  T.$gameSelfSwitches = new Game_SelfSwitches();
  T.$gameScreen = new Game_Screen();
  T.$gameTimer = new Game_Timer();
  T.$gameMessage = new Game_Message();
  T.$gameParty = new Game_Party();
  T.$gameTroop = null;   // 战斗时创建
  T.$gameMap = null;     // 地图场景创建
  T.$gamePlayer = null;
};
T.resetGameState();

/* ---------------- 存档 ---------------- */
function serializeActors(ids) {
  return ids.map(id => {
    const a = T.getActor(id);
    return { id: a.actorId, level: a.level, hp: a.hp, mp: a.mp, exp: a.exp, equips: a._equips };
  });
}
T.saveGame = async function (slot) {
  T.$gameSystem.framesOnSave = T.GameMain ? T.GameMain.frameCount : 0;
  const snap = {
    version: 1,
    system: T.$gameSystem,
    switches: T.$gameSwitches._data,
    variables: T.$gameVariables._data,
    selfSwitches: T.$gameSelfSwitches._data,
    screen: { pictures: T.$gameScreen.pictures },
    party: {
      gold: T.$gameParty._gold, items: T.$gameParty._items,
      weapons: T.$gameParty._weapons, armors: T.$gameParty._armors,
      actors: T.$gameParty._actors, lastItem: T.$gameParty._lastItem ? T.$gameParty._lastItem.id : 0,
    },
    actorSnapshots: serializeActors(T.$gameParty._actors),
    mapId: T.$gameMap ? T.$gameMap.mapId : 1,
    player: T.$gamePlayer ? { x: T.$gamePlayer.x, y: T.$gamePlayer.y, dir: T.$gamePlayer.direction() } : null,
    savedAt: Date.now(),
  };
  localStorage.setItem("tndt_save_" + slot, JSON.stringify(snap));
  T.$gameSystem.saveCount++;
};
T.hasSaveFile = slot => !!localStorage.getItem("tndt_save_" + slot);
T.saveInfo = function (slot) {
  try { return JSON.parse(localStorage.getItem("tndt_save_" + slot)); } catch (e) { return null; }
};
T.loadGame = async function (slot) {
  const raw = localStorage.getItem("tndt_save_" + slot);
  if (!raw) return false;
  let s;
  try { s = JSON.parse(raw); } catch (e) { console.warn("坏档:", slot, e); return false; }
  T.ActorRegistry = {};
  T.$gameSystem = s.system;
  T.$gameSwitches._data = s.switches || [];
  T.$gameVariables._data = s.variables || [];
  T.$gameSelfSwitches._data = s.selfSwitches || {};
  T.$gameScreen.pictures = (s.screen && s.screen.pictures) || {};
  T.$gameParty._gold = s.party.gold;
  T.$gameParty._items = s.party.items || {};
  T.$gameParty._weapons = s.party.weapons || {};
  T.$gameParty._armors = s.party.armors || {};
  T.$gameParty._actors = s.party.actors || [];
  T.$gameParty._lastItem = null;
  for (const snap of (s.actorSnapshots || [])) {
    const a = T.getActor(snap.id);
    a.level = snap.level; a.exp = snap.exp || a.expForLevel(snap.level);
    a._equips = snap.equips || {};
    a.refresh();
    a.hp = snap.hp; a.mp = snap.mp;
  }
  if (T.SceneManager) {
    await T.SceneManager.gotoMap(s.mapId, s.player ? s.player.x : 1, s.player ? s.player.y : 1, s.player ? s.player.dir : 2);
  }
  return true;
};

/* ---------------- 全局别名：供事件脚本 eval 与引擎内部使用 ---------------- */
(function installGlobals() {
  const gameKeys = ["$gameTemp", "$gameSystem", "$gameSwitches", "$gameVariables",
    "$gameSelfSwitches", "$gameScreen", "$gameTimer", "$gameMessage",
    "$gameParty", "$gameTroop", "$gameMap", "$gamePlayer"];
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
