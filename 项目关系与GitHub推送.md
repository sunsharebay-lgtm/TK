# 创意空间 · 项目关系与 GitHub 推送指南

> 本文档随时维护，用来记录「创意空间」里各个项目（创意）之间的关系，以及如何把改动推送到 GitHub、触发线上更新。改动本文档时保持与 [AGENTS.md](AGENTS.md) 和 [文件夹说明.md](文件夹说明.md) 一致。

## 1. 各项目一览

「创意空间」是一个仓库，里面按创意拆成多个独立项目文件夹，外加一个收纳它们的根「舞台」。

| 项目 | 文件夹 | 说明 |
| --- | --- | --- |
| 创意空间首页 | `创意空间首页/` | GitHub Pages 起始页 / 游戏中心，负责汇总入口、版本目录与在线分发 |
| 坦克大战 | `坦克大战/` | 网页版坦克大战游戏，单文件 Canvas |
| 吞食天地三国 | `吞食天地三国/` | 三国 RPG 网页复刻（入口跳转到网页复刻引擎版），素材/文档/测试独立归档 |
| 超级像素兄弟 | `超级像素兄弟/` | 像素平台跳跃游戏，分片源码 |
| 舞台（共享设施） | 根目录 | `.github/`、`scripts` 归属首页、`docs/`、规则与说明文档、根跳转页 |

每个项目的开发约定：**一个创意一个文件夹，所有该创意的文件都放进对应文件夹**。详见 [AGENTS.md](AGENTS.md)。

## 2. 项目之间的关系

- `创意空间首页` 是**总入口**（游戏中心 / GitHub Pages 起始页），它用卡片链接到 `坦克大战`、`吞食天地三国` 等项目页面。
- 各游戏项目**互相独立**，互不依赖，各自拥有源码、测试、素材与历史版本。
- 首页通过 `创意空间首页/game-catalog.json` 动态显示各游戏的最新稳定版本号；版本号来自 Git 标签，不是手写。
- 生成版本目录的脚本 `创意空间首页/scripts/generate-game-catalog.cjs` 属于首页项目。
- 部署工作流 `.github/workflows/pages.yml` 属于整个创意空间（部署整仓库到 GitHub Pages）。

## 3. 在线部署结构

GitHub Pages 从**仓库根目录**发布整站，所以网址结构如下：

```text
https://sunsharebay-lgtm.github.io/TK/
    ├── index.html          # 根跳转页（自动跳到创意空间首页，不要当首页改）
    └── 创意空间首页/        # 真正的首页 / 游戏中心
        ├── index.html
        ├── game-catalog.json
        ├── game-catalog.template.json
        └── scripts/generate-game-catalog.cjs
    ├── 坦克大战/tank-battle.html
    ├── 吞食天地三国/（入口跳转到 网页复刻/吞食天地Ⅱ同人复刻-网页版/）
    └── 超级像素兄弟/index.html
```

注意：根目录的 `index.html` 只是一个**跳转占位页**，用于保持旧地址 `/TK/` 可用。以后修改首页请改 `创意空间首页/index.html`，不要改根目录那个跳转页。

## 4. 如何推送 / 更新线上

### 4.1 普通改动（首页、游戏、文档）

1. 在对应项目文件夹里完成修改。
2. 提交并推送到 `main` 分支：

   ```bash
   cd "/Users/sun/Desktop/pgcs/创意空间"
   git add -A
   git commit -m "描述这次改动"
   git push origin main
   ```

3. 推送到 `main` 会自动触发 GitHub Pages 重新部署，几分钟后线上更新，无需其他操作。

> 关于更新记录：各分支项目的 `更新记录.md` 与 `历史版本/` 属于仓库内容，会随 `git add -A` 一起推送；但根目录的 `创意空间/更新记录.md` 是**仅本地的总更新记录**，已在 `.gitignore` 中排除，`git add -A` 不会把它推上 GitHub。

### 4.2 发布某个游戏的新稳定版本

两个游戏使用各自的 namespaced Git 标签：

- 坦克大战：`git tag game/tank-battle/vX.Y.Z`
- 三国 RPG：`git tag game/three-kingdoms/vX.Y.Z`

发布示例：

```bash
git tag game/three-kingdoms/v1.0.0
git push origin game/three-kingdoms/v1.0.0
```

推送 `game/**/v*` 标签也会触发 Pages 部署，`generate-game-catalog.cjs` 会自动把该游戏的最新稳定版本写进首页的 `game-catalog.json`。**不要**创建旧的全局版本标签。

## 5. 维护本文档

只要发生以下任一情况，就更新本文档：

- 新增 / 改名 / 移除某个项目文件夹。
- 某个项目的入口地址或部署方式改变。
- GitHub 远程地址、默认分支或部署工作流改变。
- 首页与各游戏之间的链接关系改变。

同步也要更新 [AGENTS.md](AGENTS.md)、[文件夹说明.md](文件夹说明.md) 与 [README.md](README.md)。
