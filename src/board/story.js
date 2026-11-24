// The story: trips between the glowing tiles, the section screens, and game mode.
import * as THREE from 'three';
import { T, tileXZ, tilesBetween, rollsFor, SECTIONS, JUMPS, LADDERS } from './layout.js';
import { ladderEnds, snakeCurve } from './world.js';
import { html, bind, SECTION_TITLES } from '../panels.js';
import { SNAKES } from './layout.js';

const $ = (s, r = document) => r.querySelector(s);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tileV = (n, y = 0) => { const [x, z] = tileXZ(n); return V(x, y, z); };
const yawOf = (dx, dz) => Math.atan2(dx, dz);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createStory({ world, toast, onSection }) {
  const av = world.avatar; const P = av.group.position; const cam = world.camera;
  const S = { cur: 1, visited: new Set(), busy: false, screen: null, mode: 'explore', camMode: 'far', free: false, bot: null, theme: 'light' };
  const scr = $('#scr'); const cta = $('#cta'); const nextBtn = $('#nextBtn'); const skipBtn = $('#skipBtn'); const hint = $('#hint');
  const portrait = () => world.size.a < 0.85;
  const setHint = (t, ms = 0) => { hint.textContent = t || ''; hint.hidden = !t; clearTimeout(setHint._t); if (ms) setHint._t = setTimeout(() => { hint.hidden = true; }, ms); };

  // ---------- movement helpers ----------
  const setY = (y) => { P.y = y; };
  function faceCamera() { world.face(yawOf(cam.position.x - P.x, cam.position.z - P.z)); }
  function pathLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]); return L; }
  /** Move along a polyline at `speed` units/s. opts: restart = [clip, every, clipSpeed] to re-trigger a one-shot clip, y = (k)=>extra height, face = false to keep facing */
  function moveAlong(pts, speed, opts = {}) {
    const L = pathLen(pts); if (L < 0.01) return Promise.resolve();
    const dur = L / speed; let nextRestart = 0;
    return world.tween(dur, (k) => {
      const d = k * L; let acc = 0; let i = 1;
      for (; i < pts.length - 1; i++) { const sl = pts[i].distanceTo(pts[i - 1]); if (acc + sl >= d) break; acc += sl; }
      const a = pts[i - 1]; const b = pts[i]; const sl = Math.max(0.0001, b.distanceTo(a)); const f = Math.min(1, (d - acc) / sl);
      P.set(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f + (opts.y ? opts.y(k) : 0), a.z + (b.z - a.z) * f);
      if (opts.face !== false) world.face(yawOf(b.x - a.x, b.z - a.z));
      if (opts.restart && k * dur >= nextRestart && k < 1) { av.play(opts.restart[0], { fade: .05, speed: opts.restart[2] }); nextRestart += opts.restart[1]; }
    }, 'lin');
  }
  const splitFromEnd = (pts, dist) => { // returns [first, last] polylines, last being `dist` long (or whole path if shorter)
    const L = pathLen(pts); if (L <= dist) return [[pts[0].clone()], pts];
    let acc = 0; const target = L - dist;
    for (let i = 1; i < pts.length; i++) { const sl = pts[i].distanceTo(pts[i - 1]); if (acc + sl >= target) { const f = (target - acc) / sl; const m = pts[i - 1].clone().lerp(pts[i], f); return [[...pts.slice(0, i), m], [m, ...pts.slice(i)]]; } acc += sl; }
    return [pts, [pts[pts.length - 1]]];
  };
  const tilePts = (tiles) => tiles.map((n) => tileV(n));

  // ---------- camera ----------
  const halfW = () => (portrait() ? 4.6 : 7.2);
  world.onFrame(() => {
    if (S.camMode === 'follow') world.setCam(followPose(), { tau: .8 });
    world.showLabels(!S.screen);
    if (S.screen === 'bubble') placeDots();
  });
  function followPose() { if (portrait()) return world.fit(V(P.x * .85, 0, P.z + .6), halfW(), 60); const c = V(P.x * .8, 0, Math.min(P.z, 4.2) * .85); return world.fit(c, halfW(), 54); }
  function farCam(tau = 1.4) { S.camMode = 'far'; world.setCam(world.boardFit(), { tau }); }
  function startCam(tau = 1.6) { // first shot: whole board on laptop; the lower rows (with Faisal) on phones
    S.camMode = 'far';
    world.setCam(portrait() ? world.fit(V(-3.4, 0, 5.0), 4.9, 60) : world.fit(V(-1.0, 0, 2.6), 8.6, 50, 38, 7.0), { tau });
  }
  function closeCam({ dist = 4.2, h = 1.5, lookY = 1.0, fov = 34, side = true, tau = 1.1 } = {}) {
    S.camMode = 'close'; faceCamera();
    const pos = V(P.x, P.y + h, P.z + dist); const look = V(P.x, P.y + lookY, P.z);
    const por = portrait();
    world.setCam({ pos, look, fov: por ? fov + 10 : fov }, { tau, sx: side && !por ? 0.2 : 0, sy: por && side ? 0.22 : 0 });
  }

  // ---------- section screens ----------
  const KIND = { about: 'side', contact: 'side', edu: 'bubble', skills: 'bubble', projects: 'holo', video: 'card' };
  function mount(kind, id, extra = '') {
    scr.className = `scr k-${kind}`; scr.dataset.id = id; scr.hidden = false;
    const body = html[id]();
    scr.innerHTML = kind === 'bubble'
      ? `<div class="bubble" role="dialog" aria-label="${SECTION_TITLES[id]}" tabindex="-1"><div class="panel-bar"><button class="btn ghost small" data-read type="button">🔊 Read aloud</button><button class="close" data-close type="button" aria-label="Close">×</button></div><div class="panel-body">${body}</div></div><i class="dot d1"></i><i class="dot d2"></i><i class="dot d3"></i>`
      : `<div class="scrim"></div><div class="panel" role="dialog" aria-label="${SECTION_TITLES[id]}" tabindex="-1"><div class="panel-bar"><button class="btn ghost small" data-read type="button">🔊 Read aloud</button><button class="close" data-close type="button" aria-label="Close">×</button></div><div class="panel-body">${body}${extra}</div></div>`;
    S.screen = kind; document.body.dataset.screen = kind; if (document.getElementById('chat').hidden) world.D.hide = 1;
    bind(scr, id, { onSent: () => { if (id === 'contact') { av.play('Victory', { fade: .2 }); setTimeout(() => av.play('Talk', { fade: .4 }), 2400); } } });
    world.setActive(true);
    requestAnimationFrame(() => { scr.classList.add('in'); (scr.querySelector('[role=dialog]'))?.focus({ preventScroll: true }); });
  }
  function placeDots() {
    const bub = $('.bubble', scr); if (!bub) return; const r = bub.getBoundingClientRect(); const h = av.head; if (!h) return;
    const hp = new THREE.Vector3(); h.getWorldPosition(hp); hp.y += 0.28; hp.project(cam);
    const hx = (hp.x * .5 + .5) * innerWidth; const hy = (-hp.y * .5 + .5) * innerHeight;
    const por = portrait(); const tx = por ? r.left + r.width / 2 : r.left; const ty = por ? r.top : r.top + Math.min(r.height / 2, innerHeight * .5);
    [[.18, 11], [.42, 17], [.7, 26]].forEach(([f, s], i) => { const d = $('.d' + (i + 1), scr); if (!d) return; d.style.width = d.style.height = s + 'px'; d.style.left = (hx + (tx - hx) * f - s / 2) + 'px'; d.style.top = (hy + (ty - hy) * f - s / 2) + 'px'; });
  }
  function closeScreen() {
    scr.classList.remove('in'); const was = S.screen; S.screen = null; delete document.body.dataset.screen; world.D.hide = 0; scr.hidden = true; scr.innerHTML = ''; world.holo.visible = false;
    return was;
  }

  const SEC = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
  async function openSection(id) {
    const s = SEC[id]; S.visited.add(id); S.cur = s.tile; S.current = id; hideCta(); setHint('');
    onSection?.(id);
    if (id === 'about') { closeCam(); av.play('Wave', { fade: .3, loop: true }); mount('side', id); }
    else if (id === 'contact') { closeCam(); av.play('Talk', { fade: .3 }); mount('side', id); }
    else if (id === 'edu') { closeCam({ dist: 2.7, h: 1.55, lookY: 1.4, fov: 32 }); av.play('Think', { fade: .3 }); mount('bubble', id); }
    else if (id === 'skills') { closeCam({ dist: 5.6, h: 1.9, lookY: 1.0, fov: 34 }); av.play('Dance', { fade: .3 }); mount('bubble', id); }
    else if (id === 'projects') {
      closeCam({ dist: 5.6, h: 2.4, lookY: .9, fov: 36 }); world.holo.position.copy(P).setY(0); world.holo.position.x += 0; world.holo.visible = true; world.holo.scale.setScalar(.01);
      av.play('Point', { fade: .2 }); setTimeout(() => av.play('Idle', { fade: .5 }), 1500); world.tween(.7, (k) => world.holo.scale.setScalar(.01 + k * .99), 'out'); mount('holo', id);
    } else if (id === 'video') { closeCam({ dist: 4.6, h: 1.7, lookY: .9, fov: 34 }); av.play('Sit', { fade: .4 }); mount('card', id); }
    else if (id === 'play') { openFinish(); }
  }
  function openFinish() {
    P.y = 2.2; closeCam({ dist: 6.2, h: 3.2, lookY: .2, fov: 38 }); av.play('Fly', { fade: .3 });
    scr.className = 'scr k-card finish'; scr.hidden = false; S.screen = 'card'; document.body.dataset.screen = 'card';
    scr.innerHTML = `<div class="scrim"></div><div class="panel" role="dialog" aria-label="Congratulations" tabindex="-1"><div class="panel-body"><h2>Congratulations!</h2><p class="lead">You know me now. You made it to tile 100.</p><p>Want to play a round of Snakes &amp; Ladders against my dice companion, <b id="pn"></b>? It rolls for real this time.</p><div class="row"><button class="btn big" data-game="yes" type="button">Yes, let's play</button><button class="btn alt big" data-game="no" type="button">No, keep exploring</button></div></div></div>`;
    $('#pn').textContent = document.getElementById('botName').textContent;
    requestAnimationFrame(() => { scr.classList.add('in'); $('[role=dialog]', scr)?.focus({ preventScroll: true }); });
  }
  async function closeSection() {
    const was = closeScreen(); if (!was) return;
    av.play('Idle', { fade: .5 }); if (S.current === 'edu' || true) { /* keep position */ }
    if (P.y > 0.01 && S.current !== 'play') world.tween(.5, (k) => setY(P.y * (1 - k)), 'io');
    if (S.current === 'play') { S.free = true; }
    S.camMode = 'follow'; world.setCam(followPose(), { tau: 1.1, sx: 0, sy: 0 });
    showNext();
  }

  // ---------- call to action ----------
  function nextTarget() {
    const i = SECTIONS.findIndex((s) => s.id === S.current);
    const order = [...SECTIONS.slice(i + 1), ...SECTIONS.slice(0, Math.max(0, i))].filter((s) => !S.visited.has(s.id) && s.id !== 'play');
    return order[0] || (!S.visited.has('play') ? SEC.play : null);
  }
  function showNext() {
    const n = nextTarget(); cta.hidden = false; skipBtn.hidden = true; nextBtn.hidden = false;
    if (n) { nextBtn.textContent = `Next: ${n.next} →`; nextBtn.dataset.id = n.id; setHint('Or tap any glowing tile'); }
    else { nextBtn.textContent = 'Play a round of Snakes & Ladders'; nextBtn.dataset.id = 'game'; setHint('You have seen every tile. Tap any glowing tile to revisit it.'); }
  }
  function hideCta() { cta.hidden = true; }

  // ---------- trips ----------
  async function showRolls(steps) {
    for (const n of rollsFor(steps)) { setHint(`${document.getElementById('botName').textContent} rolls…`); await world.rollDice(n); setHint(`Rolled a ${n}!`); await world.wait(.35); }
    setHint('');
  }
  async function travel(id) {
    if (S.busy) return; const s = SEC[id]; if (!s) return;
    if (S.cur === s.tile && S.current === id) { openSection(id); return; }
    S.busy = true; hideCta(); closeScreen(); skipBtn.hidden = false; cta.hidden = false; nextBtn.hidden = true; world.W.skip = false; world.holo.visible = false;
    S.camMode = 'follow'; world.setCam(followPose(), { tau: .9, sx: 0, sy: 0 });
    const from = S.cur; const startY = P.y;
    if (P.y > .05) await world.tween(.4, (k) => setY(startY * (1 - k)), 'io');
    try {
      if (s.motion === 'roll') { const tiles = tilesBetween(from, s.tile); await showRolls(tiles.length - 1); const pts = tilePts(tiles); const dur = pathLen(pts) / 3.6; av.play('Roll', { fade: .1, speed: 1.2 / Math.min(1.4, dur) }); await moveAlong(pts, 3.6, { restart: ['Roll', 1.35, 1.2 / 1.35] }); }
      else if (s.motion === 'walk') { const tiles = tilesBetween(from, s.tile); await showRolls(tiles.length - 1); av.play('Walk', { fade: .25, speed: 1.9 }); await moveAlong(tilePts(tiles), 2.7); }
      else if (s.motion === 'jump') { const tiles = tilesBetween(from, s.tile); await showRolls(tiles.length - 1); await hops(tilePts(tiles)); }
      else if (s.motion === 'slide') { const tiles = tilesBetween(from, s.tile); await showRolls(tiles.length - 1); const pts = tilePts(tiles); const [runPts, slidePts] = splitFromEnd(pts, 3.4); if (runPts.length > 1) { av.play('Run', { fade: .2, speed: 1.2 }); await moveAlong(runPts, 5); } const d = av.duration('Slide', 1); av.play('Slide', { fade: .1, speed: 1 }); await world.tween(d, (k) => { const q = 1 - Math.pow(1 - k, 2); const L = pathLen(slidePts); const e = L * q; let acc = 0; for (let i = 1; i < slidePts.length; i++) { const sl = slidePts[i].distanceTo(slidePts[i - 1]); if (acc + sl >= e || i === slidePts.length - 1) { const f = Math.min(1, (e - acc) / Math.max(.0001, sl)); P.copy(slidePts[i - 1]).lerp(slidePts[i], f); world.face(yawOf(slidePts[i].x - slidePts[i - 1].x, slidePts[i].z - slidePts[i - 1].z)); break; } acc += sl; } }, 'lin'); }
      else if (s.motion === 'climb') { await climbTo(from, s); }
      else if (s.motion === 'snake') { await snakeTo(from, s); }
      else if (s.motion === 'fly') { await flyTo(s); }
    } finally { world.W.skip = false; S.busy = false; skipBtn.hidden = true; }
    P.copy(tileV(s.tile, s.motion === 'fly' ? 2.2 : 0)); S.cur = s.tile; S.current = id;
    if (s.motion === 'snake') av.play('Sit', { fade: .3 });
    await openSection(id);
  }
  async function hops(pts) {
    const hopDur = Math.max(.55, av.duration('Jump', 2.6));
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]; const b = pts[i]; av.play('Jump', { fade: .08, speed: 2.6 }); world.face(yawOf(b.x - a.x, b.z - a.z));
      await world.tween(hopDur, (k) => { P.set(a.x + (b.x - a.x) * k, Math.sin(k * Math.PI) * .75, a.z + (b.z - a.z) * k); }, 'lin');
    }
    P.y = 0;
  }
  async function climbTo(from, s) {
    const lad = LADDERS.find(([a, b]) => a === s.via && b === s.tile); const { foot, top } = ladderEnds(lad[0], lad[1]);
    const tiles = tilesBetween(from, s.via); await showRolls(tiles.length - 1);
    const pts = tilePts(tiles); pts.push(foot.clone().setY(0));
    av.play('Walk', { fade: .25, speed: 1.9 }); await moveAlong(pts, 2.7);
    const dir = top.clone().sub(foot); world.face(yawOf(dir.x, dir.z)); av.play('Climb', { fade: .25, speed: 1.1 });
    await world.tween(2.8, (k) => { P.copy(foot).lerp(top, k); P.y = foot.y + (top.y - foot.y) * k - .15; P.x -= dir.x / dir.length() * .15; P.z -= dir.z / dir.length() * .15; }, 'lin');
    const end = tileV(s.tile); av.play('Jump', { fade: .1, speed: 1.8 });
    await world.tween(.6, (k) => { P.set(top.x + (end.x - top.x) * k, Math.max(0, top.y * (1 - k * k) + Math.sin(k * Math.PI) * .4), top.z + (end.z - top.z) * k); }, 'out');
    P.copy(end);
  }
  async function snakeTo(from, s) {
    const sn = SNAKES.find(([a, b]) => a === s.via && b === s.tile); const curve = snakeCurve(sn[0], sn[1], SNAKES.indexOf(sn) * 1.7);
    const tiles = tilesBetween(from, s.via); await showRolls(tiles.length - 1);
    const pts = tilePts(tiles); const head = curve.getPointAt(0).setY(0); pts[pts.length - 1] = head;
    av.play('Run', { fade: .25, speed: 1.2 }); await moveAlong(pts, 5);
    // the snake knocks him over
    const dir = curve.getTangentAt(0); const fd = av.duration('Fall'); av.play('Fall', { fade: .08 }); 
    setHint('Ouch! The snake got him…', 2200);
    await world.wait(Math.max(1.2, fd * .85));
    const pose = P.clone(); av.play('Slide', { fade: .2, speed: .8 }); world.face(yawOf(dir.x, dir.z) + 0);
    await world.tween(2.6, (k) => { const p = curve.getPointAt(Math.min(1, k)); const t = curve.getTangentAt(Math.min(.999, k)); P.set(p.x, p.y + .18, p.z); P.x += (pose.x - head.x) * (1 - k); P.z += (pose.z - head.z) * (1 - k); world.face(yawOf(t.x, t.z)); }, 'io');
    const end = tileV(s.tile); await world.tween(.4, (k) => { P.x += (end.x - P.x) * k; P.z += (end.z - P.z) * k; P.y *= 1 - k; }, 'out');
  }
  async function flyTo(s) {
    const a = P.clone(); const b = tileV(s.tile, 2.2); av.play('Fly', { fade: .3 });
    const d = new THREE.Vector3(b.x - a.x, 0, b.z - a.z); await showRolls(Math.max(1, Math.round(d.length() / T)));
    world.face(yawOf(d.x, d.z));
    await world.tween(Math.max(2.2, d.length() / 4.2), (k) => { P.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k + Math.sin(Math.min(1, k * 1.0) * Math.PI) * 2.2 + 1.2 * Math.sin(k * Math.PI) , a.z + (b.z - a.z) * k); }, 'io');
  }

  // ---------- start ----------
  function intro() {
    P.copy(tileV(1)); world.faceSnap(0); av.play('Idle', { fade: 0 }); startCam(0.01);
    world.dice.position.copy(P).add(V(1.2, 1.8, -.3)); S.cur = 1;
    // after the loader is gone: the camera is already in place; Faisal turns to the camera and waves
    setTimeout(() => { world.face(yawOf(cam.position.x - P.x, cam.position.z - P.z)); av.play('Wave', { fade: .3 }); }, 500);
    setTimeout(() => { av.play('Idle', { fade: .6 }); }, 500 + av.duration('Wave') * 1000 + 100);
    cta.hidden = false; skipBtn.hidden = true; nextBtn.hidden = false; nextBtn.textContent = 'Start the tour: About me →'; nextBtn.dataset.id = 'about';
    setHint('Or tap any glowing tile on the board');
  }

  // ---------- game mode ----------
  const G = { on: false, me: 1, bot: 1, turn: 'me', over: false, pawn: null };
  function makePawn() {
    if (G.pawn) return G.pawn; const g = new THREE.Group(); const m = new THREE.MeshLambertMaterial({ color: 0xc2503e });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.18, .32, .8, 16), m); body.position.y = .4; const head = new THREE.Mesh(new THREE.SphereGeometry(.26, 16, 12), m); head.position.y = .98; const base = new THREE.Mesh(new THREE.CylinderGeometry(.38, .4, .1, 16), m); base.position.y = .05;
    g.add(body, head, base); world.scene.add(g); G.pawn = g; return g;
  }
  const slotOffset = (who) => (who === 'me' ? V(-.35, 0, .2) : V(.35, 0, -.2));
  const posFor = (who, n) => tileV(n).add(slotOffset(who));
  function gamePanel(html2, actions = '') { scr.className = 'scr k-game'; scr.hidden = false; S.screen = 'game'; scr.innerHTML = `<div class="gbar" role="region" aria-label="Game">${html2}${actions}</div>`; scr.classList.add('in'); }
  async function startGame() {
    closeScreen(); hideCta(); setHint(''); G.on = true; G.over = false; G.me = 1; G.bot = 1; G.turn = 'me'; S.mode = 'game'; S.busy = true;
    S.camMode = 'far'; world.setCam(world.boardFit(), { tau: 1.2, sx: 0, sy: 0 });
    const pawn = makePawn(); pawn.visible = true;
    // back to tile 1
    av.play('Fly', { fade: .3 }); const a = P.clone(); const b = posFor('me', 1); await world.tween(2.2, (k) => { P.set(a.x + (b.x - a.x) * k, a.y * (1 - k) + Math.sin(k * Math.PI) * 1.2, a.z + (b.z - a.z) * k); }, 'io'); P.copy(b); av.play('Idle', { fade: .3 });
    pawn.position.copy(posFor('bot', 1)); world.faceSnap(yawOf(0, -1)); S.busy = false; myTurn();
  }
  function status() { return `<div class="gstat"><span>You: tile <b>${G.me}</b></span><span>${document.getElementById('botName').textContent}: tile <b>${G.bot}</b></span></div>`; }
  function myTurn() { gamePanel(status(), '<div class="row"><button class="btn big" data-roll type="button">🎲 Roll the dice</button><button class="btn ghost" data-quit type="button">Quit</button></div>'); }
  async function stepsTo(who, n) { // walk tile by tile, then ladder/snake
    const tok = who === 'me' ? { p: P, y0: 0 } : { p: G.pawn.position };
    const from = who === 'me' ? G.me : G.bot; const to = Math.min(100, from + n); const tiles = tilesBetween(from, to);
    const pts = tiles.map((t) => posFor(who, t)); if (who === 'me') { av.play('Walk', { fade: .2, speed: 2.2 }); await moveAlong(pts, 4.2); av.play('Idle', { fade: .3 }); } else await moveBot(pts);
    let at = to;
    if (JUMPS[to] && to < 100) {
      const dest = JUMPS[to]; const isLadder = dest > to; setHint(isLadder ? 'A ladder! Up we go.' : 'A snake! Down we slide.', 1800);
      if (who === 'me') {
        if (isLadder) { const { foot, top } = ladderEnds(to, dest); av.play('Walk', { fade: .2, speed: 2 }); await moveAlong([P.clone(), foot.clone().setY(0)], 3); world.face(yawOf(top.x - foot.x, top.z - foot.z)); av.play('Climb', { fade: .2, speed: 1.1 }); await world.tween(2.2, (k) => { P.copy(foot).lerp(top, k); P.y = foot.y + (top.y - foot.y) * k - .15; }, 'lin'); const end = posFor('me', dest); av.play('Jump', { fade: .1, speed: 1.8 }); await world.tween(.6, (k) => { P.set(top.x + (end.x - top.x) * k, Math.max(0, top.y * (1 - k * k) + Math.sin(k * Math.PI) * .4), top.z + (end.z - top.z) * k); }, 'out'); P.copy(end); av.play('Idle', { fade: .3 }); }
        else { const c = snakeCurve(to, dest, SNAKES.findIndex(([a]) => a === to) * 1.7); av.play('Fall', { fade: .1 }); await world.wait(1.0); av.play('Slide', { fade: .2, speed: .8 }); await world.tween(2.2, (k) => { const p = c.getPointAt(Math.min(1, k)); const t = c.getTangentAt(Math.min(.999, k)); P.set(p.x, p.y + .18, p.z); world.face(yawOf(t.x, t.z)); }, 'io'); const end = posFor('me', dest); await world.tween(.4, (k) => { P.x += (end.x - P.x) * k; P.z += (end.z - P.z) * k; P.y *= 1 - k; }, 'out'); av.play('Idle', { fade: .3 }); }
      } else { const c = isLadder ? null : snakeCurve(to, dest, SNAKES.findIndex(([a]) => a === to) * 1.7); const end = posFor('bot', dest); const a0 = G.pawn.position.clone(); await world.tween(1.6, (k) => { if (c) { const p = c.getPointAt(k); G.pawn.position.set(p.x, .2, p.z); } else { G.pawn.position.set(a0.x + (end.x - a0.x) * k, Math.sin(k * Math.PI) * 1.6, a0.z + (end.z - a0.z) * k); } }, 'io'); G.pawn.position.copy(end); }
      at = dest;
    }
    if (who === 'me') G.me = at; else G.bot = at;
  }
  async function moveBot(pts) { const L = pathLen(pts); const pawn = G.pawn; await world.tween(Math.max(.5, L / 4.2), (k) => { const d = k * L; let acc = 0; for (let i = 1; i < pts.length; i++) { const sl = pts[i].distanceTo(pts[i - 1]); if (acc + sl >= d || i === pts.length - 1) { const f = Math.min(1, (d - acc) / Math.max(.0001, sl)); pawn.position.copy(pts[i - 1]).lerp(pts[i], f); pawn.position.y = Math.abs(Math.sin(k * L / T * Math.PI)) * .35; break; } acc += sl; } }, 'lin'); }
  async function roll(who) {
    if (S.busy || G.over) return; S.busy = true;
    const n = 1 + Math.floor(Math.random() * 6);
    if (who === 'me') { gamePanel(status()); av.play('Throw', { fade: .15 }); await world.wait(.55); }
    world.D.mood = 'idle'; await world.rollDice(n);
    setHint(`${who === 'me' ? 'You' : document.getElementById('botName').textContent} rolled a ${n}`, 1800);
    await stepsTo(who, n);
    gamePanel(status());
    if ((who === 'me' ? G.me : G.bot) >= 100) { await finish(who); return; }
    S.busy = false;
    if (who === 'me') { G.turn = 'bot'; await world.wait(.5); await roll('bot'); } else { G.turn = 'me'; myTurn(); }
  }
  async function finish(winner) {
    G.over = true; S.busy = false; const name = document.getElementById('botName').textContent;
    if (winner === 'me') { av.play('Victory', { fade: .2 }); setTimeout(() => av.play('Dance', { fade: .4 }), 2600); } else av.play('Disappointed', { fade: .2 });
    scr.className = 'scr k-card finish game-over'; scr.innerHTML = `<div class="scrim"></div><div class="panel" role="dialog" aria-label="Game over" tabindex="-1"><div class="panel-body"><h2>${winner === 'me' ? 'You won!' : name + ' won!'}</h2><p>${winner === 'me' ? 'Faisal does a victory dance. Nicely rolled.' : 'Faisal is a little disappointed, but there is always a rematch.'}</p><div class="row"><button class="btn big" data-game="yes" type="button">Play again</button><button class="btn alt big" data-quit type="button">Back to exploring</button></div></div></div>`;
    requestAnimationFrame(() => scr.classList.add('in'));
  }
  async function quitGame() {
    G.on = false; S.mode = 'explore'; if (G.pawn) G.pawn.visible = false; closeScreen(); S.busy = true; setHint('');
    const a = P.clone(); const b = tileV(100, 2.2); av.play('Fly', { fade: .3 }); S.camMode = 'follow'; await world.tween(2.2, (k) => { P.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * 1.5, a.z + (b.z - a.z) * k); }, 'io'); S.busy = false; S.cur = 100; S.current = 'play'; S.free = true; showNext();
  }

  // ---------- input ----------
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { closeSection(); return; }
    const g = e.target.closest('[data-game]'); if (g) { if (g.dataset.game === 'yes') startGame(); else closeSection(); return; }
    if (e.target.closest('[data-roll]')) { roll('me'); return; }
    if (e.target.closest('[data-quit]')) { quitGame(); }
  });
  nextBtn.addEventListener('click', () => { const id = nextBtn.dataset.id; if (id === 'game') startGame(); else travel(id); });
  skipBtn.addEventListener('click', () => { world.W.skip = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.screen && S.screen !== 'game') { if (!$('#lightbox').hidden || !$('#chat').hidden || !$('#menu').hidden) return; closeSection(); } });

  return {
    S, intro, travel, closeSection, startGame, startCam, farCam,
    go(id) { if (id === 'credits') return false; if (S.mode === 'game' || S.busy) return false; if (S.screen) closeScreen(); travel(id); return true; },
    resize() { if (S.camMode === 'far' && !S.busy) { if (S.cur === 1 && !S.visited.size) startCam(1); else farCam(1); } },
  };
}
