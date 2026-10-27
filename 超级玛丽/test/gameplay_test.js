'use strict';
const assert = require('node:assert/strict');
const { createGame } = require('./runtime.cjs');
let pass = 0, fail = 0;
function test(name, run) {
  try { run(createGame()); pass++; console.log('PASS ' + name); }
  catch (e) { fail++; console.error('FAIL ' + name + ': ' + e.message); }
}
test('敌人和滑行龟壳碰墙后保留速度并反向', ({G,start,Goomba,Koopa}) => {
  start();
  for (const e of [new Goomba(28*16-14,195), new Koopa(28*16-14,191)]) {
    e.active=true; if(e instanceof Koopa) { e.becomeShell(); e.kick(1); }
    else e.vx=.45;
    const speed=Math.abs(e.vx); e.x=28*16-e.w-.1;
    e.physics(G); assert.ok(e.vx<0 && Math.abs(e.vx)===speed);
  }
});
test('火球与无敌击杀正确加分；不会重复奖励', ({G,start,Goomba}) => {
  start(); const e=new Goomba(90,195), score=G.score;
  e.onFire(G); e.onFire(G); assert.equal(G.score,score+200);
});
test('高连踩奖励生命而不会把分数变成字符串', ({G,start,Goomba}) => {
  start(); const lives=G.lives; new Goomba(90,195).onStomp(G,9);
  assert.equal(G.lives,lives+1); assert.ok(Number.isFinite(G.score));
});
test('被击杀的食人花真正消失', ({G,start,Plant,step}) => {
  start(); const e=G.ents.find(e=>e instanceof Plant); e.onFire(G);
  step(120); assert.ok(!G.ents.includes(e));
});
test('过关保留火焰形态；死亡重生恢复小形态', ({G,start}) => {
  start(); G.player.setForm(2); G.loadLevel(1,false,true); assert.equal(G.player.form,2);
  G.loadLevel(1,true); assert.equal(G.player.form,0);
});
test('抓旗后不会超时或受到敌人伤害', ({G,start,step}) => {
  start(); G.timeLeft=1; G.timeAcc=59;
  G.player.x=G.area().flagCol*16; G.player.y=100; G.checkFlagGrab();
  G.player.hurt(); step(65);
  assert.equal(G.player.dead,false); assert.equal(G.timeLeft,1);
});
test('奖励房实际可落地，返回后已取金币不再刷新', ({G,start,StaticCoin,step}) => {
  start(); const warp=G.warps.find(w=>w.a===0);
  G.player.pipeT={warp}; G.finishPipeIn(); step(100);
  assert.equal(G.curArea,1); assert.ok(G.player.onGround && G.player.y>32);
  const coin=G.ents.find(e=>e instanceof StaticCoin); coin.remove=true; step();
  G.player.pipeT={warp:G.warps.find(w=>w.a===1)}; G.finishPipeIn(); step(40);
  G.player.pipeT={warp}; G.finishPipeIn();
  assert.ok(!G.ents.some(e=>e instanceof StaticCoin&&e.x===coin.x&&e.y===coin.y));
});
test('最后一条生命耗尽即结束', ({G,start}) => {
  start(); G.lives=1; G.afterDeath(); assert.equal(G.state,'gameover');
});
test('最终结算奖励进入最高分存档', ({G,start}) => {
  start(3); G.timeLeft=5; G.startClear(); G.clearT=60;
  for(let i=0;i<200;i++) G.upClear();
  assert.equal(G.hiscore,G.score); assert.ok(G.score>=250);
});
test('坏存档不能解锁越界关卡或产生无穷分数', () => {
  const {G}=createGame(1,{spl_unlock:'999999',spl_hi:'Infinity'});
  assert.ok(G.unlocked<=4); assert.ok(Number.isFinite(G.hiscore));
});
test('下蹲缩小碰撞箱，低顶下不能站起', ({G,start,step,TL}) => {
  const p=start(); p.setForm(1); p.x=8*16; p.y=208-p.h;
  step(1,{down:true}); assert.ok(p.h<24);
  G.setTile(8,11,TL.STONE); step(1); assert.equal(p.crouch,true);
  G.setTile(8,11,TL.EMPTY); step(1); assert.equal(p.crouch,false); assert.equal(p.h,24);
});
test('切到后台自动暂停，回来后由玩家恢复', ({G,start,handlers,step}) => {
  start(); handlers.blur.forEach(fn=>fn()); const x=G.player.x; step(20,{right:true});
  assert.equal(G.paused,true); assert.equal(G.player.x,x);
});
test('高分辨率瓦片绘制尺寸与 16×16 碰撞格一致', ({G,start,ART}) => {
  start(); const draws=[];G.ctx.drawImage=(...a)=>draws.push(a);G.render();
  const tiles=new Set(Object.values(ART.TS.day).flat());
  const tileDraws=draws.filter(a=>tiles.has(a[0]));assert.ok(tileDraws.length>20);
  for(const a of tileDraws){assert.equal(a.length,5);assert.equal(a[3],16);assert.equal(a[4],16);}
});
test('轻松探索不限时且失败不扣生命；经典秒数使用真实 60 帧', ({G,start,step}) => {
  start();G.mode='relaxed';const lives=G.lives,time=G.timeLeft;step(180);
  assert.equal(G.timeLeft,time);G.afterDeath();assert.equal(G.lives,lives);
  G.mode='classic';G.timeAcc=0;G.timeLeft=100;for(let i=0;i<60;i++)G.timerTick();assert.equal(G.timeLeft,99);
});
test('移动平台纵向承载不叠加位移', ({G,start,Mover,step}) => {
  start();G.ents=[];const m=new Mover(50,150,{axis:'y',range:16,speed:.4});G.movers=[m];
  G.player.x=60;G.player.y=m.y-G.player.h;G.player.vx=G.player.vy=0;G.player.onGround=true;
  for(let f=0;f<240;f++){step();assert.ok(Math.abs(G.player.y+G.player.h-m.y)<.1);}
});
test('离地宽容允许边缘起跳，落地前按跳会缓冲', ({G,start,step,CFG}) => {
  const p=start();G.ents=[];p.onGround=false;p.coyote=CFG.COYOTE;p.x=69*16;p.y=194;p.vy=1;
  step(1,{jump:true});assert.ok(p.vy<0);
  step();p.x=5*16;p.y=188;p.vy=2;p.onGround=false;p.coyote=0;
  step(1,{jump:true});step(5,{});assert.ok(p.vy<0,'缓冲跳跃应在落地后触发');
});
test('轻点与长按的跳高差异明确', ({G,start,step}) => {
  start();G.ents=[];
  const jump=hold=>{const p=G.player;p.x=80;p.y=194;p.vx=p.vy=0;p.onGround=true;step();let min=194;
    for(let f=0;f<65;f++){step(1,{jump:f<hold});min=Math.min(min,p.y);}return 194-min;};
  const tap=jump(2),held=jump(30);assert.ok(tap>10&&tap<45);assert.ok(held>tap*1.8);
});
test('星币一次性奖励，重生保留本局收集，通关存档可恢复', ({G,start,step}) => {
  start();const medal=G.ents.find(e=>e.type==='medal');G.player.x=medal.x;G.player.y=medal.y;
  const before=G.score;medal.update(G);medal.update(G);assert.equal(G.score,before+1000);
  const mask=G.starMask;G.loadLevel(0,true);assert.equal(G.starMask,mask);
  assert.ok(!G.ents.some(e=>e.type==='medal'&&e.id===medal.id));
  G.startClear();assert.equal(G.starBest[0],mask);
});
test('版本存档在新运行中恢复星币、模式与通关记录', () => {
  const first=createGame();first.start();first.G.starMask=5;first.G.mode='relaxed';first.G.startClear();
  const second=createGame(2,first.storage);
  assert.equal(second.G.starBest[0],5);assert.equal(second.G.completed[0],true);
  assert.equal(second.G.mode,'relaxed');assert.equal(second.G.unlocked,2);
});
test('菜单淡出后关卡介绍会淡入，不被黑幕持续遮住', ({G,step}) => {
  G.fadeA=0;G.fadeOut(()=>G.newGame());step(35);
  assert.equal(G.state,'card');assert.ok(G.fadeA<.5);step(80);assert.equal(G.state,'play');
});
console.log(`GAMEPLAY ${pass} passed, ${fail} failed`);
if(fail)process.exitCode=1;
