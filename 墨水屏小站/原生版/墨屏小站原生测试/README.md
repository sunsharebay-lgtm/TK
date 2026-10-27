# 墨屏小站原生版 v0.2.4
这是墨屏小站本地原生版的第一个可交互主界面，目标是确认：

`KUAL -> 停止 Kindle 框架 -> LuaJIT 触摸菜单 -> FBInk -> KPW3 全屏功能入口`

当前版本仍是底层接管验证原型，不是网页端墨水屏小站的完整原生移植版。

## 安装

将本目录整体复制到 Kindle 的：

```text
/mnt/us/extensions/moping-station-native-test/
```

复制完成后安全弹出 Kindle，在 KUAL 中选择：

```text
Moping Station -> Launch native home
```

首轮设备验证的 KUAL 菜单刻意使用英文，规避旧版 Kindle/KUAL 对中文菜单文本可能存在的兼容性问题；屏幕测试页本身同样使用英文。

## 预期结果

- Kindle 屏幕被清空并显示可点击的主菜单。
- 启动和退出时会进行一次强制全屏刷新，可能出现短暂黑白闪烁。
- 启动时会暂时停止 Kindle 图形框架，退出时自动恢复；测试期间 KUAL 不应再覆盖或接收触摸。
- 信息屏显示日期和时间，点击屏幕返回主菜单。
- 本地书库扫描 `documents` 下的 EPUB、PDF、MOBI、AZW3 和 TXT，并可交给 KOReader 打开。
- 微信读书入口恢复 Kindle 图形框架后调用系统浏览器。
- KOReader 入口直接启动已有 KOReader。
- 如果启动失败，可重新连接 USB，查看：

```text
/mnt/us/moping-station-native-test.log
```
- 启动脚本会先复制到 `/var/tmp` 再执行，以避开 Kindle USB 存储层在停止框架后的进程和文件系统问题。
- KPW3 按 KOReader 的设备配置优先使用 `/dev/input/event1`，并将触摸坐标按 4095 原始范围转换为屏幕坐标。
- 菜单等待触摸最多 90 秒；超时会自动退出，确保 Kindle 框架有机会恢复。
- 主菜单使用从上到下排列的五个黑底大按钮，显示行号与点击判定使用同一套屏幕坐标。

## 当前限制

- 暂时依赖设备中已有的 `/mnt/us/koreader/fbink` 或 `/mnt/us/libkh/bin/fbink`。
- 暂时没有物理按键退出处理；在主菜单中点击 `Exit` 退出。
- 暂时没有修改 Kindle 系统分区，也没有安装到系统启动流程。
- 某些固件在停止 `lab126_gui` 后会生成以时间命名的诊断包，并将其显示在图书馆中；`DISABLE_CORE_DUMP` 不能阻止这类 `ccdb` 日志汇总，后续版本需要进一步处理。
- 如果设备在安全弹出后白屏，先不要重复点击 KUAL；重新连接 USB 仅用于取日志和替换文件，随后安全弹出并长按电源键约 40 秒重启设备。
- 当前菜单和测试文案使用英文，避免第一轮触摸验证被中文字体问题干扰。

## 下一步

先完成全屏接管、触摸输入和退出恢复的稳定验证，再实现中文字体、滑动返回、天气/日历/番茄钟/清单页面和更简洁的阅读设置。

## 2026-10-26 本地修复与验证

启动器在停止框架前检查依赖，把实际 FBInk 路径传给 Lua，按 Upstart / SysV 对称恢复，处理退出信号并保留失败退出码。KPW3 坐标统一按 4095 原始范围换算，包含左上角和坐标 0。

```sh
node --test 测试/launcher_test.js
node 测试/smoke_test.js
sh -n bin/start.sh
# 可选主机 Lua 回放；需要 Python 及 lupa，不会访问 Kindle。
python3 -m pip install --target 测试/.artifacts/lua-runtime lupa
PYTHONPATH=测试/.artifacts/lua-runtime python3 测试/touch_test.py
```

本轮 5 组启动模拟与 6 组坐标回放通过；属于主机回归，设备接管、FBInk 实际行高、本地书库点击及退出恢复仍需 Kindle 真机确认。当前代码未同步到设备。
