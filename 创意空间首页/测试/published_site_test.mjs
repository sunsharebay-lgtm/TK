import assert from 'node:assert/strict';
import validation from './site-validation.cjs';

const { requiredPages, requiredScripts, dataPaths, extractHtml, localUrl: resolveLocal, validateScript, validateData } = validation;
const [, , rawBaseUrl, expectedCommit = '', expectedResourceId = '', expectedDetailPath = ''] = process.argv;
if (!rawBaseUrl) throw new Error('Usage: node published_site_test.mjs <page-url> [expected-commit] [expected-resource-id] [detail-path]');

const baseUrl = new URL(rawBaseUrl);
if (!baseUrl.pathname.endsWith('/')) baseUrl.pathname += '/';
baseUrl.search = ''; baseUrl.hash = '';
const failures = [], pages = new Set(), assets = new Set(), pageAliases = new Map(), scriptRequests = new Map();
function setting(name, fallback, minimum = 0) {
  const value = Number(process.env[name] ?? fallback);
  assert.ok(Number.isSafeInteger(value) && value >= minimum, '[CONFIG] Invalid ' + name);
  return value;
}
const retryDelay = setting('PUBLISHED_SITE_RETRY_DELAY_MS', 5000);
const metadataRetries = setting('PUBLISHED_SITE_METADATA_RETRIES', 0);
const timeout = setting('PUBLISHED_SITE_TIMEOUT_MS', 15000, 1);
const localUrl = (reference, parent = baseUrl) => resolveLocal(reference, parent, baseUrl);
const maxRedirects = 10;
const requiredScriptUrls = new Set(requiredScripts.map(name => localUrl(name).href));

async function fetchText(relativePath, { retries = 0, validate = () => null, required = false } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    // One deadline covers every HTTP hop AND consumption of the final body.
    const signal = AbortSignal.timeout(timeout);
    try {
      let url = localUrl(relativePath);
      const seen = new Set();
      for (let hop = 0; ; hop++) {
        assert.ok(hop <= maxRedirects, '[REDIRECT_DEPTH] HTTP 跳转过深');
        assert.ok(!seen.has(url.href), '[REDIRECT_LOOP] HTTP 循环跳转：' + url.href);
        seen.add(url.href);
        const requestUrl = new URL(url);
        requestUrl.searchParams.set('verify', Date.now() + '-' + attempt);
        const response = await fetch(requestUrl, { signal, redirect: 'manual' });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location');
          await response.body?.cancel();
          assert.ok(location, '[REDIRECT_LOCATION] HTTP 跳转缺少 Location：' + url.href);
          url = localUrl(location, url); // Validate before issuing the next request.
          continue;
        }
        if (!response.ok) { await response.body?.cancel(); throw new Error('HTTP ' + response.status + ' ' + url.href); }
        const text = await response.text();
        const finalUrl = new URL(response.url);
        finalUrl.searchParams.delete('verify');
        // Keep the caller's own verify query, if any, out of our cache-buster.
        if (url.searchParams.has('verify')) finalUrl.searchParams.set('verify', url.searchParams.get('verify'));
        const result = { text, url: localUrl(finalUrl), contentType: response.headers.get('content-type') || '', nosniff: response.headers.get('x-content-type-options')?.toLowerCase() === 'nosniff' };
        result.value = validate(text, result);
        return result;
      }
    } catch (error) {
      lastError = signal.aborted ? new Error('[FETCH_TIMEOUT] 请求或响应体超时 (' + timeout + 'ms)') : error;
    }
    if (attempt < retries) await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  failures.push((required ? '[REQUIRED_FILE] ' : '') + relativePath + ': ' + lastError.message);
  return null;
}

async function visitScript(reference, kind = 'classic', parent = baseUrl) {
  const url = localUrl(reference, parent);
  const kinds = scriptRequests.get(url.href) || new Set();
  if (kinds.has(kind)) return;
  kinds.add(kind); scriptRequests.set(url.href, kinds);
  const response = await fetchText(url, {
    required: requiredScriptUrls.has(url.href),
    validate(text, response) { validateScript(text, { ...response, kind, filename: response.url.href }); },
  });
  if (response) assets.add(response.url.href);
}

async function visitPage(reference, depth = 0, chain = []) {
  let url;
  try {
    url = localUrl(reference);
    assert.ok(depth <= maxRedirects, '[REDIRECT_DEPTH] 页面跳转过深');
    assert.ok(!chain.includes(url.href), '[REDIRECT_LOOP] 页面循环跳转：' + url.href);
    if (pageAliases.has(url.href)) return pageAliases.get(url.href);
    const response = await fetchText(url, {
      validate(text) {
        const parsed = extractHtml(text);
        assert.ok(parsed.isHtml, '[HTML_PAGE] 入口必须返回 HTML 页面');
        return parsed;
      },
    });
    if (!response) return;
    assert.ok(!chain.includes(response.url.href), '[REDIRECT_LOOP] 页面循环跳转：' + response.url.href);
    if (pageAliases.has(response.url.href)) {
      const existing = pageAliases.get(response.url.href);
      pageAliases.set(url.href, existing); return existing;
    }
    pageAliases.set(url.href, response); pageAliases.set(response.url.href, response);
    pages.add(response.url.href);
    const parsed = response.value;
    const documentBase = parsed.baseHref === null ? response.url : localUrl(parsed.baseHref, response.url);
    for (const target of parsed.redirects) await visitPage(localUrl(target, documentBase), depth + 1, [...chain, url.href, response.url.href]);
    for (const script of parsed.scripts) {
      try {
        if (script.src !== null) await visitScript(script.src, script.kind, documentBase);
        else validateScript(script.code, { kind: script.kind, filename: response.url.href + '#inline', inline: true });
      } catch (error) { failures.push(response.url.href + ': ' + error.message); }
    }
    return response;
  } catch (error) { failures.push((url?.href || reference) + ': ' + error.message); }
}

const readData = (name, retries = 0) => fetchText(name, {
  retries, required: true,
  validate: text => validateData(name, text, { expectedCommit, expectedResourceId }),
});
await readData(dataPaths.metadata, metadataRetries);
for (const name of requiredPages) await visitPage(name);
const home = pageAliases.get(localUrl('创意空间首页/').href);
if (home && !home.text.includes('粉丝资源')) failures.push('首页必须包含粉丝资源板块');

const resources = await readData(dataPaths.resources);
if (resources) for (const item of resources.value.resources) {
  try { await visitPage(localUrl(item.detailUrl, localUrl('粉丝资源/'))); }
  catch (error) { failures.push(error.message); }
}
const catalog = await readData(dataPaths.catalog);
if (catalog) for (const game of catalog.value.games) {
  if (game.external) continue;
  try { await visitPage(localUrl(game.url, localUrl('创意空间首页/'))); }
  catch (error) { failures.push(error.message); }
}
await readData(dataPaths.software);
await readData(dataPaths.system);
if (expectedDetailPath) await visitPage(expectedDetailPath);
// Check known runtime files even if a broken build removed their script tags.
// If HTML declares a module, retain that grammar instead of rechecking as classic.
for (const name of requiredScripts) if (!scriptRequests.has(localUrl(name).href)) await visitScript(name);

if (failures.length) throw new Error('Published site verification failed:\n- ' + failures.join('\n- '));
console.log('Published site verification passed: ' + baseUrl.href + ' (' + pages.size + ' pages, ' + assets.size + ' scripts)');
