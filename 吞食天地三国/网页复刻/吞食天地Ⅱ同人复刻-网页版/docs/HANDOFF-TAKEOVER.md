# 吞食天地Ⅱ同人复刻-网页版 接手交接

> 记录时间：2026-08-25
> 说明：本文档记录接手方（Codex）对现有网页版的全面评估、已验证状态、已完成修复与后续路线。

## 一、这是什么

这是另一位 Agent 基于「吞食天地Ⅱ同人复刻」（RPG Maker MZ 原作）数据，从零自研的**纯浏览器运行时**。

- 页面外壳：`index.html`
- 运行时分成 8 个 JS 模块（约 4500 行）
- 数据：`assets/data/` 下 566 个解码后的 MZ JSON（14 个数据库 + 552 张地图）
- 资源：`assets/img/`（图块/行走图/头像/敌人/BGM 等）、`assets/audio/`（451 个音频）、`assets/fonts/`（内嵌字体）
- 提取工具：`tools/extract.py`（XOR 0x2F + 字节轮转解密）

## 二、架构（按加载顺序）

| 模块 | 职责 |
|------|------|
| `js/core.js` | 输入、音频（WebAudio）、图像、字体、屏幕适配 |
| `js/data.js` | DataManager、游戏状态类（Party/Switches/Variables/屏幕/消息）、Battler/Actor/Enemy、存读档 |
| `js/interp.js` | 事件解释器（MV/MZ 命令码）、Game_Map/Game_Event/Game_Player、移动路线 |
| `js/windows.js` | 窗口渲染、消息窗、选择窗、金钱窗、转义符解析 |
| `js/mapscene.js` | 图块渲染（A1-A5 自动图块）、角色精灵、Scene_Map |
| `js/menus.js` | 主菜单/物品/技能/装备/状态/存读档/商店 |
| `js/battle.js` | 侧视战斗（指令、目标、行动顺序、伤害公式、状态、掉落、升级） |
| `js/main.js` | SceneManager、标题画面、主循环、启动流程 |

## 三、已验证可用（本轮实测）

- 通过本地 HTTP 服务加载无 JS 报错、无资源 404（修复后）。
- 地图渲染完整（画布 816×624 全帧非空）。
- 新开游戏进入难度选择（标准/困难/骨灰/炼狱），按住确认键可正常选择并推进。
- 开场剧情逐句推进、传送到皇宫（map 159，坐标 14,7）、获得 500 金。
- 数据健康：14 个数据库全部解析，552 张地图全部解析，60 名武将、450 名敌人。

调试参数：`?autostart` 跳过标题；`?goto=mapId,x,y` 直接传送。

## 四、本轮已完成修复

### 音效资源名不匹配（`js/core.js`）
引擎代码使用标准 MZ 音效名（Ok/Cursor/Buzzer/Save/Battle1/Collapse4 等），但实际音频文件是 `Tstd_*` 命名，导致大量 SE 加载 404（脚本自动忽略、无报错）。
在 `T.AudioManager.SE_ALIAS` 增加映射后，控制台 404 从 6 条降为 0：

- Ok→Tstd_Decision2、Cursor→Tstd_Cursor_2、Buzzer→Tstd_Buzzer2
- Save→Tstd_Save、Battle1→Tstd_StartBattle、Collapse4→Tstd_Collapse
- Damage1→Damage2、Escape1→Run、Shop→Shop1、Recovery→Recovery
- Equip1→Equip1、Cancel→Tstd_Cancel、Load1→Tstd_Save、Text→Tstd_Move

### 隐藏物品“调查”反馈（`js/interp.js`）
城镇里 `$guangdian` 光点（隐藏物品，如徐州城 EV023/EV024）原本站上去按确认键能拾取，但**没有任何提示**，玩家会误以为没有调查功能。
现在事件解释器执行获得道具指令（126/127/128）时，若该事件没有自带提示文字，自动补一条「获得〔物品名〕！」消息并播放 `GainItem` 音效，让调查/开箱有明确反馈。

### 隔柜台与店主对话（`js/mapscene.js`）
店铺老板/客栈掌柜等事件通常隔柜台两格（如道具店店主在 `x=13,y=9`，玩家只能走到 `y=11`），原确认键只检查面前一格，导致无法对话。
`Scene_Map.checkTriggers()` 现在确认键依次检查：站立格 → 面前一格 → 面前两格（仅 `trigger=0` 的按钮触发事件），已实测道具店可正常开启对话与商店。

## 五、引擎已实现的能力（代码审查）

- 完整数据模型：Game_Actor/Enemy/Party、职业成长、装备加成、特性/状态/增益减益、伤害公式沙箱。
- 事件解释器覆盖多数 MV/MZ 指令：对话/选择分支、变量/开关/自我开关、金钱/持有物/队员增减、传送、移动路线、画面（色调/闪光/震屏/图片）、战斗、商店、脚本。
- 战斗：指令（攻击/计策/兵法/阵型/奥义/防御/道具/逃跑）、目标选择、按速度的行动顺序、伤害公式、状态、Buff、掉落、升级、胜负（含可败剧情）。
- 菜单：物品/技能/装备（带属性预览）/状态/存读档（localStorage）/商店。
- 地图：自动图块渲染、角色行走动画、区域遭遇、并行/自动事件、消息窗、图片与屏幕效果。

## 六、已知差距 / 待办（建议路线）

1. **搞清原作完整可玩性**：实际跑通第一章「灭袁术」全流程（收朱灵/路昭 → 卖训练 → 山洞 → 回徐州 → 打袁术），逐一找出引擎在复杂事件下的缺口。
2. **音效/BGM 完整度**：BGM 目前能播放，但部分 ME/SE 仍需端到端核对（例如 Boss 战、胜负、开箱）。
3. **阵型/歌唱的实际效果**：数据里有 12 种阵型和多首三阶歌唱技能，需确认战斗中是否真正生效（Buff/行动次数等），不到位则补实现。
4. **副将/坐骑装备栏**：原作有 8 个装备槽（武器/盾/头/身/坐骑/副将/饰品），当前 Scene_Equip 按 `equipTypes` 走，需核对各槽位价格与属性。
5. **输入手感**：快速点按偶有漏帧（引擎用 16ms setTimeout 采样）。真人长按正常，后续可考虑换 requestAnimationFrame 或改善边沿检测，提升响应。
6. **地图事件完善度**：552 张图的事件脚本由 `extract.py` 原样解码，事件命令全覆盖度需边玩边验证。

## 七、启动方式

```bash
cd "OpenCode/吞食天地Ⅱ同人复刻-网页版"
python3 -m http.server 8642
# 浏览器打开 http://localhost:8642
```

已在本机 `http://localhost:8642` 运行（当前会话，游戏可试玩）。
