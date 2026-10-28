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

## 2026-10-27 首页专项审查（v0.5.3）

- 首页区分资料加载中、无资料和加载失败；网络或响应体超时为 8 秒，可点击重试，也始终保留「全部资料」入口。
- 创意与资料按条校验，忽略无效条目和重复编号；计数以实际渲染卡片为准。站内入口限制在部署目录内，资料详情限制在粉丝资源目录内。
- 资料标题和小号详情链接均可进入详情。桌面保留一行式列表；手机的编号、日期和入口同排，长标题自然换行。
- QQ 二维码可打开原尺寸图片，缩略图保持原比例；已核实的 B站入口保持不变。
- 页面只承担展示，资料正文与一键复制归粉丝资源子项目；已移除首页不再调用的旧复制函数。
- 目录模板在生成前校验必需字段、重复 ID、链接及版本状态；Git 查询隔离仓库环境变量，忽略带前导零的稳定标签，保留外部项目静态版本兼容。
- 发布与包验收共用 `测试/site-validation.cjs`，核对核心文件、数据、脚本语法和跳转范围。`site_package_test.cjs` 可带一个包目录参数，便于在本项目测试目录中检查副本。

### 预览与验证

首页需要通过 HTTP 预览才能读取 JSON。可在本项目目录运行：

```sh
python3 -m http.server 8127 --bind 127.0.0.1 --directory ..
```

访问 <http://127.0.0.1:8127/创意空间首页/>；如端口占用，换一个空闲端口。直接打开 `index.html` 时浏览器可能禁止读取 JSON，不能据此判断线上资源是否缺失。

```sh
node 测试/game_center_test.js
node 测试/version_catalog_test.js
node 测试/catalog_history_test.js
node --test 测试/published_verifier_test.mjs
```

`game_center_test.js` 会运行 `homepage_behavior_test.js`，直接执行首页脚本，覆盖正常数据、坏条目、链接范围、失败重试、请求和响应体超时。浏览器截图在 `测试/.artifacts/`；历史版本只保留源码快照。详细证据和发布交接见 [专项审查记录](文档/2026-10-27-首页源码审查.md)。

上一轮统一补丁：`site/home/v0.5.2`（2026-10-27），内容与验收见 [统一发布记录](../docs/发布/2026-10-27/project.md)。本轮首页专项修复使用 `site/home/v0.5.3`，发布验收见本项目 `project.md` 末尾。

## 2026-10-28 YouTube 频道入口

YouTube 入口使用博主提供的频道 ID `UCurHjCw5_hnyCfZa721MENA`，替换已失效的 `@sunsharebay` 地址。
