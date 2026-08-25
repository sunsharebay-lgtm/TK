# 吞食天地：汉末群雄 v0.1 Implementation Plan

> **For agentic workers:** Implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a playable original FC-style Three Kingdoms RPG vertical slice and add it to the existing TK game center with per-game stable version tags.

**Architecture:** Keep the new game as a self-contained `three-kingdoms.html` page, matching the existing single-file Tank Battle deployment pattern. Use data-driven maps, actors, enemies, tactics, items, and dialogue; separate the input layer, state machine, renderer, exploration rules, battle rules, and save adapter inside the file so each can be tested through a small Node harness. Replace the current global version lookup with namespaced Git tags such as `game/tank-battle/v1.6.2` and `game/three-kingdoms/v0.1.0`; the Pages workflow generates one catalog entry per game.

**Tech Stack:** Plain HTML/CSS/JavaScript, Canvas 2D, WebAudio, GitHub Pages, GitHub Actions, Node.js test harnesses, browser in-memory/local save.

**Spec:** `吞食天地三国/文档/three-kingdoms-v0.1-spec.md`

## Global Constraints

- The first version is an original FC-style Three Kingdoms RPG vertical slice; it must not copy any existing game's specific art, maps, music, scripts, numerical tables, or level data.
- Use only project-generated assets or assets with explicit permission for modification and redistribution; record any external asset source, author, license, and modification.
- The game entry is `three-kingdoms.html`; the game center remains the old QR-code URL at `https://sunsharebay-lgtm.github.io/TK/`.
- Tank Battle and the new RPG must not share runtime globals or save keys.
- Version tags use `game/<id>/vX.Y.Z`; ordinary commits do not change a game version.
- The virtual game canvas is 256×240 and scales by integer multiples where possible.
- Keyboard controls are arrows/WASD, Enter/Z, Esc/X, and 1–5 battle shortcuts; mobile controls must be visible and keyboard-focusable.
- The game must run on GitHub Pages without external runtime dependencies, remote assets, remote fonts, or remote audio.
- TDD is mandatory: each new behavior gets a failing test before implementation, then a passing test and a focused refactor.

---

### Task 1: Upgrade the catalog to per-game stable tags

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify: `scripts/generate-game-catalog.cjs`
- Modify: `game-catalog.template.json`
- Modify: `game-catalog.json`
- Modify: `测试工具/version_catalog_test.js`
- Test: `测试工具/version_catalog_test.js`

**Interfaces:**
- `parseStableTags(tagText)` returns `{ [namespace]: version }`, accepting only tags matching `game/<id>/v<major>.<minor>.<patch>` and selecting the highest semantic version per namespace.
- `generateCatalog(template, tagText)` returns the catalog object with each game’s resolved `version` and `status`.
- CLI invocation becomes `node scripts/generate-game-catalog.cjs`, which reads tags from `git tag --list` and writes `game-catalog.json`.

- [ ] **Step 1: Add failing tests for namespaced tag resolution.** Add synthetic tag input to `version_catalog_test.js` and assert that `game/tank-battle/v1.6.2` beats `game/tank-battle/v1.6.1`, that `game/three-kingdoms/v0.1.0` resolves independently, and that unrelated tags are ignored.

- [ ] **Step 2: Run the version test and confirm the expected failure.**

Run:

```bash
node '测试工具/version_catalog_test.js'
```

Expected: FAIL because the current generator accepts one global version argument and the template has only one global version source.

- [ ] **Step 3: Update the template.** Change each game entry to include `tagNamespace`, `fallbackVersion`, and `statusWhenMissing`. Keep Tank Battle’s legacy `v1.6.1` fallback so the existing global tag remains compatible while the namespaced tag is introduced. Add the Three Kingdoms entry with `tagNamespace: "game/three-kingdoms"`, `fallbackVersion: "v0.1.0"`, and `statusWhenMissing: "开发版"`.

- [ ] **Step 4: Implement pure tag parsing and catalog generation.** Export `parseStableTags` and `generateCatalog` from `generate-game-catalog.cjs`; make the CLI read all tags, generate `game-catalog.json`, and never treat ordinary commits or `v1.6.1` as the new Three Kingdoms version.

- [ ] **Step 5: Update the Pages trigger.** Keep `branches: [main]` and change the tag trigger to `game/**/v*`. Keep `fetch-depth: 0`, run the generator without a version argument, and fail if a malformed namespaced tag is selected.

- [ ] **Step 6: Run the version tests and generator.**

Run:

```bash
node '测试工具/version_catalog_test.js'
node scripts/generate-game-catalog.cjs
```

Expected: PASS; the catalog contains independent Tank Battle and Three Kingdoms entries.

- [ ] **Step 7: Commit the version-system change.**

```bash
git add .github/workflows/pages.yml scripts/generate-game-catalog.cjs game-catalog.template.json game-catalog.json '测试工具/version_catalog_test.js'
git commit -m "feat: use per-game stable version tags"
```

---

### Task 2: Add the Three Kingdoms card to the game center

**Files:**
- Modify: `index.html`
- Modify: `测试工具/version_catalog_test.js`
- Modify: `game-catalog.template.json`
- Test: `测试工具/game_center_test.js`

**Interfaces:**
- The portal’s existing `syncGameVersions()` reads `game-catalog.json` and updates every `[data-game-version]` slot by game id.
- New card uses `data-game-version="three-kingdoms"` and links to `./吞食天地三国/three-kingdoms.html`.

- [ ] **Step 1: Add failing portal assertions.** Assert that the portal contains a Three Kingdoms card, the direct URL, an independent version slot, and a “开发版” fallback until the first stable tag exists.

- [ ] **Step 2: Run the portal tests and confirm failure.**

Run:

```bash
node '测试工具/game_center_test.js'
```

Expected: FAIL because the portal currently contains only Tank Battle.

- [ ] **Step 3: Add the new card.** Add an original copy block with the title `吞食天地：汉末群雄`, concise description, `GAME 002`, version fallback `v0.1.0 开发版`, and `href="./吞食天地三国/three-kingdoms.html"`. Keep the sponsor block and Tank Battle card unchanged.

- [ ] **Step 4: Extend the catalog template and generated catalog.** Add the Three Kingdoms metadata entry, preserving the same id, title, URL, and tag namespace used by the generator.

- [ ] **Step 5: Run portal and catalog tests.**

```bash
node '测试工具/game_center_test.js'
node '测试工具/version_catalog_test.js'
```

Expected: PASS.

- [ ] **Step 6: Commit the portal integration.**

```bash
git add index.html game-catalog.template.json game-catalog.json '测试工具/game_center_test.js'
git commit -m "feat: add three kingdoms game center card"
```

---

### Task 3: Create the game shell, input layer, and data model

**Files:**
- Create: `three-kingdoms.html`
- Create: `吞食天地三国/测试/three_kingdoms_test.js`
- Modify: `README.md`
- Modify: `文件夹说明.md`

**Interfaces:**
- `Game.state` is one of `title`, `world`, `dialogue`, `battle`, `battle-result`, `camp`, or `game-over`.
- `Input.consume(action)` turns keyboard or touch input into named actions: `up`, `down`, `left`, `right`, `confirm`, `cancel`, and `battle-1` through `battle-5`.
- `DATA` contains `MAPS`, `ACTORS`, `ENEMIES`, `TACTICS`, `ITEMS`, and `DIALOGUES`.
- `Game.startNew()`, `Game.enterWorld(mapId)`, and `Game.returnToTitle()` are callable by the Node harness.

- [ ] **Step 1: Write failing shell tests.** Load the inline script in a minimal DOM/Canvas stub and assert the state machine starts at `title`, `Game.startNew()` enters `world`, all required data tables exist, and the virtual canvas is 256×240.

- [ ] **Step 2: Run the shell tests and confirm failure.**

```bash
node '吞食天地三国/测试/three_kingdoms_test.js' three-kingdoms.html
```

Expected: FAIL because `three-kingdoms.html` does not exist.

- [ ] **Step 3: Implement the self-contained shell.** Add the page title, responsive dark FC console styling, 256×240 canvas, keyboard listeners, touch controls, title screen, pause-safe state machine, and the minimal data tables for three starting actors, one recruitable actor, three enemy types, three tactics, one item, and the first map areas.

- [ ] **Step 4: Implement the input adapter.** Normalize keyboard and touch events into the named actions without letting repeated keydown events trigger repeated confirmations. Add focus-visible styles and a reduced-motion path.

- [ ] **Step 5: Run the shell tests and the existing Tank Battle tests.**

```bash
node '吞食天地三国/测试/three_kingdoms_test.js' three-kingdoms.html
node '测试工具/game_center_test.js'
node '测试工具/version_catalog_test.js'
```

Expected: all PASS; Tank Battle’s direct entry and QR path remain unchanged.

- [ ] **Step 6: Commit the game shell.**

```bash
git add three-kingdoms.html '吞食天地三国/测试/three_kingdoms_test.js' README.md '文件夹说明.md'
git commit -m "feat: scaffold three kingdoms rpg shell"
```

---

### Task 4: Implement original exploration, dialogue, locations, and save data

**Files:**
- Modify: `three-kingdoms.html`
- Modify: `吞食天地三国/测试/three_kingdoms_test.js`

**Interfaces:**
- `World.move(direction)` returns `{ moved, blocked, triggered }` and never moves the party through a blocking tile.
- `World.interact()` returns an interaction object for NPCs, chests, exits, and recovery locations.
- `Save.save(state)`, `Save.load()`, and `Save.clear()` use only the key `tk-three-kingdoms-v0`.
- `Dialogue.start(id)` and `Dialogue.confirm()` transition between `world` and `dialogue`.

- [ ] **Step 1: Add failing tests for movement and interaction.** Assert that the party can move through an open tile, cannot cross a wall, can trigger a chest once, can enter the town from the field exit, and can complete the recruit dialogue event once.

- [ ] **Step 2: Run the tests and confirm failure.**

```bash
node '吞食天地三国/测试/three_kingdoms_test.js' three-kingdoms.html
```

Expected: FAIL on movement or missing interaction behavior.

- [ ] **Step 3: Add the original map data.** Implement one field, one town, one camp, one mountain path, and one boss approach using 16×16 tiles. Use original tile patterns, place names, NPC text, chest contents, and route layout.

- [ ] **Step 4: Implement collision and transitions.** Add tile collision, area exits, town recovery, camp recovery, chest state, and one recruit event that adds the fourth actor to the roster and opens the party selection menu.

- [ ] **Step 5: Implement dialogue rendering.** Add a paged text box with original Chinese dialogue, confirm/cancel behavior, and a clear event-complete flag so the recruit event cannot repeat incorrectly.

- [ ] **Step 6: Implement save/load/clear.** Save only the project’s own state fields; handle malformed JSON by showing the specified recovery prompt and offering a clear-save action.

- [ ] **Step 7: Run exploration tests on keyboard and data paths.**

```bash
node '吞食天地三国/测试/three_kingdoms_test.js' three-kingdoms.html
```

Expected: movement, dialogue, chest, area transition, recruit event, save/load, and clear-save checks PASS.

- [ ] **Step 8: Commit exploration.**

```bash
git add three-kingdoms.html '吞食天地三国/测试/three_kingdoms_test.js'
git commit -m "feat: add three kingdoms exploration slice"
```

---

### Task 5: Implement original turn-based combat and boss encounter

**Files:**
- Modify: `three-kingdoms.html`
- Modify: `吞食天地三国/测试/three_kingdoms_test.js`

**Interfaces:**
- `Battle.start(encounterId)` creates a battle state with party, enemies, turn order, morale, and command cursors.
- `Battle.choose(actorId, command)` accepts `attack`, `tactic`, `defend`, `item`, or `retreat`.
- `Battle.resolveRound()` returns an ordered event list with damage, morale changes, defeats, and state transition.
- `Battle.finish()` awards experience and provisions without changing world state until the result screen is confirmed.

- [ ] **Step 1: Add failing combat tests.** Assert that a normal encounter starts, all five commands are available, an attack changes enemy troops, defense reduces incoming damage, each of the three tactics has its distinct effect, retreat succeeds only in a normal encounter, and the boss requires at least one tactic use for a stable win path.

- [ ] **Step 2: Run the tests and confirm failure.**

```bash
node '吞食天地三国/测试/three_kingdoms_test.js' three-kingdoms.html
```

Expected: FAIL because the battle state and resolver are not implemented.

- [ ] **Step 3: Implement battle data.** Add three original enemy types, one boss, three original tactics—火势压制, 鼓舞士气, 疑兵扰乱—one recovery item, and fixed deterministic encounter data for tests.

- [ ] **Step 4: Implement command selection and round resolution.** Use a deterministic seeded random helper for tests, keep player command order stable, resolve enemy actions, update troops and morale, and render the event log in the battle panel.

- [ ] **Step 5: Implement battle result and progression.** Award experience and provisions, level up at the first threshold, return to the prior world map, and mark the boss event complete. Show game-over when all active actors are defeated.

- [ ] **Step 6: Add keyboard shortcuts and touch commands.** Map 1–5 to the command menu and expose equivalent visible touch buttons with focus states.

- [ ] **Step 7: Run combat and exploration tests together.**

```bash
node '吞食天地三国/测试/three_kingdoms_test.js' three-kingdoms.html
```

Expected: normal combat, tactics, retreat, boss, progression, and previous exploration tests PASS.

- [ ] **Step 8: Commit combat.**

```bash
git add three-kingdoms.html '吞食天地三国/测试/three_kingdoms_test.js'
git commit -m "feat: add three kingdoms turn based combat"
```

---

### Task 6: Add catalog version v0.1.0, release tag, and final QA

**Files:**
- Modify: `game-catalog.template.json`
- Modify: `game-catalog.json`
- Modify: `README.md`
- Modify: `文件夹说明.md`
- Modify: `测试工具/version_catalog_test.js`
- Modify: `测试工具/game_center_test.js`

**Interfaces:**
- Stable tag: `game/three-kingdoms/v0.1.0`.
- Catalog entry: id `three-kingdoms`, title `吞食天地：汉末群雄`, URL `./吞食天地三国/three-kingdoms.html`, version `v0.1.0`, status `稳定版` after the tag is present.

- [ ] **Step 1: Add failing release assertions.** Assert that the catalog resolver maps `game/three-kingdoms/v0.1.0` to `v0.1.0 稳定版` and that the portal’s card points to `three-kingdoms.html`.

- [ ] **Step 2: Run the catalog and portal tests and confirm failure.**

```bash
node '测试工具/version_catalog_test.js'
node '测试工具/game_center_test.js'
```

Expected: FAIL until the namespaced tag and final catalog entry are present.

- [ ] **Step 3: Create and push the stable tag after all tests pass.**

```bash
git tag -a game/three-kingdoms/v0.1.0 -m "release: three kingdoms rpg v0.1.0 stable"
git push origin main game/three-kingdoms/v0.1.0
```

- [ ] **Step 4: Regenerate and inspect the catalog.**

```bash
node scripts/generate-game-catalog.cjs
node -e "const c=require('./game-catalog.json'); const g=c.games.find(x=>x.id==='three-kingdoms'); if(g.version!=='v0.1.0'||g.status!=='稳定版') process.exit(1); console.log(g)"
```

Expected: the Three Kingdoms entry reports `v0.1.0` and `稳定版`.

- [ ] **Step 5: Run the full regression suite.**

```bash
node '测试工具/version_catalog_test.js'
node '测试工具/game_center_test.js'
node '吞食天地三国/测试/three_kingdoms_test.js' three-kingdoms.html
node '测试工具/validate_maps.js'
for f in 测试工具/*test.js; do node "$f" tank-battle.html; done
git diff --check
git status --short
```

Expected: all tests pass; `git status --short` is clean after committing generated catalog changes.

- [ ] **Step 6: Verify the deployed URLs.** Check that the game center returns HTTP 200, `game-catalog.json` contains both games with their versions, and `three-kingdoms.html` returns HTTP 200. Open the game on desktop and mobile; verify title screen, movement, dialogue, normal battle, recruit event, boss battle, save/load, and return to the game center.

- [ ] **Step 7: Commit release documentation.**

```bash
git add game-catalog.json game-catalog.template.json README.md '文件夹说明.md' '测试工具/version_catalog_test.js' '测试工具/game_center_test.js'
git commit -m "release: publish three kingdoms rpg v0.1.0"
```

---

## Verification Checklist

Before declaring v0.1 complete, verify the spec requirements line by line: portal card and version; independent URL; keyboard and mobile controls; movement, dialogue, chest, area transitions; normal battle; recruit event; boss battle; progression; save/load/clear; offline runtime assets; asset provenance; Tank Battle and QR regression. Also verify that the stable tag is namespaced and that the next ordinary commit cannot change the displayed game version without a new game-specific tag.
