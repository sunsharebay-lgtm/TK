'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.argv[2]||'playwright');
const output=path.join(__dirname,'.artifacts');fs.mkdirSync(output,{recursive:true});
const url=pathToFileURL(path.join(__dirname,'../index.html')).href;
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const errors=[];
    const attach=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
    const page=await browser.newPage({viewport:{width:1280,height:800}});attach(page);
    await page.clock.install();await page.goto(url);await page.clock.runFor(600);
    assert.equal(await page.locator('#title-panel').isVisible(),true);
    await page.screenshot({path:path.join(output,'title-desktop.png')});
    await page.locator('#mute').click();assert.equal(await page.evaluate(()=>__SPL.A.muted),true);
    await page.locator('#mute').click();assert.equal(await page.evaluate(()=>__SPL.A.muted),false);
    await page.locator('#help').click();assert.equal(await page.locator('#help-panel').isVisible(),true);
    await page.locator('#back').click();await page.locator('#start').click();await page.clock.runFor(1900);
    assert.equal(await page.evaluate(()=>__SPL.G.state),'play');
    const x=await page.evaluate(()=>__SPL.G.player.x);
    await page.keyboard.down('ArrowRight');await page.clock.runFor(350);await page.keyboard.up('ArrowRight');
    assert.ok(await page.evaluate(()=>__SPL.G.player.x)>x+20);
    await page.keyboard.down('Space');await page.clock.runFor(180);await page.keyboard.up('Space');
    assert.ok(await page.evaluate(()=>!__SPL.G.player.onGround));
    await page.clock.runFor(600);await page.screenshot({path:path.join(output,'play-desktop.png')});
    await page.locator('#pause').click();assert.equal(await page.locator('#pause-panel').isVisible(),true);
    const pausedX=await page.evaluate(()=>__SPL.G.player.x);await page.clock.runFor(1000);
    assert.equal(await page.evaluate(()=>__SPL.G.player.x),pausedX);
    await page.screenshot({path:path.join(output,'pause-desktop.png')});
    await page.locator('#resume').click();assert.equal(await page.evaluate(()=>__SPL.G.paused),false);
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.clock.runFor(30);
    assert.equal(await page.evaluate(()=>__SPL.G.paused),true);
    await page.locator('#home').click();await page.clock.runFor(500);
    assert.equal(await page.locator('#title-panel').isVisible(),true);
    // Inspect each world visually; this is separate from input-only route tests.
    for(let i=0;i<4;i++){
      await page.evaluate(i=>{__SPL.G.pickLevel=i;__SPL.G.newGame();},i);await page.clock.runFor(1500);
      await page.screenshot({path:path.join(output,`world-${i+1}.png`)});
    }
    const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    const phone=await mobile.newPage();attach(phone);await phone.clock.install();await phone.goto(url);await phone.clock.runFor(600);
    await phone.screenshot({path:path.join(output,'title-mobile.png')});
    await phone.locator('#start').tap();await phone.clock.runFor(1800);
    assert.equal(await phone.evaluate(()=>__SPL.G.state),'play');
    const mx=await phone.evaluate(()=>__SPL.G.player.x);
    await phone.locator('#bR').dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch'});
    await phone.locator('#bA').dispatchEvent('pointerdown',{pointerId:2,pointerType:'touch'});
    await phone.clock.runFor(180);
    assert.ok(await phone.evaluate(()=>__SPL.G.player.x)>mx);
    assert.ok(await phone.evaluate(()=>!__SPL.G.player.onGround));
    await phone.locator('#bR').dispatchEvent('pointerup',{pointerId:1,pointerType:'touch'});
    await phone.locator('#bA').dispatchEvent('pointerup',{pointerId:2,pointerType:'touch'});
    assert.equal(await phone.evaluate(()=>__SPL.INP.keys.right||__SPL.INP.keys.jump),false);
    const bounds=await phone.evaluate(()=>({bottom:__SPL.G.offY+240*__SPL.G.Z,control:document.getElementById('bA').getBoundingClientRect().top}));
    assert.ok(bounds.bottom<bounds.control,'竖屏游戏区域不能被触屏按钮遮挡');
    await phone.screenshot({path:path.join(output,'play-mobile.png')});
    await phone.locator('#pause').tap();assert.equal(await phone.locator('#pause-panel').isVisible(),true);
    await phone.locator('#resume').tap();assert.equal(await phone.evaluate(()=>__SPL.G.paused),false);
    await phone.setViewportSize({width:844,height:390});await phone.clock.runFor(100);await phone.screenshot({path:path.join(output,'play-mobile-landscape.png')});
    assert.deepEqual(errors,[]);
    console.log('BROWSER_OK: desktop click/keyboard/pause/blur, touch multi-pointer/release, portrait/landscape; no browser errors');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
