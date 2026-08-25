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
const pad={axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};
globalThis.navigator={getGamepads:()=>[pad],maxTouchPoints:0};
globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
globalThis.screen={orientation:undefined};
globalThis.location={hash:""};
globalThis.innerWidth=1200;globalThis.innerHeight=800;globalThis.devicePixelRatio=2;
globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};
const rafQueue=[];globalThis.requestAnimationFrame=cb=>{rafQueue.push(cb);return rafQueue.length;};
const harness=`
;(function(){
  console.log("navigator.getGamepads type:", typeof navigator.getGamepads);
  pad.buttons[13].pressed=true;
  console.log("button13 pressed:", pad.buttons[13].pressed);
  Input.pollGamepads();
  console.log("pads[0].gpDn=", Input.pads[0].gpDn, "gpDnPressed=", Input.pads[0].gpDnPressed);
  console.log("ui=", JSON.stringify(Input.ui));
  console.log("_prevGP[0]=", JSON.stringify(Input._prevGP[0]));
})();
`;
try{eval(gameJs+harness);}catch(e){console.error("FATAL",e.message);console.error(e.stack);process.exit(1);}
