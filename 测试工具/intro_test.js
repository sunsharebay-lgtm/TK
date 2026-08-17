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
  const out=[]; let errors=[];
  const check=(n,ok,d)=>{if(!ok)errors.push(n+(d?" · "+d:""));out.push((ok?"[OK] ":"[FAIL] ")+n+(d?" · "+d:""));};
  // 菜单共 6 项（玩法说明已合并操作说明）
  check("标题菜单 6 项", Game.menuItems().length===6, "count="+Game.menuItems().length);
  // 打开玩法说明
  Game.state="title"; Game.menuSel=4;
  Game.menuActivate();
  check("菜单第5项进入 intro", Game.state==="intro", "state="+Game.state);
  const body = document.getElementById("introBody").innerHTML;
  for(const kw of ["操 作 方 式","道 具 一 览","火 力 成 长","护 甲 成 长","双 炮 与 磁 场","战 役 结 构","周 目 成 长","地 狱 绝 境","隐 藏 福 袋","Token 自由","标准通关","手柄","老鹰"]){
    check("说明包含『"+kw+"』", body.includes(kw));
  }
  check("说明含关卡数 "+CAMPAIGN_STAGE_COUNT, body.includes(String(CAMPAIGN_STAGE_COUNT)));
  // 返回标题
  Input.pressed["Escape"]=1; Input.anyPressed=true;
  Game.update(1/60); Input.endFrame();
  check("intro 按 Esc 返回标题", Game.state==="title", "state="+Game.state);
  console.log(out.join("\\n"));
  console.log(errors.length? "\\nINTRO_ERRORS:\\n"+errors.join("\\n") : "\\nINTRO_OK");
  process.exit(errors.length?1:0);
})();
`;
try{eval(gameJs+harness);}catch(e){console.error("FATAL",e.message);console.error(e.stack);process.exit(1);}
