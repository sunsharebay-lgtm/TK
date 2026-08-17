#!/usr/bin/env node
/* 诊断沙漠地图重叠的具体时刻与对象 */
const fs = require("fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const gameJs = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeCtx(){
  const grad={addColorStop(){}};
  const target={canvas:{width:0,height:0},measureText:s=>({width:String(s).length*6}),
    createLinearGradient:()=>grad,createRadialGradient:()=>grad,createPattern:()=>({}),getImageData:()=>({data:new Uint8ClampedArray(4)})};
  return new Proxy(target,{get(t,k){if(k in t)return t[k];
    if(typeof k==="string"&&["fillStyle","strokeStyle","font","globalAlpha","globalCompositeOperation","lineWidth","textBaseline","shadowColor","shadowBlur","lineCap","lineJoin","imageSmoothingEnabled"].includes(k))return undefined;
    return (...a)=>undefined;},set(t,k,v){t[k]=v;return true;}});
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
  Game.testMode = true;
  const ZERO={up:0,dn:0,lf:0,rt:0,fire:0,firePressed:0};
  let hits=0;
  for(let trial=0; trial<20; trial++){
    const w = new World(Game, 15, 0, false, null);
    w.aggression.spawnGap=1.05; w.aggression.maxActive=8;
    let first=null, last=null;
    for(let f=0; f<2400; f++){
      w.update(1/60,[ZERO]);
      const live=w.players.filter(p=>p&&!p.dead&&!p.gone).concat(w.enemies.filter(e=>!e.dead));
      for(let i=0;i<live.length;i++) for(let j=i+1;j<live.length;j++){
        if(rectHit(live[i].x,live[i].y,TS,TS,live[j].x,live[j].y,TS,TS)){
          const tag=t=>t.isPlayer?("P"+t.index):("E"+t.trafficId);
          if(!first) first={f, a:tag(live[i]), b:tag(live[j]), ax:live[i].x, ay:live[i].y, bx:live[j].x, by:live[j].y, dirs:[live[i].dir,live[j].dir], egress:[live[i].egressT,live[j].egressT]};
          last={f, a:tag(live[i]), b:tag(live[j])};
        }
      }
    }
    if(first){
      hits++;
      console.log("trial "+trial+" first@frame"+first.f+" "+first.a+"("+first.ax+","+first.ay+",d"+first.dirs[0]+",e"+first.egress[0]+") x "+first.b+"("+first.bx+","+first.by+",d"+first.dirs[1]+",e"+first.egress[1]+") last@frame"+last.f);
    }
  }
  console.log("overlap trials: "+hits+"/20");
})();
`;
try{ eval(gameJs+harness); } catch(e){ console.error("FATAL:",e.message); console.error(e.stack); process.exit(1); }
