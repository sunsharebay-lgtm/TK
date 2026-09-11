const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const libraryDir = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(libraryDir, file), 'utf8');

const data = JSON.parse(read('software-resources.json'));
assert.equal(data.libraryVersion, 'v0.6.0', '软件库版本应为 v0.6.0');
assert.equal(data.updatedAt, '2026-09-09', '软件库快照日期应为 2026-09-09');
assert.ok(Array.isArray(data.categories), '必须提供分类数组');
assert.equal(data.categories.length, 11, '分类数量应为 11');
assert.ok(Array.isArray(data.items), 'software-resources.json 必须包含 items 数组');
assert.equal(data.items.length, 71, '软件总数应为 71');

const numbers = data.items.map((item) => item.number);
assert.equal(new Set(numbers).size, 71, '软件编号不能重复');
assert.deepEqual(numbers, Array.from({ length: 71 }, (_, index) => String(index + 1).padStart(2, '0')), '软件编号应连续为 01 至 71');

const deliveryCounts = {};
for (const item of data.items) {
  assert.ok(item && typeof item === 'object', '软件条目必须是对象');
  for (const field of ['number', 'id', 'name', 'category', 'purpose', 'version', 'architecture', 'source', 'deliveryType', 'fileName', 'quarkPath', 'quarkFid', 'shareUrl', 'sha256']) {
    assert.ok(typeof item[field] === 'string' && item[field].trim(), `${item.number} 缺少 ${field}`);
  }
  assert.ok(data.categories.includes(item.category), `${item.number} 的分类不在分类表中`);
  assert.ok(/^https:\/\/pan\.quark\.cn\/s\/[A-Za-z0-9]+$/.test(item.shareUrl), `${item.number} 的夸克分享链接格式不正确`);
  assert.equal(item.sharePermanent, true, `${item.number} 必须是永久分享`);
  assert.match(item.sha256, /^[a-f0-9]{64}$/i, `${item.number} 必须提供 SHA-256`);
  assert.match(item.quarkPath, /^项目\/软件资源\//, `${item.number} 必须位于项目/软件资源目录`);
  assert.ok(item.fileName.endsWith('.dmg') || item.fileName.endsWith('.zip') || item.fileName.endsWith('.pkg') || item.fileName.endsWith('.txt'), `${item.number} 文件扩展名不在允许范围`);
  deliveryCounts[item.deliveryType] = (deliveryCounts[item.deliveryType] || 0) + 1;
}

assert.equal(deliveryCounts['安装包镜像'], 21, '安装包镜像数量应为 21');
assert.equal(deliveryCounts['官方链接文件'], 50, '官方链接文件数量应为 50');
assert.equal(data.summary.total, 71, 'summary.total 应为 71');
assert.equal(data.summary.categories, 11, 'summary.categories 应为 11');
assert.equal(data.summary.packages, 21, 'summary.packages 应为 21');
assert.equal(data.summary.officialLinkFiles, 50, 'summary.officialLinkFiles 应为 50');
assert.equal(data.summary.failed, 0, '失败数量应为 0');
assert.equal(data.summary.fallbacks, 0, '降级数量应为 0');

const page = read('index.html');
for (const pattern of [
  /id="search-input"/,
  /id="category-filter"/,
  /id="delivery-filter"/,
  /id="software-grid"/,
  /copy-btn/,
  /navigator\.clipboard/,
  /打开夸克/,
  /一键复制夸克链接/,
  /software-resources\.json/,
  /@media \(max-width: 640px\)/,
]) {
  assert.match(page, pattern, `详情页缺少功能标记：${pattern}`);
}

assert.ok(fs.existsSync(path.join(libraryDir, 'README.md')), '详情页 README 必须存在');
assert.match(read('README.md'), /2026-09-09/);
assert.doesNotMatch(page, /粉丝资源/, '独立资源库页面不应再作为粉丝资源详情页呈现');

console.log(`Mac software library checks passed (${data.items.length} items, ${data.categories.length} categories, ${deliveryCounts['安装包镜像']} packages, ${deliveryCounts['官方链接文件']} official-link files).`);
