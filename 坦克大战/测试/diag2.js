const fs=require("fs");
const html=fs.readFileSync(process.argv[2],"utf8");
const gameJs=html.match(/<script>([\s\S]*?)<\/script>/)[1];
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
const harness=`
;(function(){
  Game.testMode=true;
  const ZERO={up:0,dn:0,lf:0,rt:0,fire:0,firePressed:0};
  for(let trial=0;trial<10;trial++){
    const w=new World(Game,15,0,false,null);
    w.aggression.spawnGap=1.05;w.aggression.maxActive=8;
    let deaths=0, overlaps=0, respawnBlocked=0;
    for(let f=0;f<2400;f++){
      const p=w.players[0];
      if(p.dead && p.deadTimer>0 && p.lives>0){ deaths++; }
      // 复活前检查出生点是否被占
      if(p.dead && p.deadTimer<=0 && !p.gone){
        const gx=8*16, gy=24*16;
        let occ=false;
        for(const e of w.enemies){ if(!e.dead && rectHit(gx,gy,TS,TS,e.x,e.y,TS,TS)) occ=true; }
        if(occ) respawnBlocked++;
      }
      w.update(1/60,[ZERO]);
      const live=w.players.filter(p=>p&&!p.dead&&!p.gone).concat(w.enemies.filter(e=>!e.dead));
      for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++)
        if(rectHit(live[i].x,live[i].y,TS,TS,live[j].x,live[j].y,TS,TS)) overlaps++;
    }
    console.log("trial "+trial+" deaths="+deaths+" respawnBlocked="+respawnBlocked+" overlapFrames="+overlaps);
  }
})();
`;
try{eval(gameJs+harness);}catch(e){console.error("FATAL",e.message);console.error(e.stack);process.exit(1);}
