# 超级玛丽 · project.md

## 定位

创意空间子项目：超级玛丽风格的像素平台跳跃游戏实验。

## 当前状态

- **待开发（暂停推进）**：当前 `v0.1.0` 保留为可运行存档，后续可能从头重新设计，不继续在此版本上扩展。

## 交付规格（v0.1.0）

- 分片源码 `src/` + 构建脚本 `build.sh`，产物 `index.html`。
- 4 大关卡、变身系统与隐藏道具。
- 无头测试：`test/harness.js`。

## 处理决策

- 保持分片源码可读、可测试；构建产物随仓库一起提交，浏览器可直接打开。
- 版本由 `game/super-mario/vX.Y.Z` 标签管理；Pages 只由 `main` 推送部署。

## QA 结果（v0.1.0）

- 无头测试通过；构建脚本可生成完整 `index.html`。

## 源文件 SHA-256

- `index.html`：`ddbb6a4620517811a968af3213b89df8a7496b376191dcd899bcb974893723c9`
- `src/00_head.html`：`6603bf087d04881ea71031fc8eea2f17635661b18c3b0843246394449c0c0ee2`
- `src/75_render.js`：`6aeca3ee755c0264c80c96cd8acc474be7f88dcc5bbe37666bb2f91ad88c0499`
- `test/harness.js`：`bd0a77adb5b844dd1c552013ade74365b68897255605cba1e6c1e099d3d13716`

## 2026-10-26 · 全项目审查修复（本地，待统一发布）

- 修复手柄松开/断开后持续移动、手柄与触屏无法在标题确认，以及混合输入互相覆盖。
- 窗口失焦或切后台清理持续输入和确认事件；全屏 API 缺失/拒绝时正常回退。
- 构建改为先校验单片及合并脚本，再原子替换产物；失败保留上一份可运行 HTML。
- 维护现有可运行存档，保持暂停新增玩法的定位。

### 本轮 QA

- 红灯复现：`test/input_test.js` 手柄松开仍为 true；`test/build_test.js` 语法失败覆盖旧 HTML。修复后均通过。
- `node test/input_test.js`：8 组输入行为通过；`node test/build_test.js`：失败保护及产物一致性通过。
- `bash build.sh`、`node test/harness.js`：成功构建，111 项玩法断言全部通过。
- 1-3 关机器人探索未通关，只作为日志；不声称四关均已自动通关。

- 修改前源码保留在 `历史版本/2026-10-26-review-before/`，相对目录不变。
- 本轮未创建版本标签，尚未代表线上发布。

### 本轮源文件 SHA-256

- `src/10_core.js`：`ee103be10ec3a31f9d169d0bc2f045b0a24a354dc38e8365e2e2ab39c5fb2c03`
- `build.sh`：`2c0f9f481bd48ffc72a9f0ad352f2e82e1e63d52947379d3dcc9fe23c721408f`
- `index.html`：`ada51ef2062eebe0f2171102ea2b9df8afb732a4aa9579cf919c30abd714ecf2`
- `test/input_test.js`：`9bab13f4f454ba7f6a1433659b7da994164e23dc11d68127883827bbe75691f6`
- `test/build_test.js`：`eebc6207c92b0c687f50593f96d677aa21b641d62172c52b6d07c7ee8bb365f6`
