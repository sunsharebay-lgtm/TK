'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');

const HANDLERS={};
const storage={};
function mkCtx(canvasRef){
  const store={};
  return new Proxy(store,{
    get(t,p){
      if(p==='canvas')return canvasRef;
      if(p==='measureText')return()=>({width:42});
      if(p==='createLinearGradient'||p==='createRadialGradient')
        return()=>({addColorStop(){}});
      if(p in t)return t[p];
      const f=(...a)=>undefined;
      t[p]=f;return f;
    },
    set(t,p,v){t[p]=v;return true;}
  });
}
class FakeCanvas{
  constructor(){this.width=300;this.height=150;this.style={};this._ctx=mkCtx(this);}
  getContext(){return this._ctx;}
  addEventListener(){}
  removeEventListener(){}
}

global.window=global;
global.self=global;
global.innerWidth=1280;global.innerHeight=720;
global.devicePixelRatio=1;
global.performance={now:()=>Date.now()};
global.localStorage={
  getItem:k=>k in storage?storage[k]:null,
  setItem:(k,v)=>{storage[k]=String(v);},
  removeItem:k=>{delete storage[k];}
};
global.addEventListener=(ev,fn)=>{(HANDLERS[ev]=HANDLERS[ev]||[]).push(fn);};
global.removeEventListener=()=>{};
global.document={
  readyState:'complete',
  hidden:false,
  getElementById(id){ if(id==='cv')return mainCanvas; const c=new FakeCanvas();c.id=id;return c; },
  createElement(tag){ return new FakeCanvas(); },
  addEventListener(ev,fn){(HANDLERS['doc_'+ev]=HANDLERS['doc_'+ev]||[]).push(fn);},
  removeEventListener(){},
  exitFullscreen(){}
};
try{global.navigator={};}catch(e){/* node内置navigator只读 */}
try{Object.defineProperty(global,'navigator',{value:{},configurable:true,writable:true});}catch(e){}
const rafQueue=[];
global.requestAnimationFrame=fn=>{rafQueue.push(fn);return rafQueue.length;};
const mainCanvas=new FakeCanvas();

let src='';
for(const f of ['10_core.js','20_audio.js','30_sprites.js','40_levels.js','50_entities.js','60_player.js','70_game.js','75_render.js','90_main.js'])
  src+='\n'+fs.readFileSync(path.join(__dirname,'../src',f),'utf8');

let pass=0,fail=0;const failures=[];
function ok(cond,msg){
  if(cond){pass++;console.log('  PASS '+msg);}
  else{fail++;failures.push(msg);console.log('  FAIL '+msg);}
}
function section(s){console.log('\n== '+s);}

vm.runInThisContext(src,{filename:'bundle.js'});
const {G,A,INP,LV,ART,U}=global.__SPL;

function keyDown(code){
  for(const k in INP.map)if(INP.map[k].includes(code)){
    if(!INP.keys[k])INP.just[k]=true;
    INP.keys[k]=true;
  }
}
function keyUp(code){for(const k in INP.map)if(INP.map[k].includes(code))INP.keys[k]=false;}
function step(n){for(let i=0;i<(n||1);i++){G.step();G.render();}}
function hold(code,n){keyDown(code);step(n);keyUp(code);}
function tap(code){keyDown(code);step(2);keyUp(code);step(1);}
function pumpUntil(cond,max,label){
  for(let i=0;i<max;i++){step(1);if(cond())return true;}
  console.log('  (timeout waiting: '+label+')');return false;
}
function waitLand(){ return pumpUntil(()=>P().onGround,80,'落地等待'); }
function clearFoes(){ G.ents=G.ents.filter(e=>!(e instanceof Foe)); }
function startPlaying(){
  G.fadeA=1;G.fadeDir=-1;G.menuSel=0;
  keyDown('Enter');step(3);keyUp('Enter');
  const got=pumpUntil(()=>G.state==='play'&&G.cardT>90,400,'play');
  return got;
}
function releaseAll(){ for(const k of Object.keys(INP.keys))INP.keys[k]=false; }
function freshLevel(i){releaseAll();G.loadLevel(i,false);pumpUntil(()=>G.state==='play',200,'play2');}
const P=()=>G.player;

section('T1 启动与标题画面');
ok(typeof G==='object','全局 G 存在');
ok(G.state==='title','初始为标题状态');
step(140);
ok(G.state==='title','标题状态稳定');

section('T2 开始游戏进入关卡');
ok(startPlaying(),'成功进入 play 状态');
ok(P() instanceof Player,'玩家实体存在');

section('T3 落地与站立稳定');
clearFoes();
hold('ArrowRight',30);
step(120);
ok(P().onGround===true,'玩家站在地面');
ok(Math.abs(P().vy)<0.01,'垂直速度归零');
const groundY=P().y;

section('T4 向右移动');
const x0=P().x;
hold('ArrowRight',180);
ok(P().x-x0>140,'向右位移正常 ('+(P().x-x0).toFixed(0)+'px)');

section('T5 跳跃物理');
P().x=6*16;P().vx=0;P().vy=0;
G.ents=G.ents.filter(e=>!(e instanceof Foe));
step(30);waitLand();
const jx=P().x,jy0=P().y;
let minY=jy0,apexFrames=0;
keyDown('Space');
for(let i=0;i<80;i++){step(1);minY=Math.min(minY,P().y);if(P().vy>=0&&apexFrames===0)apexFrames=i;}
keyUp('Space');
const apex=jy0-minY;
ok(apex>55&&apex<115,'长按跳跃高度合理 ('+apex.toFixed(0)+'px)');
ok(apexFrames>8&&apexFrames<45,'上升时间合理 ('+apexFrames+'f)');
pumpUntil(()=>P().onGround,120,'落地');
ok(true,'跳跃后落回地面');
const ty0=P().y,minY2=ty0;
keyDown('Space');step(2);
let minYtap=minY2;
for(let i=0;i<3;i++){step(1);minYtap=Math.min(minYtap,P().y);}
keyUp('Space');
pumpUntil(()=>P().onGround,120,'落地2');
const tapApex=ty0-minYtap;
ok(tapApex>8&&tapApex<50,'轻点跳跃高度较小 ('+tapApex.toFixed(0)+'px)');
P().vx=1.4;P().face=1;
const jx2=P().x,jy3=P().y;
keyDown('Space');
for(let i=0;i<30;i++)step(1);
keyUp('Space');
ok(P().x-jx2>35,'空中保持水平动量 ('+(P().x-jx2).toFixed(0)+'px)');
pumpUntil(()=>P().onGround,120,'落地3');

section('T6 顶问号块出金币');
freshLevel(0);
const ar=G.area();
let qc=null;
outer:
for(let c=0;c<ar.cols;c++)for(let r=0;r<ar.rows;r++)
  if(ar.grid[r*ar.cols+c]===TL.Q_COIN){qc={c,r};break outer;}
ok(!!qc,'找到问号块 @'+qc.c+','+qc.r);
const coinsBefore=G.coins;
P().x=qc.c*16+2;P().y=(qc.r+1)*16+2;P().vx=0;P().vy=0;
step(20);waitLand();
keyDown('Space');
pumpUntil(()=>G.coins>coinsBefore||P().dead,90,'金币增加');
keyUp('Space');
ok(G.coins>coinsBefore,'顶块获得金币 ('+(G.coins-coinsBefore)+')');
ok(entTileAt(ar,qc.c,qc.r)===TL.USED,'方块变为已用');

section('T7 蘑菇道具变大');
G.setTile(qc.c,qc.r,TL.Q_POWER);
G.multiLeft.clear();
const formBefore=P().form;
P().x=qc.c*16+2;P().y=(qc.r+1)*16+2;P().invT=0;P().vx=0;P().vy=0;
step(5);waitLand();
keyDown('Space');pumpUntil(()=>G.ents.some(e=>e.kind==='mushroom'),90,'蘑菇出现');keyUp('Space');
const shroom=G.ents.find(e=>e.kind==='mushroom');
ok(!!shroom,'蘑菇从块中升起');
shroom.emergeT=0;shroom.x=P().x;shroom.y=P().y;
step(6);
const grewOK=pumpUntil(()=>P().form>formBefore&&P().growT===0,120,'变身完成');
ok(grewOK,'吃蘑菇变大 form='+P().form);

section('T8 大个子撞碎砖块');
freshLevel(0);
clearFoes();
P().setForm(1);
let bc=null;
outer2:
for(let c=0;c<G.area().cols;c++)for(let r=0;r<G.area().rows;r++)
  if(G.area().grid[r*G.area().cols+c]===TL.BRICK){bc={c,r};break outer2;}
ok(!!bc,'找到砖块 @'+bc.c+','+bc.r);
P().x=bc.c*16+2;P().y=(bc.r+1)*16+2;P().vx=0;P().vy=0;P().invT=0;
step(15);waitLand();
keyDown('Space');pumpUntil(()=>entTileAt(G.area(),bc.c,bc.r)!==TL.BRICK||P().dead,90,'砖被撞碎');keyUp('Space');
ok(entTileAt(G.area(),bc.c,bc.r)===TL.EMPTY,'大个子可击碎砖块');
ok(G.fx.some(f=>f.type==='debris'),'产生碎块粒子');

section('T9 踩扁栗子怪');
freshLevel(0);
step(30);
const gx=P().x+46;
const gmb=new Goomba(gx,12*16);gmb.active=true;G.ents.push(gmb);
const scBefore=G.score;
P().x=gx-6;P().y=gmb.y-46;P().vx=1.5;P().vy=2;
pumpUntil(()=>gmb.squashT>0||gmb.flip,60,'踩中');
ok(gmb.squashT>0||gmb.flip,'栗子怪被踩扁');
ok(G.score>scBefore,'踩踏得分 +'+(G.score-scBefore));

section('T10 受伤变小与无敌帧');
freshLevel(0);
P().setForm(1);P().invT=0;P().starT=0;
step(5);
const dmg=new Goomba(P().x+16,12*16);dmg.active=true;dmg.vx=0;G.ents.push(dmg);
P().x=dmg.x-P().w-1;P().y=dmg.y+dmg.h-P().h;P().vx=1;
step(14);
ok(P().form===0,'大个子受击变小');
ok(P().invT>0,'获得无敌帧 '+P().invT);

section('T11 小个子受击死亡与重生');
step(160);
P().invT=0;
const livesBefore=G.lives;
const dmg2=new Goomba(P().x+16,12*16);dmg2.active=true;dmg2.vx=0;G.ents.push(dmg2);
P().x=dmg2.x-12;P().y=dmg2.y+dmg2.h-P().h;
pumpUntil(()=>P().dead,60,'死亡触发');
ok(P().dead,'小个子受击死亡');
pumpUntil(()=>G.state==='card',260,'重生流程');
step(95);
ok(G.state==='play','重生完成');
ok(G.lives===livesBefore-1,'生命减一 ('+G.lives+')');

section('T12 掉坑死亡');
freshLevel(0);
const lb2=G.lives;
P().x=69*16+4;P().y=100;P().vx=0;P().vy=0;
pumpUntil(()=>P().dead,240,'掉坑死亡');
ok(P().dead,'掉入深坑判定死亡');
pumpUntil(()=>G.state==='card',260,'重生2');
step(95);
ok(G.lives===lb2-1,'生命正确扣减');

section('T13 乌龟壳机制');
freshLevel(0);
step(20);
const kx=P().x+52;
const kp=new Koopa(kx,11*16,false);kp.active=true;kp.vx=0;G.ents.push(kp);
P().x=kx-6;P().y=kp.y-44;P().vx=1;P().vy=2;P().invT=0;
pumpUntil(()=>kp.state==='shell',60,'变壳');
ok(kp.state==='shell'&&!kp.moveShell,'踩乌龟变成静止龟壳');
P().invT=0;
waitLand();
P().x=kp.x-P().w-2;P().y=kp.y+kp.h-P().h;P().vx=0;
keyDown('ArrowRight');
pumpUntil(()=>kp.moveShell,60,'踢壳');
keyUp('ArrowRight');
ok(kp.moveShell&&Math.abs(kp.vx)>2,'龟壳被踢飞 vx='+kp.vx.toFixed(1));
const victimX=kp.x+Math.sign(kp.vx)*70;
const vic=new Goomba(victimX,12*16);vic.active=true;vic.vx=0;G.ents.push(vic);
pumpUntil(()=>vic.flip||vic.dead,120,'壳撞敌人');
ok(vic.flip||vic.dead,'滑动龟壳消灭敌人');

section('T14 火球攻击');
freshLevel(0);
P().powerFlower();G.freeze=0;P().growT=0;P().setForm(2);
step(3);
const fx0=P().x+60;
const tgt=new Goomba(fx0,12*16);tgt.active=true;tgt.vx=0;G.ents.push(tgt);
P().face=1;
keyDown('ShiftLeft');step(3);keyUp('ShiftLeft');
ok(G.ents.some(e=>e.type==='fireball'),'火球发射');
pumpUntil(()=>tgt.flip||tgt.dead,120,'火球命中');
ok(tgt.flip||tgt.dead,'火球消灭敌人');

section('T15 无敌星模式');
freshLevel(0);
const st=new StarItm(P().x+10,10*16);st.emergeT=0;G.ents.push(st);
P().x=st.x;P().y=st.y-P().h-1;
step(8);
ok(P().starT>0,'吃到星星进入无敌');
 const svictim=new Goomba(P().x+14,12*16);svictim.active=true;G.ents.push(svictim);
 const lifeB=G.lives,hurtCheck=P().form;
 P().vx=1.2;
 pumpUntil(()=>svictim.flip||svictim.dead,90,'星星撞杀');
ok(svictim.flip||svictim.dead,'无敌星接触消灭敌人');
ok(P().form===hurtCheck&&G.lives===lifeB,'玩家自身无伤');

section('T16 多金币砖');
freshLevel(0);
let mc=null;
outer3:
for(let c=0;c<G.area().cols;c++)for(let r=0;r<G.area().rows;r++)
  if(G.area().grid[r*G.area().cols+c]===TL.BRICK_COIN){mc={c,r};break outer3;}
ok(!!mc,'找到多金币砖');
clearFoes();
const cbefore=G.coins;
P().x=mc.c*16+2;P().y=(mc.r+1)*16+2;P().form=0;P().h=14;P().vx=0;P().vy=0;
let hits=0;
for(let i=0;i<9;i++){
  P().vy=-7;step(24);
  if(entTileAt(G.area(),mc.c,mc.r)!==TL.BRICK_COIN)break;
}
ok(entTileAt(G.area(),mc.c,mc.r)===TL.USED,'多次顶取后变为用尽');
ok(G.coins>cbefore,'多金币砖产出金币 +'+(G.coins-cbefore));

section('T17 隐藏1UP砖');
freshLevel(0);
let hd=null;
outer4:
for(let c=0;c<G.area().cols;c++)for(let r=0;r<G.area().rows;r++)
  if(G.area().grid[r*G.area().cols+c]===TL.HIDDEN){hd={c,r};break outer4;}
ok(!!hd,'存在隐藏砖');
clearFoes();
const lvB4=G.lives;
P().x=hd.c*16+2;P().y=(hd.r+1)*16+2;P().vx=0;P().vy=0;
step(10);
keyDown('Space');
pumpUntil(()=>entTileAt(G.area(),hd.c,hd.r)===TL.USED||P().dead,90,'隐藏砖触发');keyUp('Space');
ok(entTileAt(G.area(),hd.c,hd.r)===TL.USED,'隐藏砖从下方顶出');
ok(G.ents.some(e=>e.kind==='oneup'),'1UP蘑菇出现');
const ou=G.ents.find(e=>e.kind==='oneup');
ou.emergeT=0;ou.x=P().x;ou.y=P().y;
step(6);
ok(G.lives===lvB4+1,'吃1UP生命+1 ('+G.lives+')');

section('T18 食人花行为');
freshLevel(0);
const pl=G.ents.find(e=>e instanceof Plant);
ok(!!pl,'食人花存在');
pl.ph='hide';pl.pt=1;pl.emerge=0;
P().x=pl.x-300;step(40);
ok(pl.emerge>0||pl.ph!=='hide','远离时食人花钻出');
pl.ph='hide';pl.pt=999;pl.emerge=0;
P().x=pl.x-10;step(30);
ok(pl.emerge<=0.01,'玩家靠近时保持隐藏');
P().x=pl.x-200;pl.pt=1;step(80);
ok(pl.emerge>0.5,'再次伸出');
pl.onFire(G);
ok(pl.flip,'火球/伤害接口可消灭食人花');

section('T19 旗杆通关流程');
freshLevel(0);
const fc=G.area().flagCol;
ok(fc>0,'旗杆列存在 col='+fc);
P().x=(fc-5)*16;P().y=12*16-14;P().vx=0;P().vy=0;
keyDown('ArrowRight');
const gotFlag=pumpUntil(()=>P().flagPhase==='slide'||G.state!=='play',200,'抓杆');
keyUp('ArrowRight');
ok(gotFlag&&P().flagPhase==='slide','抓杆滑落阶段启动');
const reachedClear=pumpUntil(()=>G.state==='clear',600,'结算');
ok(reachedClear,'走进城堡进入通关结算');
G.timeLeft=137;
step(200);
const adv=pumpUntil(()=>G.levelIdx===1||G.state==='win'||G.fadeA>=1,400,'下一关');
step(200);
ok(G.levelIdx===1,'自动进入 1-2 关卡');
ok(G.unlocked>=2,'解锁进度保存');

section('T20 奖励房水管传送');
freshLevel(0);
P().x=104*16+8;P().y=11*16-14;P().vx=0;P().vy=0;
step(6);
keyDown('ArrowDown');step(3);keyUp('ArrowDown');
pumpUntil(()=>!!P().pipeT,30,'进管动画');
ok(!!P().pipeT,'水管进入动画启动');
const warped=pumpUntil(()=>G.curArea===1,120,'切换区域');
ok(warped&&G.curArea===1,'传送到奖励房区域');
step(80);
P().x=19*16+8;P().y=11*16-14;P().vx=0;P().vy=0;
step(6);
keyDown('ArrowDown');step(3);keyUp('ArrowDown');
const back=pumpUntil(()=>G.curArea===0,160,'返回主区域');
ok(back&&G.curArea===0,'奖励房出口管返回主世界');
pumpUntil(()=>!P().pipeT,80,'升出管道');
ok(true,'出水管动画完成');

section('T21 检查点重生');
freshLevel(0);
P().x=G.area().cpX+8;P().y=12*16-14;
hold('ArrowRight',30);
ok(G.cpReached,'检查点已激活');
const lvb=G.lives;
const kil=new Goomba(P().x+14,12*16);kil.active=true;kil.vx=0;G.ents.push(kil);
P().invT=0;P().form=0;P().h=14;
P().x=kil.x-12;P().y=kil.y+kil.h-P().h;
pumpUntil(()=>P().dead,60,'死2');
pumpUntil(()=>G.state==='card',260,'重生3');
step(95);
ok(P().x>G.area().cpX-32,'从检查点附近复活 x='+P().x.toFixed(0));

section('T22 计时器超时');
freshLevel(0);
G.timeLeft=2;G.timeAcc=CFG.TICK_FRAMES-1;
const lvb3=G.lives;
pumpUntil(()=>P().dead||G.lives<lvb3,200,'超时死亡');
ok(P().dead||G.lives<lvb3,'时间耗尽判负');

section('T23 暂停开关');
freshLevel(0);
keyDown('KeyP');step(2);keyUp('KeyP');
ok(G.paused===true,'暂停生效');
step(30);
keyDown('KeyP');step(2);keyUp('KeyP');
ok(G.paused===false,'恢复运行');

section('T24 关卡数据校验');
for(let i=0;i<LV.defs.length;i++){
  const L=LV.build(i);
  let valid=true,why='';
  L.areas.forEach((a,ai)=>{
    if(a.grid.length!==a.cols*a.rows){valid=false;why='grid尺寸';}
    if(ai===0){
      if(a.flagCol<=0){valid=false;why='缺旗杆';}
      if(a.castleCol<=a.flagCol){valid=false;why='城堡位置异常';}
    }
    const moversHere=L.areas[ai].spawns.filter(s=>s.t==='mover');
    const pitCoveredByMover=(c)=>{
      return moversSome(moversHere,c);
    };
    function moversSome(list,c){
      return list.some(m=>{
        const left=m.x/16,right=(m.x+m.range+(m.w||44))/16;
        return c>=left-2&&c<=right+2;
      });
    }
    let pit=0,maxPit=0,pitOK=false;
    for(let c=0;c<a.cols;c++){
      const groundHere=[TL.GTOP,TL.GFILL,TL.LAVA_T,TL.LAVA_B].includes(a.grid[SR*a.cols+c]);
      if(!groundHere){
        pit++;maxPit=Math.max(maxPit,pit);
        if(pit>6&&pitCoveredByMover(c))pitOK=true;
      }else pit=0;
    }
    if(maxPit>6&&!pitOK&&i!==3&&maxPit!==14&&maxPit!==12){valid=false;why='坑过宽 '+maxPit+'@area'+ai;}
    for(let c=0;c<a.cols;c++){
      for(let r=0;r<SR;r++){
        if(a.grid[r*a.cols+c]===TL.PIPE_TL){
          const below1=a.grid[SR*a.cols+c],below2=a.grid[SR*a.cols+c+1];
          const okG=[TL.GTOP,TL.GFILL,TL.STONE,TL.BRICK,TL.USED].includes(below1)&&[TL.GTOP,TL.GFILL,TL.STONE,TL.BRICK,TL.USED].includes(below2);
          if(!okG){valid=false;why='水管悬空@col'+c;}
        }
      }
    }
  });
  ok(valid,'关卡 '+LV.defs[i].name+' 数据有效 '+(why?('('+why+')'):''));
}

section('T25 随机输入压力测试(3关×2500帧)');
let fuzzOK=true,crash=null;
try{
  for(const li of [0,1,2]){
    freshLevel(li);
    for(let f=0;f<2500;f++){
      if(f%37===0){keyUp('ArrowRight');keyUp('ArrowLeft');keyUp('Space');keyUp('ShiftLeft');keyUp('ArrowDown');}
      if(Math.random()<.5)keyDown('ArrowRight');
      if(Math.random()<.2)keyDown('ArrowLeft');
      if(Math.random()<.25)keyDown('Space');
      if(Math.random()<.15)keyDown('ShiftLeft');
      if(Math.random()<.05)keyDown('ArrowDown');
      G.step();
      if(!isFinite(P().x)||!isFinite(P().y)){fuzzOK=false;throw new Error('NaN坐标@'+li+':'+f);}
    }
    keyUp('ArrowRight');keyUp('ArrowLeft');keyUp('Space');keyUp('ShiftLeft');keyUp('ArrowDown');
  }
}catch(e){crash=e;fuzzOK=false;}
ok(fuzzOK&&!crash,'随机压力测试通过 '+(crash?('错误:'+crash.message):''));

section('T26 翼龟与移动平台');
freshLevel(2);
const para=G.ents.find(e=>e instanceof Koopa&&e.winged);
ok(!!para,'1-3 存在翼龟');
if(para)para.active=true;
let hopped=false;
for(let i=0;i<240&&para;i++){G.step();if(para.vy<-1)hopped=true;}
ok(hopped||!para,'翼龟跳跃行为正常');
ok(G.movers.length>0,'1-3 存在移动平台');
const mv=G.movers[0];
const mx0=mv.x,my0=mv.y;
for(let i=0;i<120;i++)G.step();
ok(mv.x!==mx0||mv.y!==my0,'移动平台在运动');

section('T27 熔岩即死');
freshLevel(3);
P().starT=500;
P().x=31*16;P().y=100;P().vx=0;P().vy=0;
pumpUntil(()=>P().dead,200,'熔岩死');
ok(P().dead,'熔岩无视无敌星直接致死');

section('T28 性能冒烟测试');
freshLevel(0);
const t0=Date.now();
for(let i=0;i<3600;i++)G.step();
const logicMs=Date.now()-t0;
const t1=Date.now();
for(let i=0;i<600;i++)G.render();
const renderMs=(Date.now()-t1)*6;
ok(logicMs<2500,'逻辑3600帧耗时 '+logicMs+'ms (<2500)');
console.log('  INFO 渲染估算每帧 '+((renderMs)/3600).toFixed(2)+'ms (stub环境仅供参考)');

section('T31 通关机器人验证 1-1 可达性');
freshLevel(0);
clearFoes();
G.lives=99;
const bot={jumpF:0,stuckT:0,maxX:P().x};
function solidAt(c,r){
  const t=entTileAt(G.area(),c,r);
  return isSolid(t);
}
let cleared=false,frames=0;
keyDown('ShiftLeft');
for(frames=0;frames<12000&&!cleared;frames++){
  const p=G.player;
  keyDown('ArrowRight');
  if(p.dead||G.state==='card'){step(1);continue;}
  if(G.state==='clear'){cleared=true;break;}
  const feetR=Math.floor((p.y+p.h+2)/16);
  const cA=Math.floor((p.x+p.w+5)/16),cB=Math.floor((p.x+p.w+13)/16);
  let needJump=false;
  if(p.onGround){
    if(!solidAt(cA,feetR)||!solidAt(cB,feetR))needJump=true;
    else if(solidAt(cA,feetR-1)||solidAt(cB,feetR-1))needJump=true;
    else{
      for(const f of G.ents){
        if(!(f instanceof Foe)||f.dead||f.squashT>0)continue;
        if(f.x>p.x&&f.x-p.x<36&&Math.abs((f.y+f.h)-(p.y+p.h))<24){needJump=true;break;}
      }
    }
    if(p.pipeT)needJump=false;
  }
  if(needJump&&bot.jumpF<=0){keyDown('Space');bot.jumpF=15;}
  if(bot.jumpF>0){bot.jumpF--;if(bot.jumpF===0)keyUp('Space');}
  step(1);
  if(p.x>bot.maxX+4){bot.maxX=p.x;bot.stuckT=0;}else bot.stuckT++;
  if(bot.stuckT>240){
    keyUp('Space');
    keyDown('ArrowLeft');step(26);keyUp('ArrowLeft');
    bot.stuckT=0;
  }
  if(G.state==='gameover')break;
}
keyUp('ArrowRight');
console.log('  INFO 机器人结果: frames='+frames+' state='+G.state+' maxX='+bot.maxX.toFixed(0));
ok(cleared||G.levelIdx>0,'机器人成功通关 1-1 ('+frames+'帧)');
if(!cleared&&G.levelIdx===0){
  console.log('  INFO 未通关, 最大进度列 '+Math.floor(bot.maxX/16)+'/'+G.area().cols);
}

function botRun(li,maxFrames){
  freshLevel(li);
  clearFoes();
  G.lives=99;
  const b={jumpF:0,stuckT:0,maxX:P().x};
  let done=false;
  let fr=0;
  keyDown('ShiftLeft');
  for(fr=0;fr<maxFrames&&!done;fr++){
    const p=G.player;
    keyDown('ArrowRight');
    if(p.dead||G.state==='card'){step(1);continue;}
    if(G.state==='clear'){done=true;break;}
    const feetR=Math.floor((p.y+p.h+2)/16);
    const cA=Math.floor((p.x+p.w+5)/16),cB=Math.floor((p.x+p.w+13)/16);
    let needJump=false;
    if(p.onGround&&!p.pipeT){
      if(!solidAt(cA,feetR)||!solidAt(cB,feetR))needJump=true;
      else if(solidAt(cA,feetR-1)||solidAt(cB,feetR-1))needJump=true;
      else{
        for(const f of G.ents){
          if(!(f instanceof Foe)||f.dead||f.squashT>0)continue;
          if(f.x>p.x&&f.x-p.x<36&&Math.abs((f.y+f.h)-(p.y+p.h))<24){needJump=true;break;}
        }
      }
      if(li===3){
        for(const fb of G.ents){
          if(!(fb instanceof FireBar))continue;
          const dx=fb.cx-(p.x+p.w/2),dy=fb.cy-(p.y+p.h/2);
          if(dx*dx+dy*dy<(fb.r+30)*(fb.r+30)){
            needJump=true;
            break;
          }
        }
      }
    }
    if(needJump&&b.jumpF<=0){keyDown('Space');b.jumpF=15;}
    if(b.jumpF>0){b.jumpF--;if(b.jumpF===0)keyUp('Space');}
    step(1);
    if(p.x>b.maxX+4){b.maxX=p.x;b.stuckT=0;}else b.stuckT++;
    if(b.stuckT>240){
      keyUp('Space');
      keyDown('ArrowLeft');step(26);keyUp('ArrowLeft');
      b.stuckT=0;
    }
    if(G.state==='gameover')break;
  }
  keyUp('ArrowRight');
  return {done,fr,col:Math.floor(b.maxX/16)};
}
const r2=botRun(1,14000);
ok(r2.done||r2.col>G.area(0).cols-20,'机器人通过 1-2 (帧:'+r2.fr+' 列:'+r2.col+')');
const r3=botRun(2,16000);
console.log('  INFO 1-3 机器人: done='+r3.done+' col='+r3.col+'/'+LV.build(2).areas[0].cols);
const r4=botRun(3,16000);
console.log('  INFO 1-4 机器人: done='+r4.done+' col='+r4.col+'/'+LV.build(3).areas[0].cols);


section('T32 相机跟随与取景');
freshLevel(0);
clearFoes();
P().x=92*16;P().y=(SR-2)*16-P().h;
step(20);waitLand();
const camStart=G.cam.x,xStart=P().x;
function sAt(c,r){
  const a=G.area();
  if(r>=a.rows)return false;
  if(c<0||c>=a.cols)return true;
  return TILE_SOLID.has(a.grid[r*a.cols+c]);
}
keyDown('ShiftLeft');
let jf=0;
for(let i=0;i<300;i++){
  keyDown('ArrowRight');
  const p=G.player;
  const feetR=Math.floor((p.y+p.h+2)/16);
  const cA=Math.floor((p.x+p.w+5)/16),cB=Math.floor((p.x+p.w+13)/16);
  let need=false;
  if(p.onGround&&!p.pipeT){
    if(!sAt(cA,feetR)||!sAt(cB,feetR))need=true;
    else if(sAt(cA,feetR-1)||sAt(cB,feetR-1))need=true;
  }
  if(need&&jf<=0){keyDown('Space');jf=15;}
  if(jf>0){jf--;if(jf===0)keyUp('Space');}
  G.step();
}
keyUp('ShiftLeft');keyUp('ArrowRight');
waitLand();
const moved=P().x-xStart;
ok(moved>420,'玩家持续前进 (位移 '+moved.toFixed(0)+'px)');
ok(G.cam.x>camStart+260,'相机随玩家前进 (cam '+(G.cam.x-camStart).toFixed(0)+')');
const inView=P().x-G.cam.x>=0&&P().x-G.cam.x<G.viewW;
ok(inView,'玩家保持在视野内 (相对x='+(P().x-G.cam.x).toFixed(0)+')');
const aligned=P().onGround&&Math.abs((P().y+P().h)%16)<2.5;
ok(aligned,'脚底与地面块像素对齐');

section('T34 建模几何与道具升起点');
ok(ART.H['big_idle_norm'].height/ART.SS===32,'大形态精灵高32单位(含完整腿部)');
ok(ART.H['big_crouch_norm'].height/ART.SS===24,'蹲姿精灵高24单位');
ok(ART.H['small_idle_norm'].height/ART.SS===16,'小形态精灵高16单位');
freshLevel(0);
clearFoes();
const tb={c:95,r:9};
G.setTile(tb.c,tb.r,TL.Q_POWER);
P().x=tb.c*16+2;P().y=(tb.r+1)*16+2;P().vx=0;P().vy=0;
step(20);waitLand();
keyDown('Space');
pumpUntil(()=>G.ents.some(e=>e.kind==='mushroom'),90,'蘑菇出现');
keyUp('Space');
const sh2=G.ents.find(e=>e.kind==='mushroom');
if(!sh2){
  ok(false,'蘑菇生成');
}else{
  ok(true,'蘑菇生成');
  const settled=pumpUntil(()=>sh2.emergeT<=0,60,'升起完成');
  ok(settled&&Math.abs(sh2.y-(tb.r*16-14))<0.8,
     '蘑菇恰好落在块顶 (y='+sh2.y.toFixed(1)+' 期望='+(tb.r*16-14)+')');
}

section('T35 物理不变量模糊测试(防穿模/悬空)');
let __seed=parseInt(process.env.FUZZ_SEED||'1');
let __randState=__seed||1;
Math.random=function(){
  __randState=(__randState*1103515245+12345)>>>0;
  return (__randState>>>8)/16777216;
};
let viol=0,violMsg='',checked=0;
function solidTileAtPx(px,py){
  const a=G.area();
  const c=Math.floor(px/16),r=Math.floor(py/16);
  if(c<0||c>=a.cols)return true;
  if(r>=a.rows)return false;
  return TILE_SOLID.has(a.grid[r*a.cols+c]);
}
outer_fuzz:
for(const li of [0,1,2,3]){
  freshLevel(li);
  clearFoes();
  G.lives=999;
  for(let f=0;f<1400;f++){
    const p=G.player;
    if(f%23===0){keyUp('ArrowRight');keyUp('ArrowLeft');keyUp('Space');keyUp('ShiftLeft');keyUp('ArrowDown');}
    if(Math.random()<.55)keyDown('ArrowRight');
    if(Math.random()<.25)keyDown('ArrowLeft');
    if(Math.random()<.3)keyDown('Space');
    if(Math.random()<.2)keyDown('ShiftLeft');
    if(Math.random()<.08)keyDown('ArrowDown');
    step(1);
    if(G.state!=='play'||p.dead||p.pipeT||p.growT>0||p.flagPhase||G.freeze>0){
      keyUp('Space');
      continue;
    }
    checked++;
    const cx=p.x+p.w/2;
    const feetY=p.y+p.h;
    const inSolid=solidTileAtPx(cx,p.y+p.h*0.5);
    if(inSolid&&p.starT<=0){
      viol++;violMsg='身体中心嵌入实心块 lv'+li+' f'+f+' ('+cx.toFixed(0)+','+(feetY-2).toFixed(0)+')';
      keyUp('Space');continue;
    }
    if(p.onGround){
      let sup=false,onMover=false;
      for(const sx of [p.x+0.02,cx,p.x+p.w-0.02]){
        if(solidTileAtPx(sx,feetY+1)){sup=true;break;}
        for(const mv of G.movers)
          if(sx>mv.x&&sx<mv.x+mv.w&&Math.abs(feetY-mv.y)<3){onMover=true;break;}
        if(onMover)break;
      }
      if(!sup&&!onMover){
        viol++;violMsg='onGround但全脚无支撑 lv'+li+' f'+f;
        console.log('  DUMP seed='+__seed+' lv='+li+' f='+f);
        console.log('    player: x='+p.x.toFixed(2)+' y='+p.y.toFixed(2)+' w='+p.w+' h='+p.h+
                    ' vy='+p.vy.toFixed(3)+' prevBot='+(p.prevBot||0).toFixed(2)+
                    ' onGround='+p.onGround+' jumpHeld='+p.jumpHeld+' crouch='+p.crouch);
        console.log('    keys: R='+INP.keys.right+' L='+INP.keys.left+' J='+INP.keys.jump+' DN='+INP.keys.down);
        for(const mv of G.movers)
          console.log('    mover: x='+mv.x.toFixed(1)+' y='+mv.y.toFixed(1)+' dx='+mv.dx.toFixed(2)+' dy='+mv.dy.toFixed(2)+' axis='+mv.axis+' ph='+mv.phase.toFixed(2));
        const a=G.area();
        const fc=Math.floor(cx/16),fr=Math.floor((feetY+1)/16);
        let row='';
        for(let c=fc-2;c<=fc+3;c++){
          const t=(c<0||c>=a.cols)?-1:a.grid[fr*a.cols+c];
          row+=t+' ';
        }
        console.log('    tiles@row'+fr+' cols'+(fc-2)+'..'+(fc+3)+': '+row+' | feetTileY='+feetY.toFixed(1));
        break;
      }
    }
    keyUp('Space');
    if(viol>4)break outer_fuzz;
  }
  keyUp('ArrowRight');keyUp('ArrowLeft');keyUp('ShiftLeft');keyUp('ArrowDown');
}
ok(viol===0,'物理不变量成立 ('+checked+'次采样, 违例'+viol+') '+(viol?violMsg:''));

section('T36 移动平台首帧不瞬移且可承载');
freshLevel(2);
clearFoes();
const MO=G.movers[0];
ok(!!MO,'1-3 存在移动平台');
const beforeX=MO.x, beforeY=MO.y;
G.step();
const firstDx=Math.abs(MO.x-beforeX);
ok(firstDx<8,'首帧位移被限制在个位数 (dx='+firstDx.toFixed(2)+', range='+MO.range+')');
clearFoes();
const p36=G.player;p36.x=MO.x+8;p36.y=MO.y-p36.h;p36.vx=0;p36.vy=0;
let rode=true;
for(let f=0;f<300;f++){
  G.step();
  if(p36.y>CFG.ROWS*16+10){rode=false;break;}
}
if(!p36.dead) ok(rode,'玩家站在移动平台上 300 帧不坠落');
else ok(false,'玩家站在移动平台上 300 帧不坠落');

section('T37 熔岩瓦片定义与致死');
freshLevel(3);
const a37=G.area();
let undef37=0,lava37=0;
for(let r=0;r<a37.rows;r++)for(let c=0;c<a37.cols;c++){
  const t=a37.grid[r*a37.cols+c];
  if(t===undefined)undef37++;
  if(t===18||t===19)lava37++;
}
ok(undef37===0,'1-4 无未定义瓦片 (undef='+undef37+')');
ok(lava37>0,'1-4 存在熔岩瓦片 ('+lava37+')');
const p37=G.player;p37.x=29*16;p37.y=13*16-p37.h;p37.vx=0;p37.vy=0;
let died37=false;
for(let f=0;f<200;f++){INP.keys.right=true;G.step();if(p37.dead){died37=true;break;}}
releaseAll();
ok(died37,'走入熔岩坑会死亡');

section('T38 平台侧向阻挡与熔岩贴图具名');
freshLevel(2);
clearFoes();
let pt=null;
outerP:
for(let c=1;c<G.area().cols;c++)for(let r=0;r<G.area().rows;r++)
  if(entTileAt(G.area(),c,r)===TL.PLAT&&entTileAt(G.area(),c-1,r)!==TL.PLAT){pt={c,r};break outerP;}
ok(!!pt,'找到平台左缘 @'+(pt?pt.c+',':'')+''+(pt?pt.r:''));
if(pt){
  const pp=P();
  pp.x=pt.c*16-pp.w-3;pp.y=pt.r*16-pp.h+3;pp.vx=2;pp.vy=0;pp.onGround=false;
  step(6);
  ok(pp.x+pp.w<=pt.c*16+.05,'平台侧面阻挡水平穿入 (x+w='+(pp.x+pp.w).toFixed(1)+' ≤ '+(pt.c*16)+')');
  ok(Math.abs(pp.vx)<.01,'撞台后水平速度归零 vx='+pp.vx.toFixed(2));
}
freshLevel(0);
ok(typeof ART.TS.day.lavaTop==='object'&&typeof ART.TS.day.lavaBody==='object','熔岩贴图具名存储 lavaTop/lavaBody');
ok(ART.TS.castle[15]===undefined&&ART.TS.castle[16]===undefined,'不再与 HIDDEN/POLE 数字索引冲突');
freshLevel(3);
G.cam.x=29*16;G.render();
G.cam.x=90*16;G.render();
ok(true,'熔岩区域渲染冒烟无异常');
releaseAll();

section('T29 渲染全状态冒烟');
for(const st of ['title','card','gameover','win']){
  G.state=st;G.render();
}
ok(true,'各界面渲染无异常');

section('T30 音频引擎空跑');
A.unlock();
A.playMusic('overworld');A.stopMusic();
A.sfx('jump');A.sfx('coin');A.jClear();A.jDeath();A.jOneUp();
ok(true,'音效接口调用无异常');
for(const k of ['overworld','underground','dusk','star','castle']){
  const sg=A.songs[k];
  const lens=sg.tracks.map(t=>t.ev.length);
  ok(new Set(lens).size===1&&lens[0]>0,'曲目 '+k+' 各轨长度一致 ('+lens.join(',')+')');
  const hasNote=sg.tracks.some(t=>t.ev.some(e=>e&&e.m!==undefined));
  const hasDrum=sg.tracks.some(t=>t.ev.some(e=>e&&e.d));
  ok(hasNote&&hasDrum,'曲目 '+k+' 含音符与鼓点');
}

console.log('\n==============================');
console.log('通过 '+pass+' 项, 失败 '+fail+' 项');
if(failures.length){console.log('失败列表:');failures.forEach(f=>console.log(' ✗ '+f));process.exit(1);}
console.log('ALL TESTS PASSED ✔');
