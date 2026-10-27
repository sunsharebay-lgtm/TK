'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const artifacts = path.join(__dirname, '.artifacts');

(async () => {
  fs.mkdirSync(artifacts, { recursive: true });
  const sourceHash = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '../tank-battle.html'))).digest('hex');
  const sourceSha256 = sourceHash();
  const files = new Map([
    ['/tank-battle.html', ['tank-battle.html', 'text/html; charset=utf-8']],
    ['/assets/blender/tank-sprites-v2.png', ['assets/blender/tank-sprites-v2.png', 'image/png']],
  ]);
  const server = http.createServer((req, res) => {
    const asset = files.get(new URL(req.url, 'http://localhost').pathname);
    if (!asset) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', asset[1]);
    fs.createReadStream(path.resolve(__dirname, '..', asset[0])).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/tank-battle.html`;
  let browser;
  try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const reports = [];
  async function open(options = {}) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => Object.keys(SPR.tanks).length === 9 && SPR.tanks.p1[0][0].width === 128);
    return { context, page };
  }
  async function ready(page) {
    await page.waitForFunction(() => Game.state === 'play' && Game.world.players[0].spawnT <= 0);
  }
  async function canvasCheck(page, label) {
    const result = await page.evaluate(() => {
      const el = document.getElementById('game');
      const r = el.getBoundingClientRect();
      const pixels = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
      let lit = 0;
      for (let i = 0; i < pixels.length; i += 16) if (pixels[i] + pixels[i+1] + pixels[i+2] > 100) lit++;
      return { x:r.x, y:r.y, right:r.right, bottom:r.bottom, width:innerWidth, height:innerHeight, lit };
    });
    assert.ok(result.lit > 1000, `${label}: nonblank canvas`);
    assert.ok(result.x >= 0 && result.y >= 0 && result.right <= result.width + 1 && result.bottom <= result.height + 1,
      `${label}: canvas within viewport ${JSON.stringify(result)}`);
    reports.push({ label, ...result });
  }
  try {
    const { context, page } = await open({ viewport:{ width:1280, height:900 } });
    await page.keyboard.press('Enter');
    await ready(page);
    const before = await page.evaluate(() => Game.world.players[0].x);
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(x => Game.world.players[0].x > x + 5, before);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('Space');
    await page.waitForFunction(() => Game.world.bullets.some(b => b.isPlayer));
    await page.keyboard.up('Space');
    await canvasCheck(page, 'desktop-play');
    await page.screenshot({ path:path.join(artifacts, 'source-audit-desktop.png') });
    await page.keyboard.press('KeyP');
    await page.waitForFunction(() => Game.state === 'pause');
    await page.getByRole('button', { name:'保存进度', exact:true }).click();
    assert.equal(await page.locator('#toast').textContent(), '进度已保存');
    await page.reload();
    await page.locator('#menu .mi').nth(2).click();
    await ready(page);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    assert.equal(await page.evaluate(() => Game.state), 'pause');

    // Exercise the actual HUD with the densest supported campaign state.
    const hud = await page.evaluate(() => {
      Game.hell=true; Game.loop=4; Game.hellRound=4; Game.stageIndex=12; Game.twoP=true;
      Game.beginStage(); Game.enterPlay();
      const w=Game.world;
      w.freezeT=w.baseShieldT=w.field.shovelT=10;
      w.fieldLevel=w.field.eaglePower=w.field.baseArmor=5;
      for(const p of w.players){ p.level=5; p.armor=5; p.twin=3; p.spawnT=0; }
      const calls=[];
      const original=ctx.fillText;
      ctx.fillText=function(text,x,y,...args){ calls.push({text,x,y,width:this.measureText(text).width}); return original.call(this,text,x,y,...args); };
      Game.render(); ctx.fillText=original;
      return calls.filter(c=>c.x>=SBX);
    });
    await page.screenshot({ path:path.join(artifacts, 'source-audit-dense-hud.png') });
    for(const c of hud){
      assert.ok(c.x+c.width <= 556, `HUD text exceeds sidebar: ${c.text}`);
      if(!/^[QPM] /.test(c.text)) assert.ok(c.y+10 <= 400, `HUD overlaps footer: ${c.text}`);
    }
    for(let i=0;i<hud.length;i++) for(let j=i+1;j<hud.length;j++){
      const a=hud[i], b=hud[j];
      assert.ok(!(a.x < b.x+b.width && b.x < a.x+a.width && a.y < b.y+10 && b.y < a.y+10),
        `HUD text overlap: ${a.text} / ${b.text}`);
    }
    reports.push({ label:'dense-hud', calls:hud });
    await context.close();

    for (const viewport of [{ width:390, height:844 }, { width:844, height:390 }]) {
      const { context, page } = await open({ viewport, hasTouch:true, isMobile:true, deviceScaleFactor:2 });
      await page.locator('#menu .mi').nth(0).tap();
      await ready(page);
      const pad = await page.locator('#tPad').boundingBox();
      const fire = await page.locator('#tFire').boundingBox();
      const cdp = await context.newCDPSession(page);
      const finger = { id:1, x:pad.x + pad.width * 0.82, y:pad.y + pad.height/2 };
      const before = await page.evaluate(() => Game.world.players[0].x);
      await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[finger] });
      await page.waitForFunction(x => Game.world.players[0].x > x + 4, before);
      await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[finger, { id:2, x:fire.x+fire.width/2, y:fire.y+fire.height/2 }] });
      await page.waitForFunction(() => Game.world.bullets.some(b=>b.isPlayer));
      await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
      assert.equal(await page.evaluate(() => Input.touch.active || !!Input.touch.fire), false);
      await canvasCheck(page, `mobile-${viewport.width}`);
      await page.screenshot({ path:path.join(artifacts, `source-audit-mobile-${viewport.width}.png`) });
      if(viewport.width < viewport.height){
        await page.locator('#tLand').tap();
        await page.waitForFunction(() => document.documentElement.classList.contains('tk-rotated'));
        await canvasCheck(page, 'mobile-rotated');
        await page.screenshot({ path:path.join(artifacts, 'source-audit-mobile-rotated.png') });
      }
      await context.close();
    }

    const fallback = await browser.newPage();
    fallback.on('pageerror', error=>errors.push(error.message));
    await fallback.route('**/tank-sprites-v2.png', route=>route.abort());
    await fallback.goto(url);
    await fallback.waitForFunction(() => SPR.tanks.p1[0][0].width === 32);
    await fallback.keyboard.press('Enter'); await ready(fallback);
    await canvasCheck(fallback, 'missing-sprite-fallback');
    assert.deepEqual(errors, [], 'No uncaught browser exceptions');
    assert.equal(sourceHash(), sourceSha256, 'Game source must remain unchanged during browser verification');
    fs.writeFileSync(path.join(artifacts, 'browser-audit-results.json'), JSON.stringify({ sourceSha256, reports }, null, 2));
    console.log('BROWSER_AUDIT_OK: keyboard, touch, saves, pause, sprite loading/fallback, canvas bounds');
    console.log(JSON.stringify(reports));
  } finally {
    await browser.close();
  }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode=1; });
