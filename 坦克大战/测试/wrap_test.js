#!/usr/bin/env node
/* 验证 HUD 关卡特性说明换行正确、文字不溢出框外 */
const fs = require("fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const gameJs = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeCtx(rec){
  const grad={addColorStop(){}};
  const target={canvas:{width:0,height:0},
    measureText:s=>{ let w=0; for(const ch of String(s)) w += ch.charCodeAt(0)>127?9:5; return {width:w}; },
    createLinearGradient:()=>grad,createRadialGradient:()=>grad,createPattern:()=>({}),getImageData:()=>({data:new Uint8ClampedArray(4)})};
  return new Proxy(target,{get(t,k){
    if(k in t) return t[k];
    if(k==="fillText") return (s,X,Y)=>{ rec.push({s:String(s),x:X,y:Y}); };
    if(k==="fillRect"||k==="strokeRect") return (X,Y,W,H)=>{ rec.push({s:"__r__",x:X,y:Y,w:W,h:H}); };
    if(typeof k==="string"&&["fillStyle","strokeStyle","font","globalAlpha","globalCompositeOperation","lineWidth","textBaseline","shadowColor","shadowBlur","lineCap","lineJoin","imageSmoothingEnabled"].includes(k)) return undefined;
    return (...a)=>undefined;},set(t,k,v){t[k]=v;return true;}});
}
function makeEl(id){
  const el={id,style:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},
    addEventListener(){},removeEventListener(){},appendChild(){},removeChild(){},innerHTML:"",textContent:"",value:"",
    width:0,height:0,offsetWidth:100,offsetHeight:50,getContext:()=>makeCtx([]),
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
  const out=[]; let errors=[];
  const check=(n,ok,d)=>{if(!ok)errors.push(n+(d?" · "+d:""));out.push((ok?"[OK] ":"[FAIL] ")+n+(d?" · "+d:""));};
  // 所有战役关 + 熔岩/废墟
  const ids=CAMPAIGN_STAGE_IDS.concat([13,12]);
  for(const mi of ids){
    const w=new World(Game,mi,0,false,null);
    const rec=[];
    const proxy=makeCtx(rec);
    renderField(proxy,w); renderHUD(proxy,w);
    const desc=w.fxName + "：";
    // 找出说明文字的绘制行：text 是整段说明的子串且不是标题
    const lines=rec.filter(c=>c.s && c.s!=="__r__" && desc.length>0 && c.s!="本 关 特 性" && !c.s.includes("特性") && c.y>300 && c.y<400);
    // 用宽度函数判断右缘是否超出 552（侧栏右缘）
    const width=s=>{let t=0;for(const ch of String(s))t+=ch.charCodeAt(0)>127?9:5;return t;};
    const overflow=lines.filter(c=>c.x+width(c.s)>552);
    const totalLen=lines.reduce((n,c)=>n+c.s.length,0);
    const descLen=String(w.fxName+String("：")+w.fxDesc).length;
    // 期望：被拆成多行（>=2），且没有一行右缘越界
    check("["+STAGES[mi].en+"] 说明换行", lines.length>=2 && totalLen>=descLen*0.9, "行数="+lines.length+" 总字数="+totalLen+"/"+descLen);
    check("["+STAGES[mi].en+"] 无溢出", overflow.length===0, overflow.length?JSON.stringify(overflow.map(o=>({t:o.s,x:o.x,r:o.x+width(o.s)}))):"");
  }
  console.log(out.join("\\n"));
  console.log(errors.length?"\\nWRAP_ERRORS:\\n"+errors.join("\\n"):"\\nWRAP_OK");
  process.exit(errors.length?1:0);
})();
`;
try{ eval(gameJs+harness); } catch(e){ console.error("FATAL:", e.message); console.error(e.stack); process.exit(1); }
