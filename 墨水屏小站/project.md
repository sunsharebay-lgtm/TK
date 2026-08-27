# 墨水屏小站 · project.md

## 定位

创意空间子项目，把闲置 Kindle 墨水屏变成信息屏，兼容老旧 WebKit 浏览器。

## 交付规格（v0.4.0）

- 单文件 `index.html`，无外部脚本/样式/图片依赖。
- 5 个页面：时钟主页、微信读书入口、番茄钟、阅读清单、城市设置。
- 兼容约束：ES5、无 `fetch`/`Promise`、使用 XMLHttpRequest 更新天气、cookie 保存设置。
- 项目版本为 `v0.4.0`，页面文案保留 `v0.4`。
- 冒烟测试：`测试/smoke_test.js`。

## 处理决策

- 2026-08-28 从外部仓库 `sunsharebay-lgtm/idle-screen` 迁入创意空间，线上入口从外部域名改为站内 `/TK/墨水屏小站/`。
- 外部仓库保留为历史来源；创意空间内文件夹成为后续唯一维护源。

## QA 结果（v0.4.0，迁移后）

- 冒烟测试通过：入口存在、无 fetch/Promise、版本号统一、无外部资源依赖。
- 源文件 SHA-256 见下方补充；

## 源文件 SHA-256

- `index.html`：`d71ba0bddbf40a5612271edd19aa0ada15fbbded4090adbb6b7e75bcbee997fd`
- `测试/smoke_test.js`：`9acfc033b949d5f39208886067147760943bc89218ceb97d90a7dfeb87592b58`
