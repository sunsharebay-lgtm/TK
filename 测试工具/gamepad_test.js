#!/usr/bin/env node
/* 坦克大战 · 手柄界面操作专项回归
 * 覆盖：标题菜单上下选择/确认、进入下一关、暂停/恢复、返回
 */
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
// 虚拟手柄（Node 的 navigator 只读，须用 defineProperty 覆盖）
const pad = { axes:[0,0], buttons:Array.from({length:16},()=>({pressed:false})) };
Object.defineProperty(globalThis, "navigator", { value:{ getGamepads:()=>[pad], maxTouchPoints:0 }, configurable:true, writable:true });
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
  // 手柄按键：按下→跑一帧→松开→再跑一帧同步边缘状态
  const press=(btn)=>{ pad.buttons[btn].pressed=true; Game.update(1/60); Input.endFrame(); pad.buttons[btn].pressed=false; Game.update(1/60); Input.endFrame(); };
  const pressAxis=(dx,dy)=>{ pad.axes[0]=dx; pad.axes[1]=dy; Game.update(1/60); Input.endFrame(); pad.axes[0]=0; pad.axes[1]=0; Game.update(1/60); Input.endFrame(); };

  // 1) 标题菜单：十字键下选中，A 键确认
  Game.state="title"; Game.menuSel=0; Game.testMode=false; Game._cheatBuf="";
  press(13);                                   // 十字键下
  check("手柄十字键下 移动菜单", Game.menuSel===1, "menuSel="+Game.menuSel);
  press(12);                                   // 十字键上
  check("手柄十字键上 移动菜单", Game.menuSel===0, "menuSel="+Game.menuSel);
  press(0);                                    // A 键确认 → 单人出击
  check("手柄A键确认进入游戏", Game.state==="stage"||Game.state==="play", "state="+Game.state);

  // 2) 手柄 Start 暂停 / A 恢复
  for(let i=0;i<130;i++) Game.update(1/60);    // 过场 → play
  if(Game.state==="play"){
    press(9);                                  // Start
    check("手柄Start暂停", Game.state==="pause", "state="+Game.state);
    press(0);                                  // A → 选中的“继续”
    check("手柄A恢复", Game.state==="play", "state="+Game.state);
  } else { check("进入战斗状态", false, "state="+Game.state); }

  // 3) 暂停菜单方向选择
  Game.state="pause"; Game.pauseSel=0;
  press(13);                                   // 下 → 保存进度
  check("暂停菜单下移到保存", Game.pauseSel===1, "pauseSel="+Game.pauseSel);
  press(13);
  press(13);
  press(12);                                   // 上 → 返回标题(3→2? 上=(3+3)%4=2)
  check("暂停菜单上移", Game.pauseSel===2, "pauseSel="+Game.pauseSel);

  // 4) 过关面板：A 键进入下一关
  Game.state="clear";
  press(0);
  check("过关面板A键进入下一关", Game.state==="stage"||Game.state==="play", "state="+Game.state);

  // 5) 失败面板：A 键返回标题
  Game.state="over";
  press(0);
  check("失败面板A键返回标题", Game.state==="title", "state="+Game.state);

  // 6) 手柄B键返回
  Game.state="title"; Game.menuSel=4;
  Game.openIntro();
  check("打开游戏说明", Game.state==="intro", "state="+Game.state);
  press(1);                                    // B 键返回
  check("手柄B键返回标题", Game.state==="title", "state="+Game.state);

  // 7) 标题中按 B 不误启动游戏（B 不再同时触发确认）
  Game.state="title";
  press(1);
  check("标题中按B不误启动", Game.state==="title", "state="+Game.state);

  // 8) 菜单 6 项循环：最上往上 → 第6项(音效)
  Game.state="title"; Game.menuSel=0; Game._cheatBuf="";
  press(12);                                   // 上 → (0+5)%6 = 5
  check("菜单6项循环：最上往上到音效", Game.menuSel===5, "menuSel="+Game.menuSel);

  console.log(out.join("\\n"));
  console.log(errors.length?"\\nPAD_ERRORS:\\n"+errors.join("\\n"):"\\nPAD_OK");
  process.exit(errors.length?1:0);
})();
`;
try{ eval(gameJs+harness); } catch(e){ console.error("FATAL:", e.message); console.error(e.stack); process.exit(1); }
