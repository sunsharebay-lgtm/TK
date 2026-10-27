const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const { generateCatalog, parseStableTags } = require(path.join(root, 'scripts/generate-game-catalog.cjs'));

const catalogPath = path.join(root, 'game-catalog.json');
assert.ok(fs.existsSync(catalogPath), '游戏目录元数据文件必须存在');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const template = JSON.parse(read('game-catalog.template.json'));
const gitEnv = { ...process.env };
for (const name of execFileSync('git', ['rev-parse', '--local-env-vars'], { encoding: 'utf8' }).trim().split(/\r?\n/)) {
  delete gitEnv[name];
}
const reachableTags = execFileSync('git', ['tag', '--list', '--merged', 'HEAD'], {
  cwd: path.resolve(root, '..'), env: gitEnv, encoding: 'utf8',
});
assert.deepEqual(catalog, generateCatalog(template, reachableTags), '目录快照必须与当前 HEAD 可达标签一致；请重新运行目录生成器');
for (const game of catalog.games) {
  if (game.tagNamespace) {
    assert.match(game.version, /^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/, `${game.id} 标签版本必须使用稳定语义版本`);
  } else {
    assert.ok(typeof game.version === 'string' && game.version.trim(), `${game.id} 必须保留非空静态版本`);
  }
  assert.ok(typeof game.status === 'string' && game.status, `${game.id} 必须有展示状态`);
}
const tank = catalog.games.find((game) => game.id === 'tank-battle');
assert.ok(tank, '游戏目录必须包含坦克大战');
const threeKingdoms = catalog.games.find((game) => game.id === 'three-kingdoms');
assert.ok(threeKingdoms, '游戏目录必须包含三国 RPG');
const superMario = catalog.games.find((game) => game.id === 'super-mario');
assert.ok(superMario, '游戏目录必须包含超级玛丽');
const idleScreen = catalog.games.find((game) => game.id === 'idle-screen');
assert.ok(idleScreen, '游戏目录必须包含闲置屏幕');
assert.equal(idleScreen.external, false, '墨水屏小站迁入后应标记为站内项目');
assert.equal(idleScreen.url, '../墨水屏小站/', '墨水屏小站应使用站内相对路径');
assert.equal(idleScreen.tagNamespace, 'game/idle-screen', '墨水屏小站应使用独立标签命名空间');
const macSoftwareLibrary = catalog.games.find((game) => game.id === 'mac-software-resource-library');
assert.ok(macSoftwareLibrary, '目录必须包含 Mac 软件资源库');
assert.equal(macSoftwareLibrary.url, '../Mac软件资源库/', 'Mac 软件资源库应使用站内相对路径');
assert.equal(macSoftwareLibrary.tagNamespace, 'resource/mac-software-library', 'Mac 软件资源库应使用 resource 标签命名空间');
assert.equal(catalog.games.length, template.games.length, '目录数量与注册模板一致');

const parsedTags = parseStableTags([
  'game/tank-battle/v1.6.1',
  'game/tank-battle/v1.6.2',
  'game/three-kingdoms/v0.2.0',
  'game/idle-screen/v0.4.0',
  'resource/mac-software-library/v0.5.0',
  'resource/mac-software-library/v0.6.0',
  'v9.9.9',
  'release/foo',
].join('\n'));
assert.equal(parsedTags['game/tank-battle'], 'v1.6.2', '同一游戏应取最高稳定语义版本标签');
assert.equal(parsedTags['game/three-kingdoms'], 'v0.2.0', '不同游戏 namespace 应独立解析');
assert.equal(parsedTags['game/idle-screen'], 'v0.4.0', '墨水屏小站 namespace 应独立解析');
assert.equal(parsedTags['resource/mac-software-library'], 'v0.6.0', '资源库 namespace 应独立解析并取最高版本');
assert.equal(parsedTags['v9.9.9'], undefined, '普通全局版本标签必须被忽略');
assert.equal(parsedTags['release/foo'], undefined, '不匹配标签必须被忽略');

assert.deepEqual(parseStableTags([
  'game/test/v02.0.0', 'game/test/v2.01.0', 'game/test/v2.1.01',
  'resource/test/v00.0.0', 'resource/test/v0.00.0', 'resource/test/v0.0.00',
  'game/test/v3.0.0-rc.1', 'game/test/v3.0.0+build.1',
].join('\n')), {}, '前导零与非 vX.Y.Z 格式标签不能作为稳定版本');
assert.equal(parseStableTags('game/test/v0.0.0')['game/test'], 'v0.0.0', '单个零是有效版本分量');

const taggedCatalog = generateCatalog(template, [
  'game/tank-battle/v1.6.1',
  'game/tank-battle/v1.6.2',
  'game/three-kingdoms/v0.2.0',
  'resource/mac-software-library/v0.6.1',
  'v9.9.9',
  'release/foo',
].join('\n'));
assert.equal(taggedCatalog.games[0].version, 'v1.6.2', '目录应使用坦克大战最高 namespace 标签');
const taggedThreeKingdoms = taggedCatalog.games.find((game) => game.id === 'three-kingdoms');
assert.equal(taggedThreeKingdoms.version, 'v0.2.0', '目录应解析三国 RPG namespace 稳定版本');
assert.equal(taggedThreeKingdoms.status, '稳定版', '存在三国 RPG namespace 标签时应标记为稳定版');
const taggedMacSoftwareLibrary = taggedCatalog.games.find((game) => game.id === 'mac-software-resource-library');
assert.equal(taggedMacSoftwareLibrary.version, 'v0.6.1', '目录应解析资源库 namespace 稳定版本');
assert.equal(taggedMacSoftwareLibrary.status, '稳定版', '存在资源库 namespace 标签时应标记为稳定版');
const taggedSuperMario = taggedCatalog.games.find((game) => game.id === 'super-mario');
const marioTemplate = template.games.find((game) => game.id === 'super-mario');
assert.equal(taggedSuperMario.version, marioTemplate.fallbackVersion, '没有超级玛丽标签时应保留 fallback');
assert.equal(taggedSuperMario.status, marioTemplate.statusWhenMissing, '没有超级玛丽标签时应保持回退状态');

const fallbackCatalog = generateCatalog(template, 'v9.9.9\nrelease/foo');
for (const game of fallbackCatalog.games) {
  const configured = template.games.find((entry) => entry.id === game.id);
  assert.equal(game.version, configured.fallbackVersion, `${game.id} 没有标签时使用配置的回退版本`);
  assert.equal(game.status, configured.statusWhenMissing, `${game.id} 没有标签时使用配置的回退状态`);
}

const legacyExternal = { games: [{ id: 'legacy-external', title: '静态外部项目', url: 'https://example.com/legacy/', external: true, version: 'v0.4', status: '外部项目' }] };
for (const tags of ['', 'game/legacy-external/v9.0.0']) {
  assert.deepEqual(generateCatalog(legacyExternal, tags), legacyExternal, '无命名空间的外部项目必须原样保留历史静态版本 v0.4 和状态');
}

for (const [label, mutate, field] of [
  ['缺少 id', (value) => { delete value.games[0].id; }, /id/],
  ['缺少 title', (value) => { delete value.games[0].title; }, /title/],
  ['缺少 url', (value) => { delete value.games[0].url; }, /url/],
  ['重复 id', (value) => { value.games[1].id = value.games[0].id; }, /duplicate.*id/i],
  ['空 id', (value) => { value.games[0].id = ' '; }, /id/],
  ['id 两侧有空白', (value) => { value.games[0].id = ' tank-battle '; }, /id/],
  ['标题类型错误', (value) => { value.games[0].title = 123; }, /title/],
  ['空标题', (value) => { value.games[0].title = '\n\t'; }, /title/],
  ['链接类型错误', (value) => { value.games[0].url = {}; }, /url/],
  ['条目不是对象', (value) => { value.games[0] = null; }, /games\[0\]/],
  ['条目是数组', (value) => { value.games[0] = []; }, /games\[0\]/],
  ['命名空间错误', (value) => { value.games[0].tagNamespace = 'gaem/tank-battle'; }, /tagNamespace/],
  ['命名空间是原型属性名', (value) => { value.games[0].tagNamespace = '__proto__'; }, /tagNamespace/],
  ['缺少回退版本', (value) => { delete value.games[0].fallbackVersion; }, /fallbackVersion/],
  ['回退版本带前导零', (value) => { value.games[0].fallbackVersion = 'v01.0.0'; }, /fallbackVersion/],
  ['标签项目回退版本不完整', (value) => { value.games[0].fallbackVersion = 'v0.4'; }, /fallbackVersion/],
  ['标签项目版本不完整', (value) => { value.games[0].version = 'v0.4'; }, /version/],
  ['版本不是字符串', (value) => { value.games[0].version = 1; }, /version/],
  ['版本为预发行', (value) => { value.games[0].version = 'v1.0.0-rc.1'; }, /version/],
  ['缺少无标签状态', (value) => { delete value.games[0].statusWhenMissing; }, /statusWhenMissing/],
  ['无标签状态为空', (value) => { value.games[0].statusWhenMissing = ' '; }, /statusWhenMissing/],
  ['带标签状态类型错误', (value) => { value.games[0].statusWhenTagged = false; }, /statusWhenTagged/],
  ['缺少带标签状态', (value) => { delete value.games[0].status; }, /statusWhenTagged|status/],
  ['显示状态类型错误', (value) => { value.games[0].status = []; }, /status/],
  ['external 不是布尔值', (value) => { value.games[0].external = 'false'; }, /external/],
  ['external 为 null', (value) => { value.games[0].external = null; }, /external/],
  ['相对链接标为外部', (value) => { value.games[0].external = true; }, /external/],
  ['绝对链接标为站内', (value) => { value.games[0].url = 'https://example.com/game'; }, /external/],
]) {
  const invalid = structuredClone(template);
  mutate(invalid);
  for (const tags of ['', reachableTags]) {
    assert.throws(() => generateCatalog(invalid, tags), { name: 'TypeError', message: field }, `${label}必须在有标签和无标签时都拒绝`);
  }
}
for (const invalid of [null, [], {}, { games: null }, { games: {} }]) {
  assert.throws(() => generateCatalog(invalid, ''), { name: 'TypeError', message: /games/ }, '根对象必须包含 games 数组');
}
for (const field of ['title', 'url']) {
  const invalid = structuredClone(template);
  delete invalid.games[0][field];
  assert.throws(() => generateCatalog(invalid, ''), (error) => {
    assert.equal(error.name, 'TypeError');
    assert.match(error.message, /games\[0\]/);
    assert.match(error.message, /tank-battle/);
    assert.match(error.message, new RegExp(field));
    return true;
  }, '字段错误应包含条目索引和 id');
}
for (const url of [
  '', ' ', 'javascript:alert(1)', 'data:text/html,hello', 'file:///tmp/test', 'ftp://example.com/',
  '//example.com/game', '/\\example.com/game', '\\example.com/game',
  'https:example.com', 'https:/example.com', 'https://', 'http://[invalid',
  ' https://example.com/', 'https://example.com/\n', 'java\tscript:alert(1)', '../test/\u0000',
  'https://user:pass@example.com/', 'http://user@example.com/', 'https://:pass@example.com/',
]) {
  const invalid = structuredClone(template);
  invalid.games[0].url = url;
  assert.throws(() => generateCatalog(invalid, ''), { name: 'TypeError', message: /url/ }, `必须拒绝不安全或无效链接 ${JSON.stringify(url)}`);
}
for (const url of ['https://example.com/game', 'http://localhost:8000/game', '../坦克大战/tank-battle.html', './game/', '/TK/游戏/', 'game.html?mode=1#play', '?mode=1', '#play']) {
  const valid = structuredClone(template);
  valid.games[0].url = url;
  delete valid.games[0].external;
  const original = structuredClone(valid);
  assert.equal(generateCatalog(valid, '').games[0].url, url, '允许 HTTP(S) 和站点相对链接');
  assert.deepEqual(valid, original, '生成目录不能修改调用方模板');
}
const manualTemplate = { games: [{ id: 'manual', title: '手动版本', url: '../manual/', version: 'v0.0.0', status: '开发版' }] };
assert.deepEqual(generateCatalog(manualTemplate, ''), manualTemplate, '无命名空间的条目保留显式版本和状态');
for (const field of ['version', 'status']) {
  const invalid = structuredClone(manualTemplate);
  delete invalid.games[0][field];
  assert.throws(() => generateCatalog(invalid, ''), { name: 'TypeError', message: new RegExp(field) }, `无命名空间条目必须提供 ${field}`);
}
for (const version of ['', ' ', 0, null]) {
  const invalid = structuredClone(legacyExternal);
  invalid.games[0].version = version;
  assert.throws(() => generateCatalog(invalid, ''), { name: 'TypeError', message: /version/ }, '静态版本仍须是非空字符串');
}

const generator = read('scripts/generate-game-catalog.cjs');
assert.match(generator, /game-catalog\.json/, '版本生成器应生成游戏目录文件');
assert.match(generator, /module\.exports\s*=.*parseStableTags/s, '版本生成器应导出可测试的纯函数');

const workflow = read('../.github/workflows/pages.yml');
assert.match(workflow, /fetch-depth:\s*0/, 'Pages 工作流必须拉取完整 Git 历史和标签');
assert.match(workflow, /generate-game-catalog\.cjs/, 'Pages 工作流必须生成游戏目录');
assert.match(workflow, /branches:\s*\[main\]/, 'Pages 工作流必须只由 main 分支触发部署');
assert.doesNotMatch(workflow, /tags:/, 'Pages 工作流不得由版本标签触发竞争部署');
assert.match(workflow, /run:\s*node 创意空间首页\/scripts\/generate-game-catalog\.cjs/, '目录生成步骤应指向创意空间首页项目里的生成脚本');
assert.match(workflow, /write-deployment-meta\.cjs/, 'Pages 工作流必须写入部署版本标记');
assert.match(workflow, /published_site_test\.mjs/, 'Pages 工作流必须执行线上验收');
assert.doesNotMatch(workflow, /git tag --sort=-v:refname/, 'Pages 工作流不得再读取全局版本标签');

const portal = read('index.html');
assert.match(portal, /data-game-version/, '游戏卡片必须提供版本展示位置');
assert.match(portal, /game-catalog\.json/, '首页必须读取自动生成的游戏目录');
assert.match(portal, /setCount\(games\.length\)/, '首页游戏数量应读取目录中的创意数量');
assert.match(portal, /grid\.replaceChildren/, '首页应从目录动态渲染游戏卡片');
assert.match(portal, /buildGameCard/, '首页应使用目录数据构建游戏卡片');
assert.match(portal, /稳定版/, '首页必须包含稳定版显示回退文案');

const { dataPaths, requiredPages } = require('./site-validation.cjs');
assert.equal(dataPaths.metadata, '创意空间首页/deployment-meta.json', '线上验收必须检查部署版本标记');
assert.equal(dataPaths.resources, '粉丝资源/resources.json', '线上验收必须检查资源数据');
assert.ok(requiredPages.includes('超级玛丽/'), '线上验收必须检查超级玛丽入口');
assert.equal(dataPaths.catalog, '创意空间首页/game-catalog.json', '线上验收必须检查创意目录入口');

console.log('Version catalog checks passed.');
