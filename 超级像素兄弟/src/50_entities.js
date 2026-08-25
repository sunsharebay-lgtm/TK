function entTileAt(area,c,r){
  if(r>=area.rows)return TL.EMPTY;
  if(c<0||c>=area.cols)return TL.STONE;
  if(r<0)return TL.EMPTY;
  return area.grid[r*area.cols+c];
}

function moveAndCollide(e,area,opt){
  opt=opt||{};
  e.hitWallL=false; e.hitWallR=false; e.hitHead=false; e.headCell=null;
  const T=CFG.TILE;
  const sideSolid=t=>isSolid(t)||t===TL.PLAT;
  e.x+=e.vx;
  let c0,c1,r0,r1,t;
  if(e.vx>0){
    c1=Math.floor((e.x+e.w)/T); c0=c1;
    r0=Math.floor(e.y/T); r1=Math.floor((e.y+e.h-.01)/T);
    for(let r=r0;r<=r1;r++){
      t=entTileAt(area,c1,r);
      if(sideSolid(t)){
        e.x=c1*T-e.w-.01; e.vx=opt.bounceX?-e.vx:0; e.hitWallR=true; break;
      }
    }
  }else if(e.vx<0){
    c0=Math.floor(e.x/T); c1=c0;
    r0=Math.floor(e.y/T); r1=Math.floor((e.y+e.h-.01)/T);
    for(let r=r0;r<=r1;r++){
      t=entTileAt(area,c0,r);
      if(sideSolid(t)){
        e.x=(c0+1)*T+.01; e.vx=opt.bounceX?-e.vx:0; e.hitWallL=true; break;
      }
    }
  }
  const prevBot=e.y+e.h;
  e.y+=e.vy;
  e.onGround=false;
  if(e.vy>0){
    r1=Math.floor((e.y+e.h)/T);
    c0=Math.floor((e.x+.01)/T); c1=Math.floor((e.x+e.w-.01)/T);
    for(let c=c0;c<=c1;c++){
      t=entTileAt(area,c,r1);
      if(isSolid(t)||(t===TL.PLAT&&prevBot<=r1*T+.01)){
        e.y=r1*T-e.h; e.vy=0; e.onGround=true; break;
      }
    }
  }else if(e.vy<0){
    r0=Math.floor(e.y/T);
    c0=Math.floor((e.x+.01)/T); c1=Math.floor((e.x+e.w-.01)/T);
    let best=null,bestOv=0;
    for(let c=c0;c<=c1;c++){
      t=entTileAt(area,c,r0);
      const sol=isSolid(t)||(opt.player&&t===TL.HIDDEN);
      if(sol){
        const ov=Math.min(e.x+e.w,(c+1)*T)-Math.max(e.x,c*T);
        if(!best||ov>bestOv){best={c,r:r0,t};bestOv=ov;}
      }
    }
    if(best){
      e.y=(best.r+1)*T+.01; e.vy=0; e.hitHead=true; e.headCell=best;
    }
  }
}

class Foe{
  constructor(x,y,w,h){
    this.type='foe';
    this.x=x;this.y=y;this.w=w;this.h=h;
    this.vx=-.45;this.vy=0;
    this.active=false;this.dead=false;this.remove=false;
    this.squashT=0;this.flip=false;this.fvy=0;
    this.animT=U.randi(0,30);
  }
  activate(){ this.active=true; }
  baseUpdate(G){
    if(this.flip){
      this.vy+=.38; this.y+=this.vy; this.x+=this.vx;
      if(this.y>CFG.ROWS*16+80)this.remove=true;
      return false;
    }
    if(this.squashT>0){
      this.squashT--;
      if(this.squashT<=0)this.remove=true;
      return false;
    }
    if(!this.active){
      const cam=G.cam.x;
      if(this.x<cam+G.viewW+48)this.activate();
      else return false;
    }
    if(this.x+this.w<G.cam.x-96||this.x>G.cam.x+G.viewW+160){
      if(this.y>CFG.ROWS*16+40)this.remove=true;
      return true;
    }
    this.animT++;
    return true;
  }
  physics(G){
    this.vy=Math.min(this.vy+.42,CFG.MAX_FALL);
    moveAndCollide(this,G.area());
    if(this.hitWallL)this.vx=Math.abs(this.vx);
    if(this.hitWallR)this.vx=-Math.abs(this.vx);
    if(this.y>CFG.ROWS*16+40)this.remove=true;
  }
  stompScore(chain){
    const tbl=[100,200,400,500,800,1000,2000,4000,8000];
    if(chain>=tbl.length){ G.addLife(); return '1UP'; }
    return tbl[chain];
  }
  flipDie(G,vxDir,score){
    if(this.dead)return;
    this.dead=true;this.flip=true;
    this.vy=-4.6;this.vx=(vxDir||0)||1.2;
    A.sfx('kick');
    if(score!=null)G.popScore(this.x,this.y,String(score));
  }
  onStomp(G){ this.flipDie(G,G.player.face,100); return true; }
  onTouch(G,p){ p.hurt(); }
  onFire(G){
    this.flipDie(G,G.player.face,200);
    G.popScore(this.x,this.y,'200');
  }
  draw(){}
}

class Goomba extends Foe{
  constructor(x,y){ super(x,y,13,13); this.type='goomba'; this.vx=-.45; }
  update(G){
    if(!this.baseUpdate(G))return;
    if(this.dead&&this.flip)return;
    this.physics(G);
  }
  onStomp(G,chain){
    this.squashT=26;this.dead=true;this.vx=0;
    A.sfx('stomp');
    const s=this.stompScore(chain||0);
    G.addScore(s,this.x,this.y);
    return CFG.STOMP_BOUNCE;
  }
  draw(ctx,f){
    if(this.squashT>0){ ctx.drawImage(ART.F.goombaFlat,this.x-1,this.y+6,15,7); return; }
    if(this.flip){
      ctx.save();ctx.translate(this.x+7,this.y+7);ctx.scale(1,-1);
      ctx.drawImage(ART.F.goombaA,-7,-7,14,14);ctx.restore();return;
    }
    ctx.drawImage((Math.floor(this.animT/9)%2)?ART.F.goombaB:ART.F.goombaA,this.x-1,this.y-1,15,14);
  }
}

class Koopa extends Foe{
  constructor(x,y,winged){
    super(x,y,13,17);
    this.type='koopa'; this.winged=!!winged;
    this.state=this.winged?'wing':'walk';
    this.vx=-.4;
    this.shellT=0;this.moveShell=false;
  }
  becomeShell(){
    this.state='shell';this.moveShell=false;this.shellT=520;
    this.h=13;const dy=17-13;this.y+=dy;this.vx=0;
  }
  kick(dir){
    this.state='shell';this.moveShell=true;this.shellT=0;
    this.vx=dir*CFG.SHELL_SPEED;
    A.sfx('kick');
  }
  update(G){
    if(!this.baseUpdate(G))return;
    if(this.state==='shell'){
      if(this.moveShell){
        this.physics(G);
        if(this.hitWallL||this.hitWallR){ A.sfx('bump'); }
        G.shellVsFoes(this);
      }else{
        this.physics(G);
        this.vx=0;
        this.shellT--;
        if(this.shellT<=60&&!this.wakeWiggle)this.wakeWiggle=true;
        if(this.shellT<=0){
          if(!U.aabb(this,G.player.expBox())){
            this.state='walk';this.h=17;this.y-=4;this.vx=-.4;
            this.moveShell=false;this.wakeWiggle=false;
          }else this.shellT=30;
        }
      }
      return;
    }
    if(this.state==='wing'){
      this.physics(G);
      if(this.onGround)this.vy=-4.9;
    }else{
      this.physics(G);
    }
  }
  onStomp(G,chain){
    if(this.state==='shell'&&this.moveShell){
      this.moveShell=false;this.vx=0;this.shellT=520;
      A.sfx('stomp');
      return CFG.STOMP_BOUNCE;
    }
    if(this.state==='shell'){
      const dir=G.player.x+G.player.w/2<this.x+this.w/2?1:-1;
      this.kick(dir);
      G.addScore(400,this.x,this.y);
      return CFG.STOMP_BOUNCE_HI;
    }
    A.sfx('stomp');
    if(this.winged){
      this.winged=false;this.state='walk';
      const s=this.stompScore(chain||0);
      G.addScore(s,this.x,this.y);
      return CFG.STOMP_BOUNCE;
    }
    this.becomeShell();
    const s=this.stompScore(chain||0);
    G.addScore(s,this.x,this.y);
    return CFG.STOMP_BOUNCE;
  }
  onTouch(G,p){
    if(this.state==='shell'){
      if(this.moveShell){
        p.hurt();
      }else{
        const dir=p.x+p.w/2<this.x+this.w/2?1:-1;
        this.kick(dir);
        G.addScore(400,this.x,this.y);
      }
      return;
    }
    p.hurt();
  }
  onFire(G){ this.flipDie(G,G.player.face,200); }
  draw(ctx,f){
    const fl=this.flip;
    if(this.state==='shell'){
      if(fl){
        ctx.save();ctx.translate(this.x+7,this.y+7);ctx.scale(1,-1);
        ctx.drawImage(ART.F.shell,-8,-7,16,14);ctx.restore();
      }else{
        ctx.drawImage(this.wakeWiggle&&(Math.floor(f/4)%2)?ART.F.shellWake:ART.F.shell,this.x-1,this.y-1,17,14);
      }
      return;
    }
    if(fl){
      ctx.save();ctx.translate(this.x+8,this.y+10);ctx.scale(1,-1);
      ctx.drawImage(ART.F.koopaA,-8,-10,16,20);ctx.restore();
      return;
    }
    if(this.winged){
      const wf=Math.floor(this.animT/8)%2;
      ctx.drawImage(wf?ART.F.wingB:ART.F.wingA,this.x+(this.vx>0?10:-4),this.y-2,10,8);
    }
    const img=(Math.floor(this.animT/9)%2)?ART.F.koopaB:ART.F.koopaA;
    if(this.vx>0){
      ctx.save();ctx.translate(this.x+8,this.y);ctx.scale(-1,1);
      ctx.drawImage(img,-8,-3,17,21);ctx.restore();
    }else ctx.drawImage(img,this.x-1,this.y-3,17,21);
  }
}

class Plant extends Foe{
  constructor(x,y){
    super(x,y-22,14,22);
    this.type='plant';
    this.baseY=y;
    this.ph='hide';this.pt=U.randi(20,70);
    this.emerge=0;
    this.active=true;this.noGrav=true;
  }
  update(G){
    this.animT++;
    const p=G.player;
    const near=Math.abs(p.x+p.w/2-(this.x+7))<44;
    if(this.ph==='hide'){
      if(!near&&p.form!==99){ this.pt--; if(this.pt<=0){this.ph='rise';} }
    }else if(this.ph==='rise'){
      this.emerge+=.033;
      if(this.emerge>=1){this.emerge=1;this.ph='up';this.pt=110;}
    }else if(this.ph==='up'){
      this.pt--; if(this.pt<=0)this.ph='sink';
    }else{
      this.emerge-=.033;
      if(this.emerge<=0){this.emerge=0;this.ph='hide';this.pt=90;}
    }
    this.y=this.baseY-this.emerge*22;
    if(this.emerge<=0)this.noTouch=true;else this.noTouch=false;
    if(this.y>CFG.ROWS*16+80)this.remove=true;
  }
  onStomp(G){ return null; }
  onTouch(G,p){ if(this.emerge>.25)p.hurt(); }
  onFire(G){ this.dead=true;this.flip=true;this.vy=-4;this.vx=1;A.sfx('kick');G.addScore(200,this.x,this.y); }
  draw(ctx,f){
    if(this.emerge<=0)return;
    ctx.drawImage(Math.floor(f/12)%2?ART.F.plantB:ART.F.plantA,this.x-1,this.y-1,16,23);
  }
}

class Item{
  constructor(x,y,w,h){
    this.type='item';this.x=x;this.y=y;this.w=w;this.h=h;
    this.vx=0;this.vy=0;this.emergeT=32;this.remove=false;
    this.fromY=y;
  }
  emerging(){
    if(this.emergeT<=0)return false;
    this.emergeT--;
    const k=(32-this.emergeT)/32;
    this.y=this.fromY-k*this.h;
    return true;
  }
  drawEmerge(ctx,img,dw,dh){
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x-2,this.fromY-this.h-1,this.w+4,this.h+1);
    ctx.clip();
    ctx.drawImage(img,this.x,this.y,dw,dh);
    ctx.restore();
  }
  physics(G){
    this.vy=Math.min(this.vy+.4,CFG.MAX_FALL);
    moveAndCollide(this,G.area(),{bounceX:true});
    if(this.y>CFG.ROWS*16+40)this.remove=true;
  }
}

class Shroom extends Item{
  constructor(x,y,green){
    super(x,y,14,14);
    this.kind=green?'oneup':'mushroom';
    this.green=!!green;
    this.dir=1;
  }
  update(G){
    if(this.emerging())return;
    this.vx=.85*this.dir;
    this.physics(G);
    if(this.hitWallL)this.dir=1;
    if(this.hitWallR)this.dir=-1;
  }
  collect(G){
    if(this.green){ G.addLife(); }
    else G.player.grow();
    this.remove=true;
  }
  draw(ctx,f){
    const img=this.green?ART.I.oneup:ART.I.mushroom;
    if(this.emergeT>0){ this.drawEmerge(ctx,img,14,14); return; }
    ctx.drawImage(img,this.x,this.y-1,14,14);
  }
}

class Flower extends Item{
  constructor(x,y){
    super(x,y,14,16);
    this.kind='flower';
  }
  update(G){ this.emerging(); }
  collect(G){ G.player.powerFlower(); this.remove=true; }
  draw(ctx,f){
    const img=Math.floor(f/10)%2?ART.I.flowerB:ART.I.flowerA;
    if(this.emergeT>0){ this.drawEmerge(ctx,img,14,16); return; }
    ctx.drawImage(img,this.x,this.y-1,14,16);
  }
}

class StarItm extends Item{
  constructor(x,y){
    super(x,y,14,14);
    this.kind='star';
    this.dir=1;
  }
  update(G){
    if(this.emerging())return;
    this.vx=1.25*this.dir;
    this.physics(G);
    if(this.hitWallL)this.dir=1;
    if(this.hitWallR)this.dir=-1;
    if(this.onGround)this.vy=-5.4;
  }
  collect(G){ G.player.getStar(); this.remove=true; }
  draw(ctx,f){
    if(this.emergeT>0){ this.drawEmerge(ctx,ART.I.star,14,14); return; }
    ctx.save();
    ctx.translate(this.x+7,this.y+7);
    ctx.rotate(Math.sin(f*.08)*.25);
    ctx.drawImage(ART.I.star,-7,-7,14,14);
    ctx.restore();
  }
}

class CoinPop{
  constructor(x,y){
    this.type='coinpop';this.x=x;this.y=y;
    this.vy=-6.4;this.t=0;this.remove=false;
  }
  update(G){
    this.t++;this.vy+=.34;this.y+=this.vy;
    if(this.t>34)this.remove=true;
  }
  draw(ctx,f){
    const fr=Math.floor(this.t/3)%4;
    ctx.drawImage(ART.I.coin[fr],this.x,this.y,14,14);
  }
}

class StaticCoin{
  constructor(x,y){
    this.type='coin';this.x=x;this.y=y;this.w=12;this.h=13;
    this.remove=false;
  }
  update(G){
    const p=G.player;
    if(U.aabb(p,{x:this.x,y:this.y,w:12,h:13})){
      G.getCoin(this.x,this.y);
      this.remove=true;
    }
  }
  draw(ctx,f){
    const fr=Math.floor(f/7)%4;
    ctx.drawImage(ART.I.coin[fr],this.x,this.y-1,14,14);
  }
}

class Mover{
  constructor(x,y,o){
    this.type='mover';
    this.x=x;this.y=y;this.w=o.w||44;this.h=8;
    this.axis=o.axis||'x';this.range=o.range||64;
    this.speed=o.speed||.6;
    this.phase=Math.random()*6.28;
    this.bx=x;this.by=y;
    this.dx=0;this.dy=0;
    this.remove=false;
    if(this.axis==='x')this.x=this.bx+Math.sin(this.phase)*this.range;
    else this.y=this.by+Math.sin(this.phase)*this.range;
  }
  update(G){
    this.phase+=this.speed/this.range*2.4;
    if(this.axis==='x'){
      const nx=this.bx+Math.sin(this.phase)*this.range;
      this.dx=nx-this.x;this.dy=0;this.x=nx;
    }else{
      const ny=this.by+Math.sin(this.phase)*this.range;
      this.dy=ny-this.y;this.dx=0;this.y=ny;
    }
  }
  draw(ctx,f){
    const g=ctx.createLinearGradient(this.x,this.y,this.x,this.y+8);
    g.addColorStop(0,'#ffd45a');g.addColorStop(1,'#c98a1a');
    ctx.fillStyle=g;
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(this.x,this.y,this.w,8,3);
    else ctx.rect(this.x,this.y,this.w,8);
    ctx.fill();
    ctx.fillStyle='#fff2b0';
    ctx.fillRect(this.x+3,this.y+1,this.w-6,2);
  }
}

class FireBallEnt{
  constructor(x,y,dir){
    this.type='fireball';this.x=x;this.y=y;this.w=7;this.h=7;
    this.vx=CFG.FIRE_VX*dir;this.vy=1.5;
    this.t=0;this.remove=false;this.explodeT=0;
  }
  update(G){
    if(this.explodeT>0){
      this.explodeT--;
      if(this.explodeT<=0)this.remove=true;
      return;
    }
    this.t++;
    this.vy=Math.min(this.vy+.3,5);
    moveAndCollide(this,G.area(),{bounceX:false});
    if(this.hitWallL||this.hitWallR||this.hitHead){ this.boom(G); return; }
    if(this.onGround)this.vy=-3.5;
    if(this.t>260||this.y>CFG.ROWS*16+40||this.x<G.cam.x-40||this.x>G.cam.x+G.viewW+40)this.remove=true;
    for(const f of G.ents){
      if(f===this||!(f instanceof Foe))continue;
      if(f.dead||!f.active)continue;
      if(f instanceof Plant&&f.emerge<=.2)continue;
      if(U.aabb(this,f)){ f.onFire(G); this.boom(G); break; }
    }
  }
  boom(G){
    this.explodeT=8;
    G.sparkle(this.x+3,this.y+3,'#ffb040');
  }
  draw(ctx,f){
    if(this.explodeT>0){
      ctx.globalAlpha=this.explodeT/8;
      ctx.fillStyle='#ffdf80';
      ctx.beginPath();ctx.arc(this.x+3,this.y+3,6*(1-this.explodeT/10)+3,0,7);ctx.fill();
      ctx.globalAlpha=1;return;
    }
    ctx.drawImage(ART.I.fireball[Math.floor(f/4)%2],this.x-1,this.y-1,9,9);
  }
}

class Debris{
  constructor(x,y,vx,vy){
    this.type='debris';this.x=x;this.y=y;this.vx=vx;this.vy=vy;
    this.rot=0;this.t=0;this.remove=false;
  }
  update(G){
    this.t++;this.vy+=.34;this.x+=this.vx;this.y+=this.vy;this.rot+=.18;
    if(this.y>CFG.ROWS*16+40)this.remove=true;
  }
  draw(ctx){
    ctx.save();ctx.translate(this.x+3,this.y+3);ctx.rotate(this.rot);
    ctx.drawImage(ART.M.debris,-3,-3,6,6);ctx.restore();
  }
}

class DustPuff{
  constructor(x,y,big){
    this.type='dust';this.x=x;this.y=y;this.t=0;this.big=big;this.remove=false;
  }
  update(G){ this.t++; if(this.t>(this.big?22:14))this.remove=true; }
  draw(ctx){
    const life=this.big?22:14,k=life-(this.big?22:14)+ (this.big?this.t:this.t);
    const p=this.t/life;
    ctx.globalAlpha=(1-p)*.55;
    ctx.fillStyle='#ffffff';
    const r=(this.big?7:4)*(0.6+p);
    ctx.beginPath();ctx.arc(this.x,this.y,r,0,7);ctx.fill();
    ctx.globalAlpha=1;
  }
}

class SparkleFx{
  constructor(x,y,color){
    this.type='sparkle';this.x=x;this.y=y;this.c=color||'#fff';this.t=0;this.remove=false;
  }
  update(G){ this.t++; if(this.t>12)this.remove=true; }
  draw(ctx){
    const p=this.t/12,s=(1-p)*7+2;
    ctx.globalAlpha=1-p;
    ctx.strokeStyle=this.c;ctx.lineWidth=1.6;
    ctx.beginPath();
    ctx.moveTo(this.x-s,this.y);ctx.lineTo(this.x+s,this.y);
    ctx.moveTo(this.x,this.y-s);ctx.lineTo(this.x,this.y+s);
    ctx.stroke();
    ctx.globalAlpha=1;
  }
}

class ScorePop{
  constructor(x,y,txt){
    this.type='pop';this.x=x;this.y=y;this.txt=txt;this.t=0;this.remove=false;
  }
  update(G){ this.t++;this.y-=.7; if(this.t>44)this.remove=true; }
  draw(ctx){
    ctx.globalAlpha=1-Math.max(0,(this.t-28)/16);
    ctx.font='bold 8px monospace';
    ctx.textAlign='center';
    ctx.lineWidth=2;ctx.strokeStyle='rgba(20,20,40,.9)';
    ctx.strokeText(this.txt,this.x+7,this.y);
    ctx.fillStyle='#fff';
    ctx.fillText(this.txt,this.x+7,this.y);
    ctx.textAlign='left';
    ctx.globalAlpha=1;
  }
}

class FireBar{
  constructor(cx,cy,o){
    this.type='firebar';
    this.cx=cx;this.cy=cy;
    this.n=o.n||5;this.r=o.r||38;
    this.speed=o.speed||.05;
    this.ang=U.rand(0,6.28);
    this.remove=false;
  }
  update(G){
    this.ang+=this.speed;
    const p=G.player;
    if(p.starT>0||p.dead||p.pipeT||G.state!=='play')return;
    for(let i=1;i<=this.n;i++){
      const bx=this.cx+Math.cos(this.ang)*i*(this.r/this.n);
      const by=this.cy+Math.sin(this.ang)*i*(this.r/this.n);
      if(U.aabb(p,{x:bx-3.5,y:by-3.5,w:7,h:7})){ p.hurt(); break; }
    }
  }
  draw(ctx,f){
    for(let i=1;i<=this.n;i++){
      const bx=this.cx+Math.cos(this.ang)*i*(this.r/this.n);
      const by=this.cy+Math.sin(this.ang)*i*(this.r/this.n);
      ctx.drawImage(ART.I.fireball[Math.floor(f/4+i)%2],bx-4,by-4,9,9);
    }
    ctx.fillStyle='#54424a';
    ctx.fillRect(this.cx-2,this.cy-2,4,4);
  }
}
