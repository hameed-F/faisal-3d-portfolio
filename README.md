# Muhammad Faisal Hameed: Life-Size Snakes & Ladders Portfolio

> **Semester project submission** (Roll No. CTGA-23008, Prof. Saadia Arshad). Live site: https://faisal-3d-portfolio.vercel.app/ · The report (PDF), After Effects project and video, Blender file, avatar model, Mixamo clips and screenshots are in [`submission/`](submission/README.md), which also maps every required deliverable to its location.

An interactive 3D portfolio built with Three.js and Vite. A folded game board unfolds as the site loads. Then Faisal (a custom Blender avatar with 18 Mixamo animations) stands on tile 1 of a life-size Snakes & Ladders board at night. Seven glowing tiles hold the sections: About me, Education & experience, Projects, Skills, Contact, the promo video and tile 100. Each trip uses a different movement (roll, ladder climb, slide, jumps, walk, run + snake, flying). The dice companion, **Pappu Pansa**, rolls the way, chats in English, Urdu or Roman Urdu (RAG over the portfolio, with citations) and plays a real game against you at the end.

See `PLAN.md` for the design and `DEVLOG.md` for decisions and measurements.

## Run locally
```
npm install
npm run dev          # front end only (http://localhost:5173)
```
- The chat (`/api/chat`) and contact form (`/api/contact`) are Vercel serverless functions. To run them locally use `npx vercel dev`, or deploy to Vercel.
- Copy `.env.example` to `.env.local` and fill in your own keys (never commit it): `GEMINI_API_KEY`, `BREVO_API_KEY`, `CONTACT_RECEIVER_EMAIL`. On Vercel, set the same three in Project Settings → Environment Variables.
- Optional: `COMPANION_NAME` (server) changes the chatbot's name in answers; the on-screen name is `CONFIG.COMPANION` in `src/content.js`.

## One-line settings (`src/content.js` → `CONFIG`)
- `PROMO_VIDEO_URL`: paste the YouTube link of the promo video (tile 18 shows "Coming soon" until then).
- `COMPANION`: the dice companion's name.

## Testing switches
- `?q=full`, `?q=lite`, `?q=basic`: force a quality tier (basic = the plain text version, no 3D).
- `?theme=dark`: start in dark mode (glowing snakes). `?nogov`: turn off the automatic Lite switch.

## Structure
| Path | What |
|---|---|
| `src/main.js` | Boot, loader, quality tiers, theme, menu, text version |
| `src/board/layout.js` | Board maths, ladders, snakes, the seven section tiles |
| `src/board/world.js` | The 3D scene (board, lamps, snakes, glow markers, avatar, dice, camera) |
| `src/board/story.js` | Trips, section screens, game mode |
| `src/board/textures.js` | Every texture, drawn in code (tile icons, dice faces, snake skins, labels) |
| `src/panels.js` | Section content (same HTML for 3D screens and the text version) |
| `src/chat.js`, `src/voice.js`, `src/read.js` | Chat UI, voice in/out, read-aloud |
| `api/chat.js`, `api/contact.js` | RAG chatbot (Gemini) and contact email (Brevo) |
| `scripts/pack-avatar.mjs` | Optimises the Blender avatar export (meshopt) |
