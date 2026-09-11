# 创意空间首页

创意空间的 GitHub Pages 入口页 / 创意中心，统一展示各子项目板块、创意目录、粉丝资源与社群入口。

- 真实首页：`index.html`；根目录 `index.html` 只是跳转占位。
- 2026-09-10 起，`Mac软件资源库/` 是与游戏、工具并列的独立创意；首页导航和创意卡片直达 `../Mac软件资源库/`，不再把它列为粉丝资源详情页。
- 创意目录：`game-catalog.json` 由 `scripts/generate-game-catalog.cjs` 从 `game/<id>/vX.Y.Z` 与 `resource/<id>/vX.Y.Z` 标签生成。
- 粉丝资源：只从 `../粉丝资源/resources.json` 读取展示，内容由粉丝资源项目独立维护。
- 测试：`测试/game_center_test.js`、`测试/version_catalog_test.js`。
- 线上验收：`测试/published_site_test.mjs`，由 Pages 部署完成后自动运行。

## 工作边界

- 本文件夹只维护首页本身、版本目录脚本与首页测试。
- 各游戏、工具、粉丝资源的源码与内容都在各自的子项目文件夹里，不要在首页里维护。
- 新板块上线：先建立独立子项目文件夹，再加入 `game-catalog.template.json` 或资源数据，最后更新首页导航与测试。
- 发布规则：版本标签只做记录，必须由创意空间推送 `main`；Actions 成功且线上验收通过后才算完成。
