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

当前正式版本：`v1.6.1`

Current release: `v1.6.1`

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

## 项目内容 / Project Contents

- `index.html`：小游戏中心入口 / Game center entry page
- `tank-battle.html`：坦克大战稳定的直接入口 / Stable direct entry for Tank Battle
- `坦克大战.html`：旧中文入口兼容跳转页 / Compatibility redirect for the former Chinese entry
- `历史版本/`：已归档的旧版源码 / Archived source snapshots
- `更新记录.md`：每个已确认版本的更新记录 / Confirmed-version changelog
- `文件夹说明.md`：目录和文件用途说明 / Project structure guide

## 运行方式 / How To Run

直接使用现代浏览器打开 `tank-battle.html` 即可开始游戏；打开 `index.html` 可进入小游戏中心。

Open `tank-battle.html` in a modern web browser to play; open `index.html` to view the game center.

## 稳定版本标签 / Stable Version Tags

小游戏中心的版本号由 Git 稳定版本标签自动生成，不需要单独修改首页。发布新的正式游戏版本时，创建并推送形如 `v1.6.2` 的标签；GitHub Pages 工作流会读取最新的 `vX.Y.Z` 标签，生成 `game-catalog.json`，首页再自动展示对应的“稳定版”版本号。普通代码、文档或测试提交不会被当成新游戏版本。

The game center reads its version numbers from Git stable-version tags, so the homepage does not need a separate manual edit. When publishing a new official game version, create and push a tag such as `v1.6.2`; the GitHub Pages workflow reads the newest `vX.Y.Z` tag, generates `game-catalog.json`, and the homepage displays the matching stable version automatically. Ordinary code, documentation, or test commits are not treated as new game releases.
