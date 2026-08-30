# 粉丝资源 · project.md

## 定位

创意空间子项目，独立维护视频粉丝资源：网址、模板、口令与长资料页。

## 交付规格（v0.2.0）

- `resources.json` 为唯一资源数据源，条目包含固定两位 `number`、`id`、`date`、`title`、`summary`、`detailUrl`。
- `index.html` 为独立资源列表入口，动态读取 `resources.json`。
- 资料页位于 `资源/<资料名>/index.html`，保留复制按钮与完整内容。
- 测试 `测试/resources_test.js` 校验数据结构、编号、详情页存在性与复制按钮。

## 处理决策

- 2026-08-28 从创意空间首页拆出，数据与资料页归属本项目；首页只做展示联动。
- 详情页地址保持相对于本项目的 `./资源/...`，首页读取时拼接 `../粉丝资源/` 前缀。

## QA 结果（v0.2.0）

- 数据结构校验通过：固定编号、详情页、复制按钮。
- 新增自动剪辑视频技能包详情页，包含夸克网盘链接、分享口令和下载后交给 Codex 读取的说明。
- 独立入口页与首页联动待浏览器复核；新增文件 SHA-256 待补充；

## 源文件 SHA-256

- `index.html`：`bf791276e3dba84ce5fe64208adff945fae8f4d49ffb1a66c223b7d7b54f09f2`
- `resources.json`：`6bed7c3b41c171eeb5119876830e984d1e0fa65bd57614223b93023736deaff1`
- `测试/resources_test.js`：`c4f80db2a0b1b5570a3cc1dc5889e57b6aef354a1126262c716fb1976c65fbfe`
- `资源/giffgaff保命资料/index.html`：`cf1f798b8dc25317560475443d8178f991c9c9876f65f3f1f6b5b1a53707a649`
- `资源/自动剪辑视频技能包/index.html`：`3988669de3c052d55fa89fb8042a2cf6de9e03dab154183b39f91129c4a9bac5`
