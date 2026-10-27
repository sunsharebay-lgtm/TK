#!/bin/sh

# 墨屏小站原生版 v0.2：全屏主界面与本地阅读入口。

# Kindle 的 VFAT/FUSE 挂载点不适合在停止 framework 后继续直接执行脚本。
# KOReader 会先复制到 tmpfs，再从副本接管；这里沿用同一做法，避免
# KUAL 的启动进程随着 lab126_gui 一起被杀掉，导致白屏且无法执行 EXIT trap。
if [ "$(dirname "$0")" != "/var/tmp" ]; then
  cp -pf "$0" /var/tmp/moping-station-native-test.sh
  chmod 700 /var/tmp/moping-station-native-test.sh
  exec /var/tmp/moping-station-native-test.sh "$@"
fi

APP_DIR="/mnt/us/extensions/moping-station-native-test"
LOG_FILE="/mnt/us/moping-station-native-test.log"
FBINK=""
FRAMEWORK_STOPPED="no"
FRAMEWORK_TYPE=""
ACTION=""

if [ -x "/mnt/us/koreader/fbink" ]; then
  FBINK="/mnt/us/koreader/fbink"
elif [ -x "/mnt/us/libkh/bin/fbink" ]; then
  FBINK="/mnt/us/libkh/bin/fbink"
fi

LUAJIT="/mnt/us/koreader/luajit"
APP_MAIN="${APP_DIR}/main.lua"

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >> "$LOG_FILE"
}

restore_framework() {
  if [ "${FRAMEWORK_STOPPED}" = "yes" ]; then
    log "FRAMEWORK: restarting ${FRAMEWORK_TYPE}"
    if [ "$FRAMEWORK_TYPE" = "sysv" ]; then
      /etc/init.d/framework start >/dev/null 2>>"$LOG_FILE" || return 1
    else
      (cd / && start lab126_gui) >/dev/null 2>>"$LOG_FILE" || return 1
    fi
    FRAMEWORK_STOPPED="no"
  fi
}

cleanup() {
  moping_status=$?
  trap - EXIT
  if ! restore_framework; then
    log "ERROR: framework restore failed"
    if [ "$moping_status" -eq 0 ]; then moping_status=1; fi
  fi
  exit "$moping_status"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 129' HUP
trap 'exit 143' TERM

# Validate all runtime dependencies before taking over the screen.
if [ -z "$FBINK" ] || [ ! -x "$LUAJIT" ] || [ ! -f "$APP_MAIN" ]; then
  log "ERROR: fbink, luajit or main.lua not found"
  exit 1
fi
export FBINK

# KOReader uses the same handoff on this firmware: stop the Kindle GUI so KUAL
# cannot keep an interactive window above the framebuffer. The EXIT trap puts
# the framework back even if the test is interrupted.
if [ -f "/mnt/us/koreader/libkohelper.sh" ]; then
  . "/mnt/us/koreader/libkohelper.sh"
fi

if [ "${INIT_TYPE}" = "upstart" ] && command -v stop >/dev/null 2>&1; then
  log "FRAMEWORK: stopping lab126_gui"
  trap "" TERM
  if ! stop lab126_gui >/dev/null 2>>"$LOG_FILE"; then
    log "ERROR: unable to stop lab126_gui"
    exit 1
  fi
  FRAMEWORK_TYPE="upstart"
  FRAMEWORK_STOPPED="yes"
  usleep 1250000
  # 只在停止动作完成后重新接收 TERM；停止过程中保持启动脚本存活。
  trap 'exit 143' TERM
elif [ -x "/etc/init.d/framework" ]; then
  log "FRAMEWORK: stopping sysv framework"
  trap "" TERM
  if ! /etc/init.d/framework stop >/dev/null 2>>"$LOG_FILE"; then
    log "ERROR: unable to stop sysv framework"
    exit 1
  fi
  FRAMEWORK_TYPE="sysv"
  FRAMEWORK_STOPPED="yes"
  usleep 1250000
  trap 'exit 143' TERM
else
  log "FRAMEWORK: unable to stop framework"
  exit 1
fi

log "START: fbink=$FBINK"

log "START: native home"
"$LUAJIT" "$APP_MAIN" >>"$LOG_FILE" 2>&1
ACTION=$?
log "STOP: action=${ACTION}"

if [ "$ACTION" -eq 20 ]; then
  BOOK=""
  if [ -f "/mnt/us/moping-station-native-test.open" ]; then
    BOOK="$(sed -n '1p' /mnt/us/moping-station-native-test.open)"
    rm -f /mnt/us/moping-station-native-test.open
  fi
  if [ -n "$BOOK" ]; then
    log "KOReader: opening ${BOOK}"
    /mnt/us/koreader/koreader.sh --kual "$BOOK" >>"$LOG_FILE" 2>&1 || exit $?
  else
    log "KOReader: opening file manager"
    /mnt/us/koreader/koreader.sh --kual >>"$LOG_FILE" 2>&1 || exit $?
  fi
elif [ "$ACTION" -eq 30 ]; then
  log "WeRead: returning to Kindle framework"
  restore_framework || exit 1
  lipc-set-prop com.lab126.appmgrd start 'app://com.lab126.booklet.browser?url=https%3A%2F%2Fweread.qq.com%2F' >/dev/null 2>>"$LOG_FILE" || exit $?
elif [ "$ACTION" -ne 0 ]; then
  exit "$ACTION"
fi

exit 0
