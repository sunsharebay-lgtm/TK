const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const { generateCatalog, parseStableTags } = require(path.join(root, 'scripts/generate-game-catalog.cjs'));

const catalogPath = path.join(root, 'game-catalog.json');
assert.ok(fs.existsSync(catalogPath), '游戏目录元数据文件必须存在');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const tank = catalog.games.find((game) => game.id === 'tank-battle');
assert.ok(tank, '游戏目录必须包含坦克大战');
assert.match(tank.version, /^v\d+\.\d+\.\d+$/, '坦克大战版本必须使用稳定版语义版本');
assert.equal(tank.status, '稳定版', '坦克大战应标记为稳定版');
const threeKingdoms = catalog.games.find((game) => game.id === 'three-kingdoms');
assert.ok(threeKingdoms, '游戏目录必须包含三国 RPG');
assert.equal(threeKingdoms.version, 'v0.2.0', '三国 RPG 当前稳定切片必须为 v0.2.0');
assert.equal(threeKingdoms.status, '稳定版', '三国 RPG v0.2.0 应标记为稳定版');
const superPixelBrothers = catalog.games.find((game) => game.id === 'super-pixel-brothers');
assert.ok(superPixelBrothers, '游戏目录必须包含超级像素兄弟');
assert.equal(superPixelBrothers.version, 'v0.1.0', '超级像素兄弟尚无正式标签时使用 v0.1.0');
assert.equal(superPixelBrothers.status, '开发版', '超级像素兄弟暂无正式标签时应为开发版');
const idleScreen = catalog.games.find((game) => game.id === 'idle-screen');
assert.ok(idleScreen, '游戏目录必须包含闲置屏幕');
assert.equal(idleScreen.version, 'v0.4', '闲置屏幕应保留静态版本号');
assert.equal(idleScreen.external, true, '闲置屏幕应标记为外部项目');
assert.equal(catalog.games.length, 4, '当前可展示创意数量应为 4');

const template = JSON.parse(read('game-catalog.template.json'));
const parsedTags = parseStableTags([
  'game/tank-battle/v1.6.1',
  'game/tank-battle/v1.6.2',
  'game/three-kingdoms/v0.2.0',
  'v9.9.9',
  'release/foo',
].join('\n'));
assert.equal(parsedTags['game/tank-battle'], 'v1.6.2', '同一游戏应取最高稳定语义版本标签');
assert.equal(parsedTags['game/three-kingdoms'], 'v0.2.0', '不同游戏 namespace 应独立解析');
assert.equal(parsedTags['v9.9.9'], undefined, '普通全局版本标签必须被忽略');
assert.equal(parsedTags['release/foo'], undefined, '不匹配标签必须被忽略');

const taggedCatalog = generateCatalog(template, [
  'game/tank-battle/v1.6.1',
  'game/tank-battle/v1.6.2',
  'game/three-kingdoms/v0.2.0',
  'v9.9.9',
  'release/foo',
].join('\n'));
assert.equal(taggedCatalog.games[0].version, 'v1.6.2', '目录应使用坦克大战最高 namespace 标签');
const taggedThreeKingdoms = taggedCatalog.games.find((game) => game.id === 'three-kingdoms');
assert.equal(taggedThreeKingdoms.version, 'v0.2.0', '目录应解析三国 RPG namespace 稳定版本');
assert.equal(taggedThreeKingdoms.status, '稳定版', '存在三国 RPG namespace 标签时应标记为稳定版');
const taggedSuperPixelBrothers = taggedCatalog.games.find((game) => game.id === 'super-pixel-brothers');
assert.equal(taggedSuperPixelBrothers.version, 'v0.1.0', '没有超级像素标签时应保留 fallback');
assert.equal(taggedSuperPixelBrothers.status, '开发版', '没有超级像素标签时应保持开发版');

const fallbackCatalog = generateCatalog(template, 'v9.9.9\nrelease/foo');
const fallbackTank = fallbackCatalog.games.find((game) => game.id === 'tank-battle');
assert.equal(fallbackTank.version, 'v1.6.1', '没有匹配 namespace 标签时应使用坦克大战 fallback');
assert.equal(fallbackTank.status, '稳定版', '没有匹配 namespace 标签时应使用稳定版状态');
const fallbackThreeKingdoms = fallbackCatalog.games.find((game) => game.id === 'three-kingdoms');
assert.equal(fallbackThreeKingdoms.version, 'v0.2.0', '没有匹配 namespace 标签时应使用三国 RPG fallback');
assert.equal(fallbackThreeKingdoms.status, '开发版', '没有匹配 namespace 标签时三国 RPG 应保留开发版状态');

const generator = read('scripts/generate-game-catalog.cjs');
assert.match(generator, /game-catalog\.json/, '版本生成器应生成游戏目录文件');
assert.match(generator, /module\.exports\s*=.*parseStableTags/s, '版本生成器应导出可测试的纯函数');

const workflow = read('../.github/workflows/pages.yml');
assert.match(workflow, /fetch-depth:\s*0/, 'Pages 工作流必须拉取完整 Git 历史和标签');
assert.match(workflow, /generate-game-catalog\.cjs/, 'Pages 工作流必须生成游戏目录');
assert.match(workflow, /tags:\s*\['game\/\*\*\/v\*'\]/, '推送按游戏稳定版本标签时也必须触发 Pages 部署');
assert.match(workflow, /run:\s*node 创意空间首页\/scripts\/generate-game-catalog\.cjs/, '目录生成步骤应指向创意空间首页项目里的生成脚本');
assert.doesNotMatch(workflow, /git tag --sort=-v:refname/, 'Pages 工作流不得再读取全局版本标签');

const portal = read('index.html');
assert.match(portal, /data-game-version/, '游戏卡片必须提供版本展示位置');
assert.match(portal, /game-catalog\.json/, '首页必须读取自动生成的游戏目录');
assert.match(portal, /setCount\(games\.length\)/, '首页游戏数量应读取目录中的创意数量');
assert.match(portal, /grid\.replaceChildren/, '首页应从目录动态渲染游戏卡片');
assert.match(portal, /buildGameCard/, '首页应使用目录数据构建游戏卡片');
assert.match(portal, /稳定版/, '首页必须包含稳定版显示回退文案');

console.log('Version catalog checks passed.');
