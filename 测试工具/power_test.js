#!/usr/bin/env node
/* 坦克大战 · 火力5级/老鹰/双炮/电磁场 专项回归 */
const fs = require("fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const gameJs = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeCtx(){
  const grad={addColorStop(){}};
  const target={canvas:{width:0,height:0},measureText:s=>({width:String(s).length*6}),
    createLinearGradient:()=>grad,createRadialGradient:()=>grad,createPattern:()=>({}),getImageData:()=>({data:new Uint8ClampedArray(4)})};
  return new Proxy(target,{get(t,k){if(k in t)return t[k];
    if(typeof k==="string"&&["fillStyle","strokeStyle","font","globalAlpha","globalCompositeOperation","lineWidth","textBaseline","shadowColor","shadowBlur","lineCap","lineJoin","imageSmoothingEnabled"].includes(k))return undefined;
    return(...a)=>undefined;},set(t,k,v){t[k]=v;return true;}});
}
function makeEl(id){
  const el={id,style:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},
    addEventListener(){},removeEventListener(){},appendChild(){},removeChild(){},innerHTML:"",textContent:"",value:"",
    width:0,height:0,offsetWidth:100,offsetHeight:50,getContext:()=>makeCtx(),
    getBoundingClientRect:()=>({left:0,top:0,width:100,height:50,right:100,bottom:50}),
    setAttribute(){},getAttribute:()=>null,querySelector:()=>makeEl("q"),querySelectorAll:()=>[],matches:()=>false,
    focus(){},select(){},click(){},append(){},remove(){},contains:()=>false};
  return el;
}
const els={};
globalThis.window=globalThis;
globalThis.document={readyState:"complete",getElementById:id=>els[id]||(els[id]=makeEl(id)),
  createElement:t=>{const e=makeEl("_"+t);if(t==="canvas"){e.width=576;e.height=448;}return e;},
  createElementNS:()=>makeEl("svg"),documentElement:makeEl("html"),body:makeEl("body"),head:makeEl("head"),
  addEventListener(){},removeEventListener(){},querySelector:()=>makeEl("q"),querySelectorAll:()=>[]};
const _ls={};
globalThis.localStorage={getItem:k=>_ls[k]!==undefined?_ls[k]:null,setItem:(k,v)=>{_ls[k]=String(v)},removeItem:k=>{delete _ls[k]},key:()=>null,length:0,clear(){}};
globalThis.navigator={getGamepads:()=>[],maxTouchPoints:0};
globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
globalThis.screen={orientation:undefined};
globalThis.location={hash:""};
globalThis.innerWidth=1200;globalThis.innerHeight=800;globalThis.devicePixelRatio=2;
globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};
const rafQueue=[];globalThis.requestAnimationFrame=cb=>{rafQueue.push(cb);return rafQueue.length;};

const harness = `
;(function(){
  const out=[]; let errors=[];
  const check=(n,ok,d)=>{if(!ok)errors.push(n+(d?" · "+d:""));out.push((ok?"[OK] ":"[FAIL] ")+n+(d?" · "+d:""));};
  Game.testMode=true; Game.testMenu="map";

  // 1) 火力 5 级
  let w = new World(Game, 0, 0, false, null);
  const p = w.players[0];
  for(let i=0;i<5;i++) p.levelUp();
  check("火力升到5级", p.level===5 && p.power===5, "level="+p.level+" power="+p.power);
  check("火力5子弹更快", p.bulletSpeed===8, "speed="+p.bulletSpeed);

  // 2) 护甲 5 层
  p.armor = 5; p.shield = 0; p.spawnT = 0;
  const eb = new Bullet(w, {isPlayer:false, dir:2}, 2, 4, 1);
  const r = p.takeHit(eb);
  check("护甲挡一击", r==="armored" && p.armor===4, "r="+r+" armor="+p.armor);

  // 3) 双炮：吃双炮 → twin++，双发齐射
  p.twin = 0; p.fireCool = 0; p.bulletsOut = 0; p.dir = 0;
  const puTwin = new PowerUp(w, "twin", 0, 0);
  w.applyPowerUp(puTwin, p);
  check("吃双炮 twin=1", p.twin===1, "twin="+p.twin);
  const nb0 = w.bullets.length;
  p.tryFire();
  const fired = w.bullets.length - nb0;
  check("双炮一次双发", fired===2, "fired="+fired);
  check("双炮1级弹道倍率1", w.bullets[w.bullets.length-1].dmgMul===1, "dmgMul="+w.bullets[w.bullets.length-1].dmgMul);

  // 4) 老鹰火力：满级玩家吃星星 → 老鹰开火（自动瞄准射程内敌人）
  const w2 = new World(Game, 0, 0, false, null);
  const p2 = w2.players[0];
  p2.level = 5; p2.applyLevel();
  w2.applyPowerUp(new PowerUp(w2, "star", 0, 0), p2);
  check("满级吃星星→老鹰火力1", w2.field.eaglePower===1, "eaglePower="+w2.field.eaglePower);
  // 在基地正上方清出通路，放置一个射程内的敌人
  w2.field.clearRect(12, 18, 2, 6);
  const e2 = new Enemy(w2, 0, 0, false, SPAWN_CELLS[0]);
  e2.x = 12*G; e2.y = 18*G; e2.spawnT = 0; e2.dead = false;
  w2.enemies = [e2];
  const nb1 = w2.bullets.length;
  w2.updateBaseDefense(1);
  check("老鹰自动瞄准射程内敌人开火", w2.bullets.length===nb1+1 && w2.baseAimDir===0, "bullets="+(w2.bullets.length-nb1)+" aim="+w2.baseAimDir);
  // 无目标时待机不开火
  w2.enemies = []; w2.baseFireCool = 0;
  const nb2 = w2.bullets.length;
  w2.updateBaseDefense(1);
  check("无目标时老鹰待机", w2.bullets.length===nb2, "bullets="+(w2.bullets.length-nb2));
  // 斜方向敌人：不要求弹道精确穿过，只要有通路即开火（在射程内）
  const w2b = new World(Game, 0, 0, false, null);
  w2b.field.eaglePower = 3;
  w2b.field.clearRect(12, 18, 2, 6);
  const e2b = new Enemy(w2b, 0, 0, false, SPAWN_CELLS[0]);
  e2b.x = 16*G; e2b.y = 20*G; e2b.spawnT = 0; e2b.dead = false;   // 右上方斜线敌人
  w2b.enemies = [e2b];
  const nb3 = w2b.bullets.length;
  w2b.updateBaseDefense(1);
  check("斜方向敌人也会被攻击", w2b.bullets.length===nb3+1, "bullets="+(w2b.bullets.length-nb3));

  // 5) 老鹰围墙护甲：满甲玩家吃护甲 → 围墙+1，攻击被抵消
  const w3 = new World(Game, 0, 0, false, null);
  const p3 = w3.players[0];
  p3.armor = 5;
  w3.applyPowerUp(new PowerUp(w3, "armor", 0, 0), p3);
  check("满甲吃护甲→老鹰围墙+1", w3.field.baseArmor===1, "baseArmor="+w3.field.baseArmor);
  // 攻击基地被护甲抵消
  const r3 = w3.field.damageAt(BASE_GX*2, BASE_GY*2, 0, 1);
  check("基地护甲抵消攻击", r3.kind==="baseArmor" && w3.field.baseArmor===0 && w3.field.baseAlive, "kind="+r3.kind+" armor="+w3.field.baseArmor);

  // 6) 静电磁场：范围、倍率、血量压制
  const w4 = new World(Game, 0, 0, false, null);
  w4.players[0].x = (BASE_GX+1)*G; w4.players[0].y = (BASE_GY-1)*G; w4.players[0].spawnT = 0;
  w4.applyPowerUp(new PowerUp(w4, "field", 0, 0), w4.players[0]);
  check("吃磁场 fieldLevel=1", w4.fieldLevel===1 && w4.fieldDebuff===0.1 && w4.fieldRadius===3, "lv="+w4.fieldLevel);
  // 靠近基地的敌人被压制
  const e4 = new Enemy(w4, 0, 0, false, SPAWN_CELLS[0]);
  e4.x = (BASE_GX+1)*G; e4.y = (BASE_GY+1)*G; e4.maxHp = 10; e4.hp = 10;
  w4.enemies = [e4];
  w4.update(1/60, [{up:0,dn:0,lf:0,rt:0,fire:0,firePressed:0}]);
  check("磁场压制敌军血量-10%", e4.maxHp===9, "maxHp="+e4.maxHp);
  check("磁场倍率0.9", Math.abs(w4.fieldMul((BASE_GX+1)*G,(BASE_GY+1)*G)-0.9)<1e-6, "mul="+w4.fieldMul((BASE_GX+1)*G,(BASE_GY+1)*G));

  // 7) 掉落替换：星星/护甲全满后不再掉落星星/护甲
  const w5 = new World(Game, 0, 0, false, null);
  w5.players[0].level = 5; w5.players[0].armor = 5;
  w5.field.eaglePower = 5; w5.field.baseArmor = 5;
  let types = [];
  for(let i=0;i<20;i++){
    w5.powerups = [];
    w5.dropPowerUp();
    if(w5.powerups[0]) types.push(w5.powerups[0].type);
  }
  check("全满后不再掉星星", !types.includes("star"), "types="+types.join(","));
  check("全满后不再掉护甲", !types.includes("armor"), "types="+types.join(","));
  check("全满后会掉双炮", types.includes("twin"), "types="+types.join(","));
  check("全满后会掉电磁场", types.includes("field"), "types="+types.join(","));

  // 8) 死亡掉级后星星重新可掉
  const w6 = new World(Game, 0, 0, false, null);
  w6.players[0].level = 5; w6.players[0].applyLevel();
  w6.field.eaglePower = 5;
  w6.players[0].levelDown();                       // 死亡掉一级 → 4
  let types2 = [];
  for(let i=0;i<20;i++){
    w6.powerups = [];
    w6.dropPowerUp();
    if(w6.powerups[0]) types2.push(w6.powerups[0].type);
  }
  check("掉级后星星重新掉落", types2.includes("star"), "types="+types2.join(","));

  // 9) 满配场景 30 秒：老鹰满火力/满护甲/满磁场 + 玩家满配
  try{
    const w7 = new World(Game, 11, 4, false, null);   // 最终防线 + 高周目
    const p7 = w7.players[0];
    p7.level = 5; p7.armor = 5; p7.twin = 3; p7.applyLevel();
    w7.field.eaglePower = 5; w7.field.baseArmor = 5; w7.fieldLevel = 5;
    const ZERO = {up:0,dn:0,lf:0,rt:0,fire:0,firePressed:0};
    let baseDead = false;
    for(let f=0; f<1800; f++){
      w7.update(1/60, [ZERO]);
      if(!w7.field.baseAlive) baseDead = true;
    }
    check("满配场景30秒运行无异常", true, "baseDead="+baseDead+" bullets="+w7.bullets.length);
  }catch(e){ check("满配场景30秒运行无异常", false, e.message); }

  // 10) 老鹰炮弹穿透自家围墙（越过围墙区；之后被地图墙挡住属正常）
  const w9 = new World(Game, 0, 0, false, null);
  w9.field.eaglePower = 3;
  const b = new Bullet(w9, w9.baseOwner, 0, 5, 3);
  let minY = 400;
  for(let i=0;i<12;i++){ b.update(1/60); minY = Math.min(minY, b.y); if(b.dead) break; }
  check("老鹰炮弹穿透自家围墙", minY < BASE_GY*G - 16, "minY="+minY);

  // 11) 鹰火/鹰甲跨关继承
  const wA = new World(Game, 0, 0, false, null);
  wA.field.eaglePower = 3; wA.field.baseArmor = 2;
  const carryA = { base:{ eaglePower:wA.field.eaglePower, baseArmor:wA.field.baseArmor }, players:[{level:3,armor:4,twin:2}] };
  const wB = new World(Game, 1, 0, false, carryA);
  check("鹰火跨关继承", wB.field.eaglePower===3, "eaglePower="+wB.field.eaglePower);
  check("鹰甲跨关继承", wB.field.baseArmor===2, "baseArmor="+wB.field.baseArmor);
  check("玩家继承(level/armor/twin)", wB.players[0].level===3 && wB.players[0].armor===4 && wB.players[0].twin===2, "l="+wB.players[0].level+" a="+wB.players[0].armor+" t="+wB.players[0].twin);

  // 12) 真实场景：敌人正常生成逼近时，老鹰会开火
  try{
    srand(20260815);
    const wS = new World(Game, 4, 2, false, null);   // 冰原 · 第3周目
    wS.field.eaglePower = 4;
    wS.aggression.spawnGap = 1.05; wS.aggression.maxActive = 6;
    const Z = {up:0,dn:0,lf:0,rt:0,fire:0,firePressed:0};
    let sawBaseBullet = false;
    for(let f=0; f<720; f++){                         // 12 秒
      wS.update(1/60, [Z]);
      if(wS.bullets.some(b=>b.fromBase)) sawBaseBullet = true;
    }
    check("真实场景老鹰会开火", sawBaseBullet, "fired="+sawBaseBullet);
  }catch(e){ check("真实场景老鹰会开火", false, e.message); }

  // 13) 双炮保持原有射击节奏，并能继续参与敌我炮弹对消
  const wTwin = new World(Game, 0, 0, false, null);
  const pTwin = wTwin.players[0];
  pTwin.twin = 1; pTwin.fireCool = 0; pTwin.bulletsOut = 0; pTwin.dir = 0;
  const firstTwin = pTwin.tryFire();
  pTwin.onBulletGone();              // 一枚双炮弹已命中/被对消，另一枚仍在飞
  pTwin.fireCool = 0;
  const secondTwin = pTwin.tryFire();
  check("双炮一枚弹道结束后仍可保持射击节奏", firstTwin && secondTwin, "first="+firstTwin+" second="+secondTwin+" out="+pTwin.bulletsOut);
  const wDuel = new World(Game, 0, 0, false, null);
  const pDuel = wDuel.players[0];
  pDuel.twin = 1; pDuel.fireCool = 0; pDuel.bulletsOut = 0; pDuel.dir = 0;
  pDuel.tryFire();
  for(const b of wDuel.bullets) b.x = 100; // 与两枚敌弹放在同一点，验证双炮仍能对炮
  const enemyOwner = {isPlayer:false, onBulletGone(){}};
  for(let i=0;i<2;i++){
    const eb = new Bullet(wDuel, enemyOwner, 2, 0, 1);
    eb.x = 100; eb.y = wDuel.bullets[i].y;
    wDuel.bullets.push(eb);
  }
  wDuel.handleBullets();
  check("双炮仍可与敌方炮弹对消", wDuel.bullets.length===0, "remaining="+wDuel.bullets.length);

  // 14) 静电磁场跨关、跨周目继承
  const carryField = {base:{eaglePower:4,baseArmor:3,fieldLevel:4}, players:[{level:4,armor:3,twin:2,lives:3,score:0,kills:[0,0,0,0,0],gone:false}]};
  const wCarryField = new World(Game, 0, 0, false, carryField);
  check("静电磁场跨关继承", wCarryField.fieldLevel===4, "fieldLevel="+wCarryField.fieldLevel);
  const wCarryLoop = new World(Game, 0, 1, false, carryField);
  check("静电磁场跨周目继承", wCarryLoop.fieldLevel===4, "fieldLevel="+wCarryLoop.fieldLevel);
  // 15) 双炮三档成长曲线：三级炮基准 + 每档在途弹道/射速 +2/加快
  const wTwinCurve = new World(Game, 0, 0, false, null);
  const pTwinCurve = wTwinCurve.players[0];
  pTwinCurve.level = 0; pTwinCurve.twin = 1; pTwinCurve.applyLevel();
  check("双炮基础弹速等同三级炮", pTwinCurve.bulletSpeed===6.5, "speed="+pTwinCurve.bulletSpeed);
  const twinCaps = [];
  const twinDelays = [];
  for(let lv=1;lv<=3;lv++){
    pTwinCurve.twin = lv; pTwinCurve.fireCool = 0; pTwinCurve.bulletsOut = 0;
    pTwinCurve.tryFire(); twinCaps.push(pTwinCurve.twinBulletCap); twinDelays.push(pTwinCurve.fireCool);
  }
  check("双炮在途弹道按4/6/8增长", JSON.stringify(twinCaps)==="[4,6,8]", "caps="+JSON.stringify(twinCaps));
  check("双炮每档射速递增且三级封顶", twinDelays[0]>twinDelays[1] && twinDelays[1]>twinDelays[2] && twinDelays[2]>=0.04, "delays="+JSON.stringify(twinDelays));

  // 16) 静电磁场必须实际压制场内敌军，并标记敌军处于受压制状态
  const wFieldEffect = new World(Game, 0, 0, false, null);
  wFieldEffect.fieldLevel = 5;
  const eField = new Enemy(wFieldEffect, 0, 0, false, SPAWN_CELLS[0]);
  eField.x = (BASE_GX+1)*G; eField.y = (BASE_GY-4)*G; eField.spawnT = 0; eField.maxHp = 10; eField.hp = 10;
  wFieldEffect.enemies = [eField];
  const baseEnemySpeed = eField.baseSpeed;
  wFieldEffect.update(1/60, [{up:0,dn:0,lf:0,rt:0,fire:0,firePressed:0}]);
  check("静电磁场实际压制敌军速度", eField.fieldMul===0.5 && eField.speed < baseEnemySpeed, "mul="+eField.fieldMul+" speed="+eField.speed);
  check("静电磁场实际压制敌军血量", eField.maxHp===5 && eField.hp===5, "hp="+eField.hp+" max="+eField.maxHp);
  check("静电磁场敌军状态可视化标记", eField.fieldT>0, "fieldT="+eField.fieldT);

  // 17) 老鹰围墙护甲：连续两次命中基地区域时，两层都应拦截且基地不死亡
  const wBaseArmor = new World(Game, 0, 0, false, null);
  wBaseArmor.field.baseArmor = 2;
  wBaseArmor.field.clearRect(BASE_GX, BASE_GY-5, 2, 4); // 清出直达上侧护墙的通道
  const baseTarget = {isPlayer:false, x:BASE_GX*G, y:(BASE_GY-5)*G, onBulletGone(){}};
  for(let i=0;i<2;i++){
    const eb = new Bullet(wBaseArmor, baseTarget, 2, 6, 1);
    eb.x = (BASE_GX+1)*G; eb.y = (BASE_GY-5)*G;
    wBaseArmor.bullets.push(eb);
    for(let f=0;f<80 && !eb.dead;f++) eb.update(1/60);
    wBaseArmor.handleBullets();
  }
  check("老鹰围墙护甲连续拦截基地攻击", wBaseArmor.field.baseArmor===0 && wBaseArmor.field.baseAlive, "armor="+wBaseArmor.field.baseArmor+" alive="+wBaseArmor.field.baseAlive);


  // 18) 静电磁场以我军坦克为中心，且双人模式分别计算两辆坦克
  const wMovingField = new World(Game, 0, 0, false, null);
  const pMovingField = wMovingField.players[0];
  pMovingField.x = 4*G; pMovingField.y = 4*G; pMovingField.spawnT = 0; pMovingField.dead = false; pMovingField.gone = false;
  wMovingField.fieldLevel = 2;
  check("静电磁场跟随单人坦克", wMovingField.inField(pMovingField.cx+2*G, pMovingField.cy), "center="+pMovingField.cx+","+pMovingField.cy);
  check("单人坦克移动后磁场中心同步", !wMovingField.inField((BASE_GX+1)*G,(BASE_GY+1)*G), "baseInField="+wMovingField.inField((BASE_GX+1)*G,(BASE_GY+1)*G));
  const wMovingField2 = new World(Game, 0, 0, true, null);
  const p1m = wMovingField2.players[0], p2m = wMovingField2.players[1];
  p1m.x = 2*G; p1m.y = 2*G; p1m.spawnT = 0; p1m.dead = false; p1m.gone = false;
  p2m.x = 20*G; p2m.y = 10*G; p2m.spawnT = 0; p2m.dead = false; p2m.gone = false;
  wMovingField2.fieldLevel = 2;
  const p2TargetX = p2m.cx + 2*G, p2TargetY = p2m.cy;
  check("双人磁场跟随任意一辆我军坦克", wMovingField2.inField(p2TargetX,p2TargetY), "p2Field="+wMovingField2.inField(p2TargetX,p2TargetY));
  p2m.dead = true;
  check("坦克阵亡后对应磁场失效", !wMovingField2.inField(p2TargetX,p2TargetY), "afterDeath="+wMovingField2.inField(p2TargetX,p2TargetY));


  // 19) 连续运动中的敌我炮弹即使在帧间交叉，也必须能够对消
  const wSweep = new World(Game, 0, 0, false, null);
  const playerOwner = {isPlayer:true, index:0, onBulletGone(){}};
  const enemyOwner2 = {isPlayer:false, onBulletGone(){}};
  const sweepA = new Bullet(wSweep, playerOwner, 0, 8, 1);
  const sweepB = new Bullet(wSweep, enemyOwner2, 2, 8, 1);
  sweepA.prevX=100; sweepA.prevY=100; sweepA.x=100; sweepA.y=92;
  sweepB.prevX=100; sweepB.prevY=92;  sweepB.x=100; sweepB.y=100;
  wSweep.bullets=[sweepA,sweepB]; wSweep.handleBullets();
  check("帧间交叉的敌我炮弹可以对消", wSweep.bullets.length===0, "remaining="+wSweep.bullets.length);

  // 20) 我方炮弹撞到基地防区时只被拦截，不能摧毁老鹰或护墙
  const wFriendly = new World(Game, 0, 0, false, null);
  wFriendly.field.clearRect(BASE_GX, BASE_GY-5, 2, 4);
  const friendlyPlayer = wFriendly.players[0]; friendlyPlayer.spawnT=0;
  const friendlyBullet = new Bullet(wFriendly, friendlyPlayer, 2, 6, 1);
  friendlyBullet.x=(BASE_GX+1)*G; friendlyBullet.y=(BASE_GY-5)*G;
  for(let f=0;f<80 && !friendlyBullet.dead;f++) friendlyBullet.update(1/60);
  check("我方炮弹不会摧毁老鹰", wFriendly.field.baseAlive, "baseAlive="+wFriendly.field.baseAlive);
  check("我方炮弹不会摧毁老鹰围墙", wFriendly.field.mask[(BASE_GY-1)*GN+BASE_GX]===15, "mask="+wFriendly.field.mask[(BASE_GY-1)*GN+BASE_GX]);

  console.log(out.join("\\n"));
  console.log(errors.length?"\\nPOWER_ERRORS:\\n"+errors.join("\\n"):"\\nPOWER_OK");
  process.exit(errors.length?1:0);
})();
`;
try{ eval(gameJs+harness); } catch(e){ console.error("FATAL:", e.message); console.error(e.stack); process.exit(1); }
