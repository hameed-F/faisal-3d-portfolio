import * as THREE from 'three';
import { PsxRenderer } from './psx.js';
import { buildWorld, LAYOUT, ROAD } from './world.js';
import { loadAvatar } from './avatar.js';
import { buildChotu } from './chotu.js';
import { createFreeDrive } from './freedrive.js';
import { TIERS, FpsGovernor } from '../quality.js';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export async function initStage({ canvas, tierName, onProgress, onSection, onCert, onChotu, onSlow, onIntroDone, onTitle, reducedMotion }) {
  let tier = TIERS[tierName];
  const psx = new PsxRenderer(canvas, tier);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.05, 420);
  onProgress?.(0.1, 'Building the forest…');
  const world = buildWorld(scene, tier);
  onProgress?.(0.3, 'Waking up the avatar…');
  const avatar = await loadAvatar('/models/avatar.glb', (f) => onProgress?.(0.3 + f * 0.6, 'Waking up the avatar…'));
  scene.add(avatar.group);
  const chotu = buildChotu();
  // Chotu lives on the Snakes & Ladders board
  const sl = world.boards.journey; chotu.group.position.set(0.12, 0.034, 0.16); chotu.group.rotation.y = 2.4; chotu.group.scale.setScalar(0.55); sl.add(chotu.group);
  onProgress?.(0.95, 'Lighting the lamp…');

  // ---------------- camera rig ----------------
  const cam = { pos: V(0, 2, 5), tgt: V(0, 1, 0), from: null, to: null, t: 1, dur: 1, fov: 55 };
  camera.position.copy(cam.pos); camera.lookAt(cam.tgt);
  function moveTo(pos, tgt, dur = 1.2, fov) {
    cam.from = { pos: camera.position.clone(), tgt: cam.tgt.clone(), fov: camera.fov };
    cam.to = { pos: pos.clone(), tgt: tgt.clone(), fov: fov ?? camera.fov };
    cam.t = 0; cam.dur = reducedMotion ? 0.001 : dur;
  }
  function snapTo(pos, tgt, fov) { cam.to = null; camera.position.copy(pos); cam.tgt.copy(tgt); if (fov) camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(cam.tgt); }

  const portrait = () => innerHeight > innerWidth;
  const hubShot = () => portrait() ? [V(0.0, 3.0, 2.55), V(0, 0.7, -0.45), 72] : [V(0.35, 2.2, 2.5), V(0, 0.72, -0.35), 52];
  const worldPos = (o) => o.getWorldPosition(new THREE.Vector3());
  function sectionShot(id) {
    const b = world.boards;
    const boardShot = (g, h, back) => { const p = worldPos(g); return [p.clone().add(V(0.05, h, back)), p, portrait() ? 62 : 48]; };
    switch (id) {
      case 'about': return boardShot(b.about, 0.75, 0.5);
      case 'skills': return boardShot(b.skills, 0.75, 0.5);
      case 'projects': return boardShot(b.projects, 1.2, 0.8);
      case 'journey': return boardShot(b.journey, 0.8, 0.55);
      case 'achievements': return [V(0, 1.8, 0.35), V(0, 1.75, -2.64), portrait() ? 74 : 58];
      case 'promo': { const p = worldPos(world.tv); return [p.clone().add(V(-1.15, 1.05, 1.3)), p.clone().add(V(0, 0.82, 0)), 50]; }
      default: return null;
    }
  }
  // the contact phone group is the last clickable with section "contact"
  const phoneObj = world.clickables.find((c) => c.section === 'contact').object;

  // shift the view so the focused object is not hidden behind the HTML panel
  let panelOpen = false;
  function applyViewOffset() {
    const w = innerWidth; const h = innerHeight;
    if (state.phase === 'title' && w > 760) { camera.setViewOffset(w, h, -w * 0.2, 0, w, h); return; }
    if (!panelOpen) { camera.clearViewOffset(); return; }
    if (w > 760) { const pw = Math.min(id2w(), w - 32) + 16; camera.setViewOffset(w, h, pw / 2, 0, w, h); }
    else { const ph = h * 0.72; camera.setViewOffset(w, h, 0, ph * 0.42, w, h); }
  }
  const id2w = () => (state.section === 'projects' ? 880 : 560);

  // ---------------- state machine ----------------
  const state = { phase: 'title', section: 'home', driveT: 0, timers: [] };
  const later = (ms, f) => state.timers.push(setTimeout(f, ms));
  const clearTimers = () => { state.timers.forEach(clearTimeout); state.timers = []; };
  const setFade = (v) => { psx.post.uniforms.uFade.value = v; };
  let fadeAnim = null;
  const fadeTo = (v, dur = 0.5) => new Promise((res) => { fadeAnim = { from: psx.post.uniforms.uFade.value, to: v, t: 0, dur: reducedMotion ? 0.001 : dur, res }; });

  function placeAvatar(p, rotY) { avatar.group.position.copy(p); avatar.group.rotation.y = rotY; }
  function toTitle() {
    clearTimers(); state.phase = 'title'; world.setInterior(false); world.placeCarOnRoad(0);
    placeAvatar(LAYOUT.avatarDoor, 0.5); avatar.setBase('Idle');
    titleShot(0); applyViewOffset();
  }
  function titleShot(time) {
    const c = world.car.position; const f = ROAD.getTangentAt(0.001); const r = V(-f.z, 0, f.x);
    const sway = Math.sin(time * 0.25) * 0.6;
    camera.position.copy(c).addScaledVector(f, 7.5).addScaledVector(r, 4.2 + sway).add(V(0, 1.35 + Math.sin(time * 0.4) * 0.08, 0));
    cam.tgt.copy(c).addScaledVector(f, 0.8).add(V(0, 0.75, 0)); camera.fov = 46; camera.updateProjectionMatrix();
  }
  let free = null;
  function startFreeDrive() {
    if (!tier.freeDrive) return false;
    clearTimers(); state.phase = 'free'; world.setInterior(false); panelOpen = false; applyViewOffset(); cam.to = null;
    world.placeCarOnRoad(0.03); placeAvatar(LAYOUT.avatarDoor, 0.4); avatar.setBase('Idle');
    camera.fov = 58; camera.updateProjectionMatrix();
    if (!free) free = createFreeDrive({ world, camera, cam, onSection: (id) => onSection?.(id), onCabin: () => arrive(true), onExit: () => { toTitle(); onTitle?.(); }, onSpeed: (v) => api.onSpeed?.(v) });
    free.start(); return true;
  }
  function startDrive() {
    if (state.phase !== 'title') return;
    if (!tier.drive) { state.phase = 'drive'; applyViewOffset(); arrive(true); return; }
    state.phase = 'drive'; state.driveT = 0; applyViewOffset();
  }
  async function arrive(fromSkip = false) {
    clearTimers(); state.phase = 'arrive'; world.setInterior(false);
    world.placeCarOnRoad(1);
    placeAvatar(LAYOUT.avatarDoor, 0.35); avatar.setBase('Idle');
    snapTo(V(7.5, 2.1, 13.5), V(0.6, 1.3, 3.2), 50);
    moveTo(V(5.2, 1.8, 9.8), V(0.6, 1.25, 3.4), 3.2);
    setFade(1);
    later(400, () => avatar.play('Wave'));
    later(fromSkip ? 2200 : 3400, async () => { await fadeTo(0, 0.45); enterCabin(); });
  }
  async function enterCabin() {
    clearTimers(); state.phase = 'enter'; world.setInterior(true);
    const start = V(0.3, 0, 2.2); placeAvatar(start, Math.PI * 0.85);
    const [p, t, f] = hubShot(); snapTo(p, t, f);
    avatar.setBase('Walk'); fadeTo(1, 0.5);
    state.walk = { from: start, to: LAYOUT.avatarHub.clone(), t: 0, dur: 1.6 };
  }
  function toHub(immediate = false) {
    if (free?.active) free.stop(false);
    clearTimers(); state.phase = 'hub'; world.setInterior(true); state.walk = null; setFade(1);
    world.placeCarOnRoad(1);
    placeAvatar(LAYOUT.avatarHub, -0.5); avatar.setBase('Idle'); applyViewOffset();
    const [p, t, f] = hubShot(); immediate ? snapTo(p, t, f) : moveTo(p, t, 1.1, f);
    onIntroDone?.();
  }
  function skipIntro() { if (state.phase === 'drive' || state.phase === 'arrive' || state.phase === 'enter' || state.phase === 'title') toHub(true); }

  function focusGame(key) {
    if (state.phase !== 'hub' && state.phase !== 'game') toHub(true);
    state.phase = 'game'; state.section = 'game'; panelOpen = false;
    const p = worldPos(world.boards[key]); const port = portrait();
    const back = key === 'skills' ? 0.36 : 0.4; const up = key === 'skills' ? 0.5 : 0.62;
    moveTo(p.clone().add(V(0, up * (port ? 1.5 : 1), back * (port ? 1.15 : 1))), p.clone().add(V(0, 0, port ? 0.02 : 0.06)), 1.0, port ? 60 : 50);
    const w = innerWidth; const h = innerHeight; camera.setViewOffset(w, h, 0, (port ? 150 : 70), w, h);
    if (hovered) { hovered.scale.setScalar(hovered.userData.baseScale || 1); hovered = null; canvas.style.cursor = 'default'; }
  }
  function endGame() { gameClick = null; state.phase = 'hub'; state.section = 'home'; panelOpen = false; applyViewOffset(); const [p, t, f] = hubShot(); moveTo(p, t, 1.0, f); }
  function focusSection(id) {
    if (state.phase === 'game') return;
    if (state.phase !== 'hub') toHub(true);
    state.section = id; panelOpen = id !== 'home';
    if (id === 'home') { const [p, t, f] = hubShot(); moveTo(p, t, 1.0, f); applyViewOffset(); return; }
    let shot = sectionShot(id);
    if (id === 'contact') { const pp = worldPos(phoneObj); shot = [pp.clone().add(V(1.05, 1.15, -0.85)), pp.clone().add(V(0, 0.75, 0)), 50]; }
    if (!shot) { const [p, t, f] = hubShot(); shot = [p, t, f]; }
    moveTo(shot[0], shot[1], 1.15, shot[2]);
    applyViewOffset();
    avatar.play('Point');
  }

  // ---------------- input: hover, click, look ----------------
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); let hovered = null;
  const targets = world.clickables.map((c) => c.object).concat([chotu.group]);
  function pick(e) {
    const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(targets, true);
    for (const h of hits) {
      if (isChild(h.object, chotu.group)) return { chotu: true, object: chotu.group };
      const cert = world.clickables.find((k) => k.cert && isChild(h.object, k.object)); if (cert) return cert;
      const c = world.clickables.find((k) => !k.cert && isChild(h.object, k.object)); if (c) return c;
    }
    return null;
  }
  const isChild = (child, parent) => { let o = child; while (o) { if (o === parent) return true; o = o.parent; } return false; };
  function onMove(e) {
    avatar.lookAtScreen((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    if (state.phase !== 'hub' || e.pointerType === 'touch') return;
    const h = pick(e); const obj = h ? h.object : null;
    if (obj !== hovered) {
      if (hovered) hovered.scale.setScalar(hovered.userData.baseScale || 1);
      hovered = obj; if (hovered) { hovered.userData.baseScale = hovered.userData.baseScale || hovered.scale.x; hovered.scale.setScalar(hovered.userData.baseScale * 1.04); }
      canvas.style.cursor = hovered ? 'pointer' : 'default';
    }
  }
  let downAt = null; let gameClick = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return;
    if (state.phase === 'game') {
      if (!gameClick) return;
      const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      for (const b of Object.values(world.boards)) { const hit = ray.intersectObject(b, true)[0]; if (hit) { gameClick({ board: b, local: b.worldToLocal(hit.point.clone()) }); break; } }
      return;
    }
    if (state.phase !== 'hub') { if (state.phase !== 'title') skipIntro(); return; }
    const h = pick(e); if (!h) return;
    if (h.chotu) { onChotu?.(); return; }
    onSection?.(h.section); if (h.cert) onCert?.(h.cert);
  });
  addEventListener('pointermove', onMove, { passive: true });

  // ---------------- resize / tier ----------------
  function resize() { psx.resize(); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); applyViewOffset(); if (state.phase === 'hub' && state.section === 'home') { const [p, t, f] = hubShot(); snapTo(p, t, f); } }
  addEventListener('resize', resize);
  function setTier(name) {
    tier = TIERS[name]; psx.setTier(tier);
    world.setDensity(name === 'lite' ? 0.35 : 1);
    governor.threshold = name === 'lite' ? 20 : 38; governor.reset();
  }
  const governor = new FpsGovernor({ threshold: tier === TIERS.lite ? 20 : 38, onSlow: (fps) => onSlow?.(fps, tier) });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onSlow?.(0, tier, 'context'); });

  // ---------------- main loop ----------------
  const clock = new THREE.Clock(); let last = 0; let running = true;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const minDt = 1000 / tier.maxFps - 1; if (now - last < minDt) return; last = now;
    const dt = Math.min(clock.getDelta(), 0.1); const time = clock.elapsedTime;
    governor.tick(now);

    // intro drive
    if (state.phase === 'drive') {
      state.driveT += dt / 9.5; const t = Math.min(1, state.driveT); const e = t < 0.85 ? t : 0.85 + (1 - Math.pow(1 - (t - 0.85) / 0.15, 2)) * 0.15;
      world.placeCarOnRoad(e);
      const f = ROAD.getTangentAt(Math.min(e, 0.999)); const c = world.car.position;
      const pos = c.clone().sub(f.clone().multiplyScalar(6.5)).add(V(0, 2.4, 0)); const tgt = c.clone().add(f.clone().multiplyScalar(5)).add(V(0, 0.8, 0));
      camera.position.lerp(pos, Math.min(1, dt * 3)); cam.tgt.lerp(tgt, Math.min(1, dt * 4));
      world.carState.wheels.forEach((w) => { w.rotation.x += dt * 14 * (1 - t * 0.8); });
      if (t >= 1) arrive();
    } else if (state.phase === 'free') {
      free?.update(dt);
    } else if (state.phase === 'title') {
      titleShot(time);
    }
    // camera tween
    if (cam.to) {
      cam.t = Math.min(1, cam.t + dt / cam.dur); const k = ease(cam.t);
      camera.position.lerpVectors(cam.from.pos, cam.to.pos, k); cam.tgt.lerpVectors(cam.from.tgt, cam.to.tgt, k);
      if (cam.to.fov !== cam.from.fov) { camera.fov = cam.from.fov + (cam.to.fov - cam.from.fov) * k; camera.updateProjectionMatrix(); }
      if (cam.t >= 1) cam.to = null;
    }
    camera.lookAt(cam.tgt);
    // walking into the cabin
    if (state.walk) {
      const w = state.walk; w.t = Math.min(1, w.t + dt / w.dur); avatar.group.position.lerpVectors(w.from, w.to, w.t);
      const d = w.to.clone().sub(w.from); avatar.group.rotation.y = Math.atan2(d.x, d.z);
      if (w.t >= 1) { state.walk = null; toHub(); }
    }
    if (fadeAnim) { fadeAnim.t = Math.min(1, fadeAnim.t + dt / fadeAnim.dur); setFade(fadeAnim.from + (fadeAnim.to - fadeAnim.from) * fadeAnim.t); if (fadeAnim.t >= 1) { const r = fadeAnim.res; fadeAnim = null; r(); } }
    // headlights only matter outside
    const outside = state.phase === 'title' || state.phase === 'drive' || state.phase === 'arrive' || state.phase === 'free';
    world.carState.head.visible = outside; world.carState.beam.visible = outside;

    avatar.update(dt, tier.avatarHz);
    chotu.update(dt, time);
    for (const u of world.update) u(time, dt, camera);
    psx.render(scene, camera, time);
  }
  toTitle();
  requestAnimationFrame(frame);
  addEventListener('keydown', (e) => { if (['drive', 'arrive', 'enter'].includes(state.phase) && !e.repeat) skipIntro(); });

  const api = {
    startDrive, startFreeDrive, skipIntro, toHub, focusSection, setTier, focusGame, endGame,
    setGameClick: (f) => { gameClick = f; }, sfx: null,
    setTheme: (t) => world.setTheme(t),
    closePanel: () => { panelOpen = false; state.section = 'home'; applyViewOffset(); if (state.phase === 'hub') { const [p, t, f] = hubShot(); moveTo(p, t, 1.0, f); } },
    avatar, chotu, world, scene, camera, psx, get phase() { return state.phase; }, get fps() { return governor.fps; },
    pause: (v) => { running = !v; if (running) { clock.getDelta(); requestAnimationFrame(frame); } },
    info: () => psx.renderer.info,
  };
  return api;
}
