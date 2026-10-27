#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
FILES="src/00_head.html src/10_core.js src/20_audio.js src/30_sprites.js src/40_levels.js src/50_entities.js src/60_player.js src/70_game.js src/75_render.js src/90_main.js src/99_tail.html"
for f in $FILES; do
  [ -f "$f" ] || { echo "MISSING $f"; exit 1; }
done
for f in src/*.js; do node --check "$f"; done
BUILD_TMP="$(mktemp ./index.html.XXXXXX)"
trap 'rm -f "$BUILD_TMP"' EXIT
cat $FILES > "$BUILD_TMP"
node - "$BUILD_TMP" <<'NODE'
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(process.argv[2], 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/);
if (!script) throw new Error('Missing game script');
new vm.Script(script[1], { filename: 'index.html' });
NODE
chmod 644 "$BUILD_TMP"
mv "$BUILD_TMP" index.html
echo "--- built index.html ($(wc -c < index.html) bytes)"
