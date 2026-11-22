import * as THREE from 'three';
import { PsxRenderer, psxify } from '../stage/psx.js';
import { loadAvatar } from '../stage/avatar.js';
import { TIERS, FpsGovernor } from '../quality.js';
import { buildCity } from './city.js';
import { createPlayer } from './player.js';
import { openReel, closeReel, reelOpen, intertitle, irisWipe } from './reel.js';
import { buildFun } from './fun.js';

// MIDNIGHT REEL: a silent-film night on one city block. You walk Faisal around; every building is a section.
const SCENES = { cinema: ['Scene II', 'The Picture House'], campus: ['Scene III', 'The Academy'], pawn: ['Scene IV', 'Trophies & Pawn'], arcade: ['Scene V', 'The Penny Arcade'], kiosk: ['Scene I', 'Extra! Extra!'], phone: ['Scene VI', 'A Telephone Call'], billboard: ['Intermission', 'The Trailer'] };
const ZONE_TO = ['kiosk', 'campus', 'cinema', 'arcade', 'pawn', 'phone']; // menu: about, journey, projects, skills, achievements, contact
const CROWD = { kiosk: 'about me', cinema: 'projects', campus: 'journey', pawn: 'certificates', arcade: 'skills game', phone: 'contact', billboard: 'trailer' };
const camDist = () => (innerWidth < innerHeight ? 21 : 15.5);

function tierCfg(name) { const t = TIERS[name]; const full = name === 'full'; return { ...t, native: true, maxPR: full ? 2 : 1, msaa: full ? 4 : 0, snap: false, dither: false, grain: full ? 0.012 : 0 }; }

function buildProjector() { // Chotu: a tiny film-projector robot with two reels and a lens
  const g = new THREE.Group(); const M = (c, e) => psxify(new THREE.MeshLambertMaterial({ color: c, emissive: e || '#000', flatShading: true }));
  const bodyM = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.32, 0.36), M('#3a3330')); g.add(bodyM);
  const reels = [-0.12, 0.13].map((x) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 10), M('#c9a24a', '#2a1e08')); r.rotation.z = Math.PI / 2; r.rotation.y = Math.PI / 2; r.position.set(x, 0.3, 0); g.add(r); return r; });
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.16, 10), M('#1a1716')); lens.rotation.x = Math.PI / 2; lens.position.set(0, 0, 0.24); g.add(lens);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), new THREE.MeshBasicMaterial({ color: '#ffe2a0' })); glow.position.set(0, 0, 0.325); g.add(glow);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.4, 14, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe8b8', transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0, 1.5); g.add(beam);
  [-0.15, 0.15].forEach((x) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.32, 5), M('#16171b')); leg.position.set(x, -0.3, 0); g.add(leg); });
  const eye = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), new THREE.MeshBasicMaterial({ color: '#9fd8c7' })); eye.position.set(0, 0.08, 0.181); g.add(eye);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 4), new THREE.MeshBasicMaterial({ visible: false })); g.add(hit); g.userData.hit = hit;
  let mode = 'idle';
  return { group: g, hit, setMode(m) { mode = m; glow.material.color.set(m === 'thinking' ? '#ffb35c' : m === 'answer' ? '#fff3d0' : m === 'listening' ? '#9fd8c7' : '#ffe2a0'); },
    update(t, dt) { const sp = mode === 'thinking' ? 14 : mode === 'answer' ? 7 : 2.5; reels.forEach((r, i) => { r.rotation.x += dt * sp * (i ? 1.2 : 1); }); beam.material.opacity += ((mode === 'answer' || mode === 'listening' ? 0.06 : 0) - beam.material.opacity) * Math.min(1, dt * 4); eye.scale.y = (Math.sin(t * 2.3) > 0.97) ? 0.2 : 1; } };
}

export async function initNoir({ canvas, tierName, reducedMotion, onProgress, toast, playSfx = () => {}, onChotu, onContact, onPromo, onGame, onReady, onSlow }) {
  let T = tierCfg(tierName);
  canvas.style.touchAction = 'none';
  const r = new PsxRenderer(canvas, T); const renderer = r.renderer;
  if (T.name === 'Full') { renderer.shadowMap.enabled = false; }
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 260);
  onProgress?.(0.1, 'BUILDING THE STREET');
  try { await Promise.race([document.fonts?.load('40px "Limelight"'), new Promise((res) => setTimeout(res, 1500))]); } catch { /* fallback font */ }
  const city = buildCity(scene, T);
  onProgress?.(0.3, 'LOADING THE STAR');
  const avatar = await loadAvatar('/models/avatar.glb', (f) => onProgress?.(0.3 + f * 0.6, 'LOADING THE STAR'));
  scene.add(avatar.group);
  const player = createPlayer({ avatar, camera, colliders: city.cols, dom: canvas });
  const chotu = buildProjector(); scene.add(chotu.group);
  const fun = buildFun(scene, { lite: T.name !== 'Full' });

  // ----- invisible pick volumes for each place (tap a building to walk there) -----
  const picks = []; const pickMat = new THREE.MeshBasicMaterial({ visible: false });
  const PICK = { cinema: [0, 4, -18, 14, 9, 8], campus: [-14, 4, -17, 10, 8, 8], pawn: [14, 4, -17, 10, 8, 8], arcade: [-21, 4, 0, 8, 8, 10], kiosk: [16, 1.8, 1, 3.6, 3.6, 3.6], phone: [15, 1.4, 10, 1.6, 2.8, 1.6], billboard: [-14, 5, 11, 6.5, 3.5, 2] };
  for (const [id, [x, y, z, w, h, d]] of Object.entries(PICK)) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pickMat); m.position.set(x, y, z); if (id === 'billboard') m.rotation.y = 0.5; m.userData.id = id; scene.add(m); picks.push(m); }
  city.inter.filter((i) => i.bench).forEach((b, k) => { const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1), pickMat); m.position.set(b.pos.x, 0.6, b.pos.z); m.userData.id = 'bench' + k; m.userData.bench = b; scene.add(m); picks.push(m); });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2), pickMat); scene.add(ground);
  const interById = Object.fromEntries(city.inter.filter((i) => !i.bench).map((i) => [i.id, i]));

  // ----- HUD: place labels, dock, chips, prompt -----
  const hud = document.createElement('div'); hud.className = 'nhud'; hud.hidden = true;
  hud.innerHTML = `<div class="nchips"><button class="nchip" data-n="day" aria-pressed="false" title="Day / night">☾ Night</button><button class="nchip" data-n="silent" aria-pressed="false" title="Silent film look">🎞 Silent film</button><span class="nchip ncount" title="Golden film reels collected">◎ 0 / ${fun.total}</span></div>
    <nav class="ndock" aria-label="Places">${Object.keys(CROWD).map((id) => `<button data-walk="${id}"><b>${SCENES[id][1]}</b><span>${CROWD[id]}</span></button>`).join('')}</nav>
    <button class="nprompt" hidden></button><p class="nhint">${matchMedia('(pointer:fine)').matches ? 'Click anywhere to walk · click a building to go in · WASD works too' : 'Tap anywhere to walk · tap a building to go in'} · grab the golden reels</p>`;
  document.body.appendChild(hud);
  const labels = document.createElement('div'); labels.className = 'nlabels'; document.body.appendChild(labels);
  const labelEls = Object.entries(PICK).filter(([id]) => id === 'kiosk' || id === 'phone').map(([id, [x, y, z, , h]]) => { const b = document.createElement('button'); b.className = 'nlabel'; b.dataset.walk = id; b.innerHTML = `<b>${SCENES[id][1]}</b>`; labels.appendChild(b); return { el: b, p: new THREE.Vector3(id === 'arcade' ? x + 4.6 : x, id === 'kiosk' || id === 'phone' ? y + h / 2 + 0.8 : id === 'billboard' ? 7.6 : 3.4, id === 'cinema' || id === 'campus' || id === 'pawn' ? z + 4.6 : z), id }; });
  const prompt = hud.querySelector('.nprompt'); const countEl = hud.querySelector('.ncount');
  hud.addEventListener('click', (e) => { const w = e.target.closest('[data-walk]'); if (w) walkTo(w.dataset.walk); });
  labels.addEventListener('click', (e) => { const w = e.target.closest('[data-walk]'); if (w) walkTo(w.dataset.walk); });
  prompt.addEventListener('click', () => { if (near) arrive(near); });

  // ----- day / night + silent film -----
  let day = false; let silent = 1; let silentTarget = 1;
  const chipDay = hud.querySelector('[data-n=day]'); const chipSil = hud.querySelector('[data-n=silent]');
  try { day = localStorage.getItem('noirDay') === '1'; } catch { /* ignore */ }
  const applyDay = () => { city.setDay(day); chipDay.textContent = day ? '☀ Day' : '☾ Night'; chipDay.setAttribute('aria-pressed', String(day)); document.body.dataset.daynight = day ? 'day' : 'night'; };
  applyDay();
  chipDay.onclick = () => irisWipe(() => { day = !day; applyDay(); try { localStorage.setItem('noirDay', day ? '1' : '0'); } catch { /* ignore */ } playSfx('click'); });
  chipSil.onclick = () => { silentTarget = silentTarget ? 0 : 1; chipSil.setAttribute('aria-pressed', String(!!silentTarget)); document.body.classList.toggle('silent', !!silentTarget); playSfx('click'); };

  // ----- auto-walk -----
  let goal = null; let near = null; let busy = false; let idleT = 0;
  const tmp = new THREE.Vector3();
  function walkTo(id, point) {
    if (busy || mode !== 'play') return; closeReel();
    if (point) { goal = { x: THREE.MathUtils.clamp(point.x, -18.4, 18.4), z: THREE.MathUtils.clamp(point.z, -13.8, 24.4), id: null, t: 0, best: 1e9, stall: 0 }; return; }
    const it = id.startsWith('bench') ? picks.find((p) => p.userData.id === id)?.userData.bench : interById[id]; if (!it) return;
    const d = Math.hypot(it.pos.x - avatar.group.position.x, it.pos.z - avatar.group.position.z);
    if (d < 0.7) { arrive(it); return; }
    goal = { x: it.pos.x, z: it.pos.z, it, t: 0, best: d, stall: 0 }; playSfx('tick');
  }
  function stepAuto(dt) {
    if (!goal) { player.st.auto = null; return; }
    const p = avatar.group.position; const dx = goal.x - p.x; const dz = goal.z - p.z; const d = Math.hypot(dx, dz);
    goal.t += dt;
    if (d < (goal.it?.bench ? 0.25 : 0.45)) { const g = goal; goal = null; player.st.auto = null; if (g.it) arrive(g.it); return; }
    if (d < goal.best - 0.05) { goal.best = d; goal.stall = 0; } else goal.stall += dt;
    // steer round small obstacles: if pushing into something, add a sideways nudge
    let ax = dx / d; let az = dz / d; if (player.st.blockedNow || goal.stall > 0.35) { const s = goal.side || (goal.side = Math.random() < 0.5 ? 1 : -1); ax += -az * s * 1.2; az += (dx / d) * s * 1.2; }
    player.st.auto = { x: ax, z: az, run: d > 1.8 };
    if (goal.stall > 1.2 || goal.t > 9) { const g = goal; goal = null; player.st.auto = null; if (g.it) irisWipe(() => { player.teleport(tmp.set(g.x, 0, g.z), avatar.group.rotation.y); }).then(() => arrive(g.it)); }
  }
  async function arrive(it) {
    if (busy) return; busy = true; goal = null; player.st.auto = null; near = null; prompt.hidden = true;
    avatar.group.rotation.y = it.face;
    if (it.bench) { avatar.group.position.set(it.pos.x, 0, it.pos.z); avatar.setBase('Sit'); toast?.('Faisal takes a seat. Walk away to stand up.', 2500); busy = false; sitting = true; return; }
    avatar.play('Point'); playSfx('open');
    await new Promise((res) => setTimeout(res, reducedMotion ? 100 : 350));
    const [a, b] = SCENES[it.id];
    if (!reducedMotion && !seen.has(it.id)) { seen.add(it.id); await intertitle(a, b, 750); }
    open(it.id); busy = false;
  }
  let sitting = false; const seen = new Set();
  function open(id) {
    player.enable(false); hud.classList.add('dim');
    const back = () => { player.enable(mode === 'play'); hud.classList.remove('dim'); };
    if (id === 'phone') { avatar.play('Talk'); playSfx('ring'); onContact?.(); watchOverlay('contact', back); return; }
    if (id === 'billboard') { onPromo?.(); watchOverlay('promo', back); return; }
    if (id === 'arcade') { avatar.play('Throw'); play('slice', back); return; }
    if (id === 'kiosk') avatar.play('Wave');
    openReel(id, { onClose: back, onGo: (g) => { if (g === 'contact') walkTo('phone'); }, onPlay: (k) => play(k, back), onProject: () => avatar.play('Think') });
  }
  function watchOverlay(panelId, back) { const el = document.getElementById(panelId); const iv = setInterval(() => { if (!el || el.hidden) { clearInterval(iv); back(); } }, 300); }
  async function play(kind, back) {
    if (kind === 'slice') {
      const { startSlice } = await import('./slice.js'); running = false; hud.hidden = true; labels.hidden = true;
      startSlice({ lite: T.name !== 'Full', sfx: playSfx, onEnd: (n, total, quit) => { if (!quit) return; running = true; clock.getDelta(); requestAnimationFrame(frame); hud.hidden = false; labels.hidden = false; back(); avatar.play(n >= total ? 'Dance' : n >= total / 2 ? 'Victory' : n > 0 ? 'Wave' : 'Disappointed'); if (n) toast?.(`You sliced ${n} of ${total} skills.`, 3000); } });
      return;
    }
    back();
  }
  let gameBack = null;

  // ----- taps: building → walk there, ground → walk to point, Chotu → chat -----
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); let downAt = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || mode !== 'play' || busy) return; const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y); const dt = performance.now() - downAt.t; downAt = null;
    if (moved > 10 || dt > 450) return;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    if (ray.intersectObject(chotu.hit, false).length) { onChotu?.(); return; }
    const hit = ray.intersectObjects(picks, false)[0];
    if (hit) { walkTo(hit.object.userData.id); return; }
    const gp = ray.intersectObject(ground, false)[0]; if (gp) { walkTo(null, gp.point); marker(gp.point); }
  });
  addEventListener('keydown', (e) => {
    if (mode !== 'play' || e.target.closest?.('input,textarea,select') || reelOpen() || document.body.classList.contains('in-game')) return;
    if ((e.key === 'Enter' || e.key.toLowerCase() === 'e') && near) { e.preventDefault(); arrive(near); }
    if (e.key === ' ' && player.st.enabled && !jumpT) { e.preventDefault(); jumpT = 0.9; avatar.play('Jump'); playSfx('tick'); }
  });
  let jumpT = 0;

  // ----- intro: title card in silent film, then colour floods in -----
  let mode = 'title';
  avatar.group.position.set(0, 0, 9); avatar.group.rotation.y = 0; // facing the camera for the wave
  player.st.yaw = 0; player.st.pitch = 0.18; player.st.dist = player.st.targetDist = 5.2; player.st.lockCam = true; player.followCamera(0, true);
  chotu.group.position.set(1.4, 1.6, 9.5);
  async function startPlay() {
    if (mode !== 'title') return; mode = 'intro';
    avatar.play('Wave'); playSfx('open');
    if (!reducedMotion) await intertitle('Midnight Reel', 'starring Muhammad Faisal Hameed', 1500);
    silentTarget = 0; document.body.classList.remove('silent'); chipSil.setAttribute('aria-pressed', 'false');
    avatar.group.rotation.y = Math.PI; player.st.yaw = 0; player.st.targetDist = camDist(); player.st.pitch = 0.56; player.st.ahead = 2.5;
    mode = 'play'; player.enable(true); hud.hidden = false; onReady?.();
    toast?.(`Tap anywhere to walk. Tap a building to go inside. ${fun.total} golden reels are hidden on the street.`, 5500);
  }

  // ----- frame loop -----
  const clock = new THREE.Clock(); let running = true; let last = 0;
  const governor = new FpsGovernor({ threshold: T.name === 'Lite' ? 22 : 38, onSlow: (fps) => onSlow?.(fps, T) });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onSlow?.(0, T, 'context'); });
  const resize = () => { camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < innerHeight ? 62 : 50; camera.updateProjectionMatrix(); r.resize(); if (mode === 'play') player.st.targetDist = camDist(); };
  addEventListener('resize', resize); resize();
  const chTarget = new THREE.Vector3(); const proj = new THREE.Vector3();
  const mk = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffe2a0', transparent: true, depthWrite: false })); mk.visible = false; scene.add(mk); let mkT = 0;
  function marker(p) { mk.position.set(p.x, 0.06, p.z); mk.visible = true; mkT = 0; }
  function frame(now) {
    if (!running) return; requestAnimationFrame(frame);
    if (now - last < 1000 / T.maxFps - 1) return; last = now;
    const dt = Math.min(clock.getDelta(), 0.05); const t = clock.elapsedTime; governor.tick(now);
    const inGame = document.body.classList.contains('in-game');
    if (gameBack) { if (inGame) gameBack.seen = true; else if (gameBack.seen) { const b = gameBack.back; gameBack = null; hud.hidden = false; labels.hidden = false; b(); } }
    if (mode === 'play' && !inGame) {
      stepAuto(dt); player.update(dt);
      if (sitting && (player.st.moving || player.manualKeys())) { sitting = false; avatar.setBase('Idle'); }
      // nearest place → prompt
      let best = null; let bd = 2.6; const p = avatar.group.position;
      for (const it of Object.values(interById)) { const d = Math.hypot(it.pos.x - p.x, it.pos.z - p.z); if (d < bd) { bd = d; best = it; } }
      if (best !== near && !busy) { near = best; prompt.hidden = !near || reelOpen(); if (near) prompt.innerHTML = `<b>${SCENES[near.id][1]}</b> · ${matchMedia('(pointer:fine)').matches ? 'press E' : 'tap to enter'}`; }
      if (reelOpen()) prompt.hidden = true; else if (near && !busy && player.st.enabled) prompt.hidden = false;
      // idle flourishes: a man alone on a street at night
      if (!player.st.moving && !sitting && !reelOpen() && !goal) { idleT += dt; if (idleT > 16) { idleT = 0; avatar.play(['Think', 'Dance', 'Wave', 'Disappointed'][(Math.random() * 4) | 0]); } } else idleT = 0;
      if (jumpT > 0) jumpT = Math.max(0, jumpT - dt);
      for (const ev of fun.update(t, dt, avatar.group.position, player.st.speed > 4)) {
        if (ev.type === 'reel') { countEl.textContent = `◎ ${ev.got} / ${ev.total}`; countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump'); playSfx('tick');
          if (ev.got === ev.total) { playSfx('win'); avatar.play('Dance'); intertitle('That’s a wrap!', 'every reel found. Now ring me from the phone booth.', 1800); } else if (ev.got % 6 === 0) { avatar.play('Victory'); } }
        if (ev.type === 'flap') playSfx('click');
      }
    } else if (mode === 'title' || mode === 'intro') { player.followCamera(dt); fun.update(t, dt, avatar.group.position, false); }
    if (mk.visible) { mkT += dt; mk.scale.setScalar(1 + mkT * 2); mk.material.opacity = Math.max(0, 0.8 - mkT * 1.6); if (mkT > 0.5) mk.visible = false; }
    avatar.update(dt, T.avatarHz);
    // Chotu trails behind his right shoulder, hovering
    const b = avatar.group; chTarget.set(b.position.x - Math.sin(b.rotation.y) * 1.1 + Math.cos(b.rotation.y) * 0.9, 1.7 + Math.sin(t * 2) * 0.08, b.position.z - Math.cos(b.rotation.y) * 1.1 - Math.sin(b.rotation.y) * 0.9);
    chotu.group.position.lerp(chTarget, Math.min(1, dt * 2.5)); chotu.group.rotation.y += ((b.rotation.y) - chotu.group.rotation.y) * Math.min(1, dt * 3); chotu.update(t, dt);
    for (const f of city.update) f(t, dt, camera);
    city.sky.position.copy(camera.position);
    silent += (silentTarget - silent) * Math.min(1, dt * 2.5); r.post.uniforms.uSilent.value = silent;
    // labels follow their buildings (hidden when behind the camera or far)
    if (mode === 'play' && !hud.hidden) for (const L of labelEls) { proj.copy(L.p).project(camera); const vis = proj.z < 1 && Math.abs(proj.x) < 1.05 && Math.abs(proj.y) < 1.05; L.el.hidden = !vis; if (vis) L.el.style.transform = `translate(${((proj.x + 1) / 2) * innerWidth}px, ${((1 - proj.y) / 2) * innerHeight}px) translate(-50%,-100%)`; }
    else labelEls.forEach((L) => { L.el.hidden = true; });
    r.render(scene, camera, t);
  }
  requestAnimationFrame(frame);
  onProgress?.(1, 'READY');

  return {
    startPlay, avatar, scene, camera, renderer, chotu,
    spawnChotu() { chotu.setMode('listening'); },
    warp(i) { const id = ZONE_TO[i]; if (!id) return; if (mode === 'title') startPlay().then(() => walkTo(id)); else walkTo(id); },
    unlock() {}, gameWon() {}, focusGame() {}, endGame() {},
    setTier(name) { T = tierCfg(name); r.setTier(T); },
    pause(v) { running = !v; if (running) { clock.getDelta(); requestAnimationFrame(frame); } },
    get fps() { return governor.fps; }, get phase() { return mode; }, get pos() { return avatar.group.position; },
  };
}
