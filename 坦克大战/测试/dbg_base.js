#!/usr/bin/env node
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
  const wS = new World(Game, 4, 2, false, null);
  wS.field.eaglePower = 4;
  wS.aggression.spawnGap = 1.05; wS.aggression.maxActive = 6;
  const Z = {up:0,dn:0,lf:0,rt:0,fire:0,firePressed:0};
  const bx = wS.baseOwner.x + TS/2, by = wS.baseOwner.y + TS/2;
  const range = (4 + 4*2) * G;
  for(let f=0; f<360; f++){
    wS.update(1/60, [Z]);
    if(f % 60 === 0){
      const alive = wS.enemies.filter(e=>!e.dead && e.spawnT<=0);
      const inRange = alive.filter(e=>Math.abs(e.cx-bx)+Math.abs(e.cy-by) <= range);
      const clear = inRange.filter(e=>{
        const dir = wS.aimDirTo(bx, by, e.cx, e.cy);
        return wS.baseClearShot(dir, e);
      });
      console.log("frame"+f+" baseAlive="+wS.field.baseAlive+" ep="+wS.field.eaglePower+" enemies="+alive.length+" inRange="+inRange.length+" clear="+clear.length+" bullets="+wS.bullets.length);
    }
    if(wS.bullets.some(b=>b.fromBase)) console.log("  -> 老鹰开火! frame="+f);
  }
  console.log("over="+wS.over+" cleared="+wS.cleared+" baseAlive="+wS.field.baseAlive);
})();
`;
try{ eval(gameJs+harness); } catch(e){ console.error("FATAL:", e.message); console.error(e.stack); process.exit(1); }
