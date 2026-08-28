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
- 版本由 `game/super-mario/vX.Y.Z` 标签管理。

## QA 结果（v0.1.0）

- 无头测试通过；构建脚本可生成完整 `index.html`。

## 源文件 SHA-256

- `index.html`：`ddbb6a4620517811a968af3213b89df8a7496b376191dcd899bcb974893723c9`
- `src/00_head.html`：`6603bf087d04881ea71031fc8eea2f17635661b18c3b0843246394449c0c0ee2`
- `src/75_render.js`：`6aeca3ee755c0264c80c96cd8acc474be7f88dcc5bbe37666bb2f91ad88c0499`
- `test/harness.js`：`bd0a77adb5b844dd1c552013ade74365b68897255605cba1e6c1e099d3d13716`
