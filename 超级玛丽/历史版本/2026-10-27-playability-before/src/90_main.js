(function(){
  let last=0,acc=0;
  function frame(t){
    requestAnimationFrame(frame);
    if(!last)last=t;
    let dt=t-last;last=t;
    if(dt>100)dt=100;
    acc+=dt;
    let n=0;
    while(acc>=CFG.STEP&&n<4){
      try{ G.step(); }catch(e){ console.error(e); }
      acc-=CFG.STEP;n++;
    }
    if(n===4)acc=0;
    try{ G.render(); }catch(e){ console.error(e); }
  }
  function boot(){
    G.init();
    requestAnimationFrame(frame);
  }
  window.__SPL={G,A,INP,LV,ART,U};
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
