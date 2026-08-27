#!/bin/bash
set -e
cd "$(dirname "$0")"
FILES="src/00_head.html src/10_core.js src/20_audio.js src/30_sprites.js src/40_levels.js src/50_entities.js src/60_player.js src/70_game.js src/75_render.js src/90_main.js src/99_tail.html"
for f in $FILES; do
  [ -f "$f" ] || { echo "MISSING $f"; exit 1; }
done
cat $FILES > index.html
for f in src/*.js; do node --check "$f" >/dev/null 2>&1 && echo "OK $f" || { echo "FAIL $f"; node --check "$f"; }; done
echo "--- built index.html ($(wc -c < index.html) bytes)"
