# 粉丝资源 · project.md

## 定位

创意空间子项目，独立维护视频粉丝资源：网址、模板、口令与长资料页。

## 交付规格（v0.6.0）

- `resources.json` 为唯一资源数据源，条目包含固定两位 `number`、`id`、`date`、`title`、`summary`、`detailUrl`。
- `index.html` 为独立资源列表入口，动态读取 `resources.json`。
- 资料页位于 `资源/<资料名>/index.html`，保留复制按钮与完整内容。
- `06`「Mac 软件资源库」使用独立 `资源/Mac软件资源库/software-resources.json`，不把 71 个软件拆成独立粉丝资源编号。
- Mac 软件详情页支持搜索、分类筛选、交付类型筛选、官方地址、GitHub/App Store 入口、Homebrew 命令、打开夸克和一键复制。
- 测试 `测试/resources_test.js` 校验资源入口；`测试/software_resources_test.js` 校验软件库数据、永久分享、SHA-256、交付数量与页面功能。

## 处理决策

- 2026-08-28 从创意空间首页拆出，数据与资料页归属本项目；首页只做展示联动。
- 详情页地址保持相对于本项目的 `./资源/...`，首页读取时拼接 `../粉丝资源/` 前缀。
- 2026-09-01 新增 iStoreOS 安装 OpenClash 资源，详情页收录 OpenClash 指定版本发布页与 iStoreOS 官方入口。
- 2026-09-03 新增汉化 Codex 和 Claude Code 工具资源，详情页收录夸克网盘链接、分享口令和使用说明。
- 2026-09-06 新增名人智囊团 Hermes 安装包资源，详情页收录夸克网盘链接、分享口令、安装流程、角色说明与安全边界。
- 2026-09-08 根据新版 `名人智囊团_Hermes_Bot_最终版.tar.gz` 覆盖更新编号 `05` 条目，不新建资源；详情页改为最终版定位，夸克分享链接统一上传到网盘 `项目` 文件夹。
- 2026-09-09 完成 Mac 软件资源库全量建设：读取飞书《【Mac】Mac软件库》“软件汇总”视图，去重后收录 71 个软件，按 11 个用途分类归档到夸克 `项目/软件资源/`。
- 交付策略：21 个公开源码或稳定官方发布物提供安装包镜像；50 个 App Store、商业闭源、授权边界不明确、需要登录付费或来源待核验的软件提供 UTF-8 官方链接文件；不上传破解软件、注册机、激活绕过工具或来源不明的修改安装包。
- 每个软件已完成独立夸克文件、永久公开分享、FID 与 SHA-256 记录；断点状态见本机 `/tmp/mac-software-resources-state.json`，生成快照见 `/tmp/software-resources.json`。

## QA 结果（v0.6.0）

- 数据结构校验通过：固定编号、详情页、复制按钮。
- 新增自动剪辑视频技能包详情页，包含夸克网盘链接、分享口令和下载后交给 Codex 读取的说明。
- 新增 iStoreOS 安装 OpenClash 详情页，包含两个官方 GitHub 入口与安装流程提示。
- OpenClash v0.47.156 和 iStoreOS 官方 GitHub 入口 HTTP 校验通过。
- 新增汉化 Codex 和 Claude Code 工具详情页，包含夸克网盘入口、分享口令和双击运行提示。
- 新增名人智囊团 Hermes 安装包详情页，包含夸克网盘入口、分享口令、三步安装流程、8 个角色说明和覆盖提醒。
- 2026-09-08 将编号 `05` 更新为最终版内容：已核对 `tar.gz` 内含 `README.md`、`METHOD.md`、`manifest.json`、`install.sh`、`souls/`、`skills/`、`research/` 与 `engine-source/`，并更新为永久公开分享链接。
- 独立入口页与首页联动待线上验收；本版新增文件 SHA-256 已记录如下。
- Mac 软件库专项测试通过：71 个条目、编号 `01` 至 `71` 连续且无重复；11 个分类；21 个安装包镜像；50 个官方链接文件；失败 0；降级 0。
- 每条软件记录均有夸克 FID、永久分享链接、`项目/软件资源/` 路径与 SHA-256；详情页包含搜索、两个筛选器、夸克打开/复制、官方入口和手机布局。
- 全部安装包与官方链接文件已完成首次上传和分享；后续执行应读取断点状态，不重复下载、上传或创建分享。

## 源文件 SHA-256

- `index.html`：`bf791276e3dba84ce5fe64208adff945fae8f4d49ffb1a66c223b7d7b54f09f2`
- `resources.json`：`0fd78f017f6a88162a8751dfbbf668970cec79b04588f85b5f3219985b96ba7e`
- `测试/resources_test.js`：`c4f80db2a0b1b5570a3cc1dc5889e57b6aef354a1126262c716fb1976c65fbfe`
- `资源/giffgaff保命资料/index.html`：`cf1f798b8dc25317560475443d8178f991c9c9876f65f3f1f6b5b1a53707a649`
- `资源/自动剪辑视频技能包/index.html`：`3988669de3c052d55fa89fb8042a2cf6de9e03dab154183b39f91129c4a9bac5`
- `资源/iStoreOS安装OpenClash/index.html`：`a9044667ce9e03e3403d06a5bde9a9d7e6569d713fc6dea215c51e31c0b459e5`
- `资源/汉化Codex和ClaudeCode工具/index.html`：`156fcf94c08d0ecef338e2f42f9a03c2d6258d8ef91b5fd63b7bfe494bf71d6a`
- `资源/名人智囊团Hermes安装包/index.html`：`c0893e7de64de802b3a9b2c5d3493f423f07085384bde696c32a3d03e225b2f7`
- `资源/Mac软件资源库/index.html`：`137553941d5530f1d5d4bb65a08b2aeae2aa5192439d6c66d21e51b6b267c37e`
- `资源/Mac软件资源库/software-resources.json`：`c59fc8d93d170ef8c847559aa836fb959bad27ba4859efa4ab67f3e66beedf4b`
- `资源/Mac软件资源库/README.md`：`5144594da052e10a38f2cbd087d27ad0ae9ac8ad17cd7bb62b63a5e2e2ffefb7`
- `测试/software_resources_test.js`：`18909014ec4fdc947b6222bed8ce2b7d7574289271219ad1b221b836fb06b992`
- `project.md` 与 `更新记录.md` 属于自引用文档，正文不固化自身 SHA-256；如需核验请以 git blob 或导出快照为准。
