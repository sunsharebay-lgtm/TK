const G={
  state:'boot',paused:false,tick:0,
  canvas:null,ctx:null,dpr:1,Z:2,offX:0,offY:0,
  viewW:420,viewH:CFG.VIEW_H,
  cssW:800,cssH:450,
  levelIdx:0,lives:5,score:0,coins:0,hiscore:0,unlocked:1,
  player:null,level:null,areas:[],warps:[],curArea:0,
  ents:[],fx:[],movers:[],bumpAnims:new Map(),
  cam:{x:0},
  timeLeft:300,timeAcc:0,warned:false,
  freeze:0,shakeT:0,
  cpReached:false,flagAnim:0,walkedOff:false,castleDoorX:0,
  cardT:0,clearT:0,menuSel:0,pickLevel:0,howOpen:false,fadeA:1,fadeDir:-1,fadeCb:null,
  overT:0,titleCam:0,
  mode:'relaxed',deaths:0,deathHint:'',starMask:0,starBest:[0,0,0,0],completed:[false,false,false,false],
  toast:'',toastT:0,areaStates:[],pauseSel:0,

  init(){
    this.canvas=document.getElementById('cv');
    this.ctx=this.canvas.getContext('2d');
    try{
      this.hiscore=U.clamp(parseInt(localStorage.getItem('spl_hi'))||0,0,999999999);
      this.unlocked=U.clamp(parseInt(localStorage.getItem('spl_unlock'))||1,1,LV.defs.length);
      const save=JSON.parse(localStorage.getItem('spl_save_v2')||'{}');
      if(save.version===2){
        this.mode=save.mode==='classic'?'classic':'relaxed';
        this.starBest=this.starBest.map((_,i)=>Number.isInteger(save.stars?.[i])?save.stars[i]&7:0);
        this.completed=this.completed.map((_,i)=>save.completed?.[i]===true);
      }
    }catch(e){}
    addEventListener('resize',()=>this.resize());
    this.resize();
    ART.build();
    INP.init();
    this.state='title';
    if(typeof UI!=='undefined')UI.init();
  },

  resize(){
    this.dpr=Math.min(devicePixelRatio||1,2);
    this.cssW=innerWidth;this.cssH=innerHeight;
    this.canvas.width=Math.floor(this.cssW*this.dpr);
    this.canvas.height=Math.floor(this.cssH*this.dpr);
    this.canvas.style.width=this.cssW+'px';
    this.canvas.style.height=this.cssH+'px';
    const touch=INP.touch||(typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches);
    const portrait=touch&&this.cssH>this.cssW;
    const availableH=Math.max(180,this.cssH-(portrait?230:touch?70:76));
    const z=Math.min((this.cssW-(touch?0:32))/this.viewW,availableH/this.viewH,4);
    this.Z=z;
    this.offX=(this.cssW-this.viewW*z)/2;
    this.offY=portrait?60+(availableH-this.viewH*z)/2:(this.cssH-this.viewH*z)/2;
    this.ctx.imageSmoothingEnabled=false;
  },

  saveHi(){
    if(this.score>this.hiscore){
      this.hiscore=this.score;
      try{localStorage.setItem('spl_hi',String(this.hiscore));}catch(e){}
    }
  },
  saveProgress(){
    try{localStorage.setItem('spl_save_v2',JSON.stringify({version:2,mode:this.mode,stars:this.starBest,completed:this.completed}));}catch(e){}
  },
  notify(text){this.toast=text;this.toastT=180;},
  setPaused(value){
    if(this.state!=='play')return;
    this.paused=!!value;this.pauseSel=0;
    if(value)A.pauseMusic();else A.resumeMusic();
  },
  retry(){
    if(this.state!=='play'||this.player.flagPhase)return;
    this.player.die();this.afterDeath();
  },
  unlockNext(){
    if(this.levelIdx+2>this.unlocked){
      this.unlocked=Math.min(LV.defs.length,this.levelIdx+2);
      try{localStorage.setItem('spl_unlock',String(this.unlocked));}catch(e){}
    }
  },

  newGame(){
    this.lives=5;this.score=0;this.coins=0;this.cpReached=false;this.player=null;this.deaths=0;
    this.loadLevel(this.pickLevel);
  },
  loadLevel(i,respawn,carryForm=false){
    i=U.clamp(Number.isInteger(i)?i:0,0,LV.defs.length-1);
    const form=carryForm&&this.player?this.player.form:0;
    const collected=respawn?this.starMask:0;
    this.levelIdx=i;
    this.level=LV.build(i);
    this.areas=this.level.areas;
    this.warps=this.level.warps;
    this.curArea=0;
    this.timeLeft=this.level.time;this.timeAcc=0;this.warned=false;
    this.ents=[];this.fx=[];this.movers=[];this.bumpAnims.clear();this.multiLeft.clear();this.areaStates=[];
    this.starMask=collected;this.freeze=0;this.paused=false;this.flagProg=0;this.shakeT=0;
    this.toastT=0;
    const ar=this.areas[0];
    for(const s of ar.spawns)this.spawnEnt(s);
    if(respawn&&this.cpReached&&ar.cpX>0){
      this.player=new Player(ar.cpX,(SR-2)*PX-14);
      this.cam.x=U.clamp(ar.cpX-this.viewW*.38,0,this.pxW()-this.viewW);
    }else{
      this.cpReached=false;
      this.player=new Player(40,(SR-2)*PX-14);
      this.cam.x=0;
    }
    this.player.setForm(form);
    if(respawn)this.player.invT=120;
    this.walkedOff=false;
    this.state='card';this.cardT=0;this.cardDuration=respawn?22:65;
    this.fadeIn();
    A.stopMusic();A.tempoMult=1;
  },
  spawnEnt(s){
    if(s.t==='goomba')this.ents.push(new Goomba(s.x,s.y));
    else if(s.t==='koopa')this.ents.push(new Koopa(s.x,s.y,false));
    else if(s.t==='para')this.ents.push(new Koopa(s.x,s.y,true));
    else if(s.t==='plant')this.ents.push(new Plant(s.x,s.y));
    else if(s.t==='coin')this.ents.push(new StaticCoin(s.x,s.y));
    else if(s.t==='medal'&&!(this.starMask&(1<<s.id)))this.ents.push(new StarCoin(s.x,s.y,s.id));
    else if(s.t==='mover'){
      const m=new Mover(s.x,s.y,s);this.movers.push(m);
    }
    else if(s.t==='firebar'){
      this.ents.push(new FireBar(s.x,s.y,s));
    }
  },

  area(a){ return this.areas[a===undefined?this.curArea:a]; },
  grid(){ return this.area().grid; },
  pxW(a){ return (this.area(a).cols)*PX; },
  curMusic(){ return this.curArea===1?'underground':LV.defs[this.levelIdx].music; },
  theme(){ return this.curArea===1?'cave':LV.defs[this.levelIdx].theme; },

  step(){
    INP.pollGamepad();
    this.update();
    INP.endFrame();
    if(typeof UI!=='undefined')UI.sync();
  },

  update(){
    this.tick++;
    if(this.toastT>0&&!this.paused)this.toastT--;
    if(this.shakeT>0&&!this.paused)this.shakeT--;
    if(INP.press('mute')){ A.toggleMute(); }
    switch(this.state){
      case 'title': this.upTitle(); break;
      case 'card': this.upCard(); break;
      case 'play': this.upPlay(); break;
      case 'clear': this.upClear(); break;
      case 'gameover':
        this.overT++;
        if(this.overT>40&&(INP.press('confirm')||INP.press('pause'))){ A.sfx('select'); this.toTitle(); }
        break;
      case 'win':
        this.winFx();
        for(const f of this.fx)f.update(this);
        this.fx=this.fx.filter(f=>!f.remove);
        if(INP.press('confirm')){ A.sfx('select'); this.toTitle(); }
        break;
    }
    if(this.fadeDir!==0){
      this.fadeA+=this.fadeDir*.05;
      if(this.fadeA<=0){this.fadeA=0;this.fadeDir=0;}
      else if(this.fadeA>=1){this.fadeA=1;if(this.fadeCb){const cb=this.fadeCb;this.fadeCb=null;cb.call(this);}}
    }
  },
  fadeOut(cb){ this.fadeDir=1;this.fadeCb=cb; },
  fadeIn(){ this.fadeDir=-1; },
  toTitle(){ this.saveHi();this.state='title';this.menuSel=0;this.howOpen=false;this.paused=false;this.fadeCb=null;A.stopMusic();this.fadeIn();INP.clear(); },

  upTitle(){
    this.titleCam+=.6;
    if(this.howOpen){
      if(INP.press('confirm')||INP.press('pause')){this.howOpen=false;A.sfx('select');}
      return;
    }
    const n=4;
    if(INP.just.up){ this.menuSel=(this.menuSel+n-1)%n; A.sfx('select'); }
    if(INP.just.down){ this.menuSel=(this.menuSel+1)%n; A.sfx('select'); }
    if(this.menuSel===2){
      if(INP.just.left){ this.pickLevel=Math.max(0,this.pickLevel-1);A.sfx('select'); }
      if(INP.just.right){ this.pickLevel=Math.min(this.unlocked-1,this.pickLevel+1);A.sfx('select'); }
    }
    if(this.menuSel===3&&(INP.just.left||INP.just.right||INP.just.confirm)){
      this.mode=this.mode==='classic'?'relaxed':'classic';this.saveProgress();return;
    }
    if(INP.press('confirm')){
      if(this.menuSel===1){ this.howOpen=true;A.sfx('select'); }
      else{
        A.sfx('select');
        this.fadeOut(()=>this.newGame());
      }
    }
  },
  upCard(){
    this.cardT++;
    if(this.cardT>this.cardDuration||this.cardT>12&&INP.press('confirm')){
      this.state='play';
      A.playMusic(this.curMusic());
      this.fadeIn();
    }
  },

  upPlay(){
    if(INP.press('pause')){
      this.setPaused(!this.paused);
      A.sfx('pauseBlip');
    }
    if(this.paused){
      if(INP.just.down)this.pauseSel=(this.pauseSel+1)%3;
      if(INP.just.up)this.pauseSel=(this.pauseSel+2)%3;
      if(INP.just.confirm){
        if(this.pauseSel===0)this.setPaused(false);
        else if(this.pauseSel===1)this.retry();
        else this.toTitle();
      }
      return;
    }
    if(this.player.dead){
      this.player.update(this);
      if(this.player.deadT>65||(this.player.deadT>18&&INP.press('confirm')))this.afterDeath();
      return;
    }
    if(this.freeze>0){ this.freeze--; this.player.update(this); return; }
    for(const m of this.movers)m.update(this);
    const ar=this.area();
    if(this.curArea===0&&!this.cpReached&&ar.cpX>0&&this.player.x>ar.cpX&&this.player.onGround&&!this.player.dead){
      this.cpReached=true;
      this.notify('检查点已点亮 · 失误后从这里继续');
      this.sparkle(this.player.x+5,this.player.y-4,'#7ee3ff');
      A.sfx('select');
    }
    this.tryPipeEnter();
    this.player.update(this);
    this.checkFlagGrab();
    for(const e of this.ents)e.update(this);
    this.collidePlayer();
    for(const e of this.ents)if(e.remove)e.gone=true;
    this.ents=this.ents.filter(e=>!e.gone);
    for(const f of this.fx)f.update(this);
    this.fx=this.fx.filter(f=>!f.remove);
    for(const b of this.bumpAnims.values()){
      b.t++;
    }
    for(const [k,b] of this.bumpAnims)if(b.t>12)this.bumpAnims.delete(k);
    this.camera();
    if(this.state==='play'&&!this.player.dead&&!this.player.pipeT&&!this.player.flagPhase)this.timerTick();
  },

  afterDeath(){
    if(this.mode==='classic')this.lives--;
    this.saveHi();
    if(this.mode==='classic'&&this.lives<=0){
      this.state='gameover';this.overT=0;
      A.jGameOver();
    }else{
      this.loadLevel(this.levelIdx,true);
    }
  },

  timerTick(){
    if(this.mode!=='classic')return;
    this.timeAcc++;
    if(this.timeAcc>=CFG.TICK_FRAMES){
      this.timeAcc=0;
      this.timeLeft--;
      if(this.timeLeft===100&&!this.warned){ this.warned=true;A.jWarning();A.tempoMult=1.28; }
      if(this.timeLeft<=0){ this.timeLeft=0;this.player.die('时间到了。下一次可以少走一些弯路，或试试轻松探索。'); }
    }
  },

  camera(){
    const p=this.player;
    const maxX=this.pxW()-this.viewW;
    let target=p.x-this.viewW*.38;
    target=U.clamp(target,0,Math.max(0,maxX));
    if(p.flagPhase==='walkoff'||p.flagPhase==='hop'){
      target=U.clamp(target,Math.min(this.cam.x,maxX),maxX);
    }
    this.cam.x+=(target-this.cam.x)*.16;
    if(Math.abs(target-this.cam.x)<.4)this.cam.x=target;
    this.cam.x=U.clamp(this.cam.x,0,Math.max(0,maxX));
  },

  collidePlayer(){
    const p=this.player;
    if(p.dead||p.pipeT||p.flagPhase||p.growT>0)return;
    for(const f of this.ents){
      if(f.remove)continue;
      if(f instanceof Foe){
        if(!f.active||f.dead&&f.flip||f.squashT>0)continue;
        if(f instanceof Plant&&f.emerge<=.25)continue;
        if(!U.aabb({x:p.x+1,y:p.y,w:p.w-2,h:p.h},f))continue;
        if(p.starT>0){
          f.flipDie(this,p.face,200);
          continue;
        }
        const stomping=p.vy>0&&p.prevBot<=f.y+f.h*.55;
        if(stomping){
          const res=f.onStomp(this,p.combo);
          if(res!==null&&res!==undefined){
            const held=INP.keys.jump;
            p.bounce(held?CFG.STOMP_BOUNCE_HI:res||CFG.STOMP_BOUNCE);
            p.combo++;
            this.puff(p.x+p.w/2,f.y,false);
          }else{
            f.onTouch(this,p);
          }
        }else{
          f.onTouch(this,p);
        }
      }else if(f.type==='item'){
        if(!U.aabb({x:p.x,y:p.y,w:p.w,h:p.h},{x:f.x,y:f.y,w:f.w,h:f.h}))continue;
        if(f.emergeT>10)continue;
        f.collect(this);
      }
    }
  },

  shellVsFoes(shell){
    if(shell.chain===undefined)shell.chain=0;
    for(const f of this.ents){
      if(f===shell||!(f instanceof Foe))continue;
      if(f.dead&&f.flip)continue;
      if(f.squashT>0)continue;
      if(f instanceof Plant&&f.emerge<=.25)continue;
      if(!U.aabb(shell,{x:f.x,y:f.y,w:f.w,h:f.h}))continue;
      const tbl=[400,800,1000,2000,4000,8000];
      if(shell.chain<tbl.length){
        this.addScore(tbl[shell.chain],f.x,f.y);
      }else{
        this.addLife();
      }
      shell.chain++;
      f.flipDie(this,Math.sign(shell.vx)||1,null);
    }
  },

  bumpBlock(c,r){
    const t=entTileAt(this.area(),c,r);
    const key=c+','+r;
    const multiKey=this.curArea+':'+key;
    if([TL.Q_COIN,TL.Q_POWER,TL.Q_STAR,TL.BRICK_COIN,TL.HIDDEN,TL.BRICK].includes(t))this.killOnTop(c,r);
    if(t===TL.Q_COIN){
      this.setTile(c,r,TL.USED);
      this.bumpAnims.set(key,{c,r,t:0});
      const cp=new CoinPop(c*16+1,(r-1)*16);
      this.ents.push(cp);
      this.getCoin(c*16,r*16);
      A.sfx('coin');
      return;
    }
    if(t===TL.Q_POWER){
      this.setTile(c,r,TL.USED);
      this.bumpAnims.set(key,{c,r,t:0});
      A.sfx('itemRise');
      if(this.player.form===0)
        this.ents.push(new Shroom(c*16+1,r*16));
      else
        this.ents.push(new Flower(c*16+1,r*16));
      return;
    }
    if(t===TL.Q_STAR){
      this.setTile(c,r,TL.USED);
      this.bumpAnims.set(key,{c,r,t:0});
      A.sfx('itemRise');
      this.ents.push(new StarItm(c*16+1,r*16));
      return;
    }
    if(t===TL.BRICK_COIN){
      let left=6;
      if(this.multiLeft.has(multiKey))left=this.multiLeft.get(multiKey);
      left--;
      this.multiLeft.set(multiKey,left);
      const cp=new CoinPop(c*16+1,(r-1)*16);
      this.ents.push(cp);
      this.getCoin(c*16,r*16);
      A.sfx('coin');
      this.bumpAnims.set(key,{c,r,t:0});
      if(left<=0)this.setTile(c,r,TL.USED);
      return;
    }
    if(t===TL.HIDDEN){
      this.setTile(c,r,TL.USED);
      this.bumpAnims.set(key,{c,r,t:0});
      A.sfx('itemRise');
      this.ents.push(new Shroom(c*16+1,r*16,true));
      return;
    }
    if(t===TL.BRICK){
      if(this.player.form>0){
        this.setTile(c,r,TL.EMPTY);
        A.sfx('breakBlock');
        this.addScore(50,null);
        this.shakeT=5;
        const cx=c*16+8,cy=r*16+8;
        for(const [vx,vy] of [[-1.4,-5],[1.4,-5],[-.9,-2.6],[.9,-2.6]])
          this.fx.push(new Debris(cx,cy,vx,vy));
      }else{
        this.bumpAnims.set(key,{c,r,t:0});
        A.sfx('bump');
      }
      return;
    }
    A.sfx('bump');
  },
  multiLeft:new Map(),
  setTile(c,r,t){
    const ar=this.area();
    if(c>=0&&c<ar.cols&&r>=0&&r<ar.rows)ar.grid[r*ar.cols+c]=t;
  },
  killOnTop(c,r){
    const box={x:c*16,y:(r-1)*16,w:16,h:16};
    for(const f of this.ents){
      if(!(f instanceof Foe))continue;
      if(f.dead&&f.flip)continue;
      if(U.aabb(box,{x:f.x,y:f.y,w:f.w,h:f.h})){
        f.flipDie(this,1,100);
      }
    }
  },

  getCoin(x,y){
    this.coins++;
    this.addScore(200,null);
    this.sparkle(x+7,y,'#fff2b0');
    A.sfx('coin');
    if(this.coins>=100){
      this.coins-=100;
      this.addLife();
    }
  },
  addScore(n,x,y){
    if(!Number.isFinite(n)||n<=0)return;
    this.score+=n;
    if(x!=null)this.popScore(x,y,String(n));
    this.saveHi();
  },
  popScore(x,y,txt){ this.fx.push(new ScorePop(x,y,txt)); },
  addLife(){
    this.lives++;
    A.jOneUp();
    this.popScore(this.player?this.player.x:this.cam.x+100,this.player?this.player.y-10:120,'1UP');
  },
  puff(x,y,big){ this.fx.push(new DustPuff(x,y,big)); },
  sparkle(x,y,c){ this.fx.push(new SparkleFx(x,y,c)); },
  spawnFireball(p){
    const fx=p.face>0?p.x+p.w:p.x-7;
    const fy=p.form>0?p.y+6:p.y+4;
    this.ents.push(new FireBallEnt(fx,fy,p.face));
    A.sfx('fire');
  },

  tryPipeEnter(){
    const p=this.player;
    if(p.dead||p.flagPhase||!p.onGround||!INP.keys.down||p.pipeT)return;
    const feetR=Math.floor((p.y+p.h+1)/16);
    const cx=p.x+p.w/2;
    const warps=this.warps.filter(w=>w.a===this.curArea);
    for(const w of warps){
      if(w.row!==feetR)continue;
      if(cx>w.col*16+3&&cx<w.col*16+29){
        p.vx=0;p.vy=0;p.crouch=false;
        p.pipeT={phase:'in',t:0,warp:w};
        A.sfx('pipe');
        return;
      }
    }
  },
  finishPipeIn(){
    const p=this.player;
    const dest=p.pipeT.warp.dest;
    this.areaStates[this.curArea]={ents:this.ents.filter(e=>!e.remove),movers:this.movers};
    this.curArea=dest.a;
    const ar=this.area();
    const saved=this.areaStates[this.curArea];
    this.ents=saved?saved.ents:[];
    this.movers=saved?saved.movers:[];
    this.fx=[];
    this.bumpAnims.clear();
    if(!saved)for(const s of ar.spawns)this.spawnEnt(s);
    p.onGround=false;p.coyote=0;p.jbuf=0;
    A.playMusic(p.starT>0?'star':this.curMusic());
    if(dest.mode==='drop'){
      p.x=dest.x-p.w/2;
      p.y=dest.y;
      p.vy=0;p.pipeT=null;
      this.cam.x=U.clamp(p.x-this.viewW*.38,0,Math.max(0,this.pxW()-this.viewW));
    }else{
      p.x=dest.x-p.w/2;
      p.y=dest.y+16;
      p.vy=0;
      p.pipeT={phase:'out',t:0,standY:dest.y-p.h};
      this.cam.x=U.clamp(p.x-this.viewW*.38,0,Math.max(0,this.pxW()-this.viewW));
      A.sfx('pipe');
    }
  },

  checkFlagGrab(){
    const p=this.player;
    if(p.dead||p.flagPhase||p.pipeT)return;
    const fc=this.area().flagCol;
    if(!fc)return;
    const poleX=fc*16;
    if(p.x+p.w>poleX+5&&p.x<poleX+12){
      p.flagPhase='slide';
      p.x=poleX-9;
      p.vx=0;p.vy=0;p.face=1;
      const hAbove=(SR)*16-(p.y+p.h);
      let pts=100;
      if(hAbove>=110)pts=5000;else if(hAbove>=80)pts=2000;
      else if(hAbove>=52)pts=800;else if(hAbove>=26)pts=400;
      this.addScore(pts,p.x,p.y-8);
      A.stopMusic();
      A.sfx('flagpole');
      const cc=this.area().castleCol;
      this.castleDoorX=cc*16+34;
    }
  },

  startClear(){
    this.state='clear';
    this.clearT=0;
    this.tallyTime=this.timeLeft;
    if(this.mode!=='classic')this.timeLeft=0;
    this.fireDone=false;
    this.fwCount=-1;
    this.fwNext=0;
    A.stopMusic();
    A.jClear();
    this.saveHi();
    this.unlockNext();
    this.starBest[this.levelIdx]|=this.starMask;this.completed[this.levelIdx]=true;this.saveProgress();
  },
  upClear(){
    this.clearT++;
    for(const f of this.fx)f.update(this);
    this.fx=this.fx.filter(f=>!f.remove);
    const t=this.clearT;
    if(t>60&&this.timeLeft>0){
      const drain=Math.min(3,this.timeLeft);
      this.timeLeft-=drain;
      this.addScore(this.mode==='classic'?drain*50:0,null);
      if(t%5===0)A.sfx('tick');
      return;
    }
    if(t>60&&this.timeLeft<=0&&this.fwCount<0){
      const lastDigit=this.tallyTime%10;
      this.fwCount=[1,3,6].includes(lastDigit)?lastDigit:0;
      this.fwNext=t+20;
      if(this.fwCount===0)this.fwNext=t;
    }
    if(this.fwCount>0&&t>=this.fwNext){
      const cc=this.area().castleCol;
      this.firework(cc*16+40+U.rand(-30,30),60+U.rand(-20,20));
      this.fwCount--;this.fwNext=t+26;
      A.sfx('fireworkBoom');
    }
    if(this.fwCount===0&&t>this.fwNext+60){
      this.advanceLevel();
    }
  },
  firework(x,y){
    const cols=['#ff5a5a','#ffd94a','#7ee36a','#59c8f2','#c77dff'];
    const c=cols[U.randi(0,cols.length-1)];
    for(let i=0;i<14;i++){
      const a=i/14*Math.PI*2,sp=U.rand(.8,1.8);
      this.fx.push(new FwSpark(x,y,Math.cos(a)*sp,Math.sin(a)*sp,c));
    }
  },
  advanceLevel(){
    this.saveHi();
    if(this.levelIdx+1<LV.defs.length){
      if(!this.fadeCb)this.fadeOut(()=>{ this.cpReached=false; this.loadLevel(this.levelIdx+1,false,true); });
    }else{
      this.state='win';
      this.fadeA=1;this.fadeDir=-1;
    }
  },
  winFx(){
    if(this.tick%50===0){
      const x=U.rand(60,this.viewW-60),y=U.rand(40,140);
      this.firework(x,y);
      A.sfx('fireworkBoom');
    }
  },

  render(){ RND.draw(this); }
};

class FwSpark{
  constructor(x,y,vx,vy,c){
    this.type='fw';this.x=x;this.y=y;this.vx=vx;this.vy=vy;
    this.c=c;this.t=0;this.remove=false;
  }
  update(G){
    this.t++;this.x+=this.vx;this.y+=this.vy;this.vy+=.04;
    if(this.t>46)this.remove=true;
  }
  draw(ctx){
    ctx.globalAlpha=Math.max(0,1-this.t/46);
    ctx.fillStyle=this.c;
    ctx.fillRect(this.x-1.5,this.y-1.5,3,3);
    ctx.globalAlpha=1;
  }
}
