# Codex 重装交接指南 · 创意空间

> 本文档是「创意空间」项目面向 **Codex 重装后恢复工作** 的总交接文档。
> 重装完成后，**先读本文档**，再读 [AGENTS.md](AGENTS.md)、[README.md](README.md)、[文件夹说明.md](文件夹说明.md)、[项目关系与GitHub推送.md](项目关系与GitHub推送.md)。
> 本文件会随项目结构变化、经验积累持续更新（见文末「维护」）。

## 1. 一句话定位

「创意空间」（Creative Space，旧名「Claude Code 坦克大战」）是一个 **Git 仓库 + GitHub Pages 网站**，里面按「一个创意一个文件夹」收纳了多个独立项目（游戏 / 工具 / 起始页）。

## 2. 关键事实（重装后必须核对）

- 项目实际路径：`/Users/sun/Desktop/AI/创意空间`
- 旧路径 `/Users/sun/Desktop/pgcs/Claude Code坦克大战` **已不存在**，不要再用。
- 远程仓库：`https://github.com/sunsharebay-lgtm/TK.git`（`origin`，默认分支 `main`）。
- GitHub Pages 地址：`https://sunsharebay-lgtm.github.io/TK/`
  - 根地址是跳转页，自动跳到 `创意空间首页/`。
  - 首页直达：`https://sunsharebay-lgtm.github.io/TK/创意空间首页/`
- 本机运行环境：macOS，本轮 Node `v24.20.0`（CI 固定 24）；多数测试用 `node` 运行。
- 本地预览：`cd "/Users/sun/Desktop/AI/创意空间" && node scripts/serve-site.cjs . 8123`，再访问 `http://127.0.0.1:8123/创意空间首页/`。

## 3. 目录结构速览

```text
创意空间/
├── AGENTS.md                  # 项目规则（最高规则，工作前必读）
├── README.md                  # 项目总览
├── 文件夹说明.md              # 目录与文件用途
├── 更新记录.md                # 本地总更新记录（仅本地，不推 GitHub，.gitignore 排除）
├── 项目关系与GitHub推送.md     # 项目关系 + 推送/发版方法
├── Codex重装交接指南.md         # 本文件
├── index.html                 # 根部署跳转页（勿当首页改）
├── .github/workflows/pages.yml# Pages 部署工作流
├── scripts/                   # 全项目检查、打包、本地预览与浏览器验收
├── docs/                      # 项目级共享文档
├── 创意空间首页/              # 创意：首页 / 游戏中心
├── 坦克大战/                  # 创意：坦克大战
├── 吞食天地三国/              # 创意：三国 RPG 网页复刻
├── 超级玛丽/                  # 创意：超级玛丽
├── 墨水屏小站/                # 创意：墨水屏小站（Kindle 墨水屏信息屏）
├── Mac软件资源库/              # 创意：Mac 软件资源库（独立平级资源库）
└── 粉丝资源/                  # 创意：粉丝资源（视频资料/详情页）
```

## 4. 核心规则（必须遵守）

1. **一个创意一个文件夹**，文件夹名 = 创意名；该创意的所有文件都放进去。
2. 每个创意项目都有 `更新记录.md` 和 `历史版本/`，随仓库上传；有新版本时在本项目 `更新记录.md` 末尾追加并把上一版源码归档到本项目 `历史版本/`。
3. 新创意 → 在根目录新建同名文件夹，之后所有产物都放进去。
4. 首页改动只改 `创意空间首页/index.html`；根目录 `index.html` 只是跳转占位。
5. 根目录 `更新记录.md` 是**本地总记录**，已被 `.gitignore`（`/更新记录.md`）排除，**不推 GitHub**；不要 `git add -A` 后误提交它。
6. 改动推送到 `main` 会自动触发 GitHub Pages 重新部署；各子项目用各自 namespace 标签记录发布版本，标签本身不触发部署。
7. 每个子项目都是独立 Codex 本地项目，边界只在本文件夹，完整注册路径见第 6 节。

完整规则见 [AGENTS.md](AGENTS.md)。

## 5. 各项目怎么继续工作

### 5.1 创意空间首页 `创意空间首页/`

- 主文件：`index.html`（真实首页 / 游戏中心）。
- 版本目录：`game-catalog.json`、`game-catalog.template.json`、`scripts/generate-game-catalog.cjs`。
- 粉丝资源展示：首页读取 `../粉丝资源/resources.json`（数据与详情页由粉丝资源项目维护），资源卡详情链接拼接 `../粉丝资源/` 前缀。
- 测试：`测试/game_center_test.js`、`测试/version_catalog_test.js`；资源数据校验在 `粉丝资源/测试/resources_test.js`，Mac 软件资源库专项校验在 `Mac软件资源库/测试/software_resources_test.js`。
- 工作机制：首页从 `game-catalog.json` 动态渲染游戏卡片；版本号由各项目 Git 标签自动生成，卡片数量 = 目录条目数。
- 改首页只改这里；新增创意要上线，往 `game-catalog.template.json` 的 `games` 数组加一条（含 `id`、`title`、`url`、`tagNamespace`、fallback 版本等）。
- 运行测试：`node 创意空间首页/测试/game_center_test.js && node 创意空间首页/测试/version_catalog_test.js && node 粉丝资源/测试/resources_test.js && node Mac软件资源库/测试/software_resources_test.js`
- 重新生成目录：`node 创意空间首页/scripts/generate-game-catalog.cjs`

### 5.2 坦克大战 `坦克大战/`

- 主文件：`tank-battle.html`（单文件 Canvas + 本地图集，当前标签 `v1.6.12`）。
- `坦克大战.html`：旧中文入口兼容跳转。
- 测试：`坦克大战/测试/`（`smoke_test.js`、`validate_maps.js` 等，多数传入 `tank-battle.html` 路径运行）。
- 冒烟测试示例：`node 坦克大战/测试/smoke_test.js 坦克大战/tank-battle.html`

### 5.3 吞食天地三国 `吞食天地三国/`

- 当前主推进：**网页复刻**，目录 `吞食天地三国/网页复刻/吞食天地Ⅱ同人复刻-网页版/`（完整 MZ 兼容引擎，分片源码 + 文档）。
- `吞食天地三国/index.html`：入口跳转页，直达网页复刻版。
- `three-kingdoms.html`：早期 FC 风单文件版（历史保留，不再作为在线主入口）。
- 文档/交接：`吞食天地三国/网页复刻/吞食天地Ⅱ同人复刻-网页版/docs/HANDOFF-TAKEOVER.md`、该目录 `README.md`。
- 测试：`吞食天地三国/测试/three_kingdoms_smoke.js`、`three_kingdoms_test.js`。
- 冒烟/回归示例：`node 吞食天地三国/测试/three_kingdoms_smoke.js`、`node 吞食天地三国/测试/three_kingdoms_test.js`
- 最近进展：见 `git log` 与网页复刻的 HANDOFF 文档（菜单、行走动画、八槽装备、伤害下限等）。

### 5.4 超级玛丽 `超级玛丽/`

- 主文件：`index.html`（构建产物），源码在 `src/`，构建脚本 `build.sh`。
- 测试：`test/harness.js`（无头测试）。
- 运行：`node 超级玛丽/test/harness.js`
- 入口：`超级玛丽/index.html`

### 5.5 墨水屏小站 `墨水屏小站/`

- 主文件：`index.html`（单文件，Kindle 墨水屏信息屏；ES5 / 老 WebKit 兼容）。
- 测试：`测试/smoke_test.js`（入口、ES5 约束、版本号）。
- 运行：`node 墨水屏小站/测试/smoke_test.js`
- 入口：`墨水屏小站/index.html`；发布标签 `game/idle-screen/vX.Y.Z`。

### 5.6 Mac 软件资源库 `Mac软件资源库/`

- 独立平级项目：2026-09-10 从 `粉丝资源/资源/Mac软件资源库/` 迁出；首页通过 `RESOURCE 005` 卡片直达 `../Mac软件资源库/`。
- 数据源：`software-resources.json`，当前 71 个软件、11 个用途分类；页面入口为 `index.html`。
- 测试：`测试/software_resources_test.js`；运行：`node Mac软件资源库/测试/software_resources_test.js`。
- 发布标签 `resource/mac-software-library/vX.Y.Z`。

### 5.7 粉丝资源 `粉丝资源/`

- 数据源：`resources.json`，手动维护；每条使用固定两位 `number`，必须提供 `detailUrl`。
- 长资料独立页：`资源/<资料名>/`；当前保留五条粉丝资源，Mac 软件资源库已迁出，不得重新放入此目录。
- 独立入口：`index.html`；首页读取本项目的 `resources.json` 做展示联动。
- 测试：`测试/resources_test.js`。
- 运行：`node 粉丝资源/测试/resources_test.js`
- 发布里程碑标签 `content/fan-resources/vX.Y.Z`。

## 6. 架构与联动

- GitHub Pages 从 `scripts/build-site.cjs` 生成的 `.site/` 发布运行文件，保留原有网址结构；不发布历史版本、测试、开发文档和原生实验代码。
- 根 `index.html` → 自动跳 `创意空间首页/`。
- 首页卡片：版本号从 `game-catalog.json` 读；`game-catalog.json` 由生成脚本从 Git 标签生成（`game/<id>/vX.Y.Z` 或 `resource/<id>/vX.Y.Z`）。
- 部署工作流 `.github/workflows/pages.yml`：只响应 `main` 推送和手动触发；生成目录、写入部署版本标记，并在 Pages 部署后执行线上验收。
- 标签规范：坦克大战 `game/tank-battle/vX.Y.Z`；三国 RPG `game/three-kingdoms/vX.Y.Z`；超级玛丽 `game/super-mario/vX.Y.Z`；墨水屏小站 `game/idle-screen/vX.Y.Z`；创意空间首页 `site/home/vX.Y.Z`；Mac 软件资源库 `resource/mac-software-library/vX.Y.Z`；粉丝资源 `content/fan-resources/vX.Y.Z`。标签只记录版本，部署统一由 `main` 触发。不要创建全局旧式标签。
- 定时汇报：`创意空间周报`（每周一 09:00）读取各子项目并更新 `docs/项目状态.md`；`总项目月报`（每月 1 日 09:00）汇总 `/Users/sun/Desktop/AI` 下所有项目。配置在 `~/.codex/automations/`。

## 6.5 Codex 平级项目注册清单

以下文件夹可在 Codex 中注册为独立本地项目，命名建议带「创意空间·」前缀：

- 创意空间·首页：`/Users/sun/Desktop/AI/创意空间/创意空间首页`
- 创意空间·坦克大战：`/Users/sun/Desktop/AI/创意空间/坦克大战`
- 创意空间·三国：`/Users/sun/Desktop/AI/创意空间/吞食天地三国`
- 创意空间·超级玛丽：`/Users/sun/Desktop/AI/创意空间/超级玛丽`
- 创意空间·墨水屏小站：`/Users/sun/Desktop/AI/创意空间/墨水屏小站`
- 创意空间·Mac 软件资源库：`/Users/sun/Desktop/AI/创意空间/Mac软件资源库`
- 创意空间·粉丝资源：`/Users/sun/Desktop/AI/创意空间/粉丝资源`

每个子项目只在自己的文件夹开会话；总协调、跨项目建议和首页联动在创意空间任务里做；总项目（集团）位于 `/Users/sun/Desktop/AI`。

## 7. 推送 / 发版

```bash
cd "/Users/sun/Desktop/AI/创意空间"
git add -A
git commit -m "描述这次改动"
git push origin main
```

发布稳定版（示例，三国）：

```bash
git tag game/three-kingdoms/v1.0.0
git push origin game/three-kingdoms/v1.0.0
```

只有推 `main` 或手动触发才会部署；标签只作为版本记录。部署后必须通过线上验收。各项目自己的 `更新记录.md` 和 `历史版本/` 会一起推送；根目录 `更新记录.md` 不会。

## 8. 重装 Codex 后的第一步

1. 打开项目：`cd "/Users/sun/Desktop/AI/创意空间"`
2. 读本文件 → 读 `AGENTS.md` → 读 `README.md` / `文件夹说明.md` / `项目关系与GitHub推送.md`。
3. 核对远程与分支：`git remote -v`、`git status --short --branch`、`git log --oneline -5`。
4. 跑一遍关键测试（见第 5、6 节），确认环境正常。
5. 看一下根目录 `更新记录.md`（本地）了解最近发生了什么，再决定下一步任务。

## 9. 维护

**只要发生以下任一情况，就更新本文件**（并同步 `AGENTS.md` / `README.md` / `文件夹说明.md` / `项目关系与GitHub推送.md`）：

- 项目路径、远程地址、默认分支或部署方式变化。
- 新增 / 改名 / 移除某个创意文件夹。
- 某个项目的主入口、架构或技术栈变化。
- 踩坑经验、环境依赖变化（如 Node 版本、新增依赖、测试命令变化）。
- 任何「重装后不读文档就不知道」的事实。

经验或结构变化要**随时记录**，不要在本地积累太久才写。

## 10. 2026-10-26 审查后的恢复要点

- 先读 `docs/审查/2026-10-26/project.md`，其中区分本次修复、既有未提交内容、QA 结果和仍需用户/设备核实的边界。本次未提交、推送或打新标签。
- 一键回归：`node scripts/check-all.cjs`；设置 `TEST_PYTHON` 可运行图集像素检查。系统 Python 本轮缺 Pillow；已使用 Codex 自带 Python 3.12.14 / Pillow 12.3.0 验证，恢复时重新发现运行时路径，不假定缓存目录恒定。
- 三国的 327/78 项旧测试只覆盖 `three-kingdoms.html`。现行引擎应跑 `current_engine_test.js`、`snapshot_recovery_test.js` 和 `测试/tools/regress.mjs` 的 62 个浏览器场景。
- 三国浏览器回归：在仓库根执行 `node scripts/serve-site.cjs 吞食天地三国/网页复刻/吞食天地Ⅱ同人复刻-网页版 8642`，另一终端执行 `node 吞食天地三国/测试/tools/regress.mjs --jobs 2`。需要 Chrome（可设 `CHROME_PATH`）。驱动使用临时独立端口和浏览器配置，不结束其他 Chrome 进程。不要用小连接队列的服务并发跑场景；本轮 Python http.server 出现过脚本请求重置。
- 七项目浏览器验收：安装/发现 Playwright，运行 `node scripts/browser-smoke.cjs http://127.0.0.1:8123/`；如使用 Codex 自带包，通过 `NODE_PATH` 提供工具返回的 node_modules 路径。天气接口在此测试中模拟；不代表外网天气可用或 Kindle 真机验证。
- `.site/` 可随时由生成目录、部署标记和 `scripts/build-site.cjs` 重建。部署前 `site_package_test.cjs` 验证文件大小写与引用；新增运行文件需同步打包清单。
- Native Kindle 测试在 `墨水屏小站/原生版/墨屏小站原生测试/测试/`；启动恢复用 shell fixture，坐标回放使用 Python `lupa` 运行实际 Lua。临时 Python 包在 `.artifacts/`，不随 Git/Pages 发布；真机需重新验证后再安装。
- Mac 旧地址 `粉丝资源/资源/Mac软件资源库/` 只保留兼容跳转，不恢复原编号。详情页复制共用 `粉丝资源/scripts/copy.js`，必须随详情页部署。
- 版本目录只使用当前 HEAD 可达的稳定标签，避免未合并分支/未来标签污染。`main` 手动发布限制与测试门禁均已写入工作流，但本轮没有执行 GitHub Actions 新部署。
- 本轮恢复增量在 `/Users/sun/Desktop/AI/Codex恢复备份/2026-10-26-创意空间-review/`；它不是完整 Codex 安装备份。

## 11. 坦克大战 v1.6.13 源码审查修复

- 坦克大战本轮完整修复与 27 个专项行为场景见 `坦克大战/测试/源码审查-2026-10-27.md`；交付与源文件哈希见该项目 `project.md` 最新发布章节。
- 关卡级存档保留原存储键，内部 schema 3 向后兼容旧玩家数组与地狱进度。不要按旧 schema 2 重新实现结算恢复，否则会恢复已修复的通关重打与区域错配问题。
- 子项目一键回归 `node 坦克大战/测试/run_all.cjs`；浏览器回归 `node 坦克大战/测试/browser_audit_test.cjs`，需要 Playwright/Chrome，可通过 `PLAYWRIGHT_MODULE` 指定依赖；脚本自行启动并关闭临时 HTTP 服务。
- 截图与带源码 SHA-256 的机器报告在项目测试的 `.artifacts/`（忽略）。系统 Python 无 Pillow 时先发现 Codex 自带 Python，不要依赖固定缓存路径或改动系统环境。
- 发布标签为 `game/tank-battle/v1.6.13`，前一线上源码在 `坦克大战/历史版本/坦克大战-v1.6.12.html`；部署仍由 `main` 唯一触发。手机视口模拟通过不等于真机性能验收。
