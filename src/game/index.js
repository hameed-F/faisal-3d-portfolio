import * as THREE from 'three';
import { buildIsland, LEVELS } from './island.js';
import { renderScreen, projectDetail } from './screens.js';
import { loadAvatar } from '../stage/avatar.js';
import { buildChotu } from '../stage/chotu.js';
import { psxUniforms } from '../stage/psx.js';
import { TIERS, FpsGovernor } from '../quality.js';
import { projects } from '../content.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const LEVEL_ANIM = { player: 'Wave', quests: 'Think', library: 'Point', inventory: 'Throw', trophies: 'Victory', multiplayer: 'Talk' };

// ---------------- XP + achievements (saved in this browser) ----------------
const ACH = {
  start: ['Press Start', 'Started the game'], first: ['First Steps', 'Opened your first level'], explorer: ['Explorer', 'Visited all 6 levels'],
  critic: ['Game Critic', 'Looked at 5 projects'], chotu: ['Snake Whisperer', 'Talked to Chotu'], invite: ['Party Up', 'Sent an invite'],
  chess: ['Checkmate!', 'Beat the chess AI'], cv: ['Paper Trail', 'Downloaded the CV'],
};
function loadSave() { try { return JSON.parse(localStorage.getItem('p1save') || '{}'); } catch { return {}; } }

export async function initGame({ canvas, tierName, onProgress, onSlow, onCert, onChotu, onReady, toast, reducedMotion, mountForm, playSfx }) {
  psxUniforms.uSnap.value = 0;
  let tier = TIERS[tierName];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier.name === 'Full', powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = tier.name === 'Full'; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.5, 600);
  const dpr = Math.min(devicePixelRatio || 1, 2); let pr = tier.name === 'Full' ? Math.min(dpr, 1.75) : Math.min(dpr, 1.1);
  const resize = () => { renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
  resize(); addEventListener('resize', resize);

  onProgress?.(0.1, 'Raising the island…');
  const I = await buildIsland(scene, tier, (f) => onProgress?.(0.1 + f, 'Planting trees…'));
  onProgress?.(0.45, 'Waking up the player…');
  const avatar = await loadAvatar('/models/avatar.glb', (f) => onProgress?.(0.45 + f * 0.45, 'Waking up the player…'));
  avatar.group.traverse((o) => { if (o.isMesh) o.castShadow = tier.name === 'Full'; }); avatar.look.enabled = true; scene.add(avatar.group);
  if (avatar.actions.Sit) avatar.actions.Sit.setLoop(THREE.LoopRepeat);
  const chotu = buildChotu(); chotu.group.scale.setScalar(2.1); chotu.group.position.copy(I.fountainPos).add(V(0, 1.15, 0)); chotu.group.rotation.y = 2.2; scene.add(chotu.group);
  onProgress?.(0.95, 'Press start…');

  // ---------------- save / XP ----------------
  const save = Object.assign({ xp: 0, ach: [], seen: [], proj: [] }, loadSave());
  const persist = () => { try { localStorage.setItem('p1save', JSON.stringify(save)); } catch { /* ignore */ } };
  const lvl = () => 1 + Math.floor(save.xp / 300);
  function addXP(n) { const before = lvl(); save.xp += n; persist(); hudXP(); if (lvl() > before) { toastAch('⭐', `Level ${lvl()}!`, 'Your player levelled up'); avatar.play('Victory'); playSfx?.('win'); } }
  function unlock(k) { if (save.ach.includes(k)) return; save.ach.push(k); persist(); const [t, d] = ACH[k]; toastAch('🏆', t, d); playSfx?.('ladder'); addXP(100); }
  const achEl = document.createElement('div'); achEl.className = 'ach-toast'; achEl.hidden = true; document.body.appendChild(achEl); let achT = null; const achQ = [];
  function toastAch(icon, t, d) { achQ.push([icon, t, d]); if (achQ.length === 1) showNextAch(); }
  function showNextAch() { const n = achQ[0]; if (!n) return; achEl.innerHTML = `<i>${n[0]}</i><div><small>Achievement unlocked</small><b>${n[1]}</b><span>${n[2]}</span></div>`; achEl.hidden = false; achEl.classList.remove('out'); clearTimeout(achT); achT = setTimeout(() => { achEl.classList.add('out'); setTimeout(() => { achEl.hidden = true; achQ.shift(); showNextAch(); }, 350); }, 2600); }

  // ---------------- HUD ----------------
  const hud = document.createElement('div'); hud.className = 'p1hud'; hud.hidden = true;
  hud.innerHTML = `<div class="p1-player"><span class="p1-av">MF</span><div><b>FAISAL</b><span class="p1-lv">LV 1</span><div class="p1-xp"><i></i></div></div></div>`;
  document.body.appendChild(hud);
  const dock = document.createElement('nav'); dock.className = 'p1dock'; dock.hidden = true; dock.setAttribute('aria-label', 'Levels');
  dock.innerHTML = LEVELS.map((L) => `<button data-lv="${L.id}" style="--c:${L.color}" aria-label="${L.n}. ${L.name}"><i>${L.icon}</i><span>${L.name}</span><em>✓</em></button>`).join('');
  document.body.appendChild(dock);
  dock.addEventListener('click', (e) => { const b = e.target.closest('[data-lv]'); if (b) goLevel(b.dataset.lv); });
  function hudXP() { hud.querySelector('.p1-lv').textContent = `LV ${lvl()} · ${save.xp} XP`; hud.querySelector('.p1-xp i').style.width = ((save.xp % 300) / 3) + '%'; dock.querySelectorAll('[data-lv]').forEach((b) => b.classList.toggle('done', save.seen.includes(b.dataset.lv))); }
  const tip = document.createElement('div'); tip.className = 'p1tip'; tip.hidden = true; document.body.appendChild(tip);

  // ---------------- screen (level menu) ----------------
  const scr = document.createElement('section'); scr.className = 'p1scr'; scr.hidden = true; scr.setAttribute('role', 'dialog'); document.body.appendChild(scr);
  let openLevel = null;
  function openScreen(id) {
    openLevel = id; const L = LEVELS.find((x) => x.id === id);
    scr.style.setProperty('--lc', L.color); scr.innerHTML = renderScreen(id); scr.hidden = false; scr.scrollTop = 0; scr.classList.remove('in'); void scr.offsetWidth; scr.classList.add('in');
    document.body.classList.add('scr-open');
    if (id === 'multiplayer') { mountForm?.(scr.querySelector('#mpForm')); const tp = scr.querySelector('#trailerPlay'); if (tp) tp.onclick = () => { scr.querySelector('#trailer').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${tp.dataset.id || ''}" allowfullscreen></iframe>`; }; }
    if (!save.seen.includes(id)) { save.seen.push(id); persist(); addXP(100); unlock('first'); if (LEVELS.every((x) => save.seen.includes(x.id))) { unlock('explorer'); setTimeout(() => { avatar.play('Dance'); toast?.('🎉 You explored every level! Thanks for playing.', 5000); }, 900); } }
    hudXP(); playSfx?.('open');
  }
  function closeScreen() { if (scr.hidden) return; scr.hidden = true; openLevel = null; document.body.classList.remove('scr-open'); camGoal = 'overview'; playSfx?.('close'); }
  scr.addEventListener('click', (e) => {
    if (e.target.closest('[data-scr-close]')) { closeScreen(); return; }
    const f = e.target.closest('[data-lib]'); if (f) { const g = f.dataset.lib; scr.querySelectorAll('[data-lib]').forEach((b) => b.setAttribute('aria-pressed', String(b === f))); scr.querySelectorAll('.cover').forEach((c) => { c.hidden = g !== 'All' && c.dataset.group !== g; }); return; }
    const c = e.target.closest('[data-proj]'); if (c) { const body = scr.querySelector('.scr-body'); body.dataset.grid = body.innerHTML; body.innerHTML = projectDetail(c.dataset.proj); scr.scrollTop = 0; if (!save.proj.includes(c.dataset.proj)) { save.proj.push(c.dataset.proj); persist(); addXP(20); if (save.proj.length >= 5) unlock('critic'); } avatar.play('Point'); return; }
    if (e.target.closest('[data-lib-back]')) { const body = scr.querySelector('.scr-body'); body.innerHTML = body.dataset.grid; return; }
    const cert = e.target.closest('[data-cert]'); if (cert) { onCert?.(cert.dataset.cert); addXP(10); return; }
    if (e.target.closest('a[download]')) unlock('cv');
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !scr.hidden && document.getElementById('lightbox')?.hidden !== false) closeScreen(); });

  // ---------------- travel along the path ----------------
  const curve = I.curve; let tCur = I.nodeT.start; let travel = null; let mode = 'title'; let atLevel = null;
  const place = (t) => { const p = curve.getPointAt(t); avatar.group.position.set(p.x, 0.47, p.z); };
  place(tCur); avatar.group.rotation.y = 0.4;
  function goLevel(id) {
    if (mode === 'title') return; closeScreen(); const target = I.nodeT[id];
    if (Math.abs(target - tCur) < 0.002 && !travel) { arriveAt(id); return; }
    travel = { from: tCur, to: target, id, t: 0, dur: Math.max(0.9, Math.abs(target - tCur) * curve.getLength() / 6.5) };
    avatar.setBase('Walk'); if (avatar.actions.Walk) avatar.actions.Walk.timeScale = 1.85; camGoal = 'follow'; playSfx?.('click');
  }
  async function arriveAt(id) {
    atLevel = id; avatar.setBase('Idle');
    avatar.play('Jump'); playSfx?.('ladder'); const p = avatar.group.position; const y0 = 0.47; const t0 = performance.now();
    await new Promise((res) => { const s = () => { const k = Math.min(1, (performance.now() - t0) / 900); p.y = y0 + Math.max(0, Math.sin(Math.min(1, Math.max(0, (k - 0.2) / 0.6)) * Math.PI)) * 0.7; if (k < 1) requestAnimationFrame(s); else { p.y = y0; res(); } }; s(); });
    avatar.group.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
    avatar.play(LEVEL_ANIM[id] || 'Wave'); camGoal = 'level'; openScreen(id);
  }

  // ---------------- pointer: hover + tap levels / Chotu ----------------
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); let down = null; let hover = null;
  const setRay = (e) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
  const pickLevel = () => { const h = ray.intersectObjects(I.hits, false)[0]; return h ? h.object.userData.level : null; };
  canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; drag = { x: e.clientX, az: az0 }; });
  addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointermove', (e) => {
    if (drag && Math.abs(e.clientX - drag.x) > 6 && camGoal === 'overview') az0 = drag.az - (e.clientX - drag.x) * 0.005;
    if (e.pointerType === 'touch' || mode !== 'play') return; setRay(e); const lv = pickLevel();
    if (lv !== hover) { if (hover) I.pads[hover].hover = false; hover = lv; if (lv) I.pads[lv].hover = true; canvas.style.cursor = lv ? 'pointer' : ''; tip.hidden = !lv; if (lv) { const L = LEVELS.find((x) => x.id === lv); tip.innerHTML = `<b style="background:${L.color}">${L.n}</b>${L.name}<small>${L.sub}</small>`; } }
    if (lv) { tip.style.left = e.clientX + 16 + 'px'; tip.style.top = e.clientY + 12 + 'px'; }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8 || mode !== 'play') return; setRay(e);
    if (ray.intersectObject(chotu.group, true).length) { talkChotu(); return; }
    const lv = pickLevel(); if (lv) goLevel(lv);
  });
  function talkChotu() { chotu.setMode('listening'); onChotu?.(); unlock('chotu'); }
  let drag = null;

  // ---------------- camera ----------------
  let az0 = 0.55; let camGoal = 'title'; const camPos = V(0, 0, 0); const camTgt = V(0, 0, 0); const curTgt = V(0, 1, 0);
  function overviewDist() { const port = innerHeight > innerWidth; const vfov = THREE.MathUtils.degToRad(camera.fov); const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect); const need = port ? 31 : 35; return Math.max((need / 2) / Math.tan(hfov / 2), (22 / 2) / Math.tan(vfov / 2)) * 1.02; }
  function updateCam(dt, t) {
    const p = avatar.group.position; const port = innerHeight > innerWidth;
    let dist; let el; let tgt; let az = az0 + Math.sin(t * 0.05) * 0.04;
    if (camGoal === 'title') { dist = 6.2; el = 0.22; tgt = V(p.x, 1.3, p.z); az = az0 - 0.15 + Math.sin(t * 0.2) * 0.05; }
    else if (camGoal === 'follow') { dist = overviewDist() * 0.62; el = 0.78; tgt = V(p.x * 0.6, 0, p.z * 0.6); }
    else if (camGoal === 'level') { dist = port ? 16 : 13; el = 0.62; tgt = V(p.x, 1.2, p.z); }
    else { dist = overviewDist(); el = 0.86; tgt = V(0, -0.6, 0.6); }
    camTgt.copy(tgt); camPos.set(tgt.x + Math.sin(az) * Math.cos(el) * dist, tgt.y + Math.sin(el) * dist, tgt.z + Math.cos(az) * Math.cos(el) * dist);
    const k = Math.min(1, dt * (camGoal === 'title' ? 6 : 2.2)); camera.position.lerp(camPos, k); curTgt.lerp(camTgt, k); camera.lookAt(curTgt);
    // keep the focus clear of the menu (right side on laptops, top on phones)
    const w = innerWidth; const h = innerHeight;
    if (camGoal === 'level' && !scr.hidden) { if (w > 860) camera.setViewOffset(w, h, Math.min(260, w * 0.2), 0, w, h); else camera.setViewOffset(w, h, 0, h * 0.27, w, h); }
    else if (camGoal === 'title') { if (w > 860 && w > h) camera.setViewOffset(w, h, -w * 0.17, 0, w, h); else camera.setViewOffset(w, h, 0, h * 0.18, w, h); }
    else if (camGoal === 'overview') camera.setViewOffset(w, h, 0, h * 0.045, w, h);
    else camera.clearViewOffset();
  }

  // ---------------- title → play ----------------
  async function startPlay() {
    if (mode !== 'title') return; mode = 'intro'; avatar.play('Wave'); playSfx?.('open');
    await sleep(reducedMotion ? 0 : 900); camGoal = 'overview'; await sleep(reducedMotion ? 0 : 1200);
    mode = 'play'; hud.hidden = false; dock.hidden = false; hudXP(); unlock('start'); onReady?.();
    toast?.('Tap a numbered level on the island, or use the bar below.', 5000);
  }

  // ---------------- loop ----------------
  const governor = new FpsGovernor({ threshold: tier.name === 'Lite' ? 22 : 40, onSlow: (fps) => { if (pr > 0.9) { pr = Math.max(0.8, pr - 0.3); resize(); governor.reset(); return; } onSlow?.(fps, tier); } });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onSlow?.(0, tier, 'context'); });
  const clock = new THREE.Clock(); let running = true; let last = 0; let idleT = 0; let sitting = false;
  function frame(now) {
    if (!running) return; requestAnimationFrame(frame);
    if (now - last < 1000 / tier.maxFps - 1) return; last = now;
    const dt = Math.min(clock.getDelta(), 0.1); const t = clock.elapsedTime; governor.tick(now);
    if (travel) {
      travel.t = Math.min(1, travel.t + dt / travel.dur); const k = ease(travel.t); tCur = travel.from + (travel.to - travel.from) * k; place(tCur);
      const tg = curve.getTangentAt(THREE.MathUtils.clamp(tCur, 0.001, 0.999)).multiplyScalar(Math.sign(travel.to - travel.from) || 1); avatar.group.rotation.y = Math.atan2(tg.x, tg.z);
      if (travel.t >= 1) { const id = travel.id; travel = null; arriveAt(id); }
      idleT = 0; if (sitting) sitting = false;
    } else if (mode === 'play' && scr.hidden) { idleT += dt; if (idleT > 14 && !sitting) { sitting = true; avatar.setBase('Sit'); } } else { idleT = 0; }
    if (sitting && (travel || !scr.hidden)) { sitting = false; avatar.setBase('Idle'); }
    // look at the pointer / camera
    avatar.lookAtScreen(ndc.x * 0.6, ndc.y * 0.4);
    updateCam(dt, t);
    chotu.group.position.y = I.fountainPos.y + 1.15 + Math.sin(t * 2) * 0.03;
    I.sky.position.copy(camera.position);
    avatar.update(dt, tier.avatarHz); chotu.update(dt, t);
    for (const u of I.update) u(t, dt);
    renderer.render(scene, camera);
    api.stats = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pr };
  }
  camera.position.set(0, 3, 12); requestAnimationFrame(frame);

  const api = {
    startPlay, goLevel, closeScreen, openScreen, unlock, addXP, talkChotu,
    gameWon: (won) => { if (won) { unlock('chess'); avatar.play('Victory'); } else avatar.play('Disappointed'); },
    focusGame() {}, endGame() {}, setGameClick() {},
    setTier: (name) => { tier = TIERS[name]; renderer.shadowMap.enabled = name === 'full'; renderer.shadowMap.needsUpdate = true; pr = name === 'lite' ? Math.min(dpr, 1.1) : Math.min(dpr, 1.75); resize(); scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); },
    setTheme() {}, pause: (v) => { running = !v; if (running) { clock.getDelta(); requestAnimationFrame(frame); } },
    avatar, chotu, scene, camera, renderer, get phase() { return mode; }, get level() { return openLevel; }, get fps() { return governor.fps; }, stats: null,
  };
  return api;
}
