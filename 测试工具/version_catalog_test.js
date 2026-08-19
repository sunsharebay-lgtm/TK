const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const catalogPath = path.join(root, 'game-catalog.json');
assert.ok(fs.existsSync(catalogPath), '游戏目录元数据文件必须存在');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const tank = catalog.games.find((game) => game.id === 'tank-battle');
assert.ok(tank, '游戏目录必须包含坦克大战');
assert.match(tank.version, /^v\d+\.\d+\.\d+$/, '坦克大战版本必须使用稳定版语义版本');
assert.equal(tank.status, '稳定版', '坦克大战应标记为稳定版');

const generator = read('scripts/generate-game-catalog.cjs');
assert.match(generator, /process\.argv\[2\]/, '版本生成器应接收 Git 标签版本');
assert.match(generator, /game-catalog\.json/, '版本生成器应生成游戏目录文件');

const workflow = read('.github/workflows/pages.yml');
assert.match(workflow, /fetch-depth:\s*0/, 'Pages 工作流必须拉取完整 Git 历史和标签');
assert.match(workflow, /git tag --sort=-v:refname/, 'Pages 工作流必须从 Git 标签读取版本');
assert.match(workflow, /generate-game-catalog\.cjs/, 'Pages 工作流必须生成游戏目录');
assert.match(workflow, /tags:\s*\['v\*'\]/, '推送稳定版本标签时也必须触发 Pages 部署');

const portal = read('index.html');
assert.match(portal, /data-game-version/, '游戏卡片必须提供版本展示位置');
assert.match(portal, /game-catalog\.json/, '首页必须读取自动生成的游戏目录');
assert.match(portal, /稳定版/, '首页必须包含稳定版显示回退文案');

console.log('Version catalog checks passed.');
