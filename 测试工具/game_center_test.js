const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const portal = read('index.html');
assert.match(portal, /小游戏中心/, '根入口应显示小游戏中心');
assert.match(portal, /href=["']\.\/tank-battle\.html["']/, '小游戏中心应链接到 tank-battle.html');
assert.ok(fs.existsSync(path.join(root, 'tank-battle.html')), '坦克大战新入口文件必须存在');
assert.match(read('tank-battle.html'), /钢铁防线.*坦克大战/, '坦克大战新入口应保留游戏页面');
assert.match(read('坦克大战.html'), /tank-battle\.html/, '旧中文入口应兼容跳转到新入口');

console.log('Game center entry checks passed.');
