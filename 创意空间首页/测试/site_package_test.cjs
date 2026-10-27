const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const site = path.join(root, '.site');
assert.ok(fs.existsSync(site), '先运行 scripts/build-site.cjs');
const prefix = 'https://creative-space.test/TK/';
let count = 0, bytes = 0;
function existsLink(reference, page) {
  if (!reference || /^(?:https?:|data:|mailto:|tel:|javascript:|#)/i.test(reference)) return;
  const target = new URL(reference, prefix + page.split(path.sep).join('/'));
  assert.ok(target.href.startsWith(prefix), `${page} 跳出部署前缀：${reference}`);
  const relative = decodeURIComponent(target.pathname.slice('/TK/'.length));
  const full = path.join(site, relative);
  let parent = site;
  for (const segment of relative.split('/').filter(Boolean)) {
    assert.ok(fs.readdirSync(parent).includes(segment), `${page} 引用大小写不匹配：${reference}`);
    parent = path.join(parent, segment);
  }
  assert.ok(fs.existsSync(full), `${page} 缺失引用：${reference}`);
  if (fs.statSync(full).isDirectory()) assert.ok(fs.existsSync(path.join(full, 'index.html')), `${relative} 缺少目录入口`);
}
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name), relative = path.relative(site, file);
    assert.ok(!entry.isSymbolicLink(), `发布包不得包含符号链接：${relative}`);
    if (entry.isDirectory()) {
      assert.ok(!['历史版本', '测试', 'test', 'docs', '原生版', '.git'].includes(entry.name), `不应发布开发目录：${relative}`);
      visit(file);
    } else {
      count++; bytes += fs.statSync(file).size;
      if (entry.name.endsWith('.html')) {
        const html = fs.readFileSync(file, 'utf8');
        for (const match of html.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/g)) existsLink(match[1], relative);
      }
    }
  }
}
visit(site);
const catalog = JSON.parse(fs.readFileSync(path.join(site, '创意空间首页/game-catalog.json')));
for (const game of catalog.games) if (!game.external) existsLink(game.url, '创意空间首页/index.html');
const resources = JSON.parse(fs.readFileSync(path.join(site, '粉丝资源/resources.json')));
for (const item of resources.resources) existsLink(item.detailUrl, '粉丝资源/index.html');
console.log(`发布包检查通过：${count} 文件，${(bytes / 1024 / 1024).toFixed(1)} MiB，全部静态引用可达。`);
