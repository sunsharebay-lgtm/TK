#!/usr/bin/env node
/* 坦克大战 · 新功能专项回归
 * 覆盖：彩蛋进入测试模式 / 选关 / 一键胜利 / 周目介绍停留 /
 *       沙地减速 / 熔岩灼烧 / 冰面增强 / 浴血耐久 / 测试模式不写存档
 */
const fs = require("fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const gameJs = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeCtx(){
  const grad = { addColorStop(){} };
  const target = { canvas:{width:0,height:0}, measureText:(s)=>({width:String(s).length*6}),
    createLinearGradient:()=>grad, createRadialGradient:()=>grad, createPattern:()=>({}),
    getImageData:()=>({data:new Uint8ClampedArray(4)}) };
  return new Proxy(target,{ get(t,k){ if(k in t) return t[k];
    if(typeof k==="string"&&["fillStyle","strokeStyle","font","globalAlpha","globalCompositeOperation","lineWidth","textBaseline","shadowColor","shadowBlur","lineCap","lineJoin","imageSmoothingEnabled"].includes(k)) return undefined;
    return (...a)=>undefined; }, set(t,k,v){ t[k]=v; return true; } });
}
function makeEl(id){
  const el = { id, style:{}, classList:{add(){},remove(){},toggle(){},contains:()=>false},
    addEventListener(){}, removeEventListener(){}, appendChild(){}, removeChild(){}, innerHTML:"", textContent:"", value:"",
    width:0,height:0, offsetWidth:100,offsetHeight:50, getContext:()=>makeCtx(),
    getBoundingClientRect:()=>({left:0,top:0,width:100,height:50,right:100,bottom:50}),
    setAttribute(){}, getAttribute:()=>null, querySelector:()=>makeEl("q"), querySelectorAll:()=>[], matches:()=>false,
    focus(){},select(){},click(){},append(){},remove(){},contains:()=>false };
  return el;
}
const els={};
globalThis.window=globalThis;
globalThis.document={ readyState:"complete", getElementById:id=>els[id]||(els[id]=makeEl(id)),
  createElement:t=>{const e=makeEl("_"+t); if(t==="canvas"){e.width=576;e.height=448;} return e;},
  createElementNS:()=>makeEl("svg"), documentElement:makeEl("html"), body:makeEl("body"), head:makeEl("head"),
  addEventListener(){}, removeEventListener(){}, querySelector:()=>makeEl("q"), querySelectorAll:()=>[] };
const _ls={};
globalThis.localStorage={ getItem:k=>_ls[k]!==undefined?_ls[k]:null, setItem:(k,v)=>{_ls[k]=String(v)}, removeItem:k=>{delete _ls[k]}, key:()=>null, length:0, clear(){} };
globalThis.navigator={ getGamepads:()=>[], maxTouchPoints:0 };
globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
globalThis.screen={orientation:undefined};
globalThis.location={hash:""};
globalThis.innerWidth=1200; globalThis.innerHeight=800; globalThis.devicePixelRatio=2;
globalThis.addEventListener=()=>{}; globalThis.removeEventListener=()=>{};
const rafQueue=[]; globalThis.requestAnimationFrame=cb=>{rafQueue.push(cb); return rafQueue.length;};

const ZERO = {up:0,dn:0,lf:0,rt:0,fire:0,firePressed:0};
const harness = `
;(function(){
  const out=[]; let errors=[];
  const check=(name, ok, detail)=>{ if(!ok) errors.push(name+(detail?" · "+detail:"")); out.push((ok?"[OK] ":"[FAIL] ")+name+(detail?" · "+detail:"")); };

  // 1) 彩蛋进入测试模式
  Game.state="title"; Game.testMode=false; Game._cheatBuf="";
  for(const ch of "cscscs".split("")){
    Input.pressed[ch==="c"?"KeyC":"KeyS"]=1; Input.anyPressed=true;
    Game.handleKeys();
    Input.endFrame();
  }
  check("cscscs 彩蛋进入测试模式", Game.testMode===true && Game.state==="test", "state="+Game.state);

  // 2) 测试模式不写存档
  Save.data.campaign = null;
  Game.startTestStage();
  check("测试模式不写战役存档", Save.data.campaign===null, "campaign="+JSON.stringify(Save.data.campaign));

  // 3) 沙地减速
  Game.testMode=true; Game.hell=false; Game.testMenu="map";   // 全图池，直接按地图下标取图
  let w = new World(Game, 15, 0, false, null);
  check("沙漠关卡 fxPlayerSpeed=0.82", Math.abs(w.fxPlayerSpeed-0.82)<1e-6, "speed="+w.fxPlayerSpeed);
  check("沙漠玩家速度应用", Math.abs(w.players[0].speed - PLAYER_SPEED*0.82)<1e-6, "player.speed="+w.players[0].speed);
  check("沙漠特性名", w.fxName==="沙地减速", w.fxName);

  // 4) 冰面增强
  w = new World(Game, 4, 0, false, null);
  check("冰原 fxIce=true", w.fxIce===true, "fxIce="+w.fxIce);
  check("冰原特性名", w.fxName==="极寒冰原", w.fxName);

  // 5) 浴血耐久（最终防线敌人 +1 hp）
  w = new World(Game, 11, 0, false, null);
  check("最终防线 fxHp=1", w.fxHp===1, "fxHp="+w.fxHp);
  // 生成一只普通敌人（type 0），hp 应为 d.hp(1)+fxHp(1)=2
  const e = new Enemy(w, 0, 0, false, SPAWN_CELLS[0]);
  check("浴血敌人 hp=2", e.hp===2, "hp="+e.hp);

  // 6) 熔岩灼烧
  w = new World(Game, 13, 0, false, null);
  w.enemies = []; w.queue = [];
  check("熔岩 fxLava=true", w.fxLava===true, "fxLava="+w.fxLava);
  const p = w.players[0];
  p.shield = 0; p.armor = 0; p.dead = false;
  // 找一个紧邻熔岩且可站立的空位
  let spot=null;
  for(let gy=2; gy<12 && !spot; gy++) for(let gx=2; gx<20 && !spot; gx++){
    const x=gx*G, y=gy*G;
    if(w.field.freeForTank(x,y,TS,TS) && w.field.nearWater(x,y,TS,TS)) spot={x,y};
  }
  check("熔岩附近找到站位", !!spot, spot?("x="+spot.x+" y="+spot.y):"无");
  p.x=spot.x; p.y=spot.y; p.dir=2; p.moving=false; p.spawnT=0;
  const livesBefore = p.lives;
  for(let i=0;i<340;i++) w.update(1/60, [ZERO]);   // ~5.7s
  check("贴近熔岩停留 5 秒受伤害", p.dead===true && p.lives===livesBefore-1, "dead="+p.dead+" lives="+p.lives+"->"+(livesBefore-1));

  // 7) 一键胜利
  Game.testMode=true; Game.hell=false; Game.loop=0; Game.stageIndex=13; Game.twoP=false;
  Game.carry=null;
  Game.beginStage();
  for(let i=0;i<120;i++) Game.update(1/60);       // 过场 → play
  check("进入战斗状态", Game.state==="play", "state="+Game.state);
  if(Game.state==="play"){
    Input.pressed["KeyV"]=1; Input.anyPressed=true;
    Game.handleKeys(); Input.endFrame();
    check("V 键一键胜利触发通关", Game.world.cleared===true, "cleared="+Game.world.cleared);
  }

  // 8) 周目介绍停留：进入二周目，至少 3 秒并等待按键
  Game.testMode=false; Game.hell=false; Game.loop=1; Game.stageIndex=0; Game.twoP=false;
  Game.carry=null; Game.beginStage();
  check("二周目开场 stageHold=true", Game.stageHold===true, "hold="+Game.stageHold+" cardT="+Game.stageCardT.toFixed(2));
  for(let i=0;i<60;i++) Game.update(1/60);        // 1 秒
  check("1 秒后仍未进入", Game.state==="stage" && Game.stageWait===false, "state="+Game.state+" wait="+Game.stageWait);
  for(let i=0;i<150;i++) Game.update(1/60);       // 累计 ~3.5s
  check("3 秒后进入等待", Game.stageWait===true && Game.state==="stage", "state="+Game.state+" wait="+Game.stageWait);
  Input.pressed["KeyJ"]=1; Input.anyPressed=true;
  Game.update(1/60);                        // 与真实主循环一致：update 内读取按键
  Input.endFrame();
  for(let i=0;i<40;i++) Game.update(1/60);  // 关窗 0.5s → play
  check("按键后进入战斗", Game.state==="play", "state="+Game.state);

  // 9) 熔岩地图渲染不抛错（renderField 已覆盖）+ 沙地渲染
  Game.testMode=true;
  for(const mi of [15,13]){
    const ww = new World(Game, mi, 0, false, null);
    renderField(ctx, ww); renderHUD(ctx, ww);
  }
  check("沙漠/熔岩渲染正常", true);

  console.log(out.join("\\n"));
  console.log(errors.length ? "\\nFEATURE_ERRORS:\\n"+errors.join("\\n") : "\\nFEATURE_OK");
  process.exit(errors.length ? 1 : 0);
})();
`;
try{ eval(gameJs + harness); } catch(e){ console.error("FATAL:", e.message); console.error(e.stack); process.exit(1); }
