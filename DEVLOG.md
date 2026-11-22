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
