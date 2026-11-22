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
