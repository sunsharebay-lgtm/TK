# 墨水屏小站 · project.md

## 定位

创意空间子项目，把闲置 Kindle 墨水屏变成信息屏，兼容老旧 WebKit 浏览器。

## 交付规格（v0.4.0）

- 单文件 `index.html`，无外部脚本/样式/图片依赖。
- 5 个页面：时钟主页、微信读书入口、番茄钟、阅读清单、城市设置。
- 兼容约束：ES5、无 `fetch`/`Promise`、使用 XMLHttpRequest 更新天气、cookie 保存设置。
- 项目版本为 `v0.4.0`，页面文案保留 `v0.4`。
- 冒烟测试：`测试/smoke_test.js`。

## 处理决策

- 2026-08-28 从外部仓库 `sunsharebay-lgtm/idle-screen` 迁入创意空间，线上入口从外部域名改为站内 `/TK/墨水屏小站/`。
- 外部仓库保留为历史来源；创意空间内文件夹成为后续唯一维护源。

## QA 结果（v0.4.0，迁移后）

- 冒烟测试通过：入口存在、无 fetch/Promise、版本号统一、无外部资源依赖。
- 源文件 SHA-256 见下方补充；

## 源文件 SHA-256

- `index.html`：`d71ba0bddbf40a5612271edd19aa0ada15fbbded4090adbb6b7e75bcbee997fd`
- `测试/smoke_test.js`：`9acfc033b949d5f39208886067147760943bc89218ceb97d90a7dfeb87592b58`

## 原生版开发线

- 2026-09-08：新增 `原生版/墨屏小站原生测试/`，用于验证 KUAL 启动脚本、FBInk framebuffer 刷新和 KPW3 全屏显示链路。
- 当前原型为可交互的全屏主界面，暂不修改系统分区，不接入开机启动。
- KUAL 扩展必须同时提供 `config.xml` 和 `menu.json`；首轮设备菜单使用英文名称以降低旧版兼容风险。
- 设备首次实测发现普通清屏会残留 KUAL 左侧界面，因此启动和退出改用 FBInk 强制全屏刷新。
- 进一步确认 KUAL 界面仍可交互，原生测试将复用 KOReader 已验证的 `lab126_gui` 停止/恢复流程。
- 首次停止 `lab126_gui` 会生成 `KPPMainAppV2...crash` 系统转储并被图书馆索引；设备配置需放置 `DISABLE_CORE_DUMP` 抑制这类条目。
- 原型安装说明、限制和日志位置见 `原生版/墨屏小站原生测试/README.md`。
- v0.2 已加入 LuaJIT/FFI 触摸监听、信息屏、本地书库、微信读书网页和 KOReader 入口；仍需在设备上验证实际 event 节点、浏览器 URI 和本地书籍交接。
- 2026-09-09 设备复测发现停止 `lab126_gui` 后会生成 `Sep_08_23.56.52_2026.tgz/.txt/.sdr` 诊断包；其摘要显示 `Coredump` 为空，因此 `DISABLE_CORE_DUMP` 不能抑制这类图书馆条目。后续需要改进框架接管方案，并在每次测试后清理诊断包。
- v0.2.1 触摸修正：补充 `ABS_MT_POSITION_X/Y`、`ABS_MT_TRACKING_ID` 和无接触信号面板的点击回退，并记录实际打开的 `/dev/input/eventN` 与点击坐标。
- v0.2.2 设备恢复修正：参考 KOReader，将 KUAL 启动脚本先复制到 `/var/tmp` 后执行，避免停止 `lab126_gui` 时启动进程一并被系统终止，导致退出清理失效和白屏；本版本仍未开始网页端视觉的完整原生迁移。
- v0.2.3 输入节点修正：确认 KPW3 应优先读取 `/dev/input/event1`，不再让自动探测误选 `event0`；增加 `poll` 等待、90 秒安全超时和原始坐标归一化。设备端已同步，尚未在本轮重新启动入口验证。
- v0.2.4 菜单坐标修正：设备日志已确认 `event1` 收到点击和超时退出恢复均正常；故障改由菜单绘制行号与点击像素区间不一致造成。主菜单改为五个自上而下的黑底大按钮，并记录每次命中动作。

### 原生版 v0.2 源文件 SHA-256

- `原生版/墨屏小站原生测试/main.lua`：`8c7af28f62628120efa6be1461d17690ebf63a8ffebaaa23c67ebe1294004b41`
- `原生版/墨屏小站原生测试/bin/start.sh`：`829abaa901f7a9fa59cde1823c8cea74daaa683e63b2ec2181232329bff24889`
- `原生版/墨屏小站原生测试/menu.json`：`9adddd37b7c60c3e203ad63969d6e6e541e8ce52d66da5be7eb08f41da413405`
- `原生版/墨屏小站原生测试/config.xml`：`b610671fb36f3e1dbc0082feb075b04603c9dd0258fd52002e8a30f3f9ef73e2`

## 2026-10-26 · 全项目审查修复（本地）

### 决策与处理

- 设置页按钮和回车使用各自的当前输入框；弹出面板保持兼容。切换时钟样式只改变该样式，保留横屏标记。
- 番茄钟以截止时间计算剩余秒数，抵抗后台定时器降频；结束后可直接开始新一轮，暂停保留剩余时间，重置恢复提示。
- 阅读清单回车添加；损坏 cookie 和非数组清单安全回退。
- XHR 网络失败仅回调一次，状态 0 不算成功；用请求序号丢弃切换城市前的旧天气结果。
- 原生启动器先验证依赖，再接管框架；Upstart / SysV 按原方式恢复，传播主程序与恢复失败，TERM/INT/HUP 走恢复清理；Lua 使用启动器选出的 FBInk。
- KPW3 触摸坐标统一按 0～4095 换算，修复左上区域错位及边缘 0 坐标无法点击。

### QA

- `node --test 测试/behavior_test.js`：8 项修复前全失败，修复后 8/8。
- `node 测试/smoke_test.js`：通过，未引入 fetch/Promise 或外部脚本样式。
- 原生 `launcher_test.js`：5/5，依次覆盖 SysV 恢复/FBInk 环境、缺依赖预检、TERM 恢复、主程序失败、恢复失败；各故障均先复现。
- 原生 `touch_test.py`：通过 6 组实际 Lua evdev 回放；原 (1000,1000) 错映射为 (1000,1000)，现为 (261,353)。
- 原生 smoke 与 `sh -n bin/start.sh` 通过。
- Chrome 桌面/手机视口设置、天气模拟、清单输入、无水平溢出通过。截图等待墨水屏闪刷结束后再抓取。
- 没有 Kindle 真机操作；不能据此宣称原生版已可稳定上机。外部 wttr.in 实际网络可用性不由模拟测试证明。

### 当前源码 SHA-256

- `index.html`：`8b5dc5a66ce53ca9874c3619d4da89d2644efbf6892defec8cecdd2a9bc532b2`
- `测试/behavior_test.js`：`87faec672487d4537a814ab357de6471bd3cc73a528799c82ce068b5486ea8d9`
- `原生版/墨屏小站原生测试/bin/start.sh`：`93ff96b8abd50a7be65d8294a2841e41da6ba7bd0bed590cc33c62fc63654800`
- `原生版/墨屏小站原生测试/main.lua`：`82350cbab6bd84dd3802bdd685d72ceb1a9326e8b18a8fbaccb17f9efb8ad4b7`
- `原生版/墨屏小站原生测试/测试/launcher_test.js`：`0e380d1f27ca95a7b1ee6a1765793463b8283eea7bbd9bbc9c8ec21ac21d5530`
- `原生版/墨屏小站原生测试/测试/touch_test.py`：`bfd49906356ded8f113b4eefb115b57e3a0c9f78dd6f5a4f4d5d0836c9d020bc`

### 窄屏视觉复核补充

自动化整页无横向溢出不能代表卡片内部无遮挡。截图进一步复现数字裁切、农历溢出和天气文字/按钮重叠；新增 `测试/layout_browser_test.cjs` 先失败，调整窄屏排版并按卡片实际尺寸计算时钟字号后通过 390×844、375×667、758×1024、1072×1448 的两种样式共 8 个场景。保持 ES5 与原 Kindle 尺寸，不据此宣称旧 WebKit 真机通过。

- `index.html` 最新 SHA-256：`fc89418fec5b8654c12de897b44a6b7a7ac7d16dbf5640b01a4ea3f10774bbb6`。
- `测试/layout_browser_test.cjs` 最新 SHA-256：`6f14d9e15dfa3c7c52da8d44abfa8c403f658425e5522ced8adfd3fe50f363c8`。

## 2026-10-27 · 统一补丁发布 v0.4.1

- 交付：设置、番茄钟、天气、窄屏布局；原生原型源码修复。标签：`game/idle-screen/v0.4.1`。
- 本轮发布使用已验收恢复快照，排除共享工作区中其他对话正在继续的修改；历史章节中的“未发布”指当时状态。
- 发布前在干净检出中执行统一门禁，部署后按预期提交号验收。发布记录：`../docs/发布/2026-10-27/project.md`。

- 发布文件 `index.html` SHA-256：`581d0db30ef22c1423bc6c57a4e4175e0632e875ba01d13ca2dc65318f3eba32`。
