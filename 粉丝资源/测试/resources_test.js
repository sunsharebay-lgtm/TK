const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { validateResources } = require('../scripts/catalog.js');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const resources = validateResources(JSON.parse(read('resources.json')));
assert.ok(!resources.some(item => item.id === 'mac-software-resource-library'), 'Mac 软件资源库已迁为平级项目');

for (const item of resources) {
  const htmlPath = path.join(item.detailUrl, 'index.html');
  assert.ok(fs.existsSync(path.join(root, htmlPath)), `资源 ${item.id} 的详情页必须存在`);
  const html = read(htmlPath);
  assert.match(html, /<button\b[^>]*class="copy-btn"/, `资源 ${item.id} 必须提供复制按钮`);
  assert.match(html, /src="\.\.\/\.\.\/scripts\/copy\.js"/, `资源 ${item.id} 应使用统一复制脚本`);
  assert.match(html, /href="\.\.\/\.\.\/styles\/common\.css"/, `资源 ${item.id} 应加载交互样式`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `资源 ${item.id} 不得有重复 DOM id`);
  for (const match of html.matchAll(/data-copy-target="([^"]+)"/g)) assert.ok(ids.includes(match[1]), `缺少复制目标 ${match[1]}`);
  for (const match of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    assert.match(match[0], /rel="[^"]*noopener/, '新标签打开的链接必须隔离 opener');
  }
  for (const link of item.links || []) {
    assert.ok(typeof link.label === 'string' && link.label.trim());
    assert.match(link.url, /^https?:\/\//);
  }
  for (const text of item.texts || []) {
    assert.ok(typeof text.label === 'string' && text.label.trim());
    assert.ok(typeof text.value === 'string' && text.value.trim());
  }
}

for (const htmlPath of ['index.html', ...resources.map(item => path.join(item.detailUrl, 'index.html'))]) {
  const html = read(htmlPath);
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"#]+)"[^>]*>/g)) {
    const dependency = path.resolve(root, path.dirname(htmlPath), match[1]);
    assert.ok(dependency.startsWith(root + path.sep), `本项目依赖不可越界：${match[1]}`);
    assert.ok(fs.existsSync(dependency), `缺少页面依赖：${dependency}`);
    if (dependency.endsWith('.js')) new vm.Script(fs.readFileSync(dependency, 'utf8'), { filename: dependency });
  }
}
const portal = read('index.html');
assert.match(portal, /id="resources-grid"/, '资源列表应有渲染容器');
assert.match(portal, /id="resources-status"/, '资源列表应有加载状态');
console.log(`Resource catalog checks passed (${resources.length} entries, unique identities, detail pages and dependencies).`);
