#!/usr/bin/env node
/* 验证 HUD 关卡特性说明的实际渲染位置 */
const fs = require("fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const gameJs = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// 记录 fillText 的 ctx
function makeCtx(){
  const grad = { addColorStop(){} };
  const calls = [];
  const target = { canvas:{width:0,height:0}, measureText:(s)=>({width:String(s).length*6}),
    createLinearGradient:()=>grad, createRadialGradient:()=>grad, createPattern:()=>({}),
    getImageData:()=>({data:new Uint8ClampedArray(4)}) };
  const proxy = new Proxy(target,{ get(t,k){
    if(k in t) return t[k];
    if(k==="fillText") return (s, X, Y)=>{ calls.push({s:String(s), x:X, y:Y}); };
    if(k==="fillRect"||k==="strokeRect") return (X,Y,W,H)=>{ calls.push({s:"__rect__", x:X, y:Y, w:W, h:H}); };
    if(typeof k==="string"&&["fillStyle","strokeStyle","font","globalAlpha","globalCompositeOperation","lineWidth","textBaseline","shadowColor","shadowBlur","lineCap","lineJoin","imageSmoothingEnabled"].includes(k)) return undefined;
    return (...a)=>undefined; }, set(t,k,v){ t[k]=v; return true; } });
  return { proxy, calls };
}

function makeEl(id){
  const el = { id, style:{}, classList:{add(){},remove(){},toggle(){},contains:()=>false},
    addEventListener(){}, removeEventListener(){}, appendChild(){}, removeChild(){}, innerHTML:"", textContent:"", value:"",
    width:0,height:0, offsetWidth:100,offsetHeight:50, getContext:()=>makeCtx().proxy,
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
  Game.testMode = true;   // 让 World 可用全部地图
  const P = {up:0,dn:0,lf:0,rt:0,fire:0,firePressed:0};
  const out=[];
  // 战役 6 关 + 测试用的两张特色关
  const ids = CAMPAIGN_STAGE_IDS.concat([13, 12]);
  for(const mi of ids){
    const w = new World(Game, mi, 0, false, null);
    const {proxy, calls} = makeCtxForHUD();
    renderField(proxy, w);
    renderHUD(proxy, w);
    const fx = calls.filter(c=>String(c.s).includes("特 性") || String(c.s).includes("特性"));
    const desc = calls.filter(c=>c.s && c.s.length>8 && !c.s.startsWith("__") && String(c.s).includes(w.fxName.split("：")[0]));
    const yOf = fx.map(c=>c.y);
    out.push("map " + mi + " " + STAGES[mi].en + " | fxName=" + w.fxName + " | 特性标题y=" + JSON.stringify(yOf) + " | 描述文字命中=" + (desc.length>0));
  }
  console.log(out.join("\\n"));
})();
function makeCtxForHUD(){
  const grad={addColorStop(){}};
  const calls=[];
  const target={canvas:{width:0,height:0},measureText:s=>({width:String(s).length*6}),
    createLinearGradient:()=>grad,createRadialGradient:()=>grad,createPattern:()=>({}),getImageData:()=>({data:new Uint8ClampedArray(4)})};
  const proxy=new Proxy(target,{get(t,k){
    if(k in t) return t[k];
    if(k==="fillText") return (s,X,Y)=>{calls.push({s:String(s),x:X,y:Y});};
    if(k==="fillRect"||k==="strokeRect"||k==="rr") return (X,Y,W,H)=>{calls.push({s:"__r__",x:X,y:Y,w:W,h:H});};
    if(typeof k==="string"&&["fillStyle","strokeStyle","font","globalAlpha","globalCompositeOperation","lineWidth","textBaseline","shadowColor","shadowBlur","lineCap","lineJoin","imageSmoothingEnabled"].includes(k)) return undefined;
    return (...a)=>undefined;},set(t,k,v){t[k]=v;return true;}});
  return {proxy,calls};
}
`;
try{ eval(gameJs + harness); } catch(e){ console.error("FATAL:", e.message); console.error(e.stack); process.exit(1); }
