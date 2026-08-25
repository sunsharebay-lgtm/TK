# 成长系统重做交接文档

更新时间：2026-08-23

## 交接目标

继续完成《吞食天地Ⅱ》网页复刻版第一章成长系统重做。用户已明确确认：需要同时解决武器装备、商店库存、技能成长、等级习得、装备来源和战斗策略体验，目标是让第一章形成“探索—赚钱—购物—换装—升级—学策略—打 Boss”的完整闭环。

详细实施计划见：`吞食天地三国/文档/2026-08-23-growth-system.md`。

## 当前工作区状态

项目目录：`/Users/sun/Desktop/pgcs/创意空间`

当前 Git 状态中有以下改动：

- `three-kingdoms.html`：已有未提交改动。
- `吞食天地三国/测试/three_kingdoms_test.js`：已有未提交改动。
- `吞食天地三国/文档/2026-08-23-growth-system.md`：本次新增的实施计划。
- 本交接文档：`吞食天地三国/文档/HANDOFF-growth-system.md`。

不要直接执行 `git reset --hard`、`git checkout --` 或覆盖整个 HTML。当前未提交改动包含用户此前确认的按键、移动动画和角色职业映射工作，不能因为开始新任务而丢失。

## 已完成的工作

### 1. 现状审查

已确认当前 HTML 已内嵌参考数据：

- 59 个职业/角色成长数据。
- 145 条策略。
- 273 把武器。
- 146 件防具。
- 402 个敌人和 256 个敌群。

已确认的原问题：

- `newActor()` 原来让 `actorId` 直接充当 `classId`，导致部分角色读不到正确的策略习得表。
- `SHOP_STOCK` 只有武器、道具和名为 `shield` 的空分支；`shopGoods()` 对防具没有可用库存。
- 徐州地图当前有武器店、道具店、役店和客栈，但没有防具店入口。
- 新游戏原来不给任何角色装备，所有角色初始 `eq` 都是 `[0, 0]`。
- `bagEquip` 没有纳入存档，读档会丢失未穿戴装备。
- 辅助策略多数只显示战斗文字，没有完整的状态效果。
- 原有测试验证了数据表和第一章战斗，但没有验证商店防具、装备背包、角色职业映射、装备存档和辅助策略效果。

### 2. 角色职业映射已开始实现

`three-kingdoms.html` 当前已加入：

```js
const ACTOR_CLASS = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 7 };
function classIdForActor(actorId) { return ACTOR_CLASS[actorId] || actorId; }
```

`newActor(id)` 已改为使用 `classIdForActor(id)`，`learnedSkills()` 也增加了缺失职业记录的安全处理，测试钩子已暴露：

```js
actorClass: classIdForActor
```

注意：`6: 7` 是基于当前提取表中可用职业记录的暂定映射，后续 Agent 必须用参考数据中的角色/职业对应关系再核对一次，不能盲目扩大这个映射。

### 3. 移动和按键改动已存在

当前 diff 还包含此前工作：平滑移动、`Enter/K/J/H` 按键行为调整、菜单返回处理等。这些不是本次成长系统任务的重点，但必须保留，并在最终测试中确认没有回归。

### 4. 当前测试结果

已运行：

```bash
node 吞食天地三国/测试/three_kingdoms_test.js
```

结果：

```text
全部通过：294 项断言
```

原基线为 197 项；角色职业映射 15 项，Task 2 装备/存档 20 项，Task 3 商店/防具店 25 项，Task 4 属性/宝箱/掉落 12 项，Task 5 策略状态 13 项，Task 6 全流程验收 12 项。

### 5. Task 2 装备背包、初始装备和存档已完成

- 新增统一接口：`giveEquip(cat, id, count)`、`takeEquip(cat, id, count)`、`equipCount(cat, id)`，并通过 `window.TKGame` 暴露给测试。
- `newGame()` 给刘备初始短剑（`w:1`）+ 木盾（`a:1`）；`joinActor()` 在角色首次加入时发放基础装备，重复加入不重复发放：
  - 刘备 `[1,1]`，关羽/张飞 `[2,1]`，朱灵/路昭 `[1,1]`（`START_EQUIP` 表）。
- 购买、出售、换装、卸下、战斗掉落全部改用统一库存接口。
- `saveGame()` 保存 `bagEquip`；`loadGame()` 恢复 `bagEquip`，旧存档缺失时使用 `{}`。
- 新增 20 项断言覆盖：初始装备、队友发装与防重复、背包增减、存档保存、读档恢复、旧存档兼容。
- 注意：`坦克大战/测试/smoke_test.js` 是坦克大战专用冒烟脚本，不能用于三国；三国冒烟使用 `node 吞食天地三国/测试/three_kingdoms_smoke.js`（当前 75 通过）。

### 6. Task 3 徐州武器店和防具店已完成

- `SHOP_STOCK` 新增 `armor` 库存（木盾/皮盾/鳞盾），`shield` 与 `armor` 指向同一防具库存，旧事件不失效。
- `shopGoods` 支持 `weapon`/`item`/`armor`/`shield`；武器店继续出售短剑、铜剑、铁剑。
- 新增 `SHOP_KIND_ALIAS`：`wshop→weapon`、`ishop→item`、`ashop→armor`，修复旧武器店/道具店事件因 `kind` 与库存键不一致而无法购买的问题。
- 新增 `MAPS.ashop` 防具店室内地图；徐州城第 10 行增加防具店门（`x:24, y:10`），店内 `shopkeeper` 事件 `kind: 'ashop'`。
- 商店渲染标题支持“防具店”，防具购买/卖出/比较沿用统一装备库存接口。
- 新增 25 项断言覆盖：武器/防具库存、旧 `wshop`/`shield` 兼容、购买扣金入包、离开商店、地图门可走通。
- 三国冒烟 78 项通过；成长系统全部完成后回归测试 294 项通过。

### 7. Task 4 装备属性、商店比较、宝箱和掉落已完成

- 新增 `equipActor(actorId, cat, id)` 测试钩子并复用换装逻辑；`actorAtk/actorDef` 只读取当前穿戴装备。
- `goodInfo` 对装备返回 `statDelta`，商店比较面板使用该值显示攻击/防御差值。
- 徐州山洞宝箱改为稳定获得铜剑（`equip: ["w", 2]`）；`handleEvent` 支持装备宝箱。
- 普通遭遇战只掉药品（不随机掉高阶装备）；Boss 战稳定掉落：纪灵铜剑、高升皮盾、袁术本阵铁剑、总攻鳞盾。
- 新增 12 项断言：装备属性差、背包扣减、比较差值、宝箱、普通战无装备掉落、纪灵战稳定掉落。

### 8. Task 5 策略效果和升级反馈已完成

- 战斗对象新增 `statuses` 状态容器（敌我双方），支持 `attackDown/defDown/hitDown/confused/bound/double/immuneAttack/immuneTactic`，回合结束统一递减。
- 十种辅助策略全部实现：嘲骂计、疑心计、烟遁计、离间计、缚杀计、倍击计、免击计、免策计、解策计、缩地计（Boss 战不可退）。
- 物理/策略伤害结算应用防御降低、倍击、免疫、命中降低、混乱与束缚效果。
- 修复敌方 `kind=0` 攻击技能误走辅助分支的问题，敌方现在能正常造成物理伤害。
- 策略菜单显示 `名称 + 范围 + MP + 效果`；无策略时提示“当前等级尚未习得策略”。
- 新增 13 项断言：状态设置、解策清除、缩地撤退、免击实际免疫、倍击消耗。

### 9. Task 6 全流程回归与验证已完成

- 新增 12 项验收断言：五名角色等级 1/2/5/10 策略表、卖出装备、半价金币。
- 黄巾战与袁术本阵验收改为第一章正常练度（商店可购的铜剑/铁剑/鳞盾，非手动高级装备）。
- 回归测试连续运行三次均 294 项通过；三国冒烟 78 项通过；`validate_maps.js` 全部通过；`git diff --check` 无输出。

## 未完成工作

成长系统重做 Task 1-6 已全部完成，无未完成工作。

## 推荐执行顺序

严格按下面顺序，避免一次改太多：

1. 成长系统重做 Task 1-6 已全部完成，回归测试 294 项全部通过。
2. 后续工作可从三国 v0.2.0 的其他方向继续（新章节、平衡调整、存档格式演进等）。

每个任务都应遵循 TDD：先写失败测试，确认失败，再写最小实现，最后运行全量回归。

## 现有代码和测试接口

测试文件使用 Node `vm` 加载 HTML 内嵌脚本，主要对象来自：

```js
const TK = sandbox.TKGame;
const { G, DB, MAPS, step, newGame, startBattle } = TK;
```

当前已暴露的测试钩子包括：

```js
G, DB, TK, MAPS, Input, step, newGame, startBattle,
classStat, expToNext, physDamage, tacticDamage, tacticHeal,
grantExp, Save, learnedSkills, actorClass, Dialogue,
joinActor, addItem, removeItem, recalc, actorSprite, tileCanvas
```

新增接口应尽量通过 `window.TKGame` 暴露，而不是让测试依赖闭包内部变量。

## 关键参考数据

当前内嵌数据中已验证：

- 武器：短剑 `id=1, price=100, atk=10`。
- 武器：铜剑 `id=2, price=300, atk=20`。
- 武器：铁剑 `id=6, price=800, atk=40`。
- 防具：木盾 `id=1, price=50, def=5`。
- 防具：皮盾 `id=2, price=100, def=10`。
- 防具：鳞盾 `id=3, price=500, def=15`。
- 炼火计 `id=11, coef=320`。
- 天火计 `id=16, coef=4320`。
- 赤心计 `id=35, kind=2`。

不要手写或重建整张参考数据表；直接使用 HTML 中已有的 `TK.*` 数据。

## 必跑验证命令

开发过程中：

```bash
cd "/Users/sun/Desktop/pgcs/创意空间"
node 吞食天地三国/测试/three_kingdoms_test.js
```

已验证：

- 三国回归测试 294 项断言全部通过（连续三次运行无偶发失败）。
- 三国冒烟 78 项通过；`validate_maps.js` 全部通过；`git diff --check` 无输出。
- 初始装备、购买/卖出防具、装备属性、存档往返、五名角色等级 1/2/5/10 策略均有断言。
- 第一章黄巾战与袁术本阵按正常练度（商店可购装备）验收通过。
- 未修改 `tank-battle.html`、`坦克大战.html` 或其他坦克大战版本文件。

## 给下一位 Agent 的第一句话

第一章成长系统重做已全部完成（Task 1-6），回归测试 294 项全部通过。后续若继续三国 v0.2.0 工作，请先读取本交接文档和 `吞食天地三国/文档/2026-08-23-growth-system.md`，检查当前 `git diff`，确认工作区改动未丢失，再从新方向推进。
