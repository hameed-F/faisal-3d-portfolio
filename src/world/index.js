import * as THREE from 'three';
import { buildAreas, blocked, HUT, OFFS } from './areas.js';
import { createPlayer } from './player.js';
import { createCar } from './car.js';
import { createExplore } from './explore.js';
import { mat, box, shadowy } from './materials.js';
import { loadAvatar } from '../stage/avatar.js';
import { buildChotu } from '../stage/chotu.js';
import { psxUniforms } from '../stage/psx.js';
import { TIERS, FpsGovernor } from '../quality.js';
import { projects, aboutZones, skills, journey, certificates, profile } from '../content.js';
import { chapter, cards, subtitle, letterbox, pick, isPlaying, stopAll } from '../cinema.js';
import { setMood, swell } from '../music.js';
import { ROAD } from './areas.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Red convertible sports car: low, wide, no roof, so you can see who's driving.
function buildCar() {
  const car = new THREE.Group();
  const paint = mat('#d21f1a'); const dark = mat('#1d1d1f'); const chrome = mat('#d9d4c8'); const seat = mat('#f1e3c4'); const glass = new THREE.MeshLambertMaterial({ color: '#9fc4d6', transparent: true, opacity: 0.45 });
  car.add(box(1.95, 0.5, 4.3, paint, 0, 0.5, 0));                       // body
  car.add(box(1.9, 0.18, 1.5, paint, 0, 0.82, 1.35));                  // bonnet
  car.add(box(1.9, 0.22, 1.1, paint, 0, 0.84, -1.55));                 // boot
  car.add(box(0.12, 0.3, 1.6, paint, -0.92, 0.88, -0.1), box(0.12, 0.3, 1.6, paint, 0.92, 0.88, -0.1)); // doors
  car.add(box(1.7, 0.08, 1.4, dark, 0, 0.73, -0.15));                  // cabin floor
  car.add(box(0.6, 0.5, 0.15, seat, -0.42, 0.98, -0.55), box(0.6, 0.5, 0.15, seat, 0.42, 0.98, -0.55)); // seat backs
  const ws = box(1.7, 0.42, 0.05, glass, 0, 1.12, 0.55); ws.rotation.x = -0.45; car.add(ws);           // windscreen
  car.add(box(1.74, 0.05, 0.06, chrome, 0, 1.31, 0.47));
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 14), dark); wheel.position.set(-0.42, 1.05, 0.25); wheel.rotation.x = -1.0; car.add(wheel);
  car.add(box(1.98, 0.14, 0.18, chrome, 0, 0.36, 2.18), box(1.98, 0.14, 0.18, chrome, 0, 0.36, -2.18));
  const lampM = new THREE.MeshBasicMaterial({ color: '#fff2c4' }); const tailM = new THREE.MeshBasicMaterial({ color: '#ff2a1a' });
  for (const x of [-0.65, 0.65]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 10), lampM); l.rotation.x = Math.PI / 2; l.position.set(x, 0.66, 2.16); car.add(l); car.add(box(0.36, 0.1, 0.05, tailM, x, 0.68, -2.16)); }
  car.add(box(0.8, 0.06, 0.06, mat('#f6d32d'), 0, 0.9, -2.08)); // racing stripe tail
  car.add(box(0.28, 0.02, 4.0, mat('#ffffff'), 0, 0.76, 0.1));   // racing stripe
  const wGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.32, 12); wGeo.rotateZ(Math.PI / 2);
  const wheels = [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]].map(([x, z]) => { const w = new THREE.Mesh(wGeo, dark); w.position.set(x, 0.4, z); car.add(w); const hub = box(0.34, 0.16, 0.16, chrome); hub.position.set(x * 1.02, 0.4, z); car.add(hub); return w; });
  const head = new THREE.SpotLight('#ffe2a8', 0, 30, 0.5, 0.6, 1.2); head.position.set(0, 0.7, 2.0); head.target.position.set(0, 0, 12); car.add(head, head.target);
  shadowy(car); return { car, wheels, head, seat: new THREE.Vector3(-0.42, -0.12, -0.3) };
}

export async function initWorld({ canvas, tierName, onProgress, onSection, onCert, onChotu, onSlow, onPlayStart, onGame, toast, reducedMotion }) {
  psxUniforms.uSnap.value = 0;
  let tier = TIERS[tierName];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier.name === 'Full', powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = tier.name === 'Full'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 320);
  const dpr = Math.min(devicePixelRatio || 1, 2); let pr = tier.name === 'Full' ? Math.min(dpr, 1.5) : Math.min(dpr, 1); const minPr = tier.name === 'Full' ? 0.85 : 0.7;
  function resize() { renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  resize(); addEventListener('resize', resize);

  onProgress?.(0.15, 'Building the world…');
  const W = buildAreas(scene, tier); const A = W.areas;
  onProgress?.(0.35, 'Waking up the avatar…');
  const avatar = await loadAvatar('/models/avatar.glb', (f) => onProgress?.(0.35 + f * 0.55, 'Waking up the avatar…'));
  avatar.group.traverse((o) => { if (o.isMesh) o.castShadow = tier.name === 'Full'; }); avatar.look.enabled = false; scene.add(avatar.group);
  const chotu = buildChotu(); chotu.group.scale.setScalar(2.2); scene.add(chotu.group);
  const C = buildCar(); C.car.position.set(4.2, 0, 44); C.car.rotation.y = Math.PI * 0.92; A.outdoor.group.add(C.car);
  const carCol = { x: 4.2, z: 44, r: 1.8 }; A.outdoor.colliders.push(carCol);
  A.outdoor.interactables.push({ pos: C.car.position, radius: 3.0, kind: 'car', label: 'Car' });
  onProgress?.(0.95, 'Lighting the lamps…');

  // ---------------- area state ----------------
  let cur = A.outdoor; let fading = false; const state = { mode: 'title', section: 'home' };
  Object.values(A).forEach((a) => { a.group.visible = a === cur; });
  let lastBump = 0;
  const player = createPlayer({ avatar, camera, colliders: () => cur.colliders, bounds: () => cur.bounds, dom: canvas, onBump: (speed) => { const n = performance.now(); if (speed > 3.5 && n - lastBump > 9000) { lastBump = n; avatar.play('Disappointed'); subtitle(pick('crash'), 2800); api.sfx?.('lose'); } } });
  const car = createCar({ car: C.car, wheels: C.wheels, headlight: C.head, camera, colliders: A.outdoor.colliders, onSpeed: (v) => api.onSpeed?.(v) });
  const fader = document.createElement('div'); fader.className = 'fader'; document.body.appendChild(fader);
  async function setArea(id, spawn, opts = {}) {
    if (fading) return; fading = true; player.enable(false);
    fader.classList.add('on'); await sleep(reducedMotion ? 10 : 380);
    cur.group.visible = false; cur = A[id]; cur.group.visible = true;
    const sp = spawn || cur.spawn; player.teleport(sp.pos.clone(), sp.yaw); if (state.mode === 'cine' || state.mode === 'film') state.mode = 'walk'; chotuPos.copy(sp.pos).add(V(1.4, 0, 1.4));
    player.st.targetDist = cur.bounds ? 4.6 : 7.5; player.st.dist = player.st.targetDist; player.st.pitch = cur.bounds ? 0.42 : 0.32; player.followCamera(0, true);
    explore.enterArea(id); setMood(MOODS[id] || 'road');
    if (CHAPTERS[id] && !opts.noCard) { fader.classList.remove('on'); await chapter(...CHAPTERS[id]); }
    await sleep(60); fader.classList.remove('on'); fading = false;
    if (state.mode === 'walk' && !panelIsOpen()) player.enable(true);
    api.sfx?.('open');
  }
  const panelIsOpen = () => state.section !== 'home';
  const CHAPTERS = { outdoor: [1, 'The Road', 'a boy, a car, a forest'], hut: [2, 'The Hut', 'where every game is a CV'], projects: [3, 'The Houses', 'twelve things he built'], journey: [4, 'The Ladders', 'up, down, and up again'], about: [5, 'The Garden', 'who is this person?'], skills: [6, 'The Plaza', 'every piece is a skill'], trophy: [7, 'The Trophies', 'paper proof'] };
  const MOODS = { outdoor: 'road', hut: 'hut', projects: 'board', journey: 'board', about: 'film', skills: 'board', trophy: 'film', house: 'hut' };

  // ---------------- exploration HUD ----------------
  const explore = createExplore({
    onDiscover: () => { if (state.mode === 'walk') { avatar.play('Victory'); subtitle(pick('discover'), 2600); } },
    getPlayer: () => (state.mode === 'car' ? { x: C.car.position.x, z: C.car.position.z, rot: C.car.rotation.y } : { x: avatar.group.position.x, z: avatar.group.position.z, rot: avatar.group.rotation.y }),
    getCar: () => C.car.position, getArea: () => cur.id, hut: HUT, onTravel: (id) => travel(id), sfx: (n) => api.sfx?.(n), toast,
  });
  function travel(id) { if (state.mode === 'car') exitCar(); if (state.mode !== 'walk') return; setArea(id, id === 'hut' ? null : undefined); }

  // ---------------- mobile helpers ----------------
  const runBtn = document.createElement('button'); runBtn.className = 'run-btn'; runBtn.hidden = true; runBtn.setAttribute('aria-pressed', 'false'); runBtn.textContent = 'RUN'; document.body.appendChild(runBtn);
  runBtn.addEventListener('click', () => { player.st.runLock = !player.st.runLock; runBtn.setAttribute('aria-pressed', String(player.st.runLock)); });
  const joyHint = document.createElement('div'); joyHint.className = 'joy-hint'; joyHint.hidden = true; joyHint.innerHTML = '<i></i><span>drag to walk</span>'; document.body.appendChild(joyHint);
  const showWalkUI = (v) => { runBtn.hidden = !v; joyHint.hidden = !v; explore.show(v || state.mode === 'car'); };

  // ---------------- interactions ----------------
  const prompt = document.createElement('button'); prompt.className = 'act-prompt'; prompt.hidden = true; document.body.appendChild(prompt);
  const help = document.createElement('div'); help.className = 'ctrl-help'; help.hidden = true; help.innerHTML = '<span><b>WASD</b> move</span><span><b>Shift</b> run</span><span><b>Drag</b> look</span><span><b>E</b> interact</span><span><b>M</b> map</span>'; document.body.appendChild(help);
  let near = null; let lastHouse = null; let phoneAnswered = 0;
  const cap = (s) => s.charAt(0) + s.slice(1).toLowerCase();
  const PROMPTS = {
    car: () => 'Drive the car', enterHut: () => 'Go inside the hut', exitHut: () => 'Go outside', board: (i) => `Jump into ${cap(i.label.split(' · ')[0])}`,
    trophy: () => 'Enter the Trophy Hall', promo: () => 'Watch the promo', phone: () => (A.hut.phone.ringing ? 'Answer the ringing phone' : 'Use the telephone'), exitBoard: () => 'Back to the hut',
    house: (i) => `Enter: ${i.label}`, exitHouse: () => 'Back to the street', link: () => (A.house.link ? 'Open the project link' : 'No public link yet'),
    playSnakes: () => 'Roll the dice: play Snakes & Ladders', playChess: () => 'Play chess vs AI', aboutPlaque: () => 'Read this', skillPlaque: () => 'Read this', cert: (i) => `View ${i.label}`, chotu: () => 'Talk to Chotu',
  };
  async function interact() {
    if (state.mode === 'inspect') { endInspect(); return; }
    if (state.mode === 'car') { exitCar(); return; }
    if (state.mode !== 'walk' || !near || fading || panelIsOpen()) return; const i = near; api.sfx?.('click');
    switch (i.kind) {
      case 'car': enterCar(); break;
      case 'enterHut': explore.discover('hut'); setArea('hut'); break;
      case 'exitHut': setArea('outdoor', { pos: V(HUT.x, 0, HUT.z + 7.4), yaw: 0 }); break;
      case 'board': enterBoard(i.id); break;
      case 'trophy': explore.discover('trophy'); setArea('trophy'); break;
      case 'promo': onSection?.('promo', { fromWorld: true }); break;
      case 'phone': A.hut.phone.ringing = false; phoneAnswered = performance.now(); explore.discover('phone'); avatar.play('Talk'); onSection?.('contact', { fromWorld: true }); break;
      case 'exitBoard': setArea('hut', { pos: V(OFFS.hut, 0, 2.4), yaw: Math.PI }); break;
      case 'house': { const p = projects.find((x) => x.id === i.id); A.house.dress(p); lastHouse = i.id; await setArea('house'); await playCards(projectCards(p), p.name); break; }
      case 'exitHouse': { const h = A.projects.houses[lastHouse]; setArea('projects', h ? { pos: h.front.clone(), yaw: h.yaw } : null); break; }
      case 'link': if (A.house.link) window.open(A.house.link, '_blank', 'noopener'); break;
      case 'playSnakes': onGame?.('snakes'); break;
      case 'playChess': onGame?.('chess'); break;
      case 'aboutPlaque': await playCards(aboutCards(i.id), 'About me'); break;
      case 'skillPlaque': await playCards(skillCards(i.id), 'Skills'); break;
      case 'cert': { const c = certificates.find((x) => x.id === i.id); await playCards([{ img: c.image.replace('/certs/', '/certs/thumb/'), k: c.issuer, t: c.title }, ...(c.date ? [{ k: 'Dated', t: c.date }] : []), ...(c.verify ? [{ k: 'Verify online', t: 'coursera.org/verify' }] : [])], 'Trophy Hall'); break; }
      case 'chotu': onChotu?.(); break;
      default: break;
    }
  }
  prompt.addEventListener('click', interact);
  addEventListener('keydown', (e) => { if (e.target.closest?.('input,textarea,select')) return; if (e.key === 'e' || e.key === 'E') interact(); if (e.key === 'Escape' && state.mode === 'inspect') endInspect(); });

  // board on the table → the camera dives into it → you land inside that board world
  async function enterBoard(id) {
    const m = W.boards['mini_' + id]; if (!m || fading) return;
    state.mode = 'dive'; player.enable(false); showWalkUI(false); prompt.hidden = true;
    const p = m.getWorldPosition(new THREE.Vector3()); const from = camera.position.clone(); const q0 = camera.quaternion.clone();
    const to = p.clone().add(V(0, 0.8, 0.3)); const t0 = performance.now(); const dur = reducedMotion ? 10 : 950;
    await new Promise((res) => { const step = () => { const k = Math.min(1, (performance.now() - t0) / dur); const e = k * k * (3 - 2 * k); camera.position.lerpVectors(from, to, e); camera.lookAt(p); const q1 = camera.quaternion.clone(); camera.quaternion.copy(q0).slerp(q1, Math.min(1, e * 1.5)); if (k < 1) requestAnimationFrame(step); else res(); }; step(); });
    state.mode = 'walk'; explore.discover(id); await setArea(id); showWalkUI(true); avatar.play('Wave');
  }
  // inspect a plaque: the camera glides in front of it so it can be read
  let inspectFrom = null;
  function inspect(st) {
    if (!st) return; state.mode = 'inspect'; player.enable(false); showWalkUI(false);
    const face = st.userData.face; const wp = face.getWorldPosition(new THREE.Vector3()); const n = V(0, 0, 1).applyQuaternion(face.getWorldQuaternion(new THREE.Quaternion()));
    inspectFrom = { pos: camera.position.clone(), q: camera.quaternion.clone(), to: wp.clone().addScaledVector(n, innerHeight > innerWidth ? 5.2 : 3.4), look: wp, t: 0 };
    avatar.group.visible = false; chotu.group.visible = false; api.sfx?.('open'); prompt.hidden = false; prompt.innerHTML = '<kbd>E</kbd> Done reading'; prompt.dataset.key = 'inspect';
  }
  function endInspect() { state.mode = 'walk'; inspectFrom = null; avatar.group.visible = true; chotu.group.visible = true; player.enable(true); showWalkUI(true); prompt.dataset.key = ''; }

  async function enterCar() {
    state.mode = 'keys'; player.enable(false); showWalkUI(false);
    const d = C.car.position.clone().sub(avatar.group.position); avatar.group.rotation.y = Math.atan2(d.x, d.z); avatar.play('Throw'); api.sfx?.('click'); // toss the keys
    await sleep(reducedMotion ? 50 : 1400);
    state.mode = 'car'; carCol.off = true; car.enter(); explore.discover('car'); explore.show(true); api.sfx?.('open'); avatar.setBase('Idle'); subtitle(pick('car'));
  }
  function exitCar() { const p = car.exit(); state.mode = 'walk'; carCol.off = false; player.teleport(p, C.car.rotation.y); player.enable(true); showWalkUI(true); }

  let chotuSpawned = false; let chotuEntering = false;
  async function spawnChotu() {
    if (chotuSpawned) return; chotuSpawned = true; chotuEntering = true; chotu.group.visible = true;
    const fwd = V(0, 0, -1).applyQuaternion(camera.quaternion); const right = V(1, 0, 0).applyQuaternion(camera.quaternion);
    const base = camera.position.clone().addScaledVector(fwd, 2.4).add(V(0, -0.9, 0)); const t0 = performance.now(); const dur = reducedMotion ? 10 : 1700;
    chotu.group.scale.setScalar(3.2); subtitle(pick('chotu'), 3200); api.sfx?.('chotu'); chotu.setMode('thinking');
    await new Promise((res) => { const step = () => { const k = Math.min(1, (performance.now() - t0) / dur); const p = base.clone().addScaledVector(right, (k - 0.5) * 6); p.y += Math.sin(k * Math.PI) * 0.4; chotu.group.position.copy(p); chotu.group.rotation.y = Math.atan2(-right.z, right.x); if (k < 1) requestAnimationFrame(step); else res(); }; step(); });
    chotu.group.scale.setScalar(2.2); chotuPos.copy(avatar.group.position).add(V(1.4, 0, 1.4)); chotuEntering = false; chotu.setMode('idle');
  }
  // info as kinetic title cards (Think while it starts, Talk while it plays)
  async function playCards(list, label) {
    if (!list.length) return; const was = state.mode; state.mode = 'cards'; player.enable(false); showWalkUI(false); prompt.hidden = true;
    avatar.play('Think'); setTimeout(() => avatar.setBase('Talk'), 1200);
    await cards(list, { label }); avatar.setBase('Idle');
    state.mode = was === 'cards' ? 'walk' : was; if (state.mode === 'walk') { player.enable(true); showWalkUI(true); }
  }
  const phrases = (text) => text.split(/(?<=[.;:])\s+/).flatMap((s) => (s.length > 90 ? s.split(/,\s+/) : [s])).map((s) => s.trim()).filter(Boolean);
  function aboutCards(id) {
    if (id === 'profile') return [{ k: profile.location, t: profile.name }, { k: 'Role', t: profile.title }, { k: 'Motto', t: profile.tagline }, { k: 'Studying', t: 'BS Computer Science (Gaming & Animation), NED University · CGPA 3.605/4.00' }, { k: 'Looking for', t: profile.availability }];
    const z = aboutZones.find((x) => x.id === id); return z ? [{ k: 'About me', t: z.title }, ...phrases(z.text).map((t) => ({ t }))] : [];
  }
  function skillCards(piece) { const g = skills.find((x) => x.piece === piece); return g ? [{ k: 'Skill group', t: g.group }, ...g.items.map(([n, d]) => ({ k: 'shown in ' + d, t: n }))] : []; }
  function projectCards(p) { return [{ img: p.image, k: `${p.stack}${p.year ? ' · ' + p.year : ''}`, t: p.name }, { k: 'Role', t: p.role }, ...phrases(p.summary).map((t) => ({ t })), ...(p.points || []).map((x) => ({ k: 'What I did', t: x.split(':')[0] })), ...(p.links.length ? [{ k: 'Links', t: 'Walk to the arcade cabinet to open ' + p.links.map((l) => l[0].toLowerCase()).join(' / ') }] : [])]; }

  // ---------- menu navigation = a cinematic drive in the convertible ----------
  let driveN = 0;
  async function driveTo(target) {
    if (state.mode === 'cine' || fading) return; const quick = driveN++ > 0;
    state.mode = 'cine'; player.enable(false); showWalkUI(false); prompt.hidden = true; letterbox(true); setMood('road');
    if (cur.id !== 'outdoor') { fader.classList.add('on'); await sleep(350); cur.group.visible = false; cur = A.outdoor; cur.group.visible = true; fader.classList.remove('on'); }
    carCol.off = true; avatar.setBase('Idle'); subtitle(pick('car'), 3500);
    const dur = reducedMotion ? 300 : quick ? 4200 : 6500; const t0 = performance.now(); let skipped = false;
    const skip = document.querySelector('.cine-skip'); skip.hidden = false; skip.onclick = () => { skipped = true; };
    const shots = [(p, f) => p.clone().add(V(f.z * 5, 1.2, -f.x * 5)).addScaledVector(f, 2), (p, f) => p.clone().addScaledVector(f, 9).add(V(0, 1.6, 0)), (p, f) => p.clone().addScaledVector(f, -7).add(V(0, 5.5, 0)), (p, f) => p.clone().add(V(-f.z * 3.4, 0.7, f.x * 3.4)).addScaledVector(f, -1)];
    await new Promise((res) => { const step = () => { const k = skipped ? 1 : Math.min(1, (performance.now() - t0) / dur); const e = k < 0.85 ? k : 0.85 + (1 - Math.pow(1 - (k - 0.85) / 0.15, 2)) * 0.15; const tt = Math.min(0.999, e);
      const p = ROAD.getPointAt(tt); const f = ROAD.getTangentAt(tt); C.car.position.copy(p); C.car.rotation.y = Math.atan2(f.x, f.z); C.wheels.forEach((w) => { w.rotation.x += 0.5; });
      const shot = shots[Math.floor(k * (quick ? 3 : 4)) % shots.length]; camera.position.copy(shot(p, f)); camera.lookAt(p.x, 1.0, p.z); // jump cuts between angles
      if (k < 1) requestAnimationFrame(step); else res(); }; step(); });
    skip.hidden = true; C.car.position.set(HUT.x + 4.5, 0, HUT.z + 9); C.car.rotation.y = Math.PI * 0.9; carCol.x = C.car.position.x; carCol.z = C.car.position.z; carCol.off = false;
    letterbox(false); state.mode = 'walk';
    await setArea(target === 'outdoor' ? 'outdoor' : target, target === 'outdoor' ? { pos: V(HUT.x, 0, HUT.z + 7.4), yaw: 0 } : undefined);
    if (state.mode === 'walk') { player.enable(true); showWalkUI(true); avatar.play('Wave'); }
  }

  // landing: avatar next to the car, camera in front
  player.teleport(A.outdoor.spawn.pos.clone(), 0); avatar.group.rotation.y = 0.3;
  async function startPlay() {
    if (state.mode !== 'title') return;
    state.mode = 'intro'; onPlayStart?.();
    const ap = avatar.group.position; avatar.group.rotation.y = Math.atan2(camera.position.x - ap.x, camera.position.z - ap.z); // face the camera to say hello
    avatar.play('Wave'); await sleep(reducedMotion ? 100 : 2300);
    state.mode = 'walk'; player.st.yaw = avatar.group.rotation.y; player.followCamera(0.016); player.enable(true); showWalkUI(true);
    help.hidden = false; setTimeout(() => { help.hidden = true; }, 9000);
    subtitle(pick('start'), 4200); setTimeout(() => toast?.('<b>Head to the hut</b> · walk, or take the car (E). The map in the corner shows the way.', 6000), 4300);
  }
  function teleportTo(id) {
    const map = { about: 'about', skills: 'skills', projects: 'projects', journey: 'journey', achievements: 'trophy', hut: 'hut', outdoor: 'outdoor' };
    const target = map[id]; if (!target) return;
    if (state.mode === 'title' || state.mode === 'intro') { state.mode = 'walk'; onPlayStart?.(); }
    if (state.mode === 'car') exitCar();
    if (cur.id !== target) driveTo(target); explore.discover(target);
  }

  // ---------------- games ----------------
  let gameCam = null; let gameClick = null; let camFrom = null; const followTgt = V(0, 0, 0);
  function focusGame(key) {
    state.mode = 'game'; player.enable(false); prompt.hidden = true; showWalkUI(false); explore.show(false);
    const c = W.boards[key].group.position; const port = innerHeight > innerWidth;
    gameCam = key === 'journey' ? { pos: c.clone().add(V(0, port ? 30 : 22, port ? 14 : 15)), tgt: c.clone().add(V(0, 0, 1)), follow: true } : { pos: c.clone().add(V(0, port ? 24 : 17, port ? 11 : 12)), tgt: c.clone().add(V(0, 0, 0.8)) };
    camFrom = { pos: camera.position.clone(), q: camera.quaternion.clone(), t: 0 };
  }
  function endGame() { gameClick = null; gameCam = null; api.gameFollow = null; state.mode = 'walk'; player.enable(true); showWalkUI(true); }

  // ---------------- pointer: click a board on the table, Chotu, game squares ----------------
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); let downAt = null; let hoverMini = null;
  const minis = Object.entries(W.boards).filter(([k]) => k.startsWith('mini_')).map(([, g]) => g);
  const setNdc = (e) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return; setNdc(e);
    if (state.mode === 'game' && gameClick) { for (const k of ['journey', 'skills']) { const b = W.boards[k]; const hit = ray.intersectObject(b.face, false)[0]; if (hit) { gameClick({ board: b, local: b.group.worldToLocal(hit.point.clone()) }); break; } } return; }
    if (state.mode === 'inspect') { endInspect(); return; }
    if (state.mode !== 'walk' || panelIsOpen()) return;
    if (cur.id === 'hut') { const hit = ray.intersectObjects(minis, true)[0]; if (hit) { let o = hit.object; while (o && !o.userData.boardId) o = o.parent; if (o) { enterBoard(o.userData.boardId); return; } } }
    if (ray.intersectObject(chotu.group, true).length) onChotu?.();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (cur.id !== 'hut' || state.mode !== 'walk' || e.pointerType === 'touch') return; setNdc(e);
    const hit = ray.intersectObjects(minis, true)[0]; let o = hit?.object; while (o && !o.userData.boardId) o = o.parent;
    if (o !== hoverMini) { if (hoverMini) hoverMini.position.y -= 0.06; hoverMini = o || null; if (hoverMini) hoverMini.position.y += 0.06; canvas.style.cursor = hoverMini ? 'pointer' : ''; }
  });

  // ---------------- frame loop ----------------
  const governor = new FpsGovernor({ threshold: tier.name === 'Lite' ? 22 : 40, onSlow: (fps) => { if (pr > minPr + 0.01) { pr = Math.max(minPr, pr - 0.25); resize(); governor.reset(); return; } onSlow?.(fps, tier); } });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onSlow?.(0, tier, 'context'); });
  const clock = new THREE.Clock(); let running = true; let last = 0; const chotuPos = V(2.2, 0, 48); const tmp = V(0, 0, 0); let ringT = 0; let idleT = 0; let dancing = false; let lastPointed = null; let lastPointT = 0;
  function frame(now) {
    if (!running) return; requestAnimationFrame(frame);
    if (now - last < 1000 / tier.maxFps - 1) return; last = now;
    const dt = Math.min(clock.getDelta(), 0.1); const t = clock.elapsedTime; governor.tick(now);
    if (state.mode === 'title') {
      const p = avatar.group.position; const a = Math.sin(t * 0.15) * 0.3 + 0.35; camera.position.set(p.x + Math.sin(a) * 7, 2.2, p.z + Math.cos(a) * 7); camera.lookAt(p.x + 1.6, 1.1, p.z - 1);
      if (innerWidth > 860 && innerWidth > innerHeight) camera.setViewOffset(innerWidth, innerHeight, -innerWidth * 0.18, 0, innerWidth, innerHeight); else camera.clearViewOffset();
    } else {
      if (camera.view) camera.clearViewOffset();
      if (state.mode === 'intro') { const p = avatar.group.position; camera.lookAt(p.x, 1.3, p.z); }
      else if (state.mode === 'walk') player.update(dt);
      else if (state.mode === 'car') car.update(dt);
      else if (state.mode === 'cine') { /* driven by driveTo */ }
      else if (state.mode === 'inspect' && inspectFrom) { inspectFrom.t = Math.min(1, inspectFrom.t + dt / 0.8); const k = 1 - Math.pow(1 - inspectFrom.t, 3); camera.position.lerpVectors(inspectFrom.pos, inspectFrom.to, k); const q0 = inspectFrom.q.clone(); camera.lookAt(inspectFrom.look); const q1 = camera.quaternion.clone(); camera.quaternion.copy(q0).slerp(q1, k); }
      else if (state.mode === 'game' && gameCam) {
        camFrom.t = Math.min(1, camFrom.t + dt / (reducedMotion ? 0.01 : 1.0)); const k = 1 - Math.pow(1 - camFrom.t, 3);
        if (gameCam.follow && api.gameFollow && camFrom.t >= 1) { const f = api.gameFollow.position; const port = innerHeight > innerWidth; camera.position.lerp(V(f.x, f.y + (port ? 13 : 9.5), f.z + 9), Math.min(1, dt * 2.5)); followTgt.lerp(f, Math.min(1, dt * 3)); camera.lookAt(followTgt); }
        else { camera.position.lerpVectors(camFrom.pos, gameCam.pos, k); camera.lookAt(gameCam.tgt); const q2 = camera.quaternion.clone(); camera.quaternion.copy(camFrom.q).slerp(q2, k); if (camFrom.t >= 1) followTgt.copy(gameCam.tgt); }
      }
    }
    // Chotu follows you but never goes through walls, boards or trees
    if (!chotuSpawned) chotu.group.visible = false;
    else if (chotuEntering) { /* animated by spawnChotu */ }
    else if (!api.chotuBusy) {
      const target = state.mode === 'car' ? C.car.position : avatar.group.position;
      tmp.copy(target).add(V(Math.sin(avatar.group.rotation.y + 2.4) * 1.6, 0, Math.cos(avatar.group.rotation.y + 2.4) * 1.6));
      if (state.mode !== 'title') {
        const d = tmp.distanceTo(chotuPos);
        if (d > 14 && !blocked(cur.colliders, tmp.x, tmp.z, 0.3)) chotuPos.copy(tmp);
        else if (d > 0.6) { const step = tmp.clone().sub(chotuPos).multiplyScalar(Math.min(1, dt * (d > 5 ? 3.5 : 1.6))); const nx = chotuPos.x + step.x; const nz = chotuPos.z + step.z; if (!blocked(cur.colliders, nx, nz, 0.3)) { chotuPos.x = nx; chotuPos.z = nz; } else if (!blocked(cur.colliders, nx, chotuPos.z, 0.3)) chotuPos.x = nx; else if (!blocked(cur.colliders, chotuPos.x, nz, 0.3)) chotuPos.z = nz; }
      }
      const onBoard = ['journey', 'about', 'skills'].includes(cur.id) && Math.abs(chotuPos.x - OFFS[cur.id]) < 11 && Math.abs(chotuPos.z) < 11;
      chotu.group.position.set(chotuPos.x, onBoard ? 0.33 : 0.05, chotuPos.z);
      const look = target.clone().sub(chotuPos); chotu.group.rotation.y = Math.atan2(-look.z, look.x); chotu.group.visible = state.mode !== 'inspect';
    }
    if (!carCol.off) { carCol.x = C.car.position.x; carCol.z = C.car.position.z; }
    // the avatar stands on top of the giant boards
    const ap = avatar.group.position; if (state.mode === 'walk' && ['journey', 'about', 'skills'].includes(cur.id)) { const half = W.boards[cur.id].size / 2 + 0.6; ap.y = Math.abs(ap.x - OFFS[cur.id]) < half && Math.abs(ap.z) < half ? 0.31 : 0; } else if (state.mode === 'walk') ap.y = 0;
    // nearest interactable (+ the phone rings when you come close)
    if (state.mode === 'walk' || state.mode === 'car') {
      const p = state.mode === 'car' ? C.car.position : avatar.group.position; let best = null; let bd = 1e9;
      if (state.mode === 'walk') { for (const i of cur.interactables) { const dd = Math.hypot(i.pos.x - p.x, i.pos.z - p.z); if (dd < i.radius && dd < bd) { bd = dd; best = i; } } if (!best && Math.hypot(chotuPos.x - p.x, chotuPos.z - p.z) < 1.3 && player.st.speed < 0.3) best = { kind: 'chotu' }; }
      if (cur.id === 'hut') { const dPh = Math.hypot(A.hut.phone.pos.x - p.x, A.hut.phone.pos.z - p.z); const want = dPh < 4.5 && performance.now() - phoneAnswered > 20000 && !panelIsOpen(); A.hut.phone.ringing = want; if (want && (ringT -= dt) <= 0) { api.sfx?.('ring'); ringT = 1.7; } } else A.hut.phone.ringing = false;
      const key = state.mode === 'car' ? 'car-exit' : best ? best.kind + (best.id || '') + (best.kind === 'phone' ? A.hut.phone.ringing : '') + (best.kind === 'link' ? A.house.link : '') : '';
      if (key !== prompt.dataset.key) { prompt.dataset.key = key; near = best; if (state.mode === 'car') { prompt.hidden = false; prompt.innerHTML = '<kbd>E</kbd> Get out of the car'; } else if (best) { prompt.hidden = false; prompt.innerHTML = `<kbd>E</kbd> ${PROMPTS[best.kind](best)}`; } else prompt.hidden = true; }
    } else if (state.mode !== 'inspect' && !prompt.hidden) { prompt.hidden = true; prompt.dataset.key = ''; }
    explore.update(dt, t, state.mode === 'walk' ? near : null, state.mode);
    // idle for 10 s -> he dances (and the band plays louder)
    if (state.mode === 'walk' && player.st.speed < 0.05 && !panelIsOpen()) { idleT += dt; if (idleT > 10 && !dancing) { dancing = true; avatar.setBase('Dance'); swell(true); subtitle(pick('dance'), 3200); } }
    else { idleT = 0; if (dancing) { dancing = false; swell(false); if (state.mode === 'walk' && !player.st.moving) avatar.setBase('Idle'); } }
    // point at things you can interact with (once per thing, not too often)
    if (state.mode === 'walk' && near && near.kind !== 'chotu' && near !== lastPointed && performance.now() - lastPointT > 6000 && player.st.speed < 0.3) { lastPointed = near; lastPointT = performance.now(); avatar.group.rotation.y = Math.atan2(near.pos.x - ap.x, near.pos.z - ap.z); avatar.play('Point'); }
    // the avatar rides in the car's seat
    if (state.mode === 'car' || state.mode === 'cine') { const s = C.seat.clone(); C.car.localToWorld(s); ap.copy(s); avatar.group.rotation.y = C.car.rotation.y; }
    if (renderer.shadowMap.enabled) { W.sun.position.set(ap.x - 30, 26, ap.z + 22); W.sun.target.position.set(ap.x, 0, ap.z); }
    W.sky.position.copy(camera.position);
    avatar.update(dt, tier.avatarHz); chotu.update(dt, t);
    for (const u of cur.update) u(t, dt, camera);
    renderer.render(scene, camera);
    api.stats = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pr, area: cur.id };
  }
  requestAnimationFrame(frame);

  const api = {
    startPlay, teleportTo, driveTo, spawnChotu, playCards, focusGame, endGame, setArea, get chotuSpawned() { return chotuSpawned; }, setGameClick: (f) => { gameClick = f; },
    focusSection: (id, opts = {}) => { state.section = id; if (!opts.fromWorld) teleportTo(id); if (state.mode === 'walk') { player.enable(false); runBtn.hidden = true; joyHint.hidden = true; } explore.show(false); },
    closePanel: () => { state.section = 'home'; if (state.mode === 'walk') { player.enable(true); showWalkUI(true); } },
    skipIntro: () => startPlay(),
    setTier: (name) => { tier = TIERS[name]; pr = name === 'lite' ? Math.min(dpr, 1) : Math.min(dpr, 1.5); resize(); governor.threshold = name === 'lite' ? 22 : 40; governor.reset(); },
    setTheme: (t) => W.setTheme(t),
    pause: (v) => { running = !v; if (running) { clock.getDelta(); requestAnimationFrame(frame); } },
    explore, avatar, chotu, world: { areas: A, car: C.car }, scene, camera, renderer, player, boards: W.boards,
    get phase() { return state.mode; }, get area() { return cur.id; }, get fps() { return governor.fps; }, info: () => renderer.info, sfx: null, onSpeed: null, stats: null, chotuBusy: false, gameFollow: null,
  };
  return api;
}
