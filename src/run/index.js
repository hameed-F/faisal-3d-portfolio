import * as THREE from 'three';
import { buildLevel, ZONES, LEVEL_END } from './level.js';
import { buildChotuBot } from './chotubot.js';
import { showCard, closeCard, cardOpen, cardFor, promoCard } from './cards.js';
import { loadAvatar } from '../stage/avatar.js';
import { psxUniforms } from '../stage/psx.js';
import { TIERS, FpsGovernor } from '../quality.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PW = 0.32; const PH = 1.7; // player half-width, height
const ACH = { start: ['Press Start', 'Started your run'], block: ['Head-butt!', 'Opened your first code block'], bug: ['On Time', 'Beat your first deadline'], bugs5: ['Crunch Survivor', 'Beat 5 deadlines'], commits: ['Committed', 'Collected 25 commits'], trophies: ['Trophy Hunter', 'Collected all certificates'], all: ['Completionist', 'Opened every code block'], ship: ['Shipped It!', 'Launched the rocket'], chotu: ['New Friend', 'Talked to Chotu'], invite: ['Party Up', 'Sent an invite'], chess: ['Checkmate!', 'Beat the chess AI'] };

export async function initRun({ canvas, tierName, onProgress, onSlow, onCert, onChotu, onContact, onPromo, onChess, onReady, toast, reducedMotion, playSfx }) {
  psxUniforms.uSnap.value = 0;
  let tier = TIERS[tierName];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier.name === 'Full', powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = tier.name === 'Full'; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.5, 400);
  const dpr = Math.min(devicePixelRatio || 1, 2); let pr = tier.name === 'Full' ? Math.min(dpr, 1.75) : Math.min(dpr, 1.1);
  const resize = () => { renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
  resize(); addEventListener('resize', resize);
  scene.add(new THREE.HemisphereLight('#ffffff', '#b6d98a', 1.9));
  const sun = new THREE.DirectionalLight('#fff4e0', 1.6); sun.position.set(-6, 14, 10);
  if (renderer.shadowMap.enabled) { sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const s = sun.shadow.camera; s.left = -16; s.right = 16; s.top = 12; s.bottom = -6; s.near = 1; s.far = 50; sun.shadow.bias = -0.0005; }
  scene.add(sun, sun.target);

  onProgress?.(0.15, 'BUILDING LEVEL');
  const LV = buildLevel(scene, tier);
  onProgress?.(0.35, 'LOADING PLAYER');
  const avatar = await loadAvatar('/models/avatar.glb', (f) => onProgress?.(0.35 + f * 0.55, 'LOADING PLAYER'));
  avatar.group.traverse((o) => { if (o.isMesh) o.castShadow = renderer.shadowMap.enabled; }); avatar.look.enabled = false; scene.add(avatar.group);
  if (avatar.actions.Sit) avatar.actions.Sit.setLoop(THREE.LoopRepeat);
  const bot = buildChotuBot(); scene.add(bot.group);
  onProgress?.(0.98, 'READY');

  // ---------------- state ----------------
  const P = { x: 6.5, y: 0, vx: 0, vy: 0, ground: true, face: 1, inv: 0, coyote: 0, jumpBuf: 0, jumping: false };
  let mode = 'title'; let score = 0; let commits = 0; let bugsFixed = 0; let time = 0; let shipped = false;
  const save = (() => { try { return JSON.parse(localStorage.getItem('runsave') || '{}'); } catch { return {}; } })(); save.ach = save.ach || [];
  const persist = () => { try { localStorage.setItem('runsave', JSON.stringify(save)); } catch { /* ignore */ } };

  // ---------------- HUD + touch controls ----------------
  const hud = document.createElement('div'); hud.className = 'rhud'; hud.hidden = true;
  hud.innerHTML = `<div><small>FAISAL</small><b id="hScore">000000</b></div><div><small>COMMITS</small><b id="hCommits">◆×00</b></div><div><small>ZONE</small><b id="hZone">ABOUT ME</b></div><div><small>TIME</small><b id="hTime">00:00</b></div>`;
  document.body.appendChild(hud);
  const pad = document.createElement('div'); pad.className = 'rpad'; pad.hidden = true;
  pad.innerHTML = '<div class="rp-l"><button data-k="left" aria-label="Left">◀</button><button data-k="right" aria-label="Right">▶</button></div><div class="rp-r"><button data-k="use" class="rp-use" aria-label="Use" hidden>USE</button><button data-k="jump" class="rp-a" aria-label="Jump">A</button></div>';
  document.body.appendChild(pad);
  const prompt = document.createElement('button'); prompt.className = 'rprompt'; prompt.hidden = true; document.body.appendChild(prompt);
  const achEl = document.createElement('div'); achEl.className = 'rach'; achEl.hidden = true; document.body.appendChild(achEl); const achQ = []; let achT = null;
  const pops = document.createElement('div'); pops.className = 'rpops'; document.body.appendChild(pops);
  function unlock(k) { if (save.ach.includes(k)) return; save.ach.push(k); persist(); achQ.push(ACH[k]); if (achQ.length === 1) nextAch(); }
  function nextAch() { const a = achQ[0]; if (!a) return; achEl.innerHTML = `<i>★</i><div><small>ACHIEVEMENT</small><b>${a[0]}</b><span>${a[1]}</span></div>`; achEl.hidden = false; achEl.classList.remove('out'); playSfx?.('ladder'); clearTimeout(achT); achT = setTimeout(() => { achEl.classList.add('out'); setTimeout(() => { achEl.hidden = true; achQ.shift(); nextAch(); }, 300); }, 2400); }
  function popText(txt, x, y, color = '#fff') { const v = V(x, y, 0).project(camera); const d = document.createElement('span'); d.textContent = txt; d.style.left = ((v.x + 1) / 2) * innerWidth + 'px'; d.style.top = ((1 - v.y) / 2) * innerHeight + 'px'; d.style.color = color; pops.appendChild(d); setTimeout(() => d.remove(), 900); }
  const pad6 = (n, w) => String(n).padStart(w, '0');
  function hudUpdate() { hud.querySelector('#hScore').textContent = pad6(score, 6); hud.querySelector('#hCommits').textContent = '◆×' + pad6(commits, 2); const m = Math.floor(time / 60); hud.querySelector('#hTime').textContent = `${pad6(m, 2)}:${pad6(Math.floor(time % 60), 2)}`; }

  // ---------------- input ----------------
  const keys = new Set(); const touch = { left: 0, right: 0, jump: 0 };
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input,textarea,select')) return; const k = e.key.toLowerCase(); if (mode !== 'play') return;
    if (['arrowleft', 'arrowright', 'arrowup', ' ', 'a', 'd', 'w'].includes(k)) e.preventDefault();
    if ((k === ' ' || k === 'arrowup' || k === 'w') && !keys.has(k)) P.jumpBuf = 0.12;
    if (k === 'e' || k === 'enter') use();
    keys.add(k);
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase())); addEventListener('blur', () => keys.clear());
  pad.querySelectorAll('[data-k]').forEach((b) => {
    const k = b.dataset.k; const on = (e) => { e.preventDefault(); if (k === 'use') { use(); return; } touch[k] = 1; if (k === 'jump') P.jumpBuf = 0.12; b.classList.add('on'); }; const off = () => { touch[k] = 0; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, off));
  });
  prompt.addEventListener('click', () => use());
  canvas.addEventListener('pointerup', (e) => { if (mode !== 'play') return; const r = canvas.getBoundingClientRect(); const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera); if (ray.intersectObject(bot.group, true).length) talkChotu(); });

  // ---------------- collision helpers ----------------
  const solidAt = (cx, cy) => LV.solid.get(`${cx},${cy}`);
  function collideX() {
    const y0 = Math.floor(P.y + 0.01); const y1 = Math.floor(P.y + PH - 0.01);
    if (P.vx > 0) { const cx = Math.floor(P.x + PW); for (let cy = y0; cy <= y1; cy++) if (solidAt(cx, cy)) { P.x = cx - PW - 0.001; P.vx = 0; return; } }
    else if (P.vx < 0) { const cx = Math.floor(P.x - PW); for (let cy = y0; cy <= y1; cy++) if (solidAt(cx, cy)) { P.x = cx + 1 + PW + 0.001; P.vx = 0; return; } }
  }
  function collideY() {
    const x0 = Math.floor(P.x - PW + 0.02); const x1 = Math.floor(P.x + PW - 0.02); P.ground = false;
    if (P.vy <= 0) { const cy = Math.floor(P.y); for (let cx = x0; cx <= x1; cx++) if (solidAt(cx, cy)) { P.y = cy + 1; P.vy = 0; P.ground = true; return; } }
    else { const cy = Math.floor(P.y + PH); let hit = null; let best = 9; for (let cx = x0; cx <= x1; cx++) { const s = solidAt(cx, cy); if (s) { const d = Math.abs(cx + 0.5 - P.x); if (d < best) { best = d; hit = s; } } } if (hit) { P.y = cy - PH - 0.001; P.vy = 0; bump(hit); } }
  }

  // ---------------- interactions ----------------
  const api = { onCert, onPromo };
  function bump(cell) {
    playSfx?.('click');
    if (cell.type !== 'code') return;
    const b = LV.blocks.find((x) => x.x === cell.x && x.y === cell.y); if (!b) return;
    b.bump = 1; const first = !b.used; b.used = true; b.mesh.material = new THREE.MeshLambertMaterial({ map: LV.T.used });
    if (first) { score += 200; popText('+200', b.x + 0.5, b.y + 1.6, '#ffe58a'); unlock('block'); if (LV.blocks.every((x) => x.used)) unlock('all'); }
    const c = cardFor(b.info, api); if (c) { showCard(c); avatar.play(b.info.kind === 'skill' ? 'Victory' : 'Point'); playSfx?.('open'); }
    hudUpdate();
  }
  let near = null;
  const PROPS = { arcade: 'Play chess vs my AI', mailbox: 'Send me an invite (contact)', tv: 'Watch the promo', rocket: 'Launch: SHIP IT!' };
  function use() {
    if (mode !== 'play' || !near) return; playSfx?.('click');
    if (near === 'arcade') { avatar.play('Think'); onChess?.(); }
    else if (near === 'mailbox') { avatar.play('Throw'); onContact?.(); }
    else if (near === 'tv') { avatar.play('Point'); showCard(promoCard(api)); }
    else if (near === 'rocket') shipIt();
  }
  function talkChotu() { bot.setMode('happy'); avatar.play('Talk'); onChotu?.(); unlock('chotu'); }
  let launch = null;
  function shipIt() {
    if (shipped) { onContact?.(); return; } shipped = true; mode = 'cutscene'; closeCard(); prompt.hidden = true;
    avatar.play('Victory'); playSfx?.('win'); unlock('ship'); score += 5000; hudUpdate();
    LV.live.flame.visible = true; launch = { t: 0 };
    setTimeout(() => { avatar.play('Dance'); finishScreen(); }, 2600);
  }
  const fin = document.createElement('div'); fin.className = 'rfin'; fin.hidden = true; document.body.appendChild(fin);
  function finishScreen() {
    const opened = LV.blocks.filter((b) => b.used).length; const tr = LV.trophies.filter((t) => t.got).length;
    fin.innerHTML = `<div class="rf-in"><h2>COURSE CLEAR!</h2><p class="rf-sub">Thanks for playing through my portfolio.</p>
      <dl><div><dt>SCORE</dt><dd>${pad6(score, 6)}</dd></div><div><dt>CODE BLOCKS</dt><dd>${opened}/${LV.blocks.length}</dd></div><div><dt>TROPHIES</dt><dd>${tr}/${LV.trophies.length}</dd></div><div><dt>DEADLINES BEATEN</dt><dd>${bugsFixed}</dd></div><div><dt>COMMITS</dt><dd>${commits}</dd></div><div><dt>TIME</dt><dd>${hud.querySelector('#hTime').textContent}</dd></div></dl>
      <div class="rf-acts"><button class="rbtn p" data-f="contact">✉ Send an invite</button><button class="rbtn" data-f="promo">▶ Promo</button><a class="rbtn" href="/Muhammad_Faisal_Hameed_Resume.pdf" download>⬇ CV</a><button class="rbtn" data-f="replay">↺ Play again</button></div></div>`;
    fin.hidden = false;
    fin.onclick = (e) => { const f = e.target.closest('[data-f]')?.dataset.f; if (!f) return; if (f === 'contact') { fin.hidden = true; onContact?.(); mode = 'play'; } if (f === 'promo') { fin.hidden = true; mode = 'play'; showCard(promoCard(api)); } if (f === 'replay') { fin.hidden = true; warp(0); mode = 'play'; } };
  }

  // stage select: warp to a zone (with a little pipe-free "poof")
  function warp(i) { const z = ZONES[i]; if (!z) return; if (mode === 'title') startPlay(); closeCard(); P.x = z.x + 2; P.y = 6; P.vx = 0; P.vy = 0; botPos.set(P.x - 1.2, P.y + 2, 0.6); playSfx?.('ladder'); popText('★', P.x, P.y + 1, '#ffe58a'); }

  // ---------------- title → play ----------------
  function startPlay() { if (mode !== 'title') return; mode = 'play'; hud.hidden = false; pad.hidden = false; onReady?.(); unlock('start'); avatar.play('Wave'); hudUpdate(); }

  // ---------------- frame ----------------
  const governor = new FpsGovernor({ threshold: tier.name === 'Lite' ? 22 : 40, onSlow: (fps) => { if (pr > 0.9) { pr = Math.max(0.8, pr - 0.3); resize(); governor.reset(); return; } onSlow?.(fps, tier); } });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onSlow?.(0, tier, 'context'); });
  const clock = new THREE.Clock(); let running = true; let last = 0; let idle = 0; let anim = 'Idle'; let zone = -1;
  const botPos = V(1.5, 2.4, 0.6); const camP = V(3, 4, 20); const camT = V(3, 3, 0);
  const setBase = (n) => { if (anim !== n) { anim = n; avatar.setBase(n); } };
  function jumpAnim() { const a = avatar.actions.Jump; if (!a) return; avatar.play('Jump'); a.time = 0.55; a.timeScale = 1.6; }

  function frame(now) {
    if (!running) return; requestAnimationFrame(frame);
    if (now - last < 1000 / tier.maxFps - 1) return; last = now;
    const dt = Math.min(clock.getDelta(), 0.05); const t = clock.elapsedTime; governor.tick(now);
    if (mode === 'play') {
      time += dt;
      const L = keys.has('arrowleft') || keys.has('a') || touch.left; const R = keys.has('arrowright') || keys.has('d') || touch.right;
      const jumpHeld = keys.has(' ') || keys.has('arrowup') || keys.has('w') || touch.jump;
      const run = keys.has('shift') ? 9.5 : 7; const acc = P.ground ? 40 : 26;
      if (L && !R) { P.vx = Math.max(-run, P.vx - acc * dt); P.face = -1; } else if (R && !L) { P.vx = Math.min(run, P.vx + acc * dt); P.face = 1; } else { const f = (P.ground ? 30 : 6) * dt; P.vx = Math.abs(P.vx) <= f ? 0 : P.vx - Math.sign(P.vx) * f; }
      P.coyote = P.ground ? 0.1 : P.coyote - dt; P.jumpBuf -= dt;
      if (P.jumpBuf > 0 && P.coyote > 0) { P.vy = 15.2; P.ground = false; P.coyote = 0; P.jumpBuf = 0; P.jumping = true; jumpAnim(); playSfx?.('tick'); }
      if (P.jumping && !jumpHeld && P.vy > 5) P.vy = 5; // short hop when the button is released early
      P.vy = Math.max(-26, P.vy - 40 * dt);
      P.x += P.vx * dt; collideX(); P.y += P.vy * dt; collideY(); if (P.ground) P.jumping = false;
      if (P.y < -6) { P.y = 6; P.vy = 0; }
      P.inv -= dt;
      // commits
      for (const c of LV.commits) if (!c.got && Math.abs(c.x - P.x) < 0.6 && c.y > P.y - 0.2 && c.y < P.y + PH + 0.2) { c.got = true; commits++; score += 50; playSfx?.('tick'); if (commits === 25) unlock('commits'); hudUpdate(); }
      // trophies
      for (const tr of LV.trophies) if (!tr.got && Math.abs(tr.x - P.x) < 0.7 && tr.y > P.y - 0.6 && tr.y < P.y + PH + 0.3) { tr.got = true; tr.mesh.visible = false; score += 500; popText('+500', tr.x, tr.y + 1, '#e3c7ff'); showCard(cardFor({ kind: 'cert', c: tr.c }, api)); avatar.play('Victory'); playSfx?.('win'); if (LV.trophies.every((x) => x.got)) unlock('trophies'); hudUpdate(); }
      // bugs
      for (const b of LV.bugs) {
        if (!b.alive) { if (b.squash > 0) { b.squash -= dt; b.mesh.scale.set(1.2, 0.25, 1.2); if (b.squash <= 0) b.mesh.visible = false; } continue; }
        b.x += b.dir * 1.4 * dt; if (b.x > b.x1) { b.x = b.x1; b.dir = -1; } if (b.x < b.x0) { b.x = b.x0; b.dir = 1; }
        b.mesh.position.set(b.x, b.y + Math.abs(Math.sin(t * 10)) * 0.06, 0.1); b.mesh.rotation.y = b.dir > 0 ? 0.35 : -0.35; b.mesh.rotation.z = Math.sin(t * 40) * (Math.abs(b.x - P.x) < 4 ? 0.12 : 0.03);
        if (Math.abs(b.x - P.x) < 0.65 && P.y < b.y + 0.7 && P.y + PH > b.y) {
          if (P.vy < -1 && P.y > b.y + 0.25) { b.alive = false; b.squash = 0.5; P.vy = 11; score += 100; bugsFixed++; popText('DEADLINE BEATEN +100', b.x, b.y + 1.2, '#7fe0c4'); playSfx?.('ladder'); unlock('bug'); if (bugsFixed === 5) unlock('bugs5'); hudUpdate(); }
          else if (P.inv <= 0) { P.inv = 1.4; P.vx = (P.x < b.x ? -1 : 1) * 9; P.vy = 7; avatar.play('Disappointed'); popText('RIIING! TOO LATE', P.x, P.y + 2.2, '#ff8a7a'); playSfx?.('lose'); }
        }
      }
      // animation state
      const moving = Math.abs(P.vx) > 0.4;
      if (P.ground) { if (moving) { setBase('Walk'); if (avatar.actions.Walk) avatar.actions.Walk.timeScale = 0.6 + Math.abs(P.vx) * 0.22; idle = 0; } else { idle += dt; if (idle > 18) setBase('Sit'); else if (idle > 9) setBase('Dance'); else setBase('Idle'); } }
      avatar.group.rotation.y += ((P.face > 0 ? Math.PI / 2 : -Math.PI / 2) - avatar.group.rotation.y) * Math.min(1, dt * 14);
      avatar.group.visible = P.inv <= 0 || Math.floor(t * 20) % 2 === 0;
      // nearest prop
      let n = null; for (const p of LV.props) if (Math.abs(p.x + 0.5 - P.x) < 1.6 && P.y < 2) n = p.type;
      if (n !== near) { near = n; prompt.hidden = !n; if (n) prompt.innerHTML = `<kbd>E</kbd> ${PROPS[n]}`; pad.querySelector('.rp-use').hidden = !n; }
      // zone name
      let zi = 0; ZONES.forEach((z, i) => { if (P.x >= z.x) zi = i; }); if (zi !== zone) { zone = zi; hud.querySelector('#hZone').textContent = ZONES[zi].name; hud.style.setProperty('--zc', ZONES[zi].color); }
    } else if (mode === 'cutscene' && launch) {
      launch.t += dt; const r = LV.live.rocketBody; if (launch.t > 0.8) { r.position.y = 0.4 + Math.pow(launch.t - 0.8, 2) * 3; r.rotation.y += dt * 2; } LV.live.flame.scale.setScalar(1 + Math.sin(t * 40) * 0.2);
    }
    avatar.group.position.set(P.x, P.y, 0);
    // blocks bump
    for (const b of LV.blocks) if (b.bump > 0) { b.bump = Math.max(0, b.bump - dt * 5); b.mesh.position.y = b.y + 0.5 + Math.sin(b.bump * Math.PI) * 0.3; }
    // Chotu-bot follows behind the player's head
    const want = V(P.x - P.face * 1.3, P.y + 2.3 + Math.sin(t * 2) * 0.15, 0.7); botPos.lerp(want, Math.min(1, dt * 3)); bot.group.position.copy(botPos); bot.group.rotation.y = -P.face * 0.35;
    // camera
    const port = innerHeight > innerWidth; const vis = port ? 11 : 21; const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect); const dist = (vis / 2) / Math.tan(hf / 2);
    if (mode === 'title') { camP.set(P.x + 1.6, P.y + 1.5, P.z || 4.6); camT.set(P.x + 0.4, P.y + 1.25, 0); camera.position.lerp(camP, Math.min(1, dt * 4)); camera.lookAt(camT); if (innerWidth > 860 && !port) camera.setViewOffset(innerWidth, innerHeight, -innerWidth * 0.18, 0, innerWidth, innerHeight); else camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.17, innerWidth, innerHeight); }
    else {
      if (camera.view) camera.clearViewOffset();
      const lookAhead = P.face * (port ? 1.2 : 3.5); const tx = THREE.MathUtils.clamp(P.x + lookAhead, vis / 2 - 1, LEVEL_END - vis / 2 + 1);
      const ty = Math.max(port ? 4.6 : 4.4, P.y + 2.4);
      camT.lerp(V(tx, ty, 0), Math.min(1, dt * 5)); camera.position.set(camT.x, camT.y + 1.2, dist); camera.lookAt(camT.x, camT.y, 0);
    }
    if (renderer.shadowMap.enabled) { sun.position.set(P.x - 6, 14, 10); sun.target.position.set(P.x, 0, 0); }
    avatar.update(dt, tier.avatarHz); bot.update(dt, t);
    for (const u of LV.update) u(t, dt);
    renderer.render(scene, camera);
    api.stats = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pr };
    if (mode === 'play' && Math.floor(t * 4) !== Math.floor((t - dt) * 4)) hudUpdate();
  }
  camera.position.set(4.6, 1.5, 4.6); requestAnimationFrame(frame);

  Object.assign(api, {
    startPlay, warp, talkChotu, unlock,
    gameWon: (won) => { if (won) { unlock('chess'); avatar.play('Victory'); score += 1000; hudUpdate(); } else avatar.play('Disappointed'); },
    focusGame() {}, endGame() {}, setGameClick() {},
    setTier: (name) => { tier = TIERS[name]; pr = name === 'lite' ? Math.min(dpr, 1.1) : Math.min(dpr, 1.75); resize(); },
    pause: (v) => { running = !v; if (running) { clock.getDelta(); requestAnimationFrame(frame); } },
    avatar, scene, camera, renderer, get phase() { return mode; }, get player() { return P; }, get fps() { return governor.fps; }, chotu: { setMode: (m) => bot.setMode(m === 'listening' ? 'happy' : m === 'thinking' ? 'thinking' : 'idle') },
    debug: { LV },
  });
  return api;
}
