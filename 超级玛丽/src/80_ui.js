// DOM controls mirror the same state/actions as keyboard and gamepad.
const UI={
  ready:false,last:'',
  el(id){return document.getElementById(id);},
  init(){
    const root=this.el('overlay');
    if(!root?.querySelectorAll)return;
    this.ready=true;
    const bind=(id,action)=>this.el(id)?.addEventListener('click',e=>{
      e.currentTarget?.blur?.();A.unlock();action();this.last='';this.sync();
    });
    bind('start',()=>G.fadeOut(()=>G.newGame()));
    bind('help',()=>{G.howOpen=true;});bind('back',()=>{G.howOpen=false;});
    bind('mode',()=>{G.mode=G.mode==='classic'?'relaxed':'classic';G.saveProgress();});
    for(let i=0;i<LV.defs.length;i++)bind('level-'+i,()=>{if(i<G.unlocked){G.pickLevel=i;G.menuSel=2;}});
    bind('pause',()=>G.setPaused(!G.paused));bind('mute',()=>A.toggleMute());
    bind('resume',()=>G.setPaused(false));
    bind('retry',()=>G.retry());
    bind('home',()=>G.toTitle());bind('result-home',()=>G.toTitle());
    bind('again',()=>{G.pickLevel=G.state==='win'?0:G.levelIdx;G.fadeOut(()=>G.newGame());});
    this.sync();
  },
  sync(){
    if(!this.ready)return;
    const key=[G.state,G.paused,G.howOpen,G.menuSel,G.pauseSel,G.pickLevel,G.mode,G.unlocked,G.hiscore,G.starBest.join(),G.score,A.muted].join(':');
    if(this.last===key)return;this.last=key;
    const title=G.state==='title',pause=G.state==='play'&&G.paused,result=['win','gameover'].includes(G.state);
    this.el('overlay').hidden=!(title||pause||result);
    this.el('title-panel').hidden=!title||G.howOpen;
    this.el('help-panel').hidden=!title||!G.howOpen;
    this.el('pause-panel').hidden=!pause;this.el('result-panel').hidden=!result;
    this.el('pause').hidden=G.state!=='play';this.el('pause').textContent=pause?'继续':'暂停';
    this.el('retry').textContent=G.mode==='classic'?'检查点重试（消耗 1 条生命）':'从检查点重试';
    this.el('mute').textContent='声音 '+(A.muted?'关':'开');
    this.el('start').textContent=(G.pickLevel===0?'开始冒险':'进入 '+LV.defs[G.pickLevel].name)+' →';
    this.el('level-name').textContent=LV.defs[G.pickLevel].name.split(' ')[1];
    this.el('mode').textContent=(G.mode==='classic'?'经典挑战':'轻松探索')+' ⇄';
    this.el('mode-hint').textContent=G.mode==='classic'?'5 条生命，限时挑战。收集 100 枚金币可以补一条生命。':'不限生命与时间，从检查点继续。适合慢慢发现每条路线。';
    this.el('record').textContent='最高分 '+U.pad(G.hiscore,6);
    const total=G.starBest.reduce((n,m)=>n+m.toString(2).replace(/0/g,'').length,0);
    this.el('collection').textContent='星币 '+total+' / 12';
    for(let i=0;i<4;i++){
      const el=this.el('level-'+i);el.disabled=i>=G.unlocked;el.setAttribute('aria-pressed',String(i===G.pickLevel));
      el.innerHTML='1-'+(i+1)+'<small>'+(el.disabled?'未解锁':[0,1,2].map(b=>G.starBest[i]&(1<<b)?'◆':'◇').join(' '))+'</small>';
      el.classList.toggle('selected',title&&!G.howOpen&&G.menuSel===2&&i===G.pickLevel);
    }
    for(const [id,index] of [['start',0],['help',1],['mode',3]])this.el(id).classList.toggle('selected',title&&!G.howOpen&&G.menuSel===index);
    for(const [id,index] of [['resume',0],['retry',1],['home',2]])this.el(id).classList.toggle('selected',pause&&G.pauseSel===index);
    if(result){
      const win=G.state==='win';this.el('result-tag').textContent=win?'ADVENTURE COMPLETE':'ONE MORE TRY';
      this.el('result-title').textContent=win?'四个世界，都走过了。':'差一点，再试一次。';
      this.el('result-detail').textContent='本次得分 '+U.pad(G.score,6)+' · 已收藏星币 '+total+'/12'+(win?'。还有藏起来的路线等你发现。':'。已解锁的关卡和通关星币会保留。');
    }
  }
};
