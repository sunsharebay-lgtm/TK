#!/usr/bin/env node
/* 坦克大战 · 老鹰自卫瞄准回归 v2：验证能向上/左/右正确瞄准并开火 */
const fs = require("fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const gameJs = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeCtx(){const g={addColorStop(){}};const t={canvas:{width:0,height:0},measureText:s=>({width:String(s).length*6}),createLinearGradient:()=>g,createRadialGradient:()=>g,createPattern:()=>({}),getImageData:()=>({data:new Uint8ClampedArray(4)})};return new Proxy(t,{get(t,k){if(k in t)return t[k];if(typeof k==="string"&&["fillStyle","strokeStyle","font","globalAlpha","globalCompositeOperation","lineWidth","textBaseline","shadowColor","shadowBlur","lineCap","lineJoin","imageSmoothingEnabled"].includes(k))return undefined;return(...a)=>undefined;},set(t,k,v){t[k]=v;return true;}});}
function makeEl(id){const el={id,style:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},addEventListener(){},removeEventListener(){},appendChild(){},removeChild(){},innerHTML:"",textContent:"",value:"",width:0,height:0,offsetWidth:100,offsetHeight:50,getContext:()=>makeCtx(),getBoundingClientRect:()=>({left:0,top:0,width:100,height:50,right:100,bottom:50}),setAttribute(){},getAttribute:()=>null,querySelector:()=>makeEl("q"),querySelectorAll:()=>[],matches:()=>false,focus(){},select(){},click(){},append(){},remove(){},contains:()=>false};return el;}
const els={};
globalThis.window=globalThis;
globalThis.document={readyState:"complete",getElementById:id=>els[id]||(els[id]=makeEl(id)),createElement:t=>{const e=makeEl("_"+t);if(t==="canvas"){e.width=576;e.height=448;}return e;},createElementNS:()=>makeEl("svg"),documentElement:makeEl("html"),body:makeEl("body"),head:makeEl("head"),addEventListener(){},removeEventListener(){},querySelector:()=>makeEl("q"),querySelectorAll:()=>[]};
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
  const DIRN=["上","右","下","左"];
  function fireTest(poses){
    const w = new World(Game, 0, 0, false, null);
    w.field.eaglePower = 3;
    w.enemies = poses.map((p,idx)=>{
      const e = new Enemy(w, 0, 0, false, SPAWN_CELLS[0]);
      e.x = p[0]; e.y = p[1]; e.spawnT = 0; e.dead = false;
      return e;
    });
    const before = w.bullets.length;
    w.updateBaseDefense(1);
    const fired = w.bullets.length - before;
    return { aim: w.baseAimDir, fired, bdir: fired ? w.bullets[w.bullets.length-1].dir : null };
  }
  // 基地中心 (208,400)；ep3 射程 192
  let r = fireTest([[200,300]]);
  check("正上方敌人 → 朝上(0)", r.aim===0 && r.fired>0 && r.bdir===0, JSON.stringify(r));
  r = fireTest([[110,392]]);
  check("正左同排 → 朝左(3)", r.aim===3 && r.fired>0 && r.bdir===3, JSON.stringify(r));
  r = fireTest([[310,392]]);
  check("正右同排 → 朝右(1)", r.aim===1 && r.fired>0 && r.bdir===1, JSON.stringify(r));
  r = fireTest([[80,390]]);
  check("左下侧翼(车体覆盖基地横线) → 朝左(3)", r.aim===3 && r.fired>0 && r.bdir===3, JSON.stringify(r));
  r = fireTest([[320,390]]);
  check("右下侧翼 → 朝右(1)", r.aim===1 && r.fired>0 && r.bdir===1, JSON.stringify(r));
  r = fireTest([[110,300]]);
  check("斜上方敌人 → 朝其主方向(上)射击", r.fired>0, JSON.stringify(r));
  // 优先可命中：左下方侧翼(可命中) vs 更近的斜上方(不可命中) → 应打左侧
  r = fireTest([[80,390],[110,300]]);
  check("侧翼可命中优先于斜上方 → 朝左(3)", r.aim===3 && r.bdir===3, JSON.stringify(r));
  // 正上方(可命中) vs 左侧(可命中) → 选更近的
  r = fireTest([[200,300],[80,390]]);
  check("上方与左侧都可命中 → 选更近(上)", r.aim===0, JSON.stringify(r));
  console.log(out.join("\\n"));
  console.log(errors.length?"\\nEAGLE_ERRORS:\\n"+errors.join("\\n"):"\\nEAGLE_OK");
  process.exit(errors.length?1:0);
})();
`;
try{ eval(gameJs+harness); } catch(e){ console.error("FATAL:", e.message); console.error(e.stack); process.exit(1); }
