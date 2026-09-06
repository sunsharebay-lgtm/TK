# 坦克大战

经典即时战斗网页游戏，Canvas 实现。核心玩法仍保持单页运行，Blender 离线产出的本地精灵图集随页面静态部署。

- 当前稳定版：`v1.6.11`（`tank-battle.html`），加入 Blender 预渲染 2.5D 坦克美术。
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
```

浏览器逐帧验收：在本目录启动 `python3 -m http.server 8124 --bind 127.0.0.1`，打开 `/测试/blender-browser.html`，确认 PASS 并检查实战画面；验收后停止服务。日常试玩可以直接打开 `tank-battle.html`。

## 经验与历史

- 2026-09-06 初稿曾出现半辆坦克：相机中心未对齐整张图集，且原型集合重复参与渲染。归档在 `历史版本/v1.7.0-blender-初稿/`。
- 不要只验证 PNG 头部尺寸：必须检查每一格的透明边距、中心、连通轮廓、炮口方向，以及浏览器最终切片。
- 不要把高分辨率素材预先压成 32px。保留 128px 切片，最终绘制为逻辑 32px，避免先缩小再放大的细节损失。
- 每轮交付决策、QA 和 SHA-256 见 `project.md`，历史阶段见 `更新记录.md`。当前稳定发布版为 `v1.6.11`。
