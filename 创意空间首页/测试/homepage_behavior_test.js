const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'game-catalog.json')));
const resources = JSON.parse(fs.readFileSync(path.join(root, '../粉丝资源/resources.json')));
// Capture the real page's startup tasks so rejected render promises fail the tests.
const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n')
  .replace(/\(async function (syncGameCatalog|syncFanResources)\(\) \{/g, 'globalThis.$1Task = (async function $1() {');

class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {};
    this.className = ''; this.id = ''; this.hidden = false; this.disabled = false; this._text = '';
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  append(...nodes) { this.children.push(...nodes); }
  appendChild(node) { this.append(node); return node; }
  replaceChildren(...nodes) { this._text = ''; this.children = nodes; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  addEventListener(event, listener) { this['on' + event] = listener; }
  matches(selector) {
    if (selector.startsWith('.')) return this.className.split(/\s+/).includes(selector.slice(1));
    if (selector.startsWith('#')) return this.id === selector.slice(1);
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

async function mount({ games = catalog, fans = resources, fail, failGame, delay = false } = {}) {
  const body = new Element('body');
  const add = (tag, className, id = '') => {
    const el = new Element(tag); el.className = className; el.id = id; body.append(el); return el;
  };
  const grid = add('div', 'games');
  for (const match of html.matchAll(/<a class="game-card" href="([^"]+)"/g)) {
    const card = new Element('a'); card.className = 'game-card'; card.href = match[1];
    const live = new Element('span'); live.className = 'live'; card.append(live); grid.append(card);
  }
  add('strong', 'readout-number'); add('span', 'readout-note'); add('p', '', 'catalog-status');
  add('div', 'resources', 'resources-grid');
  const status = add('p', 'resource-empty', 'resources-status'); status.textContent = '资源整理中，敬请期待。';
  const retry = add('button', '', 'resources-retry'); retry.hidden = true;
  let calls = 0;
  const context = vm.createContext({
    URL, AbortController, console,
    setTimeout: (fn, ms) => setTimeout(fn, delay ? Math.min(ms, 5) : ms), clearTimeout,
    document: {
      baseURI: 'https://example.test/TK/创意空间首页/index.html', body,
      querySelector: selector => body.querySelector(selector),
      querySelectorAll: selector => body.querySelectorAll(selector),
      createElement: tag => new Element(tag),
      createTextNode: text => { const el = new Element('#text'); el.textContent = text; return el; },
    },
    fetch: async (url, options) => {
      const isFans = url.includes('resources.json');
      if (isFans) calls++;
      const failure = isFans ? (typeof fail === 'function' ? fail(calls) : fail) : failGame;
      if (failure === 'network') throw new Error('offline');
      if (failure === 'hang') return new Promise((resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
      return { ok: failure !== 'http', status: failure === 'http' ? 503 : 200, json: async () => {
        if (failure === 'json') throw new SyntaxError('bad JSON');
        if (failure === 'body-hang') return new Promise((resolve, reject) => {
          options.signal?.addEventListener('abort', () => reject(new Error('body aborted')), { once: true });
        });
        return isFans ? fans : games;
      } };
    },
  });
  vm.runInContext(source, context, { filename: 'index.html' });
  await Promise.all([context.syncGameCatalogTask, context.syncFanResourcesTask]);
  return { body, context, status, retry, calls: () => calls, rows: () => body.querySelectorAll('.resource-card') };
}

test('实际目录渲染数量正确，编号保持稳定，标题与详情链接指向同一资料', async () => {
  const page = await mount();
  assert.equal(page.body.querySelectorAll('.game-card').length, catalog.games.length);
  assert.equal(page.body.querySelector('.game-version').textContent, `${catalog.games[0].version} ${catalog.games[0].status}`);
  assert.equal(page.rows().length, resources.resources.length);
  assert.deepEqual(page.rows().map(row => row.querySelector('.resource-number').textContent), resources.resources.map(item => item.number));
  for (const row of page.rows()) {
    const titleLink = row.querySelector('.resource-title').querySelector('a');
    assert.ok(titleLink, '资源标题本身必须能点击');
    assert.equal(titleLink.href, row.querySelector('.resource-open').href);
  }
});

for (const fail of ['network', 'http', 'json']) {
  test(`资源 ${fail} 失败有真实错误提示，并可重试恢复`, async () => {
    const page = await mount({ fail: call => call === 1 ? fail : undefined });
    assert.match(page.status.textContent, /暂时无法加载/);
    assert.equal(page.retry.hidden, false);
    assert.equal(page.retry.disabled, false);
    await page.retry.onclick();
    assert.equal(page.rows().length, resources.resources.length);
    assert.equal(page.calls(), 2);
    assert.equal(page.retry.hidden, true);
  });
}

test('空资源目录与加载失败明确区分', async () => {
  const page = await mount({ fans: { resources: [] } });
  assert.equal(page.rows().length, 0);
  assert.match(page.status.textContent, /暂无已发布资料/);
  assert.equal(page.retry.hidden, true);
});

test('错误结构的目录不会误报没有资料', async () => {
  for (const fans of [null, {}, { resources: 'invalid' }]) {
    const page = await mount({ fans });
    assert.match(page.status.textContent, /暂时无法加载/);
  }
});

test('单条损坏资源、重复编号和越界链接不阻断其余资料', async () => {
  const valid = resources.resources[0];
  const page = await mount({ fans: { resources: [
    null, { ...valid, detailUrl: {} }, { ...valid, detailUrl: '../escape/' },
    { ...valid, detailUrl: 'https://elsewhere.test/' }, valid, { ...valid, id: 'duplicate' },
  ] } });
  assert.equal(page.rows().length, 1);
  assert.equal(page.rows()[0].querySelector('.resource-title').textContent, valid.title);
});

test('创意坏条目不生成危险链接，统计与实际有效卡片一致', async () => {
  const valid = catalog.games[0];
  const page = await mount({ games: { games: [
    null, { ...valid, url: 'javascript:alert(1)' }, { ...valid, url: undefined }, valid,
  ] } });
  assert.equal(page.body.querySelectorAll('.game-card').length, 1);
  assert.equal(page.body.querySelector('.readout-number').textContent, '01');
});

test('全坏创意目录保留静态兜底入口和正确数量', async () => {
  const page = await mount({ games: { games: [null] } });
  assert.equal(page.body.querySelectorAll('.game-card').length, catalog.games.length);
  assert.equal(page.body.querySelector('.readout-number').textContent, String(catalog.games.length).padStart(2, '0'));
});

test('创意网络失败、HTTP错误和无效JSON均保留入口并提示版本降级', async () => {
  for (const failGame of ['network', 'http', 'json']) {
    const page = await mount({ failGame });
    assert.equal(page.body.querySelectorAll('.game-card').length, catalog.games.length);
    assert.match(page.body.querySelector('#catalog-status').textContent, /备用入口/);
    assert.equal(page.body.querySelector('#catalog-status').hidden, false);
  }
});

for (const fail of ['hang', 'body-hang']) {
  test(`资源 ${fail} 有超时，结束加载并恢复重试`, { timeout: 1000 }, async () => {
    const page = await mount({ fail, delay: true });
    assert.match(page.status.textContent, /暂时无法加载/);
    assert.equal(page.body.querySelector('#resources-grid').getAttribute('aria-busy'), 'false');
    assert.equal(page.retry.disabled, false);
  });
}

test('允许声明的HTTP外链并保留新窗口隔离，拒绝脚本链接与站点外路径', async () => {
  const valid = catalog.games[0];
  const page = await mount({ games: { games: [
    { ...valid, id: 'external', external: true, url: 'https://example.org/tool/' },
    { ...valid, id: 'bad-external', external: true, url: 'javascript:alert(1)' },
    { ...valid, id: 'escape', url: '../../outside/' },
  ] } });
  const [card] = page.body.querySelectorAll('.game-card');
  assert.equal(page.body.querySelectorAll('.game-card').length, 1);
  assert.equal(card.href, 'https://example.org/tool/');
  assert.equal(card.target, '_blank');
  assert.equal(card.rel, 'noopener noreferrer');
});

test('历史静态外部条目省略external时仍可用，并保持当前窗口打开', async () => {
  const page = await mount({ games: { games: [
    { id: 'legacy', title: '历史外部项目', version: 'v0.4', status: '开发版', url: 'https://example.org/legacy/' },
  ] } });
  const [card] = page.body.querySelectorAll('.game-card');
  assert.equal(page.body.querySelectorAll('.game-card').length, 1);
  assert.equal(card.href, 'https://example.org/legacy/');
  assert.equal(card.target, undefined);
});
