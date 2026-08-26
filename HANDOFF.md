# 创意空间 · 重装恢复 HANDOFF

> 重装 Codex 后：先读本文件，再读 `AGENTS.md`、`README.md`、`文件夹说明.md`、`项目关系与GitHub推送.md`，即可继续。全局环境记忆见 `/Users/sun/Desktop/pgcs/Codex重装恢复指南.md`。

## 项目身份

- 项目名「创意空间」（Creative Space），**不再叫 Claude Code 坦克大战**。
- 一个仓库收纳多个创意：创意空间首页、坦克大战、吞食天地三国、超级像素兄弟。每个创意一个文件夹。
- Git 仓库根：`/Users/sun/Desktop/pgcs/创意空间`；远程 `origin` = `github.com/sunsharebay-lgtm/TK`（远程 URL 内含 PAT，注意别外泄）。
- GitHub Pages 线上根：`https://sunsharebay-lgtm.github.io/TK/`；首页自动跳转 `创意空间首页/`。

## 目录速览

- `创意空间首页/`：游戏中心（卡片/版本目录/生成脚本）。
- `坦克大战/`：坦克大战单文件游戏，稳定版 v1.6.1（v1.6.1 是旧版流程产物）。
- `吞食天地三国/`：
  - `three-kingdoms.html`：早期 FC 风单文件版（A 线，历史保留）。
  - `网页复刻/吞食天地Ⅱ同人复刻-网页版/`：**当前主推进**的 B 线（自研 MZ 兼容引擎，纯浏览器运行）。
  - `素材/`：参考素材（APK/EXE/gmdata/攻略，约占 90M）。
  - `文档/`、`测试/`：交接文档与测试。
- `超级像素兄弟/`：像素平台跳跃实验。

## 三国 B 线（网页复刻）当前状态

- 引擎：`index.html` + `js/`（core/data/interp/windows/mapscene/menus/battle/main），数据 `assets/data/` 为原版解码 JSON（14 数据库 + 552 地图）。
- 玩法：开场难度选择 → 剧情 → 徐州/宫殿/山洞；战斗、商店、装备、存档、事件解释器均已实现；第一章完整可玩。
- 本地运行：`cd "吞食天地三国/网页复刻/吞食天地Ⅱ同人复刻-网页版" && python3 -m http.server 8642`，浏览器开 `http://localhost:8642`。调试参数：`?autostart`、`?goto=mapId,x,y`。
- 线上入口：`https://sunsharebay-lgtm.github.io/TK/吞食天地三国/`（跳转 B 线）。

## 版本号逻辑

- 版本号由 Git 标签生成，不用手改：`game/<游戏名>/vX.Y.Z`（如 `game/three-kingdoms/v0.2.0`）。
- 普通提交只推 `main`，不 bump 版本；发布稳定里程碑才打新标签并推送。
- 当前三国标签：`game/three-kingdoms/v0.1.0`、`game/three-kingdoms/v0.2.0`。
- 页面部署：push `main` 或 `game/**/v*` 标签自动触发 Pages 工作流；多推送并发会互相取消，失败就手动 `workflow_dispatch` 重跑一次。

## 验证命令

```sh
cd /Users/sun/Desktop/pgcs/创意空间
# 三国 B 线浏览器冒烟（Python Playwright 已可用）
# 通常用 Playwright 打开 http://localhost:8642/?autostart&goto=... 抓 console/404/场景状态
# A 线回归（three-kingdoms.html）
node "吞食天地三国/测试/three_kingdoms_test.js"     # 294+ 项
node "吞食天地三国/测试/three_kingdoms_smoke.js"     # 78 项
# 目录生成器
node "创意空间首页/scripts/generate-game-catalog.cjs"
```

## 最近已完成（战斗/地图打磨，2026-08-26）

- 属性取整（兵力/谋略不再小数）。
- 桥面不再覆盖角色（渲染分层修正）。
- A 系列自动图块范围修复（河水不再黑色）。
- 战斗：敌方每轮不再自动回满血（xparam 默认值修正）；战斗有“上前→攻击→飘字→退回”动作序列；我军左列/敌军右列从上到下；指令两列完整显示；新增总攻/情报/逃跑；策略菜单类型错位修复；敌人情报查看。
- 宝箱确认改为“面前优先”，跨两格仅对店主/掌柜生效。
- `formationBonus` 补了默认实现（阵型预留钩子）。
- 历史重写：移除 `assets/store/`（71M 原始加密）+ `assets/_unmatched/`（23M），网页复刻工作区约 47M；`.git` 约 145M（素材仍占大头）。

## 已知待办/坑

- 阵型、歌唱（三阶）效果：battle.js 无相关实现，仅预留 formationBonus 钩子。
- 8 槽装备（副将/坐骑/饰品）效果需逐个核对。
- 主循环用 setTimeout(16ms)，可改 requestAnimationFrame 提升手感。
- 552 张地图的事件边角指令需边玩边验（interp.js 已实现大部分 case）。
- 音频：SE 别名已映射（标准 MZ 名 → Tstd_*）；BGM 播放速率正常（playbackRate=1），勿误以为加速。
- 线上部署偶发并发取消/失败，失败后手动 `workflow_dispatch`。
- 工作区可能有其他会话/并行进程新增文件，`git add -A` 前先看 `git status`。

## 下一步建议

- 用 `测试/tools/cdp-driver.mjs` 继续驾驶第一章（出城→山洞→纪灵→寿春→袁术），记录事件覆盖缺口。
- 对缺口项（阵型/歌唱/装备槽/输入/音效）逐一最小实现 + 验证。
- 需要时按创意空间规则归档版本、更新 `更新记录.md`。
