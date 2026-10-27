# 坦克大战

经典即时战斗网页游戏，Canvas 实现。核心玩法仍保持单页运行，Blender 离线产出的本地精灵图集随页面静态部署。

- 当前发布版本：`v1.6.13`（`tank-battle.html`），包含完整源码审查修复，保留 Blender 预渲染 2.5D 坦克美术。
- 入口：`tank-battle.html`；`坦克大战.html` 是旧中文入口兼容跳转。
- 测试：`测试/`（冒烟、地图校验、Blender 图集完整性等脚本）。
- 美术源文件：`美术/blender/tank-sprites-v1.blend`；重新渲染命令见同目录 `render_tank_sprite_sheet.py` 文件头。
- 版本：Git 标签 `game/tank-battle/vX.Y.Z`，首页在 `main` 部署时自动联动。

## 工作边界

- 所有源码、测试、历史版本都放本文件夹，不跨到兄弟项目。
- 有版本更新时：在 `更新记录.md` 末尾追加，并把旧源码归档到 `历史版本/`。

## Blender 美术与恢复

- 网页使用 `assets/blender/tank-sprites-v2.png`：1024×1152，九种皮肤、四方向、两帧履带，每格 128px。约 1.35 MB，不需要玩家安装 Blender。
- `美术/blender/tank-sprites-v1.blend` 是当前可编辑源文件，文件名沿用初稿；脚本输出的 PNG 已升级为 v2。
- 依赖：Blender（本机已用 5.2.1 LTS 渲染）、Node.js、Python 3；像素检查需 Pillow（本机 11.3.0）。网页运行无构建依赖。
- 恢复时保留 HTML 与 `assets/` 的相对位置。重新生成素材前先归档旧源文件，再执行以下命令。

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python 美术/blender/render_tank_sprite_sheet.py
node 测试/blender_art_test.js
python3 测试/blender_pixels_test.py
node 测试/blender_loader_test.js
node 测试/smoke_test.js tank-battle.html
node 测试/validate_maps.js tank-battle.html
node 测试/input_release_test.js
node 测试/gamepad_test.js tank-battle.html
```

浏览器逐帧验收：在本目录启动 `python3 -m http.server 8124 --bind 127.0.0.1`，打开 `/测试/blender-browser.html`，确认 PASS 并检查实战画面；验收后停止服务。日常试玩可以直接打开 `tank-battle.html`。

## 经验与历史

- 2026-09-06 初稿曾出现半辆坦克：相机中心未对齐整张图集，且原型集合重复参与渲染。归档在 `历史版本/v1.7.0-blender-初稿/`。
- 不要只验证 PNG 头部尺寸：必须检查每一格的透明边距、中心、连通轮廓、炮口方向，以及浏览器最终切片。
- 不要把高分辨率素材预先压成 32px。保留 128px 切片，最终绘制为逻辑 32px，避免先缩小再放大的细节损失。
- 每轮交付决策、QA 和 SHA-256 见 `project.md`，历史阶段见 `更新记录.md`。当前稳定发布版为 `v1.6.12`。
- 2026-10-26 本地维护：窗口失焦/切后台同时清理键盘、触屏摇杆、开火与未消费的按键事件；手柄断开后重置边沿历史，权限不可用时回退键盘。`input_release_test.js` 覆盖这类输入卡住问题。

本轮补丁发布：`game/tank-battle/v1.6.12`（2026-10-27），内容与验收见 [统一发布记录](../docs/发布/2026-10-27/project.md)。

## 2026-10-27 专项源码审查

- 本轮继续完善当前工作区：战役恢复、胜负判定、基地自卫、磁场、首领齐射、复活、触控与后台音频；修复清单和后续方向见 [源码审查记录](测试/源码审查-2026-10-27.md)。
- 本轮完整修复以 `game/tank-battle/v1.6.13` 发布；发布进度、最终源码哈希与验收结果见 `project.md` 最新章节。
- 存档键保持 `steel_frontline_v2`，内部结构升级到 schema 3 并兼容旧存档。存档是关卡级检查点，不是逐帧战场快照；结算节点恢复会正确进入下一关或通关界面。
- `历史版本/2026-10-27-source-audit-before/tank-battle.html` 保留本轮修改前的源码，包括上一轮已有但未提交的修复。

### 日常回归

```sh
node 测试/run_all.cjs
node --test 测试/source_audit_test.js
python3 测试/blender_pixels_test.py
node 测试/browser_audit_test.cjs
```

- 前两个命令只需 Node.js 18+，统一入口运行 17 组 Node 回归，其中新增专项包含 27 个行为场景。
- Python 像素检查需要 Pillow；系统 Python 未安装时可使用已带 Pillow 的 Codex 工作区 Python，不必改系统环境。
- 浏览器回归需要 Playwright 和 Google Chrome；用 `PLAYWRIGHT_MODULE=/绝对路径/node_modules/playwright` 指定已有依赖。临时依赖只能放 `测试/.artifacts/`，不随网页部署。
- 浏览器脚本自动启动随机端口的回环服务，完成后关闭服务和独立 Chrome。覆盖键盘、真实浏览器触摸事件、横竖屏、存档、素材回退与侧栏文字边界。
- 截图与机器报告保存在忽略目录 `测试/.artifacts/`，报告记录受测 HTML 的 SHA-256。`file://` 可以试玩，但素材会使画布像素读取受同源限制，像素验收使用临时 HTTP 服务。
- 不用随机重跑掩盖失败：火力/掉落专项固定种子；首领齐射必须检查实际弹道，不能只验证名字或布尔常量。

## v1.6.13 发布

- 2026-10-27 按小更新发布完整审查修复。发布基线为远端 `main`，仅纳入坦克大战及必要的共享交接记录。
- 前一线上源码归档为 `历史版本/坦克大战-v1.6.12.html`；历史章节中的 v1.6.12 与未推送说明保留当时记录，最新状态以 `project.md` 为准。
- 首页版本由标签自动生成，Pages 继续由 `main` 部署。
