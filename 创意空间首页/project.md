# 创意空间首页 · project.md

> 本文件记录「创意空间首页」的交付规格、处理决策、QA 结果与源文件校验；按全局项目记录规则维护，有重要变化时追加。

## 定位

「创意空间首页」是创意空间的 GitHub Pages 起始页 / 游戏中心，统一展示各子项目板块、版本目录、粉丝资源与社群入口。

> 2026-08-28：粉丝资源拆分为独立子项目 `粉丝资源/`，首页只读取展示，不再维护资源内容。

## 当前交付规格（2026-08-28，v0.5.0）

- 常驻「粉丝资源 / Fan Resources」区块：位于游戏库与关于博主之间。
- 数据源：`../粉丝资源/resources.json`，由粉丝资源子项目维护；首页动态读取展示，加载失败时保留空状态。
- 资源列表为紧凑一行一条：日期、标题、补充说明与「查看完整资料」小号入口；点击进入独立资料页。
- 首页资源卡读取详情页时拼接 `../粉丝资源/` 前缀，资料页归属粉丝资源项目。
- 数据格式与详情页校验：`../粉丝资源/测试/resources_test.js`；首页回归：`测试/game_center_test.js`、`测试/version_catalog_test.js`。
- 关于博主与社群入口已整合成单个紧凑模块，QQ 二维码与 QQ 群号合并展示，Telegram 群组并排。
- 新增板块导航：首页 / 坦克大战 / 三国 / 超级玛丽 / 墨水屏小站 / 粉丝资源。
- 墨水屏小站由外部链接改为站内 `/TK/墨水屏小站/`，版本 `v0.4.0`。
- Pages 只由 `main` 推送触发；版本标签不再触发独立部署，避免受保护环境拒绝标签和并发取消。
- 每次 Pages 部署写入 `deployment-meta.json`，并执行 `测试/published_site_test.mjs` 验收部署提交、六个入口、资源数据与详情页。

## 处理决策

- 只做常驻资源区块，不做每期视频独立落地页。
- 资源数据与资料页迁移到 `粉丝资源/`，首页不重复维护，避免两处手改。
- 沿用游戏目录「JSON + 首页动态渲染」的既有模式，不引入后端或新依赖。
- 首页版本确认时归档旧源码到 `历史版本/`；本次 v0.5.0 归档 v0.4.2。

## QA 结果（2026-08-28，v0.4.2）

- `node 创意空间首页/测试/game_center_test.js`：通过。
- `node 创意空间首页/测试/version_catalog_test.js`：通过。
- `node 创意空间首页/测试/resources_test.js`：通过（Giffgaff 条目校验通过）。
- 首页内嵌脚本 `node --check`：通过。
- 本地静态服务器 + Chrome 无头渲染：首页资源卡可正确显示 Giffgaff 标题、简介与「查看完整资料」入口；资料页可渲染三个模板、两个网址与复制按钮。
- v0.4.1 落地后再次验证：资源列表为紧凑一行，博主区已合并社群模块，QQ 二维码与 QQ 群号同一格，Telegram 群组并排。
- v0.4.2 落地后再次验证：Giffgaff保命资料显示固定编号 `01`。
- `git diff --check`：通过。

## 发布链路 QA（2026-08-30）

- 已复现并记录故障：`content/fan-resources/v0.2.0` 标签部署被 `github-pages` 环境保护拒绝，同行的 `main` 部署因全局并发组被取消。
- 修复方案：Pages 工作流只监听 `main`；标签保留为版本来源，先推标签再推 `main`；部署后线上验收失败即让工作流失败。

## QA 结果（2026-08-28，v0.5.0）

- `node 创意空间首页/测试/game_center_test.js`：通过。
- `node 创意空间首页/测试/version_catalog_test.js`：通过。
- `node 粉丝资源/测试/resources_test.js`：通过。
- `node 墨水屏小站/测试/smoke_test.js`：通过。
- 本地静态服务器验证：首页、粉丝资源、墨水屏小站、Giffgaff 资料页与 `game-catalog.json` 均返回 200；首页含板块导航与新数据路径。
- `git diff --check`：通过。

## 源文件 SHA-256（2026-08-28）

- `index.html`：`ab5901a1fbf380882cee30fe1adc8179cce55c7703b5470a97bdec0f94aea6ce`
- `game-catalog.json`：`5936d349d2740f9fa91998f87fa2e1f763070ef4be895460b91b14cda22a30aa`
- `测试/game_center_test.js`：`80f04110647eeabe52aeb2e66dc157a7ae8758606cb1e106ff55ceb933f4fdb8`
- `测试/version_catalog_test.js`：`35ca47be3b8a7e00b395418c8aba30fb15bcff7c5338a58c3cf604a566cc9ca2`
- `测试/published_site_test.mjs`：`f326a5ea7d74c6c77c9fb9c385ae12c8c8e25045fa6e2f4e4e81446a261f2163`
- `scripts/write-deployment-meta.cjs`：`32de7b13c27ab58e0ba4fab1455b1ecce68e25a441012cace20c66f149ae6db2`
- `历史版本/创意空间首页-v0.4.2.html`：`32f6ad5775240841356e218ce3dadf60c1db06b8e1938f57802706a77aec902a`
