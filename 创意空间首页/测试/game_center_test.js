const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const portal = read('index.html');
assert.match(portal, /创意空间/, '根入口应显示创意空间');
assert.match(portal, /href=["']\.\.\/坦克大战\/tank-battle\.html["']/, '首页应链接到上级目录坦克大战创意下的 tank-battle.html');
assert.match(portal, /href=["']\.\.\/吞食天地三国\/["']/, '首页应链接到上级目录吞食天地三国创意');
assert.match(portal, /data-game-version=["']three-kingdoms["']/, '三国游戏卡应绑定 three-kingdoms 版本标识');
assert.match(portal, /吞食天地Ⅱ/, '首页应显示三国游戏标题');
assert.match(portal, /data-game-version=["']three-kingdoms["']>v0\.2\.0 开发版<\/span>/, '三国游戏卡应显示开发版 fallback');
assert.match(portal, /fetch\(['"]\.\/game-catalog\.json['"],\s*\{\s*cache:\s*['"]no-store['"]\s*\}\)/, '首页应从游戏目录动态读取版本');
assert.match(portal, /catalog\.games[\s\S]*find\(\(entry\) => entry\.id === slot\.dataset\.gameVersion\)/, '首页应按游戏 ID 查找目录版本');
assert.match(portal, /slot\.textContent = `\$\{game\.version\} \$\{game\.status \|\| ['"]['"]\}`\.trim\(\)/, '首页应使用目录版本覆盖卡片 fallback');
assert.ok(fs.existsSync(path.join(root, '..', '坦克大战', 'tank-battle.html')), '坦克大战新入口文件必须存在');
assert.match(read('../坦克大战/tank-battle.html'), /钢铁防线.*坦克大战/, '坦克大战新入口应保留游戏页面');
assert.match(portal, /赞助商：llapi\.org/, '首页应显示赞助商名称');
assert.match(portal, /博主自用推荐！好的灵感需要低价稳定的 Token 支持，API 中转服务选它就对了。/, '首页应显示博主自用赞助推荐文案');
assert.match(portal, /href=["']https:\/\/llapi\.org\/?["'][^>]*target=["']_blank["'][^>]*rel=["'][^"']*sponsored[^"']*noopener[^"']*noreferrer/, '赞助商链接应安全地新窗口打开并标记为 sponsored');
assert.match(portal, /博主自用推荐！好的灵感需要低价稳定的 Token 支持，API 中转服务选它就对了。<a class=["']sponsor-direct["'][^>]*>点击直达<\/a>/, '赞助文案后应显示点击直达');
assert.match(portal, /class=["']sponsor-direct["'][^>]*href=["']https:\/\/llapi\.org\/?["'][^>]*target=["']_blank["']/, '点击直达应链接到 llapi.org 并新窗口打开');
assert.match(portal, /关于博主 \/ About Me/, '首页应显示博主介绍模块');
assert.match(portal, /AI 博主，对 AI 和互联网的事、科技圈的事都挺感兴趣/, '首页应显示博主介绍文案');
assert.match(portal, /QQ 兴趣群组/, '首页应显示 QQ 兴趣群组入口');
assert.match(portal, /1103418249/, '首页应显示 QQ 群号方便复制');
assert.ok(fs.existsSync(path.join(root, 'qq-group-qrcode.jpg')), 'QQ 群二维码图片必须存在');
assert.match(portal, /src=["']qq-group-qrcode\.jpg["']/, '首页应引用 QQ 群二维码图片');
assert.match(portal, /href=["']https:\/\/t\.me\/\+uBlnbTJGnXRkMWFk["']/, '首页应提供 Telegram 群组链接');
assert.match(portal, /玩过游戏后有什么创意灵感、功能建议、Bug 反馈，或者想一起共创更多有趣的项目/, '首页应说明加入社群的理由');

console.log('Game center entry checks passed.');
