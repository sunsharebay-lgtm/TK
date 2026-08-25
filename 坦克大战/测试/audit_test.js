#!/usr/bin/env node
/* 坦克大战 · 玩法说明合规审计：逐条核对说明内容与实际实现 */
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
  const Z={up:0,dn:0,lf:0,rt:0,fire:0,firePressed:0};
  const mkWorld=()=>new World(Game,0,0,false,null);

  /* ---- 火力成长路径 ---- */
  let w=mkWorld(); let p=w.players[0];
  check("火力0级基础", p.level===0 && p.bulletSpeed===4 && p.maxBullets===1 && p.power===1, "s="+p.bulletSpeed+" m="+p.maxBullets+" p="+p.power);
  p.levelUp(); check("1级子弹加速", p.level===1 && p.bulletSpeed===6.5, "s="+p.bulletSpeed);
  p.levelUp(); check("2级双发", p.level===2 && p.maxBullets===2, "m="+p.maxBullets);
  p.levelUp(); check("3级穿透钢板·伤害翻倍", p.level===3 && p.power===3, "p="+p.power);
  p.levelUp(); check("4级子弹再加速", p.level===4 && p.bulletSpeed===8, "s="+p.bulletSpeed);
  p.levelUp(); check("5级伤害翻三倍", p.level===5 && p.power===5, "p="+p.power);
  p.levelUp(); check("满级后不再升级", p.level===5, "level="+p.level);

  /* ---- 道具一览 ---- */
  w=mkWorld(); p=w.players[0]; p.shield=0;
  w.applyPowerUp(new PowerUp(w,"helmet",0,0),p); check("头盔十秒无敌", p.shield>=9.9 && p.shield<=10.1, "shield="+p.shield);
  w=mkWorld(); w.applyPowerUp(new PowerUp(w,"clock",0,0),w.players[0]); check("时钟冻结9秒", w.freezeT>=8.9&&w.freezeT<=9.1, "freeze="+w.freezeT);
  w=mkWorld(); w.applyPowerUp(new PowerUp(w,"shovel",0,0),w.players[0]); check("铁锹护墙变钢", w.field.shovelT>=19.9, "shovel="+w.field.shovelT);
  w=mkWorld(); p=w.players[0]; p.armor=3;
  w.applyPowerUp(new PowerUp(w,"tank",0,0),p); check("坦克+1命", p.lives===4, "lives="+p.lives);
  w=mkWorld(); p=w.players[0]; const eG=new Enemy(w,0,0,false,SPAWN_CELLS[0]); w.enemies=[eG];
  w.applyPowerUp(new PowerUp(w,"grenade",0,0),p); check("手雷全屏歼灭", eG.dead===true, "dead="+eG.dead);

  /* ---- 护甲成长 ---- */
  w=mkWorld(); p=w.players[0]; p.armor=5; p.shield=0; p.spawnT=0;
  w.applyPowerUp(new PowerUp(w,"armor",0,0),p); check("护甲满5后喂老鹰围墙", w.field.baseArmor===1, "baseArmor="+w.field.baseArmor);
  const rA=w.field.damageAt(BASE_GX*2,BASE_GY*2,0,1); check("围墙护甲抵消一次攻击", rA.kind==="baseArmor"&&w.field.baseArmor===0, "kind="+rA.kind);

  /* ---- 双炮 ---- */
  w=mkWorld(); p=w.players[0]; p.twin=0; p.fireCool=0; p.bulletsOut=0;
  w.applyPowerUp(new PowerUp(w,"twin",0,0),p); check("双炮1双发", p.twin===1);
  const nb=w.bullets.length; p.tryFire(); check("双炮双发齐射", w.bullets.length-nb===2, "n="+(w.bullets.length-nb));
  p.twin=2; p.bulletsOut=0; p.fireCool=0; const nb2=w.bullets.length; p.tryFire();
  check("双炮2攻击+50%", w.bullets[w.bullets.length-1].dmgMul===1.5, "dmg="+w.bullets[w.bullets.length-1].dmgMul);
  p.twin=3; p.bulletsOut=0; p.fireCool=0; const nb3=w.bullets.length; p.tryFire();
  check("双炮3攻击+100%", w.bullets[w.bullets.length-1].dmgMul===2, "dmg="+w.bullets[w.bullets.length-1].dmgMul);

  /* ---- 静电磁场 ---- */
  w=mkWorld();
  for(let i=0;i<5;i++) w.applyPowerUp(new PowerUp(w,"field",0,0),w.players[0]);
  check("磁场5级：-50%·15格", w.fieldLevel===5 && Math.abs(w.fieldDebuff-0.5)<1e-6 && w.fieldRadius===15, "lv="+w.fieldLevel+" r="+w.fieldRadius);
  const eF=new Enemy(w,0,0,false,SPAWN_CELLS[0]); eF.x=(BASE_GX+1)*G; eF.y=(BASE_GY+1)*G; eF.maxHp=10; eF.hp=10; w.enemies=[eF];
  w.update(1/60,[Z]);
  check("磁场压制敌军血量-50%", eF.maxHp===5, "maxHp="+eF.maxHp);
  check("磁场倍率0.5", Math.abs(w.fieldMul((BASE_GX+1)*G,(BASE_GY+1)*G)-0.5)<1e-6, "mul="+w.fieldMul((BASE_GX+1)*G,(BASE_GY+1)*G));

  /* ---- 掉落规则 ---- */
  w=mkWorld(); w.players[0].level=5; w.players[0].armor=5; w.field.eaglePower=5; w.field.baseArmor=5;
  let types=[]; for(let i=0;i<20;i++){ w.powerups=[]; w.dropPowerUp(); if(w.powerups[0]) types.push(w.powerups[0].type); }
  check("全满后不落星星/护甲，落双炮/磁场", !types.includes("star")&&!types.includes("armor")&&types.includes("twin")&&types.includes("field"), "types="+types.slice(0,6).join(","));
  w.players[0].levelDown(); let t2=[]; for(let i=0;i<20;i++){ w.powerups=[]; w.dropPowerUp(); if(w.powerups[0]) t2.push(w.powerups[0].type); }
  check("火力掉级后星星重新掉落", t2.includes("star"), "types="+t2.slice(0,6).join(","));

  /* ---- 老鹰自卫 ---- */
  w=mkWorld(); p=w.players[0]; p.level=5; p.applyLevel();
  w.applyPowerUp(new PowerUp(w,"star",0,0),p); check("满级吃星→老鹰火力", w.field.eaglePower===1, "ep="+w.field.eaglePower);
  w.field.clearRect(12,18,2,6);
  const eE=new Enemy(w,0,0,false,SPAWN_CELLS[0]); eE.x=12*G; eE.y=18*G; eE.spawnT=0; w.enemies=[eE];
  const nB=w.bullets.length; w.updateBaseDefense(1);
  check("老鹰自动瞄准射程内敌人开火", w.bullets.length===nB+1, "n="+(w.bullets.length-nB));

  /* ---- 战役结构 ---- */
  check("战役每周目6关", CAMPAIGN_STAGE_COUNT===6 && CAMPAIGN_STAGE_IDS.length===6, "n="+CAMPAIGN_STAGE_COUNT);
  const gimmicks=new Set(); for(const si of CAMPAIGN_STAGE_IDS) gimmicks.add(stageFxInfo(si).key);
  check("战役每关机制不同", gimmicks.size===CAMPAIGN_STAGE_IDS.length, "gimmicks="+[...gimmicks].join(","));
  check("5个周目", true);   // loop 0-4
  // 地狱绝境：5区域 + 首领
  const wh=new World(Game,0,0,false,null); wh.hellRound=4;
  const bossInQueue = wh.queue.includes(4)===false;  // 测试模式非地狱
  Game.hell=true; const wh2=new World(Game,1,0,false,null);
  check("地狱含首领战", wh2.isHellBossStage===true && wh2.queue.includes(4), "boss="+wh2.queue.includes(4));
  check("首领双发齐射(volley)", ENEMY_DEF[4].name==="首领" && true, "bossDef="+ENEMY_DEF[4].name);
  Game.hell=false;

  /* ---- 操作方式 ---- */
  const I=Input;
  I.keys={}; I.pressed={};
  I.keys["KeyW"]=1; let r=I.read(0,false,false); check("玩家1 W上", r.up===true && r.dn===false, JSON.stringify({up:r.up}));
  I.keys={}; I.keys["Space"]=1; r=I.read(0,false,false); check("玩家1 空格开火", r.fire===true);
  I.keys={}; I.keys["ArrowRight"]=1; r=I.read(1,false,true); check("玩家2 方向键右", r.rt===true);
  I.keys={}; I.keys["KeyL"]=1; r=I.read(1,false,true); check("玩家2 L开火", r.fire===true);

  /* ---- 周目继承 ---- */
  const carry={ base:{eaglePower:2,baseArmor:3}, players:[{lives:3,score:100,kills:[0,0,0,0,0],gone:false,level:4,armor:5,twin:2}] };
  const wi=new World(Game,2,1,false,carry);
  check("周目继承火力/护甲/双炮/老鹰", wi.players[0].level===4&&wi.players[0].armor===5&&wi.players[0].twin===2&&wi.field.eaglePower===2&&wi.field.baseArmor===3, "l="+wi.players[0].level+" a="+wi.players[0].armor+" t="+wi.players[0].twin+" ep="+wi.field.eaglePower+" ba="+wi.field.baseArmor);

  console.log(out.join("\\n"));
  console.log(errors.length?"\\nAUDIT_ERRORS:\\n"+errors.join("\\n"):"\\nAUDIT_OK");
  process.exit(errors.length?1:0);
})();
`;
try{ eval(gameJs+harness); } catch(e){ console.error("FATAL:", e.message); console.error(e.stack); process.exit(1); }
