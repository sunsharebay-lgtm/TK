#!/usr/bin/env node
/* 坦克大战 · 测试模式专项回归
 * 覆盖：cscscs 进入 / 持久生效 / V 一键胜利 / C 呼出 / 选周目·关卡·地狱·地图 / 退出测试模式
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
  const press=(code)=>{ Input.pressed[code]=1; Input.anyPressed=true; Game.update(1/60); Input.endFrame(); };

  // 1) cscscs 进入测试模式
  Game.state="title"; Game.testMode=false; Game._cheatBuf="";
  for(const ch of "cscscs".split("")){
    Input.pressed[ch==="c"?"KeyC":"KeyS"]=1; Input.anyPressed=true;
    Game.handleKeys(); Input.endFrame();
  }
  check("cscscs 进入测试模式", Game.testMode===true && Game.state==="test", "state="+Game.state+" menu="+Game.testMenu);

  // 2) 测试模式持久：进入关卡→游玩→回标题，仍保持开启
  Game.testMenu="campaign"; Game.testLoop=0; Game.testStageIndex=0;
  Game.startTestStage();
  for(let i=0;i<130;i++) Game.update(1/60);       // 过场→play
  check("进入战斗", Game.state==="play", "state="+Game.state);
  Game.backToTitle();
  check("回标题后测试模式保持开启", Game.testMode===true, "testMode="+Game.testMode);

  // 3) 测试模式开启时，正常新游戏 V 键仍可用
  Game.testMode=true; Game.superUnlocked=true;
  Game.newGame(false);
  check("正常新游戏 testMenu=campaign", Game.testMenu==="campaign" && Game.testMode===true, "menu="+Game.testMenu+" testMode="+Game.testMode);
  for(let i=0;i<130;i++) Game.update(1/60);
  if(Game.state==="play"){ press("KeyV"); }
  check("正常新游戏中 V 一键胜利可用", Game.world && Game.world.cleared===true, "cleared="+(Game.world&&Game.world.cleared));

  // 4) 游戏中 C 键呼出测试面板，Esc 关闭恢复
  Game.state="play";
  press("KeyC");
  check("游戏中按 C 呼出测试面板", Game.state==="test" && Game.testReturnState==="play", "state="+Game.state+" return="+Game.testReturnState);
  press("Escape");
  check("Esc 关闭面板恢复战斗", Game.state==="play", "state="+Game.state);

  // 5) 选择任意周目+关卡
  Game.testMenu="campaign"; Game.testLoop=3; Game.testStageIndex=2;
  Game.startTestStage();
  check("测试选择第4周目第3关", Game.world.loop===3 && Game.world.mapIndex===CAMPAIGN_STAGE_IDS[2], "loop="+Game.world.loop+" map="+Game.world.mapIndex+"("+STAGES[Game.world.mapIndex].en+")");

  // 6) 地狱绝境：选择区域
  Game.testMenu="hell"; Game.testStageIndex=2;
  Game.startTestStage();
  check("测试地狱区域3", Game.world.isHellBossStage===true && Game.world.hellRound===2, "hellBoss="+Game.world.isHellBossStage+" round="+Game.world.hellRound);

  // 7) 所有地图：直接取图
  Game.testMenu="map"; Game.testStageIndex=15;
  Game.startTestStage();
  check("测试所有地图第16张(沙漠)", Game.world.mapIndex===15 && STAGES[Game.world.mapIndex].en==="沙漠", "map="+Game.world.mapIndex+"("+STAGES[Game.world.mapIndex].en+")");

  // 8) 退出测试模式
  Game.exitTestMode();
  check("退出测试模式", Game.testMode===false && Game.superUnlocked===false && Game.state==="title", "testMode="+Game.testMode+" super="+Game.superUnlocked+" state="+Game.state);

  // 9) 退出后 V 键不再生效
  Game.testMode=false; Game.newGame(false);
  for(let i=0;i<130;i++) Game.update(1/60);
  press("KeyV");
  check("退出后 V 键不再生效", !(Game.world && Game.world.cleared), "cleared="+(Game.world&&Game.world.cleared));

  // 9) 完成第五周目后，地狱绝境按钮应在通关面板中可见
  Game.testMode=false; Game.hell=false; Game.loop=4; Game.stageIndex=CAMPAIGN_STAGE_COUNT-1;
  Game.world = new World(Game, Game.stageIndex, Game.loop, false, null);
  Game.state="clear"; Save.data.hellUnlocked=false;
  Game.nextStage();
  check("完成第五周目解锁地狱绝境", Save.data.hellUnlocked===true, "unlocked="+Save.data.hellUnlocked);
  check("第五周目通关面板显示地狱入口", document.getElementById("hellBtn").style.display!=="none", "display="+document.getElementById("hellBtn").style.display);
  // 10) 最后一关通关后应解锁全部主线关卡，且可直接从标题选择最后一关
  Game.testMode=false; Game.hell=false; Game.loop=0; Game.stageIndex=CAMPAIGN_STAGE_COUNT-1;
  Save.data.maxStage=CAMPAIGN_STAGE_COUNT-1;
  Game.world = new World(Game, Game.stageIndex, Game.loop, false, null);
  Game.onStageClear();
  check("通关最后一关后解锁全部主线关卡", Save.data.maxStage===CAMPAIGN_STAGE_COUNT, "maxStage="+Save.data.maxStage);
  Game.startStage=CAMPAIGN_STAGE_COUNT-1; Game.newGame(false);
  check("可直接选择已通关的最后一关", Game.world.mapIndex===CAMPAIGN_STAGE_IDS[CAMPAIGN_STAGE_COUNT-1], "map="+Game.world.mapIndex);


  console.log(out.join("\\n"));
  console.log(errors.length?"\\nTESTMODE_ERRORS:\\n"+errors.join("\\n"):"\\nTESTMODE_OK");
  process.exit(errors.length?1:0);
})();
`;
try{ eval(gameJs+harness); } catch(e){ console.error("FATAL:", e.message); console.error(e.stack); process.exit(1); }
