import * as THREE from 'three';
import { buildTower, npc, cat, FLOORS, fy, H, BASE, LIFT_X, LIFT_DOOR_X, BOUNDS } from './build.js';
import { showCard, closeCard, cardOpen } from './card.js';
import { loadAvatar } from '../stage/avatar.js';
import { buildChotu } from '../stage/chotu.js';
import { psxUniforms } from '../stage/psx.js';
import { TIERS, FpsGovernor } from '../quality.js';
import { profile, aboutZones, journey, projects } from '../content.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const SECTION_FLOOR = { lobby: 0, about: 1, journey: 2, projects: 3, skills: 4, achievements: 5, trophies: 5, roof: 6, contact: 0, promo: 0 };

export async function initTower({ canvas, tierName, onProgress, onSection, onCert, onChotu, onGame, onSlow, onPlayStart, toast, reducedMotion }) {
  psxUniforms.uSnap.value = 0;
  let tier = TIERS[tierName];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier.name === 'Full', powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = tier.name === 'Full'; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = true;
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 400);
  const dpr = Math.min(devicePixelRatio || 1, 2); let pr = tier.name === 'Full' ? Math.min(dpr, 1.5) : Math.min(dpr, 1);
  const resize = () => { renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
  resize(); addEventListener('resize', resize);

  onProgress?.(0.15, 'Building the tower…');
  const T = buildTower(scene, tier);
  onProgress?.(0.35, 'Waking up the avatar…');
  const avatar = await loadAvatar('/models/avatar.glb', (f) => onProgress?.(0.35 + f * 0.55, 'Waking up the avatar…'));
  avatar.group.traverse((o) => { if (o.isMesh) o.castShadow = tier.name === 'Full'; }); avatar.look.enabled = false; scene.add(avatar.group);
  if (avatar.actions.Sit) { avatar.actions.Sit.setLoop(THREE.LoopRepeat); avatar.actions.Sit.clampWhenFinished = false; }
  const chotu = buildChotu(); chotu.group.position.copy(T.chotuSpot); chotu.group.rotation.y = -1.2; chotu.group.scale.setScalar(1.7); scene.add(chotu.group);
  onProgress?.(0.95, 'Opening the doors…');

  // ---------------- NPCs: walkers, a cat, birds, a gamer ----------------
  const walkers = [['#d64b3a', '#2d3138', '#e0a882'], ['#f6c445', '#3d6b8c', '#8d5a3b'], ['#5b8a5a', '#4a3a2a', '#c98e6a'], ['#6a5aa0', '#2d3138', '#f1c7a2']].map(([shirt, pants, skin], i) => { const m = npc({ shirt, pants, skin }); m.userData.zone = i < 2 ? [-46, -12.5] : [13.5, 46]; m.position.set(i < 2 ? -40 + i * 18 : 20 + (i - 2) * 18, 0.16, 5.0 + (i % 2) * 1.1); m.userData.v = (i % 2 ? -1 : 1) * (1.1 + i * 0.15); scene.add(m); return m; });
  const kitty = cat(); kitty.position.set(-8.5, 0.16, 5.6); scene.add(kitty); let catT = 0; let catTarget = V(-8.5, 0.16, 5.6);
  const gamer = npc({ shirt: '#e2468a', pants: '#2d3138', skin: '#b67d5a' }); gamer.position.set(-7.0, fy(3), 1.95); gamer.rotation.y = Math.PI; scene.add(gamer);
  const birds = new THREE.InstancedMesh(new THREE.ConeGeometry(0.12, 0.45, 4).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#2d3138' }), 7); scene.add(birds);
  const bm = new THREE.Matrix4(); const bq = new THREE.Quaternion();

  // ---------------- UI: floor directory, prompt, tooltip, floor banner ----------------
  const dir = document.createElement('nav'); dir.className = 'floors'; dir.hidden = true; dir.setAttribute('aria-label', 'Floors');
  dir.innerHTML = FLOORS.map((f, i) => ({ f, i })).reverse().map(({ f, i }) => `<button data-floor="${i}" title="${f.name}"><b>${f.n}</b><span>${f.name}</span></button>`).join('');
  document.body.appendChild(dir);
  dir.addEventListener('click', (e) => { const b = e.target.closest('[data-floor]'); if (b) goFloor(+b.dataset.floor); });
  const prompt = document.createElement('button'); prompt.className = 'act-prompt'; prompt.hidden = true; document.body.appendChild(prompt);
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; document.body.appendChild(tip);
  const banner = document.createElement('div'); banner.className = 'floor-banner'; banner.hidden = true; document.body.appendChild(banner);
  const hint = document.createElement('div'); hint.className = 'ctrl-help'; hint.hidden = true; hint.innerHTML = '<span><b>Click</b> anything to walk there</span><span><b>WASD</b> walk</span><span><b>E</b> use</span><span><b>Floors</b> on the right</span>'; document.body.appendChild(hint);
  let bannerT = null;
  function showBanner(i) { const f = FLOORS[i]; banner.innerHTML = `<b>${f.n}</b><span>${f.name}<small>${f.sub}</small></span>`; banner.hidden = false; banner.classList.remove('out'); clearTimeout(bannerT); bannerT = setTimeout(() => { banner.classList.add('out'); setTimeout(() => { banner.hidden = true; }, 350); }, 2200); }
  function markFloor() { dir.querySelectorAll('[data-floor]').forEach((b) => b.classList.toggle('on', +b.dataset.floor === floor)); }

  // ---------------- state + movement ----------------
  let mode = 'landing'; let floor = 0; let path = []; let arrive = null; let sitting = false; let lift = null; let wasOnFloor = new Set([0]); let busyAction = false;
  const keys = new Set(); const LANDING = V(-13, 0.16, 6.1);
  avatar.group.position.copy(LANDING); avatar.group.rotation.y = 0.15;
  const setIdle = () => { if (!sitting) avatar.setBase('Idle'); };
  function standUp() { if (sitting) { sitting = false; avatar.setBase('Idle'); } if (dancing) { dancing = false; avatar.setBase('Idle'); } }
  let dancing = false;

  function planTo(f, target, then) {
    standUp(); closeCard(true);
    path = [];
    if (f !== floor) { path.push({ x: LIFT_DOOR_X, z: 0.5 }, { x: LIFT_X, z: 0.35 }, { lift: f }, { x: LIFT_DOOR_X, z: 0.5 }); }
    if (target) path.push({ x: THREE.MathUtils.clamp(target.x, BOUNDS.minX, BOUNDS.maxX), z: THREE.MathUtils.clamp(target.z, BOUNDS.minZ, BOUNDS.maxZ) });
    arrive = then || null;
  }
  function goFloor(i) { if (mode !== 'play') return; planTo(i, V(0.5, 0, 0.6), () => { avatar.group.rotation.y = 0; }); api.sfx?.('click'); }

  const tmp = V(0, 0, 0); let walkAnim = false;
  function stepPath(dt) {
    const p = avatar.group.position; const head = path[0];
    if (!head) { if (walkAnim) { walkAnim = false; setIdle(); } return; }
    if (head.lift !== undefined) {
      if (!lift) { const from = floor; lift = { from, to: head.lift, t: 0, dur: Math.max(1.1, Math.abs(head.lift - from) * 0.55) }; if (walkAnim) { walkAnim = false; avatar.setBase('Idle'); } api.sfx?.('tick'); }
      lift.t = Math.min(1, lift.t + dt / lift.dur); const yy = fy(lift.from) + (fy(lift.to) - fy(lift.from)) * ease(lift.t);
      T.car.position.y = yy; p.y = yy + 0.12; chotuSync();
      if (lift.t >= 1) { floor = lift.to; lift = null; path.shift(); p.y = fy(floor); markFloor(); showBanner(floor); api.sfx?.('open'); if (!wasOnFloor.has(floor)) { wasOnFloor.add(floor); } }
      return;
    }
    tmp.set(head.x - p.x, 0, head.z - p.z); const d = tmp.length();
    const far = path.reduce((s, n, i) => s + (n.x !== undefined && i === 0 ? d : 0), 0) > 5 || path.length > 2;
    const speed = far ? 4.2 : 2.4;
    if (d < 0.06) { path.shift(); if (!path.length) { if (walkAnim) { walkAnim = false; setIdle(); } const cb = arrive; arrive = null; cb?.(); } return; }
    if (!walkAnim) { walkAnim = true; avatar.setBase('Walk'); }
    if (avatar.actions.Walk) avatar.actions.Walk.timeScale = far ? 1.75 : 1.05;
    const step = Math.min(d, speed * dt); p.x += (tmp.x / d) * step; p.z += (tmp.z / d) * step;
    let a = Math.atan2(tmp.x, tmp.z) - avatar.group.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); avatar.group.rotation.y += a * Math.min(1, dt * 12);
  }
  function manual(dt) {
    let ix = 0; let iz = 0;
    if (keys.has('a') || keys.has('arrowleft')) ix -= 1; if (keys.has('d') || keys.has('arrowright')) ix += 1;
    if (keys.has('w') || keys.has('arrowup')) iz -= 1; if (keys.has('s') || keys.has('arrowdown')) iz += 1;
    if (!ix && !iz) return false;
    if (path.length && path[0].lift === undefined && !lift) path = []; if (lift) return true;
    standUp(); closeCard(true);
    const L = Math.hypot(ix, iz); const p = avatar.group.position; const sp = keys.has('shift') ? 4.2 : 2.6;
    p.x = THREE.MathUtils.clamp(p.x + (ix / L) * sp * dt, BOUNDS.minX, BOUNDS.maxX); p.z = THREE.MathUtils.clamp(p.z + (iz / L) * sp * dt, BOUNDS.minZ, BOUNDS.maxZ);
    let a = Math.atan2(ix, iz) - avatar.group.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); avatar.group.rotation.y += a * Math.min(1, dt * 12);
    if (!walkAnim) { walkAnim = true; avatar.setBase('Walk'); } if (avatar.actions.Walk) avatar.actions.Walk.timeScale = sp > 3 ? 1.75 : 1.05;
    return true;
  }
  addEventListener('keydown', (e) => { if (e.target.closest?.('input,textarea,select')) return; const k = e.key.toLowerCase(); keys.add(k); if (mode === 'play' && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault(); if (k === 'e' && mode === 'play' && near) use(near); });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase())); addEventListener('blur', () => keys.clear());

  // ---------------- interactions ----------------
  const short = (s, n = 120) => (s.length > n ? s.slice(0, s.lastIndexOf(' ', n)) + '…' : s);
  function use(it) {
    if (mode !== 'play' || busyAction) return; it.seen = true; hideTip();
    planTo(it.floor, it.stand, () => { avatar.group.rotation.y = it.face; act(it); });
    api.sfx?.('click');
  }
  async function act(it) {
    const d = it.data;
    switch (it.kind) {
      case 'chotu': avatar.play('Talk'); chotu.setMode('listening'); onChotu?.(); break;
      case 'promo': avatar.play('Point'); onSection?.('promo'); break;
      case 'contact': avatar.play('Talk'); ringing = false; answeredAt = performance.now(); onSection?.('contact'); break;
      case 'sit': sitting = true; avatar.setBase('Sit'); toast?.('Taking a seat. Click anywhere to get up.', 3000); break;
      case 'bio': sitting = true; avatar.setBase('Sit'); showCard({ tag: 'About me', title: profile.name, meta: `${profile.title} · ${profile.location}`, lines: [profile.tagline, 'BS Computer Science (Gaming & Animation), NED University', profile.availability], actions: [{ label: 'Download CV', href: profile.resume, download: true, primary: true }, { label: 'GitHub', href: profile.github }] }); break;
      case 'aboutme': avatar.play('Point'); showCard({ tag: 'About me', title: 'Four sides of me', tiles: aboutZones.map((z) => ({ t: z.title, d: short(z.text, 110), c: z.color })) }); break;
      case 'cv': avatar.play('Throw'); showCard({ tag: 'Résumé', title: 'Grab my CV', meta: 'One page, PDF', lines: ['Experience, projects, skills and certifications in one page.'], actions: [{ label: 'Download CV', href: profile.resume, download: true, primary: true }, { label: 'Email me', href: `mailto:${profile.email}` }] }); break;
      case 'coffee': avatar.play('Think'); toast?.('☕ Coffee break…', 2200); break;
      case 'education': avatar.play('Point'); showCard({ tag: 'Education', title: 'BS Computer Science', meta: 'Gaming & Animation · NED University, Karachi', lines: ['CGPA 3.605 / 4.00', '2023 → early 2027 (4th year)', 'Game engine architecture · real-time 3D · AI behaviour · semester game production'], accent: '#2f4a3a' }); break;
      case 'journey': avatar.play('Point'); showCard({ tag: 'Journey', title: 'Education & experience', lines: journey.map((j) => `${j.when} · ${j.title} (${j.where.split('·')[0].trim()})`), actions: [{ label: 'Play Snakes & Ladders', primary: true, onClick: () => use(T.inter.find((x) => x.kind === 'snakes')) }] }); break;
      case 'snakes': onGame?.('snakes'); break;
      case 'chess': onGame?.('chess'); break;
      case 'project': avatar.play('Point'); showCard({ tag: `${d.group}${d.featured ? ' · featured' : ''}`, img: d.image, title: d.name, meta: `${d.stack}${d.year ? ' · ' + d.year : ''} · ${d.role}`, lines: [short(d.summary, 150), ...(d.points || []).slice(0, 3).map((x) => x.split(':')[0])], actions: d.links.map(([l, u], i) => ({ label: l, href: u, primary: i === 0 })), accent: '#e2468a' }); break;
      case 'arcade': avatar.play('Throw'); showCard({ tag: 'Arcade', title: 'Play my web games', lines: ['Three of my games run right in your browser.'], actions: projects.flatMap((p) => p.links.filter(([l]) => /play/i.test(l)).map(([, u]) => ({ label: p.name.split(' ')[0] + (p.name.split(' ')[1] ? ' ' + p.name.split(' ')[1] : ''), href: u, primary: true }))), accent: '#7fe0c4' }); break;
      case 'skill': avatar.play('Point'); showCard({ tag: 'Skills', title: d.group, lines: d.items.map(([n, w]) => `${n} · ${short(w, 60)}`), accent: '#3d8a7a' }); break;
      case 'cert': avatar.play('Point'); showCard({ tag: 'Certificate', img: d.image.replace('/certs/', '/certs/thumb/'), title: d.title, meta: `${d.issuer}${d.date ? ' · ' + d.date : ''}`, actions: [{ label: 'View full size', primary: true, onClick: () => onCert?.(d.id) }, ...(d.verify ? [{ label: 'Verify', href: d.verify }] : [])], accent: '#c9a24a' }); break;
      case 'trophy': avatar.play('Victory'); api.sfx?.('win'); toast?.('🏆 6 certificates on this floor, have a look at the frames.', 3000); break;
      case 'jump': busyAction = true; for (let k = 0; k < 3; k++) { avatar.play('Jump'); api.sfx?.('ladder'); await hop(0.9 + k * 0.25, 1.35); } busyAction = false; setIdle(); break;
      case 'dance': dancing = true; avatar.setBase('Dance'); api.sfx?.('win'); toast?.('Dance break! Click anywhere to stop.', 2500); break;
      default: break;
    }
  }
  function hop(h, dur) { const p = avatar.group.position; const y0 = fy(floor); const t0 = performance.now(); return new Promise((res) => { const s = () => { const k = Math.min(1, (performance.now() - t0) / (dur * 1000)); const lift0 = k < 0.25 ? 0 : Math.sin(((k - 0.25) / 0.75) * Math.PI) * h; p.y = y0 + Math.max(0, lift0); if (k < 1) requestAnimationFrame(s); else { p.y = y0; res(); } }; s(); }); }

  // ---------------- pointer: hover tooltip, click to walk / use ----------------
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); const hits = T.inter.map((i) => i.hit); let downAt = null; let hoverIt = null;
  const setRay = (e) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
  function pickIt() { const h = ray.intersectObjects(hits, false)[0]; return h ? h.object.userData.it : null; }
  function pickFloor() {
    let best = null;
    for (let i = 0; i < FLOORS.length; i++) { const t = (fy(i) - ray.ray.origin.y) / ray.ray.direction.y; if (t <= 0) continue; const pt = ray.ray.origin.clone().addScaledVector(ray.ray.direction, t); if (pt.x > -8 && pt.x < 8 && pt.z > -3 && pt.z < 2.9 && (!best || t < best.t)) best = { t, i, pt }; }
    return best;
  }
  function hideTip() { tip.hidden = true; canvas.style.cursor = ''; hoverIt = null; }
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || mode !== 'play') return; setRay(e); const it = pickIt();
    if (it !== hoverIt) { hoverIt = it; canvas.style.cursor = it ? 'pointer' : ''; tip.hidden = !it; if (it) tip.innerHTML = `${it.label}${it.seen ? '' : ' <i>new</i>'}`; }
    if (it) { tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 14 + 'px'; }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 10) return;
    setRay(e);
    if (mode === 'game') { if (gameClick) for (const k of ['journey', 'skills']) { const b = T.boards[k]; const h = ray.intersectObject(b.userData.face, false)[0]; if (h) { gameClick({ board: b, local: b.worldToLocal(h.point.clone()) }); break; } } return; }
    if (mode === 'intro') { skipIntro = true; return; }
    if (mode !== 'play') return;
    if (ray.intersectObject(chotu.group, true).length) { use(T.inter.find((x) => x.kind === 'chotu')); return; }
    const it = pickIt(); if (it) { use(it); return; }
    const f = pickFloor(); if (f) { planTo(f.i, f.pt, null); if (cardOpen()) closeCard(true); }
  });

  // ---------------- camera ----------------
  const camPos = V(0, 0, 0); const camLook = V(0, 0, 0); let camX = 0;
  function frameFloor(dt, snap) {
    const p = avatar.group.position; const port = innerHeight > innerWidth * 1.05;
    const visW = port ? 4.8 : 16.8; const vfov = THREE.MathUtils.degToRad(camera.fov); const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = Math.max(10, (visW / 2) / Math.tan(hfov / 2));
    const want = port ? THREE.MathUtils.clamp(p.x, -5.4, 7.2) : 0.9; camX += (want - camX) * (snap ? 1 : Math.min(1, dt * 3));
    const yy = (lift ? p.y : fy(floor)) + 1.35;
    camPos.set(camX, yy + dist * 0.16, 3 + dist); camLook.set(camX, yy - 0.15, -0.6);
    if (snap) camera.position.copy(camPos); else camera.position.lerp(camPos, Math.min(1, dt * 4));
    camera.lookAt(camLook);
  }

  // ---------------- landing → intro walk ----------------
  let skipIntro = false;
  async function startPlay() {
    if (mode !== 'landing') return; mode = 'intro'; onPlayStart?.(); skipIntro = false;
    avatar.play('Wave'); await waitOrSkip(1500);
    const p = avatar.group.position; const seq = [V(-6.2, 0.16, 5.4), V(-5.8, 0.16, 5.3)];
    const from = camera.position.clone(); const lookFrom = V(p.x, 1.4, p.z);
    for (const q of seq) { await walkTo(q, 4.0, (k) => { camera.position.lerpVectors(from, V(-2, 7.5, 26), Math.min(1, k)); camera.lookAt(lookFrom.lerp(V(-1, 4.5, 0), 0.04)); }); if (skipIntro) break; }
    if (!skipIntro) { avatar.group.rotation.y = Math.PI; avatar.play('Jump'); await sleep(450); await moveArc(V(-5.8, BASE, 3.0), 0.75, 0.9); }
    p.set(-4.6, BASE, 1.0); floor = 0; avatar.group.rotation.y = 0.2;
    mode = 'play'; dir.hidden = false; markFloor(); showBanner(0); avatar.play('Wave');
    hint.hidden = false; setTimeout(() => { hint.hidden = true; }, 8000);
    toast?.('Welcome in! Click anything, or pick a floor on the right.', 4500);
  }
  const waitOrSkip = (ms) => new Promise((res) => { const t0 = performance.now(); const s = () => { if (skipIntro || performance.now() - t0 > ms) res(); else requestAnimationFrame(s); }; s(); });
  function walkTo(q, speed, onStep) {
    return new Promise((res) => { avatar.setBase('Walk'); if (avatar.actions.Walk) avatar.actions.Walk.timeScale = 1.4; const p = avatar.group.position; const start = p.clone(); const L = start.distanceTo(q); const dur = L / speed; const t0 = performance.now();
      const s = () => { const k = skipIntro ? 1 : Math.min(1, (performance.now() - t0) / (dur * 1000)); p.lerpVectors(start, q, k); const d = q.clone().sub(start); avatar.group.rotation.y = Math.atan2(d.x, d.z); onStep?.(k); if (k < 1) requestAnimationFrame(s); else { avatar.setBase('Idle'); res(); } }; s(); });
  }
  function moveArc(q, h, dur) { const p = avatar.group.position; const s0 = p.clone(); const t0 = performance.now(); return new Promise((res) => { const s = () => { const k = skipIntro ? 1 : Math.min(1, (performance.now() - t0) / (dur * 1000)); p.lerpVectors(s0, q, k); p.y += Math.sin(k * Math.PI) * h; if (k < 1) requestAnimationFrame(s); else res(); }; s(); }); }

  // ---------------- games on the tables ----------------
  let gameClick = null; let gameCam = null;
  function focusGame(key) {
    mode = 'game'; closeCard(true); prompt.hidden = true; dir.hidden = true; hideTip();
    const b = T.boards[key].getWorldPosition(V(0, 0, 0)); const port = innerHeight > innerWidth;
    gameCam = { from: camera.position.clone(), fq: camera.quaternion.clone(), pos: b.clone().add(V(0, port ? 1.35 : 0.95, port ? 0.75 : 0.62)), look: b.clone().add(V(0, 0, 0.04)), t: 0 };
  }
  function endGame() { gameClick = null; gameCam = null; mode = 'play'; dir.hidden = false; setIdle(); }

  // ---------------- frame loop ----------------
  const governor = new FpsGovernor({ threshold: tier.name === 'Lite' ? 22 : 40, onSlow: (fps) => { if (pr > 0.85) { pr = Math.max(0.75, pr - 0.25); resize(); governor.reset(); return; } onSlow?.(fps, tier); } });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onSlow?.(0, tier, 'context'); });
  let near = null; let ringing = false; let answeredAt = 0; let ringT = 0; let idleT = 0;
  function chotuSync() {}
  const clock = new THREE.Clock(); let running = true; let last = 0;
  function frame(now) {
    if (!running) return; requestAnimationFrame(frame);
    if (now - last < 1000 / tier.maxFps - 1) return; last = now;
    const dt = Math.min(clock.getDelta(), 0.1); const t = clock.elapsedTime; governor.tick(now);
    const p = avatar.group.position;
    if (mode === 'landing') { const a = Math.sin(t * 0.3) * 0.12; camera.position.set(p.x + 0.35 + a, 1.58, p.z + 2.15); camera.lookAt(p.x - 0.15, 1.38, p.z); if (innerWidth > 860 && innerWidth > innerHeight) camera.setViewOffset(innerWidth, innerHeight, -innerWidth * 0.17, 0, innerWidth, innerHeight); else camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.16, innerWidth, innerHeight); }
    else if (camera.view) camera.clearViewOffset();
    if (mode === 'play') {
      const moved = manual(dt); if (!moved) stepPath(dt);
      if (!moved && !path.length && walkAnim) { walkAnim = false; setIdle(); }
      frameFloor(dt, false);
      // idle for 20 s → sits on the floor... no: does a little dance
      if (!path.length && !moved && !sitting && !dancing && !cardOpen() && !busyAction) { idleT += dt; if (idleT > 20) { idleT = 0; avatar.play('Dance'); } } else idleT = 0;
      // nearest hotspot on this floor
      let best = null; let bd = 1.4; for (const it of T.inter) { if (it.floor !== floor) continue; const dd = Math.hypot(it.stand.x - p.x, it.stand.z - p.z); if (dd < bd) { bd = dd; best = it; } }
      if (best !== near) { near = best; prompt.hidden = !best || path.length > 0; if (best) prompt.innerHTML = `<kbd>E</kbd> ${best.label.split(' · ')[0]}`; }
      if (path.length && !prompt.hidden) prompt.hidden = true; else if (!path.length && near && prompt.hidden && !cardOpen()) prompt.hidden = false;
      if (cardOpen() && !prompt.hidden) prompt.hidden = true;
      // the phone rings when you are near it (lobby)
      const want = floor === 0 && Math.hypot(T.booth.stand.x - p.x, T.booth.stand.z - p.z) < 4.2 && now - answeredAt > 25000 && !cardOpen();
      ringing = want; if (want && (ringT -= dt) <= 0) { api.sfx?.('ring'); ringT = 2.2; toast?.('📞 The phone is ringing… click it to contact me', 2000); }
    } else if (mode === 'game' && gameCam) { gameCam.t = Math.min(1, gameCam.t + dt / (reducedMotion ? 0.01 : 0.9)); const k = ease(gameCam.t); camera.position.lerpVectors(gameCam.from, gameCam.pos, k); camera.lookAt(gameCam.look); const q1 = camera.quaternion.clone(); camera.quaternion.copy(gameCam.fq).slerp(q1, k); }
    // NPCs
    for (const w of walkers) { w.position.x += w.userData.v * dt; const [z0, z1] = w.userData.zone; if (w.position.x > z1 || w.position.x < z0) { w.userData.v *= -1; w.position.x = THREE.MathUtils.clamp(w.position.x, z0, z1); } w.rotation.y = w.userData.v > 0 ? Math.PI / 2 : -Math.PI / 2; w.position.y = 0.16 + Math.abs(Math.sin(t * 6 + w.userData.v * 10)) * 0.05; }
    catT -= dt; if (catT <= 0) { catT = 3 + Math.random() * 4; catTarget = V(-11 + Math.random() * 8, 0.16, 4.6 + Math.random() * 1.6); }
    { const d = catTarget.clone().sub(kitty.position); const L = d.length(); if (L > 0.1) { kitty.position.addScaledVector(d, Math.min(1, (0.9 * dt) / L)); kitty.rotation.y = Math.atan2(d.x, d.z); } }
    gamer.position.y = fy(3) + Math.abs(Math.sin(t * 7)) * 0.03; gamer.rotation.z = Math.sin(t * 5) * 0.04;
    for (let i = 0; i < 7; i++) { const a = t * 0.35 + (i / 7) * Math.PI * 2; const pos = V(Math.cos(a) * (14 + i), 27 + Math.sin(t + i) * 1.2, -6 + Math.sin(a) * 9); bq.setFromAxisAngle(V(0, 1, 0), -a); bm.compose(pos, bq, V(1, 1, 1)); birds.setMatrixAt(i, bm); }
    birds.instanceMatrix.needsUpdate = true;
    chotu.group.position.y = T.chotuSpot.y + Math.sin(t * 2) * 0.01;
    if (renderer.shadowMap.enabled) { T.sun.position.set(-14 + camX, p.y + 24, 26); T.sun.target.position.set(camX, p.y + 1, 0); }
    T.sky.position.copy(camera.position);
    avatar.update(dt, tier.avatarHz); chotu.update(dt, t);
    for (const u of T.update) u(t, dt, camera);
    renderer.render(scene, camera);
    api.stats = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pr, floor };
  }
  camera.position.set(LANDING.x + 0.35, 1.58, LANDING.z + 2.15); camera.lookAt(LANDING.x, 1.38, LANDING.z);
  requestAnimationFrame(frame);

  const api = {
    startPlay, focusGame, endGame, setGameClick: (f) => { gameClick = f; },
    goSection: (id) => { const f = SECTION_FLOOR[id]; if (f === undefined) return; if (mode === 'landing') { mode = 'play'; avatar.group.position.set(-4.6, BASE, 1.0); floor = 0; dir.hidden = false; onPlayStart?.(); markFloor(); } if (mode === 'play') goFloor(f); },
    useKind: (kind) => { const it = T.inter.find((x) => x.kind === kind); if (it) use(it); },
    closePanel: () => {}, focusSection: () => {}, skipIntro: () => startPlay(),
    setTier: (name) => { tier = TIERS[name]; renderer.shadowMap.enabled = name === 'full'; pr = name === 'lite' ? Math.min(dpr, 1) : Math.min(dpr, 1.5); resize(); governor.threshold = name === 'lite' ? 22 : 40; governor.reset(); scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); },
    setTheme: () => {}, pause: (v) => { running = !v; if (running) { clock.getDelta(); requestAnimationFrame(frame); } },
    avatar, chotu, world: { boards: T.boards, dice: T.dice }, boards: T.boards, scene, camera, renderer,
    get phase() { return mode; }, get floor() { return floor; }, get fps() { return governor.fps; }, info: () => renderer.info, sfx: null, stats: null,
  };
  return api;
}
