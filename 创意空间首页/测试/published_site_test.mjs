import assert from 'node:assert/strict';

const [, , rawBaseUrl, expectedCommit = '', expectedResourceId = '', expectedDetailPath = ''] = process.argv;

if (!rawBaseUrl) {
  throw new Error('Usage: node published_site_test.mjs <page-url> [expected-commit] [expected-resource-id] [detail-path]');
}

const baseUrl = new URL(rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`);
const cacheBust = `verify=${Date.now()}`;
const failures = [];

function siteUrl(relativePath) {
  const url = new URL(relativePath, baseUrl);
  url.search = cacheBust;
  return url;
}

async function fetchText(relativePath, retries = 0) {
  let lastStatus = 'request failed';
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const url = siteUrl(relativePath);
    try {
      const response = await fetch(url);
      const text = await response.text();
      if (response.ok) return text;
      lastStatus = `${response.status} ${relativePath}`;
    } catch (error) {
      lastStatus = `${relativePath}: ${error.message}`;
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, Number(process.env.PUBLISHED_SITE_RETRY_DELAY_MS || 5000)));
    }
  }
  failures.push(lastStatus);
  return null;
}

async function fetchAbsolute(url, label) {
  const response = await fetch(url);
  await response.text();
  if (!response.ok) {
    failures.push(`${response.status} ${label}`);
  }
}

const metadataRetries = Number(process.env.PUBLISHED_SITE_METADATA_RETRIES || 0);
const metadataText = await fetchText('创意空间首页/deployment-meta.json', metadataRetries);
if (metadataText) {
  try {
    const metadata = JSON.parse(metadataText);
    if (expectedCommit && !String(metadata.commit || '').startsWith(expectedCommit)) {
      failures.push(`deployment commit ${metadata.commit || '(empty)'} != ${expectedCommit}`);
    }
  } catch (error) {
    failures.push(`invalid deployment metadata: ${error.message}`);
  }
}

const homeText = await fetchText('创意空间首页/');
if (homeText) {
  try {
    assert.match(homeText, /粉丝资源/, '首页必须包含粉丝资源板块');
  } catch (error) {
    failures.push(error.message);
  }
}

for (const entryPath of [
  '创意空间首页/',
  '坦克大战/tank-battle.html',
  '吞食天地三国/',
  '超级玛丽/',
  '墨水屏小站/',
  '粉丝资源/',
]) {
  await fetchText(entryPath);
}

const resourcesText = await fetchText('粉丝资源/resources.json');
if (resourcesText) {
  try {
    const data = JSON.parse(resourcesText);
    assert.ok(Array.isArray(data.resources), '线上 resources.json 必须包含 resources 数组');
    if (expectedResourceId && !data.resources.some((item) => item.id === expectedResourceId)) {
      failures.push(`resource ${expectedResourceId} is missing`);
    }
    for (const item of data.resources) {
      if (!item || !item.detailUrl) continue;
      await fetchText(`粉丝资源/${String(item.detailUrl).replace(/^\.\//, '')}`);
    }
  } catch (error) {
    failures.push(`invalid online resources.json: ${error.message}`);
  }
}

const catalogText = await fetchText('创意空间首页/game-catalog.json');
if (catalogText) {
  try {
    const catalog = JSON.parse(catalogText);
    for (const game of Array.isArray(catalog.games) ? catalog.games : []) {
      if (game.external || !game.url) continue;
      const url = new URL(game.url, siteUrl('创意空间首页/'));
      await fetchAbsolute(url, `catalog entry ${game.id || game.title || game.url}`);
    }
  } catch (error) {
    failures.push(`invalid online game-catalog.json: ${error.message}`);
  }
}

if (expectedDetailPath) {
  await fetchText(expectedDetailPath);
}

if (failures.length) {
  throw new Error(`Published site verification failed:\n- ${failures.join('\n- ')}`);
}

console.log(`Published site verification passed: ${baseUrl.href}`);
