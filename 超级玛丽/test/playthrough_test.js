'use strict';
const assert=require('node:assert/strict');
const {createGame}=require('./runtime.cjs');

// A bounded reactive player: only left/right, run and jump. No teleport,
// removed enemies, extra lives, forced power-ups, or damage suppression.
function drive(game,maxFrames=16000){
  const {G,step,TL,entTileAt}=game;
  let jump=0,maxX=0,stuck=0,back=0;
  const solid=(c,r)=>{const t=entTileAt(G.area(),c,r);return t>=1&&t<=14;};
  for(let frame=0;frame<maxFrames;frame++){
    if(G.state==='clear')return {cleared:true,frames:frame,deaths:G.deaths,score:G.score};
    if(G.state==='gameover')break;
    const p=G.player;
    if(p.dead||G.state==='card'){step();jump=0;continue;}
    const feet=Math.floor((p.y+p.h+1)/16);
    const ahead=d=>Math.floor((p.x+p.w+d)/16);
    const hazard=G.ents.some(e=>!e.dead&&!e.remove&&(
      ['goomba','koopa','plant'].includes(e.type)&&e.x>p.x-2&&e.x-p.x<46&&Math.abs(e.y+e.h-p.y-p.h)<35||
      e.type==='firebar'&&e.cx>p.x&&e.cx-p.x<e.r+34));
    const gap=!solid(ahead(10),feet)||!solid(ahead(17),feet);
    const wall=solid(ahead(24),feet-1)||solid(ahead(34),feet-1);
    // Tap on high platforms to control the landing; hold on ground for distance.
    if(p.onGround&&jump===0&&(gap||wall||hazard))jump=G.theme()==='dusk'?(feet<13?4:22):27;
    const keys={right:!back,left:back>0,run:true,jump:jump>0};
    step(1,keys); if(jump>0)jump--;if(back>0)back--;
    if(p.x>maxX+2){maxX=p.x;stuck=0;}else stuck++;
    if(stuck>120&&p.onGround){back=20;stuck=0;jump=0;}
  }
  return {cleared:false,state:G.state,col:Math.floor(maxX/16),deaths:G.deaths};
}
if(require.main===module){
  let fail=0;
  for(const seed of [1,17,83])for(let level=0;level<4;level++){
    const game=createGame(seed);game.start(level);
    const result=drive(game);
    console.log(`1-${level+1} seed=${seed} ${JSON.stringify(result)}`);
    try{assert.equal(result.cleared,true,`关卡 ${level+1} 必须真实到达结算`);}catch{fail++;}
  }
  const story=createGame(33);story.start(0);
  for(let level=0;level<4;level++){
    const result=drive(story);
    console.log('STORY '+(level+1)+' '+JSON.stringify(result));
    if(!result.cleared){fail++;break;}
    for(let f=0;f<1000&&story.G.state!=='win'&&!(story.G.levelIdx===level+1&&story.G.state==='play');f++)story.step();
  }
  try{
    assert.equal(story.G.state,'win');assert.equal(story.G.unlocked,4);
    assert.equal(story.G.completed.filter(Boolean).length,4);assert.equal(story.G.score,story.G.hiscore);
    console.log('STORY_OK: 连续四关 → 全部解锁 → 最终得分持久化');
  }catch(e){console.error(e.message);fail++;}
  if(fail)process.exitCode=1;
}
module.exports={drive};
