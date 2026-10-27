class Player{
  constructor(x,y){
    this.type='player';
    this.x=x;this.y=y;
    this.w=11;this.h=14;
    this.vx=0;this.vy=0;
    this.face=1;
    this.form=0;
    this.onGround=false;
    this.coyote=0;this.jbuf=0;this.jumpHeld=false;
    this.invT=0;this.starT=0;
    this.crouch=false;
    this.dead=false;this.deadT=0;
    this.growT=0;this.growMode='';
    this.pipeT=null;
    this.flagPhase=null;
    this.throwT=0;this.throwCd=0;
    this.animDist=0;this.skid=false;
    this.prevBot=this.y+this.h;
    this.combo=0;
    this.hidden=false;
    this.fireHeldPrev=false;
    this.landT=0;this.stretchT=0;
  }
  expBox(){ return {x:this.x-2,y:this.y-2,w:this.w+4,h:this.h+4}; }
  setForm(f){
    const nh=f===0?14:24;
    const nw=f===0?11:12;
    this.y+=this.h-nh;
    this.h=nh;this.w=nw;
    this.form=f;
    this.crouch=false;
  }
  doJump(G){
    this.vy=CFG.JUMP_V-Math.abs(this.vx)*CFG.JUMP_SPD_BONUS;
    this.jbuf=0;this.coyote=0;this.jumpHeld=true;this.onGround=false;
    this.stretchT=9;
    A.sfx(this.form>0?'bigjump':'jump');
  }
  bounce(v){ this.vy=v; this.jumpHeld=false; }
  hurt(){
    if(this.dead||this.invT>0||this.starT>0)return;
    if(this.form>0){
      this.setForm(0);
      this.invT=130;this.growT=40;this.growMode='shrink';
      A.sfx('pipe');
    }else{
      this.die();
    }
  }
  die(){
    if(this.dead)return;
    this.dead=true;this.deadT=0;this.vy=-7.6;this.vx=0;
    A.stopMusic();A.jDeath();
  }
  grow(){
    if(this.form===0){
      this.growT=44;this.growMode='grow';
      G.freeze=44;
      A.sfx('power');
    }
    G.addScore(1000,this.x,this.y);
  }
  powerFlower(){
    if(this.form<1){
      this.grow();return;
    }
    if(this.form===1){
      this.growT=44;this.growMode='fire';
      G.freeze=44;
      A.sfx('power');
    }
    G.addScore(1000,this.x,this.y);
  }
  getStar(){
    this.starT=CFG.STAR_TIME;
    A.sfx('power');
    A.playMusic('star');
    G.addScore(1000,this.x,this.y);
  }
  update(G){
    if(this.growT>0){
      this.growT--;
      if(this.growT===0){
        if(this.growMode==='grow')this.setForm(1);
        else if(this.growMode==='fire')this.setForm(2);
        this.growMode='';
      }
      return;
    }
    if(this.dead){
      this.deadT++;
      if(this.deadT>14){
        this.vy=Math.min(this.vy+.4,7);
        this.y+=this.vy;
      }
      return;
    }
    if(this.pipeT){
      const pt=this.pipeT;
      pt.t++;
      if(pt.phase==='in'){
        this.y+=.8;
        if(pt.t>=30)G.finishPipeIn();
      }else{
        this.y-=.75;
        if(pt.t>=32){ this.pipeT=null; this.y=pt.standY; }
      }
      return;
    }
    if(this.flagPhase){
      if(this.flagPhase==='slide'){
        this.y+=2.1;
        const baseY=(SR)*16-this.h;
        if(this.y>=baseY){
          this.y=baseY;
          this.flagPhase='hop';
          this.hopT=10;
        }
        return;
      }
      if(this.flagPhase==='hop'){
        this.hopT--;
        this.vy=-2.4;this.y+=this.vy;
        this.x+=1;
        if(this.hopT<=0)this.flagPhase='walkoff';
        return;
      }
      if(this.flagPhase==='walkoff'){
        this.vx=1.15;
        this.animDist+=Math.abs(this.vx);
        this.x+=this.vx;
        this.vy=Math.min(this.vy+.46,CFG.MAX_FALL);
        moveAndCollide(this,G.area());
        if(!G.walkedOff&&this.x>G.castleDoorX){
          G.walkedOff=true;
          this.hidden=true;
          G.startClear();
        }
        return;
      }
    }

    const K=INP.keys,J=INP.just;

    const wantCrouch=K.down&&this.form>0&&this.onGround;
    this.crouch=wantCrouch;

    let ax=0;
    const L=K.left,R=K.right;
    if(L&&!R&&!this.crouch)ax=-1;
    if(R&&!L&&!this.crouch)ax=1;

    const maxSpd=K.run?CFG.MAX_RUN:CFG.MAX_WALK;
    const acc=K.run?CFG.ACC_RUN:CFG.ACC_WALK;

    this.skid=false;
    if(ax!==0){
      if(Math.sign(this.vx)===-ax&&Math.abs(this.vx)>.35){
        this.vx=U.approach(this.vx,0,CFG.SKID);
        this.skid=true;
        if(this.onGround&&Math.floor(G.tick%5)===0)
          G.puff(this.x+this.w/2,this.y+this.h-2,false);
      }else{
        this.vx=U.approach(this.vx,ax*maxSpd,acc);
      }
      this.face=ax;
    }else{
      if(this.onGround)this.vx=U.approach(this.vx,0,CFG.FRICTION);
    }

    if(J.jump)this.jbuf=CFG.JBUF;
    else if(this.jbuf>0)this.jbuf--;

    if(K.jump&&this.vy<0)this.jumpHeld=true;
    else if(!K.jump){
      if(this.jumpHeld&&this.vy<CFG.JUMP_CUT)this.vy=CFG.JUMP_CUT;
      this.jumpHeld=false;
    }

    if(this.jbuf>0&&(this.onGround||this.coyote>0)){
      this.doJump(G);
    }

    const g=(this.vy<0&&this.jumpHeld)?CFG.GRAV_HOLD:CFG.GRAV;
    this.vy=Math.min(this.vy+g,CFG.MAX_FALL);

    const wasGround=this.onGround;
    const fallV=this.vy;
    this.prevBot=this.y+this.h;
    moveAndCollide(this,G.area(),{player:true});
    if(this.hitHead&&this.headCell)G.bumpBlock(this.headCell.c,this.headCell.r);

    for(const mv of G.movers){
      const top=mv.y;
      if(this.vy>=0&&this.x+this.w>mv.x&&this.x<mv.x+mv.w&&
         this.prevBot<=top+Math.max(2,mv.dy+1)&&this.y+this.h>=top&&this.y+this.h<=top+10){
        this.y=top-this.h;this.vy=0;this.onGround=true;
        this.x+=mv.dx;this.y+=mv.dy;
      }
    }

    if(this.onGround){
      this.coyote=CFG.COYOTE;this.combo=0;
      if(!wasGround&&fallV>3.4){
        G.puff(this.x+this.w/2,this.y+this.h,true);
        this.landT=9;
      }
    }else if(this.coyote>0)this.coyote--;

    if(this.x<0){this.x=0;this.vx=0;}
    if(this.x+this.w>G.pxW()){this.x=G.pxW()-this.w;this.vx=0;}

    if(this.y>CFG.ROWS*16+28){ this.die(); return; }
    const lavaRow=Math.floor((this.y+this.h-2)/16);
    const lavaL=entTileAt(G.area(),Math.floor((this.x+2)/16),lavaRow);
    const lavaR=entTileAt(G.area(),Math.floor((this.x+this.w-2)/16),lavaRow);
    if(lavaL===TL.LAVA_T||lavaL===TL.LAVA_B||lavaR===TL.LAVA_T||lavaR===TL.LAVA_B){ this.starT=0; this.die(); return; }

    if(this.starT>0){
      this.starT--;
      if(this.starT===0)A.playMusic(G.curMusic());
      if(this.starT>0&&this.starT%4===0)
        G.sparkle(this.x+U.rand(0,this.w),this.y+U.rand(0,this.h),'#fff2b0');
    }
    if(this.invT>0)this.invT--;
    if(this.landT>0)this.landT--;
    if(this.stretchT>0)this.stretchT--;
    if(this.throwCd>0)this.throwCd--;
    if(this.throwT>0)this.throwT--;

    if(J.run&&this.form===2&&this.fireCount()<CFG.FIRE_MAX&&this.throwCd<=0){
      G.spawnFireball(this);
      this.throwT=9;this.throwCd=13;
    }
    this.fireHeldPrev=K.run;

    this.animDist+=Math.abs(this.vx)*(this.onGround?1:.4);
  }
  fireCount(){ return G.ents.filter(e=>e.type==='fireball'&&e.explodeT<=0).length; }
  poseName(){
    if(this.dead)return ['dead','small'];
    if(this.growT>0){
      const flipPhase=Math.floor(this.growT/5)%2===0;
      if(this.growMode==='grow')return flipPhase?['idle','small']:['idle','big'];
      if(this.growMode==='shrink')return flipPhase?['idle','small']:['idle','big'];
      if(this.growMode==='fire')return flipPhase?['idle','big']:['idle','fire'];
    }
    if(this.pipeT)return ['jump',this.form>0?'big':'small'];
    if(this.flagPhase==='slide')return ['skid',this.form>0?'big':'small'];
    if(this.flagPhase==='hop'||this.flagPhase==='walkoff'){
      const moving=this.flagPhase==='walkoff';
      if(moving){
        const fi=Math.floor(this.animDist/7)%3;
        return [['walk1','walk2','walk3'][fi],this.form>0?'big':'small'];
      }
      return ['jump',this.form>0?'big':'small'];
    }
    if(this.crouch)return ['crouch','big'];
    if(!this.onGround)return ['jump',this.form>0?'big':'small'];
    if(this.skid)return ['skid',this.form>0?'big':'small'];
    if(Math.abs(this.vx)>.18){
      const fi=Math.floor(this.animDist/7)%3;
      return [['walk1','walk2','walk3'][fi],this.form>0?'big':'small'];
    }
    return ['idle',this.form>0?'big':'small'];
  }
  palName(){
    if(this.starT>0){
      const seq=['norm','st1','st2','st1'];
      return seq[Math.floor(G.tick/3)%seq.length];
    }
    if(this.form===2&&!(this.growT>0&&this.growMode==='shrink'))return 'fire';
    if(this.growT>0&&this.growMode==='fire'&&Math.floor(this.growT/5)%2)return 'fire';
    return 'norm';
  }
  draw(ctx,f){
    if(this.hidden)return;
    if(this.invT>0&&!this.dead&&Math.floor(f/3)%2)return;
    const [pose,sizeKey]=this.poseName();
    const pk=this.palName();
    const key=sizeKey==='fire'?'big_'+pose+'_'+(pk==='fire'?'fire':pk):sizeKey+'_'+pose+'_'+pk;
    const img=ART.H[key]||ART.H[sizeKey+'_'+pose+'_norm']||ART.H['small_idle_norm'];
    const dw=img.width/ART.SS,dh=img.height/ART.SS;
    const cx=this.x+this.w/2;
    const ox=cx-dw/2+(dw>this.w+2?-this.face*0.5:0);
    const oy=this.y+this.h-dh+1;
    let sy=1,sx=1;
    if(this.landT>0){const k=this.landT/9;sy=1-.14*k;sx=1+.10*k;}
    else if(this.stretchT>0&&!this.onGround){const k=this.stretchT/9;sy=1+.10*k;sx=1-.08*k;}
    ctx.save();
    if(this.face<0){
      ctx.translate(cx*2,0);ctx.scale(-1,1);
    }
    if(sx!==1||sy!==1){
      ctx.translate(cx,this.y+this.h);
      ctx.scale(sx,sy);
      ctx.translate(-cx,-(this.y+this.h));
    }
    ctx.drawImage(img,this.face<0?(cx-dw/2):ox,oy,dw,dh);
    ctx.restore();
  }
}
