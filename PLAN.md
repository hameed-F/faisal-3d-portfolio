# PLAN: Muhammad Faisal Hameed · Interactive 3D Portfolio

**Status: APPROVED v2.1 (owner said "go", 2026-11-24). v1 built the same day (see DEVLOG).** This replaces the space-jazz ship ("The Faisal Sessions"). No style is carried over: new art direction, new UI, new layout. What is kept: the avatar, the content in `src/content.js` (all facts from `source/`), the chatbot backend (`api/chat.js` + RAG index), the email backend (`api/contact.js`, Brevo), the voice helpers and the Full/Lite/Basic quality system.

## 1. Concept: "Life-Size Snakes & Ladders"

The site opens on a **folded game board**. As the files download, the board **unfolds like a loading bar**: each fold that opens means more has loaded. When it is fully open, the camera pulls back into the 3D world. The board is now **life-size**, seen from a high camera slightly behind it (a far shot). Faisal stands on tile 1, turns to the camera and **waves**.

The board is a 10 x 10 grid (tiles 1 to 100, zig-zag like a real board). **Seven tiles glow**, each in a different row, each with a **floating title** above it. The glow ring and the title slowly **circle** over the tile, so visitors know what is there before they go.

A **dice companion** (the chatbot, see §6) rolls the number that takes Faisal to the next glowing tile. Every trip uses a **different movement**, so he is not just walking every time. Visitors can also **click or tap any glowing tile**. Faisal then travels there with that tile's movement and the section opens.

### The route (exploration mode)
I chose the tiles so that every trip is a real dice roll of 1 to 6 (a 6 gives another roll, the classic house rule). The ladders and snakes are part of the story.

| # | Tile (row) | Section | Dice | How he gets there | Clip(s) |
|---|---|---|---|---|---|
| 0 | 1 (row 1) | Start | — | Stands, turns to the camera, waves | `Wave`, `Idle` |
| 1 | **5** (row 1) | **About me** | 4 | **Rolls** forward across 4 tiles | `Roll` (chained, moved forward in code) |
| 2 | **29** (row 3) | **Education & experience** | 3 | Walks 3 tiles to the foot of the ladder on tile 8, then **climbs** it up to 29 | `Walk` → `Climb` |
| 3 | **35** (row 4) | **Projects** | 6 | Short **run**-up, then **slides** into the tile and bumps the hologram | `Run` → `Slide` |
| 4 | **41** (row 5) | **Skills & tech** | 6 | **Jumps** tile to tile (6 hops) | `Jump` (one per hop, arc in code) |
| 5 | **52** (row 6) | **Contact** | 6 + 5 | **Walks** 11 tiles | `Walk` |
| 6 | **18** (row 2) | **Promo video** | 6 | **Runs** to tile 58, where a **snake** knocks him over and he slides down its body to 18. The video plays | `Run` → `Fall` → `Slide` (moved along the snake in code) |
| 7 | **100** (row 10) | **Play with the companion** | — | **Flies** from 18 up to 100 | `Fly` |

After each section closes, the camera returns to that tile on the board and a **"Next: …"** button starts the next trip. Trips never start by themselves while someone is reading.

**Achievements (certificates)** sit in a "Trophies" strip inside the About panel, since the brief puts "projects and achievements" together and Projects already has its own hologram. *(Alternative: a second tab in the Projects hologram.)*

### What each tile shows
| Section | Camera and avatar | Panel |
|---|---|---|
| About me | "Character select" screen: the camera moves in, Faisal fills half the screen and **waves at you**, the board blurred behind him | Side panel on the other half: bio, what I build / what I'm doing now / what I'm looking for, Trophies strip, CV and GitHub buttons |
| Education & experience | The camera zooms right in so only Faisal is visible, and he switches to **Think** | A big **thought bubble** rises from his head with the education and experience timeline inside |
| Projects | Wide shot of the tile; when he slides in, a **hologram** pops up over it | Inside the hologram: a grid of project thumbnails. Each card has a **collapse arrow** that opens the details and links |
| Skills & tech | **Front view**, Faisal **dances** | The skills rise out of his head like a thought bubble, as an overlay on top |
| Contact | Same layout as About, but he **talks** | The contact form in the side panel; after a successful send he does `Victory` |
| Promo video | Faisal sits dizzy on tile 18 | A video player styled like a game card (placeholder until the YouTube link is added) |
| 100: Companion | Faisal **hovers** over tile 100 (the `Fly` loop) until the visitor chooses | A card: "Congratulations, you know me now! Want to play a round with my companion?" **Yes / No**. Yes starts game mode. No keeps him at 100 for free exploration (click any tile) |

### Game mode (after "Yes")
Faisal goes back to tile 1 and plays against the **dice companion's own pawn**. Now the dice is **random**, and the ladders and snakes work for both players. He throws on his turn (`Throw`), climbs ladders (`Climb`) and slides down snakes. Winning plays `Victory` then `Dance`; losing plays `Disappointed`. Then the visitor picks "Play again" or "Back to exploring".

## 2. Art direction (a new identity)

**"Toy-box tabletop, printed board."** The board looks like a real printed game board blown up to playground size: a thick cardboard edge, matte paper tiles, rounded toy-like wooden ladders and painted snakes. It should feel calm and touchable, not glossy, with no neon.
- **Palette:** warm paper ivory, ink navy, and four muted tile colours (brick red, teal, mustard, sage). The snakes are patterned in colours from the same palette.
- **Tiles:** each tile has a **printed gaming object**: controller, joystick, d-pad, cartridge, pixel heart, coin, sword, shield, potion, key, trophy, star, ghost, spaceship, headset, keyboard key, chess pawn, dice, map, treasure chest. I draw them in code into one texture, so there is nothing to download and they stay sharp at any size. They are printed in ink on a light paper texture. Tile numbers use a chunky board-game typeface.
- **The world around the board:** it is **always night**; there is no daytime. A deep navy sky with a few soft stars and a ground that fades into darkness. No heavy scenery, which keeps it fast. A few oversized game props at the edges (a giant spare dice, a stack of cards) only if the performance budget allows.
- **Light mode:** night, but **lamps illuminate the board**: a few big warm lamps hang over it and light the paper tiles, ladders and Faisal. The snakes are painted and unlit. Everything on the board is clearly visible.
- **Dark mode:** the lamps go out and **the snakes glow** (their patterns light up softly, with a slow pulse). The board is dim, so the glowing snakes and the glowing section tiles are what you see.
- **UI:** panels look like game cards on paper: a thick ink outline and a small drop shadow. A new font pairing (a chunky display face for titles and a clean, readable body face); I'll show 2 options in phase 1. Nothing comes from the ship version.

## 3. Smoothness ("not jumpy")
My refinements to the brief so it flows:
- **One continuous camera:** every move is a smooth, eased camera glide, never a hard cut, and the camera never passes through objects. The loader and the board are one move: the 2D folded board hands over to the 3D board in the same spot.
- **Blended animations:** every clip change cross-fades (0.2–0.4 s), and his movement speed matches his feet so he doesn't skate.
- **The visitor sets the pace:** trips start only when the visitor presses Next or clicks a tile, never in the middle of reading.
- **Skip and menu:** a "Skip" button on every trip, and a menu that lists all sections (also for keyboard users).
- **Reduced motion:** if the device asks for reduced motion, trips become a quick fade and the camera moves less.

## 4. Animation map and the three missing moves
The brief asks for **slide**, **run** and **getting hit by a snake**. You downloaded the clips, so these are now in the avatar (**18 clips**): `Run` (loops, in place), `Slide` (from "Running Slide", made in place: the original travels about 6 m, so the code moves him instead) and `Fall` (from "Falling Down": a one-shot that ends lying down about 1 m behind where he started, which is how the snake knocks him over before he slides down it to tile 18).

All 18 clips get used: Wave (start, About), Idle, Walk (Contact trip), Roll (About trip), Climb (ladders), Jump (Skills trip), Fly (trip to 100, hovering), Run (run-up to the snake), Slide (Projects trip), Fall (knocked over by the snake), Think (Education, chatbot thinking), Dance (Skills, game win), Talk (Contact, chatbot answer), Point (hovering over a tile), Throw (rolling the dice in game mode), Victory (contact sent, game win), Disappointed (game loss), Sit (watching the video on tile 18).

### Avatar status (Module 2)

**Status: DONE (2026-11-22, clips added 2026-11-24).** `avatar/export/avatar.glb` is **1.08 MB** (1,077,340 bytes), with 18 clips: `Idle`, `Wave`, `Walk`, `Talk`, `Think`, `Point`, `Victory`, `Disappointed`, `Dance`, `Throw`, `Sit` (SittingIdle), `Jump`, `Roll`, `Climb` (Climbing Ladder), `Fly` (Flying), `Run`, `Slide` (Running Slide, in place), `Fall` (Falling Down). Tested in a real Three.js page with no loading errors.

What was done (source `avatar/blend/sunnywithmaterialandrigged.blend` is untouched; all work is in `avatar/blend/avatar_work.blend`):
1. Rig checked: `mixamorig:` skeleton, 65 bones. All 10 Mixamo FBX clips matched every bone.
2. Clips imported and named `Idle`, `Wave`, `Walk`, `Talk`, `Think`, `Point`, `Victory`, `Disappointed`, `Dance`, `Throw`, one NLA track each. `Throw` was made in place (hips locked horizontally, like Mixamo's "In Place"). Walk and Dance were already in place.
3. Skin: only the skin texture, option **A ("a bit browner")**, approved by the owner. Freckles and shading detail kept.
4. No grey cone was present in the file.
5. Scaled to 1.80 m with feet at the origin. The unused leftover action and the old skin image were removed.
6. Exported with WebP textures (8 images), then compressed with meshopt (`gltf-transform optimize`): 2.42 MB → **0.85 MB**. 31.8k triangles, 9 draw calls. (Three.js loads it with `GLTFLoader` + `MeshoptDecoder`.)
7. Known cosmetic issue: the shirt print reads mirrored. It comes from the original texture and was left as is.
8. 2026-11-24: added `Roll` (one-shot), `Climb` and `Fly` (loops) the same way (FBX import, one NLA track each). Climb was re-centred on the spot with feet on the floor (the Mixamo file was offset sideways and about 0.8 m up); Roll and Fly were already in place. Re-packed with `node scripts/pack-avatar.mjs <raw.glb> <out.glb>` (drops channels that stay at rest, resamples keyframes, meshopt level high).

**Blender access (confirmed):** I control your open Blender through the MCP add-on's local server (`127.0.0.1:9876`, `execute_code` runs Python in Blender). It has already been used to save the work copy, import the clips, edit the skin, and export the GLB, so editing and exporting both work this way. If that connection ever drops, I'll give you a ready-to-run `.py` script for Blender's Scripting tab instead. For new models that aren't part of your scene (like the chess-piece designs), I run a separate background Blender, so your open file is never touched.

## 5. The board, ladders and snakes (built in code)
- **Board:** one mesh for the 100 tiles with the printed tile texture (one atlas drawn at start-up) and a thick bevelled edge. 1 to 3 draw calls.
- **Ladders:** wooden side rails with instanced rungs. About 4 ladders, including the 8 → 29 route ladder.
- **Snakes:** a smooth tube along a curve with a patterned texture and a head with eyes, gently swaying (done in the shader, so it's cheap). About 4 snakes, including the 58 → 18 route snake. The dark-mode glow is an emissive pattern, with no expensive post-processing.
- **Glowing tiles:** a ring on the tile, a soft column of light and a floating title, slowly circling.
- **Folded-board loader:** pure HTML/CSS, so it shows instantly before any 3D code downloads. The 3D board starts exactly where the CSS board ends.

## 6. The dice companion = the chatbot "Pappu Pansa"
The companion is a **friendly 3D dice** with a small face on one side. It **follows Faisal** around the board, hops when it rolls and leans in when you hover over it. Click it to **chat** at any time; a chat button is also always on screen. In exploration mode its rolls are programmed (the route above); in game mode they are random.
- **Name:** you asked me to invent a funky Pakistani name, so the dice is **"Pappu Pansa"** (pansa = the Urdu word for a dice). It is a placeholder you can veto; the backend, prompts and UI use one config value, so renaming is one line.
- **Languages:** visitors can type or speak in **English, Urdu (Urdu script or Roman Urdu)** or other languages. Pappu Pansa answers in the same language, only from the portfolio, with source chips. Voice input has a language picker (Auto / English / اردو), and spoken replies use an Urdu voice when the device has one.
- **States:** idle bob, thinking (spins slowly), answering (hops), listening (glows).

## 7. Chatbot backend (Module 4, kept)

**RAG pipeline** (per `build-requirements.md`):
1. **Chunk:** a build script turns `profile.md`, `projects.md`, `certificates.md`, `resume.md` and `links.md` into small semantic chunks, each tagged with its source and section → `data/portfolio-chunks.json`.
2. **Embed:** the same script embeds every chunk with Google's current embedding model and saves the vectors with the chunks (**precomputed index**, so no work at cold start).
3. **Retrieve:** `/api/chat` embeds the question, runs cosine similarity, and keeps the top 3–4 chunks.
4. **Generate:** the Gemini Flash model answers **only** from those chunks. If the answer isn't there, it says the portfolio doesn't provide it. It never invents personal details.
5. **Cite:** each answer shows source chips ("from Projects → Ghost Lantern") — extra credit.
6. **Explain:** a collapsible "How Pappu Pansa works" panel shows the pipeline with a diagram (the brief asks for an explanation).

SDK: official `@google/genai`, server-side only. Model names are checked against Google's docs at build time (some in the brief may be outdated). Basic protections: input length cap, rate limit, no keys in the browser.

## 8. Contact (Module 5, kept)

- The Contact tile opens the form in a side panel: Name, Email, Subject, Message.
- **Validation** in the browser *and* on the server (required fields, email format, length limits), plus safe handling (trimmed, escaped, no HTML injection into the email).
- **Spam protection:** hidden honeypot field + rate limiting (in-memory per instance as a baseline; Upstash/Vercel KV if you want it stronger — optional, free tier).
- **Sending:** `/api/contact` calls Brevo's REST API (`https://api.brevo.com/v3/smtp/email`) with `await`. Sender = verified address, to = `CONTACT_RECEIVER_EMAIL`, replyTo = visitor.
- **UI states:** sending, success, clear error message.
- **Evidence:** you send a test message from the live site and keep a screenshot of the received email.

## 9. Promo video (Module 3)
Tile 18 opens a video card. The link stays a one-line change (`PROMO_VIDEO_URL` in `src/content.js`); until then the card says "Coming soon". The YouTube player only loads when the card is opened.

## 10. Accessibility
- **Read aloud:** every panel has a speaker button that reads it aloud with the browser's built-in speech (no extra service, no cost). The paragraph being read is highlighted, with stop and pause buttons.
- Full keyboard use (Tab through tiles and sections, Enter to go, Esc to close), visible focus, alt text on every image, good contrast in both themes, reduced-motion support.
- The **Basic** tier (no 3D) is a clean, readable page with the same sections, for screen readers and very weak devices.

## 11. Devices and layouts
| Device | Layout |
|---|---|
| Laptop/desktop (landscape) | Half avatar / half panel screens as described; hologram and bubbles centred |
| Tablet | Same idea with a narrower panel |
| Phone (portrait) | Avatar in the top part of the screen and panels as **bottom sheets** you drag up; thought bubbles become a full-width card under his head; the camera is framed taller so the board fits; big tap targets |

## 12. Optimization and the automatic lighter mode
This reuses the tier system: Full / Lite / Basic, the saved choice, the automatic switch on slow loading or low FPS, and the manual switch in the menu.
- **Targets:** first screen (the folded board) in under 1 s on 4G; initial JS under 30 KB gzipped; the 3D code lazy-loaded (~180 KB gzipped); total download under 2.5 MB; under 60 draw calls and about 60k triangles; 60 fps on a laptop and 30+ fps on a phone.
- **Lite:** lower render scale, no real shadows (a soft blob under him instead), fewer props, a simpler snake shader, avatar updated at 30 Hz, shorter trips.
- Rendering pauses when the tab is hidden and when a full-screen panel covers the scene.
- Measurements go in `DEVLOG.md` after each phase.

## 13. Tech stack
Same as before: Vite, plain Three.js, plain HTML/CSS/JS, Vercel functions for `/api/chat` and `/api/contact`, `@google/genai`, Brevo REST. **No new dependencies.**

## 14. Build order (after each phase I run and test it, then you check the preview link)
You asked me to build directly on **`main`** and push, so each phase goes live on the Vercel URL once you ask me to commit and push (I won't push without being asked).
1. **Clean-out and skeleton:** remove the ship code; new HTML shell, light/dark theme, fonts, the Basic page with all sections, read-aloud.
2. **Folded-board loader and 3D board:** tiles, printed icons, ladders, snakes, glowing tiles with circling titles, far-shot camera, avatar waving on tile 1.
3. **Trips:** all 7 movements, the dice following and rolling, click-a-tile, skip.
4. **Section screens:** character screen (About, Contact), thought bubbles (Education, Skills), hologram (Projects), video card, tile 100 card.
5. **Pappu Pansa chat and email**, wired to the existing backends; multilingual voice.
6. **Game mode** against the dice (random rolls, ladders and snakes, win/lose).
7. **Phones, Lite mode, accessibility pass,** measurements, README/DEVLOG, credits.

## 15. Teacher's brief → how we meet it
| Module | How |
|---|---|
| 1. 3D portfolio (Home, About, Skills, Projects, Education & Experience, Contact; smooth transitions; responsive) | The board (Home) and 6 section tiles, smooth camera trips, layouts for each device |
| 2. Avatar | Done (18 clips, 1.08 MB) |
| 3. Promo video | Tile 18 video card, one-line link |
| 4. RAG chatbot + explanation | Pappu Pansa the dice, the existing RAG backend, a "How Pappu Pansa works" panel, multilingual |
| 5. Email/contact | Contact tile form → Brevo (existing: validated, honeypot, rate limit) |
| 6. Deployment + docs | Vercel preview per branch, README, DEVLOG, credits |
| Extra credit | Citations, multilingual + voice, light/dark, read aloud, accessibility, mouse-reactive tiles, game against the AI |

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

## 16. Decisions so far
1. Missing moves: **done**, clips added (Run, Slide, Fall; 18 clips, avatar.glb 1.08 MB).
2. Dice name: **Pappu Pansa** (placeholder, change anytime).
3. Branch: build on `main`, push when you ask.
4. Deadline: none.
5. Plan approved ("go") on 2026-11-24.

## 17. Placeholders and content gaps
- **Promo video** YouTube link.
- **Content gaps** from `source/missing-or-unclear.md`: CEGA Pre-Production certificate missing; CEGA Unreal certificate (two name spellings, no date); KDA dates blurred; Aerox ERP and Brave Believers dates; no Documentary Style Edit image; Pac-Man image says "C++", and its repo link; no builds for Light Up The House, B99 VR, Chrono Rebellion, Behind the Smile; YouTube IDs to test.
- **Your setup steps (when we reach them):** connect GitHub to Vercel; add `GEMINI_API_KEY`, `BREVO_API_KEY` and `CONTACT_RECEIVER_EMAIL` in Vercel's dashboard; verify the Brevo sender address.
