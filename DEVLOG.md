# DEVLOG

## 2026-11-22
- Plan approved; everything is built the same day, nothing cut up front.
- Avatar exported: 0.85 MB GLB, 10 clips (WebP textures + meshopt). Loads in 0.34 s in a Three.js test page.
- Phase 1: Vite skeleton; all sections as real HTML panels (this is also the no-3D "Basic" tier). Build: JS 25 kB (9.8 kB gzip), CSS 14.8 kB. Public assets 1.6 MB (images in WebP).
- Contact API (/api/contact): Brevo REST, honeypot, 5 msgs/10 min per instance, server validation, HTML escaping. Unit-tested with mocked Brevo (405, 400, honeypot, 200, 429, 502, 500 all as expected). Real delivery not tested yet (needs Vercel env vars).
- 3D stage v1: PS1 renderer (360p Full / 240p Lite render target, nearest upscale, vertex snapping, 15-bit Bayer dither, grain, vignette, dusk grade). Procedural world: forest (instanced, 3 draw calls), road, car, cabin, interior, table + 4 boards, trophy shelf, CRT TV, phone, avatar, Chotu snake. No downloaded models.
- Measured (Intel UHD, headless Edge, Full tier, cabin hub): 75 draw calls, 33.8k triangles (avatar = 31.8k), ~50 fps headless. Outdoor/indoor halves are toggled so only one is drawn (cut 52k -> 34k tris).
- Bundle: first screen JS 12.5 kB gz; 3D chunk (three.js + stage) 181 kB gz, lazy-loaded.
- Chotu RAG: 47 chunks from src/content.js -> gemini-embedding-001 (768-d, RETRIEVAL_DOCUMENT), bundled data/portfolio-index.json (320 kB). /api/chat: query embedding (RETRIEVAL_QUERY), cosine top-4, grounded answer with [n] citations. Generation model gemini-3.5-flash-lite (gemini-3.8-flash timed out >40 s in testing), 12 s timeout + fallback. Tested 5 questions locally: Three.js games, CGPA, favourite food (correctly 'not provided'), Urdu question (answered in Urdu), prompt-injection for home address (refused, 'not provided'). 1.4-4.8 s per answer.
- Games: Snakes & Ladders vs CPU (3D dice with pips, hopping tokens, ladders/snakes animation, journey squares reveal milestones, avatar Throw/Victory/Disappointed). Chess vs AI: 3D lathe pieces + extruded knight, tap-to-move with legal-move dots. Both have a 2D canvas fallback in text-only mode.
- Chess AI: chess.js search managed ~400 nodes/s (medium played bad moves), so I wrote a compact 0x88 engine for the worker: ~250-330k nodes/s. Easy depth 2 + 25% random move, medium depth 4 / 0.9 s, hard depth 5-6 / 2.2 s. Finds mate in 1, defends scholar's mate. Legality fuzz: 0 illegal moves in 30 random games (every move is also validated by chess.js in the UI). Worker 6 kB.
- Free Drive: arcade car (WASD/arrows, touch pedals on phones), tree collisions via a spatial hash, 5 signposts in clearings (About, Skills, Projects, Journey, Trophies) plus the cabin; drive close and press E/tap to open the section. Off in Lite mode (offers to switch to Full).

## 2026-11-22 (afternoon): revamp after owner feedback
- Owner disliked the PS1 table version (too grainy/blurry in Lite, static avatar, cut-scene, fonts/panels). Rebuilt as a playable third-person world: you control the avatar (WASD / phone joystick, run, drag-look), drive the car (E in/out), giant board zones (chess plaza, Snakes & Ladders field where the avatar is the token, Ludo garden, project street with 12 houses, trophy hall, drive-in promo screen, post box), Chotu follows you.
- Rendering: native resolution, no post-processing, ACES tone mapping, soft shadows (Full only), dynamic pixel ratio (lowers resolution a little before switching tier). Lite = fewer trees, no shadows, 30 fps cap; never blurry.
- Measured (Intel UHD, headless, Full, plaza): ~85 draw calls, ~84k triangles, pixel ratio 1. New world chunk 34 kB gz (plus three.js).
- Live check after keys: /api/chat 200 in 2.2 s; /api/contact sent a test message (Brevo accepted, HTTP 200). Improved chunks (stack in contribution chunks + one chunk per engine group, 52 chunks) and top-5 retrieval; 'Three.js games' now returns all three.
- Exploration: 8 places tracked (localStorage), zone-arrival banners, 'Discovered' toasts + sound, minimap with player arrow, full map (M / tap) with fast travel, beacons over unexplored zones, highlight ring under the nearest interactable.
- Phone: menu sheet replaces the chip row under 860 px, title moved to the bottom, joystick hint, RUN toggle, big tap-to-interact button, panels as bottom sheets; minimap hides while a panel is open.

## 2026-11-22 (evening): hut + board worlds (owner's change list)
- Flow: landing with avatar + car (avatar waves facing the camera) → walk or drive to the hut (minimap with distance + arrow) → walkable hut with the board table → click a board (or E next to it) → camera dives into it → you are inside that board world (exit portal back).
- Board worlds: Project Street (12 houses; each house interior shows the project poster, info and contributions on the walls; arcade cabinet opens the link), Snakes & Ladders (milestone signs rise out of the squares; Victory on ladders, Disappointed on snakes, slide along snake bodies), Ludo garden (about-me plaques, E to read up close), Chess plaza (skill statues + plaques, play vs AI), Trophy hall (framed certificates with captions). Old telephone in the hut rings when you come near and opens the contact form.
- Bugs fixed: car only spun (it collided with its own hit-box; now skipped while driving) → test drove 8 m in 2.5 s; phone movement (canvas lacked touch-action:none so the browser ate drags) → touch test moved 8 m. Chotu and the avatar now respect walls, boards, trees; indoors the camera pulls closer instead of clipping.
- Measured (hut, Full): 31 draw calls, 32.6k triangles.

## 2026-11-22 (night): "FAISAL: a film in 7 chapters"
- Godard-style film layer: chapter title cards (red/blue/yellow), letterbox during cut-scenes, narrator subtitles (spoken when sound is on), kinetic info cards replace reading plaques/walls.
- Procedural jazz (drums, walking bass, e-piano) via Web Audio, mood per chapter; no audio files.
- Red convertible (no roof, avatar visible in the seat); menu navigation = cinematic drive along the road with jump cuts (skippable).
- Chotu hidden until the first tap, then slithers across the camera.
- Modes: Explore / Film (hands-free tour of all chapters) / Read.
- Animations: Throw (car keys, dice), Victory (discover, ladders), Point (near interactables), Disappointed (crash, snakes), Dance (idle 10 s, music swells), Think+Talk (info cards), Wave (arrival), Walk/Idle.
- Measured (house interior, Full): 33 draw calls, 33k triangles. Normalized repo line endings to LF (.gitattributes).

## 2026-11-22 (late night): "The Tower"
- Owner scrapped the film/open-world version. Rebuilt as a cutaway multi-floor building (src/building/): landing close-up on the avatar → walks in, jumps the steps → lobby. Click anything to walk there; floor buttons take the lift. Floors: Lobby (Chotu desk, promo TV, ringing phone booth, sofa), About, Journey (+ Snakes & Ladders table), Projects (12 screens, arcade), Skills (statues + chess table), Trophies, Roof (trampoline, bench, boombox). Short info cards replace long text. NPC walkers, cat, birds, pastel city.
- Avatar: added SittingIdle (Sit) and Jump, in place; 12 clips, 0.9 MB (meshopt).
- Static building + street merged into one vertex-coloured mesh. Measured (lobby, Full, headless Intel UHD): 36 draw calls, 42k triangles. Building chunk 37.6 kB gz.
- Removed scrapped modules: src/world/*, cinema.js, music.js, stage/index.js, stage/world.js, stage/freedrive.js.

## 2026-11-22 (late night 2): "Player One: Faisal" (full reset)
- Owner asked to scrap everything except content + avatar. New concept: level-select floating island with 6 levels; game-menu screens (Player, Quest Log, Game Library, Inventory, Trophy Room, Multiplayer); XP + achievements; Chotu on the fountain; chess side quest (2D board in the menu).
- 30 CC0 models (Quaternius, Kenney, CreativeTrio, iPoly3D, Isa Lousberg, Alperen) via Poly Pizza, packed by scripts/pack-props.mjs into public/models/props.glb (476 kB, textures stripped, meshopt). Logged in asset_inspo/ASSET_LOG.md and credited on the site.
- Static island + props baked into one vertex-coloured mesh at load. Measured (overview, Full, headless Intel UHD): 57 draw calls, ~84k triangles. Game chunk 34.6 kB gz; three.js 148 kB gz.
- Removed the tower code (src/building).

## 2026-11-22 (night 3): "Faisal's Portfolio Run"
- Owner rejected the island; asked for a Mario-like platformer. Built an original retro side-scroller (src/run/): 6 zones, </> code blocks → cards, bugs to stomp, commits, trophies (certificates), chess arcade, mailbox (contact), TV (promo), SHIP IT rocket → course clear. Chotu reimagined as a hovering TV robot. Retro loading + title screens, HUD, stage select, phone D-pad.
- Explained to the owner that Nintendo's actual Mario look/characters can't be copied; the game is genre-inspired and original.
- Measured (Full, headless Intel UHD): 36 draw calls, ~59k triangles. Run chunk 35 kB gz; all art procedural (no model downloads). Removed the island version and props.glb.
- Waiting on the owner's documentary-edit image (attachment did not reach this session).
- Owner uploaded the Documentary Style Edit frame (paper collage, rotunda + king): added as public/img/projects/documentary-edit_frame.webp (29 kB) and used on its card/screen. Not copied into source/ (CLAUDE.md: ask before touching source).
- Replaced bug enemies (owner: a friend's site uses bugs) with Deadlines: walking alarm clocks that shake harder when you are near; stomp = DEADLINE BEATEN.

### 2026-11-22 (late night): MIDNIGHT REEL
- Owner rejected the platformer ("no personality, bad to navigate, no day/night") and gave a taste list: PS-1, CS/GTA, Mario, Sonic, Where's My Water, Subway Surfers, Fruit Ninja, Keaton/Chaplin, dark and moody.
- New concept: a silent-film night street (src/noir/). Restored the third-person controller (player.js) and added auto-walk. Added uSilent to the PS1 post shader. Skill Slice swipe game (slice.js). Projector-robot Chotu. Removed the snake greeting from chat.js.
- Tested with Playwright (Edge headless, 1280x720 and 390x844 touch): all 7 places reached by auto-walk in 5.4 to 8.6 s (incl. intertitle), chess opens and exits, trailer and contact open, chat opens, day/night and silent toggles work, 0 console errors. FPS on this laptop (Intel UHD, headless): ~57.
- Kept the retro STAGE 1-1 loader (now titled MIDNIGHT REEL). src/run/ (platformer) removed.

### 2026-11-22 (night): Midnight Reel round 2
- Owner feedback: "too blurry and hard to navigate, not very fun; drop chess and Snakes & Ladders".
- Sharp: the PS1 low-res pass is off for this concept. The renderer now draws at the screen's real resolution (pixel ratio up to 2 on Full, 1 on Lite) with 4x MSAA on Full, no vertex snap, no dither, almost no grain. Fog pushed back (38 to 120 m).
- Navigation: fixed high camera that shows the whole plaza (no camera dragging needed). Click/tap anywhere to walk there (a ring marks the spot), tap a building or the bottom dock to go in. Auto-walk always runs; first visit plays a short title card, later visits open straight away. Measured arrivals 3.9 to 6.0 s from across the plaza.
- Fun: 18 golden film reels to collect (counter top-left, Victory every 6, Dance + "That's a wrap!" at 18); pigeons peck and scatter when you run at them. The Penny Arcade now launches Skill Slice directly (skills list inside it).
- Removed chess, Snakes & Ladders, src/games, stage/games3d.js, stage/textures.js, stage/chotu.js and the chess.js dependency; Read-mode panels no longer mention them.

### 2026-11-23: THE FAISAL SESSIONS (space-jazz rebuild)
- Owner: "still not liking it, can you make a website cowboy bebop style??" Built an original space-jazz ship cutaway (src/ship/: ship.js, index.js, cards.js, jazz.js, slice.js, ship.css). Removed src/noir.
- Told owner no show names/characters/logo/lines are used (copyright); mood only.
- Tested (Edge headless, 1280x720 and 390x844 touch): every room opens (arrivals 1.8 to 6.9 s across the whole ship), dossier, Skill Swipe, contact, trailer, lights toggle, jump; 0 console errors. FPS ~55 (laptop) / ~59 (phone size).

### 2026-11-24: three new avatar clips
- Added Roll, Climbing Ladder and Flying (from avatar/mixamo) in avatar_work.blend as `Roll`, `Climb`, `Fly`. Backup of the previous file: avatar/blend/avatar_work_before_roll_climb_fly.blend.
- Climb was offset in the Mixamo file (hips ~1 m sideways, ~0.8 m up): re-centred on the spot, lowest foot now at 0.023 m (same as Idle). Roll and Fly were already in place.
- New repeatable pack step: scripts/pack-avatar.mjs (drop rest-pose channels, resample, dedup, prune, meshopt high). avatar.glb 939,112 → 1,007,980 bytes (+67 KB; the three clips are ~39 KB of that). Raw Blender export 3.15 MB.
- `Climb` and `Fly` added to the looping set in src/stage/avatar.js; `Roll` plays once. None of the three is wired into the ship yet.
- Tested (Edge headless): all 15 clips load (0.45-0.56 s), Roll/Climb/Fly animate, 0 console errors; full site (?q=full) loads avatar.glb and renders with 0 errors; `vite build` passes.

### 2026-11-24 (later): Run, Slide, Fall
- Added Running → `Run` (loop, in place), Running Slide → `Slide` (made in place: original travels ~6 m), Falling Down → `Fall` (one-shot, ends lying ~1 m back). 18 clips; avatar.glb 1,077,340 bytes (+69 KB). Backup: avatar/blend/avatar_work_before_run_slide_fall.blend.
- Headless Edge check: all 18 clips load, feet at floor (0.017 to 0.02 m), 0 console errors. `Run` added to the looping set in src/stage/avatar.js.
- PLAN.md v2.1: always-night lighting (light mode = lamps over the board, dark mode = glowing snakes), dice name Pappu Pansa, build on main.

## 2026-11-24: Life-Size Snakes & Ladders (v1, replaces the ship)
- Plan v2.1 approved ("go"). Removed src/ship, stage/psx.js, audio.js, theme.css. New: src/board/{layout,textures,world,story,avatar}.js, new panels/chat/read/main/style, new index.html.
- Route: 1 → 5 About (Roll) → ladder 8→29 Education (Walk + Climb) → 35 Projects (Run + Slide) → 41 Skills (6 Jump hops) → 52 Contact (Walk, rolls 6+5) → snake 58→18 Video (Run, Fall, Slide down the snake) → 100 (Fly, Yes/No → game). Dice rolls are programmed in exploration (a 6 rolls again), random in game mode.
- Everything on the board is drawn in code: 20 printed gaming icons, dice faces, snake skins, labels. No downloaded models.
- Always night. Light mode = 4 warm lamps (2 in Lite) light the board; dark mode = lamps off, snakes glow (emissive skin + additive halo, pulsing).
- Dice companion "Pappu Pansa" (googly eyes, moustache, topi) follows Faisal, rolls before each trip, opens the chat.
- Chat: api/chat.js now tells the model the reply language explicitly (Urdu script / Roman Urdu / English, detected in code) and lowers the retrieval threshold for Urdu-script questions (cross-language scores are lower). Tested live: English, Urdu script, Roman Urdu, and an unknown fact ("not provided") all answered correctly in the right language, 1.2 to 1.9 s.
- Build: first screen JS 16 kB gz + CSS 5 kB gz; 3D chunk 170 kB gz (lazy); avatar.glb 1.05 MB. Loads to ready in about 3.6 s on the dev server (cold, headless).
- Tested (headless Edge, software GL so ~6 fps): all 7 trips and screens open, game mode rolls/moves/turns, dark mode, phone layout (390x844), text version, production build (vite preview); 0 console errors. Real-GPU frame rate not measured yet.
- Test hygiene: my headless test runs had left ~97 Edge processes running and slowing the PC; killed them and fixed the test script to close its browser.
- Known/untested: real email send and chat on Vercel (need env vars there), read-aloud voices depend on the device, Urdu voice only if the OS has one.

### 2026-11-24 (evening): polish round 1 (owner's 19 notes)
- Loader: a real two-fold board (four Ludo-coloured quarters) that unfolds right half, then bottom half; title is now the owner's name, no "Snakes & Ladders" (it's a portfolio).
- Board: vivid Ludo colours (red, green, blue, yellow tiles alternating with white), emissive map so colours stay bright under the lights.
- Street lights removed; four floating paper lanterns (two in Lite) light the board in light mode and go dark in dark mode (snakes glow).
- Section titles are now 3D extruded text (helvetiker bold, ~20 kB gz), circling over each glowing tile.
- Facing: the Climb clip faces the model's -z and the Fly clip heads along +x; both are now corrected. Faisal turns to the camera's final position (not the old one) at the start and on About/Contact.
- Ladder: Education is filmed from the far side so the ladder stays behind him.
- Projects: the hologram now spawns floating 3D project cards (real thumbnails) that rise out of the projector and orbit; tap a card to open its details in the list.
- Dice companion trails behind Faisal (relative to where he faces), and stands beside him on the home screen.
- Tile click / menu: he runs straight there (7.5 units/s), no dice. The Next button keeps the story moves with dice rolls.
- Closing a section zooms out to the whole board. Tile 100: lands (no hanging in the air), Yes/No card; "No" or quitting the game opens a Home screen (Faisal big, board behind him, cycling 8 animations, section buttons, Play again, Restart the tour).
- Menu bug: a document click handler matched `[data-tier]` on <body> and closed the menu on every click. Fixed (button[data-tier]).
- UI skin: panels framed with a Ludo RGBY checker border, tile-style buttons, dark HUD tiles with coloured bases; the cream background is gone.
- Tested headless (software GL, so camera moves were snapped for screenshots): every section screen, home screen, menu (real mouse clicks), dark mode, phone 390x844; 0 console errors. Build: world chunk 190 kB gz.

### 2026-11-24 (night): polish round 2
- Section titles are now flags planted on the tiles (swallow-tail cloth with the title, waving in code, turned toward the camera). The 3D text and its font were removed (world chunk 199 -> 173 kB gz).
- Loader is a loading bar: ten Ludo-coloured board tiles flip face-up one by one as files arrive.
- Faisal looks up at the camera while waving at the start (head, neck and upper spine tilt toward the camera on top of the clip; also on About, Contact, tile 100 and the home screen).
- Tile art replaced: emblems of his own projects (ghost, lantern, cat, fish, bulb, clock, mask, VR headset, chomper, aircraft, block, clapperboard, controller) plus Karachi/Pakistan doodles (chai, cricket bat and ball, kite, rickshaw, mango, minaret, truck-art flower, dome, samosa).
- "Read as a page" in the menu had no click handler; fixed. Removed the "No third-party 3D models" line from Credits.

### 2026-11-24 (late night): polish round 3
- Loading screen shows both: the Ludo board unfolding in quarters (right half, then bottom half) and the tile loading bar under it, driven by the same progress.
- Flags redesigned to look professional: slim navy banners with a coloured edge at the pole, the tile number and the title in spaced capitals (Nunito Sans), thin metal pole with a brass base and finial, gentle wave.
- Board refinements: tiles are glazed and bevelled with dark grout between them, quieter emblems, small two-digit numbers, a thin inset line; dark walnut frame with a brass rim; softer glow rings, beams and orbs.
- The board now rests on a big wooden table (plank texture drawn in code, thick top, dark apron and four legs, floor far below), so it no longer floats. 7 extra draw calls, one 512 px texture.
- Removed the "Or tap any glowing tile" hint popup (dice-roll hints during trips stay).
