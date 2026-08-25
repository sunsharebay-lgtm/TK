const RND={
  skyCache:new Map(),
  vig:null,

  draw(G){
    const ctx=G.ctx,dpr=G.dpr,dz=G.Z*dpr;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle='#000';
    ctx.fillRect(0,0,G.canvas.width,G.canvas.height);
    if(G.state==='title'){ this.title(G,ctx); this.fade(G,ctx); return; }
    if(G.state==='card'){ this.card(G,ctx); this.fade(G,ctx); return; }
    if(G.state==='gameover'){ this.gameover(G,ctx); this.fade(G,ctx); return; }
    if(G.state==='win'){ this.win(G,ctx); this.fade(G,ctx); return; }

    let sx=0,sy=0;
    if(G.shakeT>0){ G.shakeT--; sx=Math.sin(G.tick*1.7)*2; sy=Math.cos(G.tick*2.3)*1.5; }
    const camX=G.cam.x;

    ctx.setTransform(dpr,0,0,dpr,G.offX*dpr,G.offY*dpr);
    ctx.scale(G.Z,G.Z);
    this.sky(G,ctx);

    ctx.translate(-camX+sx,-sy);
    this.deco(G,ctx,camX);
    this.castleBack(G,ctx,camX);
    this.plants(G,ctx,camX);
    this.tiles(G,ctx,camX);
    this.movers(G,ctx,camX);
    this.ents(G,ctx,camX);
    this.player(G,ctx);
    this.fxLayer(G,ctx,camX);
    this.poleFlag(G,ctx,camX);

    ctx.setTransform(dpr,0,0,dpr,G.offX*dpr,G.offY*dpr);
    ctx.scale(G.Z,G.Z);
    this.vignette(G,ctx);
    this.hud(G,ctx);
    if(G.paused)this.pauseOv(G,ctx);
    ctx.setTransform(1,0,0,1,0,0);
    this.fade(G,ctx);
  },

  fade(G,ctx){
    if(G.fadeA>0){
      ctx.setTransform(G.dpr,0,0,G.dpr,0,0);
      ctx.globalAlpha=Math.min(1,G.fadeA);
      ctx.fillStyle='#000';
      ctx.fillRect(0,0,G.cssW,G.cssH);
      ctx.globalAlpha=1;
    }
  },

  sky(G,ctx){
    const th=G.theme();
    let g=this.skyCache.get(th);
    if(!g){
      g=ctx.createLinearGradient(0,0,0,CFG.VIEW_H);
      const stops=ART.themes[th].sky;
      g.addColorStop(0,stops[0]);
      g.addColorStop(1,stops[1]);
      this.skyCache.set(th,g);
    }
    ctx.fillStyle=g;
    ctx.fillRect(-8,-8,G.viewW+16,CFG.VIEW_H+16);
  },

  stripW(G,ctx,img,f,y,alpha,camX){
    const w=img.width/ART.SS,h=img.height/ART.SS;
    const m=w;
    const n0=Math.floor((camX*f-m)/w),n1=Math.floor((camX*f+G.viewW+m)/w);
    if(alpha!==undefined)ctx.globalAlpha=alpha;
    for(let n=n0;n<=n1;n++){
      const wx=n*w+(1-f)*camX;
      ctx.drawImage(img,wx,y,w,h);
    }
    ctx.globalAlpha=1;
  },

  clouds(G,ctx,camX,tint){
    const drift=G.tick*.05;
    const span=170;
    for(let k=0;k<3;k++){
      const img=ART.B['cloud'+k];
      const s=k===1?1:(k===0?.8:.7);
      const y=16+k*20;
      const f=.22+.06*k;
      const dr=drift*(k+1)*.6;
      const m=span;
      const n0=Math.floor((camX*f+dr-m)/span),n1=Math.floor((camX*f+dr+G.viewW+m)/span);
      for(let n=n0;n<=n1;n++){
        const hx=U.hash(n*17+k*31);
        const wx=n*span+hx*(span-70)+(1-f)*camX-dr;
        ctx.drawImage(img,wx,y,img.width/ART.SS*s,img.height/ART.SS*s);
      }
    }
  },

  layerCells(G,camX,span,f,cb){
    const m=60;
    const n0=Math.floor((camX*f-m)/span),n1=Math.floor((camX*f+G.viewW+m)/span);
    for(let n=n0;n<=n1;n++) cb(n*span+(1-f)*camX,n);
  },

  deco(G,ctx,camX){
    const th=G.theme();
    const gy=(SR)*16;
    if(th==='day'){
      this.clouds(G,ctx,camX,null);
      this.stripW(G,ctx,ART.B.hills,.22,gy-62,.95,camX);
      this.stripW(G,ctx,ART.B.bush,.55,gy-26,undefined,camX);
    }else if(th==='cave'){
      this.stripW(G,ctx,ART.B.stalactites,.3,-4,1,camX);
      this.layerCells(G,camX,140,.45,(wx,n)=>{
        const hx=U.hash(n*53+7);
        const pulse=.5+.5*Math.sin(G.tick*.05+n*2);
        const y=gy-24-hx*30;
        ctx.globalAlpha=.3+.35*pulse;
        ctx.drawImage(ART.B.glowCool,wx-5,y-14,22,22);
        ctx.globalAlpha=.9;
        ctx.fillStyle='#7ee3ff';
        ctx.beginPath();
        ctx.moveTo(wx,y);ctx.lineTo(wx+3,y-7);ctx.lineTo(wx+6,y);
        ctx.closePath();ctx.fill();
        ctx.globalAlpha=1;
      });
    }else if(th==='dusk'){
      ctx.globalAlpha=.9;
      ctx.drawImage(ART.B.glowWarm,camX+G.viewW*.72-46,6,92,92);
      ctx.globalAlpha=1;
      ctx.fillStyle='#ffd28a';
      ctx.beginPath();ctx.arc(camX+G.viewW*.72,52,13,0,7);ctx.fill();
      this.stripW(G,ctx,ART.B.mountains,.18,gy-108,.9,camX);
      this.clouds(G,ctx,camX,null);
    }else{
      this.layerCells(G,camX,120,.4,(wx,n)=>{
        const hx=U.hash(n*29+13);
        const flick=.5+.5*Math.sin(G.tick*.11+n*1.7);
        const y=30+hx*40;
        ctx.globalAlpha=.35+.4*flick;
        ctx.drawImage(ART.B.glowWarm,wx-14,y-14,28,28);
        ctx.globalAlpha=1;
        ctx.fillStyle='#ffcf7a';
        ctx.fillRect(wx-1.5,y-4,3,8);
      });
    }
  },

  castleBack(G,ctx,camX){
    const ar=G.area();
    const cc=ar.castleCol;
    if(!cc)return;
    ctx.drawImage(ART.B.castle,cc*16,SR*16-80,80,80);
  },

  plants(G,ctx,camX){
    for(const e of G.ents){
      if(e instanceof Plant&&e.x>camX-40&&e.x<camX+G.viewW+40)e.draw(ctx,G.tick);
    }
  },

  tiles(G,ctx,camX){
    const th=ART.TS[G.theme()];
    const ar=G.area();
    const c0=Math.max(0,Math.floor(camX/16)-1);
    const c1=Math.min(ar.cols-1,Math.ceil((camX+G.viewW)/16)+1);
    const qf=Math.floor(G.tick/9)%3;
    const lavaOff=Math.floor(G.tick/8)%2;
    for(let c=c0;c<=c1;c++){
      for(let r=0;r<ar.rows;r++){
        const t=ar.grid[r*ar.cols+c];
        if(!t||t===TL.HIDDEN)continue;
        let dy=0;
        const bk=G.bumpAnims.get(c+','+r);
        if(bk)dy=-Math.sin(Math.PI*bk.t/12)*6;
        const x=c*16,y=r*16+dy;
        switch(t){
          case TL.GTOP:
            ctx.drawImage(th[1],x,y);
            // 坑边警示：左右相邻为空（无底深坑）的地面，画黄黑警示条
            const gL=(c-1>=0)&&ar.grid[r*ar.cols+c-1]===TL.EMPTY;
            const gR=(c+1<ar.cols)&&ar.grid[r*ar.cols+c+1]===TL.EMPTY;
            if(gL||gR){
              const sx=(gL&&!gR)?x:(gR&&!gL)?x+11:x;
              const sw=(gL&&gR)?16:5;
              ctx.fillStyle='#ffd23a'; ctx.fillRect(sx,y,sw,4);
              ctx.fillStyle='#1a1a1a';
              for(let i=0;i<sw;i+=4) ctx.fillRect(sx+i,y,2,4);
              ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(sx,y+4,sw,1);
            }
            break;
          case TL.GFILL: ctx.drawImage(th[2],x,y);break;
          case TL.STONE: ctx.drawImage(th[3],x,y);break;
          case TL.BRICK: case TL.BRICK_COIN: ctx.drawImage(th[4],x,y);break;
          case TL.Q_COIN: case TL.Q_POWER: case TL.Q_STAR: ctx.drawImage(th.q[qf],x,y);break;
          case TL.USED: ctx.drawImage(th[9],x,y);break;
          case TL.PIPE_TL: ctx.drawImage(th[10],x,y);break;
          case TL.PIPE_TR: ctx.drawImage(th[11],x,y);break;
          case TL.PIPE_BL: ctx.drawImage(th[12],x,y);break;
          case TL.PIPE_BR: ctx.drawImage(th[13],x,y);break;
          case TL.PLAT: ctx.drawImage(th[14],x,y);break;
          case TL.POLE:
            ctx.fillStyle='#b9c2c9';ctx.fillRect(x+7,y,2,16);
            ctx.fillStyle='#eef2f5';ctx.fillRect(x+7,y,1,16);
            break;
          case TL.POLE_TOP:
            ctx.fillStyle='#b9c2c9';ctx.fillRect(x+7,y+6,2,10);
            ctx.fillStyle='#ffd23e';
            ctx.beginPath();ctx.arc(x+8,y+4,4,0,7);ctx.fill();
            ctx.fillStyle='#fff2b0';
            ctx.beginPath();ctx.arc(x+6.8,y+2.8,1.4,0,7);ctx.fill();
            break;
          case TL.LAVA_T:
            ctx.drawImage(th.lavaTop,x,y+(lavaOff?1:0));
            break;
          case TL.LAVA_B:
            ctx.drawImage(th.lavaBody,x,y);
            break;
        }
      }
    }
  },
  movers(G,ctx,camX){
    for(const m of G.movers){
      if(m.x+m.w<camX-40||m.x>camX+G.viewW+40)continue;
      m.draw(ctx,G.tick);
    }
  },

  ents(G,ctx,camX){
    for(const e of G.ents){
      if(e instanceof Plant)continue;
      if(e.x!==undefined&&(e.x+40<camX||e.x>camX+G.viewW+40)&&!(e instanceof FireBar))continue;
      e.draw(ctx,G.tick);
    }
  },

  player(G,ctx){
    const p=G.player;
    if(!p)return;
    p.draw(ctx,G.tick);
  },

  fxLayer(G,ctx,camX){
    for(const f of G.fx)f.draw(ctx);
  },

  poleFlag(G,ctx,camX){
    const ar=G.area();
    const fc=ar.flagCol;
    if(!fc)return;
    const p=G.player;
    let prog=0;
    if(p&&p.flagPhase==='slide'){
      prog=U.clamp(((p.y+p.h)-4*16)/((SR-1)*16-4*16-14),0,1);
      G.flagProg=prog;
    }else if(p&&(p.flagPhase==='hop'||p.flagPhase==='walkoff'))prog=1;
    else prog=G.flagProg||0;
    const fy=4*16+prog*((SR-1)*16-4*16-12);
    ctx.drawImage(ART.M.flag,fc*16-12,fy,13,10);
  },

  vignette(G,ctx){
    if(!this._vg){
      const vg=ctx.createRadialGradient(G.viewW/2,CFG.VIEW_H/2,CFG.VIEW_H*.55,G.viewW/2,CFG.VIEW_H/2,CFG.VIEW_H*.95);
      vg.addColorStop(0,'rgba(0,0,10,0)');
      vg.addColorStop(1,'rgba(0,0,20,.28)');
      this._vg=vg;
    }
    ctx.fillStyle=this._vg;
    ctx.fillRect(0,0,G.viewW,CFG.VIEW_H);
  },

  txt(ctx,s,x,y,size,color,align,bold){
    ctx.font=(bold?'bold ':'')+size+'px ui-monospace,Menlo,Consolas,monospace';
    ctx.textAlign=align||'left';
    ctx.textBaseline='top';
    ctx.lineWidth=size>=10?3:2;
    ctx.strokeStyle='rgba(10,10,25,.85)';
    ctx.strokeText(s,x,y);
    ctx.fillStyle=color||'#fff';
    ctx.fillText(s,x,y);
  },

  hud(G,ctx){
    const th=G.theme();
    const dark=th==='cave'||th==='castle';
    const c1=dark?'#fff':'#fff';
    this.txt(ctx,'SCORE',8,5,6,'rgba(255,255,255,.75)');
    this.txt(ctx,U.pad(G.score,6),8,13,9,c1);
    ctx.drawImage(ART.I.coin[Math.floor(G.tick/7)%4],86,12,10,10);
    this.txt(ctx,'×'+U.pad(G.coins,2),97,13,9,c1);
    this.txt(ctx,'WORLD',150,5,6,'rgba(255,255,255,.75)');
    this.txt(ctx,LV.defs[G.levelIdx].name.split(' ')[0],152,13,9,c1);
    this.txt(ctx,'TIME',215,5,6,'rgba(255,255,255,.75)');
    const warn=G.timeLeft<=100&&Math.floor(G.tick/16)%2===0;
    this.txt(ctx,U.pad(Math.max(0,G.timeLeft),3),216,13,9,warn?'#ff6a5a':c1);
    ctx.drawImage(ART.H['small_idle_norm'],250,11,11,11);
    this.txt(ctx,'×'+Math.max(0,G.lives),262,13,9,c1);
    if(G.timeLeft<=100&&!G.warnedShown){}
  },

  pauseOv(G,ctx){
    ctx.fillStyle='rgba(8,10,25,.62)';
    ctx.fillRect(0,0,G.viewW,CFG.VIEW_H);
    this.txt(ctx,'PAUSED',G.viewW/2,92,20,'#fff','center',true);
    this.txt(ctx,'P 键继续 · M 键音效开关',G.viewW/2,124,8,'rgba(255,255,255,.85)','center');
  },

  card(G,ctx){
    ctx.setTransform(G.dpr,0,0,G.dpr,0,0);
    const z=G.Z;
    ctx.translate(G.offX,G.offY);
    ctx.scale(z,z);
    this.txt(ctx,'WORLD '+LV.defs[G.levelIdx].name.split(' ')[0],G.viewW/2,86,16,'#fff','center',true);
    this.txt(ctx,LV.defs[G.levelIdx].name.split(' ').slice(1).join(' '),G.viewW/2,110,9,'rgba(255,255,255,.8)','center');
    ctx.drawImage(ART.H['small_idle_norm'],G.viewW/2-22,132,14,14);
    this.txt(ctx,'× '+G.lives,G.viewW/2+2,134,11,'#fff');
  },

  title(G,ctx){
    const dpr=G.dpr,dz=G.Z*dpr;
    ctx.setTransform(dz,0,0,dz,G.offX*dpr,G.offY*dpr);
    const savedTheme=G.theme?null:null;
    let g=this.skyCache.get('titleSky');
    if(!g){
      g=ctx.createLinearGradient(0,0,0,240);
      g.addColorStop(0,'#63b4f5');g.addColorStop(1,'#9fd8ff');
      this.skyCache.set('titleSky',g);
    }
    ctx.fillStyle=g;ctx.fillRect(-8,-8,G.viewW+16,256);
    const tc=G.titleCam;
    this.cloudsTitle(G,ctx,tc);
    this.tileStripT(ART.B.hills,.5,178,tc,ctx);
    this.tileStripT(ART.B.bush,1,214,tc,ctx);
    ctx.fillStyle=ART.themes.day.ground[2];
    ctx.fillRect(-8,224,G.viewW+16,32);
    ctx.fillStyle=ART.themes.day.ground[0];
    ctx.fillRect(-8,222,G.viewW+16,5);
    for(let i=0;i<5;i++){
      const gx=(i*97+tc*.9)%(G.viewW+80)-40;
      const fr=Math.floor(G.tick/7+i)%4;
      ctx.drawImage(ART.I.coin[fr],gx,120+(i%2)*18,13,13);
    }
    const gi=Math.floor(tc/2)%(G.viewW+120)-60;
    ctx.drawImage(Math.floor(G.tick/9)%2?ART.F.goombaA:ART.F.goombaB,gi,208,17,17);
    const bob=Math.sin(G.tick*.05)*2;
    ctx.save();
    ctx.translate(G.viewW*.78,196+bob);
    const hi=ART.H['big_idle_norm'];
    ctx.drawImage(hi,-8,-30,hi.width/ART.SS,hi.height/ART.SS);
    ctx.restore();

    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.translate(G.offX,G.offY);
    ctx.scale(G.Z,G.Z);
    const cx=G.viewW/2;
    ctx.fillStyle='rgba(12,16,38,.42)';
    if(ctx.roundRect){ctx.beginPath();ctx.roundRect(cx-118,26,236,74,10);ctx.fill();}
    else ctx.fillRect(cx-118,26,236,74);
    this.txt(ctx,'SUPER PIXEL LAND',cx,38,21,'#ffe27a','center',true);
    this.txt(ctx,'超 级 像 素 大 陆',cx,68,12,'#fff','center');
    const items=['开 始 游 戏','操 作 说 明'];
    if(G.unlocked>1)items.push('选关 ◀ '+LV.defs[G.pickLevel].name.split(' ')[0]+' ▶');
    items.forEach((s,i)=>{
      const sel=G.menuSel===i;
      this.txt(ctx,(sel?'▶ ':'')+s,cx,118+i*17,sel?11:9,sel?'#ffe27a':'rgba(255,255,255,.82)','center',sel);
    });
    this.txt(ctx,'HI '+U.pad(G.hiscore,6),cx,180,8,'#ffd94a','center');
    this.txt(ctx,'方向键/WASD 移动 · K/空格 跳 · L/Shift 冲刺&火球 · 下蹲/进管 ↓',cx,204,6.5,'rgba(255,255,255,.75)','center');
    if(G.howOpen){
      ctx.fillStyle='rgba(8,10,25,.88)';
      ctx.fillRect(30,40,G.viewW-60,160);
      this.txt(ctx,'操 作 说 明',cx,52,13,'#ffe27a','center',true);
      const lines=[
        '←→/AD 移动      Z/J/空格/↑ 跳跃(长按跳更高)',
        'X/K/Shift 冲刺 · 火力状态发射火球',
        '↓ 下蹲 · 站在特定水管上按 ↓ 进入',
        '顶砖块获得金币和道具 · 蘑菇变大 ·',
        '火焰花发射火球 · 星星短暂无敌',
        '踩扁敌人 · 踢龟壳连击 · 集满100金币奖命',
        '',
        '按 Enter/Z 返回'
      ];
      lines.forEach((l,i)=>this.txt(ctx,l,cx,76+i*13,7.5,'#fff','center'));
    }
  },

  tileStripT(img,parallax,y,cam,ctx){
    const w=img.width/ART.SS;
    let ox=-((cam*parallax)%w);
    for(let x=ox;x<G.viewW+w;x+=w)ctx.drawImage(img,x,y,w,img.height/ART.SS);
  },
  cloudsTitle(G,ctx,tc){
    const span=300;
    for(let k=0;k<4;k++){
      const hx=U.hash(k*37+5);
      let x=(k*span+hx*200-tc*.3)%(span*3);
      if(x<-70)x+=span*3;
      const img=ART.B['cloud'+(k%3)];
      ctx.drawImage(img,x% (span*3),16+k*20,img.width/ART.SS,img.height/ART.SS);
    }
  },

  gameover(G,ctx){
    ctx.setTransform(G.dpr,0,0,G.dpr,0,0);
    ctx.translate(G.offX,G.offY);
    ctx.scale(G.Z,G.Z);
    this.txt(ctx,'GAME OVER',G.viewW/2,92,22,'#ff6a5a','center',true);
    this.txt(ctx,'得分 '+U.pad(G.score,6)+'   金币 ×'+G.coins,G.viewW/2,128,9,'#fff','center');
    if(G.overT>40){
      if(Math.floor(G.tick/22)%2===0)
        this.txt(ctx,'按 Enter 返回标题',G.viewW/2,156,8,'rgba(255,255,255,.85)','center');
    }
  },

  win(G,ctx){
    ctx.setTransform(dzSafe(G),0,0,dzSafe(G),G.offX*G.dpr,G.offY*G.dpr);
    let g=this.skyCache.get('winSky');
    if(!g){
      g=ctx.createLinearGradient(0,0,0,240);
      g.addColorStop(0,'#1c1440');g.addColorStop(1,'#4a2058');
      this.skyCache.set('winSky',g);
    }
    ctx.fillStyle=g;ctx.fillRect(0,0,G.viewW,CFG.VIEW_H);
    for(const f of G.fx)f.draw(ctx);
    ctx.setTransform(G.dpr,0,0,G.dpr,0,0);
    ctx.translate(G.offX,G.offY);
    ctx.scale(G.Z,G.Z);
    this.txt(ctx,'通 关 达 成 !',G.viewW/2,66,22,'#ffe27a','center',true);
    this.txt(ctx,'感谢游玩 SUPER PIXEL LAND',G.viewW/2,102,9,'#fff','center');
    this.txt(ctx,'最终得分 '+U.pad(G.score,6),G.viewW/2,126,10,'#ffd94a','center');
    this.txt(ctx,'金币 ×'+G.coins+'   剩余生命 ×'+Math.max(0,G.lives),G.viewW/2,146,8,'rgba(255,255,255,.85)','center');
    if(Math.floor(G.tick/22)%2===0)
      this.txt(ctx,'按 Enter 返回标题',G.viewW/2,176,8,'rgba(255,255,255,.85)','center');
    G.winFxTick=(G.winFxTick||0)+1;
  }
};
function dzSafe(G){return G.Z*G.dpr;}
