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
assert.match(portal, /赞助商：llapi\.org/, '首页应显示赞助商名称');
assert.match(portal, /有需要用 API 中转服务的可以试下，价格不是最低，但稳定可靠。/, '首页应显示赞助推荐文案');
assert.match(portal, /href=["']https:\/\/llapi\.org\/?["'][^>]*target=["']_blank["'][^>]*rel=["'][^"']*sponsored[^"']*noopener[^"']*noreferrer/, '赞助商链接应安全地新窗口打开并标记为 sponsored');

console.log('Game center entry checks passed.');
