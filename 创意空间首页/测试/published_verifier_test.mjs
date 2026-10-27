import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import fixture from './fixtures/published-site.cjs';
import validation from './site-validation.cjs';

const { createSite, html, three, memoryFs } = fixture;
const exec = promisify(execFile);
const verifier = fileURLToPath(new URL('./published_site_test.mjs', import.meta.url));
const packageFile = fileURLToPath(new URL('./site_package_test.cjs', import.meta.url));
const packageSource = await readFile(packageFile, 'utf8');
const metaPath = '/TK/创意空间首页/deployment-meta.json';
const { extractHtml, validateScript } = validation;

function failureResult(error) {
  assert.ok(!error.killed && !error.signal && Number.isInteger(error.code), '[HARNESS_PROCESS] 验收进程被杀、崩溃或无法启动：' + (error.signal || error.code));
  return { code: error.code, output: error.stderr };
}

async function verify({ mutate = () => {}, handlers = {}, stale = false, timeout = 1000 } = {}) {
  const files = createSite();
  mutate(files);
  let metadataRequests = 0;
  const requests = [];
  const server = createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    requests.push(url);
    if (handlers[url]) { handlers[url](req, res); return; }
    if (url === metaPath) {
      metadataRequests++;
      if (stale && metadataRequests === 1) { res.end('{"commit":"old"}'); return; }
    }
    const name = url.slice('/TK/'.length) + (url.endsWith('/') ? 'index.html' : '');
    if (!url.startsWith('/TK/') || !files.has(name)) { res.writeHead(404).end('missing'); return; }
    res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : name.endsWith('.json') ? 'application/json' : 'text/html');
    res.end(files.get(name));
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    const baseUrl = 'http://127.0.0.1:' + server.address().port + '/TK/';
    let result;
    try {
      const r = await exec(process.execPath, [verifier, baseUrl, 'expected'], {
        env: { ...process.env, PUBLISHED_SITE_METADATA_RETRIES: '2', PUBLISHED_SITE_RETRY_DELAY_MS: '1', PUBLISHED_SITE_TIMEOUT_MS: String(timeout) },
        timeout: 15000,
      });
      result = { code: 0, output: r.stdout };
    } catch (error) { result = failureResult(error); }
    return { ...result, baseUrl, metadataRequests, requests };
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

function mustFail(result, ...messages) {
  assert.equal(result.code, 1, result.output);
  for (const message of messages) assert.ok(result.output.includes(message), 'Missing ' + message + ': ' + result.output);
}

function checkPackage(files, directory) {
  const module = { exports: {} }, output = [];
  const actualRequire = createRequire(packageFile);
  const require = name => name === 'node:fs' ? memoryFs(files, directory ?? '/fixture/.site') : actualRequire(name);
  require.main = module;
  vm.runInNewContext(packageSource, {
    require, module, __dirname: '/fixture/创意空间首页/测试', URL, process: { argv: ['node', packageFile, ...(directory === undefined ? [] : [directory])] },
    console: { log: line => output.push(line) },
  }, { filename: packageFile });
  return output.join('\n');
}

test('完整合成站点的入口、脚本和数据通过 HTTP 及发布包验收', async () => {
  const r = await verify(); assert.equal(r.code, 0, r.output);
  assert.match(checkPackage(createSite()), /发布包检查通过/);
});

for (const name of ['index.html', 'Mac软件资源库/software-resources.json', three + 'index.html', three + 'js/core.js', '粉丝资源/scripts/copy.js', three + 'assets/data/system.json']) {
  test('交付文件缺失必须明确报 404：' + name, async () => {
    const r = await verify({ mutate: files => files.delete(name) });
    mustFail(r, 'HTTP 404 ' + encodeURI(r.baseUrl + (name === 'index.html' ? '' : name)));
  });
}

test('HTTP 200 旧部署标记会重试', async () => {
  const r = await verify({ stale: true }); assert.equal(r.code, 0, r.output); assert.equal(r.metadataRequests, 2);
});

for (const [name, value, message] of [
  ['创意空间首页/game-catalog.json', '{"games":[]}', '创意目录必须包含非空 games 数组'],
  ['粉丝资源/resources.json', '{"resources":[]}', '资源目录必须包含非空 resources 数组'],
  ['Mac软件资源库/software-resources.json', '{"items":[]}', 'Mac 软件目录必须包含非空 items 数组'],
  ['Mac软件资源库/software-resources.json', '{"items":[{"id":"a","name":"A","shareUrl":"https://example.test"}],"summary":{"total":2}}', 'Mac 软件总数与条目数不一致'],
]) {
  test('拒绝空数据或计数不一致：' + message, async () => mustFail(await verify({ mutate: files => files.set(name, value) }), message));
}

for (const text of ['const broken = ;', '<html><body>Not Found</body></html>']) {
  test('HTTP 200 损坏脚本必须失败：' + text, async () => {
    mustFail(await verify({ mutate: files => files.set('创意空间首页/app.js', text) }), '[SCRIPT_SYNTAX]', 'app.js');
  });
}

test('属性倒序的 meta 仍必须检查跳转目标', async () => {
  mustFail(await verify({ mutate: files => files.set('index.html', html('', '<META content="0; URL=missing.html" HTTP-EQUIV = refresh>')) }), 'missing.html', 'HTTP 404');
});

test('src 的大小写、空白和无引号写法仍必须检查脚本', async () => {
  mustFail(await verify({ mutate: files => files.set('超级玛丽/index.html', html('<SCRIPT SRC = missing.js></SCRIPT>')) }), 'missing.js', 'HTTP 404');
});

test('忽略注释、data-src 及脚本字符串中的伪标签', async () => {
  const r = await verify({ mutate: files => files.set('超级玛丽/index.html', html('<!-- <script src="missing.js"></script> --><script data-src="missing.js">const s = \'<img src="missing.png">\';</script>')) });
  assert.equal(r.code, 0, r.output);
});

test('HTTP 跳转不得逃出部署目录', async () => {
  const r = await verify({ handlers: {
    '/TK/': (_req, res) => res.writeHead(302, { Location: '/outside/' }).end(),
    '/outside/': (_req, res) => res.end(html('outside')),
  } });
  mustFail(r, '[URL_SCOPE]'); assert.ok(!r.requests.includes('/outside/'));
});

test('合法 HTTP 跳转按最终 URL 定位相对脚本', async () => {
  const r = await verify({
    mutate: files => { files.set('current/index.html', html('<script src="runtime.js"></script>')); files.set('current/runtime.js', 'const moved = true;'); },
    handlers: { '/TK/超级玛丽/': (_req, res) => res.writeHead(302, { Location: '/TK/current/' }).end() },
  });
  assert.equal(r.code, 0, r.output); assert.ok(r.requests.includes('/TK/current/runtime.js'));
});

test('核心脚本连同引用一起丢失也不能通过', async () => {
  mustFail(await verify({ mutate: files => {
    for (const [name, text] of files) {
      if (name.endsWith('.js')) files.delete(name);
      else if (name.endsWith('.html')) files.set(name, text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''));
    }
  } }), '[REQUIRED_FILE]', 'core.js');
});

test('只有两个空 JSON 的发布包必须失败', () => {
  assert.throws(() => checkPackage(new Map([['创意空间首页/game-catalog.json', '{"games":[]}'], ['粉丝资源/resources.json', '{"resources":[]}']])), /\[REQUIRED_FILE\]/);
});

test('发布包忽略注释并提取无引号引用', () => {
  const files = createSite();
  files.set('超级玛丽/index.html', html('<!-- <img src="absent.png"> --><a HREF = missing.html>test</a>'));
  assert.throws(() => checkPackage(files), /missing.html/);
});

test('被杀、信号退出及启动失败不能当成验收负例成功', () => {
  for (const error of [
    { code: null, killed: true, signal: 'SIGTERM', stderr: '' },
    { code: null, signal: 'SIGSEGV', stderr: '' },
    { code: 'ENOENT', stderr: '' },
  ]) assert.throws(() => failureResult(error), /\[HARNESS_PROCESS\]/);
});

for (const bodyStarted of [false, true]) {
  test('fetch 超时必须自行退出：' + (bodyStarted ? '响应体' : '响应头'), async () => {
    const r = await verify({ timeout: 150, handlers: { '/TK/创意空间首页/app.js': (_req, res) => {
      if (bodyStarted) { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.flushHeaders(); res.write('/*'); }
    } } });
    mustFail(r, '[FETCH_TIMEOUT]', 'app.js');
  });
}

test('提取器处理属性引号、实体、重复属性、大小写及换行', () => {
  const parsed = extractHtml(`<!DoCtYpE HTML><HTML><BASE HREF = '../assets/'>
    <META CONTENT="0; URL='next&#46;html?x=1&amp;y=2'" HTTP-EQUIV=ReFrEsH>
    <SCRIPT TYPE=module SRC = "first.js?x=&quot;&amp;y=2" src=ignored.js></SCRIPT>
    <a\nHREF=one.html>one</a><img src='two.png' data-src=ignored.png>
    <div src=ignored.png></div></HTML>`);
  assert.equal(parsed.isHtml, true);
  assert.equal(parsed.baseHref, '../assets/');
  assert.deepEqual(parsed.redirects, ['next.html?x=1&y=2']);
  assert.deepEqual(parsed.scripts.map(({ src, kind }) => ({ src, kind })), [{ src: 'first.js?x="&y=2', kind: 'module' }]);
  assert.deepEqual(parsed.references, ['one.html', 'two.png']);
});

test('提取器忽略注释、原始文本、数据脚本及惰性模板中的标签', () => {
  const parsed = extractHtml(html(`<!-- <script src=comment.js></script> -->
    <style>a { content: '<img src=css.png>'; }</style>
    <textarea><script src=textarea.js></script></textarea>
    <template><template><script src=template.js></script></template></template>
    <script type=application/ld+json>{"value":"<img src=json.png>"}</script>
    <script>const value = '<meta http-equiv=refresh content="0;url=bogus.html">';</script>`));
  assert.equal(parsed.scripts.length, 1);
  assert.equal(parsed.scripts[0].src, null);
  assert.deepEqual(parsed.references, []);
  assert.deepEqual(parsed.redirects, []);
});

test('classic 与 module 使用不同语法目标且均不执行代码', () => {
  const module = 'import value from "./not-resolved.js"; export const result = await Promise.resolve(value);';
  validateScript(module, { kind: 'module' });
  validateScript('<!-- legacy wrapper\nthrow new Error("must not run");\n//-->', { kind: 'classic' });
  for (const source of [module, 'return 1;', 'await Promise.resolve();']) {
    assert.throws(() => validateScript(source, { kind: 'classic' }), /\[SCRIPT_SYNTAX\]/);
  }
  assert.throws(() => validateScript('export const broken = ;', { kind: 'module' }), /\[SCRIPT_SYNTAX\]/);
});

test('HTTP 与发布包允许模块导入、导出、顶层 await 及数据脚本', async () => {
  const mutate = files => {
    files.set('创意空间首页/index.html', html('粉丝资源<script TYPE=module SRC=app.js></script><script type=application/ld+json>{"not":"JavaScript"}</script><script type=module>export const inline = await Promise.resolve(1);</script>'));
    files.set('创意空间首页/app.js', 'import value from "./dependency.js"; export const home = await Promise.resolve(value);');
    files.set('创意空间首页/dependency.js', 'export default 1;');
    files.set(three + 'index.html', html('<script type=module src=js/core.js></script>'));
    files.set(three + 'js/core.js', 'export const core = await Promise.resolve(true);');
  };
  const r = await verify({ mutate }); assert.equal(r.code, 0, r.output);
  const files = createSite(); mutate(files); assert.match(checkPackage(files), /发布包检查通过/);
});

test('内联脚本也必须按各自类型校验', async () => {
  const mutate = files => files.set('超级玛丽/index.html', html('<script>export const invalid = 1;</script>'));
  mustFail(await verify({ mutate }), '[SCRIPT_SYNTAX]', '#inline');
  const files = createSite(); mutate(files); assert.throws(() => checkPackage(files), /\[SCRIPT_SYNTAX\]/);
});

test('HTTP 返回 HTML MIME 的脚本即使内容是合法 JS 也必须失败', async () => {
  mustFail(await verify({ handlers: { '/TK/创意空间首页/app.js': (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' }).end('const htmlError = true;');
  } } }), '[SCRIPT_MIME]', 'app.js');
});

test('模块要求 JavaScript MIME，classic 保留浏览器允许的 text/plain', async () => {
  const handlers = { '/TK/创意空间首页/app.js': (_req, res) => res.writeHead(200, { 'Content-Type': 'text/plain' }).end('const value = 1;') };
  const classic = await verify({ handlers }); assert.equal(classic.code, 0, classic.output);
  mustFail(await verify({ handlers, mutate: files => files.set('创意空间首页/index.html', html('粉丝资源<script type=module src=app.js></script>')) }), '[SCRIPT_MIME]', 'app.js');
});

test('HTTP 跳转后的 base 和实体引用使用最终文档地址', async () => {
  const mutate = files => {
    files.set('current/index.html', html('<script src="runtime.js?x=1&amp;y=2"></script>', '<base href="assets/">'));
    files.set('current/assets/runtime.js', 'const current = true;');
  };
  const r = await verify({ mutate, handlers: { '/TK/超级玛丽/': (_req, res) => res.writeHead(307, { Location: '/TK/current/' }).end() } });
  assert.equal(r.code, 0, r.output); assert.ok(r.requests.includes('/TK/current/assets/runtime.js'));
  const files = createSite(); mutate(files); assert.match(checkPackage(files), /发布包检查通过/);
});

test('HTTP 跳转后的 meta 使用最终文档地址', async () => {
  const r = await verify({ mutate: files => {
    files.set('current/index.html', html('', '<meta content="0;url=next.html" http-equiv=refresh>'));
    files.set('current/next.html', html('next'));
  }, handlers: { '/TK/超级玛丽/': (_req, res) => res.writeHead(301, { Location: '/TK/current/' }).end() } });
  assert.equal(r.code, 0, r.output); assert.ok(r.requests.includes('/TK/current/next.html'));
});

test('跨 origin 的 HTTP Location 在发起下一次请求前失败', async () => {
  mustFail(await verify({ handlers: { '/TK/': (_req, res) => res.writeHead(302, { Location: 'http://127.0.0.1:1/outside' }).end() } }), '[URL_SCOPE]', '127.0.0.1:1');
});

test('HTTP 循环跳转、meta 循环跳转均明确失败', async () => {
  mustFail(await verify({ handlers: { '/TK/': (_req, res) => res.writeHead(302, { Location: '/TK/' }).end() } }), '[REDIRECT_LOOP]');
  mustFail(await verify({ mutate: files => files.set('index.html', html('', '<meta http-equiv=refresh content="0; url=./">')) }), '[REDIRECT_LOOP]');
});

test('HTTP 跳转必须具有 Location 并限制跳转深度', async () => {
  mustFail(await verify({ handlers: { '/TK/': (_req, res) => res.writeHead(302).end() } }), '[REDIRECT_LOCATION]');
  const handlers = { '/TK/': (_req, res) => res.writeHead(302, { Location: '/TK/hop0' }).end() };
  for (let i = 0; i < 12; i++) handlers['/TK/hop' + i] = (_req, res) => res.writeHead(302, { Location: '/TK/hop' + (i + 1) }).end();
  mustFail(await verify({ handlers }), '[REDIRECT_DEPTH]');
});

test('HTTP alias 与重复脚本引用不会虚增成功计数', async () => {
  const baseline = await verify(); assert.equal(baseline.code, 0, baseline.output);
  const r = await verify({ mutate: files => {
    files.set('创意空间首页/index.html', html('粉丝资源<script src=app.js></script><script src=alias.js></script>'));
    const catalog = JSON.parse(files.get('创意空间首页/game-catalog.json'));
    catalog.games.push({ id: 'alias', url: './alias/', version: 'v1.0.0' });
    files.set('创意空间首页/game-catalog.json', JSON.stringify(catalog));
  }, handlers: {
    '/TK/创意空间首页/alias/': (_req, res) => res.writeHead(302, { Location: encodeURI('/TK/创意空间首页/') }).end(),
    '/TK/创意空间首页/alias.js': (_req, res) => res.writeHead(302, { Location: encodeURI('/TK/创意空间首页/app.js') }).end(),
  } });
  assert.equal(r.code, 0, r.output);
  assert.equal(r.output.match(/\(\d+ pages, \d+ scripts\)/)[0], baseline.output.match(/\(\d+ pages, \d+ scripts\)/)[0]);
});

test('每个核心入口或运行文件缺失均令发布包失败', () => {
  for (const name of ['index.html', '创意空间首页/index.html', '坦克大战/tank-battle.html', '吞食天地三国/index.html', '超级玛丽/index.html', '墨水屏小站/index.html', 'Mac软件资源库/index.html', '粉丝资源/index.html', three + 'index.html', three + 'js/core.js', '粉丝资源/scripts/copy.js']) {
    const files = createSite(); files.delete(name);
    assert.throws(() => checkPackage(files), /\[REQUIRED_FILE\]/, name);
  }
});

test('发布包独立校验数据与脚本，不只验证引用存在', () => {
  const files = createSite(); files.set('创意空间首页/app.js', 'const invalid = ;');
  assert.throws(() => checkPackage(files), /\[SCRIPT_SYNTAX\].*app.js/);
  files.set('创意空间首页/app.js', 'const valid = true;');
  files.set('粉丝资源/resources.json', '{"resources":[]}');
  assert.throws(() => checkPackage(files), /资源目录必须包含非空 resources 数组/);
});

test('发布包检查 meta 目标及目录 index.html 的大小写', () => {
  const files = createSite(); files.set('超级玛丽/index.html', html('', '<meta content="0;url=missing.html" http-equiv=refresh>'));
  assert.throws(() => checkPackage(files), /\[PACKAGE_REFERENCE\].*missing.html/);
  files.delete('超级玛丽/index.html'); files.set('超级玛丽/Index.html', html('wrong case'));
  assert.throws(() => checkPackage(files), /\[REQUIRED_FILE\].*index.html/);
});

test('增添合法页面与资源时不受历史计数限制', async () => {
  const mutate = files => {
    files.set('粉丝资源/资源/extra.html', html('extra'));
    const resources = JSON.parse(files.get('粉丝资源/resources.json'));
    resources.resources.push({ id: 'r2', detailUrl: '资源/extra.html' });
    files.set('粉丝资源/resources.json', JSON.stringify(resources));
    const software = JSON.parse(files.get('Mac软件资源库/software-resources.json'));
    software.items.push({ id: 'app2', name: 'App2', shareUrl: 'https://example.test/app2' }); software.summary.total++;
    files.set('Mac软件资源库/software-resources.json', JSON.stringify(software));
  };
  const r = await verify({ mutate }); assert.equal(r.code, 0, r.output);
  const files = createSite(); mutate(files); assert.ok(checkPackage(files).includes(files.size + ' 文件'));
});

test('真实子进程被总超时终止时夹具必须报错', async () => {
  let killed;
  try { await exec(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { timeout: 80 }); }
  catch (error) { killed = error; }
  assert.ok(killed?.killed);
  assert.throws(() => failureResult(killed), /\[HARNESS_PROCESS\]/);
});

test('旧提交持续存在时耗尽重试并明确失败', async () => {
  const r = await verify({ mutate: files => files.set('创意空间首页/deployment-meta.json', '{"commit":"old"}') });
  mustFail(r, 'deployment commit old != expected'); assert.equal(r.metadataRequests, 3);
});

const classicBrowserSource = `<!-- classic browser script, deliberately not strict
const module = {}, exports = {}, require = null, __filename = '', __dirname = '';
var await = 1, legacyOctal = 010;
function duplicateArguments(value, value) { return value; }
with ({ value: 1 }) { void value; }
//-->`;

test('classic 保留浏览器 Script 语法，不套用 CommonJS 包装或模块严格规则', () => {
  validateScript(classicBrowserSource, { kind: 'classic' });
  assert.throws(() => validateScript(classicBrowserSource, { kind: 'module' }), /\[SCRIPT_SYNTAX\]/);
});

test('HTTP 和发布包均允许内联及外链的经典浏览器脚本', async () => {
  const mutate = files => {
    files.set('创意空间首页/app.js', classicBrowserSource);
    files.set('超级玛丽/index.html', html('<script>' + classicBrowserSource + '</script>'));
  };
  const result = await verify({ mutate }); assert.equal(result.code, 0, result.output);
  const files = createSite(); mutate(files); assert.match(checkPackage(files), /发布包检查通过/);
});

test('发布包 CLI 可选择包目录，未指定时保持原默认目录', () => {
  assert.match(checkPackage(createSite()), /发布包检查通过/);
  assert.match(checkPackage(createSite(), '/fixture/指定 包目录'), /发布包检查通过/);
});

test('发布包 CLI 在本项目 .artifacts 验证真实文件，错误参数不回退根 .site', async () => {
  const artifacts = fileURLToPath(new URL('./.artifacts/', import.meta.url));
  await mkdir(artifacts, { recursive: true });
  const directory = await mkdtemp(path.join(artifacts, 'site-verifier-'));
  try {
    const files = createSite();
    for (const [name, text] of files) {
      const destination = path.join(directory, name);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, text);
    }
    const result = await exec(process.execPath, [packageFile, directory], { timeout: 15000 });
    assert.ok(result.stdout.includes(files.size + ' 文件'), result.stdout);
    await assert.rejects(exec(process.execPath, [packageFile, path.join(directory, 'missing')], { timeout: 15000 }), error => {
      const result = failureResult(error);
      mustFail(result, '[PACKAGE_DIRECTORY]', path.join(directory, 'missing'));
      return true;
    });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
