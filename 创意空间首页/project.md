# 创意空间首页 · project.md

> 本文件记录「创意空间首页」的交付规格、处理决策、QA 结果与源文件校验；按全局项目记录规则维护，有重要变化时追加。

## 定位

「创意空间首页」是创意空间的 GitHub Pages 起始页 / 游戏中心，同时承担视频粉丝资源的集中展示。

## 当前交付规格（2026-08-27，v0.4.0）

- 常驻「粉丝资源 / Fan Resources」区块：位于游戏库与关于博主之间。
- 数据源：`resources.json`，手动维护；首页动态渲染，加载失败时保留空状态。
- 资源条目支持：
  - `links`：网址链接，新窗口打开。
  - `texts`：可复制文字，优先使用剪贴板 API，并提供旧式复制兜底。
  - `detailUrl`：长资料的独立资料页，首页只显示标题、简介与「查看完整资料」入口。
- 数据格式校验：`测试/resources_test.js`；首页回归：`测试/game_center_test.js`、`测试/version_catalog_test.js`。
- 首个资源：`giffgaff-refund-kit`（Giffgaff保命资料），独立页在 `资源/giffgaff保命资料/`，含退款工单、僵局确认函话术、通信监察专员申诉正文三个可复制模板。

## 处理决策

- 只做常驻资源区块，不做每期视频独立落地页。
- 当前手动维护 JSON，不接入自媒体数据库自动同步（数据库暂无资源字段）。
- 沿用游戏目录「JSON + 首页动态渲染」的既有模式，不引入后端或新依赖。

## QA 结果（2026-08-27）

- `node 创意空间首页/测试/game_center_test.js`：通过。
- `node 创意空间首页/测试/version_catalog_test.js`：通过。
- `node 创意空间首页/测试/resources_test.js`：通过（Giffgaff 条目校验通过）。
- 首页内嵌脚本 `node --check`：通过。
- 本地静态服务器 + Chrome 无头渲染：首页资源卡可正确显示 Giffgaff 标题、简介与「查看完整资料」入口；资料页可渲染三个模板、两个网址与复制按钮。
- `git diff --check`：通过。

## 源文件 SHA-256（2026-08-27）

- `index.html`：`f8bae6b9d751542766c49c5dee5493b6517d1f04caed153847575346a363c791`
- `resources.json`：`0580552a7b62c3dffd66b0723f72a0648ae2007952ccdf010a604cd7209f20b9`
- `测试/game_center_test.js`：`c793df6f483671bcd03de4bcd0f68c9034c3f2a37933a5fd8f0a3821510e8ed5`
- `测试/resources_test.js`：`c96cd814f6018e6a8f7265e1cacb83f57907c43addc1b630212fe6a071c9525d`
- `资源/giffgaff保命资料/index.html`：`cf1f798b8dc25317560475443d8178f991c9c9876f65f3f1f6b5b1a53707a649`
