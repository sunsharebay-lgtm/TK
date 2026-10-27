// Optional browser dependency: npm install --prefix 测试/.artifacts/browser playwright
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { test, before, after } = require('node:test');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || './.artifacts/browser/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const items = JSON.parse(fs.readFileSync(path.join(root, 'resources.json'), 'utf8')).resources;
const prefix = '/TK/粉丝资源/';
let browser, server, base;

before(async () => {
  server = http.createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch (_) { response.writeHead(400).end(); return; }
    if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
    let relative = pathname.slice(prefix.length);
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end(); return;
    }
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(file)];
    response.setHeader('Content-Type', `${type || 'text/plain'}; charset=utf-8`);
    response.end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}${prefix}`;
  browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
});
after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function withPage(run, options = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.setDefaultTimeout(4000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try { await run(page); assert.deepEqual(errors, [], 'no uncaught page errors'); }
  finally { await context.close(); }
}

for (const failure of ['http', 'json', 'schema', 'network', 'timeout']) {
  test(`catalog: ${failure} failure is explained and can be retried`, () => withPage(async (page) => {
    // Exercise the production timeout without waiting ten seconds in every run.
    if (failure === 'timeout') await page.addInitScript(() => {
      const original = window.setTimeout;
      let shortened = false;
      window.setTimeout = (callback, delay, ...args) => {
        if (delay === 10000 && !shortened) { shortened = true; return original(callback, 20, ...args); }
        return original(callback, delay, ...args);
      };
    });
    let fail = true;
    await page.route('**/resources.json', async (route) => {
      if (!fail) return route.continue();
      if (failure === 'network') return route.abort();
      if (failure === 'timeout') return;
      return route.fulfill({ status: failure === 'http' ? 503 : 200, contentType: 'application/json', body: failure === 'json' ? '{' : JSON.stringify({ wrong: [] }) });
    });
    await page.goto(base);
    await page.getByRole('button', { name: '重新加载' }).waitFor();
    assert.match(await page.locator('#resources-status').innerText(), /加载失败/);
    assert.equal(await page.locator('#resource-count').innerText(), '—');
    fail = false;
    await page.getByRole('button', { name: '重新加载' }).click();
    await page.locator('.resource-card').last().waitFor();
    assert.equal(await page.locator('.resource-card').count(), items.length);
    assert.equal(await page.locator('#resource-count').innerText(), String(items.length).padStart(2, '0'));
  }));
}

test('catalog: empty collection is distinct from an error', () => withPage(async (page) => {
  await page.route('**/resources.json', route => route.fulfill({ json: { resources: [] } }));
  await page.goto(base);
  await page.getByText('暂无资源，敬请期待。', { exact: true }).waitFor();
  assert.equal(await page.locator('#resource-count').innerText(), '00');
  assert.equal(await page.getByRole('button', { name: '重新加载' }).count(), 0);
}));

test('catalog: number, keyword, case, whitespace, no results and clearing search', () => withPage(async (page) => {
  await page.goto(base);
  await page.locator('.resource-card').last().waitFor();
  const search = page.getByRole('searchbox', { name: '查找资源' });
  for (const [query, expected] of [['06', ['06']], ['6', ['06']], [' HERMES ', ['05']], ['codex 生图', ['06']], ['退款', ['01']], ['07', ['07']], ['DSH', ['07']], ['AGENT.md', ['07']], ['不存在的资源', []]]) {
    await search.fill(query);
    assert.deepEqual(await page.locator('.resource-number').allTextContents(), expected);
    assert.equal(await page.locator('#resource-count').innerText(), String(items.length).padStart(2, '0'), 'filter must not change collection total');
  }
  assert.match(await page.locator('#resources-status').innerText(), /没有找到/);
  await page.getByRole('button', { name: '清空搜索' }).click();
  assert.equal(await page.locator('.resource-card').count(), items.length);
  assert.equal(await search.inputValue(), '');
  assert.ok(await search.evaluate(el => document.activeElement === el));
  const links = await page.locator('.resource-open').evaluateAll(nodes => nodes.map(el => ({ name: el.getAttribute('aria-label'), url: el.getAttribute('href') })));
  assert.ok(links.every((link, i) => link.name.includes(items[i].title) && link.url === items[i].detailUrl));
}));

test('catalog: disabled JavaScript has a useful explanation', () => withPage(async (page) => {
  await page.goto(base);
  assert.match(await page.locator('noscript').innerText(), /JavaScript/);
  assert.equal(await page.getByRole('searchbox').isVisible(), false);
}, { javaScriptEnabled: false }));

test('catalog: direct file opening explains how to load the list', () => withPage(async (page) => {
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
  await page.getByRole('button', { name: '重新加载' }).waitFor();
  assert.match(await page.locator('#resources-status').innerText(), /网站地址|预览服务/);
}));

test('catalog: a timed-out response cannot overwrite a successful retry', () => withPage(async (page) => {
  await page.addInitScript(() => {
    const nativeFetch = window.fetch;
    let firstRequest = true;
    window.fetch = (...args) => {
      if (!firstRequest) return nativeFetch(...args);
      firstRequest = false;
      return new Promise(resolve => { window.completeOldRequest = () => resolve({ ok: true, json: async () => ({ resources: [] }) }); });
    };
    const nativeTimeout = window.setTimeout;
    let shortened = false;
    window.setTimeout = (callback, delay, ...args) => {
      if (delay === 10000 && !shortened) { shortened = true; return nativeTimeout(callback, 20, ...args); }
      return nativeTimeout(callback, delay, ...args);
    };
  });
  await page.goto(base);
  await page.getByRole('button', { name: '重新加载' }).click();
  await page.locator('.resource-card').last().waitFor();
  await page.evaluate(async () => { window.completeOldRequest(); await new Promise(resolve => setTimeout(resolve, 0)); });
  assert.equal(await page.locator('.resource-card').count(), items.length);
  assert.equal(await page.locator('#resource-count').innerText(), String(items.length).padStart(2, '0'));
}));

test('catalog: text from data is displayed without interpreting markup', () => withPage(async (page) => {
  const maliciousTitle = '<img src=x onerror="window.injected=true">';
  await page.route('**/resources.json', route => route.fulfill({ json: { resources: [{ ...items[0], title: maliciousTitle }] } }));
  await page.goto(base);
  await page.locator('.resource-card').waitFor();
  assert.equal(await page.locator('.resource-title').innerText(), maliciousTitle);
  assert.equal(await page.locator('.resource-card img').count(), 0);
  assert.equal(await page.evaluate(() => window.injected), undefined);
}));

for (const mode of ['modern', 'rejected', 'legacy', 'false', 'throw']) {
  test(`details: all copy buttons use their actual DOM source (${mode})`, () => withPage(async (page) => {
    await page.addInitScript(mode => {
      window.copied = [];
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value:
        mode === 'modern' ? { writeText: async value => window.copied.push(value) } :
        mode === 'rejected' ? { writeText: async () => { throw new Error('denied'); } } : undefined });
      document.execCommand = () => {
        if (mode === 'false') return false;
        if (mode === 'throw') throw new Error('unavailable');
        const area = document.querySelector('textarea');
        window.copied.push(area.value.slice(area.selectionStart, area.selectionEnd));
        return true;
      };
    }, mode);
    for (const item of items) {
      await page.goto(base + item.detailUrl.slice(2));
      const buttons = page.locator('.copy-btn');
      for (let i = 0; i < await buttons.count(); i++) {
        const button = buttons.nth(i);
        const expected = await button.evaluate(el => (el.dataset.copyTarget ? document.getElementById(el.dataset.copyTarget) : el.closest('.template-block').querySelector('.template-text')).textContent.trim());
        await button.focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(el => /已复制|复制失败/.test(el.textContent), await button.elementHandle());
        if (mode === 'false' || mode === 'throw') {
          const statusId = await button.getAttribute('aria-describedby');
          assert.match(await page.locator(`#${statusId}`).innerText(), /手动复制/);
          assert.deepEqual(await page.evaluate(() => window.copied), []);
        } else {
          assert.equal(await page.evaluate(() => window.copied.at(-1)), expected, item.id);
        }
        assert.ok(await button.evaluate(el => document.activeElement === el), 'keyboard focus must remain on the copy button');
        assert.equal(await page.locator('textarea').count(), 0);
      }
    }
  }));
}

test('details: Hermes share is a directly usable link', () => withPage(async (page) => {
  await page.goto(base + items[4].detailUrl.slice(2));
  const share = page.locator('a#share-link');
  assert.equal(await share.getAttribute('href'), 'https://pan.quark.cn/s/cf4849928581');
}));

test('resource 07: DSH download and the exact user-provided Agent instruction', () => withPage(async (page) => {
  const item = items.find(resource => resource.id === 'dsh-plugin-migration-kit');
  assert.ok(item, 'DSH resource must be present in the catalog');
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async value => { window.lastCopied = value; } } });
  });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto(base + item.detailUrl.slice(2));
  await page.getByRole('heading', { name: 'DSH 插件迁移包', exact: true }).waitFor();
  assert.equal(await page.locator('a[href="https://pan.quark.cn/s/e090368a3ba3"]').count(), 1);
  assert.equal(await page.locator('ol li').count(), 6);
  await page.getByRole('button', { name: '复制 Agent 使用指令' }).click();
  assert.equal(await page.evaluate(() => window.lastCopied), '读一下 AGENT.md，按里面的要求做。');
  await page.getByRole('button', { name: '复制夸克分享链接' }).click();
  assert.equal(await page.evaluate(() => window.lastCopied), 'https://pan.quark.cn/s/e090368a3ba3');
  fs.mkdirSync(path.join(__dirname, '.artifacts'), { recursive: true });
  await page.screenshot({ path: path.join(__dirname, '.artifacts', 'dsh-resource-375.png'), fullPage: true });
}));

test('copy: pending writes ignore repeated activation and retain focus', () => withPage(async (page) => {
  await page.addInitScript(() => {
    window.copyCalls = 0;
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => {
      window.copyCalls++;
      return new Promise(resolve => { window.finishCopy = resolve; });
    } } });
  });
  await page.goto(base + items[1].detailUrl.slice(2));
  const button = page.locator('.copy-btn');
  await button.focus();
  await page.keyboard.press('Enter');
  assert.equal(await button.getAttribute('aria-disabled'), 'true');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.copyCalls), 1);
  await page.evaluate(() => window.finishCopy());
  await page.waitForFunction(() => document.querySelector('.copy-btn').textContent === '已复制');
  assert.equal(await button.getAttribute('aria-disabled'), 'false');
  assert.ok(await button.evaluate(el => document.activeElement === el));
}));

test('copy: failure instructions survive label reset and a retry can succeed', () => withPage(async (page) => {
  await page.clock.install();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    document.execCommand = () => false;
  });
  await page.goto(base + items[1].detailUrl.slice(2));
  const button = page.locator('.copy-btn');
  await button.click();
  assert.equal(await button.innerText(), '复制失败');
  await page.clock.fastForward(2000);
  assert.equal(await button.innerText(), '复制');
  assert.match(await page.getByRole('status').innerText(), /手动复制/);
  await page.evaluate(() => { document.execCommand = () => true; });
  await button.click();
  assert.equal(await button.innerText(), '已复制');
  assert.match(await page.getByRole('status').innerText(), /已复制/);
}));

test('copy: missing or empty template gives feedback without writing', () => withPage(async (page) => {
  await page.addInitScript(() => {
    window.copyCalls = 0;
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { window.copyCalls++; } } });
  });
  await page.goto(base + items[1].detailUrl.slice(2));
  const button = page.locator('.copy-btn');
  await page.locator('.template-block .template-text').evaluate(el => { el.textContent = '  '; });
  await button.click();
  assert.match(await page.getByRole('status').innerText(), /没有可复制/);
  await page.locator('.template-block .template-text').evaluate(el => el.remove());
  await button.click();
  assert.match(await page.getByRole('status').innerText(), /没有可复制/);
  assert.equal(await page.evaluate(() => window.copyCalls), 0);
}));

test('layout: desktop/mobile pages keep content and controls within the viewport', () => withPage(async (page) => {
  for (const width of [320, 375, 768, 820, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const item of [{ id: 'catalog', detailUrl: './' }, ...items]) {
      await page.goto(base + item.detailUrl.slice(2));
      if (item.id === 'catalog') await page.locator('.resource-card').last().waitFor();
      const overflow = await page.evaluate(() => [...document.querySelectorAll('h1, .resource-open, .copy-btn, .brand, .copy-value, .template-text')].filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.right > innerWidth + 1 || rect.left < -1 || el.scrollWidth > el.clientWidth + 1;
      }).map(el => el.className || el.tagName));
      assert.deepEqual(overflow, [], `${item.id} at ${width}px`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${item.id}: document overflows`);
      if ([375, 1280].includes(width) && ['catalog', 'hermes-celebrity-council-pack'].includes(item.id)) {
        fs.mkdirSync(path.join(__dirname, '.artifacts'), { recursive: true });
        await page.screenshot({ path: path.join(__dirname, '.artifacts', `${item.id}-${width}.png`), fullPage: true });
      }
    }
  }
}));
