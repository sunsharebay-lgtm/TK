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

## 2026-10-26 审查后的目录校验

目录生成只使用当前部署提交可达的稳定标签。新增标签或模板有变化时，先运行 `node scripts/generate-game-catalog.cjs`，再运行 `node 测试/version_catalog_test.js`；本地 JSON 与部署生成结果必须一致。`node 测试/catalog_history_test.js` 在临时 Git 仓库中验证未合并标签、旧提交与异地执行，不修改主仓库历史。

手机资源卡允许长标题换行，资源主内容宽度以卡片为准。B站入口已于 2026-10-27 根据用户提供的链接核实并补齐：[大海的科技宝箱](https://space.bilibili.com/2053159491)，UID `2053159491`。QQ 群号支持点击选中后手动复制。

本轮补丁发布：`site/home/v0.5.2`（2026-10-27），内容与验收见 [统一发布记录](../docs/发布/2026-10-27/project.md)。
