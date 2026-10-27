import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { test } from 'node:test';

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const verifier = path.join(root, '创意空间首页/测试/published_site_test.mjs');
const metaPath = '/TK/创意空间首页/deployment-meta.json';

async function verify({ unavailable = '', stale = false, replace = {} } = {}) {
  let metadataRequests = 0;
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (url === unavailable) { res.writeHead(404).end('missing'); return; }
    if (url === metaPath) {
      metadataRequests++;
      res.end(JSON.stringify({ commit: stale && metadataRequests === 1 ? 'old' : 'expected' })); return;
    }
    if (Object.hasOwn(replace, url)) { res.end(replace[url]); return; }
    if (!url.startsWith('/TK/')) { res.writeHead(404).end(); return; }
    const relative = url.slice('/TK/'.length) + (url.endsWith('/') ? 'index.html' : '');
    try {
      // Emulate Linux/GitHub Pages even on a case-insensitive macOS volume.
      let parent = root;
      for (const segment of relative.split('/')) {
        if (!(await readdir(parent)).includes(segment)) throw new Error('case mismatch');
        parent = path.join(parent, segment);
      }
      res.end(await readFile(parent));
    }
    catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    try {
      const r = await exec(process.execPath, [verifier, `http://127.0.0.1:${port}/TK/`, 'expected'], {
        env: { ...process.env, PUBLISHED_SITE_METADATA_RETRIES: '2', PUBLISHED_SITE_RETRY_DELAY_MS: '1' }, timeout: 15000,
      });
      return { code: 0, output: r.stdout, metadataRequests };
    } catch (error) { return { code: error.code, output: error.stderr, metadataRequests }; }
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('完整站点的实际入口、脚本和数据通过验收', async () => {
  const r = await verify(); assert.equal(r.code, 0, r.output);
});

for (const route of [
  '/TK/',
  '/TK/Mac软件资源库/software-resources.json',
  '/TK/吞食天地三国/网页复刻/吞食天地Ⅱ同人复刻-网页版/index.html',
  '/TK/吞食天地三国/网页复刻/吞食天地Ⅱ同人复刻-网页版/js/core.js',
  '/TK/粉丝资源/scripts/copy.js',
  '/TK/吞食天地三国/网页复刻/吞食天地Ⅱ同人复刻-网页版/assets/data/system.json',
]) {
  test(`真实交付文件缺失必须失败：${route}`, async () => {
    const r = await verify({ unavailable: route }); assert.notEqual(r.code, 0, r.output);
  });
}

test('部署 CDN 暂时返回 HTTP 200 旧提交时重试至预期提交', async () => {
  const r = await verify({ stale: true });
  assert.equal(r.code, 0, r.output);
  assert.equal(r.metadataRequests, 2);
});

test('空创意目录不得被当成发布成功', async () => {
  const r = await verify({ replace: { '/TK/创意空间首页/game-catalog.json': '{"games":[]}' } });
  assert.notEqual(r.code, 0, r.output);
});

test('空软件目录不得被当成发布成功', async () => {
  const r = await verify({ replace: { '/TK/Mac软件资源库/software-resources.json': '{"items":[]}' } });
  assert.notEqual(r.code, 0, r.output);
});
