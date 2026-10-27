# 创意空间 / Creative Space

「创意空间」是把多个独立创意收纳在同一个项目里的地方：每个创意一个文件夹，文件夹名就是创意名，该创意的所有文件都放在它自己的文件夹里。

> 本项目**不再叫 "Claude Code 坦克大战"**，也不是单纯的坦克大战项目。详细的组织规则见 [AGENTS.md](AGENTS.md)。

目前收纳的创意：

- **创意空间首页** [`创意空间首页/`](创意空间首页/)：GitHub Pages 起始页 / 游戏中心，汇总所有入口、版本目录、粉丝资源展示与在线分发。以后所有主页改动都放这个文件夹。
- **坦克大战** [`坦克大战/`](坦克大战/)：经典即时战斗网页游戏，单文件 Canvas 与本地 Blender 图集，关卡推进、敌方 AI、触屏与火力升级。当前标签 `v1.6.12`。
- **吞食天地三国** [`吞食天地三国/`](吞食天地三国/)：基于原版数据的三国 RPG 网页复刻，553 张地图、60+ 武将；当前标签 `v0.3.1`，后续章节持续验证中。
- **超级玛丽** [`超级玛丽/`](超级玛丽/)：原创素材的经典横版跳跃游戏实验，分片源码 + 构建脚本。
- **墨水屏小站** [`墨水屏小站/`](墨水屏小站/)：把闲置 Kindle 墨水屏变成信息屏（时钟、天气、番茄钟、阅读清单），兼容老 WebKit，当前 `v0.4.1`。
- **Mac 软件资源库** [`Mac软件资源库/`](Mac软件资源库/)：与坦克大战等项目并列的独立资源库，维护 71 个 Mac 软件的官方入口、Homebrew 命令与对应夸克资料文件。
- **粉丝资源** [`粉丝资源/`](粉丝资源/)：独立维护 6 条视频资源与长资料页（网址、模板、口令），首页只做展示联动；旧 Mac 软件资源库地址仅保留跳转。

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
- `scripts/`：跨项目测试、静态发布打包、本地预览与浏览器验收。
- `docs/`：项目级共享文档（如 `PROGRESS-SUMMARY.md`、`项目状态.md` 台账）。
- `README.md` / `文件夹说明.md` / `AGENTS.md` / `项目关系与GitHub推送.md` / `Codex重装交接指南.md`（重装 Codex 后先读）。
- `更新记录.md`：创意空间本地总更新记录，仅存本地、不推送 GitHub。

每个分支项目（创意空间首页 / 坦克大战 / 吞食天地三国 / 超级玛丽 / 墨水屏小站 / Mac 软件资源库 / 粉丝资源）各自维护 `更新记录.md` 与 `历史版本/`，跟随仓库上传。

## 在线试玩

GitHub Pages 从 `main` 分支构建部署，原有二维码地址现在是创意空间游戏中心：

<https://sunsharebay-lgtm.github.io/TK/>

根地址会自动跳到首页项目，也可以直接打开首页或各玩法：

- 首页（游戏中心）：<https://sunsharebay-lgtm.github.io/TK/创意空间首页/>
- 坦克大战：<https://sunsharebay-lgtm.github.io/TK/坦克大战/tank-battle.html>
- 三国 RPG：<https://sunsharebay-lgtm.github.io/TK/吞食天地三国/>
- 超级玛丽：<https://sunsharebay-lgtm.github.io/TK/超级玛丽/>
- 墨水屏小站：<https://sunsharebay-lgtm.github.io/TK/墨水屏小站/>
- Mac 软件资源库：<https://sunsharebay-lgtm.github.io/TK/Mac软件资源库/>
- 粉丝资源：<https://sunsharebay-lgtm.github.io/TK/粉丝资源/>

## 运行方式

首页、资源列表和三国网页复刻需要通过 HTTP 读取 JSON/素材，统一使用：

```sh
node scripts/serve-site.cjs . 8123
# 打开 http://127.0.0.1:8123/
```

坦克大战和超级玛丽还支持直接打开 HTML。三国的历史单文件版与当前网页复刻版分别测试，不混用验收结论。

## 稳定版本标签

游戏中心的版本号由 Git 稳定版本标签自动生成，不需要手动改首页。每款游戏使用独立的 namespaced tag：

- 坦克大战：`game/tank-battle/vX.Y.Z`
- 三国 RPG：`game/three-kingdoms/vX.Y.Z`
- 超级玛丽：`game/super-mario/vX.Y.Z`
- 墨水屏小站：`game/idle-screen/vX.Y.Z`
- 创意空间首页：`site/home/vX.Y.Z`
- Mac 软件资源库：`resource/mac-software-library/vX.Y.Z`
- 粉丝资源：`content/fan-resources/vX.Y.Z`

`创意空间首页/scripts/generate-game-catalog.cjs` 会在 `main` 部署时读取当前提交可达的 namespace 标签，取最高稳定语义版本写入 `创意空间首页/game-catalog.json`；没有匹配标签时保留卡片 fallback。未合并分支或未来提交的标签不会污染当前版本。标签只记录版本，不单独触发部署。

## 验证与恢复

- `node scripts/check-all.cjs`：运行各子项目的 Node 回归；设置 `TEST_PYTHON` 为装有 Pillow 的 Python 路径可加图集像素检查。
- 发布前生成目录和部署标记，运行 `node scripts/build-site.cjs`、`node 创意空间首页/测试/site_package_test.cjs`；`.site/` 是可删除的生成目录，不进 Git。
- CI 使用 Node 24、Python 3.12、Pillow；所有测试通过才打包。Pages 只上传 `.site/` 的运行文件，保持现有网址，排除历史版本、文档、测试与原生实验代码。
- 浏览器验证用 `scripts/browser-smoke.cjs`（Playwright + Chrome）；三国完整场景用 `吞食天地三国/测试/tools/regress.mjs`，详见项目手册。
- 2026-10-26 全项目审查结果、测试边界与源文件校验见 [审查记录](docs/审查/2026-10-26/project.md)。本轮变更纳入 [2026-10-27 统一发布](docs/发布/2026-10-27/project.md)；原有未提交内容保留，部署结果以 Actions 与线上标记为准。
