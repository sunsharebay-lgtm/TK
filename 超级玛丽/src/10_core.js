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
  GRAV:.52, GRAV_HOLD:.29, MAX_FALL:7.4,
  ACC_WALK:.20, ACC_RUN:.26, FRICTION:.26, SKID:.44,
  MAX_WALK:1.85, MAX_RUN:3.05,
  JUMP_V:-7.5, JUMP_SPD_BONUS:.22, JUMP_CUT:-3.8,
  COYOTE:7, JBUF:8,
  STOMP_BOUNCE:-4.6, STOMP_BOUNCE_HI:-7.4,
  SHELL_SPEED:3.4,
  FIRE_VX:4.2, FIRE_MAX:2,
  STAR_TIME:660,
  TICK_FRAMES:60,
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
  keyCodes:{}, sources:{keyboard:{},touch:{},gamepad:{}}, touchPointers:{},
  map:{
    left:['ArrowLeft','KeyA'], right:['ArrowRight','KeyD'],
    down:['ArrowDown','KeyS'],
    up:['ArrowUp','KeyW'],
    jump:['Space','ArrowUp','KeyK','KeyZ'],
    run:['KeyL','ShiftLeft','ShiftRight','KeyX'],
    pause:['KeyP','Escape'], mute:['KeyM'], confirm:['Enter','Space','KeyK','KeyZ']
  },
  init(){
    const dn=e=>{
      if(e.target?.tagName==='BUTTON'&&(e.code==='Enter'||e.code==='Space'))return;
      this.anyKey=true;
      if(e.code==='F5'||(e.ctrlKey&&e.code==='KeyR'))return;
      this.keyCodes[e.code]=true;
      for(const k in this.map) if(this.map[k].includes(e.code)){
        this.setSource('keyboard',k,true); e.preventDefault();
      }
      A.unlock();
    };
    const up=e=>{
      delete this.keyCodes[e.code];
      for(const k in this.map) if(this.map[k].includes(e.code)){
        this.setSource('keyboard',k,this.map[k].some(code=>this.keyCodes[code]));
      }
    };
    addEventListener('keydown',dn,{passive:false});
    addEventListener('keyup',up);
    const suspend=()=>{ this.clear(); if(G.state==='play')G.setPaused(true); };
    addEventListener('blur',suspend);
    document.addEventListener('visibilitychange',()=>{ if(document.hidden)suspend(); });
    this.initTouch();
    this.initGamepad();
  },
  setSource(source,k,held){
    held=!!held;
    if(!!this.sources[source][k]===held)return;
    this.sources[source][k]=held;
    const down=Object.values(this.sources).some(state=>state[k]);
    if(down&&!this.keys[k])this.just[k]=true;
    this.keys[k]=down;
  },
  clear(){
    this.keys={}; this.just={}; this.keyCodes={}; this.touchPointers={}; this.anyKey=false;
    this.sources={keyboard:{},touch:{},gamepad:{}};
    for(const id of ['bL','bR','bD','bA','bB'])document.getElementById(id)?.classList?.remove('on');
  },
  press(k){ return !!this.just[k]; },
  endFrame(){ this.just={}; },
  bindBtn(id,k){
    const el=document.getElementById(id); if(!el)return;
    const sync=()=>{
      const held=Object.values(this.touchPointers).includes(k);
      this.setSource('touch',k,held);
      // A 在菜单中承担确认，与键盘 K / Space 的行为一致。
      if(k==='jump')this.setSource('touch','confirm',held);
      if(held)el.classList.add('on');else el.classList.remove('on');
    };
    const on=e=>{
      e.preventDefault(); this.touchPointers[e.pointerId]=k; sync();
      try{el.setPointerCapture?.(e.pointerId);}catch(e){}
      el.blur?.(); A.unlock();
    };
    const off=e=>{ e.preventDefault(); delete this.touchPointers[e.pointerId]; sync(); };
    el.addEventListener('pointerdown',on);
    el.addEventListener('pointerup',off);
    el.addEventListener('pointercancel',off);
    el.addEventListener('pointerleave',off);
  },
  initTouch(){
    const show=()=>{ this.touch=true; const tc=document.getElementById('tc'); if(tc)tc.style.display='block'; G.resize(); removeEventListener('touchstart',show); };
    addEventListener('touchstart',show,{once:true});
    this.bindBtn('bL','left'); this.bindBtn('bR','right');
    this.bindBtn('bD','down'); this.bindBtn('bA','jump'); this.bindBtn('bB','run');
    const cv=document.getElementById('cv');
    if(cv) cv.addEventListener('pointerdown',()=>{ this.anyKey=true; A.unlock(); });
    const fs=document.getElementById('fs');
    if(fs) fs.addEventListener('click',()=>{
      const w=document.documentElement||document.getElementById('wrap');
      const active=document.fullscreenElement||document.webkitFullscreenElement;
      const target=active?document:w;
      const action=active?(document.exitFullscreen||document.webkitExitFullscreen):(w.requestFullscreen||w.webkitRequestFullscreen);
      if(!action)return;
      try{ const result=action.call(target); if(result&&result.catch)result.catch(()=>{}); }catch(e){}
    });
  },
  initGamepad(){},
  pollGamepad(){
    let gps=[];
    try{ if(navigator.getGamepads)gps=navigator.getGamepads(); }catch(e){}
    const held={left:false,right:false,up:false,down:false,jump:false,run:false,confirm:false,pause:false};
    for(const gp of gps){
      if(!gp)continue;
      const ax=gp.axes[0]||0, ay=gp.axes[1]||0;
      const button=n=>!!(gp.buttons[n]&&gp.buttons[n].pressed);
      const current={
        left:ax<-.4||button(14),right:ax>.4||button(15),
        up:ay<-.4||button(12),down:ay>.4||button(13),
        jump:button(0),run:button(2)||button(1),confirm:button(0),pause:button(9)
      };
      for(const k in held)held[k]=held[k]||current[k];
    }
    for(const k in held)this.setSource('gamepad',k,held[k]);
  }
};
