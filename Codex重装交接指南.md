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
- 本机运行环境：macOS，Node `v26.7.0`；多数测试用 `node` 运行。
- 本地预览：`cd "/Users/sun/Desktop/AI/创意空间" && python3 -m http.server 8123 --bind 127.0.0.1`，再访问 `http://127.0.0.1:8123/创意空间首页/`。

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
├── docs/                      # 项目级共享文档
├── 创意空间首页/              # 创意：首页 / 游戏中心
├── 坦克大战/                  # 创意：坦克大战
├── 吞食天地三国/              # 创意：三国 RPG 网页复刻
├── 超级玛丽/                  # 创意：超级玛丽
├── 墨水屏小站/                # 创意：墨水屏小站（Kindle 墨水屏信息屏）
└── 粉丝资源/                  # 创意：粉丝资源（视频资料/详情页）
```

## 4. 核心规则（必须遵守）

1. **一个创意一个文件夹**，文件夹名 = 创意名；该创意的所有文件都放进去。
2. 每个创意项目都有 `更新记录.md` 和 `历史版本/`，随仓库上传；有新版本时在本项目 `更新记录.md` 末尾追加并把上一版源码归档到本项目 `历史版本/`。
3. 新创意 → 在根目录新建同名文件夹，之后所有产物都放进去。
4. 首页改动只改 `创意空间首页/index.html`；根目录 `index.html` 只是跳转占位。
5. 根目录 `更新记录.md` 是**本地总记录**，已被 `.gitignore`（`/更新记录.md`）排除，**不推 GitHub**；不要 `git add -A` 后误提交它。
6. 改动推送到 `main` 会自动触发 GitHub Pages 重新部署；各子项目用各自 namespace 标签发布。
7. 每个子项目都是独立 Codex 本地项目，边界只在本文件夹，完整注册路径见第 6 节。

完整规则见 [AGENTS.md](AGENTS.md)。

## 5. 各项目怎么继续工作

### 5.1 创意空间首页 `创意空间首页/`

- 主文件：`index.html`（真实首页 / 游戏中心）。
- 版本目录：`game-catalog.json`、`game-catalog.template.json`、`scripts/generate-game-catalog.cjs`。
- 粉丝资源展示：首页读取 `../粉丝资源/resources.json`（数据与详情页由粉丝资源项目维护），资源卡详情链接拼接 `../粉丝资源/` 前缀。
- 测试：`测试/game_center_test.js`、`测试/version_catalog_test.js`；资源数据校验在 `粉丝资源/测试/resources_test.js`。
- 工作机制：首页从 `game-catalog.json` 动态渲染游戏卡片；版本号由各项目 Git 标签自动生成，卡片数量 = 目录条目数。
- 改首页只改这里；新增创意要上线，往 `game-catalog.template.json` 的 `games` 数组加一条（含 `id`、`title`、`url`、`tagNamespace`、fallback 版本等）。
- 运行测试：`node 创意空间首页/测试/game_center_test.js && node 创意空间首页/测试/version_catalog_test.js && node 粉丝资源/测试/resources_test.js`
- 重新生成目录：`node 创意空间首页/scripts/generate-game-catalog.cjs`

### 5.2 坦克大战 `坦克大战/`

- 主文件：`tank-battle.html`（单文件 Canvas，当前稳定版 `v1.6.1`）。
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

### 5.6 粉丝资源 `粉丝资源/`

- 数据源：`resources.json`，手动维护；每条使用固定两位 `number`，必须提供 `detailUrl`。
- 长资料独立页：`资源/<资料名>/`；当前资源为 `资源/giffgaff保命资料/`。
- 独立入口：`index.html`；首页读取本项目的 `resources.json` 做展示联动。
- 测试：`测试/resources_test.js`。
- 运行：`node 粉丝资源/测试/resources_test.js`
- 发布里程碑标签 `content/fan-resources/vX.Y.Z`。

## 6. 架构与联动

- GitHub Pages 从仓库根目录发布整站。
- 根 `index.html` → 自动跳 `创意空间首页/`。
- 首页卡片：版本号从 `game-catalog.json` 读；`game-catalog.json` 由生成脚本从 Git 标签生成（`game/<id>/vX.Y.Z`）。
- 部署工作流 `.github/workflows/pages.yml`：推送 `main` 或 `game/**/v*`、`site/**/v*`、`content/**/v*` 标签时运行生成脚本并部署。
- 标签规范：坦克大战 `game/tank-battle/vX.Y.Z`；三国 RPG `game/three-kingdoms/vX.Y.Z`；超级玛丽 `game/super-mario/vX.Y.Z`；墨水屏小站 `game/idle-screen/vX.Y.Z`；创意空间首页 `site/home/vX.Y.Z`；粉丝资源 `content/fan-resources/vX.Y.Z`。不要创建全局旧式标签。
- 定时汇报：`创意空间周报`（每周一 09:00）读取各子项目并更新 `docs/项目状态.md`；`总项目月报`（每月 1 日 09:00）汇总 `/Users/sun/Desktop/AI` 下所有项目。配置在 `~/.codex/automations/`。

## 6.5 Codex 平级项目注册清单

以下文件夹可在 Codex 中注册为独立本地项目，命名建议带「创意空间·」前缀：

- 创意空间·首页：`/Users/sun/Desktop/AI/创意空间/创意空间首页`
- 创意空间·坦克大战：`/Users/sun/Desktop/AI/创意空间/坦克大战`
- 创意空间·三国：`/Users/sun/Desktop/AI/创意空间/吞食天地三国`
- 创意空间·超级玛丽：`/Users/sun/Desktop/AI/创意空间/超级玛丽`
- 创意空间·墨水屏小站：`/Users/sun/Desktop/AI/创意空间/墨水屏小站`
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

推 `main` 或标签都会自动部署。各项目自己的 `更新记录.md` 和 `历史版本/` 会一起推送；根目录 `更新记录.md` 不会。

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
