const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const url = process.argv[2] || 'http://127.0.0.1:8123/墨水屏小站/';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined) });
  try {
    for (const [width, height] of [[390,844],[375,667],[758,1024],[1072,1448]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.route('https://wttr.in/**', route => route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ current_condition: [{ temp_C: '20', humidity: '50', weatherDesc: [{ value: 'Sunny' }], windspeedKmph: '1' }] }) }));
      await page.goto(url);
      await page.waitForFunction(() => !document.getElementById('weather-main').className.includes('loading'));
      for (const simple of [false, true]) {
        if (simple) await page.evaluate(() => toggleClockStyle());
        await page.waitForFunction(() => !Array.from(document.body.children).some(el => el.style.zIndex === '99999'));
        const problems = await page.evaluate(() => {
          const errors = [];
          for (const digit of document.querySelectorAll('.digit-number')) {
            const a = digit.getBoundingClientRect(), b = digit.parentElement.getBoundingClientRect();
            if (a.left < b.left || a.right > b.right || a.top < b.top || a.bottom > b.bottom) errors.push('时钟数字被裁切');
          }
          const lunar = document.getElementById('lunar-date').getBoundingClientRect();
          const date = document.querySelector('.date-card').getBoundingClientRect();
          if (lunar.bottom > date.bottom || lunar.bottom > document.getElementById('bottom-nav').getBoundingClientRect().top) errors.push('日期卡内容溢出');
          const text = document.getElementById('weather-sub');
          const range = document.createRange(); range.selectNodeContents(text);
          const a = range.getBoundingClientRect(), b = document.querySelector('.weather-btns').getBoundingClientRect();
          if (a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom) errors.push('天气文字覆盖按钮');
          return errors;
        });
        assert.deepEqual(problems, [], `${width}×${height} simple=${simple}`);
        if (width === 390 && !simple) {
          fs.mkdirSync(path.join(__dirname, '.artifacts'), { recursive: true });
          await page.screenshot({ path: path.join(__dirname, '.artifacts/browser-mobile.png') });
        }
      }
      console.log(`PASS ${width}×${height} 两种时钟样式`); await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
