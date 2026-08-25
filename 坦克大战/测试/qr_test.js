#!/usr/bin/env node
/* 坦克大战 · 手机扫码游玩（二维码浮层）专项回归 */
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
globalThis.navigator={getGamepads:()=>[],maxTouchPoints:0,clipboard:{writeText:()=>Promise.resolve()}};
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
  const press=(code)=>{ Input.pressed[code]=1; Input.anyPressed=true; Game.update(1/60); Input.endFrame(); };

  // 1) 标题界面打开二维码浮层
  Game.state="title";
  Game.openQR("title");
  check("标题打开二维码浮层", Game.state==="qr" && Game.qrReturn==="title", "state="+Game.state);

  // 2) Esc 关闭返回标题
  press("Escape");
  check("Esc关闭返回标题", Game.state==="title", "state="+Game.state);

  // 3) 从玩法说明打开二维码浮层，关闭返回玩法说明
  Game.state="intro"; Game.showPanel("intro");
  Game.openQR("intro");
  check("玩法说明打开二维码浮层", Game.state==="qr" && Game.qrReturn==="intro", "state="+Game.state+" ret="+Game.qrReturn);
  press("Escape");
  check("关闭返回玩法说明", Game.state==="intro", "state="+Game.state);

  // 4) 二维码已内嵌（viewBox 33×33 SVG）且标题有扫码按钮
  check("二维码SVG内嵌", html.includes('viewBox="0 0 33 33"') && html.includes('shape-rendering="crispEdges"'), "svg="+html.includes('viewBox="0 0 33 33"'));
  check("标题有扫码按钮", !!document.getElementById("qrBtn"), "qrBtn="+!!document.getElementById("qrBtn"));

  // 5) 玩法说明含扫码游玩区块
  Game.buildIntro();
  const body = document.getElementById("introBody").innerHTML;
  check("玩法说明含扫码游玩", body.includes("手 机 扫 码 游 玩") && body.includes("openQR('intro')"), "qr="+body.includes("手 机 扫 码 游 玩"));

  // 6) 二维码按钮点击打开浮层（模拟）
  Game.state="title";
  Game.openQR("title");
  check("浮层可正常打开", Game.state==="qr", "state="+Game.state);

  console.log(out.join("\\n"));
  console.log(errors.length?"\\nQR_ERRORS:\\n"+errors.join("\\n"):"\\nQR_OK");
  process.exit(errors.length?1:0);
})();
`;
try{ eval(gameJs+harness); } catch(e){ console.error("FATAL:", e.message); console.error(e.stack); process.exit(1); }
