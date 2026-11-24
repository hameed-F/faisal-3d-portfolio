# Submission: Interactive 3D Web Portfolio

**Muhammad Faisal Hameed** · Roll No. **CTGA-23008** · Instructor: **Prof. Saadia Arshad**
BS Computer Science (Gaming & Animation), NED University of Engineering and Technology, Karachi

- **Live portfolio:** https://faisal-3d-portfolio.vercel.app/
- **Repository:** https://github.com/hameed-F/faisal-3d-portfolio
- **Project report (PDF):** [`report/Faisal_Hameed_CTGA-23008_Project_Report.pdf`](report/Faisal_Hameed_CTGA-23008_Project_Report.pdf)

This folder holds every deliverable that is not website code. The website source code sits at the root of the repository (see the main [README](../README.md)). This folder is **not** part of the website build: the site is built only from `index.html`, `src/`, `public/`, `data/` and `api/`, so nothing in here is shipped to visitors.

## Where each required item is

| # | Required by the brief | Where |
|---|---|---|
| 1 | Complete source code (frontend + backend) | Repository root: `src/` (frontend, Three.js), `api/` (serverless backend: `chat.js`, `contact.js`, `tts.js`), `data/` (RAG index), `scripts/`, `index.html`, `package.json` |
| 2 | Blender `.blend` + exported avatar | [`blender/avatar_work.blend`](blender/) · [`avatar/avatar.glb`](avatar/) (final, 1.08 MB, 18 clips) |
| 3 | After Effects `.aep` + final promo video | [`after-effects/Faisal_AE.aep`](after-effects/) · [`after-effects/Faisal_AE.mp4`](after-effects/) (40 s, 1920×1080, 30 fps) |
| 4 | Working RAG chatbot | Live: click the dice ("Ask me") on the site. Code: `api/chat.js`, `src/chat.js`, `data/portfolio-index.json`. Explained in report section 9 |
| 5 | Functional email/contact system | Live: tile 52 "Contact me". Code: `api/contact.js`. Report section 10 |
| 6 | Project report (PDF) | [`report/`](report/) (PDF + HTML source + images) |
| 7 | README with setup instructions | Main [README](../README.md) at the repository root, and this file |
| 8 | Screenshots of the major modules | [`screenshots/`](screenshots/) |
| 9 | Live deployment URL | https://faisal-3d-portfolio.vercel.app/ |
| 10 | GitHub repository link | https://github.com/hameed-F/faisal-3d-portfolio |

## Folder layout

```
submission/
├── README.md                 this file
├── report/
│   ├── Faisal_Hameed_CTGA-23008_Project_Report.pdf
│   ├── report.html           source of the PDF (open in a browser; print to PDF to rebuild)
│   └── img/                  images used by the report
├── after-effects/
│   ├── Faisal_AE.aep         After Effects project
│   └── Faisal_AE.mp4         rendered showreel (73.5 MB, H.264 + AAC)
├── blender/
│   └── avatar_work.blend     avatar with all 18 actions (NLA tracks)
├── avatar/
│   ├── avatar.glb            final web model used by the site (meshopt + WebP, 1,077,340 bytes)
│   ├── avatar_uncompressed.glb  the same before packing (3.38 MB)
│   ├── clips_18_preview.png  all 18 clips rendered from avatar.glb
│   └── skin_preview.png, clips_preview.png, threejs_test.png
├── mixamo/                   the 18 Mixamo animation FBX files (no skin)
└── screenshots/              d_* = desktop 1440×900, m_* = phone 390×844, p_text = text version
```

## Opening the files

- **Blender:** open `blender/avatar_work.blend` in Blender 5.0 or newer (checked: it opens in 5.0 with all textures packed and all 18 actions present). Each animation is an action on its own (muted) NLA track on `Armature`; pick one in the Action Editor or the NLA editor to play it.
- **avatar.glb:** it uses meshopt compression, so viewers need meshopt support (Three.js `GLTFLoader` + `MeshoptDecoder`, or https://gltf-viewer.donmccurdy.com/). `avatar_uncompressed.glb` opens in any glTF viewer, including Windows 3D Viewer and Blender.
- **After Effects:** open `after-effects/Faisal_AE.aep`. The project links no external footage files, so it opens without "missing footage" prompts. Its render-queue output path points to the folder on the computer where it was made; set a new output path before rendering again. `Faisal_AE.mp4` is the final render.
- **Mixamo FBX:** animation-only files from Adobe Mixamo, imported into Blender with "Automatic Bone Orientation" off.

## Run the website locally

Requirements: Node.js 20 or newer.

```
git clone https://github.com/hameed-F/faisal-3d-portfolio.git
cd faisal-3d-portfolio
npm install
npm run dev        # http://localhost:5173 (front end)
npm run build      # production build into dist/
```

The chatbot (`/api/chat`) and contact form (`/api/contact`) are Vercel serverless functions. To run them locally use `npx vercel dev`. Copy `.env.example` to `.env.local` and fill in your own `GEMINI_API_KEY`, `BREVO_API_KEY` and `CONTACT_RECEIVER_EMAIL` (never commit it). On Vercel, the same three are set in Project Settings → Environment Variables.

Testing switches: `?q=full`, `?q=lite`, `?q=basic` force a quality tier; `?theme=dark` starts in dark mode; `?nogov` turns off the automatic Lite switch.

## Credits

Board, tiles, dice, snakes, ladders, props, music and sound effects are made in code for this project. Animations: Adobe Mixamo. Fonts: Fredoka, Nunito Sans, Noto Naskh Arabic (SIL Open Font License). Libraries: Three.js, Vite, glTF-Transform, meshoptimizer (MIT). No downloaded 3D models are used in the current site. Full list in the report, section 14.
