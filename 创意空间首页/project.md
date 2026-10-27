# 创意空间首页 · project.md

> 本文件记录「创意空间首页」的交付规格、处理决策、QA 结果与源文件校验；按全局项目记录规则维护，有重要变化时追加。

## 定位

「创意空间首页」是创意空间的 GitHub Pages 起始页 / 创意中心，统一展示各子项目板块、创意目录、粉丝资源与社群入口。

> 2026-08-28：粉丝资源拆分为独立子项目 `粉丝资源/`，首页只读取展示，不再维护资源内容。

## 当前交付规格（2026-10-27，v0.5.3）

- 常驻「粉丝资源 / Fan Resources」区块：位于创意库与关于博主之间。
- 创意库新增平级卡片「Mac 软件资源库」：入口 `../Mac软件资源库/`，目录项使用 `resource/mac-software-library/vX.Y.Z` 标签命名空间与 `RESOURCE` 卡片标识。
- 数据源：`../粉丝资源/resources.json`，由粉丝资源子项目维护；首页区分加载中、空目录和错误，失败可重试。
- 资源列表为紧凑一行一条：日期、标题、补充说明与「查看完整资料」小号入口；点击进入独立资料页。
- 首页资源卡以 `../粉丝资源/` 为基准解析详情地址并校验目录范围；标题和详情入口均可点击。
- 数据格式与详情页校验：`../粉丝资源/测试/resources_test.js`；首页回归：`测试/game_center_test.js`、`测试/version_catalog_test.js`。
- 关于博主与社群入口已整合成单个紧凑模块，QQ 二维码与 QQ 群号合并展示，Telegram 群组并排。
- 新增板块导航：首页 / 坦克大战 / 三国 / 超级玛丽 / 墨水屏小站 / Mac 软件资源库 / 粉丝资源。
- 墨水屏小站由外部链接改为站内 `/TK/墨水屏小站/`，版本 `v0.4.0`。
- Pages 只由 `main` 推送触发；版本标签不再触发独立部署，避免受保护环境拒绝标签和并发取消。
- 每次 Pages 部署写入 `deployment-meta.json`，并执行 `测试/published_site_test.mjs` 验收部署提交、七个入口、资源数据、Mac 软件资源库与详情页。

## 处理决策

- 首页只维护常驻资源索引，独立详情页归粉丝资源项目。
- 资源数据与资料页迁移到 `粉丝资源/`，首页不重复维护，避免两处手改。
- 沿用游戏目录「JSON + 首页动态渲染」的既有模式，不引入后端或新依赖。
- 首页版本确认时归档旧源码到 `历史版本/`；本次 v0.5.1 已归档 v0.5.0。

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
- 实际验证：GitHub Actions Run 50（提交 `c5caf11`）成功，线上验收脚本通过；自动剪辑视频技能包 `02` 和详情页已上线。

## QA 结果（2026-09-10，v0.5.1）

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

## 2026-10-26 · 全项目审查修复（本地待发布）

### 决策与修复

- 目录生成器只读取当前 `HEAD` 可达的稳定标签，避免未合并分支或后续版本标签污染旧版本部署。Git 查询固定使用脚本所在仓库，支持从其它目录调用。
- 重新生成 `game-catalog.json`，纠正 Mac 软件资源库已打标签却仍显示“资源库”的状态漂移。
- 版本回归改为校验模板、可达标签与目录快照一致；当前版本值不再硬编码到断言中。
- 修改前源码归档于 `历史版本/2026-10-26-review-before/`；本轮未创建版本标签或执行发布。

### QA

- 新增 `node 测试/catalog_history_test.js`：真实临时 Git 仓库覆盖未合并标签、带注释标签、语义版本排序、无标签回退、异地调用和旧提交检出；修复前复现 `v9.0.0 != v1.10.0`，修复后通过。
- `node 测试/version_catalog_test.js`：修复前复现 Mac 状态“资源库 / 稳定版”漂移，重新生成后通过。
- `node 测试/game_center_test.js`：通过。

### 本轮源文件 SHA-256

- `scripts/generate-game-catalog.cjs`：`774255a76dd36665ccd240f95d17274c592fdbfec42b3381f867a43f0bab8cfd`
- `game-catalog.json`：`2d4c6d0b3a1696be8455c370142c7f5e93006fe4a8e64b36312234f008f7cb38`
- `测试/version_catalog_test.js`：`bed848acaf9b5bcc85a06532dd8dfe9d1513bb967565ee5c79f4935e026e3410`
- `测试/catalog_history_test.js`：`033b1914e6aaaf9ea81c5e6a9a86612d1892df7083f4bdba5cc847e11c3a14ff`

### 本轮浏览器复核补充

- 真实浏览器确认五张创意卡、六条粉丝资源和站内相对路径正确；Mac 目录状态为稳定版。
- 375px iframe 视口复现编号 06 长标题右侧裁切，补充手机标题换行与内容宽度后截图确认完整显示。`index.html` 修改前源码已加入本轮归档。
- 页面网络异常、HTTP 失败、JSON 解析失败三种情形，执行实际内嵌脚本确认保留五张静态卡与数量 05。
- QQ 群号点击确实整段选中；当前无微信入口。B站链接仍为未配置 UID 的 `https://space.bilibili.com/`，需要用户提供真实主页 URL 后补齐，未猜测账号。
- 临时手机视口测试壳、浏览器标签及本地测试服务均已清理。
- `index.html` SHA-256：`ed532c4e4330da694f7855f05ecfa92334389895e27a25d6bab0d658ad7271a5`。

### 2026-10-26 发布验收补充

- 验收跟随根/三国跳转并检查运行脚本、软件数据、三国小写 `assets/data/system.json`，空目录或缺运行文件失败；旧提交 HTTP 200 也重试。
- 负面 HTTP 夹具 10/10：完整站点、六种关键文件缺失、旧提交重试、两种空目录。夹具逐层验证大小写，避免 macOS 容忍而 Pages 404。
- 共享 CI 在打包前运行全部项目回归，`main` 是唯一可部署分支；`.site/` 1742 文件约 45.7 MiB，静态引用检查通过。
- 七项目浏览器验收 14/14（桌面+手机视口）；发布包 HTTP 验收通过（15 页、10 脚本）。
- 本轮只读检查了线上提交 `6044041`，实际入口/数据/脚本可访问；它不包含本次本地修复。本轮没有运行新的 Actions 部署。

- `测试/published_site_test.mjs`：`62535de74df945738eb7f212a0d12bbc26595dcccef9c83a33bb21fb28d74d45`
- `测试/published_verifier_test.mjs`：`2bf8fbd38148b08a6c7ddd2387a5b0ba57cad289fbca114ea2b09cf8da17b38b`
- `测试/site_package_test.cjs`：`2640631fb72f9edb5a59e36169438ac67ffebcf84b5fb214ac494c33560b89eb`

## 2026-10-27 · B站主页线索核对（待分享链接）

- 用户补充昵称 `bili_52913016083`，不确定 UID。
- 读取官方用户搜索：完整昵称及数字部分均未显示匹配用户；Bing 精确昵称检索无结果。官方用户搜索 API 请求被 HTTP 412 拒绝，未据此猜测账号。
- 只读验证候选空间 `https://space.bilibili.com/52913016083`，页面显示 `错误码：-404 / UPINFO_ERROR: 啥都木有`；该数字不能作为已确认 UID。
- 未修改 `index.html` 的 B站入口，未提交或发布。下一步需要用户从 B站个人空间复制分享链接，短链接或完整分享文字均可用于继续解析。
- 本轮仅更新记录，不替换源码，因此没有新增源码归档；源码 SHA-256 沿用上一节。

## 2026-10-27 · B站个人空间入口补齐

- 用户提供准确主页 `https://space.bilibili.com/2053159491`；真实浏览器确认显示“大海的科技宝箱”，个人资料 UID 为 `2053159491`，简介链接回创意空间。
- 将首页 B站按钮的通用域名替换为该个人空间地址，保留新标签打开与 `noopener noreferrer`。
- 修改前首页已归档到 `历史版本/2026-10-27-before-bilibili-link/index.html`；此项审查待办关闭。
- `node 测试/game_center_test.js` 通过；发布包重建和 `site_package_test.cjs` 通过。源码与发布包 B站链接均检查为用户提供的准确地址。
- 当前 `index.html` SHA-256：`534cbf9d82b44080af518735a94e7c7f9e554a7b0cf56ff169d9c14ca1a21c8d`。本轮未提交、推送或部署。

## 2026-10-27 · 统一补丁发布 v0.5.2

- 交付：首页手机布局、B站主页、可达标签目录与发布验收。标签：`site/home/v0.5.2`。
- 本轮发布使用已验收恢复快照，排除共享工作区中其他对话正在继续的修改；历史章节中的“未发布”指当时状态。
- 发布前在干净检出中执行统一门禁，部署后按预期提交号验收。发布记录：`../docs/发布/2026-10-27/project.md`。

- 2026-10-27 发布验收完成：`site/home/v0.5.2` 已推送，main首轮部署 `41a4193` 的 [Actions 40521986517](https://github.com/sunsharebay-lgtm/TK/actions/runs/40521986517) 成功；全站37组Linux检查及线上入口/数据/脚本验证通过。

## 2026-10-27 · 首页专项审查结果（本任务未发布）

### 交付与处理决策

- 按当前工作区完整源码审查，不重置此前待发布修改。首页业务、生成器及测试改动均留在本项目目录。
- 为 JSON 请求增加 8 秒超时；资料加载区分加载中、空目录、失败并可重试，常驻“全部资料”入口。
- 按条验证数据类型、有效 URL 与唯一编号/ID；只渲染有效条目；创意卡片全部无效时保留备用入口，数量在成功替换后更新。
- 资料标题可点击；桌面列表单行，手机编号、日期、详情入口同排。QQ 原图入口和等比缩略图已验证；B站 UID `2053159491` 保持正确。
- 删除首页遗留未调用的复制函数，将复制内容职责保留在粉丝资源子项目。页面定位文字统一为创意中心。
- 生成器隔离 Git 仓库环境变量，生成前验证模板字段，严格检查命名空间标签 SemVer。保留无命名空间的 `v0.4` 外部静态版本和未指定新窗口行为。
- 发布和本地包检查共用小型 HTML 引用提取器及交付清单；跟随站内 HTTP 跳转并按最终地址解析引用，区分经典脚本和模块语法，检查关键文件和数据。
- 发布负面夹具改用独立合成站点，明确区分预期失败与子进程超时/崩溃；测试临时产物放 `测试/.artifacts/`。

### QA

- 环境：Node `v24.20.0`。
- `node 测试/game_center_test.js`：静态契约及 14 项真实内嵌脚本行为回归通过。修复前已复现类型错误、误报空目录、挂起以及缺少标题链接。
- `node 测试/version_catalog_test.js`：通过；涵盖非法模板、URL、重复 ID、前导零标签和外部静态版本兼容。
- `node 测试/catalog_history_test.js`：通过；真实临时仓库覆盖未合并标签、旧提交、异地运行、外部 Git 环境变量、无效标签与配置失败保留旧文件。
- `node --test 测试/published_verifier_test.mjs`：48/48 通过；临时产物路径归位后单独复跑真实文件包用例通过。
- `node 测试/site_package_test.cjs 测试/.artifacts/package-review.x5QES1`：1742 文件、45.7 MiB，通过。此目录由既有发布包只读复制并覆盖本轮首页运行文件生成，未改写根 `.site/`。
- 真实浏览器：五张创意、六条资料正常；编号 02 标题跳转到自动剪辑视频技能包；拦截资源请求显示错误，解除后重试恢复全部条目；QQ 二维码打开 1174×1050 原图。
- 屏幕宽度 320/375/768/1024/1440 均无检测到的横向溢出或资源标题与入口重叠；768px 及以上六条资料均为 48px 行高。
- 首页内嵌脚本语法与 `git diff --check -- .`：通过。
- 截图：`测试/.artifacts/review-desktop-after.png`、`review-mobile-after.png`；布局测量：`测试/.artifacts/home-review-layouts.json`。

### 发布交接与限制

- 本任务未执行提交、标签或部署。前一节的统一发布流程与本节专项工作分开记录；本节是否上线须以最终部署提交与线上验收确认。
- 纳入发布时必须同时包含新增的 `测试/homepage_behavior_test.js`、`测试/site-validation.cjs`、`测试/fixtures/published-site.cjs`，现有测试会加载它们。
- HTML 提取器只负责本项目验收，不是通用 HTML5 DOM；脚本只解析语法，不执行跨项目运行逻辑、不递归解析模块 import。全站动态行为仍由各项目浏览器验收覆盖。
- 继续优化建议：资料更多时加入编号/标题搜索；如创意目录频繁变更，再评估构建时生成静态备用卡片。当前保留所有资料直接可见。

### 本轮源文件 SHA-256

- `index.html`：`0ab043ece4b34b5034c3a3a03750a6e2693d7148c6a179df8cb48a3e687b912d`
- `scripts/generate-game-catalog.cjs`：`72a6f8784f43dd84c7d16dabf51ccd9f81551516d2583df0491564f542e15409`
- `测试/game_center_test.js`：`a2831319a35119788362eb68e7d9c24d9f8590ba52214be9c57ea3c89d80efde`
- `测试/homepage_behavior_test.js`：`628b45e0b820d1e445b79be6f2e194adb4735d77403a46ea76fc7c36a3b63e72`
- `测试/version_catalog_test.js`：`c3a5c7ea50d4f4c7c2851b7981167dcc4157d0d0ce183b827b5ba58444831943`
- `测试/catalog_history_test.js`：`6c3fae9f402b85c679e61b5589fbb4b44904a971d6e1fbecfea3f55a76f8842f`
- `测试/published_site_test.mjs`：`6f2bbcc705404169c7a9bd9ff8f0522d468c3afcd6e3f304801a6be936f70137`
- `测试/published_verifier_test.mjs`：`fca1f676fa94a5f97e7799ab60a6aa70a347a0b5aec1888c3fb473877c27b797`
- `测试/site_package_test.cjs`：`bea04bc6684460ae8cfa4c25392653eaa0ba8f6530f57918c78b7eeae877c47c`
- `测试/site-validation.cjs`：`190099b129445209204c003f37e460272eaf3a04fcef8cf38c9be6fe6a719bcb`
- `测试/fixtures/published-site.cjs`：`f05bc70cc10851f9a0a16edd21a5b87d4f30cc4b9e7d9853192c8aaaa8ddda22`

## 2026-10-27 · 首页专项修复发布 v0.5.3

- 用户确认推送后，以远程 `main` 提交 `62f7711` 为基线建立独立发布工作区，保留 v0.5.2 已完成发布记录，仅纳入首页专项修复、其测试及归档。
- 版本标签：`site/home/v0.5.3`；前一稳定首页归档为 `历史版本/创意空间首页-v0.5.2.html`。
- 从该提交可达标签重新生成创意目录；未使用其他项目工作区中的待发布源码或手写版本号。
- 干净发布检出中 `TEST_PYTHON=python3 node scripts/check-all.cjs`：38/38 组通过，含首页 14 项行为、发布验收 48 项负面/兼容回归及图集像素验证。
- 重新生成 `.site/`，`site_package_test.cjs` 检查 1742 文件、45.7 MiB 通过；差异检查通过。
- 按“先推标签、后推 main”执行发布；线上完成以对应 Actions 成功与部署提交号、数据、脚本验收为准。
