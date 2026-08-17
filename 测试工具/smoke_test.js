#!/usr/bin/env node
/* 坦克大战 · 无头冒烟回归
 * 用最小 DOM stub 加载游戏脚本，验证：
 *  1) boot() 正常启动、标题帧渲染
 *  2) 15 张地图全部可构造 World 并运行 60 帧
 *  3) 熔岩精灵已构建、熔岩地图渲染不抛错
 */
const fs = require("fs");

const html = fs.readFileSync(process.argv[2], "utf8");
const gameJs = html.match(/<script>([\s\S]*?)<\/script>/)[1];

/* ---- 最小 DOM/浏览器 stub ---- */
function makeCtx(){
  const grad = { addColorStop(){} };
  const target = {
    canvas:{width:0,height:0},
    measureText:(s)=>({width:String(s).length*6}),
    createLinearGradient:()=>grad,
    createRadialGradient:()=>grad,
    createPattern:()=>({}),
    getImageData:()=>({data:new Uint8ClampedArray(4)}),
  };
  return new Proxy(target,{
    get(t,k){
      if(k in t) return t[k];
      if(typeof k === "string" && ["fillStyle","strokeStyle","font","globalAlpha","globalCompositeOperation","lineWidth","textBaseline","shadowColor","shadowBlur","lineCap","lineJoin","imageSmoothingEnabled"].includes(k)) return undefined;
      return (...args)=>undefined;
    },
    set(t,k,v){ t[k]=v; return true; }
  });
}
function makeEl(id){
  const el = {
    id, style:{}, classList:{ add(){}, remove(){}, toggle(){}, contains:()=>false },
    addEventListener(){}, removeEventListener(){}, appendChild(){}, removeChild(){},
    innerHTML:"", textContent:"", value:"", width:0, height:0, offsetWidth:100, offsetHeight:50,
    getContext:()=>makeCtx(),
    getBoundingClientRect:()=>({left:0,top:0,width:100,height:50,right:100,bottom:50}),
    setAttribute(){}, getAttribute:()=>null, querySelector:()=>makeEl("q"), querySelectorAll:()=>[],
    matches:()=>false, focus(){}, select(){}, click(){}, append(){}, remove(){},
    contains:()=>false,
  };
  return el;
}
const els = {};
const documentStub = {
  readyState:"complete",
  getElementById(id){ return els[id] || (els[id]=makeEl(id)); },
  createElement(tag){ const e=makeEl("_"+tag); if(tag==="canvas"){ e.width=576; e.height=448; } return e; },
  createElementNS:()=>makeEl("svg"),
  documentElement: makeEl("html"),
  body: makeEl("body"),
  head: makeEl("head"),
  addEventListener(){}, removeEventListener(){},
  querySelector:()=>makeEl("q"), querySelectorAll:()=>[],
};
const _ls = {};
const localStorageStub = {
  getItem:k=>_ls[k]!==undefined?_ls[k]:null,
  setItem:(k,v)=>{_ls[k]=String(v)},
  removeItem:k=>{delete _ls[k]},
  key:()=>null, length:0, clear(){}
};
globalThis.window = globalThis;
globalThis.document = documentStub;
globalThis.localStorage = localStorageStub;
globalThis.navigator = { getGamepads:()=>[], maxTouchPoints:0, userAgent:"node" };
globalThis.matchMedia = ()=>({ matches:false, addEventListener(){}, removeEventListener(){} });
globalThis.screen = { orientation:undefined };
globalThis.location = { hash:"" };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800;
globalThis.devicePixelRatio = 2;
globalThis.addEventListener = ()=>{}; globalThis.removeEventListener = ()=>{};
const rafQueue = [];
globalThis.requestAnimationFrame = (cb)=>{ rafQueue.push(cb); return rafQueue.length; };

/* ---- 追加测试 harness（与游戏脚本同作用域 eval） ---- */
const harness = `
;(function(){
  const out=[];
  let errors=[];
  // 1) 泵标题帧
  try{
    for(let i=0;i<20;i++){ const cb=rafQueue.shift(); if(cb) cb(i*1000/60); }
    out.push("title state=" + Game.state + " sprite tanks=" + Object.keys(SPR.tanks).length);
  }catch(e){ errors.push("title frames: "+e.message); }

  // 2) 熔岩精灵
  out.push("lava sprites=" + (SPR.terrain.lava ? SPR.terrain.lava.length : "MISSING"));

  // 3) 全部地图构造 World 并跑 60 帧（地狱模式使用全部 15 张）
  const prevHell = Game.hell;
  Game.hell = true;
  for(let i=0;i<STAGES.length;i++){
    try{
      const w = new World(Game, i, 0, false, null);
      for(let f=0;f<60;f++) w.update(1/60, [{up:0,dn:0,lf:0,rt:0,fire:0,firePressed:0}]);
      // 渲染战场+HUD（含熔岩地图）
      renderField(ctx, w);
      renderHUD(ctx, w);
      out.push("map " + i + " " + STAGES[i].en + " ok rem=" + w.remaining() + " lava=" + (!!STAGES[i].lava));
    }catch(e){ errors.push("map " + i + " " + (STAGES[i]&&STAGES[i].en) + ": " + e.message); }
  }
  Game.hell = prevHell;

  // 4) 战役 8 关构造检查
  for(let k=0;k<CAMPAIGN_STAGE_COUNT;k++){
    try{
      const w = new World(Game, k, 0, false, null);
      out.push("campaign stage " + (k+1) + " = " + STAGES[w.mapIndex].en);
    }catch(e){ errors.push("campaign " + k + ": " + e.message); }
  }

  console.log(out.join("\\n"));
  console.log(errors.length ? "ERRORS:\\n" + errors.join("\\n") : "ALL_OK");
  process.exit(errors.length ? 1 : 0);
})();
`;

try {
  eval(gameJs + harness);
} catch(e) {
  console.error("FATAL:", e.message);
  console.error(e.stack);
  process.exit(1);
}
