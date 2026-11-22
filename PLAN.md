# PLAN — Muhammad Faisal Hameed · Interactive 3D Portfolio

Status: **APPROVED by the owner (2026-11-22).** Building has started.
**Timeline: everything today. Nothing is cut up front, including Free Drive and voice chat.** §13 is now only an emergency order, used if something genuinely can't be finished. The owner is told before anything is dropped.
Facts about the owner come only from `../source/`. Anything missing is listed in §12, never invented.

---

## 1. Concept: "Game Night"

The portfolio is a small game you play through.

1. **Title screen.** A dusk forest behind a retro game menu: name, tagline, and **Start Game / Free Drive / Quick Menu / Options (Lite mode, sound, theme) / Credits**.
2. **The drive (cut-scene, skippable).** The camera follows a car along a forest road at dusk, with headlights on. Your name and tagline appear as roadside signs. This takes about 8 seconds and can be skipped with any key or tap.
3. **The cabin.** The car pulls up to a cabin with warm windows. **Your avatar waves at the door** (the Waving clip), then the camera goes inside.
4. **The game table (the hub).** A table under a warm lamp holds the board games. Each board is one section. Click or tap a board and the camera flies to it, and an HTML panel slides in with that section's content. **Back** returns to the table, and the **Quick Menu** (always visible) jumps to any section directly.
5. **Free Drive (optional mode).** Steer the car around the forest yourself, on keyboard or with touch buttons on phones. Signposts in clearings lead to each section. It's off in Lite mode, and it's the first feature cut if time runs short.

**Why it works:** it feels like a game and an exploration, but a recruiter or the teacher can still reach any section in one click, and all text is real HTML (sharp, readable, searchable, accessible).

### Board → section mapping
| Object on the table / in the cabin | Section (brief, Module 1) | Content source | Interactive |
|---|---|---|---|
| Title screen + drive + avatar at door | **Home**: name, intro, profile | `profile.md` | Avatar greets; skip button |
| **Ludo board**: four colored home zones | **About Me**: who I am, what I build, what I'm doing now, what I'm looking for | `profile.md` | Tap a zone to open it |
| **Chess board**: each piece type is a skill group | **Skills & technologies** | `profile.md` skills table | Tap a piece; **play chess vs AI** |
| **Property board** (original design, not Monopoly): 12 properties, color group = engine | **Projects & achievements** gallery (5 featured, 7 compact) | `projects.md`, `links.md`, project images | Filter by color group, search, sort |
| **Snakes & Ladders board**: squares are milestones, ladders are big steps | **Education & experience** (NED, KDA, Aerox ERP, Brave Believers, GGJ 2026) | `profile.md` | **Play vs CPU**; tap squares |
| **Trophy shelf** on the cabin wall: one framed certificate or small trophy per credential | **Achievements / certificates** (6 credentials + KDA letter) | `certificates.md`, certificate images | Tap a frame: lightbox with the scan + verify link |
| **Old CRT TV** in the corner | **Promo video** (Module 3) | YouTube link in config (placeholder for now) | Tap to play |
| **Mailbox / rotary phone** by the door | **Contact** (Module 5) | `profile.md` | Opens the contact form |
| **Chotu the snake**, always on screen | **RAG chatbot** (Module 4) | chunks built from `source/` | Tap to chat |

## 2. Art direction: "Dusk retro", light version

- **Palette:** muted teal and deep blue for outdoors, amber and warm wood indoors, cream for UI panels. Accent: one warm orange. **No neon, no bloom, no glowing outlines.**
- **Lighting:** dusk sky gradient + fog outdoors; headlights and warm cabin windows are the only strong lights. Interior is warm and well lit so text and boards read clearly on phones. Lighting is **baked** into textures wherever possible (cheap and good-looking).
- **Retro treatment (light):** low-poly models, small pixel-sharp textures (nearest filtering), subtle film grain and vignette, and the 3D drawn at a slightly lower resolution and scaled up (looks retro *and* is faster). Lite mode lowers the resolution further and drops grain.
- **UI:** game-menu style. Chunky display font for headings, a clean readable font for body text, cream panels with a thin dark outline, HUD-style chips (section name, Lite mode toggle, sound, menu).
- **Fonts:** the three reference fonts (Nimbus, Monfem, Humankind) are commercial. We'll pick a free (OFL) display font with a similar feel. Decided in phase 1 from 2–3 samples.
- **Consistency rule:** every downloaded model gets the same palette and material treatment (recolored or retextured in Blender if needed), so nothing looks pasted in.

## 3. Avatar (Module 2)

**Status: DONE (2026-11-22).** `avatar/export/avatar.glb` is **0.85 MB**, with all 10 clips, and it was tested in a real Three.js page with no loading errors.

What was done (source `avatar/blend/sunnywithmaterialandrigged.blend` is untouched; all work is in `avatar/blend/avatar_work.blend`):
1. Rig checked: `mixamorig:` skeleton, 65 bones. All 10 Mixamo FBX clips matched every bone.
2. Clips imported and named `Idle`, `Wave`, `Walk`, `Talk`, `Think`, `Point`, `Victory`, `Disappointed`, `Dance`, `Throw`, one NLA track each. `Throw` was made in place (hips locked horizontally, like Mixamo's "In Place"). Walk and Dance were already in place.
3. Skin: only the skin texture, option **A ("a bit browner")**, approved by the owner. Freckles and shading detail kept.
4. No grey cone was present in the file.
5. Scaled to 1.80 m with feet at the origin. The unused leftover action and the old skin image were removed.
6. Exported with WebP textures (8 images), then compressed with meshopt (`gltf-transform optimize`): 2.42 MB → **0.85 MB**. 31.8k triangles, 9 draw calls. (Three.js loads it with `GLTFLoader` + `MeshoptDecoder`.)
7. Known cosmetic issue: the shirt print reads mirrored. It comes from the original texture and was left as is.

**Every clip is used on the site:**
| Clip | Where |
|---|---|
| `Wave` | Greets you at the cabin door after the drive |
| `Walk` | Walks from the door to the game table (the transition into the cabin) |
| `Idle` | Default, beside the table |
| `Point` | Points toward the board or object you hover or select |
| `Think` | While Chotu is fetching an answer, and while the chess AI is "thinking" |
| `Talk` | While Chotu's answer is shown, and when a section panel opens |
| `Throw` | Throws the dice in Snakes & Ladders |
| `Victory` | When you win a game (and on a successful contact-form send) |
| `Disappointed` | When you lose a game |
| `Dance` | Easter egg: tap the avatar 3 times, or checkmate the AI on hard |

Head and eyes follow the mouse (extra credit). In Lite mode he updates at a lower rate, and Basic mode shows a still image.

**Blender access (confirmed):** I control your open Blender through the MCP add-on's local server (`127.0.0.1:9876`, `execute_code` runs Python in Blender). It has already been used to save the work copy, import the clips, edit the skin, and export the GLB, so editing and exporting both work this way. If that connection ever drops, I'll give you a ready-to-run `.py` script for Blender's Scripting tab instead. For new models that aren't part of your scene (like the chess-piece designs), I run a separate background Blender, so your open file is never touched.

## 4. Games (scope)

| Game | Playable? | Opponent | Notes |
|---|---|---|---|
| **Snakes & Ladders** | Yes | CPU (dice) | 3D dice roll, camera follows the pawn; landing on a milestone square shows that part of the journey. Works fully on touch. |
| **Chess** | Yes | **AI with 3 levels** (easy, medium, hard) | Rules and legal moves via `chess.js` (small, BSD license). Our own minimax AI with alpha-beta pruning, run in a **Web Worker** so the page never freezes. Tap-to-move on phones. Pieces built in code, so there's nothing to download: pawn, rook, bishop, queen and king are **lathe** shapes (a profile spun around an axis). The **knight can't be lathed**, so it's a lathe base plus a horse-head **side silhouette extruded with a bevel**, a separate mane strip and two eyes (about 900 triangles). The design was rendered for approval before building the set. |
| Ludo | No (navigation board) | — | Could become a 3rd game later only if everything else is done. |
| Property board | No (navigation board) | — | Original design inspired by property-trading games. No Monopoly name, art or layout. |

## 5. Chotu the chatbot (Module 4)

**Look:** a stylized low-poly snake built in code (a bendy tube along an animated curve, with a simple head and eyes) in the site palette. Nothing to download, near-zero cost to animate. He lives on the Snakes & Ladders board, then slithers to the corner of the screen and stays with you everywhere. Tapping him opens a speech-bubble chat panel. He bobs his head while "thinking" and gives a tongue flick when he answers. In Lite mode he's a small, still 3D or 2D icon with the same chat.

**RAG pipeline** (per `build-requirements.md`):
1. **Chunk:** a build script turns `profile.md`, `projects.md`, `certificates.md`, `resume.md` and `links.md` into small semantic chunks, each tagged with its source and section → `data/portfolio-chunks.json`.
2. **Embed:** the same script embeds every chunk with Google's current embedding model and saves the vectors with the chunks (**precomputed index**, so no work at cold start).
3. **Retrieve:** `/api/chat` embeds the question, runs cosine similarity, and keeps the top 3–4 chunks.
4. **Generate:** the Gemini Flash model answers **only** from those chunks. If the answer isn't there, it says the portfolio doesn't provide it. It never invents personal details.
5. **Cite:** each answer shows source chips ("from Projects → Ghost Lantern") — extra credit.
6. **Explain:** a collapsible "How Chotu works" panel shows the pipeline with a diagram (the brief asks for an explanation).

SDK: official `@google/genai`, server-side only. Model names are checked against Google's docs at build time (some in the brief may be outdated). Basic protections: input length cap, rate limit, no keys in the browser.

## 6. Contact (Module 5)

- **Mailbox / phone object** opens a form: Name, Email, Subject, Message.
- **Validation** in the browser *and* on the server (required fields, email format, length limits), plus safe handling (trimmed, escaped, no HTML injection into the email).
- **Spam protection:** hidden honeypot field + rate limiting (in-memory per instance as a baseline; Upstash/Vercel KV if you want it stronger — optional, free tier).
- **Sending:** `/api/contact` calls Brevo's REST API (`https://api.brevo.com/v3/smtp/email`) with `await`. Sender = verified address, to = `CONTACT_RECEIVER_EMAIL`, replyTo = visitor.
- **UI states:** sending, success, clear error message.
- **Evidence:** you send a test message from the live site and keep a screenshot of the received email.

## 7. Promo video (Module 3)

The CRT TV plays a YouTube embed. The link lives in one config line (`src/config.js` → `PROMO_VIDEO_URL`). Until you add it, the TV shows a "Coming soon" static screen. The video is lazy-loaded only when the TV is tapped (YouTube embeds are heavy). The MP4 and `.aep` are yours to make in After Effects; they're submitted separately.

## 8. Tech stack

| Part | Choice | Why |
|---|---|---|
| Build tool | **Vite** | Fast, tiny output, what Three.js projects usually use. |
| 3D | **Three.js** (plain, no React) | What the course taught; smallest bundle; full control for optimization. |
| UI | Plain HTML/CSS + small JS modules | Content is real HTML: readable, accessible, works without 3D. |
| Chess rules | `chess.js` | Small, well tested. |
| Backend | **Vercel serverless functions** in `/api` (Node) | Same repo, keys stay server-side, free tier. |
| LLM / embeddings | `@google/genai` | Required by the spec. |
| Email | Brevo REST via `fetch` | Required by the spec; no extra library. |
| Asset pipeline | `@gltf-transform/cli` (dev only) | Compresses models (meshopt), resizes and converts textures. |
| Hosting | **Vercel**, from GitHub `hameed-F/faisal-3d-portfolio`; `main` = production, branches = previews | Continuous deployment. |

Anything larger than these (physics engines, post-processing libraries, Stockfish) needs your approval first.

## 9. Optimization and automatic Lite mode

### Quality tiers
| Tier | When | What changes |
|---|---|---|
| **Full** | Capable laptop or phone | Full scene, real-time shadows only on the table, grain, Free Drive, render scale 0.85–1.0 |
| **Lite** | Weak device, slow network, low FPS, or chosen by the user | Render scale 0.5–0.6, no shadows (baked only), fewer trees and props, smaller textures, no grain, no Free Drive, drive cut-scene shortened, avatar at lower update rate |
| **Basic (no 3D)** | No WebGL, a software renderer, or the user picks "Text only" | A clean, fully styled HTML portfolio (same content, images, chatbot, contact). It also serves as the accessibility fallback. |

### Automatic switching
1. **Before loading:** check the GPU name (software renderers → Basic), CPU cores, device memory, the `Save-Data` setting and connection type, screen size, and `prefers-reduced-motion`. Pick a starting tier.
2. **While loading:** if the core assets take longer than ~6 s, switch to Lite and load the small assets instead.
3. **While running:** an FPS monitor watches the frame rate. If it stays under ~40 fps for 3 s, step down a tier. If it's very high for a long time on Lite, offer to step up (never automatically up, to avoid flicker).
4. **Tell the user**, like the Odama reference: a small toast says "You're in Lite mode, because the full version was running slowly. Switch back any time" with a toggle. The **Options menu and a HUD chip** always allow a manual switch. The choice is remembered for next time.

### Budgets (measured and logged in `DEVLOG.md`)
- First screen interactive in under ~3 s on a mid phone over 4G. JS for the first screen: ≤ ~250 KB gzipped (Three.js included).
- Download before the title screen: ≤ ~1.5 MB. Cabin and boards stream in during the drive. Games, chess AI, YouTube and the chatbot load only when used.
- On screen: under ~150k triangles and ~100 draw calls in Full; under ~60k triangles in Lite.
- Target 60 fps on a mid laptop, ≥ 30 fps on a mid phone.
- Every model compressed, every texture ≤ 1024 px (most 256–512), one shared texture atlas for props where possible. Pixel ratio capped at 2 (Full) and 1 (Lite).
- Tab hidden → rendering pauses. Nothing renders when nothing moves in panel views.

## 10. Assets: build vs download

**Built in code or Blender by me** (original, matches the style exactly, tiny file size):
the 4 boards (art drawn by us as textures), dice, pawns, chess pieces, Chotu the snake, the table, playing cards, the road and terrain, the sky and fog, signposts, the CRT TV (simple shapes), and the UI.

**Downloaded** (CC0 preferred, then CC-BY with credit):
| Need | Where | License |
|---|---|---|
| Forest trees, rocks, grass | Kenney *Nature Kit* or Quaternius *Ultimate Nature* | CC0 |
| Car | Kenney *Car Kit* or Quaternius cars | CC0 |
| Cabin exterior | Kenney / Poly Pizza | CC0 or CC-BY |
| Cabin furniture, lamp, mailbox or rotary phone | Kenney *Furniture Kit*, Poly Pizza | CC0 or CC-BY |
| Ambient sound (forest, engine, dice) — optional | Freesound (CC0 filter), Kenney audio | CC0 |

**How we get them:**
1. **Kenney or Quaternius packs:** you download the zip from kenney.nl/assets or quaternius.com (free, no account), unzip it into `asset_inspo/downloads/<pack-name>/`, and tell me. I pick the pieces, recolor them to our palette in Blender, compress them, and log them.
2. **Poly Pizza or Sketchfab:** I can search and import through the Blender add-on (both work). Per the project rules, **I'll show you the shortlist (name, author, license, preview) and wait for your OK before downloading.**
3. Every asset goes in `asset_inspo/ASSET_LOG.md` (name, author, URL, license) and on the site's **Credits** screen.

The Ludo and Monopoly models in `asset_inspo/` have no recorded source or license. They stay **mood reference only** unless you can tell me where they came from and their license allows use.

## 11. Extra credit

| Feature | Cost | Plan |
|---|---|---|
| Chatbot source citations | **Cheap** (chunks already carry sources) | Yes |
| Project filtering, search and ordering | **Cheap** | Yes: color groups = engine filter, search box, sort by year/featured |
| Animated avatar gestures and expressions | **Cheap** (clips already exist) | Yes |
| 3D objects reacting to the mouse | **Cheap** | Yes: avatar head follows the cursor, boards tilt slightly, Chotu watches the pointer |
| Accessibility | **Cheap** (the Basic tier does most of it) | Yes: keyboard navigation, focus states, alt text, reduced motion, contrast check |
| Dark/light theme | **Cheap** | Yes: "Dusk" (default) and "Day" palettes for UI and sky |
| Analytics | **Cheap** | Yes: Vercel Web Analytics (privacy-friendly, one line) |
| Multilingual chatbot | **Cheap** | Yes: Chotu replies in the language he's asked in (e.g., English or Urdu), still grounded in the sources |
| Voice chat | Medium | Optional: microphone input + spoken replies via the browser's speech features (best in Chrome). Late phase, cut if needed. |

## 12. Build order: one day, all phases (each phase: build, test, commit, push, then you check the Vercel URL)

*(The "Day 1 / Day 2" split below is now just the order of work within today. Free Drive (11) and voice chat are in scope, not stretch.)*

The order is chosen so that **every graded module works by the end of day 1 in a simple form**, and day 2 makes it rich. If day 2 runs out, you still have a complete, gradeable site.

**Already done:** avatar GLB (§3), repo + `.gitignore`.

**Day 1: everything works**
1. **Skeleton and deploy:** Vite + Three.js project, all sections as real HTML (this is also the Basic no-3D tier), README stub, first push. *You:* connect `hameed-F/faisal-3d-portfolio` to Vercel (I'll give exact clicks).
2. **Performance core:** quality tiers, device check, FPS monitor, Lite toast and toggle, loading screen, asset compression script.
3. **Contact form** (`/api/contact` + Brevo). *You:* verify the sender in Brevo, add the 3 env vars in Vercel, send a test and screenshot the email.
4. **Chotu + RAG** (`/api/chat`, chunk + embed script, citations, "How Chotu works" panel). Chotu starts as a simple snake; he's polished on day 2.
5. **Cabin + game table hub:** table, boards (flat versions first), trophy shelf, TV with placeholder, mailbox, avatar with Idle, Wave and Point; camera navigation, section panels, Quick Menu, mobile layout.

**Day 2: make it a game**
6. **Title screen + forest drive + cabin arrival** (Wave, then Walk to the table).
7. **Snakes & Ladders**, playable (avatar Throw, Victory, Disappointed).
8. **Chess vs AI** (3 levels, Web Worker, lathe pieces + approved knight).
9. **Extras:** project filter, search and sort, Dusk/Day theme, analytics, multilingual Chotu, mouse reactions, Dance easter egg, credits screen.
10. **Polish and proof:** measurements in `DEVLOG.md`, mobile and Lite tests, accessibility pass, README setup steps, module screenshots, report notes.
11. **Stretch only if time remains:** Free Drive mode.

## 13. Emergency cut order (only if something truly can't be finished; the owner decides)
Nothing is cut in advance. If today runs out, drop from the top of this list:
1. Free Drive mode
2. Voice chat
3. Ambient audio, film grain, extra props
4. Forest drive shortened to a few seconds (title screen → cabin)
5. Chess "hard" level and fancy piece animations
6. Ludo as a 3D board (becomes a flat panel)
7. Snakes & Ladders playable (stays as a navigation board)

**Never cut:** the six modules, Lite mode, mobile support, the Basic (no 3D) fallback, credits, and no secrets in git.

## 14. Teacher's brief → how we meet it

| Module / item | How the concept delivers it | Still open |
|---|---|---|
| 1. 3D web portfolio (Home, About, Skills, Projects, Education & Experience, Contact; smooth transitions; responsive) | Game Night: title, drive and cabin = Home; Ludo = About; Chess = Skills; Property board = Projects; Snakes & Ladders = Education & experience; Trophy shelf = certificates; Mailbox = Contact. Camera flights + panels; Lite and Basic tiers; mobile layout | Font choice; content gaps below |
| 2. Custom 3D avatar (Blender → GLB, animated) | **Done:** your avatar + all 10 Mixamo clips in one 0.85 MB GLB, every clip used on the site; follows the mouse | — |
| 3. Promo video (After Effects, 30–60 s, embedded) | CRT TV in the cabin plays it; one-line config | **You** make the video and give the YouTube link |
| 4. RAG chatbot + explanation | Chotu the snake; chunk → embed → retrieve → grounded Gemini answer with citations; "How Chotu works" panel | Confirm current Gemini model names at build time |
| 5. Email/contact (validation, spam protection, env vars, delivery evidence) | Mailbox form → `/api/contact` → Brevo; honeypot + rate limit | **You** verify the Brevo sender, set Vercel env vars, take the screenshot |
| 6. Deployment + documentation | Vercel from GitHub with preview branches; README, DEVLOG, credits | **You** connect the repo to Vercel |
| Extra credit | Citations, filtering/search/sort, gestures, mouse-reactive 3D, accessibility, theme, analytics, multilingual (voice optional) | — |

### Required submission materials
| # | Item | Who / how |
|---|---|---|
| 1 | Source code (frontend + backend) | This repo |
| 2 | `.blend` + exported avatar | `avatar_work.blend` + `avatar.glb` (submit separately; not in git) |
| 3 | `.aep` + promo MP4 | You |
| 4 | Working RAG chatbot | Phase 6 |
| 5 | Working contact system | Phase 5 |
| 6 | Project report (PDF) | You write it; I'll supply an outline, diagrams and measurements |
| 7 | README with setup steps | Phase 1, finished in phase 11 |
| 8 | Screenshots of major modules | Phase 11 |
| 9 | Live URL | Vercel |
| 10 | GitHub link | `github.com/hameed-F/faisal-3d-portfolio` |

## 15. Open questions and placeholders
- **Promo video** YouTube link (placeholder until given).
- **Fonts:** pick from 2–3 free options in phase 1.
- **Chess knight:** design render waiting for your OK (the rest of the set follows the same style).
- **Licenses** of the Ludo and Monopoly models in `asset_inspo/` (mood only until known).
- **Content gaps** from `source/missing-or-unclear.md`: CEGA Pre-Production certificate missing; CEGA Unreal certificate (two name spellings, no date); KDA dates blurred; Aerox ERP and Brave Believers dates; no Documentary Style Edit image; Pac-Man image says "C++", and its repo link; no builds for Light Up The House, B99 VR, Chrono Rebellion, Behind the Smile; YouTube IDs to test.
- **Your setup steps (when we reach them):** connect GitHub to Vercel; add `GEMINI_API_KEY`, `BREVO_API_KEY` and `CONTACT_RECEIVER_EMAIL` in Vercel's dashboard; verify the Brevo sender address.
