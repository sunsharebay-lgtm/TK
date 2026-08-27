const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const data = JSON.parse(read('resources.json'));
assert.ok(Array.isArray(data.resources), 'resources.json 必须包含 resources 数组');

for (const item of data.resources) {
  assert.ok(item && typeof item === 'object', '资源条目必须是对象');
  assert.ok(typeof item.id === 'string' && item.id.trim(), '资源条目必须提供 id');
  assert.ok(
    typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date),
    `资源 ${item.id} 的 date 必须为 YYYY-MM-DD`,
  );
  assert.ok(typeof item.title === 'string' && item.title.trim(), `资源 ${item.id} 必须提供标题`);

const links = Array.isArray(item.links) ? item.links : [];
const texts = Array.isArray(item.texts) ? item.texts : [];
const detailUrl = typeof item.detailUrl === 'string' ? item.detailUrl.trim() : '';
assert.ok(detailUrl, `资源 ${item.id} 必须提供独立资料页地址`);

if (detailUrl) {
  assert.ok(!/^https?:\/\//i.test(detailUrl), `资源 ${item.id} 的资料页地址应使用站点内相对路径`);
  const detailHtmlPath = path.join(detailUrl, 'index.html');
  assert.ok(fs.existsSync(path.join(root, detailHtmlPath)), `资源 ${item.id} 的资料页文件必须存在`);
  assert.match(read(detailHtmlPath), /copy-btn/, `资源 ${item.id} 的资料页应提供复制按钮`);
}

  for (const link of links) {
    assert.ok(link && typeof link.label === 'string' && link.label.trim(), `资源 ${item.id} 的链接必须提供 label`);
    assert.ok(typeof link.url === 'string' && /^https?:\/\//i.test(link.url), `资源 ${item.id} 的链接必须是 http(s) 网址`);
  }

  for (const text of texts) {
    assert.ok(text && typeof text.label === 'string' && text.label.trim(), `资源 ${item.id} 的文字必须提供 label`);
    assert.ok(typeof text.value === 'string' && text.value.trim(), `资源 ${item.id} 的文字必须提供 value`);
  }
}

const portal = read('index.html');
assert.match(portal, /id=["']resources-grid["']/, '首页应提供粉丝资源卡片渲染容器');

console.log(`Resource catalog checks passed (${data.resources.length} entries).`);
