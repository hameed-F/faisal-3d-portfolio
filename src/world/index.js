import * as THREE from 'three';
import { buildScene, ZONES } from './scene.js';
import { createPlayer } from './player.js';
import { createCar } from './car.js';
import { loadAvatar } from '../stage/avatar.js';
import { buildChotu } from '../stage/chotu.js';
import { psxUniforms } from '../stage/psx.js';
import { TIERS, FpsGovernor } from '../quality.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export async function initWorld({ canvas, tierName, onProgress, onSection, onCert, onProject, onAbout, onChotu, onSlow, onPlayStart, reducedMotion }) {
  psxUniforms.uSnap.value = 0; // the PS1 wobble is gone in the new look
  let tier = TIERS[tierName];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier.name === 'Full', powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = tier.name === 'Full'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 320);

  // dynamic resolution: start sharp, lower the pixel ratio a little if frames get slow (never blurry by design)
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let pr = tier.name === 'Full' ? Math.min(dpr, 1.5) : Math.min(dpr, 1);
  const minPr = tier.name === 'Full' ? 0.85 : 0.7;
  function resize() { renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  resize(); addEventListener('resize', resize);

  onProgress?.(0.15, 'Planting the forest…');
  const w = buildScene(scene, tier);
  onProgress?.(0.35, 'Waking up the avatar…');
  const avatar = await loadAvatar('/models/avatar.glb', (f) => onProgress?.(0.35 + f * 0.55, 'Waking up the avatar…'));
  avatar.group.traverse((o) => { if (o.isMesh) o.castShadow = tier.name === 'Full'; });
  avatar.look.enabled = false; scene.add(avatar.group);
  const chotu = buildChotu(); chotu.group.scale.setScalar(2.4); scene.add(chotu.group);
  onProgress?.(0.95, 'Lighting the campfire…');

  const carCollider = { x: w.car.position.x, z: w.car.position.z, r: 1.7 }; w.colliders.push(carCollider);
  const player = createPlayer({ avatar, camera, colliders: w.colliders, dom: canvas });
  const car = createCar({ car: w.car, wheels: w.carWheels, headlight: w.headlight, camera, colliders: w.colliders, onSpeed: (v) => api.onSpeed?.(v) });

  // ---------------- interaction prompt ----------------
  const prompt = document.createElement('button'); prompt.className = 'act-prompt'; prompt.hidden = true; document.body.appendChild(prompt);
  const help = document.createElement('div'); help.className = 'ctrl-help'; help.hidden = true;
  help.innerHTML = '<span><b>WASD</b> move</span><span><b>Shift</b> run</span><span><b>Drag</b> look</span><span><b>E</b> interact</span>';
  document.body.appendChild(help);
  let near = null;
  const PROMPTS = { zone: (i) => `Enter ${i.label.split(' · ')[0]}`, car: () => (car.st.active ? 'Get out of the car' : 'Drive the car'), project: (i) => `Open ${i.label}`, cert: (i) => `View ${i.label}`, about: () => 'Read this', promo: () => 'Watch the promo', chotu: () => 'Talk to Chotu' };
  function interact() {
    if (state.mode === 'car') { exitCar(); return; }
    if (!near) return; const i = near;
    if (i.kind === 'car') enterCar();
    else if (i.kind === 'zone') onSection?.(i.id === 'contact' ? 'contact' : i.id, { fromWorld: true });
    else if (i.kind === 'project') onProject?.(i.id);
    else if (i.kind === 'cert') onCert?.(i.id);
    else if (i.kind === 'about') onAbout?.(i.id);
    else if (i.kind === 'promo') onSection?.('promo', { fromWorld: true });
    else if (i.kind === 'chotu') onChotu?.();
    api.sfx?.('click');
  }
  prompt.addEventListener('click', interact);
  addEventListener('keydown', (e) => { if (e.target.closest?.('input,textarea,select')) return; if ((e.key === 'e' || e.key === 'E') && (state.mode === 'walk' || state.mode === 'car')) interact(); });

  // ---------------- modes ----------------
  const state = { mode: 'title', section: 'home' };
  function enterCar() { state.mode = 'car'; player.enable(false); avatar.group.visible = false; carCollider.r = 0; car.enter(); api.sfx?.('open'); }
  function exitCar() { const p = car.exit(); state.mode = 'walk'; avatar.group.visible = true; carCollider.r = 1.7; player.teleport(p, w.car.rotation.y); player.enable(true); }

  // title: slow orbit around the plaza, avatar idling by the fire
  player.teleport(V(-0.6, 0, 0.8), Math.PI * 0.85);
  function startPlay() {
    if (state.mode !== 'title') return;
    state.mode = 'walk'; player.faceCameraBehind(); player.enable(true); help.hidden = false; setTimeout(() => { help.hidden = true; }, 9000);
    avatar.play('Wave'); onPlayStart?.();
  }
  function teleportTo(id) {
    const z = ZONES[id]; if (!z) return;
    if (state.mode === 'car') exitCar();
    if (state.mode === 'title') { state.mode = 'walk'; player.enable(true); onPlayStart?.(); }
    const dir = z.pad.clone().normalize(); const spot = z.pad.clone().addScaledVector(dir, -2.2);
    player.teleport(spot, Math.atan2(dir.x, dir.z));
    api.sfx?.('ladder');
  }

  // games: the board view takes over the camera
  let gameCam = null; let gameClick = null;
  function focusGame(key) {
    state.mode = 'game'; player.enable(false); prompt.hidden = true;
    const b = w.boards[key]; const c = b.group.position;
    const port = innerHeight > innerWidth;
    if (key === 'journey') gameCam = { pos: c.clone().add(V(0, port ? 30 : 22, port ? 14 : 15)), tgt: c.clone().add(V(0, 0, 1)), follow: true };
    else gameCam = { pos: c.clone().add(V(0, port ? 24 : 17, port ? 11 : 12)), tgt: c.clone().add(V(0, 0, 0.8)) };
    camFrom = { pos: camera.position.clone(), q: camera.quaternion.clone(), t: 0 };
  }
  let camFrom = null; const followTgt = V(0, 0, 0);
  function endGame() { gameClick = null; gameCam = null; api.gameFollow = null; state.mode = 'walk'; player.enable(true); }

  // ---------------- input for games ----------------
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); let downAt = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return;
    const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    if (state.mode === 'game' && gameClick) { for (const b of Object.values(w.boards)) { if (!b.face) continue; const hit = ray.intersectObject(b.face, false)[0]; if (hit) { gameClick({ board: b, local: b.group.worldToLocal(hit.point.clone()) }); break; } } return; }
    if (state.mode === 'walk' && ray.intersectObject(chotu.group, true).length) onChotu?.();
  });

  // ---------------- per-frame ----------------
  const governor = new FpsGovernor({ threshold: tier.name === 'Lite' ? 22 : 40, onSlow: (fps) => {
    if (pr > minPr + 0.01) { pr = Math.max(minPr, pr - 0.25); resize(); governor.reset(); return; } // first: a little less resolution
    onSlow?.(fps, tier);
  } });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onSlow?.(0, tier, 'context'); });
  const clock = new THREE.Clock(); let running = true; let last = 0; const chotuPos = V(1.2, 0, 2.2); const tmp = V(0, 0, 0);
  function frame(now) {
    if (!running) return; requestAnimationFrame(frame);
    if (now - last < 1000 / tier.maxFps - 1) return; last = now;
    const dt = Math.min(clock.getDelta(), 0.1); const t = clock.elapsedTime;
    governor.tick(now);
    if (state.mode === 'title') {
      const a = t * 0.05 + 0.6; camera.position.set(Math.sin(a) * 13, 4.4 + Math.sin(t * 0.2) * 0.3, Math.cos(a) * 13); camera.lookAt(0, 1.1, 0);
      const port = innerHeight > innerWidth; if (!port && innerWidth > 760) camera.setViewOffset(innerWidth, innerHeight, -innerWidth * 0.18, 0, innerWidth, innerHeight); else camera.clearViewOffset();
    } else {
      if (camera.view) camera.clearViewOffset();
      if (state.mode === 'walk') player.update(dt);
      else if (state.mode === 'car') car.update(dt);
      else if (state.mode === 'game' && gameCam) {
        camFrom.t = Math.min(1, camFrom.t + dt / (reducedMotion ? 0.01 : 1.0)); const k = 1 - Math.pow(1 - camFrom.t, 3);
        if (gameCam.follow && api.gameFollow && camFrom.t >= 1) { // follow the token whose turn it is
          const f = api.gameFollow.position; const port = innerHeight > innerWidth; const want = V(f.x, f.y + (port ? 13 : 9.5), f.z + (port ? 9 : 9)); camera.position.lerp(want, Math.min(1, dt * 2.5)); followTgt.lerp(f, Math.min(1, dt * 3)); camera.lookAt(followTgt);
        } else { camera.position.lerpVectors(camFrom.pos, gameCam.pos, k); camera.lookAt(gameCam.tgt); const q2 = camera.quaternion.clone(); camera.quaternion.copy(camFrom.q).slerp(q2, k); if (camFrom.t >= 1) followTgt.copy(gameCam.tgt); }
      }
    }
    // Chotu follows the player at a little distance, slithering
    if (state.mode !== 'game' || !api.chotuBusy) {
      const target = state.mode === 'car' ? w.car.position : avatar.group.position;
      tmp.copy(target).add(V(Math.sin(avatar.group.rotation.y + 2.2) * 1.6, 0, Math.cos(avatar.group.rotation.y + 2.2) * 1.6));
      const d = tmp.distanceTo(chotuPos); if (d > 0.6) { chotuPos.lerp(tmp, Math.min(1, dt * (d > 6 ? 4 : 1.6))); }
      chotu.group.position.set(chotuPos.x, 0.05, chotuPos.z); const look = target.clone().sub(chotuPos); chotu.group.rotation.y = Math.atan2(-look.z, look.x);
    }
    carCollider.x = w.car.position.x; carCollider.z = w.car.position.z;
    // nearest interactable
    if (state.mode === 'walk' || state.mode === 'car') {
      let best = null; let bd = 1e9; const p = state.mode === 'car' ? w.car.position : avatar.group.position;
      if (state.mode === 'walk') { for (const i of w.interactables) { const dd = Math.hypot(i.pos.x - p.x, i.pos.z - p.z); if (dd < i.radius && dd < bd) { bd = dd; best = i; } } const dc = Math.hypot(chotuPos.x - p.x, chotuPos.z - p.z); if (!best && dc < 2.2) best = { kind: 'chotu', label: 'Chotu' }; }
      const key = state.mode === 'car' ? 'car-exit' : best ? best.kind + best.id : null;
      if (key !== prompt.dataset.key) {
        prompt.dataset.key = key || ''; near = best;
        if (state.mode === 'car') { prompt.hidden = false; prompt.innerHTML = '<kbd>E</kbd> Get out of the car'; }
        else if (best) { prompt.hidden = false; prompt.innerHTML = `<kbd>E</kbd> ${PROMPTS[best.kind](best)}`; }
        else prompt.hidden = true;
      }
    } else if (!prompt.hidden) { prompt.hidden = true; prompt.dataset.key = ''; }
    // keep the sun's shadow box around the player
    if (renderer.shadowMap.enabled) { const p = avatar.group.position; w.sun.position.set(p.x - 30, 26, p.z + 22); w.sun.target.position.set(p.x, 0, p.z); }
    avatar.update(dt, tier.avatarHz); chotu.update(dt, t);
    for (const u of w.update) u(t, dt, camera);
    renderer.render(scene, camera);
    api.stats = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pr };
  }
  requestAnimationFrame(frame);

  const api = {
    startPlay, teleportTo, focusGame, endGame, setGameClick: (f) => { gameClick = f; },
    focusSection: (id, opts = {}) => { state.section = id; if (!opts.fromWorld && ZONES[id] && state.mode !== 'game') teleportTo(id); if (state.mode === 'walk') player.enable(false); },
    closePanel: () => { state.section = 'home'; if (state.mode === 'walk' || (state.mode !== 'title' && state.mode !== 'car' && state.mode !== 'game')) player.enable(true); },
    skipIntro: () => startPlay(),
    setTier: (name) => { tier = TIERS[name]; w.setDensity?.(name === 'lite' ? 0.4 : 1); pr = name === 'lite' ? Math.min(dpr, 1) : Math.min(dpr, 1.5); resize(); governor.threshold = name === 'lite' ? 22 : 40; governor.reset(); },
    setTheme: (t) => w.setTheme(t),
    pause: (v) => { running = !v; if (running) { clock.getDelta(); requestAnimationFrame(frame); } },
    avatar, chotu, world: w, scene, camera, renderer, player, boards: w.boards,
    get phase() { return state.mode; }, get fps() { return governor.fps; }, info: () => renderer.info, sfx: null, onSpeed: null, stats: null,
  };
  return api;
}
