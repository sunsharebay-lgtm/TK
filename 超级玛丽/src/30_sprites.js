const ART = {
  SS:4,
  cv(w,h){
    const c=document.createElement('canvas');
    c.width=Math.ceil(w*this.SS); c.height=Math.ceil(h*this.SS);
    const g=c.getContext('2d');
    g.scale(this.SS,this.SS);
    g.imageSmoothingEnabled=false;
    return c;
  },
  R(g,x,y,w,h,c){ g.fillStyle=c; g.fillRect(x+.001,y+.001,w-.002,h-.002); },

  build(){
    this.hero();
    this.foes();
    this.items();
    this.tilesDay();
    this.tilesCave();
    this.tilesDusk();
    this.tilesCastle();
    this.bgBits();
    this.misc();
  },

  heroPal(base,over){
    const d={
      cap:'#e23b2e',capD:'#a82419',skin:'#ffd9a8',skinD:'#eeb986',
      hair:'#6b3a1f',eye:'#20242c',
      overall:'#2f66d0',overallD:'#20479a',
      shirt:'#e23b2e',shirtD:'#a82419',
      boot:'#7a4020',sole:'#4c250c',
      glove:'#ffffff',emblem:'#ffd94a'
    };
    return Object.assign(d,base,over||{});
  },

  heroHead(g,p,dx,dy,face){
    this.R(g,2+dx,3+dy,11,8,p.skin);
    this.R(g,1+dx,4+dy,2,4,p.hair);
    this.R(g,2+dx,9+dy,11,2,p.skinD);
    this.R(g,3+dx,0+dy,9,3,p.cap);
    this.R(g,3+dx,2+dy,9,1,p.capD);
    this.R(g,8+dx,3+dy,7,2,p.cap);
    this.R(g,8+dx,4+dy,7,1,p.capD);
    this.R(g,5+dx,1+dy,3,2,p.emblem);
    if(face==='dead'){
      this.R(g,9+dx,5+dy,3,1,p.eye);this.R(g,9+dx,7+dy,3,1,p.eye);
      this.R(g,8+dx,6+dy,1,1,p.eye);this.R(g,12+dx,6+dy,1,1,p.eye);
      this.R(g,10+dx,6+dy,1,1,p.eye);
    }else{
      this.R(g,9+dx,5+dy,2,3,'#fff');
      this.R(g,10+dx,6+dy,1,2,p.eye);
      this.R(g,9+dx,4+dy,3,1,p.hair);
    }
    this.R(g,12+dx,7+dy,2,2,p.skinD);
    this.R(g,9+dx,9+dy,3,1,'#b06a3a');
    this.R(g,4+dx,8+dy,1,1,'#e8a06a');
    this.R(g,6+dx,8+dy,1,1,'#e8a06a');
  },

  heroTorso(g,p,dx,dy,big){
    if(big){
      this.R(g,3+dx,11+dy,10,2,p.shirt);
      this.R(g,3+dx,13+dy,9,8,p.overall);
      this.R(g,3+dx,13+dy,9,1,p.overallD);
      this.R(g,4+dx,11+dy,2,3,p.overall);
      this.R(g,9+dx,11+dy,2,3,p.overall);
      this.R(g,5+dx,14+dy,1,1,'#ffd94a');
      this.R(g,9+dx,14+dy,1,1,'#ffd94a');
      this.R(g,3+dx,21+dy,9,1,p.overallD);
    }else{
      this.R(g,4+dx,9+dy,8,2,p.shirt);
      this.R(g,4+dx,11+dy,8,3,p.overall);
      this.R(g,5+dx,11+dy,1,1,'#ffd94a');
      this.R(g,9+dx,11+dy,1,1,'#ffd94a');
    }
  },

  heroBoot(g,p,x,y,w){
    this.R(g,x,y,w,3,p.boot);
    this.R(g,x,y+3,w,1,p.sole);
  },

  hero(){
    const P={
      norm:this.heroPal(),
      fire:this.heroPal({cap:'#fdf3df',capD:'#cdb98f',shirt:'#fdf3df',shirtD:'#cdb98f',overall:'#e23b2e',overallD:'#a82419',emblem:'#e23b2e'}),
      st1:this.heroPal({cap:'#f7c531',capD:'#c2931a',shirt:'#f7c531',shirtD:'#c2931a',overall:'#43b054',overallD:'#2e7f3a',emblem:'#fff'}),
      st2:this.heroPal({cap:'#59c8f2',capD:'#2f92bd',shirt:'#59c8f2',shirtD:'#2f92bd',overall:'#ef8f2f',overallD:'#c26a17',emblem:'#fff'})
    };
    const pals=['norm','fire','st1','st2'];
    const poses=['idle','walk1','walk2','walk3','jump','skid','dead'];
    this.H={};
    for(const pk of pals){
      for(const pose of poses){
        if(pose==='dead'){
          this.H['small_'+pose+'_'+pk]=this.mkHeroSmallDead(P[pk]);
          continue;
        }
        if(pose!=='dead')
          this.H['big_'+pose+'_'+pk]=this.mkHeroBig(P[pk],pose);
        this.H['small_'+pose+'_'+pk]=this.mkHeroSmall(P[pk],pose);
      }
      this.H['big_crouch_'+pk]=this.mkHeroCrouch(P[pk]);
    }
  },

  mkHeroBig(p,pose){
    const c=this.cv(16,32),g=c.getContext('2d');
    let la=[4,23],lb=[8,23],armF=[12,15],bodyY=0;
    if(pose==='walk1'){la=[2,22];lb=[9,23];armF=[13,14];}
    else if(pose==='walk2'){la=[5,23];lb=[7,23];armF=[12,15];}
    else if(pose==='walk3'){la=[8,22];lb=[3,23];armF=[11,16];}
    else if(pose==='jump'){la=[3,19];lb=[9,19];armF=[13,10];bodyY=-1;}
    else if(pose==='skid'){la=[3,23];lb=[10,23];armF=[13,17];}
    this.R(g,6,11+bodyY,4,2,p.skin);
    this.R(g,3,13+bodyY,10,2,p.shirt);
    this.R(g,armF[0],armF[1]+bodyY,3,4,p.shirt);
    this.R(g,armF[0],armF[1]+4+bodyY,3,2,p.glove);
    this.R(g,3,15+bodyY,9,8,p.overall);
    this.R(g,3,15+bodyY,9,1,p.overallD);
    this.R(g,4,13+bodyY,2,3,p.overall);
    this.R(g,9,13+bodyY,2,3,p.overall);
    this.R(g,5,16+bodyY,1,1,'#ffd94a');
    this.R(g,9,16+bodyY,1,1,'#ffd94a');
    this.R(g,3,22+bodyY,9,1,p.overallD);
    this.R(g,la[0],la[1],3,5,p.overall);
    this.R(g,lb[0],lb[1],3,5,p.overall);
    this.heroBoot(g,p,la[0]-1,la[1]+5,5);
    this.heroBoot(g,p,lb[0]-1,lb[1]+5,5);
    this.heroHead(g,p,0,0,'live');
    return c;
  },

  mkHeroSmall(p,pose){
    const c=this.cv(16,16),g=c.getContext('2d');
    let fa=[4,13],fb=[8,13],armY=11;
    if(pose==='walk1'){fa=[2,13];fb=[10,13];armY=10;}
    else if(pose==='walk2'){fa=[5,13];fb=[8,13];}
    else if(pose==='walk3'){fa=[9,13];fb=[3,13];armY=12;}
    else if(pose==='jump'){fa=[3,11];fb=[9,11];armY=8;}
    this.R(g,3,0,9,3,p.cap);
    this.R(g,3,2,9,1,p.capD);
    this.R(g,8,3,6,2,p.cap);
    this.R(g,8,4,6,1,p.capD);
    this.R(g,5,1,2,2,p.emblem);
    this.R(g,2,5,11,6,p.skin);
    this.R(g,2,10,11,1,p.skinD);
    this.R(g,1,6,2,3,p.hair);
    this.R(g,9,6,2,2,'#fff');
    this.R(g,10,6,1,2,p.eye);
    this.R(g,9,5,3,1,p.hair);
    this.R(g,12,8,2,2,p.skinD);
    this.R(g,9,10,3,1,'#b06a3a');
    this.R(g,4,11,8,2,p.shirt);
    this.R(g,11,armY,3,3,p.shirt);
    this.R(g,11,armY+3,3,2,p.glove);
    this.R(g,4,12,8,3,p.overall);
    this.R(g,5,12,1,1,'#ffd94a');
    this.R(g,9,12,1,1,'#ffd94a');
    this.R(g,fa[0],fa[1],3,2,p.boot);
    this.R(g,fb[0],fb[1],3,2,p.boot);
    return c;
  },

  mkHeroSmallDead(p){
    const c=this.cv(16,16),g=c.getContext('2d');
    this.R(g,3,0,9,3,p.cap);
    this.R(g,3,2,9,1,p.capD);
    this.R(g,8,3,6,2,p.cap);
    this.R(g,8,4,6,1,p.capD);
    this.R(g,5,1,2,2,p.emblem);
    this.R(g,2,5,11,6,p.skin);
    this.R(g,2,10,11,1,p.skinD);
    this.R(g,1,6,2,3,p.hair);
    this.R(g,9,6,3,1,p.eye);
    this.R(g,9,8,3,1,p.eye);
    this.R(g,8,7,1,1,p.eye);
    this.R(g,12,7,1,1,p.eye);
    this.R(g,10,7,1,1,p.eye);
    this.R(g,12,8,2,2,p.skinD);
    this.R(g,10,10,2,2,'#5a1010');
    this.R(g,3,11,10,2,p.shirt);
    this.R(g,0,10,3,3,p.shirt);
    this.R(g,13,10,3,3,p.shirt);
    this.R(g,0,9,3,1,p.glove);
    this.R(g,13,9,3,1,p.glove);
    this.R(g,4,13,8,2,p.overall);
    this.R(g,4,15,3,1,p.boot);
    this.R(g,9,15,3,1,p.boot);
    return c;
  },

  mkHeroCrouch(p){
    const c=this.cv(16,24),g=c.getContext('2d');
    this.R(g,3,16,10,2,p.shirt);
    this.R(g,3,18,9,4,p.overall);
    this.R(g,5,19,1,1,'#ffd94a');this.R(g,9,19,1,1,'#ffd94a');
    this.R(g,3,22,4,2,p.boot);
    this.R(g,9,22,4,2,p.boot);
    this.heroHead(g,p,0,5,'live');
    return c;
  },

  foes(){
    this.F={};
    this.F.goombaA=this.mkGoomba(0); this.F.goombaB=this.mkGoomba(1);
    this.F.goombaFlat=this.mkGoombaFlat();
    this.F.koopaA=this.mkKoopa(0); this.F.koopaB=this.mkKoopa(1);
    this.F.shell=this.mkShell(false); this.F.shellWake=this.mkShell(true);
    this.F.wingA=this.mkWing(0); this.F.wingB=this.mkWing(1);
    this.F.plantA=this.mkPlant(0); this.F.plantB=this.mkPlant(1);
  },

  mkGoomba(f){
    const c=this.cv(14,14),g=c.getContext('2d');
    this.R(g,2,0,10,2,'#a3592b');
    this.R(g,1,2,12,5,'#a3592b');
    this.R(g,2,1,4,1,'#c97a42');
    this.R(g,0,4,14,3,'#a3592b');
    this.R(g,0,7,14,2,'#6e3413');
    this.R(g,1,9,12,3,'#ffe8c8');
    this.R(g,2,8,3,1,'#3a1c07');
    this.R(g,9,8,3,1,'#3a1c07');
    this.R(g,4,9,2,3,'#fff'); this.R(g,8,9,2,3,'#fff');
    this.R(g,f?4:5,10,1,2,'#20242c');
    this.R(g,f?8:9,10,1,2,'#20242c');
    this.R(g,3,12,4,f?2:2,'#4a2408');
    this.R(g,7+f,12,4-f,2,'#4a2408');
    return c;
  },
  mkGoombaFlat(){
    const c=this.cv(14,14),g=c.getContext('2d');
    this.R(g,0,8,14,4,'#a3592b');
    this.R(g,1,7,12,1,'#c97a42');
    this.R(g,0,12,14,2,'#6e3413');
    this.R(g,3,9,3,1,'#3a1c07');this.R(g,8,9,3,1,'#3a1c07');
    return c;
  },

  mkKoopa(f){
    const c=this.cv(16,20),g=c.getContext('2d');
    const bob=f?1:0;
    this.R(g,1,5+bob,10,10,'#3fae54');
    this.R(g,2,4+bob,8,1,'#3fae54');
    this.R(g,3,6+bob,3,2,'#2c8040');
    this.R(g,7,8+bob,3,2,'#2c8040');
    this.R(g,3,10+bob,3,2,'#2c8040');
    this.R(g,1,13+bob,10,2,'#f2e3b8');
    this.R(g,11,1+bob,4,5,'#ffe08a');
    this.R(g,13,2+bob,1,2,'#20242c');
    this.R(g,14,4+bob,1,1,'#e8a34a');
    this.R(g,0,12+bob,2,3,'#f2e3b8');
    if(!f){ this.R(g,3,15,3,3,'#ffc94a'); this.R(g,9,15,3,3,'#ffc94a'); }
    else   { this.R(g,2,15,3,3,'#ffc94a'); this.R(g,10,15,3,3,'#ffc94a'); }
    return c;
  },
  mkShell(wake){
    const c=this.cv(16,14),g=c.getContext('2d');
    this.R(g,2,2,12,9,'#3fae54');
    this.R(g,3,1,10,1,'#3fae54');
    this.R(g,4,3,3,3,'#2c8040');
    this.R(g,9,5,3,3,'#2c8040');
    this.R(g,4,8,3,2,'#2c8040');
    this.R(g,1,10,14,2,'#f2e3b8');
    this.R(g,2,12,12,1,'#d9c39a');
    if(wake){ this.R(g,4,13,3,1,'#ffe08a'); this.R(g,9,13,3,1,'#ffe08a'); }
    return c;
  },
  mkWing(f){
    const c=this.cv(10,8),g=c.getContext('2d');
    g.fillStyle='#ffffff';
    if(f===0){
      g.beginPath();g.moveTo(9,7);g.quadraticCurveTo(2,0,0,3);g.quadraticCurveTo(3,7,9,7);g.fill();
      this.R(g,4,4,2,2,'#dfeeff');
    }else{
      g.beginPath();g.moveTo(9,1);g.quadraticCurveTo(2,8,0,5);g.quadraticCurveTo(3,1,9,1);g.fill();
    }
    return c;
  },

  mkPlant(f){
    const c=this.cv(16,22),g=c.getContext('2d');
    this.R(g,6,9,4,13,'#2f9e44');
    this.R(g,6,9,1,13,'#57c785');
    this.R(g,1,14,5,3,'#2f9e44');this.R(g,10,14,5,3,'#2f9e44');
    this.R(g,2,0,12,9,'#d1342b');
    this.R(g,3,0,4,1,'#e85a4a');
    this.R(g,3,2,2,2,'#fff');this.R(g,10,1,2,2,'#fff');this.R(g,6,6,2,2,'#fff');
    if(f===0){
      this.R(g,2,3,12,4,'#5a1010');
      for(let i=0;i<5;i++){ this.R(g,3+i*2,3,1,1,'#fff'); this.R(g,4+i*2,6,1,1,'#fff'); }
      this.R(g,1,2,1,6,'#a82419');this.R(g,14,2,1,6,'#a82419');
    }else{
      this.R(g,2,4,12,2,'#a82419');
    }
    return c;
  },

  items(){
    this.I={};
    this.I.mushroom=this.mkShroom('#e23b2e','#a82419');
    this.I.oneup=this.mkShroom('#3fae54','#2c8040');
    this.I.flowerA=this.mkFlower(0); this.I.flowerB=this.mkFlower(1);
    this.I.star=this.mkStar();
    this.I.coin=[0,1,2,3].map(i=>this.mkCoin(i));
    this.I.fireball=[0,1].map(i=>this.mkFireball(i));
  },

  mkShroom(cap,capD){
    const c=this.cv(14,14),g=c.getContext('2d');
    this.R(g,2,1,10,2,cap);
    this.R(g,1,3,12,4,cap);
    this.R(g,2,7,10,1,capD);
    this.R(g,3,2,2,2,'#fff');this.R(g,9,3,2,2,'#fff');this.R(g,6,5,2,2,'#fff');
    this.R(g,3,8,8,5,'#ffe8c8');
    this.R(g,3,8,8,1,'#eecfa4');
    this.R(g,4,10,1,2,'#20242c');this.R(g,9,10,1,2,'#20242c');
    return c;
  },

  mkFlower(f){
    const c=this.cv(14,16),g=c.getContext('2d');
    const o=f?'#ffd23e':'#ff8c2e', i=f?'#ff8c2e':'#ffd23e';
    this.R(g,6,9,2,7,'#2f9e44');
    this.R(g,2,12,4,2,'#2f9e44');this.R(g,8,12,4,2,'#2f9e44');
    const cx=7,cy=4;
    const pts=[[cx,cy-4],[cx+3,cy-3],[cx+4,cy],[cx+3,cy+3],[cx,cy+4],[cx-3,cy+3],[cx-4,cy],[cx-3,cy-3]];
    g.fillStyle=o;
    for(const [px,py] of pts) g.fillRect(px-1,py-1,2,2);
    g.fillStyle=i;
    g.fillRect(cx-2,cy-2,4,4);
    this.R(g,cx-1,cy-1,2,2,'#fff');
    return c;
  },

  mkStar(){
    const c=this.cv(14,14),g=c.getContext('2d');
    g.fillStyle='#ffd23e';
    g.beginPath();
    const cx=7,cy=7,R1=6.5,R2=2.8;
    for(let i=0;i<10;i++){
      const a=-Math.PI/2+i*Math.PI/5, r=i%2?R2:R1;
      const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
      i?g.lineTo(x,y):g.moveTo(x,y);
    }
    g.closePath();g.fill();
    g.fillStyle='#c9931f';
    g.lineWidth=.6;g.stroke();
    this.R(g,5,6,1,2,'#20242c');this.R(g,8,6,1,2,'#20242c');
    return c;
  },

  mkCoin(fr){
    const w=[12,8,4,8][fr];
    const c=this.cv(14,14),g=c.getContext('2d');
    if(w>2){
      g.fillStyle='#d99a1f';
      g.fillRect(7-w/2,1,w,12);
      g.fillStyle='#ffd94a';
      g.fillRect(7-w/2+1,2,Math.max(1,w-2),10);
      if(w>=8){ this.R(g,7-w/2+2,4,2,6,'#fff2b0'); }
    }else{
      g.fillStyle='#d99a1f';
      g.fillRect(6,1,2,12);
    }
    return c;
  },

  mkFireball(f){
    const c=this.cv(8,8),g=c.getContext('2d');
    g.fillStyle='#d1342b';g.beginPath();g.arc(4,4,3.6,0,7);g.fill();
    g.fillStyle='#ff8c2e';g.beginPath();g.arc(4,4,2.6,0,7);g.fill();
    g.fillStyle='#ffe08a';g.beginPath();g.arc(4,4,1.4,0,7);g.fill();
    if(f){
      g.strokeStyle='#fff2b0';g.lineWidth=.7;
      g.beginPath();g.moveTo(.5,4);g.lineTo(7.5,4);g.moveTo(4,.5);g.lineTo(4,7.5);g.stroke();
    }
    return c;
  },

  tilesCommon(){
    return null;
  },

  mkGround(top,grass,grassD,dirt,dirtD,speck){
    const c=this.cv(16,16),g=c.getContext('2d');
    this.R(g,0,0,16,16,dirt);
    for(let i=0;i<7;i++){
      const hx=Math.floor(U.hash(i*7+3)*13)+1, hy=Math.floor(U.hash(i*13+5)*12)+3;
      this.R(g,hx,hy,2,1,speck);
    }
    if(grass){
      this.R(g,0,0,16,4,grass);
      this.R(g,0,4,16,1,grassD);
      for(let i=0;i<5;i++){
        const bx=Math.floor(U.hash(i*29+11)*15);
        this.R(g,bx,4,1,U.hash(i*3)<.5?2:1,grass);
      }
    }else{
      this.R(g,0,0,16,1,top||dirtD);
    }
    this.R(g,0,15,16,1,dirtD);
    return c;
  },

  mkFill(dirt,dirtD,speck){
    const c=this.cv(16,16),g=c.getContext('2d');
    this.R(g,0,0,16,16,dirt);
    for(let i=0;i<8;i++){
      const hx=Math.floor(U.hash(i*17+2)*13)+1, hy=Math.floor(U.hash(i*23+9)*14)+1;
      this.R(g,hx,hy,2,1,speck);
    }
    this.R(g,0,0,16,1,dirtD);
    this.R(g,0,15,16,1,dirtD);
    return c;
  },

  mkBrick(base,hi,mortar){
    const c=this.cv(16,16),g=c.getContext('2d');
    this.R(g,0,0,16,16,mortar);
    const bw=7,bh=4;
    for(let ry=0;ry<4;ry++){
      for(let rx=-1;rx<3;rx++){
        const off=(ry%2)?4:0;
        const x=rx*(bw+1)+off,y=ry*(bh+1);
        if(x+bw<=0)continue;
        this.R(g,Math.max(0,x),y,Math.min(bw,16-Math.max(0,x)),bh,base);
        this.R(g,Math.max(0,x),y,Math.min(bw,16-Math.max(0,x)),1,hi);
      }
    }
    return c;
  },

  mkStone(base,lite,dark,bolt){
    const c=this.cv(16,16),g=c.getContext('2d');
    this.R(g,0,0,16,16,base);
    this.R(g,0,0,16,2,lite);
    this.R(g,0,0,2,16,lite);
    this.R(g,0,14,16,2,dark);
    this.R(g,14,0,2,16,dark);
    this.R(g,3,3,2,2,bolt);this.R(g,11,3,2,2,bolt);
    this.R(g,3,11,2,2,bolt);this.R(g,11,11,2,2,bolt);
    return c;
  },

  mkQ(shine){
    const c=this.cv(16,16),g=c.getContext('2d');
    const gr=g.createLinearGradient(0,0,0,16);
    gr.addColorStop(0,'#ffd45a');gr.addColorStop(1,'#eb9c1c');
    g.fillStyle=gr;g.fillRect(0,0,16,16);
    this.R(g,0,0,16,1,'#ffe9a0');this.R(g,0,15,16,1,'#8a5a10');
    this.R(g,0,0,1,16,'#ffe9a0');this.R(g,15,0,1,16,'#8a5a10');
    this.R(g,1,1,2,2,'#8a5a10');this.R(g,13,1,2,2,'#8a5a10');
    this.R(g,1,13,2,2,'#8a5a10');this.R(g,13,13,2,2,'#8a5a10');
    const q=[[6,3,4,2],[9,5,2,2],[7,7,3,2],[7,9,2,2],[7,12,2,2]];
    this.R(g,7,4,5,2,'#8a5a10');
    for(const [x,y,w,h] of q) this.R(g,x+1,y+1,w,h,'#fff6dc');
    for(const [x,y,w,h] of q) this.R(g,x,y,w,h,'#fff');
    if(shine>=0){
      const sx=shine*7-4;
      g.globalAlpha=.5;g.fillStyle='#fff';
      g.beginPath();g.moveTo(sx,0);g.lineTo(sx+3,0);g.lineTo(sx-2,16);g.lineTo(sx-5,16);g.closePath();g.fill();
      g.globalAlpha=1;
    }
    return c;
  },

  mkUsed(){
    const c=this.cv(16,16),g=c.getContext('2d');
    this.R(g,0,0,16,16,'#b98a56');
    this.R(g,0,0,16,1,'#d8b183');this.R(g,0,15,16,1,'#7a5230');
    this.R(g,0,0,1,16,'#d8b183');this.R(g,15,0,1,16,'#7a5230');
    this.R(g,6,6,4,4,'#7a5230');
    this.R(g,7,7,2,2,'#d8b183');
    return c;
  },

  mkPipe(kind,theme){
    const c=this.cv(16,16),g=c.getContext('2d');
    const lite=theme.pipeLite,mid=theme.pipeMid,dark=theme.pipeDark;
    const lip=kind==='tl'||kind==='tr';
    if(lip){
      this.R(g,0,0,16,10,mid);
      this.R(g,0,0,16,1,lite);
      this.R(g,0,9,16,1,dark);
      if(kind==='tl'){
        this.R(g,2,1,3,8,lite);
        this.R(g,0,0,1,10,dark);
        this.R(g,1,10,15,6,mid);
        this.R(g,2,10,3,6,lite);
        this.R(g,1,10,1,6,dark);
      }else{
        this.R(g,11,1,3,8,lite);
        this.R(g,15,0,1,10,dark);
        this.R(g,0,10,15,6,mid);
        this.R(g,10,10,3,6,lite);
        this.R(g,14,10,1,6,dark);
      }
    }else{
      if(kind==='bl'){
        this.R(g,1,0,15,16,mid);
        this.R(g,2,0,3,16,lite);
        this.R(g,1,0,1,16,dark);
      }else{
        this.R(g,0,0,15,16,mid);
        this.R(g,10,0,3,16,lite);
        this.R(g,14,0,1,16,dark);
      }
    }
    return c;
  },

  mkPlat(theme){
    const c=this.cv(16,16),g=c.getContext('2d');
    if(theme.platStyle==='cloud'){
      g.fillStyle='#ffffff';
      [[3,4,10,5],[1,6,14,4],[4,3,8,2]].forEach(([x,y,w,h])=>{
        g.beginPath();g.roundRect?g.roundRect(x,y,w,h,3):g.rect(x,y,w,h);g.fill();
      });
      this.R(g,2,9,12,2,'#dfeeff');
    }else if(theme.platStyle==='mush'){
      this.R(g,0,2,16,7,'#e8734a');
      this.R(g,0,2,16,2,'#ffa071');
      this.R(g,0,8,16,1,'#b34a26');
      this.R(g,3,4,3,3,'#fff');this.R(g,10,5,3,2,'#fff');
      this.R(g,6,9,4,7,'#ffe8c8');
      this.R(g,6,9,1,7,'#d9b48a');
    }else{
      this.R(g,0,3,16,6,'#caa06a');
      this.R(g,0,3,16,1,'#e6c492');
      this.R(g,0,8,16,1,'#8a6838');
      this.R(g,2,5,1,1,'#5a4020');this.R(g,13,5,1,1,'#5a4020');
    }
    return c;
  },

  mkLavaTop(){
    const c=this.cv(16,16),g=c.getContext('2d');
    const gr=g.createLinearGradient(0,0,0,16);
    gr.addColorStop(0,'#ffd23e');gr.addColorStop(.4,'#ff7a1e');gr.addColorStop(1,'#c22e12');
    g.fillStyle=gr;g.fillRect(0,0,16,16);
    this.R(g,0,0,16,2,'#fff2b0');
    return c;
  },
  mkLavaBody(){
    const c=this.cv(16,16),g=c.getContext('2d');
    const gr=g.createLinearGradient(0,0,0,16);
    gr.addColorStop(0,'#e85a1e');gr.addColorStop(1,'#8a1a0a');
    g.fillStyle=gr;g.fillRect(0,0,16,16);
    return c;
  },

  themes:{
    day:{
      sky:['#63b4f5','#9fd8ff'],hillFar:'#7ec850',hillFar2:'#5faf3e',
      bush:'#3f9e37',cloud:'#ffffff',pipeLite:'#a5ef77',pipeMid:'#4cb838',pipeDark:'#2c8020',
      platStyle:'wood',ground:['#58c04c','#3e9636','#b06a3a','#8f4f26','#9c5c2e'],
      deco:'hills'
    },
    cave:{
      sky:['#101623','#1c2a44'],hillFar:'#232f4a',hillFar2:'#1a2438',
      bush:'#2c3a58',cloud:'#3a4a6a',pipeLite:'#7ac8b8',pipeMid:'#3f9e8e',pipeDark:'#26665c',
      platStyle:'stone',ground:[null,null,'#5a6478','#424a5c','#4c5468'],
      deco:'stalactites'
    },
    dusk:{
      sky:['#2c2a5e','#c86a4a'],hillFar:'#6a4470',hillFar2:'#4a2f56',
      bush:'#7a4a62',cloud:'#ffd9c0',pipeLite:'#e8a06a',pipeMid:'#c26a3a',pipeDark:'#8a3f1e',
      platStyle:'cloud',ground:[null,null,'#8a5a4a','#6a3f34','#7a4c3e'],
      deco:'mountains'
    },
    castle:{
      sky:['#1a0e14','#3a1420'],hillFar:'#2c1620',hillFar2:'#200f18',
      bush:'#3a1c28',cloud:'#4a2030',pipeLite:'#8a8a9a',pipeMid:'#5a5a6e',pipeDark:'#3a3a4a',
      platStyle:'wood',ground:[null,null,'#7a6a72','#5a4a52','#6a5a62'],
      deco:'castlebg'
    }
  },

  tilesDay(){ this.buildTileSet('day',this.themes.day); },
  tilesCave(){ this.buildTileSet('cave',this.themes.cave); },
  tilesDusk(){ this.buildTileSet('dusk',this.themes.dusk); },
  tilesCastle(){ this.buildTileSet('castle',this.themes.castle); },

  buildTileSet(name,th){
    const s={};
    const [grass,grassD,dirt,dirtD,speck]=th.ground;
    s[1]=grass?this.mkGround(true,grass,grassD,dirt,dirtD,speck):this.mkGround(false,null,null,dirt,dirtD,speck);
    s[2]=this.mkFill(dirt,dirtD,speck);
    s[3]=name==='day'?this.mkStone('#9aa3ad','#cfd6dd','#6b7480','#57606a'):
         name==='cave'?this.mkStone('#5a6478','#7d88a0','#3c4454','#303748'):
         name==='dusk'?this.mkStone('#8a6a7a','#b08da0','#5f4552','#4a3340'):
         this.mkStone('#7a6a72','#a3939b','#54444c','#40343a');
    s[4]=name==='day'?this.mkBrick('#c8542e','#e07a4e','#7a2f18'):
         name==='cave'?this.mkBrick('#5f6a84','#8290ac','#38415a'):
         name==='dusk'?this.mkBrick('#a05a4a','#c67a66','#64281e'):
         this.mkBrick('#6e5a62','#8a7480','#403038');
    s[5]=s[4];
    s[6]=this.mkQ(-1);s[7]=s[6];s[8]=s[6];
    s.q=[this.mkQ(0),this.mkQ(1),this.mkQ(2)];
    s[9]=this.mkUsed();
    s.lavaTop=this.mkLavaTop();
    s.lavaBody=this.mkLavaBody();
    s[10]=this.mkPipe('tl',th);s[11]=this.mkPipe('tr',th);
    s[12]=this.mkPipe('bl',th);s[13]=this.mkPipe('br',th);
    s[14]=this.mkPlat(th);
    this.TS=this.TS||{};
    this.TS[name]=s;
  },

  mkGlow(inner,mid){
    const c=this.cv(28,28),g=c.getContext('2d');
    const gr=g.createRadialGradient(14,14,1,14,14,13);
    gr.addColorStop(0,inner);
    gr.addColorStop(.45,mid);
    gr.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gr;
    g.fillRect(0,0,28,28);
    return c;
  },

  bgBits(){
    this.B={};
    this.B.glowWarm=this.mkGlow('rgba(255,190,110,.95)','rgba(255,140,60,.4)');
    this.B.glowCool=this.mkGlow('rgba(150,235,255,.95)','rgba(80,200,255,.35)');
    for(let i=0;i<3;i++){
      const w=[46,64,36][i],h=[24,32,20][i];
      const c=this.cv(w,h),g=c.getContext('2d');
      g.fillStyle='#ffffff';
      const lobes=[[w*.3,h*.6,w*.24],[w*.55,h*.45,w*.3],[w*.75,h*.65,w*.2]];
      for(const [x,y,r] of lobes){ g.beginPath();g.arc(x,y,r,0,7);g.fill(); }
      g.fillRect(w*.2,h*.6,w*.6,h*.28);
      g.fillStyle='rgba(190,215,245,.85)';
      g.fillRect(w*.22,h*.82,w*.58,h*.12);
      this.B['cloud'+i]=c;
    }
    const hill=this.cv(320,64),hg=hill.getContext('2d');
    hg.fillStyle='#7ec850';
    hg.beginPath();hg.moveTo(0,64);
    hg.quadraticCurveTo(40,8,80,64);hg.quadraticCurveTo(120,20,160,64);
    hg.quadraticCurveTo(210,4,260,64);hg.lineTo(320,64);hg.fill();
    hg.fillStyle='rgba(255,255,255,.25)';
    hg.beginPath();hg.arc(70,30,5,0,7);hg.arc(84,26,4,0,7);hg.fill();
    this.B.hills=hill;
    const bush=this.cv(160,28),bg2=bush.getContext('2d');
    bg2.fillStyle='#3f9e37';
    for(let i=0;i<3;i++){
      const bx=20+i*50;
      bg2.beginPath();
      bg2.arc(bx,22,14,Math.PI,0);bg2.arc(bx+14,22,18,Math.PI,0);
      bg2.arc(bx+28,22,13,Math.PI,0);
      bg2.fill();bg2.fillRect(bx-14,22,58,6);
    }
    bg2.fillStyle='rgba(255,255,255,.18)';
    bg2.beginPath();bg2.arc(34,12,5,0,7);bg2.arc(84,10,6,0,7);bg2.fill();
    this.B.bush=bush;
    const stal=this.cv(320,90),sg=stal.getContext('2d');
    sg.fillStyle='#141c2e';
    sg.beginPath();sg.moveTo(0,0);
    for(let i=0;i<=16;i++){
      const x=i*20, dep=(i%3===0)?60:(i%3===1?30:45);
      sg.lineTo(x+10,dep);sg.lineTo(x+20,0);
    }
    sg.fill();
    this.B.stalactites=stal;
    const mtn=this.cv(400,110),mg=mtn.getContext('2d');
    mg.fillStyle='#4a2f56';
    mg.beginPath();mg.moveTo(0,110);mg.lineTo(60,30);mg.lineTo(130,110);
    mg.moveTo(100,110);mg.lineTo(200,10);mg.lineTo(300,110);
    mg.moveTo(260,110);mg.lineTo(340,40);mg.lineTo(420,110);mg.fill();
    mg.fillStyle='rgba(255,220,180,.35)';
    mg.beginPath();mg.moveTo(185,32);mg.lineTo(200,10);mg.lineTo(215,32);mg.fill();
    mg.beginPath();mg.moveTo(326,58);mg.lineTo(340,40);mg.lineTo(354,58);mg.fill();
    this.B.mountains=mtn;
  },

  mkCastleSprite(){
    const c=this.cv(80,80),g=c.getContext('2d');
    const b1='#b0907a',b2='#93765f',dark='#5f4a38',win='#20141c';
    for(let y=0;y<80;y+=8){
      for(let x=((y/8)%2)*8;x<80;x+=16){
        this.R(g,x,y,7,4,(U.hash(x*31+y*7)<.5)?b1:b2);
        this.R(g,x,y,7,1,'rgba(255,255,255,.14)');
      }
    }
    for(let i=0;i<5;i++) this.R(g,i*16+2,0,10,6,(i%2)?b1:b2);
    this.R(g,16,8,48,34,b1);
    for(let i=0;i<3;i++) this.R(g,18+i*16,2,10,6,(i%2)?b1:b2);
    this.R(g,24,-8,32,12,b1);
    this.R(g,32,14,16,12,win);
    this.R(g,32,58,16,22,win);
    g.fillStyle=win;
    g.beginPath();g.moveTo(30,80);g.lineTo(30,68);g.quadraticCurveTo(40,58,50,68);g.lineTo(50,80);g.fill();
    this.R(g,38,44,4,10,dark);
    this.B=this.B||{};
    this.B.castle=c;
  },

  misc(){
    this.mkCastleSprite();
    this.M={};
    const deb=this.cv(6,6),dg=deb.getContext('2d');
    dg.fillStyle='#c8542e';dg.fillRect(0,0,6,6);
    dg.fillStyle='#e07a4e';dg.fillRect(0,0,6,2);
    this.M.debris=deb;
    const flag=this.cv(14,10),fg=flag.getContext('2d');
    fg.fillStyle='#3fae54';
    fg.beginPath();fg.moveTo(13,0);fg.lineTo(0,5);fg.lineTo(13,10);fg.closePath();fg.fill();
    fg.fillStyle='#fff';fg.beginPath();fg.arc(8,5,2.4,0,7);fg.fill();
    this.M.flag=flag;
  }
};
