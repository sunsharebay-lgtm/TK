# 坦克大战 · project.md

## 定位

创意空间子项目：单文件 Canvas 坦克大战。

## 交付规格（v1.6.11）

- 当前稳定版 `tank-battle.html`：Canvas 战斗逻辑不变，新增同目录静态 Blender 图集；图集不能加载时自动使用程序化坦克精灵。
- 双炮射速修正、敌我炮弹对消、老鹰护甲、静电磁场继承、关卡自由选择、地狱绝境入口。
- Blender 源文件 `美术/blender/tank-sprites-v1.blend` 和重渲染脚本均在本项目内；当前图集 `assets/blender/tank-sprites-v2.png` 为 8×9 组 128px 精灵（两帧履带 × 四方向 × 九种皮肤）。
- 冒烟、地图校验与 Blender 图集完整性测试位于 `测试/`。

## 处理决策

- 版本由 `game/tank-battle/vX.Y.Z` 标签管理，普通提交不 bump 版本。
- 旧版源码逐一归档到 `历史版本/`。
- 采用 Blender 离线预渲染而不是实时 3D：保持战场可读性、手机性能和网页点击即玩的交付方式。

## 2026-09-06 美术修复决策

- 用户指出初稿出现半辆坦克且清晰度不足，复查确认相机中心错位、原型集合重复渲染、加载器过早缩图三个问题。
- 相机按整张图集中心计算，仅渲染原型实例；增大车体有效占比，缩短炮管，强化舱盖、履带、格栅和阵营标识。
- 原生 128px 切片保留到最终绘制；普通、受击与标题动画统一绘制助手；逻辑尺寸仍为 32px，碰撞规则未改。
- 图集尺寸必须精确匹配；缺图、旧图集、错误尺寸时保留程序化精灵回退。
- 初稿 HTML、PNG、Blender 文件、生成脚本已归档到 `历史版本/v1.7.0-blender-初稿/`。

## QA 结果（2026-09-06）

- `blender_pixels_test.py`：旧图集检查出现 265 项失败；新图集 72 帧全部通过中心、透明边距、连通轮廓和炮口方向检查。
- `blender_art_test.js`：通过，图集 1024×1152、源文件与网页引用一致。
- `blender_loader_test.js`：通过，72 格裁剪坐标、128px 存储、32px 逻辑绘制、回退和绘制上下文恢复。
- 浏览器 `测试/blender-browser.html`：PASS，72 帧 2倍画布像素检查，普通及受击绘制共 144 组通过。
- `smoke_test.js tank-battle.html`：通过，16 张地图、6 关战役。
- `validate_maps.js tank-battle.html`：全部通过。
- `feature_test.js tank-battle.html`、`power_test.js tank-battle.html`：全部通过，覆盖关卡特性、火力、护甲、双炮、磁场和继承等规则。
- 素材裁剪对照图：`测试/blender-before-after.png`，通过 `python3 测试/blender_comparison.py` 生成；是素材示意，不是实战截图。
- 实际游戏桌面与 844×390 手机横屏视口截图检查：车体完整，战场在视口内；不等同于手机真机性能或触控手感验收。
- 本次浏览器短按键测试未取得可靠的位移/发射证据，不计为操作验收通过；核心玩法仍以现有回归测试为准。
- 美术仍是俯视风格化预渲染，并非写实高模最终稿。本次按小更新规则发布为 v1.6.11。

## 源文件 SHA-256

```text
9f7f0a83056032962d8d364c060ef12709c4d991a3c742c5d3196ddb31e8ce20  tank-battle.html
123f21547dc74d3094adcfc50a29d8da1994d65397d9c693ca49496ac5b0e58d  美术/blender/render_tank_sprite_sheet.py
8cf5370693d6ba8c58e0da9664537184cd5859f596a3fd31cb3673e9c2723e70  美术/blender/tank-sprites-v1.blend
318dc85951245b77d4ad4ea22a1520c1d391459f3da6402239e771b48edeeb9d  assets/blender/tank-sprites-v2.png
```
