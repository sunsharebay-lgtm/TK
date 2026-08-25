#!/bin/bash
# 吞食天地Ⅱ同人复刻 网页版 启动脚本
cd "$(dirname "$0")"
PORT=8642
if lsof -i :$PORT >/dev/null 2>&1; then
  echo "端口 $PORT 已有服务，直接打开浏览器…"
else
  echo "启动本地服务 http://localhost:$PORT …"
  (python3 -m http.server $PORT >/dev/null 2>&1 &)
  sleep 1
fi
URL="http://localhost:$PORT"
if [ -n "$1" ]; then URL="$URL/?$1"; fi
open "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null || echo "请手动打开: $URL"
