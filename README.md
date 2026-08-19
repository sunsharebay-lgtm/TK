# TK - 坦克大战 / Tank Battle

一个正在持续打磨的网页版坦克大战项目。

TK 是一个由我和社区一起共创的游戏项目。算力来源是llapi.org，给打个广告。它以经典坦克大战的即时战斗乐趣为基础，在保留易上手操作与关卡推进节奏的同时，持续改进画面、地图设计、敌方 AI、触屏操作和整体游戏体验。

This is an actively developed web-based tank battle game.

TK is a collaborative game project built together with the community. Inspired by the immediate, approachable fun of classic tank battle games, it is continuously improved through better visuals, level design, enemy AI, touch controls, and overall gameplay.

## 在线更新 / Follow Development

我会在视频中定期展示这个项目的开发进度、试玩效果和新版本变化。

I will regularly share development progress, playtests, and new-version updates in videos.

欢迎关注 **大海的科技宝箱**：

- YouTube
- Bilibili / 哔哩哔哩
- TikTok

如果你觉得这个项目有意思，欢迎关注账号，并在视频评论区留下建议、想法或问题。每一条有价值的反馈都可能成为后续迭代的一部分。

If this project interests you, please follow **大海的科技宝箱** on YouTube, Bilibili, or TikTok, and leave your ideas, suggestions, or issues in the video comments. Useful community feedback may shape future updates.

## 当前版本 / Current Version

当前正式版本：

- 坦克大战：`v1.6.1`
- 三国 RPG：`v0.1.0`，第一稳定垂直切片

Current releases:

- Tank Battle: `v1.6.1`
- Three Kingdoms RPG: `v0.1.0`, the first stable vertical slice

三国 RPG 的 `v0.1.0` 是原创的第一稳定垂直切片，包含探索、地点交互、武将招募、队伍管理和回合制战斗；它是独立创作的玩法实验，不声称复制任何原作。

The Three Kingdoms RPG `v0.1.0` is an original first stable vertical slice with exploration, location interactions, officer recruitment, party management, and turn-based combat. It is an independent gameplay experiment and does not claim to copy any original work.

详细更新内容见 [更新记录.md](更新记录.md)。

For the complete change history, see [更新记录.md](更新记录.md).

## 在线试玩 / Play Online

GitHub Pages 会在 `main` 分支更新后自动部署最新版。原有二维码对应的地址现在是小游戏中心：

<https://sunsharebay-lgtm.github.io/TK/>

GitHub Pages automatically publishes the latest version after every update to the `main` branch. The original QR-code URL now opens the game center:

<https://sunsharebay-lgtm.github.io/TK/>

从游戏中心点击“钢铁防线 坦克大战”即可开始游戏，也可以直接打开坦克大战：

<https://sunsharebay-lgtm.github.io/TK/tank-battle.html>

From the game center, select “钢铁防线 坦克大战” to play, or open the direct game URL:

<https://sunsharebay-lgtm.github.io/TK/tank-battle.html>

三国 RPG 当前为第一稳定垂直切片 `v0.1.0`，可直接打开，包含五个 16×16 区域、碰撞移动、地点交互、一次武将招募、独立存档和回合制战斗；这是原创独立创作，不声称复制任何原作：

<https://sunsharebay-lgtm.github.io/TK/three-kingdoms.html>

## 项目内容 / Project Contents

- `index.html`：小游戏中心入口 / Game center entry page
- `tank-battle.html`：坦克大战稳定的直接入口 / Stable direct entry for Tank Battle
- `three-kingdoms.html`：九州烽烟三国 RPG 外壳，当前为原创 FC 风格开发版 / Original FC-style Three Kingdoms RPG shell (development build)
- `坦克大战.html`：旧中文入口兼容跳转页 / Compatibility redirect for the former Chinese entry
- `历史版本/`：已归档的旧版源码 / Archived source snapshots
- `更新记录.md`：每个已确认版本的更新记录 / Confirmed-version changelog
- `文件夹说明.md`：目录和文件用途说明 / Project structure guide

## 运行方式 / How To Run

直接使用现代浏览器打开 `tank-battle.html` 或 `three-kingdoms.html` 即可开始对应游戏；打开 `index.html` 可进入小游戏中心。

Open `tank-battle.html` or `three-kingdoms.html` in a modern web browser to play; open `index.html` to view the game center.

## 稳定版本标签 / Stable Version Tags

小游戏中心的版本号由 Git 稳定版本标签自动生成，不需要单独修改首页。每款游戏使用独立的 namespaced tag：坦克大战使用 `game/tank-battle/vX.Y.Z`，三国 RPG 使用 `game/three-kingdoms/vX.Y.Z`。发布三国 RPG 第一稳定垂直切片时使用 `game/three-kingdoms/v0.1.0`；生成器会为每个游戏读取其 namespace 下的最高稳定语义版本，并在没有匹配标签时保留模板中的 fallback（因此首页源码中的三国卡片 fallback 是 `v0.1.0 开发版`）。普通代码、文档或测试提交不会被当成新游戏版本，也不创建旧式全局 `v0.1.0` 标签。

The game center reads version numbers from Git stable-version tags, so the homepage does not need a separate manual edit. Each game uses its own namespaced tag: Tank Battle uses `game/tank-battle/vX.Y.Z`, while Three Kingdoms RPG uses `game/three-kingdoms/vX.Y.Z`. The first stable Three Kingdoms vertical slice is released as `game/three-kingdoms/v0.1.0`; the generator selects the highest stable semantic version within each game namespace and keeps the template fallback when no matching tag exists (so the embedded Three Kingdoms card fallback is `v0.1.0 开发版`). Ordinary code, documentation, and test commits are not treated as game releases, and no legacy global `v0.1.0` tag is created.
