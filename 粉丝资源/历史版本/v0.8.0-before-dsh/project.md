# 粉丝资源 · project.md

## 定位

创意空间子项目，独立维护视频粉丝资源：网址、模板、口令与长资料页。

## 交付规格（已发布 v0.7.0；工作区审查增强见文末）

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

## 源文件 SHA-256（v0.7.0 历史记录；最新工作区见文末）

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

## 2026-10-27 · 统一补丁发布 v0.7.1

- 交付内容：复制正确内容、失败反馈与旧Mac地址兼容跳转。
- 标签：`content/fan-resources/v0.7.1`；主分支部署统一由创意空间执行。旧审查章节保留当时的本地状态，当前发布以本节及共享发布记录为准。
- 既有37组回归、三国62场景（含复测）、七项目14项浏览器与墨屏8项布局检查构成本轮QA基线；发布前在仅含待提交内容的检出中再次运行统一门禁。
- 发布记录：`../docs/发布/2026-10-27/project.md`。

## 2026-10-27 · 粉丝资源专项审查与完善

### 交付与范围

- 以本轮开始时的工作区为基线，保留 2026-10-26 尚未发布的修复；通读入口、资源目录、六个资料页、旧 Mac 跳转、共享复制脚本及三组原有测试。
- 审查前 17 个本项目文件及共享打包配置完整归档到 `历史版本/2026-10-27-review-before/`，校验清单为 `manifest.json`。原始上传资料和六个资源条目内容/分享地址保持现有值，未新建资源编号。
- 本次改动集中在粉丝资源，另补齐共享发布清单对样式目录的收录，并按项目规则补充创意空间本地总记录与恢复指南；未执行提交、打标签、推送或线上部署。

### 发现、原因与处理

| 发现 | 原因 / 影响 | 已完成的处理 |
| --- | --- | --- |
| 请求失败与“暂无资料”混淆，无法重试 | `fetch` 异常被吞掉，错误 JSON/HTTP 503 仍保留“资源整理中” | 明确加载、空目录和失败状态，增加 10 秒超时、重试及 `file://` 打开提示；总数未确定时用 `—` |
| 复制后键盘焦点落到 `body` | 原脚本禁用当前按钮，兼容复制移除选中文本框后不恢复焦点 | 以忙碌标志与 `aria-disabled` 防重复请求；恢复兼容复制前的焦点，保持键盘操作连续 |
| 复制失败提示太快消失 | 错误仅写入按钮，1.6 秒后复原；固定 aria-label 也不能完整表达结果 | 独立 `role=status` 通知；失败说明持续可见，可重试/手动复制；空目标有反馈 |
| Hermes 下载地址只是代码文字 | 粉丝必须复制地址后另行打开，缺少直接入口 | 保留复制目标 ID，把地址改为真实外链 |
| Giffgaff 返回链接标签与目标不一致 | `../../` 返回粉丝资源，aria-label 却写“返回创意空间首页” | 修正标签并补充页脚返回资源列表 |
| 数据约束不完整 | 重复编号/id、非法日期与越界地址缺少统一校验；总数可能包含无法展示的条目 | 浏览器与 Node 共用 `scripts/catalog.js`，校验后才渲染；补齐本地页面依赖检查 |
| 按号定位与小屏操作可改善 | 只有逐条浏览，重复的“查看完整资料”读屏名称无法区分条目；原按钮仅 30px 高 | 新增编号/关键词搜索、匹配数/清空；链接名称包含编号和标题；44px 操作高度、手机分行卡片和可见焦点 |

复现证据：改动前新增浏览器回归的 HTTP 503、兼容复制焦点、Hermes 下载入口三个场景均失败；修复后均通过。列表与剪贴板的现有基础测试在修复前为通过，故本轮增加执行真实 DOM 和实际页面脚本的浏览器测试，不以静态字符串断言代替交互验证。

### 实现决策

- 资源继续使用一份 JSON；增加小型 `scripts/catalog.js`（校验、排序、搜索）与 `scripts/resources.js`（页面状态和加载）以隔离职责，不引入运行时库或构建步骤。
- DOM 内容继续使用 `textContent`；详情地址只能指向本项目 `./资源/<资料名>/`。数据错误显式报错，不静默丢条目。
- 请求与 JSON 正文共用超时边界；超时后迟到的旧响应不会覆盖重试结果。
- `styles/common.css` 只统一焦点、触屏、顶部导航及复制反馈，各详情页的内容和视觉布局仍在自己的 HTML 中。
- 保留旧 Mac 软件库兼容路由及查询/锚点逻辑；该项目继续为平级独立项目。

### QA 结果与发布边界

- Node.js 24.20.0：`resources_test.js`、`catalog_validation_test.js`、`clipboard_test.js`、`legacy_routes_test.js`、`package_test.js` 五组全部通过。
- Playwright 1.62.1 + 本机 Chrome：`node --test 测试/browser_test.cjs` **21/21 通过**。覆盖 HTTP/JSON/schema/网络/超时故障与重试、空目录、搜索、禁用 JavaScript、本地文件打开、过期响应、HTML 文本显示安全、复制多次激活、空内容、持续失败提示与再次成功。
- 六个详情页的 8 个复制按钮，逐一在 5 种受控剪贴板模式下执行实际 DOM 和页面脚本；确认复制值、回退结果、焦点与临时文本框清理。此处是浏览器内受控接口测试，不等同于所有设备的系统剪贴板授权测试。
- 列表与六个详情页在 320、375、768、820、1280 像素宽度验收，共 35 个页面/尺寸组合无内容或交互控件溢出；查看了桌面/手机列表和 Hermes 页截图。
- 首轮统一门禁 `node ../scripts/check-all.cjs` 为 **38/40 组通过**，当时粉丝资源四组均通过；当时剩余为超级玛丽 `build_test.js`（产物与当前源码构建不一致）及 `harness.js`（进入 play、水平动量、生命扣减、超时场景）。这些文件由独立项目维护，本次未跨项目改动。
- 首轮三国现行引擎：`current_engine_test.js`、`engine_audit_test.js`、`snapshot_recovery_test.js` 通过；历史单文件：`three_kingdoms_smoke.js`、`three_kingdoms_test.js` 通过。本次门禁未设置 `TEST_PYTHON`，不含图集像素验证。
- 浏览器报告 `测试/.artifacts/browser-results.log`，全仓报告 `测试/.artifacts/all-checks.log`，截图同目录，均忽略提交；无外部网盘文件有效性复核、无 Pages 线上验收，不能据此宣称整个站点已可发布。

- 共享仓库的其他项目在本轮期间仍有工作区更新，门禁用例总数从 40 增至 43。修正共享打包清单并增加 `package_test.js` 后，**最后一次门禁为 41/43 组通过，粉丝资源五组全部通过**；失败转为首页 `version_catalog_test.js`（部署版本标记断言）与三国现行 `engine_audit_test.js`。以最终日志为本轮终检依据，不把其他项目的阶段性结果描述为永久状态。
- 终检中三国现行 `current_engine_test.js`、`snapshot_recovery_test.js` 通过，`engine_audit_test.js` 失败；历史单文件 `three_kingdoms_smoke.js`、`three_kingdoms_test.js` 通过。本项目不修改这些兄弟项目的业务代码。
- 收尾发现共享打包脚本仅收录 scripts/资源，遗漏新的 styles/；增加隔离发布包测试先复现缺失，再补齐白名单。测试实际执行共享打包器，验证 8 个页面、目录数据及其全部本地 JS/CSS 逐字节一致，并验证历史/测试文件不进入发布包。

### 后续方向

- 发版时复核第三方分享实际内容，并确保新的 JS/CSS 随页面进入 `.site/`；先处理独立项目门禁问题再走统一发布。
- 资源量增加后再按实际内容引入分类字段和筛选。本轮已实现适合当前规模的搜索，不维护第二份静态资源目录。

## v0.8.0 · 发布验收记录（2026-10-27）

- 发布基线为远程 `main` 提交 `03ae9907009871bf8ccf9a0872e38e17d9840e10`，在独立工作树汇入本轮粉丝资源变更及共享打包白名单的一行补齐。
- 发布内容：编号/关键词搜索、可靠加载与重试、数据约束、复制焦点与持久失败提示、Hermes 可点击入口、手机交互样式。
- 统一门禁 **44/44 组通过（含图集像素验证）**；粉丝资源五组基础测试与 **21/21 项浏览器回归**通过，35 个页面/尺寸组合通过。
- 三国现行 `current_engine_test.js`、`engine_audit_test.js`、`snapshot_recovery_test.js` 与历史单文件 `three_kingdoms_smoke.js`、`three_kingdoms_test.js` 在发布基线中分别通过。前述 41/43 是共享开发工作区的历史检查结果，不代表本次隔离发布的检查结果。
- 真实发布包包含 1745 个文件、约 45.7 MiB，全部静态引用检查通过；隔离发布包回归确认粉丝资源 8 个页面及 JSON、JS、CSS 完整交付。
- 标签为 `content/fan-resources/v0.8.0`，推送到 `main` 后由 Actions 执行全仓测试、Pages 部署与提交标记验收。

### 最新工作区 SHA-256（2026-10-27）

本节为本次发布源码校验；之前的审查结果按历史保留。`project.md` 不固化自身哈希。

- `README.md`：`8ce56d3b87d2e5c2d01520a79168287e0aae4b374c7cf8b416f56deead53036d`
- `index.html`：`fd667635c3684408ee98469c0c59180779c1d5a783f3b23700f6484fdd87d038`
- `resources.json`：`0bf1c537a31657a8423f7caf77b9c4ff9ebde0fc41b49a7a81c65762edf554fc`
- `更新记录.md`：`2cc3c4df1d5bfa8472d10291d9136292d4875a869fd0857f507a76b3171bed7c`
- `scripts/catalog.js`：`a4f9c56dd8cb25fa640d43245f33347295ebdade2d45208dfc164dae897a4357`
- `scripts/copy.js`：`f50e4cf705027cbecfadf17cc123c361d1fa85a7af16f68e8eb6608963cf5abf`
- `scripts/resources.js`：`d1137a66fb8389cc2c164b07527dc8201ba57c81662a1961674e9fd8ff0b8b58`
- `styles/common.css`：`aa1b17a115758040f8ffa8f7978297f8e68e91f6c98816ca54748aca0fdbd79d`
- `资源/Codex生图执行规范/index.html`：`82deed72660518cf6d3027740cb2aee6b8caf808ffde63084d23a6be81d61715`
- `资源/Mac软件资源库/index.html`：`88a94a82822208403f9bc6c72b3a077d3a035c1178235c587837430f3095bacf`
- `资源/giffgaff保命资料/index.html`：`2b3c52d7f04911ce4e63357c1d03a1f2a7db4af38c0f03aaecac3313a68faf82`
- `资源/iStoreOS安装OpenClash/index.html`：`cc8aa452bbeff5072cb27bdd4efcda8345cdd08044deba77b70b63630efc5295`
- `资源/名人智囊团Hermes安装包/index.html`：`358dcabe01140b918629baabacabc0f6c85c3911d505d926bf4fc7657137b38d`
- `资源/汉化Codex和ClaudeCode工具/index.html`：`222dbcb1fea7da6a4088e29a7e24dd9a1a2fe1ef2eaaa36e12652e1b3f222eda`
- `资源/自动剪辑视频技能包/index.html`：`fd26215ce8c75e34eab1da9f026e7f86c25334d0a151989d86b6dadcab16c00c`
- `测试/browser_test.cjs`：`1e8260448c78906c74507a999ca965f805d742e8c6567a13033d1ee2684e39b3`
- `测试/catalog_validation_test.js`：`fc24dd8e9db6f2b92f27ab5e39a86df96a6564dcd8577c1fdca37ec6592af09c`
- `测试/clipboard_test.js`：`ad0da3f9af2df08745929f97f5d7da483d1136c965c570cb5199eb5032954a46`
- `测试/legacy_routes_test.js`：`b8fb008293855e5c108257a9257e4102ae3981b0bc673df6a41521b5579afed0`
- `测试/package_test.js`：`f5aec9741cb2caf6b59a365ec39bd27e37f7ae5a18c51decfe3115271e177845`
- `测试/resources_test.js`：`146d34a8da2b1a5e68f74fca0d74c4d15d967d2c1aa46780ed75f03699352e7f`
- `../scripts/build-site.cjs`：`33b7a8aca2ab0c637b7df8da91a3a09c509818eceeb18438bc90984f4b0a0503`
