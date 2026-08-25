# 第一章成长系统重做实施计划

> **For agentic workers:** Implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复第一章的装备、商店、角色技能和成长链路，让玩家能够通过城镇商店、宝箱、掉落和升级获得稳定而有意义的战斗成长。

**Architecture:** 保留单文件网页引擎和现有 `TKGame` 测试钩子，不做大规模拆文件。新增明确的角色职业映射、按地图选择的商店库存、统一装备背包持有/穿戴接口，并把辅助策略效果集中在战斗结算分支中。所有新增行为先在 `吞食天地三国/测试/three_kingdoms_test.js` 写失败断言，再改 `three-kingdoms.html`。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Canvas、Node.js 回归测试、现有 RPG Maker MV 解密数据表。

**Spec:** 本次对话中已确认的“第一章完整可玩成长闭环”设计。

## Global Constraints

- 不删除或重写现有参考数据表 `TK.CLASSES/TK.SKILLS/TK.WEAPONS/TK.ARMORS`。
- 第一章商店只开放基础到中级装备，不把全部高级装备一次性铺满。
- 装备必须同时支持购买、背包持有、穿戴、卸下、出售和存档恢复。
- 策略必须遵守数据表中的 MP 消耗和等级习得，不给低等级角色直接发高阶策略。
- 保持现有 197 项回归测试通过，并为新增成长链路增加测试。
- 不修改坦克大战页面；只修改 `three-kingdoms.html` 和三国复刻测试，除非验证发现必须同步文档。

## 文件结构

- Modify: `three-kingdoms.html:128-170` — 保留参考数据索引，增加角色职业映射和装备/策略辅助函数。
- Modify: `three-kingdoms.html:540-610` — 角色初始化、属性重算、存档和读档。
- Modify: `three-kingdoms.html:680-900` — 第一章城镇的防具店入口、商店地图事件和宝箱奖励。
- Modify: `three-kingdoms.html:1156-1264` — 城镇商店库存、购买/出售和商店上下文。
- Modify: `three-kingdoms.html:1330-1480` — 辅助策略的战斗效果和状态清理。
- Modify: `three-kingdoms.html:1540-1570` — 升级时策略习得提示及成长结算。
- Modify: `three-kingdoms.html:1633-1644` — 新游戏保底装备和初始物品。
- Modify: `three-kingdoms.html:2210-2410` — 装备、状态、商店 UI 文案和比较信息。
- Modify: `吞食天地三国/测试/three_kingdoms_test.js` — 新增成长系统失败测试和回归断言。

### Task 1: 固定武将职业映射与技能成长

**Files:**
- Modify: `three-kingdoms.html:147-172, 530-570`
- Test: `吞食天地三国/测试/three_kingdoms_test.js`

**Interfaces:**
- Produces `ACTOR_CLASS`、`classIdForActor(actorId)`、`learnedSkills(clsId, level)` 的稳定行为；`newActor(id)` 必须使用映射后的职业。

  - [x] **Step 1: 写失败测试**

在“成长与公式”段增加：

```js
const expectedClasses = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 7 };
for (const [actorId, clsId] of Object.entries(expectedClasses)) {
  ok(TK.actorClass(+actorId) === clsId, `武将${actorId}职业映射=${clsId}`);
}
newGame();
[3, 4, 5, 6].forEach(id => TK.joinActor(id));
for (const id of [2, 3, 4, 5, 6]) {
  const a = G.actors[id];
  ok(Array.isArray(TK.learnedSkills(a.cls, 2)), `武将${id}有等级2策略表`);
}
```

  - [x] **Step 2: 运行测试确认失败**

运行：`node 吞食天地三国/测试/three_kingdoms_test.js`
预期：新增 `actorClass` 未定义或角色技能断言失败。

  - [x] **Step 3: 实现映射和策略读取**

增加：

```js
const ACTOR_CLASS = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 7 };
function classIdForActor(actorId) { return ACTOR_CLASS[actorId] || actorId; }
```

让 `newActor(id)` 使用 `classIdForActor(id)`。为测试钩子暴露 `actorClass` 和 `learnedSkills`。对参考表没有习得记录的可玩角色，使用其映射到的参考职业，不复制高阶角色技能到低等级角色。

  - [x] **Step 4: 运行相关测试确认通过**

运行：`node 吞食天地三国/测试/three_kingdoms_test.js`
预期：角色映射和已有升级习得断言通过。

### Task 2: 装备背包、初始装备和存档往返

**Files:**
- Modify: `three-kingdoms.html:540-610, 1633-1644, 1721-1771`
- Test: `吞食天地三国/测试/three_kingdoms_test.js`

**Interfaces:**
- `G.bagEquip` 是 `{ "w:<id>": count, "a:<id>": count }`。
- `giveEquip(cat, id, count)`、`takeEquip(cat, id, count)` 负责库存变更。
- `saveGame/loadGame` 必须保存和恢复 `bagEquip`。

  - [x] **Step 1: 写失败测试**

```js
newGame();
ok(G.actors[2].eq[0] > 0, '新游戏刘备有武器');
ok(G.actors[2].eq[1] > 0, '新游戏刘备有防具');
TK.giveEquip('w', 2, 1);
ok(TK.equipCount('w', 2) === 1, '铜剑进入装备背包');
G.gold = 1234; G.state = 'world'; step('menu');
while (G.menu && G.menu.cursor !== 3) step('down');
step('confirm');
const saved = JSON.parse(sandbox.localStorage._d['tk-sw2-web-v1']);
ok(saved.bagEquip['w:2'] === 1, '存档保存未穿戴装备');
```

  - [x] **Step 2: 运行测试确认失败**

运行：`node 吞食天地三国/测试/three_kingdoms_test.js`
预期：初始装备或 `saved.bagEquip` 断言失败。

  - [x] **Step 3: 实现统一装备库存接口**

实现 `giveEquip/takeEquip/equipCount`，将购买、卸下、换装、出售统一改用这些函数。新游戏给刘备短剑和木盾；加入关羽、张飞、朱灵、路昭时分别给基础装备一次，使用 `joined_<id>` 标记防止重复发放。保存对象加入 `bagEquip: Object.assign({}, G.bagEquip)`，读档加入 `G.bagEquip = s.bagEquip || {}`。

  - [x] **Step 4: 运行测试确认通过**

运行：`node 吞食天地三国/测试/three_kingdoms_test.js`
预期：装备存在、换装扣库存、卸下返还、存档恢复全部通过。

### Task 3: 按城镇配置武器店和防具店

**Files:**
- Modify: `three-kingdoms.html:680-900, 1156-1264`
- Test: `吞食天地三国/测试/three_kingdoms_test.js`

**Interfaces:**
- `SHOP_STOCK` 支持 `weapon`、`armor`、`item`，库存项仍为 `[category, id]`。
- `shopGoods(kind)` 对 `armor` 返回可购买库存。

- [x] **Step 1: 写失败测试**

```js
newGame();
TK.openShopForTest('weapon');
ok(TK.shopGoodsForTest('weapon').some(g => g[1] === 2), '武器店出售铜剑');
TK.openShopForTest('armor');
ok(TK.shopGoodsForTest('armor').some(g => g[1] === 1), '防具店出售木盾');
ok(TK.shopGoodsForTest('armor').some(g => g[1] === 2), '防具店出售皮盾');
```

- [x] **Step 2: 运行测试确认失败**

运行：`node 吞食天地三国/测试/three_kingdoms_test.js`
预期：`armor` 库存为空或测试钩子未定义。

- [x] **Step 3: 实现商店和地图入口**

把库存拆成第一章基础库存：武器店短剑、铜剑、铁剑；防具店木盾、皮盾、鳞盾；道具店继续保留药品。增加 `ashop` 地图，徐州城新增防具店门和店内 NPC，事件类型使用现有 `shopkeeper`，`kind: 'ashop'`。`shopGoods` 将 `armor`/`shield` 兼容到同一防具库存。保留 `shopGoodsForTest/openShopForTest` 测试钩子。

- [x] **Step 4: 运行测试确认通过**

运行：`node 吞食天地三国/测试/three_kingdoms_test.js`
预期：三类商店库存、购买和返回地图全部通过。

### Task 4: 修正防具装备属性、商店比较和装备来源

**Files:**
- Modify: `three-kingdoms.html:562-564, 1224-1262, 2250-2405`
- Test: `吞食天地三国/测试/three_kingdoms_test.js`

**Interfaces:**
- `actorAtk/actorDef` 必须只读取当前穿戴装备。
- `goodInfo` 返回 `cat/name/price/desc/statDelta`，比较面板使用 `statDelta`。

- [x] **Step 1: 写失败测试**

```js
newGame();
const a = G.actors[2];
const baseAtk = TK.actorAtk(a), baseDef = TK.actorDef(a);
TK.giveEquip('w', 2, 1); TK.giveEquip('a', 2, 1);
TK.equipActor(2, 'w', 2); TK.equipActor(2, 'a', 2);
ok(TK.actorAtk(a) === baseAtk + DB.weapon[2].atk, '铜剑攻击生效');
ok(TK.actorDef(a) === baseDef + DB.armor[2].def, '皮盾防御生效');
```

- [x] **Step 2: 运行测试确认失败**

运行：`node 吞食天地三国/测试/three_kingdoms_test.js`
预期：测试钩子或装备购买流程失败。

- [x] **Step 3: 实现装备来源和比较**

提供 `equipActor(actorId, cat, id)` 测试钩子并复用现有换装逻辑。第一章山洞宝箱增加一件铜剑或皮盾，关键敌将掉落使用参考表中的基础装备；普通随机战优先掉药和金。购买界面显示当前装备、候选装备和攻击/防御差值，不能购买无效的防具类型。

- [x] **Step 4: 运行测试确认通过**

运行：`node 吞食天地三国/测试/three_kingdoms_test.js`
预期：装备属性、购买、宝箱、掉落和 UI 渲染通过。

### Task 5: 完善策略效果和升级反馈

**Files:**
- Modify: `three-kingdoms.html:1341-1478, 1557-1568, 1880-1920, 2450-2525`
- Test: `吞食天地三国/测试/three_kingdoms_test.js`

**Interfaces:**
- 战斗对象增加 `statuses`：我方和敌方均可保存 `attackDown/defDown/double/immuneAttack/immuneTactic/confused/bound` 等状态及剩余回合。
- `applyHeroAction` 和 `applyEnemyAction` 在回合开始/结束统一处理状态。

- [x] **Step 1: 写失败测试**

```js
newGame();
TK.joinActor(3); TK.joinActor(4);
for (const id of [2,3,4]) { G.actors[id].lvl = 5; TK.recalc(G.actors[id]); }
const skills = TK.actorSkills(2);
ok(skills.includes(46), '刘备能使用嘲骂计');
TK.startBattleForTest(11);
TK.useSkillForTest(2, 46);
ok(TK.enemyStatusForTest('attackDown'), '嘲骂计降低敌军攻击');
```

- [x] **Step 2: 运行测试确认失败**

运行：`node 吞食天地三国/测试/three_kingdoms_test.js`
预期：策略只输出消息，敌人没有状态，断言失败。

- [x] **Step 3: 实现最低完整策略效果**

在战斗对象中加入状态容器；实现嘲骂计降攻、疑心计降攻/降防、烟遁计降低敌方命中、离间计降低敌方行动概率、缚杀计跳过目标回合、倍击计提高下一次物理伤害、免击计免疫下一次物理伤害、免策计免疫下一次策略伤害、解策计清除敌方辅助状态、缩地计正常撤退。所有效果显示目标、持续回合和失败原因；每回合结束递减状态。

升级提示沿用真实习得表，策略菜单显示 `名称 + MP + 单体/全体 + 效果`，没有策略时显示“当前等级尚未习得策略”，而不是空白菜单。

- [x] **Step 4: 运行测试确认通过**

运行：`node 吞食天地三国/测试/three_kingdoms_test.js`
预期：技能习得、消耗、效果和回合状态测试通过。

### Task 6: 全流程回归与验证

**Files:**
- Modify: `吞食天地三国/测试/three_kingdoms_test.js`
- Verify: `three-kingdoms.html`, `吞食天地三国/文档/2026-08-23-growth-system.md`

- [x] **Step 1: 增加第一章正常练度验收**

测试必须覆盖：新游戏初始装备；徐州武器店和防具店购买；五名主要角色的等级 1/2/5/10 策略；装备前后属性；卖出和存档往返；宝箱装备；不使用测试模式、不手动注入高级装备时的黄巾战和袁术本阵。

- [x] **Step 2: 运行现有和新增测试**

运行：

```bash
node 吞食天地三国/测试/three_kingdoms_test.js
node 吞食天地三国/测试/three_kingdoms_smoke.js
node 测试工具/validate_maps.js
```

预期：所有命令退出码为 0；三国回归测试断言数高于 197；无地图、渲染或存档错误。

- [x] **Step 3: 做静态检查**

确认 `grep` 检查不到只返回空数组的防具商店分支，`saveGame` 和 `loadGame` 都处理 `bagEquip`，且没有改动坦克大战页面。检查 `git diff --check` 无空白错误。

- [x] **Step 4: 最终验证**

运行完整测试三次，确认随机伤害测试没有偶发失败；查看 `git diff --stat` 和关键 diff，确认改动只涉及成长系统和对应测试。
