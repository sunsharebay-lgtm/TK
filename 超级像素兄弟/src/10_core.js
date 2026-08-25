'use strict';
const U = {
  clamp:(v,a,b)=>v<a?a:v>b?b:v,
  lerp:(a,b,t)=>a+(b-a)*t,
  approach:(v,t,d)=>v<t?Math.min(v+d,t):Math.max(v-d,t),
  rand:(a,b)=>a+Math.random()*(b-a),
  randi:(a,b)=>Math.floor(a+Math.random()*(b-a+1)),
  hash(n){ n=Math.imul(n^(n>>>16),2246822519); n=Math.imul(n^(n>>>13),3266489917); return ((n^(n>>>16))>>>0)/4294967296; },
  aabb:(a,b)=>a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y,
  pad:(n,l)=>String(Math.max(0,Math.floor(n))).padStart(l,'0')
};

const CFG = {
  TILE:16, ROWS:15,
  STEP:1000/60,
  GRAV:.50, GRAV_HOLD:.26, MAX_FALL:7.4,
  ACC_WALK:.11, ACC_RUN:.16, FRICTION:.18, SKID:.30,
  MAX_WALK:1.7, MAX_RUN:2.85,
  JUMP_V:-7.3, JUMP_SPD_BONUS:.28, JUMP_CUT:-6.0,
  COYOTE:5, JBUF:7,
  STOMP_BOUNCE:-4.6, STOMP_BOUNCE_HI:-7.4,
  SHELL_SPEED:3.4,
  FIRE_VX:4.2, FIRE_MAX:2,
  STAR_TIME:660,
  TICK_FRAMES:24,
  VIEW_H:240
};

const TILE_SOLID = new Set([1,2,3,4,5,6,7,8,9,10,11,12,13]);
const TL = {
  EMPTY:0,
  GTOP:1, GFILL:2,
  STONE:3,
  BRICK:4, BRICK_COIN:5,
  Q_COIN:6, Q_POWER:7, Q_STAR:8,
  USED:9,
  PIPE_TL:10, PIPE_TR:11, PIPE_BL:12, PIPE_BR:13,
  PLAT:14,
  HIDDEN:15,
  POLE:16, POLE_TOP:17,
  LAVA_T:18, LAVA_B:19
};
function isSolid(t){ return TILE_SOLID.has(t); }

const INP = {
  keys:{}, just:{}, anyKey:false,
  map:{
    left:['ArrowLeft','KeyA'], right:['ArrowRight','KeyD'],
    down:['ArrowDown','KeyS'],
    up:['ArrowUp','KeyW'],
    jump:['Space','ArrowUp','KeyK'],
    run:['KeyL','ShiftLeft','ShiftRight'],
    pause:['KeyP','Escape'], mute:['KeyM'], confirm:['Enter','Space','KeyK']
  },
  init(){
    const dn=e=>{
      this.anyKey=true;
      if(e.code==='F5'||(e.ctrlKey&&e.code==='KeyR'))return;
      for(const k in this.map) if(this.map[k].includes(e.code)){
        if(!this.keys[k])this.just[k]=true; this.keys[k]=true; e.preventDefault();
      }
      A.unlock();
    };
    const up=e=>{ for(const k in this.map) if(this.map[k].includes(e.code)) this.keys[k]=false; };
    addEventListener('keydown',dn,{passive:false});
    addEventListener('keyup',up);
    addEventListener('blur',()=>{ this.keys={}; });
    this.initTouch();
    this.initGamepad();
  },
  press(k){ return !!this.just[k]; },
  endFrame(){ this.just={}; },
  bindBtn(id,k){
    const el=document.getElementById(id); if(!el)return;
    const on=e=>{ e.preventDefault(); if(!this.keys[k])this.just[k]=true; this.keys[k]=true; el.classList.add('on'); A.unlock(); };
    const off=e=>{ e.preventDefault(); this.keys[k]=false; el.classList.remove('on'); };
    el.addEventListener('pointerdown',on);
    el.addEventListener('pointerup',off);
    el.addEventListener('pointercancel',off);
    el.addEventListener('pointerleave',off);
  },
  initTouch(){
    const show=()=>{ const tc=document.getElementById('tc'); if(tc)tc.style.display='block'; removeEventListener('touchstart',show); };
    addEventListener('touchstart',show,{once:true});
    this.bindBtn('bL','left'); this.bindBtn('bR','right');
    this.bindBtn('bD','down'); this.bindBtn('bA','jump'); this.bindBtn('bB','run');
    const cv=document.getElementById('cv');
    if(cv) cv.addEventListener('pointerdown',()=>{ this.anyKey=true; A.unlock(); });
    const fs=document.getElementById('fs');
    if(fs) fs.addEventListener('click',()=>{
      const w=document.getElementById('wrap');
      if(!document.fullscreenElement){ (w.requestFullscreen||w.webkitRequestFullscreen).call(w); }
      else document.exitFullscreen();
    });
  },
  gpPrev:{},
  initGamepad(){},
  pollGamepad(){
    if(!navigator.getGamepads)return;
    const gps=navigator.getGamepads();
    const seen=new Set();
    for(const gp of gps){
      if(!gp)continue;
      const id=String(gp.index);
      seen.add(id);
      const ax=gp.axes[0]||0;
      const held={
        left:ax<-.4||!!(gp.buttons[14]&&gp.buttons[14].pressed),
        right:ax>.4||!!(gp.buttons[15]&&gp.buttons[15].pressed),
        jump:!!(gp.buttons[0]&&gp.buttons[0].pressed),
        run:!!(gp.buttons[2]&&gp.buttons[2].pressed)||!!(gp.buttons[1]&&gp.buttons[1].pressed)
      };
      for(const k of ['left','right','jump','run']){
        if(held[k]&&!this.gpPrev[id+'|'+k])this.just[k]=true;
        this.keys[k]=this.keys[k]||held[k];
      }
      const st=!!(gp.buttons[9]&&gp.buttons[9].pressed);
      if(st&&!this.gpPrev[id+'|pause'])this.just.pause=true;
      this.gpPrev[id+'|left']=held.left; this.gpPrev[id+'|right']=held.right;
      this.gpPrev[id+'|jump']=held.jump; this.gpPrev[id+'|run']=held.run;
      this.gpPrev[id+'|pause']=st;
    }
    for(const k of Object.keys(this.gpPrev)){
      if(!seen.has(k.split('|')[0]))delete this.gpPrev[k];
    }
  }
};
