const A = {
  ctx:null, master:null, sfxG:null, musG:null,
  muted:(()=>{try{return localStorage.getItem('spl_mute')==='1'}catch(e){return false}})(),
  tempoMult:1,
  curKey:null, stepIdx:0, nextT:0, timer:null, noiseBuf:null,

  unlock(){
    if(this.ctx){ if(this.ctx.state==='suspended'){ try{this.ctx.resume();}catch(e){} } return; }
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      this.ctx=new AC();
      this.master=this.ctx.createGain();
      this.master.gain.value=this.muted?0:.55;
      this.master.connect(this.ctx.destination);
      this.sfxG=this.ctx.createGain(); this.sfxG.gain.value=.9; this.sfxG.connect(this.master);
      this.musG=this.ctx.createGain(); this.musG.gain.value=.5; this.musG.connect(this.master);
    }catch(e){ this.ctx=null; }
  },
  toggleMute(){
    this.muted=!this.muted;
    try{localStorage.setItem('spl_mute',this.muted?'1':'0');}catch(e){}
    if(this.master)this.master.gain.value=this.muted?0:.55;
  },

  tone(o){
    if(!this.ctx||!o)return;
    try{
      const c=this.ctx, t=c.currentTime+(o.delay||0), dur=o.t||.1;
      const osc=c.createOscillator(), g=c.createGain();
      osc.type=o.type||'square';
      osc.frequency.setValueAtTime(Math.max(1,o.f0||440),t);
      if(o.f1&&Math.abs(o.f1-(o.f0||440))>1)
        osc.frequency.exponentialRampToValueAtTime(Math.max(1,o.f1),t+dur);
      g.gain.setValueAtTime(.0001,t);
      g.gain.linearRampToValueAtTime(o.v||.2,t+.008);
      g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      osc.connect(g); g.connect(o.dest||this.sfxG);
      osc.start(t); osc.stop(t+dur+.03);
    }catch(e){}
  },
  noise(o){
    if(!this.ctx)return;
    try{
      const c=this.ctx;
      if(!this.noiseBuf){
        const len=c.sampleRate|0;
        this.noiseBuf=c.createBuffer(1,len,c.sampleRate);
        const d=this.noiseBuf.getChannelData(0);
        for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
      }
      const t=c.currentTime+(o.delay||0), dur=o.t||.1;
      const src=c.createBufferSource(); src.buffer=this.noiseBuf; src.loop=true;
      const fl=c.createBiquadFilter();
      fl.type=o.ftype||'lowpass'; fl.frequency.value=o.f||1000; fl.Q.value=o.q||.8;
      const g=c.createGain();
      g.gain.setValueAtTime(.0001,t);
      g.gain.linearRampToValueAtTime(o.v||.2,t+.006);
      g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      src.connect(fl); fl.connect(g); g.connect(this.sfxG);
      src.start(t); src.stop(t+dur+.03);
    }catch(e){}
  },
  freqOf(midi){ return 440*Math.pow(2,(midi-69)/12); },

  sfx(name){
    if(!this.ctx)return;
    switch(name){
      case 'jump': this.tone({f0:200,f1:640,t:.16,v:.2}); break;
      case 'bigjump': this.tone({f0:150,f1:480,t:.2,v:.22}); break;
      case 'bump': this.tone({type:'triangle',f0:130,f1:70,t:.09,v:.32}); break;
      case 'stomp':
        this.noise({t:.09,v:.28,f:500});
        this.tone({type:'sine',f0:260,f1:80,t:.12,v:.25});
        break;
      case 'coin':
        this.tone({f0:988,t:.05,v:.15});
        this.tone({f0:1319,t:.32,v:.18,delay:.05});
        break;
      case 'breakBlock':
        this.noise({t:.16,v:.3,f:900,ftype:'bandpass'});
        this.tone({f0:220,f1:70,t:.14,v:.18});
        break;
      case 'itemRise': {
        const fs=[160,240,340,470,630,800,980];
        fs.forEach((f,i)=>this.tone({f0:f,t:.05,v:.11,delay:i*.048}));
        break;
      }
      case 'power': {
        [72,76,79,84,88,91].forEach((m,i)=>this.tone({f0:this.freqOf(m),t:.06,v:.13,delay:i*.05}));
        break;
      }
      case 'pipe': this.tone({f0:620,f1:130,t:.34,v:.18}); break;
      case 'fire': this.tone({type:'sawtooth',f0:520,f1:140,t:.13,v:.12}); break;
      case 'kick':
        this.noise({t:.04,v:.2,f:2500,ftype:'highpass'});
        this.tone({f0:240,f1:330,t:.07,v:.17});
        break;
      case 'flagpole': this.tone({f0:1150,f1:230,t:.75,v:.11}); break;
      case 'tick': this.tone({f0:1050,t:.03,v:.06}); break;
      case 'fireworkBoom':
        this.noise({t:.35,v:.28,f:350});
        this.tone({type:'sine',f0:200,f1:50,t:.3,v:.22});
        break;
      case 'select': this.tone({f0:720,f1:900,t:.05,v:.11}); break;
      case 'pauseBlip': this.tone({type:'triangle',f0:520,t:.06,v:.14}); break;
    }
  },

  jingle(seq){
    if(!this.ctx)return;
    let d=0;
    for(const it of seq){
      if(it[0]>0){
        this.tone({f0:this.freqOf(it[0]),t:it[1],v:it[2]||.16,delay:d});
        if(it[3]) this.tone({f0:this.freqOf(it[3]),t:it[1],v:.1,delay:d});
      }
      d+=it[1];
    }
  },
  jClear(){ this.jingle([[67,.09],[72,.09],[76,.09],[79,.09],[84,.14],[0,.05],[88,.34]]); },
  jDeath(){ this.jingle([[69,.13],[64,.13],[60,.19],[0,.05],[57,.3]]); },
  jGameOver(){ this.jingle([[60,.26],[55,.26],[52,.26],[48,.62]]); },
  jOneUp(){ this.jingle([[76,.08],[79,.08],[84,.08],[88,.08],[91,.2]]); },
  jWarning(){ this.jingle([[81,.08],[0,.07],[81,.08],[0,.07],[81,.1]]); },

  noteMidi(s){
    const m=/^([A-G])([#b]?)(\d)$/.exec(s);
    if(!m)return null;
    const base={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);
    return 12*(parseInt(m[3])+1)+base;
  },
  parseTrack(s){
    const tk=s.trim().split(/\s+/);
    const ev=new Array(tk.length).fill(null);
    for(let i=0;i<tk.length;i++){
      const t=tk[i];
      if(t==='.'||t==='-')continue;
      if(t.length===1&&'KSHksh'.includes(t)){ ev[i]={d:t}; continue; }
      const m=this.noteMidi(t);
      if(m==null)continue;
      let len=1,j=i+1;
      while(j<tk.length&&tk[j]==='-'){len++;j++;}
      ev[i]={m,len};
    }
    return ev;
  },

  songs:{
    overworld:{ bpm:152, tracks:[
      { w:'square', v:.085, s:`E5 - - G5 A5 - G5 - E5 - D5 - C5 - D5 -
E5 - G5 - E5 - C5 - D5 - - - . . . .
F5 - A5 - G5 - F5 - E5 - D5 - E5 - C5 -
D5 - B4 - C5 - - - . . . . . . . .
G5 - E5 - G5 - C6 - A5 - G5 - E5 - G5 -
A5 - F5 - A5 - C6 - B5 - G5 - A5 - B5 -
C6 - G5 - E5 - G5 - A5 - F5 - G5 - E5 -
D5 - E5 - D5 - B4 - C5 - - - . . . .` },
      { w:'triangle', v:.17, s:`C3 - G2 - C3 - G2 - C3 - G2 - C3 - G2 -
A2 - E2 - A2 - E2 - A2 - E2 - A2 - E2 -
F2 - C3 - F2 - C3 - F2 - C3 - F2 - C3 -
G2 - D3 - G2 - D3 - G2 - D3 - G2 - B2 -
C3 - G2 - C3 - G2 - C3 - G2 - C3 - G2 -
F2 - C3 - F2 - C3 - F2 - C3 - F2 - C3 -
G2 - D3 - G2 - D3 - G2 - D3 - G2 - B2 -
G2 - D3 - G2 - B2 - C3 - - - . . . .` },
      { w:'square', v:.045, s:`. . . . E4 . . . . . . . G4 . . .
. . . . C4 . . . . . . . E4 . . .
. . . . F4 . . . . . . . A4 . . .
. . . . D4 . . . . . . . B4 . . .
. . . . E4 . . . . . . . G4 . . .
. . . . F4 . . . . . . . A4 . . .
. . . . D4 . . . . . . . B4 . . .
. . . . E4 . . . G4 . . . C5 . . .` },
      { w:'drums', v:.5, s:`K . H . S . H H K . H . S . H H
K . H . S . H H K . H . S . H H
K . H . S . H H K . H . S . H H
K . H . S . H H K . H . S . H h
K . H . S . H H K . H . S . H H
K . H . S . H H K . H . S . H H
K . H . S . H H K . H . S . H H
K . H . S . H H K . h . S . h .` }
    ]},
    underground:{ bpm:116, tracks:[
      { w:'square', v:.09, s:`A3 - - - - - - - C4 - - - E4 - - -
D4 - - - C4 - - - A3 - - - - - - -
F3 - - - A3 - - - C4 - - - B3 - - -
E3 - - - G#3 - - - A3 - - - - - - -` },
      { w:'square', v:.04, shift:6, s:`A3 - - - - - - - C4 - - - E4 - - -
D4 - - - C4 - - - A3 - - - - - - -
F3 - - - A3 - - - C4 - - - B3 - - -
E3 - - - G#3 - - - A3 - - - - - - -` },
      { w:'triangle', v:.16, s:`A1 - - - - - - - - - - - - - - -
A1 - - - - - - - - - - - - - - -
F1 - - - - - - - - - - - - - - -
E1 - - - - - - - - - - - - - - -` },
      { w:'drums', v:.35, s:`. . . h . . . h . . . h . . . h
. . . h . . . h . . . h . . . h
. . . h . . . h . . . h . . . h
. . . h . . . h . . . h . . . k` }
    ]},
    dusk:{ bpm:140, tracks:[
      { w:'square', v:.085, s:`F5 - C5 - F5 - A5 - C6 - A5 - F5 - C5 -
D5 - A4 - D5 - F5 - A5 - F5 - D5 - A4 -
Bb4 - F4 - Bb4 - D5 - F5 - D5 - Bb4 - F4 -
C5 - G4 - C5 - E5 - G5 - E5 - C5 - G4 -` },
      { w:'triangle', v:.16, s:`F2 - - - C3 - - - F2 - - - C3 - - -
D2 - - - A2 - - - D2 - - - A2 - - -
Bb1 - - - F2 - - - Bb1 - - - F2 - - -
C2 - - - G2 - - - C2 - - - G2 - - -` },
      { w:'square', v:.04, s:`. . . . A4 . . . . . . . C5 . . .
. . . . F4 . . . . . . . A4 . . .
. . . . D4 . . . . . . . F4 . . .
. . . . E4 . . . . . . . G4 . . .` },
      { w:'drums', v:.4, s:`K . . H . . H . K . . H . . H .
K . . H . . H . K . . H . . H .
K . . H . . H . K . . H . . H .
K . . H . . H . K . . S . S . h` }
    ]},
    star:{ bpm:184, tracks:[
      { w:'square', v:.09, s:`C5 . E5 . C5 . E5 . G5 . E5 . C5 . E5 .
F5 . E5 . D#5 . E5 . D5 . E5 . C5 . D5 .` },
      { w:'triangle', v:.17, s:`C2 C2 G2 C2 C2 C2 G2 C2 C2 C2 G2 C2 C2 C2 G2 C2
F2 F2 C3 F2 F2 F2 C3 F2 G2 G2 D3 G2 G2 G2 B2 C2` },
      { w:'drums', v:.55, s:`K H S H K H S H K H S H K H S H
K H S H K H S H K H S H K H S h` }
    ]},
    castle:{ bpm:148, tracks:[
      { w:'square', v:.08, s:`E4 . Eb4 . E4 . D4 . E4 . F4 . E4 . B3 .
E4 . Eb4 . E4 . D4 . E4 . G4 . F#4 . F4 .
E4 . Eb4 . E4 . D4 . E4 . F4 . E4 . Bb3 .
A3 . B3 . C4 . B3 . A3 . Ab3 . A3 . . .` },
      { w:'triangle', v:.17, s:`C2 . C2 . Db2 . C2 . C2 . C2 . Eb2 . C2 .
C2 . C2 . Db2 . C2 . C2 . C2 . D2 . C2 .
C2 . C2 . Db2 . C2 . C2 . C2 . Eb2 . C2 .
Ab2 . Ab2 . G2 . Ab2 . Ab2 . Ab2 . G2 . Ab2 .` },
      { w:'drums', v:.4, s:`K . h h . . h h K . h h . . h h
K . h h . . h h K . h h . . h h
K . h h . . h h K . h h . . h h
K . h h . . h h K . h h . S . h` }
    ]}
  },

  buildSongs(){
    for(const k in this.songs){
      const sg=this.songs[k];
      let maxLen=0;
      const tracks=sg.tracks.map(tr=>{
        let ev=this.parseTrack(tr.s);
        if(tr.shift>0){
          const n=new Array(ev.length+tr.shift).fill(null);
          for(let i=0;i<ev.length;i++)n[i+tr.shift]=ev[i];
          ev=n;
        }
        maxLen=Math.max(maxLen,ev.length);
        return {w:tr.w,v:tr.v,ev};
      });
      sg.tracks=tracks.map(tr=>{
        while(tr.ev.length<maxLen)tr.ev.push(null);
        return tr;
      });
      sg.len=maxLen;
    }
  },

  playMusic(key){
    if(this.curKey===key&&this.timer)return;
    this.stopMusic();
    this.curKey=key;
    if(!this.ctx)return;
    const sg=this.songs[key]; if(!sg)return;
    this.stepIdx=0;
    this.nextT=this.ctx.currentTime+.06;
    this.timer=setInterval(()=>this.tickSched(),25);
  },
  stopMusic(){
    if(this.timer){clearInterval(this.timer);this.timer=null;}
    this.curKey=null;
  },
  pauseMusic(){
    if(this.timer){clearInterval(this.timer);this.timer=null;}
  },
  resumeMusic(){
    if(!this.curKey||this.timer||!this.ctx)return;
    this.nextT=this.ctx.currentTime+.06;
    this.timer=setInterval(()=>this.tickSched(),25);
  },
  stepDur(key){
    const sg=this.songs[key]||{bpm:120};
    return (60/sg.bpm)/4/this.tempoMult;
  },
  tickSched(){
    if(!this.ctx||!this.curKey)return;
    const c=this.ctx, sd=this.stepDur(this.curKey);
    while(this.nextT<c.currentTime+.14){
      this.schedStep(this.curKey,this.stepIdx,this.nextT,sd);
      this.nextT+=sd;
      this.stepIdx=(this.stepIdx+1)%this.songs[this.curKey].len;
    }
  },
  schedStep(key,idx,t,sd){
    const sg=this.songs[key], c=this.ctx;
    for(const tr of sg.tracks){
      const raw=tr.ev[idx];
      if(!raw)continue;
      const at=t+(idx===0?0:0);
      if(raw.d!==undefined){
        const soft='ksh'.includes(raw.d)?0.45:1;
        if(raw.d==='K'||raw.d==='k'){
          const o=c.createOscillator(),g=c.createGain();
          o.type='sine';
          o.frequency.setValueAtTime(160,at);
          o.frequency.exponentialRampToValueAtTime(42,at+.1);
          g.gain.setValueAtTime(.5*tr.v*soft,at);
          g.gain.exponentialRampToValueAtTime(.001,at+.11);
          o.connect(g);g.connect(this.musG);o.start(at);o.stop(at+.13);
        }else{
          const snare=(raw.d==='S');
          const src=c.createBufferSource();
          if(!this.noiseBuf){
            const len=c.sampleRate|0;
            this.noiseBuf=c.createBuffer(1,len,c.sampleRate);
            const dd=this.noiseBuf.getChannelData(0);
            for(let i=0;i<len;i++)dd[i]=Math.random()*2-1;
          }
          src.buffer=this.noiseBuf;src.loop=true;
          const f=c.createBiquadFilter();
          f.type=snare?'bandpass':'highpass';
          f.frequency.value=snare?1800:6800;
          const g=c.createGain();
          const dur=snare?.07:.03, vol=snare?.22:.1;
          g.gain.setValueAtTime(vol*tr.v*soft,at);
          g.gain.exponentialRampToValueAtTime(.001,at+dur);
          src.connect(f);f.connect(g);g.connect(this.musG);
          src.start(at);src.stop(at+dur+.02);
        }
        continue;
      }
      const dur=Math.max(.05,raw.len*sd*.9);
      try{
        const o=c.createOscillator(),g=c.createGain();
        o.type=tr.w==='square'?'square':'triangle';
        o.frequency.setValueAtTime(440*Math.pow(2,(raw.m-69)/12),at);
        g.gain.setValueAtTime(.0001,at);
        g.gain.linearRampToValueAtTime(tr.v,at+.01);
        g.gain.setValueAtTime(tr.v,at+dur*.7);
        g.gain.exponentialRampToValueAtTime(.0001,at+dur);
        o.connect(g);g.connect(this.musG);
        o.start(at);o.stop(at+dur+.02);
      }catch(e){}
    }
  }
};
A.buildSongs();
try{
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)A.pauseMusic();
    else if(A.curKey)A.resumeMusic();
  });
}catch(e){}
