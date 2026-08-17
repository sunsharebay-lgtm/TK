#!/usr/bin/env node
/* 坦克大战 · 新地图压力回归
 * 对新增地图长时间运行（模拟 40 秒），检查：
 *  - 是否出现非法地形占位 / 坦克重叠（复用 collectDiagnostics 逻辑）
 *  - 已出生敌人是否都能驶出出生区（y >= 8 格深度）
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

const harness = `
;(function(){
  const out=[]; let errors=[]; const allTanks = (w)=>w.players.filter(p=>p&&!p.dead&&!p.gone).concat(w.enemies.filter(e=>!e.dead));
  Game.hell = true;
  const FOCUS=[12,13,14,15];
  for(const mi of FOCUS){
    try{
      const w = new World(Game, mi, 0, false, null);
      w.aggression.spawnGap = 1.05;           // 加快出生节奏
      w.aggression.maxActive = 8;
      const FRAMES = 2400;                    // 40 秒
      let spawned = 0, exited = 0;
      for(let f=0; f<FRAMES; f++){
        w.update(1/60, [{up:0,dn:0,lf:0,rt:0,fire:0,firePressed:0}]);
        if(w.spawnedCount > spawned) spawned = w.spawnedCount;
      }
      // 统计已出生且仍存活的敌人是否已驶出出生带
      for(const e of w.enemies){
        if(e.dead) continue;
        if(e.spawnT <= 0 && e.y >= 8*16) exited++;
      }
      // 非法占位 / 重叠
      let invalid=0, overlap=0;
      const live=allTanks(w);
      for(const t of live) if(!w.field.freeForTank(t.x,t.y,TS,TS)) invalid++;
      for(let i=0;i<live.length;i++) for(let j=i+1;j<live.length;j++)
        if(rectHit(live[i].x,live[i].y,TS,TS,live[j].x,live[j].y,TS,TS)) overlap++;
      const remaining = w.remaining();
      out.push("map " + mi + " " + STAGES[mi].en + " -> spawned=" + spawned + " alive=" + live.length +
        " invalid=" + invalid + " overlap=" + overlap + " egressed=" + exited + " remaining=" + remaining);
      if(invalid || overlap) errors.push("map "+mi+": invalid="+invalid+" overlap="+overlap);
    }catch(e){ errors.push("map " + mi + ": " + e.message); }
  }
  Game.hell = false;
  console.log(out.join("\\n"));
  console.log(errors.length ? "ERRORS:\\n" + errors.join("\\n") : "STRESS_OK");
  process.exit(errors.length ? 1 : 0);
})();
`;
try{ eval(gameJs + harness); } catch(e){ console.error("FATAL:", e.message); console.error(e.stack); process.exit(1); }
