# 超级玛丽 · project.md

## 定位

创意空间子项目：超级玛丽风格的像素平台跳跃游戏实验。

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

- `index.html`：`97aef4fb4a3118cad8384cad4d683bf977ba4151225736fe178f31ceba146a94`
- `src/00_head.html`：`c544d0538d6aa4137cd08588858ca9c9932b526251a1445300672748997d0134`
- `src/75_render.js`：`034a34f721a485dad5a87ef4c92817ab37fea7bd6b5a0a3a0c94bf965e081b91`
- `test/harness.js`：`bd0a77adb5b844dd1c552013ade74365b68897255605cba1e6c1e099d3d13716`
