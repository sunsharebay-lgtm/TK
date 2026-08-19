const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const portal = read('index.html');
assert.match(portal, /小游戏中心/, '根入口应显示小游戏中心');
assert.match(portal, /href=["']\.\/tank-battle\.html["']/, '小游戏中心应链接到 tank-battle.html');
assert.match(portal, /href=["']\.\/three-kingdoms\.html["']/, '小游戏中心应链接到 three-kingdoms.html');
assert.match(portal, /data-game-version=["']three-kingdoms["']/, '三国游戏卡应绑定 three-kingdoms 版本标识');
assert.match(portal, /吞食天地：汉末群雄/, '小游戏中心应显示三国游戏标题');
assert.match(portal, /data-game-version=["']three-kingdoms["']>v0\.1\.0 开发版<\/span>/, '三国游戏卡应显示开发版 fallback');
assert.match(portal, /fetch\(['"]\.\/game-catalog\.json['"],\s*\{\s*cache:\s*['"]no-store['"]\s*\}\)/, '首页应从游戏目录动态读取版本');
assert.match(portal, /catalog\.games[\s\S]*find\(\(entry\) => entry\.id === slot\.dataset\.gameVersion\)/, '首页应按游戏 ID 查找目录版本');
assert.match(portal, /slot\.textContent = `\$\{game\.version\} \$\{game\.status \|\| ['"]['"]\}`\.trim\(\)/, '首页应使用目录版本覆盖卡片 fallback');
assert.ok(fs.existsSync(path.join(root, 'tank-battle.html')), '坦克大战新入口文件必须存在');
assert.match(read('tank-battle.html'), /钢铁防线.*坦克大战/, '坦克大战新入口应保留游戏页面');
assert.match(portal, /赞助商：llapi\.org/, '首页应显示赞助商名称');
assert.match(portal, /有需要用 API 中转服务的可以试下，价格不是最低，但稳定可靠。/, '首页应显示赞助推荐文案');
assert.match(portal, /href=["']https:\/\/llapi\.org\/?["'][^>]*target=["']_blank["'][^>]*rel=["'][^"']*sponsored[^"']*noopener[^"']*noreferrer/, '赞助商链接应安全地新窗口打开并标记为 sponsored');
assert.match(portal, /有需要用 API 中转服务的可以试下，价格不是最低，但稳定可靠。<a class=["']sponsor-direct["'][^>]*>点击直达<\/a>/, '赞助文案后应显示点击直达');
assert.match(portal, /class=["']sponsor-direct["'][^>]*href=["']https:\/\/llapi\.org\/?["'][^>]*target=["']_blank["']/, '点击直达应链接到 llapi.org 并新窗口打开');

console.log('Game center entry checks passed.');
