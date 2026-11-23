import * as THREE from 'three';
import { PsxRenderer } from '../stage/psx.js';
import { loadAvatar } from '../stage/avatar.js';
import { TIERS, FpsGovernor } from '../quality.js';
import { buildShip, ROOMS, MIN_X, MAX_X } from './ship.js';
import { titleCard, openPanel, closePanel, panelOpen } from './cards.js';
import { createJazz } from './jazz.js';
import { audioCtx, isEnabled as soundOn, onToggle } from '../audio.js';

// THE FAISAL SESSIONS: walk the corridor of a little cargo ship; every room is a section.
const ZONE_TO = ['cockpit', 'hangar', 'lounge', 'arcade', 'bunks', 'comms']; // menu: about, journey, projects, skills, achievements, contact
const tierCfg = (name) => { const t = TIERS[name]; const full = name === 'full'; return { ...t, native: true, maxPR: full ? 2 : 1, msaa: full ? 4 : 0, snap: false, dither: false, grain: full ? 0.025 : 0 }; };
const portrait = () => innerWidth < innerHeight;

function buildDog() { // Chotu: a small boxy robot dog
  const g = new THREE.Group(); const M = (c, e = '#000') => new THREE.MeshLambertMaterial({ color: c, emissive: e, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.34), M('#e2b04a')); body.position.y = 0.42; g.add(body);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.3), M('#efe2c4')); belly.position.y = 0.27; g.add(belly);
  const head = new THREE.Group(); head.position.set(0.38, 0.66, 0); g.add(head);
  head.add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.3), M('#e2b04a')));
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.16), M('#efe2c4')); snout.position.set(0.2, -0.05, 0); head.add(snout);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.24), new THREE.MeshBasicMaterial({ color: '#7fd6e8' })); visor.position.set(0.165, 0.05, 0); head.add(visor);
  [-1, 1].forEach((s) => { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 4), M('#c8562b')); ear.position.set(-0.04, 0.22, s * 0.1); head.add(ear); });
  const legs = [[0.2, 0.12], [0.2, -0.12], [-0.2, 0.12], [-0.2, -0.12]].map(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.08), M('#24323d')); l.position.set(x, 0.14, z); g.add(l); return l; });
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), M('#24323d')); tail.position.set(-0.34, 0.62, 0); tail.rotation.z = 0.6; g.add(tail);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff5a3a' })); tip.position.set(-0.43, 0.76, 0); g.add(tip);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.9), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.5; g.add(hit);
  let mode = 'idle';
  return { group: g, hit, setMode(m) { mode = m; visor.material.color.set(m === 'thinking' ? '#ffb35c' : m === 'answer' ? '#ffffff' : '#7fd6e8'); },
    update(t, dt, moving) { const w = moving ? 14 : 0; legs.forEach((l, i) => { l.rotation.z = Math.sin(t * w + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6 * (moving ? 1 : 0); });
      tail.rotation.x = Math.sin(t * (mode === 'answer' ? 22 : 9)) * 0.6; head.rotation.z = mode === 'thinking' ? Math.sin(t * 3) * 0.2 : moving ? 0 : Math.sin(t * 1.3) * 0.08; body.position.y = 0.42 + (moving ? Math.abs(Math.sin(t * 14)) * 0.03 : 0); tip.visible = mode !== 'thinking' || Math.sin(t * 10) > 0; } };
}

export async function initShip({ canvas, tierName, reducedMotion, onProgress, toast, playSfx = () => {}, onChotu, onContact, onPromo, onReady, onSlow }) {
  let T = tierCfg(tierName);
  canvas.style.touchAction = 'none';
  const r = new PsxRenderer(canvas, T); const renderer = r.renderer;
  r.post.uniforms.uShadowTint.value.set(0.97, 0.99, 1.02); r.post.uniforms.uHighTint.value.set(1.03, 1.0, 0.95); r.post.uniforms.uVignette.value = 0.4;
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 700);
  onProgress?.(0.1, 'FUELLING THE SHIP');
  try { await Promise.race([document.fonts?.load('40px "Bebas Neue"'), new Promise((res) => setTimeout(res, 1500))]); } catch { /* fallback font */ }
  const ship = buildShip(scene, T);
  onProgress?.(0.3, 'WAKING THE PILOT');
  const avatar = await loadAvatar('/models/avatar.glb', (f) => onProgress?.(0.3 + f * 0.6, 'WAKING THE PILOT'));
  scene.add(avatar.group);
  const dog = buildDog(); scene.add(dog.group);
  const jazz = createJazz(() => audioCtx());

  // ----- credit chips: walk through them; the high ones need a jump -----
  const chipGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 14); chipGeo.rotateX(Math.PI / 2);
  const chipM = new THREE.MeshLambertMaterial({ color: '#e2b04a', emissive: '#4a3208' }); const chipEdge = new THREE.MeshBasicMaterial({ color: '#14110e' });
  const chips = [];
  for (let x = -23; x <= 21.5; x += 2.2) { const high = chips.length % 4 === 3; const c = new THREE.Group(); c.add(new THREE.Mesh(chipGeo, chipM)); const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), chipEdge); s.position.z = 0.03; c.add(s); c.position.set(x + Math.sin(x) * 0.4, high ? 2.15 : 1.0, 0.35); c.userData = { high, got: false, y0: high ? 2.15 : 1.0 }; scene.add(c); chips.push(c); }

  // ----- HUD -----
  const hud = document.createElement('div'); hud.className = 'shud'; hud.hidden = true;
  hud.innerHTML = `<div class="schips"><button class="schip" data-s="lights" aria-pressed="false">☀ Cabin lights</button><button class="schip" data-s="jazz" aria-pressed="false">♫ Jazz</button><span class="schip scount" title="Credit chips collected">◉ 0 / ${chips.length}</span></div>
    <nav class="sdock" aria-label="Rooms">${ROOMS.slice().reverse().map((rm) => `<button data-room="${rm.id}"><i>#${rm.n}</i><b>${rm.name}</b><span>${rm.what}</span></button>`).join('')}</nav>
    <button class="sprompt" hidden></button><div class="spad" aria-hidden="true"><button data-pad="-1">◀</button><button data-pad="jump">▲</button><button data-pad="1">▶</button></div>
    <p class="shint">${matchMedia('(pointer:fine)').matches ? 'Click a room to walk there · ← → or A D to walk · Space to jump' : 'Tap a room to walk there · grab the gold chips'}</p>`;
  document.body.appendChild(hud);
  const tags = document.createElement('div'); tags.className = 'stags'; document.body.appendChild(tags);
  const tagEls = ROOMS.map((rm) => { const b = document.createElement('button'); b.className = 'stag'; b.dataset.room = rm.id; b.innerHTML = `<i>#${rm.n}</i>${rm.name}<span>${rm.what}</span>`; tags.appendChild(b); return { el: b, p: new THREE.Vector3(rm.x, 4.95, 1.75), rm }; });
  const prompt = hud.querySelector('.sprompt'); const countEl = hud.querySelector('.scount');
  const onRoomClick = (e) => { const b = e.target.closest('[data-room]'); if (b) goRoom(b.dataset.room); };
  hud.addEventListener('click', onRoomClick); tags.addEventListener('click', onRoomClick);
  prompt.addEventListener('click', () => { if (here) enter(here); });

  // lights + jazz
  let night = false; const chipL = hud.querySelector('[data-s=lights]'); const chipJ = hud.querySelector('[data-s=jazz]');
  const applyLights = () => { ship.setLights(night); chipL.textContent = night ? '☾ Starlight' : '☀ Cabin lights'; chipL.setAttribute('aria-pressed', String(night)); };
  try { night = localStorage.getItem('shipNight') === '1'; } catch { /* ignore */ } applyLights();
  chipL.onclick = () => { night = !night; applyLights(); playSfx('click'); try { localStorage.setItem('shipNight', night ? '1' : '0'); } catch { /* ignore */ } };
  let wantJazz = true; try { wantJazz = localStorage.getItem('jazz') !== '0'; } catch { /* ignore */ }
  const syncJazz = () => { if (soundOn() && wantJazz && mode === 'play') jazz.start(); else jazz.stop(); chipJ.setAttribute('aria-pressed', String(jazz.playing)); chipJ.textContent = jazz.playing ? '♫ Jazz on' : '♫ Jazz'; };
  chipJ.onclick = () => { if (!soundOn()) { document.getElementById('soundChip')?.click(); wantJazz = true; } else wantJazz = !jazz.playing; try { localStorage.setItem('jazz', wantJazz ? '1' : '0'); } catch { /* ignore */ } setTimeout(syncJazz, 50); };
  onToggle.push(() => setTimeout(syncJazz, 50));

  // ----- 1-D walker -----
  const P = { x: 0, vx: 0, y: 0, vy: 0, face: 1, target: null, run: false, room: null };
  const keys = new Set(); let pad = 0;
  addEventListener('keydown', (e) => { if (e.target.closest?.('input,textarea,select') || mode !== 'play' || panelOpen() || document.querySelector('.slice')) return; const k = e.key.toLowerCase(); keys.add(k);
    if (['arrowleft', 'arrowright', 'a', 'd', ' '].includes(k)) e.preventDefault(); if (k === ' ' || k === 'arrowup' || k === 'w') jump(); if ((k === 'e' || k === 'enter') && here) enter(here); if (k === 'shift') P.run = true; });
  addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); keys.delete(k); if (k === 'shift') P.run = false; });
  addEventListener('blur', () => keys.clear());
  hud.querySelectorAll('[data-pad]').forEach((b) => { const v = b.dataset.pad; b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (v === 'jump') jump(); else { pad = +v; P.target = null; } }); const up = () => { if (v !== 'jump') pad = 0; }; b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up); });
  function jump() { if (P.y > 0.01 || busy) return; P.vy = 6.2; avatar.play('Jump', { fade: 0.1 }); playSfx('tick'); }
  let goalRoom = null;
  function goRoom(id) { if (mode !== 'play' || busy) return; closePanel(); const rm = ROOMS.find((x) => x.id === id); if (!rm) return; goalRoom = rm; P.target = THREE.MathUtils.clamp(rm.x, MIN_X + 0.6, MAX_X - 0.6); playSfx('tick'); if (Math.abs(P.target - P.x) < 0.3) arrive(); }

  // ----- rooms -----
  let busy = false; let here = null; const seen = new Set();
  async function arrive() { const rm = goalRoom; goalRoom = null; P.target = null; if (!rm) return; await enter(rm); }
  async function enter(rm) {
    if (busy) return; busy = true; prompt.hidden = true; P.vx = 0; P.target = null;
    avatar.group.rotation.y = 0; avatar.play('Point'); playSfx('open');
    await new Promise((res) => setTimeout(res, reducedMotion ? 80 : 300));
    if (!reducedMotion && !seen.has(rm.id)) { seen.add(rm.id); await titleCard(rm.n, rm.title, `${rm.name} · ${rm.what}`, 900); }
    open(rm.id); busy = false;
  }
  function back() { hud.classList.remove('dim'); avatar.group.rotation.y = P.face > 0 ? Math.PI / 2 : -Math.PI / 2; }
  function watch(id) { const el = document.getElementById(id); const iv = setInterval(() => { if (!el || el.hidden) { clearInterval(iv); back(); } }, 300); }
  async function open(id) {
    hud.classList.add('dim'); const tst = document.getElementById('toast'); if (tst) tst.hidden = true;
    if (id === 'comms') { avatar.play('Talk'); playSfx('ring'); onContact?.(); watch('contact'); return; }
    if (id === 'screen') { avatar.play('Sit'); onPromo?.(); watch('promo'); return; }
    if (id === 'arcade') {
      avatar.play('Throw'); const { startSlice } = await import('./slice.js'); running = false; hud.hidden = true; tags.hidden = true;
      startSlice({ lite: T.name !== 'Full', sfx: playSfx, onEnd: (n, total, quit) => { if (!quit) return; running = true; clock.getDelta(); requestAnimationFrame(frame); hud.hidden = false; tags.hidden = false; back(); avatar.play(n >= total ? 'Dance' : n >= total / 2 ? 'Victory' : n > 0 ? 'Wave' : 'Disappointed'); if (n) toast?.(`You swiped ${n} of ${total} skills.`, 3000); } });
      return;
    }
    if (id === 'cockpit') avatar.play('Wave');
    if (id === 'hangar') avatar.play('Think');
    if (id === 'bunks') avatar.play('Victory');
    openPanel(id, { onClose: back, onGo: (g) => goRoom(g), onProject: () => avatar.play('Think') });
  }

  // ----- taps: on a room → walk there; on the dog → chat -----
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); let downAt = null;
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.0); const hitP = new THREE.Vector3();
  canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || mode !== 'play' || busy) return; const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y); downAt = null; if (moved > 12) return;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    if (ray.intersectObject(dog.hit, false).length) { onChotu?.(); dog.setMode('listening'); return; }
    if (ray.ray.intersectPlane(floorPlane, hitP)) { const rm = ROOMS.find((q) => Math.abs(hitP.x - q.x) <= q.w / 2); if (rm && hitP.y > -1.5 && hitP.y < 6.5) goRoom(rm.id); }
  });

  // ----- intro -----
  let mode = 'title';
  P.x = 5.5; avatar.group.position.set(P.x, 0, 0); avatar.group.rotation.y = 0;
  dog.group.position.set(P.x - 1.3, 0, 0.6);
  const camPos = new THREE.Vector3(); const camLook = new THREE.Vector3();
  function camFor(x, snap) {
    const p = portrait(); const z = p ? 18 : 16.5; const cxl = THREE.MathUtils.clamp(x, MIN_X + (p ? 2.5 : 8), MAX_X + (p ? 1.5 : -4));
    camPos.set(cxl, p ? 3.2 : 2.7, z); camLook.set(cxl, p ? 2.0 : 1.45, 0);
    if (mode === 'title') { camPos.set(x + 1.2, 1.9, 6.5); camLook.set(x, 1.4, 0); }
    if (snap) camera.position.copy(camPos);
  }
  camFor(P.x, true); camera.lookAt(camLook);
  async function startPlay() {
    if (mode !== 'title') return; mode = 'intro'; avatar.play('Wave'); playSfx('open');
    if (!reducedMotion) await titleCard('00', 'The Faisal Sessions', 'a space-jazz portfolio', 1500);
    mode = 'play'; hud.hidden = false; onReady?.(); syncJazz(); avatar.group.rotation.y = Math.PI / 2;
    toast?.(`${matchMedia('(pointer:fine)').matches ? 'Click' : 'Tap'} any room and Faisal walks there. Gold chips are scattered along the corridor.`, 5500);
  }

  // ----- loop -----
  const clock = new THREE.Clock(); let running = true; let last = 0; let got = 0; let idleT = 0;
  const governor = new FpsGovernor({ threshold: T.name === 'Lite' ? 22 : 38, onSlow: (fps) => onSlow?.(fps, T) });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onSlow?.(0, T, 'context'); });
  const resize = () => { camera.aspect = innerWidth / innerHeight; camera.fov = portrait() ? 52 : 36; camera.updateProjectionMatrix(); r.resize(); };
  addEventListener('resize', resize); resize();
  const proj = new THREE.Vector3(); let walking = false;
  function frame(now) {
    if (!running) return; requestAnimationFrame(frame);
    if (now - last < 1000 / T.maxFps - 1) return; last = now;
    const dt = Math.min(clock.getDelta(), 0.05); const t = clock.elapsedTime; governor.tick(now);
    if (mode === 'play' && !panelOpen() && !busy) {
      let dir = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0) + pad;
      if (dir) { P.target = null; goalRoom = null; }
      let want = 0;
      if (dir) want = dir * (P.run ? 6.5 : 3.6);
      else if (P.target !== null) { const d = P.target - P.x; if (Math.abs(d) < 0.12) { P.x = P.target; P.vx = 0; if (goalRoom) arrive(); else P.target = null; } else want = Math.sign(d) * (Math.abs(d) > 6 ? 9 : Math.abs(d) > 2.5 ? 6.5 : 3.6) * Math.min(1, Math.abs(d) / 0.6 + 0.3); }
      P.vx += (want - P.vx) * Math.min(1, dt * 10);
      P.x = THREE.MathUtils.clamp(P.x + P.vx * dt, MIN_X + 0.4, MAX_X); if (Math.abs(P.vx) > 0.2) P.face = Math.sign(P.vx);
      const tr = P.face > 0 ? Math.PI / 2 : -Math.PI / 2; let dr = tr - avatar.group.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); if (Math.abs(P.vx) > 0.2) avatar.group.rotation.y += dr * Math.min(1, dt * 12);
      const mv = Math.abs(P.vx) > 0.4; if (mv !== walking) { walking = mv; if (P.y < 0.01) avatar.setBase(mv ? 'Walk' : 'Idle'); }
      if (mv && avatar.actions.Walk) avatar.actions.Walk.timeScale = THREE.MathUtils.clamp(Math.abs(P.vx) / 2.4, 0.8, 2.4);
      // jump physics
      if (P.y > 0 || P.vy > 0) { P.vy -= 18 * dt; P.y += P.vy * dt; if (P.y <= 0) { P.y = 0; P.vy = 0; avatar.setBase(walking ? 'Walk' : 'Idle'); } }
      avatar.group.position.set(P.x, P.y, 0);
      // which room am I in? prompt to go in
      const rm = ROOMS.find((q) => Math.abs(P.x - q.x) < 1.2) || null;
      if (rm !== here) { here = rm; if (here) prompt.innerHTML = `<i>#${here.n}</i> <b>${here.name}</b> · ${matchMedia('(pointer:fine)').matches ? 'press E' : 'tap to go in'}`; }
      prompt.hidden = !here || goalRoom !== null || walking;
      // chips
      for (const c of chips) { const u = c.userData; if (u.got) { if (c.visible) { c.position.y += dt * 5; c.scale.multiplyScalar(1 - dt * 4); if (c.scale.x < 0.1) c.visible = false; } continue; }
        c.rotation.y = t * 3 + c.position.x; c.position.y = u.y0 + Math.sin(t * 3 + c.position.x) * 0.08;
        if (Math.abs(c.position.x - P.x) < 0.45 && (!u.high || P.y > 0.55)) { u.got = true; got++; countEl.textContent = `◉ ${got} / ${chips.length}`; countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump'); playSfx('tick');
          if (got === chips.length) { playSfx('win'); avatar.play('Dance'); titleCard('∞', 'Jackpot', 'every chip collected. Now send me a message from the radio room.', 1800); } else if (got % 7 === 0) avatar.play('Victory'); } }
      // idle flourishes
      if (!walking && P.y === 0 && !panelOpen()) { idleT += dt; if (idleT > 14) { idleT = 0; avatar.group.rotation.y = 0; avatar.play(['Dance', 'Think', 'Wave'][(Math.random() * 3) | 0]); } } else idleT = 0;
    }
    avatar.update(dt, T.avatarHz);
    // the dog trots behind
    const dx = P.x - P.face * 1.1 - dog.group.position.x; const dm = Math.abs(dx) > 0.15; dog.group.position.x += dx * Math.min(1, dt * 3); dog.group.rotation.y = dx > 0.05 ? 0 : dx < -0.05 ? Math.PI : dog.group.rotation.y; dog.update(t, dt, dm && Math.abs(dx) > 0.3);
    for (const f of ship.update) f(t, dt);
    camFor(P.x); camera.position.lerp(camPos, Math.min(1, dt * (mode === 'play' ? 3 : 1.8))); camera.lookAt(camLook);
    ship.sky.position.copy(camera.position); ship.stars.position.copy(camera.position);
    // room tags under the floor line
    const showTags = mode === 'play' && !hud.hidden;
    for (const L of tagEls) { if (!showTags) { L.el.hidden = true; continue; } proj.copy(L.p).project(camera); const vis = proj.z < 1 && Math.abs(proj.x) < 1.1; L.el.hidden = !vis; if (vis) L.el.style.transform = `translate(${((proj.x + 1) / 2) * innerWidth}px, ${((1 - proj.y) / 2) * innerHeight}px) translate(-50%,-50%)`; L.el.classList.toggle('on', here === L.rm); }
    r.render(scene, camera, t);
  }
  requestAnimationFrame(frame); onProgress?.(1, 'READY');

  return {
    startPlay, avatar, scene, camera, renderer, chotu: dog,
    spawnChotu() { dog.setMode('listening'); },
    warp(i) { const id = ZONE_TO[i]; if (!id) return; if (mode === 'title') startPlay().then(() => goRoom(id)); else goRoom(id); },
    unlock() {}, gameWon() {}, focusGame() {}, endGame() {},
    setTier(name) { T = tierCfg(name); r.setTier(T); },
    pause(v) { running = !v; if (running) { clock.getDelta(); requestAnimationFrame(frame); } else jazz.stop(); if (!v) syncJazz(); },
    get fps() { return governor.fps; }, get phase() { return mode; }, get pos() { return P; },
  };
}
