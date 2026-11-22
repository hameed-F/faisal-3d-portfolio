// All facts come from ../source/ (profile.md, projects.md, certificates.md, links.md). Do not add invented details.
export const CONFIG = {
  // One-line change: paste the YouTube link of the promo video here (e.g. "https://youtu.be/XXXXXXXXXXX").
  PROMO_VIDEO_URL: '',
};

export const profile = {
  name: 'Muhammad Faisal Hameed',
  title: 'Game Developer & Interactive 3D Programmer',
  subtitle: 'Game Developer (Unreal Engine 5 · Unity · Three.js) & Technical Gameplay Programmer',
  tagline: 'I architect the gameplay logic, then build the 3D worlds they run in.',
  email: 'hameedfaisal24@gmail.com',
  phone: '0304-0639955',
  location: 'Karachi, Pakistan',
  github: 'https://github.com/hameed-F',
  framer: 'https://muhammadfaisalhameed.framer.website/#about',
  resume: '/Muhammad_Faisal_Hameed_Resume.pdf',
  availability: 'Open to Game Development, Gameplay Programming, and Interactive 3D roles & internships',
  summary:
    'Final-year Computer Science undergraduate (Gaming & Animation specialization, CGPA 3.605/4.00) at NED University of Engineering and Technology. Experienced in building responsive gameplay systems, AI behaviors, VR interactions, and browser-based 3D games across Unreal Engine 5, Unity, and Three.js, backed by hands-on industry experience in game development and AI-powered ERP software.',
};

// About Me: four "home zones" (Ludo board). Each uses only facts from the source.
export const aboutZones = [
  { id: 'who', color: '#c8553d', title: 'Who I am',
    text: 'A final-year Computer Science student (Gaming & Animation) at NED University of Engineering and Technology, Karachi, with a CGPA of 3.605/4.00, based in Karachi, Pakistan.' },
  { id: 'build', color: '#2f6f8f', title: 'What I build',
    text: 'Responsive gameplay systems, AI behaviors, VR interactions, and browser-based 3D games across Unreal Engine 5, Unity, and Three.js.' },
  { id: 'now', color: '#d9a441', title: 'What I am doing now',
    text: 'Interning on AI-powered ERP software at Aerox ERP, and as a Game Development intern at Brave Believers, mentored by founder Jawwad Javed.' },
  { id: 'next', color: '#5b8a5a', title: 'What I am looking for',
    text: 'Game Development, Gameplay Programming, and Interactive 3D roles and internships.' },
];

// Skills: one chess piece per category.
export const skills = [
  { piece: 'king', group: 'Game engines & 3D web', items: [
    ['Unreal Engine 5 (Blueprints & C++)', 'Light Up The House; CEGA Unreal Engine certification'],
    ['Unity (C# & VR/XR)', 'Chrono Rebellion, Behind the Smile, B99 VR'],
    ['Three.js (WebGL / 3D browser games)', 'Ghost Lantern, Mera Craft, Mochi and the Royal Fish']] },
  { piece: 'queen', group: 'Programming', items: [
    ['C++ & C', 'Light Up The House (UE5 C++), Pac-Man Clone (pure C)'],
    ['C#', 'Chrono Rebellion, Behind the Smile, B99 VR'],
    ['JavaScript / HTML / CSS', 'Ghost Lantern, Mera Craft, Mochi and the Royal Fish'],
    ['React Native & Python / Java', 'Cross-platform mobile app development (React Native), coursework & tooling']] },
  { piece: 'rook', group: '3D art, motion & design', items: [
    ['Blender (3D modeling & assets)', 'B99 VR, Stylized Low-Poly Aircraft & Props'],
    ['Adobe After Effects & Premiere Pro', 'Scott Pilgrim Title Sequence, Documentary Style Edit, Parallax Wildwestern'],
    ['Adobe Illustrator & Autodesk Maya', 'Vector poster artwork, walk cycle animation basics']] },
  { piece: 'bishop', group: 'Workflow & architecture', items: [
    ['Git & GitHub', 'All repositories (github.com/hameed-F)'],
    ['AI guard state machines, raycasting', 'Mochi and the Royal Fish, Ghost Lantern'],
    ['ERP systems', 'Aerox ERP internship']] },
  { piece: 'knight', group: 'Also', items: [
    ['VR/AR development', 'B99 VR'],
    ['Game design principles', 'Semester game projects (a new game each semester)']] },
];

// Journey: Snakes & Ladders milestones in order.
export const journey = [
  { when: '2023', title: 'Starts BS Computer Science (Gaming & Animation)', where: 'NED University of Engineering and Technology, Karachi',
    text: 'CGPA 3.605/4.00. Focus: game engine architecture, real-time 3D mechanics, AI behavior systems, semester game production. Expected early 2027.' },
  { when: '2025', title: 'Chrono Rebellion', where: 'Unity · team of 3', text: 'First-person time-travel shooter: gameplay programmer and level designer.' },
  { when: '2026', title: 'Global Game Jam 2026', where: 'Behind the Smile · team of 6', text: 'A complete narrative Unity game in 48 hours on the theme "Mask": animations, UI systems, asset integration.' },
  { when: '2026', title: 'IT Department intern', where: 'Karachi Development Authority (KDA) · 4 weeks',
    text: 'Documented institutional IT infrastructure, file movement workflows, and backend server-side data handling across departments.' },
  { when: '2026', title: 'Google AI Professional Certificate', where: 'Google via Coursera', text: 'Seven-course professional certificate (June 2026).' },
  { when: 'Present (2026)', title: 'Game Development intern', where: 'Brave Believers · mentor: founder Jawwad Javed',
    text: 'Developing interactive gameplay systems, rapid game prototypes, and production game logic.' },
  { when: 'Present (2026)', title: 'Software / ERP intern', where: 'Aerox ERP (Pakistan-based startup)',
    text: 'Contributing to AI-powered enterprise resource planning software focused on physical operations, asset tracking, and minimal operational downtime.' },
];

// Projects. group = engine group (property-board colour).
const T = (id) => `/img/projects/${id}.webp`;
export const projects = [
  { id: 'light-up-the-house', name: 'Light Up The House', featured: true, group: 'Unreal', year: 2026, stack: 'Unreal Engine 5 (Blueprints & C++)',
    role: 'Solo / Lead Developer · Gameplay & Systems Programmer', image: T('light-up-the-house_poster'),
    summary: 'Third-person sci-fi adventure aboard a dark, malfunctioning space shuttle where the player must restore a failed power grid before time runs out.',
    points: ['Core gameplay & logical structures: end-to-end game loop, countdown timer state machine, tool-to-appliance matching validation (Blueprints and C++).',
      'Navigation & spatial flow: multi-corridor shuttle layout, dark-environment sightlines, dynamic lighting from emergency blackout to full illumination.',
      'Player interaction systems: third-person interaction triggers, item pickup/equip logic, visual feedback cues for broken ship systems.'],
    links: [['Trailer', 'https://youtu.be/SAdCzLdvwuI'], ['Gameplay', 'https://youtu.be/IanUdZbedtk']] },
  { id: 'ghost-lantern', name: 'Ghost Lantern', featured: true, group: 'Three.js', year: 2026, stack: 'Three.js · JavaScript (full-stack web)',
    role: 'Solo · Full-Stack Game & Web Developer', image: T('ghost-lantern_level1'),
    summary: 'Multi-level first-person 3D browser horror-survival game with raycast torch combat, four ghost AI archetypes, and full-stack OTP user accounts with a global leaderboard.',
    points: ['First-person atmospheric exploration: multi-room levels with dense fog and a directional spotlight torch.',
      'Raycast combat & resource management: continuous raycasting to banish ghosts while the battery drains; non-regenerating health.',
      'Four ghost AI archetypes: Tall, Fast, Horrific, and a Friendly blue ghost that penalizes the player if beamed.',
      'Authentication & global leaderboard: email OTP verification, persistent player dashboards, run tracking across both levels.'],
    links: [['Play live', 'https://ghost-lantern-nine.vercel.app/']] },
  { id: 'chrono-rebellion', name: 'Chrono Rebellion', featured: true, group: 'Unity', year: 2025, stack: 'Unity · C#',
    role: 'Team of 3 · Gameplay Programmer & Level Designer', image: T('chrono-rebellion_combat'),
    summary: 'First-person time-travel action shooter: a soldier from 2145 travels back to World War II to stop enemy forces armed with stolen alien technology.',
    points: ['Concept & core combat scripting: co-created the concept; programmed player movement, aiming, and sci-fi weapon shooting in C#.',
      'Character animations & logic: combat and locomotion animation state transitions plus mission progression logic.',
      'Dual-era level setup: built and dressed scenes bridging the futuristic 2145 vessel and WWII combat zones.'],
    links: [['Gameplay', 'https://youtu.be/FuWAgXPMjxw']] },
  { id: 'behind-the-smile', name: 'Behind the Smile', featured: true, group: 'Unity', year: 2025, stack: 'Unity · C#',
    role: 'Team of 6 · Asset Integration, Animation & UI Developer', image: T('behind-the-smile_cover'),
    summary: 'A 48-hour Global Game Jam 2026 entry on the theme "Mask": an angel helps townspeople who hide their true emotions behind identical smiling masks.',
    points: ['Character & environment animations: animation states and expressive transitions triggered when masks are removed.',
      'UI systems & dialogue flow: narrative UI panels, dialogue prompts, scene transition overlays in Unity.',
      '3D asset pipeline: prepared, imported and configured 3D town and character assets within the 48-hour deadline.'],
    links: [['Gameplay', 'https://youtu.be/tTceiBnP9YM']] },
  { id: 'mochi-royal-fish', name: 'Mochi and the Royal Fish', featured: true, group: 'Three.js', year: 2026, stack: 'Three.js · JavaScript',
    role: 'Solo · Game & AI Programmer', image: T('mochi-royal-fish_maze'),
    summary: 'Stylized 3D cat-and-dog stealth heist game demonstrating autonomous AI guard patrol, line-of-sight detection and tactical evasion.',
    points: ['Autonomous palace guard AI: patrol pathing, state switching and live minimap tracking for the guards "Duke" and "Baron".',
      'Stealth & ability mechanics: Sneak (Shift), Dash (Space), Yarn distraction (E), Hide (Q), Catnip charge meters.',
      'Custom heist HUD & minimap: guard patrol status, minimap radar, round scoring, remaining fish targets.'],
    links: [['Play live', 'https://mochi-heist.vercel.app/'], ['Gameplay', 'https://youtu.be/1qQqhyVils8']] },
  { id: 'mera-craft', name: 'Mera Craft', group: 'Three.js', year: 2026, stack: 'Web 3D · Three.js', role: 'Solo', image: T('mera-craft_title-screen'),
    summary: 'Browser-based Minecraft-inspired voxel sandbox recreated from scratch in Three.js: block placement, terrain generation, first-person controls.',
    links: [['Play live', 'https://meracraft2xuo.vercel.app/'], ['Video', 'https://youtu.be/fIUiE5l_wqM']] },
  { id: 'b99-vr', name: 'B99 VR ("I Want It That Way")', group: 'Unity', year: 2026, stack: 'VR & Systems · Unity & Blender', role: 'Solo', image: T('b99-vr_precinct'),
    summary: 'Solo VR recreation of the Brooklyn Nine-Nine precinct lineup scene. Precinct props modeled in Blender; spatial VR staging, lighting and audio sync in Unity.',
    links: [['Video', 'https://youtu.be/4TKZvehTNtU']] },
  { id: 'pacman-clone', name: 'Pac-Man Clone', group: 'Systems', stack: 'Systems / C · Pure C', role: 'Solo', image: T('pacman-clone_screenshot'),
    summary: 'Classic Pac-Man built from scratch in C with standard libraries and no game engine: maze rendering, collision detection, scoring, ghost movement AI.',
    links: [['GitHub profile', 'https://github.com/hameed-F']] },
  { id: 'scott-pilgrim', name: 'Scott Pilgrim vs. the World: Title Sequence', group: 'Motion', stack: 'Motion & 3D Art · After Effects', role: 'Solo', image: T('scott-pilgrim-title_frame'),
    summary: 'Reimagined kinetic typography and comic-book title sequence: custom cutouts, crumpled paper textures, pixel art sprites, rhythmic transitions.',
    links: [['Video', 'https://youtu.be/DyrDWOMvIT4']] },
  { id: 'documentary', name: 'Documentary Style Edit', group: 'Motion', stack: 'Motion & 3D Art · After Effects / Premiere', role: 'Solo', image: null,
    summary: 'Narrative documentary video piece: pacing, archival framing, lower-thirds motion design, atmospheric audio mixing.',
    links: [['Video', 'https://youtu.be/jXZs1dolJgo']] },
  { id: 'parallax-wildwestern', name: 'Parallax Wildwestern', group: 'Motion', stack: 'Motion & 3D Art · After Effects', role: 'Solo', image: T('parallax-wildwestern_credits-frame'),
    summary: '2.5D depth-layered Western scene: flat illustrated layers animated through a virtual 3D camera rig.',
    links: [['Video', 'https://youtu.be/BU2gEggawEU']] },
  { id: 'design-vault', name: '3D Modeling & Vector Design Vault', group: 'Motion', stack: 'Motion & 3D Art · Blender & Illustrator', role: 'Solo', image: T('visual-design-vault_collage'),
    summary: 'Low-poly 3D game props (stylized propeller aircraft, battle axe, modular assets) in Blender, plus halftone vector poster artwork in Illustrator.',
    links: [] },
];

export const certificates = [
  { id: 'cega', title: 'Unreal Engine: 100 credit hours training', issuer: 'CEGA Training Program ("Game Development & Visualisation")', date: '', image: '/img/certs/cega-unreal-100hrs-a.webp', verify: '' },
  { id: 'google', title: 'Google AI Professional Certificate', issuer: 'Google via Coursera', date: 'Jun 16, 2026', image: '/img/certs/google-ai-professional.webp', verify: 'https://coursera.org/verify/professional-cert/6W54OWS2UR6M' },
  { id: 'maya', title: 'Walk Cycle Basics in Autodesk Maya', issuer: 'ITeachStuff', date: '2022-11-11', image: '/img/certs/iteachstuff-maya-walk-cycle.webp', verify: '' },
  { id: 'premiere', title: 'Adobe Premiere Pro Basics', issuer: 'ITeachStuff', date: '2022-11-11', image: '/img/certs/iteachstuff-premiere-pro.webp', verify: '' },
  { id: 'video', title: 'Video Basics', issuer: 'ITeachStuff', date: '2022-11-05', image: '/img/certs/iteachstuff-video-basics.webp', verify: '' },
  { id: 'kda', title: 'IT Department internship certificate', issuer: 'Karachi Development Authority (KDA)', date: '', image: '/img/certs/kda-it-internship.webp', verify: '' },
];

export const credits = [
  // Add every downloaded asset here AND in asset_inspo/ASSET_LOG.md (name, author, license, URL).
];
