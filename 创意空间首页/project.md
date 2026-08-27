# 创意空间首页 · project.md

> 本文件记录「创意空间首页」的交付规格、处理决策、QA 结果与源文件校验；按全局项目记录规则维护，有重要变化时追加。

## 定位

「创意空间首页」是创意空间的 GitHub Pages 起始页 / 游戏中心，同时承担视频粉丝资源的集中展示。

## 当前交付规格（2026-08-28，v0.4.2）

- 常驻「粉丝资源 / Fan Resources」区块：位于游戏库与关于博主之间。
- 数据源：`resources.json`，手动维护；首页动态渲染，加载失败时保留空状态。
- 资源列表为紧凑一行一条：日期、标题、补充说明与「查看完整资料」小号入口；点击进入独立资料页。
- 每条资源必须提供 `detailUrl`；网址、可复制文字等完整内容放在独立资料页里。
- 每条资源必须提供两位固定编号 `number`（如 `01`、`02`），用于后续沟通和定位，不随排序自动变化。
- 数据格式校验：`测试/resources_test.js`；首页回归：`测试/game_center_test.js`、`测试/version_catalog_test.js`。
- 首个资源：`giffgaff-refund-kit`（Giffgaff保命资料），独立页在 `资源/giffgaff保命资料/`，含退款工单、僵局确认函话术、通信监察专员申诉正文三个可复制模板。
- 当前编号：Giffgaff保命资料为 `01`。
- 关于博主与社群入口已整合成单个紧凑模块，QQ 二维码与 QQ 群号合并展示，Telegram 群组并排。

## 处理决策

- 只做常驻资源区块，不做每期视频独立落地页。
- 当前手动维护 JSON，不接入自媒体数据库自动同步（数据库暂无资源字段）。
- 沿用游戏目录「JSON + 首页动态渲染」的既有模式，不引入后端或新依赖。

## QA 结果（2026-08-28，v0.4.2）

- `node 创意空间首页/测试/game_center_test.js`：通过。
- `node 创意空间首页/测试/version_catalog_test.js`：通过。
- `node 创意空间首页/测试/resources_test.js`：通过（Giffgaff 条目校验通过）。
- 首页内嵌脚本 `node --check`：通过。
- 本地静态服务器 + Chrome 无头渲染：首页资源卡可正确显示 Giffgaff 标题、简介与「查看完整资料」入口；资料页可渲染三个模板、两个网址与复制按钮。
- v0.4.1 落地后再次验证：资源列表为紧凑一行，博主区已合并社群模块，QQ 二维码与 QQ 群号同一格，Telegram 群组并排。
- v0.4.2 落地后再次验证：Giffgaff保命资料显示固定编号 `01`。
- `git diff --check`：通过。

## 源文件 SHA-256（2026-08-27）

- `index.html`：`32f6ad5775240841356e218ce3dadf60c1db06b8e1938f57802706a77aec902a`
- `resources.json`：`df18510b19d1213f2f443cb580cfcdb2d0d41c135aa73ff0406c10d9994a27ba`
- `测试/game_center_test.js`：`c8400f3426823941a7ce8ab0612c572ceb1cb4d9baccc91d970a96a814c83ada`
- `测试/resources_test.js`：`c4f80db2a0b1b5570a3cc1dc5889e57b6aef354a1126262c716fb1976c65fbfe`
- `资源/giffgaff保命资料/index.html`：`cf1f798b8dc25317560475443d8178f991c9c9876f65f3f1f6b5b1a53707a649`
- `历史版本/创意空间首页-v0.4.0.html`：`f8bae6b9d751542766c49c5dee5493b6517d1f04caed153847575346a363c791`
