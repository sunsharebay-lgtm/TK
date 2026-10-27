# 超级玛丽 · project.md

## 定位

创意空间子项目：超级玛丽风格的像素平台跳跃游戏实验。

## 当前状态

- **恢复开发 · v0.2.0（2026-10-27）**：用户已确认推送可玩性改进版。标签 `game/super-mario/v0.2.0`，在最新远端基础上隔离发布；部署结果以 GitHub Actions 与线上验收为准。

## 交付规格（v0.1.0）

- 分片源码 `src/` + 构建脚本 `build.sh`，产物 `index.html`。
- 4 大关卡、变身系统与隐藏道具。
- 无头测试：`test/harness.js`。

## 处理决策

- 保持分片源码可读、可测试；构建产物随仓库一起提交，浏览器可直接打开。
- 版本由 `game/super-mario/vX.Y.Z` 标签管理；Pages 只由 `main` 推送部署。

## QA 结果（v0.1.0）

- 无头测试通过；构建脚本可生成完整 `index.html`。

## 初始暂停版本 SHA-256（历史记录）

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

## 2026-10-27 · v0.2.0 可玩性迭代（本地候选）

### 交付规格与处理决策

- 保留 4 关与原创程序化素材，分片开发、单 HTML 离线游玩。新增 `src/80_ui.js` 负责 DOM 菜单，游戏状态仍由 `G` 管理。
- 默认轻松模式：不限生命/时间；经典模式：5 生命、60 帧一秒。检查点重试、失焦自动暂停、键盘/手柄/触屏共用动作。
- 修复 4 倍素材按原尺寸绘制造成的视觉/碰撞错位，统一瓦片 16×16 目标尺寸；补齐城堡墙面。
- 加快加速/转向/刹车；保留变速跳跃，调整 7 帧离地宽容与 8 帧输入缓冲；下蹲有真实碰撞箱，低顶不能强行站起；修正纵向移动平台承载。
- 修复敌人碰墙停滞、龟壳反弹与误伤窗口、击杀只显示浮字、高连踩分数变字符串、食人花死亡后残留。
- 修复奖励房落点与区域实体缓存、过关形态继承、终点保护、最后生命判断和最终奖励存档。
- 增加每关 3 枚星币、引导路牌、检查点旗帜、水管箭头、补给和第三关下层补救路径；火棒相位固定、转速递进，消除随机开局差异。
- 保存此前 2026-10-26 维护改动；修改前整套源码、测试、构建和文档在 `历史版本/2026-10-27-playability-before/`。

### QA 结果

- `bash build.sh`：语法与合并脚本检查成功。
- `node test/harness.js`：111 项基础断言通过。
- `node test/input_test.js`：8 组输入回归通过。
- `node test/build_test.js`：错误构建保留旧产物，正常构建与当前成品一致。
- `node test/gameplay_test.js`：20 组专项通过；其中最初的 12 组在修改前均能复现失败。额外修复并验证了菜单淡出后关卡介绍被黑幕遮住的问题。
- `node test/playthrough_test.js`：3 个种子 × 4 关全部到达结算，12 次单关均零死亡；连续四关也通过，最终关出现 1 次正常死亡后从检查点恢复，最终胜利、解锁、最高分均正确。
- 通关机器人只执行移动、跳跃与冲刺，无敌人删除、传送、加生命、强制变身或伤害屏蔽；云台关短跳控制落点，其他关卡长跳跨障碍。
- Chrome 实测：1280×800 桌面、390×844 竖屏、844×390 横屏；菜单点击、真实键盘移动/跳跃、暂停/失焦、触屏多指按下/释放、声音入口均无浏览器报错。截图位于忽略目录 `test/.artifacts/`。
- 旧 `harness.js` 的简化机器人日志仍不能代表完整通关；完整通关以独立 `playthrough_test.js` 的断言为准。
- 可玩性判断包含路线与操作验收，尚未收集外部玩家的长期体验反馈；物理手柄设备未实测，输入协议已做模拟回归。

### 发布与下一步

- 本轮未同步 GitHub。统一发布需回创意空间协调；只推本项目相关文件，保护共享工作区其他项目未提交的改动。
- 本地候选试玩确认后，可按 `game/super-mario/v0.2.0` 记录版本，并由 `main` 部署与线上验收。
- 后续主要依据真人试玩调整第三关落点容错与可选星币难度，不再以“无异常”代替可玩性验收。

### 当前源文件 SHA-256

- `index.html`：`cdfee56e38fb0e195e82f9ab8b604051791b1177f653789d622c264e519322a0`
- `src/00_head.html`：`ce971d49a7199c927c3c0ed03233074f51bc6cf81a4cb8293428f7ba6639f3b1`
- `src/10_core.js`：`f661366d9d63cbf864a24d38ec5e743295343c779331c68a1a97cd3622c92e06`
- `src/20_audio.js`：`d96c4b9a1a0aa1ea43c826af8e6ec1e7d9a2ce0231d170d0ed6f541acc0d2357`
- `src/30_sprites.js`：`8cbcd965a87d5fa2d6172151cbb378785fad3f9e3f20827963275e0c36ffa006`
- `src/40_levels.js`：`67c5c01b4d9dcce3a78909dbee795fa4c75a4e86f361b1f26dc54d6dd152e8d0`
- `src/50_entities.js`：`3f20b500821a6503e6d461f35651c57ed2152a526dedf4905e3e087c6e4dd1a4`
- `src/60_player.js`：`7bc9c9ebad20114fe532630a69505dd0a320e3760fe1e952ca075363a06714e4`
- `src/70_game.js`：`285359c0dd9cdade5a690bce8cd5d09e954d2c7f9e11757eb38aa2e9f0dc138e`
- `src/75_render.js`：`73a13e4757effa46e72107b10771f7b85e8bfd39b516650d54fb8bba12bcc85b`
- `src/80_ui.js`：`8d55c400286c4eba1c8bbe5dbbc40f63e84ab921780b31b313e2ad85ba2e0720`
- `src/90_main.js`：`ac363cf27c8d8a74eeafa62104301143a4b43b20419b9db1b9f987e5d6af1b71`
- `src/99_tail.html`：`fc837380d9f5351ff0a5776c8e1f523bb2107106f2ac860e0e76535377ec5b78`
- `build.sh`：`654bbaa9e5eb39aa0554e4cf24cbf19f8e0bb357fdc6125c7f4b044200755cdc`
- `test/gameplay_test.js`：`1c09067f6b69487aaad4e804b0a4fac3a452f5a402402cd40a00d41b88b1977b`
- `test/playthrough_test.js`：`865be1677d49387dd17f88c71a7c010af679611937b0d3184f0c21209728d359`
- `test/browser_test.cjs`：`28d3cebb872b252dcc179e401a87da1e4e37d1eb03ed20e5e9cbaf51507fff10`
- `test/runtime.cjs`：`aba14e7aae23b81526bf7c0215d0aefb7f21156eb4cccc7842eff02d57a96443`

## 2026-10-27 · 统一补丁发布 v0.1.1

- 交付内容：手柄/触屏输入与原子构建；仍暂停新增玩法。
- 标签：`game/super-mario/v0.1.1`；主分支部署统一由创意空间执行。旧审查章节保留当时的本地状态，当前发布以本节及共享发布记录为准。
- 既有37组回归、三国62场景（含复测）、七项目14项浏览器与墨屏8项布局检查构成本轮QA基线；发布前在仅含待提交内容的检出中再次运行统一门禁。
- 发布记录：`../docs/发布/2026-10-27/project.md`。

- 补丁历史验收：`game/super-mario/v0.1.1` 对应的 main 首轮部署 `41a4193`，[Actions 40521986517](https://github.com/sunsharebay-lgtm/TK/actions/runs/40521986517) 成功，全站 37 组 Linux 检查及线上入口/数据/脚本验证通过。此记录是维护补丁历史，不代表后续 v0.2.0 仍暂停。

## 2026-10-27 · v0.2.0 发布

- 用户确认推送完整可玩性改进；以最新 `origin/main` 为基线独立发布，仅集成本项目文件，保护原共享工作区其他项目改动。
- 标签：`game/super-mario/v0.2.0`。首页版本由标签在 CI 中自动生成，Pages 只由 `main` 部署。
- 代码产物 SHA-256 保持 `cdfee56e38fb0e195e82f9ab8b604051791b1177f653789d622c264e519322a0`；本节更新仅涉及发布记录。
- 发布检出验证：全项目 `check-all.cjs` 38/38 组通过；超级玛丽完整输入通关与 Chrome 桌面/触屏横竖屏验收通过。图集像素检查由 CI 的 Python 门禁执行。
- 本地候选章节保留开发过程；当前版本与发布决定以本节为准。上线结果须核对 Actions、部署提交和游戏 HTML 一致性。
