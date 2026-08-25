#!/usr/bin/env node
/* 坦克大战 · 多设备布局 + 触控摆位回归 */
const fs = require("fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const gameJs = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeCtx(){
  const grad={addColorStop(){}};
  const target={canvas:{width:0,height:0},measureText:s=>({width:String(s).length*6}),
    createLinearGradient:()=>grad,createRadialGradient:()=>grad,createPattern:()=>({}),getImageData:()=>({data:new Uint8ClampedArray(4)})};
  return new Proxy(target,{get(t,k){if(k in t)return t[k];
    if(typeof k==="string"&&["fillStyle","strokeStyle","font","globalAlpha","globalCompositeOperation","lineWidth","textBaseline","shadowColor","shadowBlur","lineCap","lineJoin","imageSmoothingEnabled"].includes(k))return undefined;
    return(...a)=>undefined;},set(t,k,v){t[k]=v;return true;}});
}
function makeEl(id){
  const el={id,style:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},
    addEventListener(){},removeEventListener(){},appendChild(){},removeChild(){},innerHTML:"",textContent:"",value:"",
    width:0,height:0,offsetWidth:id==="tPad"?150:92,offsetHeight:id==="tPad"?150:44,getContext:()=>makeCtx(),
    setAttribute(){},getAttribute:()=>null,querySelector:()=>makeEl("q"),querySelectorAll:()=>[],matches:()=>false,
    focus(){},select(){},click(){},append(){},remove(){},contains:()=>false};
  el.getBoundingClientRect=()=>({left:0,top:0,width:el.offsetWidth,height:el.offsetHeight,right:el.offsetWidth,bottom:el.offsetHeight});
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
  const out=[]; let errors=[];
  const check=(n,ok,d)=>{if(!ok)errors.push(n+(d?" · "+d:""));out.push((ok?"[OK] ":"[FAIL] ")+n+(d?" · "+d:""));};

  // 让 documentElement.classList 真实记录
  const cls=new Set();
  document.documentElement.classList={
    add:c=>cls.add(c),remove:c=>cls.delete(c),
    toggle:(c,f)=>{ if(f===undefined){cls.has(c)?cls.delete(c):cls.add(c);} else f?cls.add(c):cls.delete(c); },
    contains:c=>cls.has(c)
  };
  const cabinet=()=>{const w=parseFloat(cv.style.width),h=parseFloat(cv.style.height);return {w:w+28,h:h+28};};

  // 1) 多设备机柜适配
  const devices=[
    {name:"桌面 1920×1080",w:1920,h:1080,t:false},
    {name:"桌面 1440×900",w:1440,h:900,t:false},
    {name:"笔记本 1280×800",w:1280,h:800,t:false},
    {name:"笔记本 1024×768",w:1024,h:768,t:false},
    {name:"iPad 横屏 1024×768",w:1024,h:768,t:true},
    {name:"iPad 竖屏 768×1024",w:768,h:1024,t:true},
    {name:"手机横屏 844×390",w:844,h:390,t:true},
    {name:"手机横屏 667×375",w:667,h:375,t:true},
    {name:"手机竖屏 390×844",w:390,h:844,t:true},
    {name:"手机竖屏 375×667",w:375,h:667,t:true},
    {name:"超矮横屏 640×320",w:640,h:320,t:true}
  ];
  for(const d of devices){
    cls.delete("tk-rotated");
    innerWidth=d.w; innerHeight=d.h; Game.useTouch=d.t;
    Game.resize();
    const cab=cabinet();
    const fitW=cab.w<=d.w, fitH=cab.h<=d.h;
    check("机柜适配 "+(d.name), fitW&&fitH, "scale="+Game.scale+" cabinet="+cab.w+"×"+cab.h+" vp="+d.w+"×"+d.h);
    // 竖屏设备在“手动横屏”旋转后：旋转框为 h×w
    if(d.w<d.h && d.t){
      cls.add("tk-rotated");
      innerWidth=d.w; innerHeight=d.h;
      Game.resize();
      const c2=cabinet();
      check("旋转适配 "+(d.name), c2.w<=d.h&&c2.h<=d.w, "scale="+Game.scale+" cabinet="+c2.w+"×"+c2.h+" 旋转框="+d.h+"×"+d.w);
      cls.delete("tk-rotated");
    }
  }

  // 2) 开火键摆位：进入摆位 → 拖动 → 保存 → 重新加载恢复
  Game.useTouch=true; innerWidth=844; innerHeight=390; cls.delete("tk-rotated");
  // 模拟旧版摇杆存档迁移
  _ls["tk_pad_pos_v2"]=JSON.stringify({portrait:{x:30,y:40}});
  PadUI.init();
  check("旧摇杆位置迁移到新键位", JSON.parse(_ls["tk_ctl_pos_v3"]).portrait.tPad.x===30, JSON.stringify(_ls["tk_ctl_pos_v3"]));
  // 进入摆位
  PadUI.toggle();
  check("进入摆位模式", PadUI.arranging===true);
  // 拖动开火键到 (200,150)：从当前中心抓取再落下
  const fire=document.getElementById("tFire");
  const fr=fire.getBoundingClientRect();
  PadUI.startArrange("tFire", fr.left+fr.width/2, fr.top+fr.height/2);
  PadUI.moveArrange(200, 150);
  const expX=200 - fr.width/2, expY=150 - fr.height/2;
  check("开火键可拖动定位", fire.style.left===expX+"px" && fire.style.top===expY+"px", "left="+fire.style.left+" top="+fire.style.top+" 期望 "+expX+","+expY);
  // 保存
  PadUI.toggle();
  const saved=JSON.parse(_ls["tk_ctl_pos_v3"]);
  check("开火键位置已保存", saved.landscape.tFire && saved.landscape.tFire.x===expX && saved.landscape.tFire.y===expY, JSON.stringify(saved.landscape));
  // 重新初始化恢复
  fire.style.left=""; fire.style.top=""; fire.style.right=""; fire.style.bottom="";
  PadUI._ori=null;
  PadUI.init();
  check("重新加载恢复开火键位置", fire.style.left===expX+"px" && fire.style.top===expY+"px", "left="+fire.style.left+" top="+fire.style.top);
  // 越界保护
  fire.style.left="5px"; fire.style.top="5px"; PadUI.clamp();
  check("越界自动回正", parseFloat(fire.style.left)>=6 && parseFloat(fire.style.top)>=6, "left="+fire.style.left+" top="+fire.style.top);

  console.log(out.join("\\n"));
  console.log(errors.length?"\\nLAYOUT_ERRORS:\\n"+errors.join("\\n"):"\\nLAYOUT_OK");
  process.exit(errors.length?1:0);
})();
`;
try{ eval(gameJs+harness); } catch(e){ console.error("FATAL:", e.message); console.error(e.stack); process.exit(1); }
