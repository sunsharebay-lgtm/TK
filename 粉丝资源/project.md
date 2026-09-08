# 粉丝资源 · project.md

## 定位

创意空间子项目，独立维护视频粉丝资源：网址、模板、口令与长资料页。

## 交付规格（v0.5.1）

- `resources.json` 为唯一资源数据源，条目包含固定两位 `number`、`id`、`date`、`title`、`summary`、`detailUrl`。
- `index.html` 为独立资源列表入口，动态读取 `resources.json`。
- 资料页位于 `资源/<资料名>/index.html`，保留复制按钮与完整内容。
- 测试 `测试/resources_test.js` 校验数据结构、编号、详情页存在性与复制按钮。

## 处理决策

- 2026-08-28 从创意空间首页拆出，数据与资料页归属本项目；首页只做展示联动。
- 详情页地址保持相对于本项目的 `./资源/...`，首页读取时拼接 `../粉丝资源/` 前缀。
- 2026-09-01 新增 iStoreOS 安装 OpenClash 资源，详情页收录 OpenClash 指定版本发布页与 iStoreOS 官方入口。
- 2026-09-03 新增汉化 Codex 和 Claude Code 工具资源，详情页收录夸克网盘链接、分享口令和使用说明。
- 2026-09-06 新增名人智囊团 Hermes 安装包资源，详情页收录夸克网盘链接、分享口令、安装流程、角色说明与安全边界。
- 2026-09-08 根据新版 `名人智囊团_Hermes_Bot_最终版.tar.gz` 覆盖更新编号 `05` 条目，不新建资源；详情页改为最终版定位，夸克分享链接统一上传到网盘 `项目` 文件夹。

## QA 结果（v0.5.1）

- 数据结构校验通过：固定编号、详情页、复制按钮。
- 新增自动剪辑视频技能包详情页，包含夸克网盘链接、分享口令和下载后交给 Codex 读取的说明。
- 新增 iStoreOS 安装 OpenClash 详情页，包含两个官方 GitHub 入口与安装流程提示。
- OpenClash v0.47.156 和 iStoreOS 官方 GitHub 入口 HTTP 校验通过。
- 新增汉化 Codex 和 Claude Code 工具详情页，包含夸克网盘入口、分享口令和双击运行提示。
- 新增名人智囊团 Hermes 安装包详情页，包含夸克网盘入口、分享口令、三步安装流程、8 个角色说明和覆盖提醒。
- 2026-09-08 将编号 `05` 更新为最终版内容：已核对 `tar.gz` 内含 `README.md`、`METHOD.md`、`manifest.json`、`install.sh`、`souls/`、`skills/`、`research/` 与 `engine-source/`，并更新为永久公开分享链接。
- 独立入口页与首页联动待线上验收；本版新增文件 SHA-256 已记录如下。

## 源文件 SHA-256

- `index.html`：`bf791276e3dba84ce5fe64208adff945fae8f4d49ffb1a66c223b7d7b54f09f2`
- `resources.json`：`0fd78f017f6a88162a8751dfbbf668970cec79b04588f85b5f3219985b96ba7e`
- `测试/resources_test.js`：`c4f80db2a0b1b5570a3cc1dc5889e57b6aef354a1126262c716fb1976c65fbfe`
- `资源/giffgaff保命资料/index.html`：`cf1f798b8dc25317560475443d8178f991c9c9876f65f3f1f6b5b1a53707a649`
- `资源/自动剪辑视频技能包/index.html`：`3988669de3c052d55fa89fb8042a2cf6de9e03dab154183b39f91129c4a9bac5`
- `资源/iStoreOS安装OpenClash/index.html`：`a9044667ce9e03e3403d06a5bde9a9d7e6569d713fc6dea215c51e31c0b459e5`
- `资源/汉化Codex和ClaudeCode工具/index.html`：`156fcf94c08d0ecef338e2f42f9a03c2d6258d8ef91b5fd63b7bfe494bf71d6a`
- `资源/名人智囊团Hermes安装包/index.html`：`c0893e7de64de802b3a9b2c5d3493f423f07085384bde696c32a3d03e225b2f7`
- `project.md` 与 `更新记录.md` 属于自引用文档，正文不固化自身 SHA-256；如需核验请以 git blob 或导出快照为准。
