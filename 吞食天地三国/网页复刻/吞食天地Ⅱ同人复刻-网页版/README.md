# 吞食天地Ⅱ同人复刻 — 网页版

基于原作 TNW 引擎数据（RPG Maker MZ 格式 JSON）自研的纯浏览器运行时，无需任何原程序文件即可游玩。

## 启动方式

需要通过本地 HTTP 服务访问（浏览器安全策略禁止 file:// 下 fetch 资源）：

```bash
cd 吞食天地Ⅱ同人复刻-网页版
python3 -m http.server 8642
# 浏览器打开 http://localhost:8642
```

或使用启动脚本（自动起服务并打开浏览器）：

```bash
./启动游戏.sh
```

## 操作

| 按键 | 功能 |
|------|------|
| 方向键 / WASD | 移动、光标 |
| Enter / Space / Z / J | 确认、对话 |
| Esc / X / K | 取消、呼出菜单 |
| Shift | 加速移动 |
| Q / E | 翻页 |

移动端浏览器会自动显示触屏方向键。

## 调试参数（URL query）

- `?autostart` — 跳过标题直接开始新游戏
- `?autointro=N` — 每 N 帧自动按一次确认（自动推进开场剧情）
- `?goto=mapId,x,y` — 直接传送到指定地图坐标（配合 autostart）

示例：`http://localhost:8642/?autostart&goto=159,14,7`

## 目录结构

```
index.html          页面外壳（画布、触屏按钮）
js/
  core.js           输入、音频、图像、字体、缩放
  data.js           DataManager、游戏状态类（Party/Switches/Variables…）、存读档
  interp.js         事件解释器（MV 命令码）、Game_Map/Event/Player
  windows.js        窗口（消息/选择/金钱）、头像、转义符解析
  mapscene.js       图块渲染、角色精灵、Scene_Map
  menus.js          菜单/物品/技能/装备/状态/存读档/商店场景
  battle.js         战斗（侧视图）
  main.js           SceneManager、标题画面、主循环、启动流程
assets/
  data/             566 个解码后的 MZ 格式 JSON
  img/              图块/角色/头像/敌人等图片
  audio/            BGM/SE (ogg)
  fonts/            内嵌字体
tools/extract.py    从原版加密数据提取资源的脚本
```

## 技术说明

- 原版资源为 XOR 0x2F + 字节轮转加密，文件名为路径 MD5，已由 `tools/extract.py` 全量解码。
- 运行时为原创实现（非 MZ 内核），事件命令兼容 MV/MZ 编号（101 对话、102 选择、201 传送、205 移动路线等）。
- 主循环基于 `setTimeout` 16ms（约 60fps），输入边沿检测在帧末采样。
