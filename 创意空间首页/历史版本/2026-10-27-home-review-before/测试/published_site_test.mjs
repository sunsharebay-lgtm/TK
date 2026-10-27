import assert from 'node:assert/strict';

const [, , rawBaseUrl, expectedCommit = '', expectedResourceId = '', expectedDetailPath = ''] = process.argv;
if (!rawBaseUrl) throw new Error('Usage: node published_site_test.mjs <page-url> [expected-commit] [expected-resource-id] [detail-path]');

const baseUrl = new URL(rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`);
const failures = [], pages = new Map(), assets = new Set();
const retryDelay = Number(process.env.PUBLISHED_SITE_RETRY_DELAY_MS || 5000);
const metadataRetries = Number(process.env.PUBLISHED_SITE_METADATA_RETRIES || 0);
const timeout = Number(process.env.PUBLISHED_SITE_TIMEOUT_MS || 15000);

function localUrl(relativePath, parent = baseUrl) {
  const url = new URL(relativePath, parent);
  assert.equal(url.origin, baseUrl.origin, `站内链接不得跳出站点：${url.href}`);
  assert.ok(url.pathname.startsWith(baseUrl.pathname), `站内链接不得跳出部署目录：${url.href}`);
  url.hash = '';
  return url;
}

async function fetchText(relativePath, { retries = 0, validate = () => {} } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = localUrl(relativePath);
      url.searchParams.set('verify', `${Date.now()}-${attempt}`);
      const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      validate(text);
      return text;
    } catch (error) { lastError = error; }
    if (attempt < retries) await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  failures.push(`${relativePath}: ${lastError.message}`);
  return null;
}

async function visitPage(relativePath, depth = 0, chain = []) {
  let url;
  try { url = localUrl(relativePath); } catch (error) { failures.push(error.message); return; }
  if (chain.includes(url.href)) { failures.push(`循环跳转：${url.href}`); return; }
  if (pages.has(url.href)) return pages.get(url.href);
  pages.set(url.href, null);
  if (depth > 5) { failures.push(`跳转过深：${url.href}`); return; }
  const html = await fetchText(url, { validate(text) { assert.match(text, /<!doctype html>/i, '入口必须返回 HTML 页面'); } });
  if (!html) return;
  pages.set(url.href, html);
  // Follow the same local redirects used by the root and 三国 landing pages.
  for (const match of html.matchAll(/<meta\b[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*?url=([^"']+)["'][^>]*>/gi)) {
    try { await visitPage(localUrl(match[1].trim(), url), depth + 1, [...chain, url.href]); }
    catch (error) { failures.push(error.message); }
  }
  // A shell returning 200 is not sufficient when its runtime scripts are missing.
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    let script;
    try { script = localUrl(match[1], url); } catch (error) { failures.push(error.message); continue; }
    if (assets.has(script.href)) continue;
    assets.add(script.href);
    await fetchText(script, { validate(text) {
      assert.ok(text.trim(), '脚本不得为空');
      assert.doesNotMatch(text, /^\s*<!doctype html>/i, '脚本路径返回了 HTML');
    } });
  }
  return html;
}

await fetchText('创意空间首页/deployment-meta.json', { retries: metadataRetries, validate(text) {
  const metadata = JSON.parse(text);
  assert.ok(metadata.commit, '部署标记缺少提交号');
  if (expectedCommit) assert.ok(String(metadata.commit).startsWith(expectedCommit), `deployment commit ${metadata.commit} != ${expectedCommit}`);
} });

await visitPage('./');
const homeText = await visitPage('创意空间首页/');
// It may already have been visited via the root redirect.
if (homeText && !homeText.includes('粉丝资源')) failures.push('首页必须包含粉丝资源板块');
for (const entryPath of [
  '创意空间首页/', '坦克大战/tank-battle.html', '吞食天地三国/',
  '超级玛丽/', '墨水屏小站/', 'Mac软件资源库/', '粉丝资源/',
]) await visitPage(entryPath);

const resourcesText = await fetchText('粉丝资源/resources.json', { validate(text) {
  const data = JSON.parse(text);
  assert.ok(Array.isArray(data.resources) && data.resources.length, '资源目录必须包含非空 resources 数组');
  if (expectedResourceId) assert.ok(data.resources.some(item => item.id === expectedResourceId), `resource ${expectedResourceId} is missing`);
  for (const item of data.resources) assert.ok(item && item.id && item.detailUrl, '资源缺少 id 或 detailUrl');
} });
if (resourcesText) {
  for (const item of JSON.parse(resourcesText).resources) {
    try { await visitPage(localUrl(item.detailUrl, localUrl('粉丝资源/'))); }
    catch (error) { failures.push(error.message); }
  }
}

const catalogText = await fetchText('创意空间首页/game-catalog.json', { validate(text) {
  const catalog = JSON.parse(text);
  assert.ok(Array.isArray(catalog.games) && catalog.games.length, '创意目录必须包含非空 games 数组');
  assert.equal(new Set(catalog.games.map(game => game.id)).size, catalog.games.length, '创意 id 不得重复');
  for (const game of catalog.games) assert.ok(game.id && game.url && game.version, '创意缺少 id、url 或 version');
} });
if (catalogText) {
  for (const game of JSON.parse(catalogText).games) {
    if (game.external) continue;
    try { await visitPage(localUrl(game.url, localUrl('创意空间首页/'))); }
    catch (error) { failures.push(error.message); }
  }
}

await fetchText('Mac软件资源库/software-resources.json', { validate(text) {
  const data = JSON.parse(text);
  assert.ok(Array.isArray(data.items) && data.items.length, 'Mac 软件目录必须包含非空 items 数组');
  assert.equal(data.summary?.total, data.items.length, 'Mac 软件总数与条目数不一致');
  for (const item of data.items) assert.ok(item.id && item.name && item.shareUrl, 'Mac 软件条目缺少 id、name 或 shareUrl');
} });
await fetchText('吞食天地三国/网页复刻/吞食天地Ⅱ同人复刻-网页版/assets/data/system.json', {
  validate(text) { assert.ok(JSON.parse(text).gameTitle, '三国核心数据缺少游戏标题'); },
});
if (expectedDetailPath) await visitPage(expectedDetailPath);

if (failures.length) throw new Error(`Published site verification failed:\n- ${failures.join('\n- ')}`);
console.log(`Published site verification passed: ${baseUrl.href} (${pages.size} pages, ${assets.size} scripts)`);
