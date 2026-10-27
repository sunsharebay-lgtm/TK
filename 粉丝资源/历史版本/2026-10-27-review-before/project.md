# 粉丝资源 · project.md

## 定位

创意空间子项目，独立维护视频粉丝资源：网址、模板、口令与长资料页。

## 交付规格（v0.7.0）

- `resources.json` 为唯一资源数据源，条目包含固定两位 `number`、`id`、`date`、`title`、`summary`、`detailUrl`。
- `index.html` 为独立资源列表入口，动态读取 `resources.json`。
- 资料页位于 `资源/<资料名>/index.html`，保留复制按钮与完整内容。
- 测试 `测试/resources_test.js` 校验资源入口与详情页。

## 处理决策

- 2026-08-28 从创意空间首页拆出，数据与资料页归属本项目；首页只做展示联动。
- 详情页地址保持相对于本项目的 `./资源/...`，首页读取时拼接 `../粉丝资源/` 前缀。
- 2026-09-01 新增 iStoreOS 安装 OpenClash 资源，详情页收录 OpenClash 指定版本发布页与 iStoreOS 官方入口。
- 2026-09-03 新增汉化 Codex 和 Claude Code 工具资源，详情页收录夸克网盘链接、分享口令和使用说明。
- 2026-09-06 新增名人智囊团 Hermes 安装包资源，详情页收录夸克网盘链接、分享口令、安装流程、角色说明与安全边界。
- 2026-09-08 根据新版 `名人智囊团_Hermes_Bot_最终版.tar.gz` 覆盖更新编号 `05` 条目，不新建资源；详情页改为最终版定位，夸克分享链接统一上传到网盘 `项目` 文件夹。
- 2026-09-09 完成 Mac 软件资源库全量建设后，于 2026-09-10 将其提升为根目录平级项目 `Mac软件资源库/`；该项目的页面、数据、测试与批处理约定均已随之迁出，本项目不再维护编号 `06`。
- 2026-09-17 编号 `05`「名人智囊团 Hermes 安装包（最终版）」的原夸克分享链接被网盘判定为“存在部分违规文件”，对访问者不可用；改用用户重新生成的永久公开链接 `https://pan.quark.cn/s/cf4849928581`，不新建编号、不改动安装说明。
- 2026-09-18 新增编号 `06`「Codex 生图执行规范（灵链云 Responses API）」，详情页提供夸克永久公开分享链接与一键复制，原始文件不复制进仓库。

## QA 结果（v0.7.0）

- 数据结构校验通过：固定编号、详情页、复制按钮。
- 新增自动剪辑视频技能包详情页，包含夸克网盘链接、分享口令和下载后交给 Codex 读取的说明。
- 新增 iStoreOS 安装 OpenClash 详情页，包含两个官方 GitHub 入口与安装流程提示。
- OpenClash v0.47.156 和 iStoreOS 官方 GitHub 入口 HTTP 校验通过。
- 新增汉化 Codex 和 Claude Code 工具详情页，包含夸克网盘入口、分享口令和双击运行提示。
- 新增名人智囊团 Hermes 安装包详情页，包含夸克网盘入口、分享口令、三步安装流程、8 个角色说明和覆盖提醒。
- 2026-09-08 将编号 `05` 更新为最终版内容：已核对 `tar.gz` 内含 `README.md`、`METHOD.md`、`manifest.json`、`install.sh`、`souls/`、`skills/`、`research/` 与 `engine-source/`，并更新为永久公开分享链接。
- 独立入口页与首页联动待线上验收；本版新增文件 SHA-256 已记录如下。
- Mac 软件资源库的专项 QA、交付记录和后续维护已迁往 `../Mac软件资源库/`，本项目不再保存或执行其专项测试。
- 2026-09-17 复核编号 `05` 新旧分享链接：新链接分享标题与文件名均为 `名人智囊团_Hermes_Bot_最终版.tar.gz`，`path_info` 为 `/项目`，`url_type=1`（公开）、`expired_type=1`（永久）；旧链接返回“存在部分违规文件”错误，确认失效原因。
- 详情页仅替换分享链接并补充更换说明，安装流程、包内结构、角色说明等内容未改动；旧版详情页已归档到 `历史版本/v0.6.0/`。
- 2026-09-18 新增 Codex 生图执行规范详情页，已运行 `node 测试/resources_test.js`，通过 6 条资源、6 个详情页、复制按钮和相对路径校验。

## 源文件 SHA-256

- `index.html`：`bf791276e3dba84ce5fe64208adff945fae8f4d49ffb1a66c223b7d7b54f09f2`
- `resources.json`：`0bf1c537a31657a8423f7caf77b9c4ff9ebde0fc41b49a7a81c65762edf554fc`
- `测试/resources_test.js`：`c4f80db2a0b1b5570a3cc1dc5889e57b6aef354a1126262c716fb1976c65fbfe`
- `资源/giffgaff保命资料/index.html`：`cf1f798b8dc25317560475443d8178f991c9c9876f65f3f1f6b5b1a53707a649`
- `资源/自动剪辑视频技能包/index.html`：`3988669de3c052d55fa89fb8042a2cf6de9e03dab154183b39f91129c4a9bac5`
- `资源/iStoreOS安装OpenClash/index.html`：`a9044667ce9e03e3403d06a5bde9a9d7e6569d713fc6dea215c51e31c0b459e5`
- `资源/汉化Codex和ClaudeCode工具/index.html`：`156fcf94c08d0ecef338e2f42f9a03c2d6258d8ef91b5fd63b7bfe494bf71d6a`
- `资源/名人智囊团Hermes安装包/index.html`：`ae0827544537327d1fbfcd3bf5e1d8eace24cb60451f20d9d977c05fba60d41d`
- `资源/Codex生图执行规范/index.html`：`9718c91a5d5d1f955f79f819392c053a6fad75aedd5dbe71674a9146db0cc966`
- `project.md` 与 `更新记录.md` 属于自引用文档，正文不固化自身 SHA-256；如需核验请以 git blob 或导出快照为准。

## 2026-10-26 · 全项目审查修复（本地待发布）

### 决策与修复

- 修复自动剪辑视频技能包、汉化 Codex 和 Claude Code 资料页复制了前面的说明或文件名、没有复制分享口令的问题。
- 六个资料页统一引用本项目的 `scripts/copy.js`，按按钮所在模板或明确 `data-copy-target` 取内容；每个复制按钮只复制对应资料。
- 现代剪贴板被拒绝时尝试兼容复制；兼容命令返回 false 或抛错时明确提示失败，不再显示“已复制”；临时文本框始终清理。Hermes 资料页同时获得兼容复制能力。
- 修改前源码归档于 `历史版本/2026-10-26-review-before/`；本轮未创建版本标签或执行发布。

### QA

- 新增 `node 测试/clipboard_test.js`，直接执行六个页面实际引用的脚本，验证每个按钮的真实文字与 5 种剪贴板环境（成功、拒绝后回退、兼容成功、返回 false、抛错），共 30 组通过。修复前准确复现把说明文字复制为分享口令。
- `node 测试/resources_test.js`：6 条资源与详情页校验通过。

### 本轮源文件 SHA-256

- `scripts/copy.js`：`7fb2a8f48bbd9a003ac7057b8cbdacbda5dc3145ef98c8b04fa2cbbc9a2303f4`
- `测试/clipboard_test.js`：`40fb4e71291fe9d61586784efc145675b23b828fe207251e384eeec4216c1461`
- `资源/Codex生图执行规范/index.html`：`7d65fda88889d85cf6e351d8398e3fa1dd580a050d2134f91c984ca75a8187f1`
- `资源/giffgaff保命资料/index.html`：`08f5bd1b9bba813a87a933b08b75a0e3a9a7e1397be65be65157b1ea012ff73c`
- `资源/iStoreOS安装OpenClash/index.html`：`e293807dfcbf1bbdf90593cbd97344067016f07fbb04880fec67ad14ff674cd4`
- `资源/名人智囊团Hermes安装包/index.html`：`fbbe8daf168f6eda85715202a28b08211cb036e9e25fa30a64453e7cb05123e9`
- `资源/汉化Codex和ClaudeCode工具/index.html`：`a159f0a1487d42439514e39f8bc0d516d951bed033dd6e1828c6fafe048bd6fa`
- `资源/自动剪辑视频技能包/index.html`：`fe5aacda0eee2ba4df29c1f28adfc65741c0026fa61f8ffb5bcfa9098e9fb08a`

### 本轮兼容入口与浏览器复核补充

- 历史证据：`958845c` 中编号 06 的 `detailUrl` 为 `./资源/Mac软件资源库/`；`b3e9bc2` 迁出后旧 URL 返回 404。现补纯跳转壳，保留 query/hash，软件数据与正式入口仍属于独立 Mac 项目。
- `node 测试/legacy_routes_test.js` 先因缺失兼容入口失败，新增入口后通过；真实浏览器旧书签 `?from=bookmark#software-grid` 跳到新项目并保留查询与锚点。
- 六个现行资源页逐页在真实浏览器点击复制，口令/链接/清单均与对应内容一致；共 8 个按钮（Giffgaff 3 个、其它各 1 个）。
- `资源/Mac软件资源库/index.html` SHA-256：`88a94a82822208403f9bc6c72b3a077d3a035c1178235c587837430f3095bacf`。
- `测试/legacy_routes_test.js` SHA-256：`b8fb008293855e5c108257a9257e4102ae3981b0bc673df6a41521b5579afed0`。
