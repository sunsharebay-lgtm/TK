const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { requiredPages, requiredScripts, dataPaths, extractHtml, localUrl, validateScript, validateData } = require('./site-validation.cjs');
const root = path.resolve(__dirname, '../..');
assert.ok(process.argv.length <= 3, 'Usage: node site_package_test.cjs [package-directory]');
// Optional directory is resolved from cwd; validation never builds or writes it.
const site = process.argv[2] === undefined ? path.join(root, '.site') : path.resolve(process.argv[2]);
assert.ok(fs.existsSync(site) && fs.statSync(site).isDirectory(), '[PACKAGE_DIRECTORY] 发布包目录不存在或不是目录：' + site);
const base = new URL('https://creative-space.test/TK/');
const htmlFiles = [], checkedScripts = new Map();
let count = 0, bytes = 0;

function locate(url, required = false) {
  const label = (required ? '[REQUIRED_FILE] ' : '[PACKAGE_REFERENCE] ') + url.href;
  const relative = decodeURIComponent(url.pathname.slice(base.pathname.length));
  let full = site;
  for (const segment of relative.split('/').filter(Boolean)) {
    assert.ok(segment !== '.' && segment !== '..', label + ' 非法路径');
    assert.ok(fs.statSync(full).isDirectory() && fs.readdirSync(full).includes(segment), label + ' 缺失引用或大小写不匹配');
    full = path.join(full, segment);
  }
  if (fs.statSync(full).isDirectory()) {
    assert.ok(fs.readdirSync(full).includes('index.html'), label + ' 缺少目录入口 index.html');
    full = path.join(full, 'index.html');
  }
  assert.ok(fs.statSync(full).isFile(), label + ' 必须是文件');
  return full;
}
function referenceFile(reference, parent, { required = false, strict = false } = {}) {
  if (!strict && (!reference || reference.startsWith('#'))) return null;
  const url = new URL(reference, parent);
  if (!strict && (!['http:', 'https:'].includes(url.protocol) || url.origin !== base.origin)) return null;
  return locate(localUrl(url, parent, base), required);
}
function checkScript(file, kind) {
  const kinds = checkedScripts.get(file) || new Set();
  if (!kinds.has(kind)) validateScript(fs.readFileSync(file, 'utf8'), { kind, filename: path.relative(site, file) });
  kinds.add(kind); checkedScripts.set(file, kinds);
}
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name), relative = path.relative(site, file);
    assert.ok(!entry.isSymbolicLink(), '发布包不得包含符号链接：' + relative);
    if (entry.isDirectory()) {
      assert.ok(!['历史版本', '测试', 'test', 'docs', '原生版', '.git'].includes(entry.name), '不应发布开发目录：' + relative);
      visit(file);
    } else {
      count++; bytes += fs.statSync(file).size;
      if (entry.name.toLowerCase().endsWith('.html')) htmlFiles.push(file);
    }
  }
}
visit(site);
// Completeness is a named delivery contract, not an incidental total file count.
for (const name of [...requiredPages, ...requiredScripts, ...Object.values(dataPaths)]) {
  referenceFile(name, base, { required: true, strict: true });
}
for (const file of htmlFiles) {
  const parsed = extractHtml(fs.readFileSync(file, 'utf8'));
  assert.ok(parsed.isHtml, '[HTML_PAGE] 入口必须返回 HTML 页面：' + path.relative(site, file));
  const pageUrl = new URL(path.relative(site, file).split(path.sep).map(encodeURIComponent).join('/'), base);
  const parent = parsed.baseHref === null ? pageUrl : localUrl(parsed.baseHref, pageUrl, base);
  for (const reference of parsed.references) referenceFile(reference, parent);
  for (const target of parsed.redirects) referenceFile(target, parent, { strict: true });
  for (const script of parsed.scripts) {
    if (script.src !== null) checkScript(referenceFile(script.src, parent, { strict: true }), script.kind);
    else validateScript(script.code, { kind: script.kind, filename: path.relative(site, file) + '#inline', inline: true });
  }
}
for (const name of requiredScripts) {
  const file = referenceFile(name, base, { required: true, strict: true });
  if (!checkedScripts.has(file)) checkScript(file, 'classic');
}
const data = {};
for (const [key, name] of Object.entries(dataPaths)) {
  data[key] = validateData(name, fs.readFileSync(referenceFile(name, base, { required: true, strict: true }), 'utf8'));
}
for (const game of data.catalog.games) if (!game.external) referenceFile(game.url, new URL('创意空间首页/', base), { strict: true });
for (const item of data.resources.resources) referenceFile(item.detailUrl, new URL('粉丝资源/', base), { strict: true });
console.log('发布包检查通过：' + count + ' 文件，' + (bytes / 1024 / 1024).toFixed(1) + ' MiB，必需文件、数据、脚本及静态引用通过验收。');
