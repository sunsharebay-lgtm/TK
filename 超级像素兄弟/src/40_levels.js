const SR=13;
const PX=16;
const LVD=[];

function Builder(cols){
  const R=CFG.ROWS;
  const g=new Uint8Array(cols*R);
  const sp=[],warps=[];
  const o={
    cols,g,spawns:sp,warps,flagCol:0,castleCol:0,cpCol:0,
    set(c,r,t){ if(c>=0&&c<cols&&r>=0&&r<R)g[r*cols+c]=t; },
    get(c,r){ return g[r*cols+c]; },
    rect(c0,c1,r0,r1,t){ for(let c=c0;c<=c1;c++)for(let r=r0;r<=r1;r++)o.set(c,r,t); },
    ground(c0,c1){ o.rect(c0,c1,SR,R-1,TL.GTOP); for(let c=c0;c<=c1;c++)o.set(c,R-1,TL.GFILL); },
    ceiling(){ o.rect(0,cols-1,0,1,TL.GTOP); },
    row(c0,c1,r,t){ o.rect(c0,c1,r,r,t); },
    wallCol(c){ o.rect(c,c,0,SR-1,TL.STONE); },
    pipe(c,h,opt){
      opt=opt||{};
      const top=SR-h;
      o.set(c,top,TL.PIPE_TL); o.set(c+1,top,TL.PIPE_TR);
      for(let r=top+1;r<SR;r++){ o.set(c,r,TL.PIPE_BL); o.set(c+1,r,TL.PIPE_BR); }
      if(opt.plant)sp.push({t:'plant',x:(c+1)*PX,y:top*PX});
      if(opt.warp)warps.push({a:opt.a||0,col:c,row:top,dest:opt.warp});
      return o;
    },
    stairsUp(c,h){ for(let i=0;i<h;i++)o.rect(c+i,c+i,SR-1-i,SR-1,TL.STONE); },
    stairsDown(c,h){ for(let i=0;i<h;i++)o.rect(c+h-1-i,c+h-1-i,SR-1-i,SR-1,TL.STONE); },
    coins(c0,c1,r){ for(let c=c0;c<=c1;c++)o.spawn('coin',c*PX+2,r*PX+1); },
    coinArc(cx,cy,n){
      for(let i=0;i<n;i++){
        const dx=i-(n-1)/2;
        const lift=Math.round((1-(dx*dx)/(((n/2)*(n/2))||1))*2);
        o.spawn('coin',(cx+dx)*PX+2,(cy-lift)*PX+1);
      }
    },
    plat(c0,c1,r){ o.rect(c0,c1,r,r,TL.PLAT); },
    pillar(c,h){ o.rect(c,c,SR-h,SR-1,TL.STONE); },
    flag(c){
      for(let r=SR-2;r>=4;r--)o.set(c,r,TL.POLE);
      o.set(c,3,TL.POLE_TOP);
      o.flagCol=c;
    },
    castle(c){ o.castleCol=c; },
    checkpoint(c){ o.cpCol=c; },
    lava(c0,c1){ o.rect(c0,c1,SR,R-1,TL.LAVA_T); for(let c=c0;c<=c1;c++)o.set(c,R-1,TL.LAVA_B); },
    spawn(t,x,y,e){ sp.push(Object.assign({t,x,y},e||{})); }
  };
  return o;
}

function areaOf(b){
  return { grid:b.g, cols:b.cols, rows:CFG.ROWS, spawns:b.spawns,
           flagCol:b.flagCol, castleCol:b.castleCol, cpX:b.cpCol*PX,
           warps:b.warps };
}

LVD.push({
  name:'1-1 绿野平原', theme:'day', music:'overworld', time:300,
  build(){
    const b=Builder(214);
    b.ground(0,68); b.ground(71,213);
    b.set(16,9,TL.Q_COIN);
    b.row(20,20,9,TL.BRICK); b.set(21,9,TL.Q_POWER); b.row(22,22,9,TL.BRICK);
    b.set(21,5,TL.Q_COIN);
    b.spawn('goomba',23*PX,12*PX);
    b.pipe(28,2,{});
    b.spawn('goomba',34*PX,12*PX); b.spawn('goomba',36*PX,12*PX);
    b.pipe(39,3,{});
    b.pipe(47,4,{plant:true});
    b.spawn('goomba',54*PX,12*PX); b.spawn('goomba',56*PX,12*PX);
    b.pipe(58,4,{plant:true});
    b.set(64,9,TL.HIDDEN);
    b.row(77,77,9,TL.BRICK); b.set(78,9,TL.Q_STAR); b.row(79,80,9,TL.BRICK);
    b.spawn('koopa',82*PX,11*PX);
    b.rect(83,87,5,5,TL.BRICK);
    b.coins(84,87,3);
    b.spawn('goomba',93*PX,12*PX); b.spawn('goomba',95*PX,12*PX);
    b.set(91,9,TL.BRICK_COIN);
    b.spawn('koopa',99*PX,11*PX);
    b.pipe(104,2,{warp:{a:1,x:3.5*PX,y:-24}});
    b.pipe(112,2,{});
    b.spawn('goomba',117*PX,12*PX); b.spawn('goomba',119*PX,12*PX);
    b.pipe(124,3,{plant:true});
    b.checkpoint(90);
    b.stairsUp(130,4); b.stairsDown(136,4);
    b.spawn('goomba',146*PX,12*PX); b.spawn('goomba',148*PX,12*PX);
    b.pipe(152,2,{});
    b.pipe(160,3,{plant:true});
    b.spawn('koopa',166*PX,11*PX);
    b.stairsUp(176,8);
    b.flag(190); b.castle(196);
    return { main:areaOf(b) };
  },
  bonus(){
    const b=Builder(26);
    b.wallCol(0); b.wallCol(25);
    b.ground(0,25);
    b.rect(0,25,0,0,TL.GTOP);
    b.coins(5,9,9); b.coinArc(14,7,7); b.coins(18,21,10);
    b.set(12,9,TL.BRICK_COIN);
    b.set(7,9,TL.Q_POWER);
    b.pipe(19,2,{a:1,warp:{a:0,x:113*PX,y:11*PX,mode:'rise'}});
    return areaOf(b);
  }
});

LVD.push({
  name:'1-2 地底回廊', theme:'cave', music:'underground', time:300,
  build(){
    const b=Builder(196);
    b.ceiling(); b.ground(0,195);
    b.wallCol(0);
    b.set(16,9,TL.Q_POWER);
    b.coins(20,24,9);
    b.rect(26,29,6,6,TL.BRICK);
    b.coins(26,29,5);
    b.spawn('goomba',32*PX,12*PX); b.spawn('goomba',34*PX,12*PX);
    b.rect(40,40,13,13,0);b.rect(41,41,13,13,0);b.rect(42,42,13,13,0);
    for(let c=40;c<=42;c++){ b.set(c,SR,0); b.set(c,SR+1,0); }
    b.plat(40,42,9);
    b.spawn('goomba',48*PX,12*PX);
    b.pipe(52,2,{plant:true});
    b.rect(57,60,5,5,TL.BRICK); b.set(58,5,TL.BRICK_COIN); b.set(59,5,TL.Q_COIN);
    b.spawn('koopa',64*PX,11*PX);
    b.set(70,9,TL.Q_STAR);
    b.rect(74,77,13,13,0);
    for(let c=74;c<=77;c++){ b.set(c,SR,0); b.set(c,SR+1,0); }
    b.spawn('mover',74*PX,9*PX,{axis:'x',range:4*PX+8,speed:.55,w:44});
    b.spawn('goomba',84*PX,12*PX); b.spawn('goomba',86*PX,12*PX);
    b.pipe(88,3,{plant:true});
    b.checkpoint(92);
    b.rect(96,99,8,8,TL.BRICK);
    b.coins(96,99,7);
    b.spawn('koopa',104*PX,11*PX);
    b.rect(110,114,13,13,0);
    for(let c=110;c<=114;c++){ b.set(c,SR,0); b.set(c,SR+1,0); }
    b.plat(111,113,9);
    b.spawn('goomba',118*PX,12*PX);
    b.rect(122,126,6,6,TL.BRICK);
    b.set(124,6,TL.Q_POWER);
    b.spawn('koopa',132*PX,11*PX); b.spawn('koopa',134*PX,11*PX);
    b.rect(140,143,13,13,0);
    for(let c=140;c<=143;c++){ b.set(c,SR,0); b.set(c,SR+1,0); }
    b.spawn('mover',139*PX,10*PX,{axis:'x',range:5*PX+16,speed:.6,w:44});
    b.coins(141,142,7);
    b.spawn('goomba',150*PX,12*PX); b.spawn('goomba',152*PX,12*PX);
    b.rect(156,159,5,5,TL.BRICK); b.coins(156,159,4);
    b.stairsUp(164,6);
    b.flag(178); b.castle(182);
    return { main:areaOf(b), warps:[] };
  }
});

LVD.push({
  name:'1-3 黄昏崖径', theme:'dusk', music:'dusk', time:300,
  build(){
    const b=Builder(206);
    b.ground(0,24);
    b.ground(28,33);
    b.plat(35,37,9);
    b.ground(40,45);
    b.spawn('goomba',43*PX,12*PX); b.spawn('goomba',45*PX,12*PX);
    b.plat(48,51,7);
    b.coins(48,51,5);
    b.ground(55,69);
    b.pipe(62,4,{plant:true});
    b.spawn('para',73*PX,6*PX);
    b.ground(70,75);
    b.rect(72,73,9,9,TL.BRICK); b.set(72,9,TL.Q_STAR);
    b.plat(78,80,8);
    b.ground(84,88);
    b.spawn('goomba',86*PX,12*PX);
    b.checkpoint(86);
    b.plat(91,94,9);
    b.plat(97,100,7);
    b.coins(97,100,5);
    b.ground(103,107);
    b.spawn('koopa',105*PX,11*PX);
    b.rect(109,120,13,13,0);
    for(let c=109;c<=120;c++){ b.set(c,SR,0); b.set(c,SR+1,0); }
    b.spawn('mover',108*PX,9*PX,{axis:'x',range:11*PX+16,speed:.85,w:48});
    b.plat(109,121,11);
    b.coins(112,116,6);
    b.ground(123,134);
    b.spawn('para',126*PX,6*PX);
    b.pipe(131,3,{plant:true});
    b.plat(136,139,8);
    b.ground(142,148);
    b.spawn('goomba',145*PX,12*PX); b.spawn('goomba',147*PX,12*PX);
    b.plat(151,154,9);
    b.ground(157,162);
    b.spawn('koopa',160*PX,11*PX);
    b.rect(165,168,6,6,TL.BRICK); b.set(167,6,TL.Q_POWER);
    b.ground(171,205);
    b.spawn('goomba',176*PX,12*PX);
    b.stairsUp(180,7);
    b.flag(192); b.castle(197);
    return { main:areaOf(b), warps:[] };
  }
});

LVD.push({
  name:'1-4 熔岩城堡', theme:'castle', music:'castle', time:350,
  build(){
    const b=Builder(186);
    b.ground(0,29); b.lava(30,34); b.ground(35,57);
    b.lava(58,62); b.ground(63,89);
    b.lava(90,94); b.ground(95,127);
    b.lava(128,132); b.ground(133,185);
    b.wallCol(0);
    b.set(14,9,TL.Q_POWER);
    b.pillar(44,4); b.spawn('firebar',44*PX+8,(SR-4)*PX,{n:5,r:36,speed:.055});
    b.spawn('koopa',50*PX,11*PX);
    b.pillar(76,4); b.spawn('firebar',76*PX+8,(SR-4)*PX,{n:6,r:40,speed:-.06});
    b.spawn('goomba',68*PX,12*PX); b.spawn('goomba',70*PX,12*PX);
    b.rect(66,66,9,9,TL.BRICK); b.set(66,9,TL.Q_STAR);
    b.plat(91,93,9);
    b.checkpoint(97);
    b.spawn('koopa',102*PX,11*PX);
    b.rect(106,110,6,6,TL.BRICK); b.coins(106,110,5);
    b.pillar(112,4); b.spawn('firebar',112*PX+8,(SR-4)*PX,{n:5,r:36,speed:.075});
    b.spawn('para',120*PX,6*PX);
    b.plat(129,131,8);
    b.spawn('goomba',138*PX,12*PX);
    b.rect(142,146,9,9,TL.BRICK); b.set(144,9,TL.Q_COIN);
    b.spawn('koopa',152*PX,11*PX);
    b.stairsUp(158,7);
    b.flag(170); b.castle(174);
    return { main:areaOf(b), warps:[] };
  }
});

const LV={
  defs:LVD,
  build(i){
    const d=LVD[i];
    const areas=[d.build().main];
    if(i===0) areas.push(LVD[0].bonus());
    const warps=[];
    for(let a=0;a<areas.length;a++)
      for(const w of areas[a].warps||[])
        if(w.dest) warps.push(w);
    return {
      name:d.name, theme:d.theme, music:d.music, time:d.time,
      areas, warps
    };
  }
};
