#!/usr/bin/env node
// 可选浏览器验收：需要 Playwright 和 Chrome；纯逻辑测试仍用 check-all.cjs。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const base = process.argv[2] || 'http://127.0.0.1:8123/';
const projects = [
  ['创意空间首页', ''], ['坦克大战', '坦克大战/tank-battle.html'],
  ['吞食天地三国', '吞食天地三国/'], ['超级玛丽', '超级玛丽/'],
  ['墨水屏小站', '墨水屏小站/'], ['Mac软件资源库', 'Mac软件资源库/'], ['粉丝资源', '粉丝资源/'],
];
(async () => {
  const executablePath = process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);
  const browser = await chromium.launch({ headless: true, executablePath });
  const rows = [];
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, isMobile: mobile, hasTouch: mobile });
      // Weather is an external service: make only that network dependency deterministic.
      await context.route('https://wttr.in/**', route => route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ current_condition: [{ temp_C: '20', humidity: '50', weatherDesc: [{ value: 'Sunny' }], windspeedKmph: '1' }] }) }));
      for (const [project, entry] of projects) {
        const page = await context.newPage(), errors = [], badResponses = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error' && !message.text().includes('404')) errors.push(message.text()); });
        page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base) && !response.url().includes('favicon.ico')) badResponses.push(`${response.status()} ${response.url()}`); });
        const row = { project, viewport: mobile ? 'mobile' : 'desktop', ok: false };
        try {
          await page.goto(new URL(entry, base).href, { waitUntil: 'load' });
          if (project === '创意空间首页') {
            await page.waitForFunction(() => document.querySelectorAll('#resources-grid a').length >= 6);
            assert.equal(await page.locator('.game-card').count(), 5);
          } else if (project === '粉丝资源') {
            await page.waitForFunction(() => document.querySelectorAll('#resources-grid a').length === 6);
          } else if (project === 'Mac软件资源库') {
            await page.waitForFunction(() => document.getElementById('visible-count').textContent === '71');
            await page.locator('#search-input').fill('  oBs  ');
            await page.waitForFunction(() => Number(document.getElementById('visible-count').textContent) === 1);
            await page.locator('#search-input').fill('');
          } else if (project === '墨水屏小站') {
            await page.locator('#nav-settings').click();
            await page.locator('#set-city-input').fill('北京');
            await page.locator('.set-save-btn').click();
            await page.waitForFunction(() => currentCity === '北京' && document.getElementById('weather-main').textContent.includes('北京'));
            await page.locator('#nav-list').click();
            await page.locator('#list-input').fill('测试书目'); await page.keyboard.press('Enter');
            assert.match(await page.locator('#list-items').textContent(), /测试书目/);
            await page.locator('#nav-home').click();
            await page.waitForFunction(() => !Array.from(document.body.children).some(el => el.style.zIndex === '99999'));
          } else if (project === '超级玛丽') {
            await page.waitForFunction(() => window.__SPL?.G.state === 'title');
            if (mobile) {
              await page.locator('#cv').tap();
              await page.locator('#bA').tap();
            } else await page.keyboard.press('Enter');
            await page.waitForFunction(() => window.__SPL.G.state === 'play', undefined, { timeout: 10000 });
            await page.waitForFunction(() => window.__SPL.G.fadeA <= 0);
            if (!mobile) {
              const before = await page.evaluate(() => window.__SPL.G.player.x);
              await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300); await page.keyboard.up('ArrowRight');
              assert.ok(await page.evaluate(() => window.__SPL.G.player.x) > before, 'Mario keyboard moves player');
            }
          } else if (project === '坦克大战') {
            await page.waitForFunction(() => Game.state === 'title');
            if (!mobile) {
              await page.keyboard.press('Enter');
              await page.waitForFunction(() => Game.state === 'play' && Game.world.players[0].spawnT <= 0, undefined, { timeout: 10000 });
              const before = await page.evaluate(() => Game.world.players[0].y);
              await page.keyboard.down('w'); await page.waitForTimeout(200); await page.keyboard.up('w');
              assert.ok(await page.evaluate(() => Game.world.players[0].y) < before, 'Tank keyboard moves player after spawn');
            }
          } else if (project === '吞食天地三国') {
            await page.waitForFunction(() => window.T?.SceneManager?.current());
            assert.match(page.url(), /index\.html$/);
          }
          const screenshot = path.join(root, project, project === '超级玛丽' ? 'test' : '测试', '.artifacts', `browser-${row.viewport}.png`);
          fs.mkdirSync(path.dirname(screenshot), { recursive: true });
          await page.screenshot({ path: screenshot, fullPage: true });
          if (!['坦克大战', '吞食天地三国', '超级玛丽'].includes(project)) {
            const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
            assert.ok(dimensions.scroll <= dimensions.width + 1, `页面水平溢出：${JSON.stringify(dimensions)}`);
          }
          assert.deepEqual(errors, [], '页面脚本错误'); assert.deepEqual(badResponses, [], '站内资源失败');
          row.ok = true; row.screenshot = path.relative(root, screenshot);
        } catch (error) { row.error = error.message; row.errors = errors; row.badResponses = badResponses; }
        rows.push(row); console.log(`${row.ok ? 'PASS' : 'FAIL'} ${project} ${row.viewport}${row.error ? ': ' + row.error : ''}`);
        await page.close();
      }
      await context.close();
    }
  } finally { await browser.close(); }
  const output = path.join(root, '创意空间首页/测试/.artifacts/browser-smoke.json');
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(rows, null, 2) + '\n');
  console.log(`浏览器验收：${rows.filter(row => row.ok).length}/${rows.length} 通过`);
  process.exitCode = rows.every(row => row.ok) ? 0 : 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
