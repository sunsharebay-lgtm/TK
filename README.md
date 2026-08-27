# 创意空间 / Creative Space

「创意空间」是把多个独立创意收纳在同一个项目里的地方：每个创意一个文件夹，文件夹名就是创意名，该创意的所有文件都放在它自己的文件夹里。

> 本项目**不再叫 "Claude Code 坦克大战"**，也不是单纯的坦克大战项目。详细的组织规则见 [AGENTS.md](AGENTS.md)。

目前收纳的创意：

- **创意空间首页** [`创意空间首页/`](创意空间首页/)：GitHub Pages 起始页 / 游戏中心，汇总所有入口、版本目录、粉丝资源展示与在线分发。以后所有主页改动都放这个文件夹。
- **坦克大战** [`坦克大战/`](坦克大战/)：经典即时战斗网页游戏，单文件 Canvas，关卡推进、敌方 AI、触屏与火力升级。当前稳定版 `v1.6.1`。
- **吞食天地三国** [`吞食天地三国/`](吞食天地三国/)：基于原版数据复刻的完整三国 RPG（网页复刻），553 张地图、60+ 武将、侧视战斗与完整剧情事件；当前推进中 `v0.2.0`。
- **超级玛丽** [`超级玛丽/`](超级玛丽/)：原创素材的经典横版跳跃游戏实验，分片源码 + 构建脚本。
- **墨水屏小站** [`墨水屏小站/`](墨水屏小站/)：把闲置 Kindle 墨水屏变成信息屏（时钟、天气、番茄钟、阅读清单），兼容老 WebKit，当前 `v0.4.0`。
- **粉丝资源** [`粉丝资源/`](粉丝资源/)：独立维护视频资源数据与长资料页（网址、模板、口令），首页只做展示联动。

## 核心原则

1. 每个创意一个文件夹，文件夹名 = 创意名。
2. 该创意的源码、素材、文档、测试、历史版本全部放进它自己的文件夹。
3. 新创意 → 在根目录新建同名文件夹，之后所有产物都放进去。
4. 根目录只保留创意空间这个舞台所需要的共享设施。

任何在本项目工作的人都必须遵守 [AGENTS.md](AGENTS.md)。

各项目之间的关系与 GitHub 推送 / 发版方法，见 [项目关系与GitHub推送.md](项目关系与GitHub推送.md)。

## 根目录共享设施

- `index.html`：根部署跳转页，自动跳到 `创意空间首页/`（只是占位，不改内容）。
- `.github/`：GitHub Actions 部署工作流。
- `docs/`：项目级共享文档（如 `PROGRESS-SUMMARY.md`、`项目状态.md` 台账）。
- `README.md` / `文件夹说明.md` / `AGENTS.md` / `项目关系与GitHub推送.md` / `Codex重装交接指南.md`（重装 Codex 后先读）。
- `更新记录.md`：创意空间本地总更新记录，仅存本地、不推送 GitHub。

每个分支项目（创意空间首页 / 坦克大战 / 吞食天地三国 / 超级玛丽 / 墨水屏小站 / 粉丝资源）各自维护 `更新记录.md` 与 `历史版本/`，跟随仓库上传。

## 在线试玩

GitHub Pages 会自动部署到 `main` 分支，原有二维码地址现在是创意空间游戏中心：

<https://sunsharebay-lgtm.github.io/TK/>

根地址会自动跳到首页项目，也可以直接打开首页或各玩法：

- 首页（游戏中心）：<https://sunsharebay-lgtm.github.io/TK/创意空间首页/>
- 坦克大战：<https://sunsharebay-lgtm.github.io/TK/坦克大战/tank-battle.html>
- 三国 RPG：<https://sunsharebay-lgtm.github.io/TK/吞食天地三国/>
- 超级玛丽：<https://sunsharebay-lgtm.github.io/TK/超级玛丽/>
- 墨水屏小站：<https://sunsharebay-lgtm.github.io/TK/墨水屏小站/>
- 粉丝资源：<https://sunsharebay-lgtm.github.io/TK/粉丝资源/>

## 运行方式

直接用现代浏览器打开各创意文件夹里的页面即可游玩；打开 `创意空间首页/index.html` 进入创意空间游戏中心。

## 稳定版本标签

游戏中心的版本号由 Git 稳定版本标签自动生成，不需要手动改首页。每款游戏使用独立的 namespaced tag：

- 坦克大战：`game/tank-battle/vX.Y.Z`
- 三国 RPG：`game/three-kingdoms/vX.Y.Z`
- 超级玛丽：`game/super-mario/vX.Y.Z`
- 墨水屏小站：`game/idle-screen/vX.Y.Z`
- 创意空间首页：`site/home/vX.Y.Z`
- 粉丝资源：`content/fan-resources/vX.Y.Z`

`创意空间首页/scripts/generate-game-catalog.cjs` 会读取每个 namespace 下的最高稳定语义版本并写入 `创意空间首页/game-catalog.json`；没有匹配标签时保留卡片 fallback。普通代码、文档或测试提交不会被当作游戏新版本，也不需要创建旧式全局标签。
