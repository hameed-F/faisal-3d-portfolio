import * as THREE from 'three';
import { projects } from '../content.js';

// THE FAISAL SESSIONS: a beat-up cargo ship seen from the side (cutaway), seven rooms on one corridor.
// Everything is built from primitives + small canvas textures; flat 60s/70s colours.
export const ROOMS = [
  { id: 'hangar', x: -21, w: 8, wall: '#2f6f73', name: 'Hangar', what: 'journey', n: '07', title: 'The Flight Log' },
  { id: 'screen', x: -13.5, w: 7, wall: '#3b3346', name: 'Screening Room', what: 'trailer', n: '06', title: 'Coming Attractions' },
  { id: 'bunks', x: -7, w: 6, wall: '#6b7a3a', name: 'Bunk Room', what: 'certificates', n: '05', title: 'Medals on the Wall' },
  { id: 'arcade', x: -1, w: 6, wall: '#b23a2e', name: 'Arcade', what: 'skills game', n: '04', title: 'Skill Swipe' },
  { id: 'lounge', x: 5.5, w: 7, wall: '#d9a23a', name: 'Lounge', what: 'projects', n: '03', title: 'The Bounty Board' },
  { id: 'comms', x: 12, w: 6, wall: '#c8562b', name: 'Radio Room', what: 'contact', n: '02', title: 'Calling All Ships' },
  { id: 'cockpit', x: 19, w: 8, wall: '#24323d', name: 'Cockpit', what: 'about me', n: '01', title: 'Meet the Pilot' },
];
export const MIN_X = -24.2; export const MAX_X = 22.4;
const H = 4.2; // ceiling height
const BACK = -2.6; // back wall z

export function canvasTex(w, h, draw, nearest = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (nearest) { t.magFilter = THREE.NearestFilter; } return t;
}
const DISPLAY = '"Bebas Neue", "Arial Narrow", Impact, sans-serif';

export function buildShip(scene, tier) {
  const hi = tier.name === 'Full'; const update = []; const anchors = {};
  const M = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
  const E = (color) => new THREE.MeshBasicMaterial({ color });
  const add = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight('#ffe6c4', '#3a2a24', 1.45); scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff0dc', 1.1); key.position.set(6, 10, 14); scene.add(key);
  const fill = new THREE.DirectionalLight('#7fb2c9', 0.35); fill.position.set(-10, 4, -8); scene.add(fill);

  // ---------- space outside ----------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { a: { value: new THREE.Color('#0b0e1c') }, b: { value: new THREE.Color('#22163a') } }, vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }', fragmentShader: 'uniform vec3 a; uniform vec3 b; varying vec3 p; void main(){ float t = smoothstep(-0.4, 0.8, p.y + p.x * 0.3); gl_FragColor = vec4(mix(b, a, t), 1.0); }' }));
  sky.frustumCulled = false; scene.add(sky);
  const starG = new THREE.BufferGeometry(); const NS = hi ? 1800 : 700; const sp = new Float32Array(NS * 3);
  for (let i = 0; i < NS; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(250); if (v.z > 0) v.z *= -1; sp.set([v.x, v.y, v.z], i * 3); }
  starG.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(starG, new THREE.PointsMaterial({ color: '#fff4dc', size: hi ? 1.6 : 2, sizeAttenuation: false })); scene.add(stars);
  const planetTex = canvasTex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); ['#e8a85a', '#c8562b', '#e9c27a', '#9c4a2a', '#e8a85a', '#b86a3a', '#f0d29a'].forEach((c, i, a) => gr.addColorStop(i / (a.length - 1), c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.globalAlpha = 0.25; for (let i = 0; i < 40; i++) { g.fillStyle = Math.random() < 0.5 ? '#fff' : '#5a2a1a'; g.fillRect(0, Math.random() * h, w, 1 + Math.random() * 3); } });
  const planet = add(new THREE.SphereGeometry(55, 40, 24), new THREE.MeshLambertMaterial({ map: planetTex }), -70, -30, -190); planet.rotation.z = 0.35;
  const ring = add(new THREE.RingGeometry(70, 95, 64), new THREE.MeshBasicMaterial({ color: '#e9c98a', transparent: true, opacity: 0.35, side: THREE.DoubleSide }), -70, -30, -190); ring.rotation.x = 1.25; ring.rotation.y = 0.3;
  const moon = add(new THREE.SphereGeometry(9, 20, 12), M('#b9b2a4'), 80, 40, -170);
  const rocks = []; const rockM = M('#6a5e54');
  for (let i = 0; i < (hi ? 14 : 6); i++) { const r = add(new THREE.IcosahedronGeometry(0.8 + Math.random() * 2.2, 0), rockM, (Math.random() - 0.5) * 160, (Math.random() - 0.5) * 50, -30 - Math.random() * 60); r.userData.v = 1 + Math.random() * 2.5; rocks.push(r); }
  update.push((t, dt) => { planet.rotation.y += dt * 0.01; rocks.forEach((r) => { r.position.x += r.userData.v * dt; r.rotation.x += dt * 0.3; r.rotation.y += dt * 0.2; if (r.position.x > 90) r.position.x = -90; }); });

  // ---------- hull ----------
  const hullM = M('#2b3a42'); const hullDark = M('#1b252b'); const trim = M('#e2b04a');
  const plate = canvasTex(128, 32, (g, w, h) => { g.fillStyle = '#3d3632'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2a2522'; g.lineWidth = 2; for (let x = 0; x < w; x += 32) g.strokeRect(x + 1, 1, 30, h - 2); g.fillStyle = '#4d4540'; for (let x = 6; x < w; x += 32) { g.fillRect(x, 6, 3, 3); g.fillRect(x + 18, h - 9, 3, 3); } });
  plate.wrapS = plate.wrapT = THREE.RepeatWrapping; plate.repeat.set(12, 1);
  const len = MAX_X - MIN_X + 1.2; const cx = (MAX_X + MIN_X) / 2;
  box(len, 0.35, 4.2, M('#ffffff', { map: plate }), cx, -0.175, -0.5); // floor
  box(len, 0.25, 4.4, hullDark, cx, H + 0.12, -0.5); // ceiling
  box(len + 0.6, 0.18, 0.2, trim, cx, -0.3, 1.62); // gold stripe on the cut edge
  box(len + 0.6, 1.2, 4.6, hullM, cx, -0.95, -0.5); // belly
  box(len + 0.6, 1.0, 4.6, hullM, cx, H + 0.75, -0.5); // roof
  box(len + 0.6, 0.12, 0.2, trim, cx, H + 0.3, 1.62);
  // roof hump with antenna & dish
  box(10, 1.1, 3, hullM, 4, H + 1.8, -0.8); const dish = add(new THREE.SphereGeometry(0.9, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M('#c9c2b0', { side: THREE.DoubleSide }), 7, H + 2.5, -0.8); dish.rotation.x = Math.PI * 0.75;
  box(0.08, 2.4, 0.08, hullDark, 1, H + 3.2, -0.8); const blink = add(new THREE.SphereGeometry(0.12, 8, 6), E('#ff5a3a'), 1, H + 4.45, -0.8);
  update.push((t) => { blink.visible = Math.sin(t * 3) > 0; dish.rotation.z = Math.sin(t * 0.4) * 0.4; });
  // stern engines
  [1.2, 3.2].forEach((y) => { const e = add(new THREE.CylinderGeometry(1.0, 1.25, 3, 14), hullM, MIN_X - 2.2, y, -0.6); e.rotation.z = Math.PI / 2; const glow = add(new THREE.CircleGeometry(0.95, 16), E('#7fd6e8'), MIN_X - 3.75, y, -0.6); glow.rotation.y = -Math.PI / 2; update.push((t) => { glow.scale.setScalar(0.9 + Math.sin(t * 20 + y) * 0.05); }); });
  box(1.2, H + 2.4, 4.6, hullM, MIN_X - 0.6, H / 2, -0.5); // stern wall
  // cockpit nose: tapered prism with a big windshield (the wall is open so you see space ahead)
  const noseShape = new THREE.Shape(); noseShape.moveTo(0, -1.15); noseShape.lineTo(4.2, 0.4); noseShape.lineTo(4.6, 1.6); noseShape.lineTo(3.2, H + 0.4); noseShape.lineTo(0, H + 1.25); noseShape.lineTo(0, -1.15);
  noseShape.holes.push(Object.assign(new THREE.Path(), {}).moveTo(0.5, 1.2).lineTo(3.0, 1.0).lineTo(3.9, 1.9).lineTo(2.8, H - 0.1).lineTo(0.5, H - 0.3).lineTo(0.5, 1.2));
  [-2.85, 1.55].forEach((z) => { const n = add(new THREE.ShapeGeometry(noseShape), new THREE.MeshLambertMaterial({ color: '#2b3a42', side: THREE.DoubleSide }), MAX_X + 0.6, 0, z); });
  box(0.4, 0.15, 4.4, hullDark, MAX_X + 4.2, 0.4, -0.65);

  // ---------- rooms ----------
  const winDisc = new THREE.CircleGeometry(0.62, 20);
  for (const r of ROOMS) {
    // back wall with portholes cut out (stars visible through them)
    const s = new THREE.Shape(); const hw = r.w / 2; s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, H); s.lineTo(-hw, H); s.lineTo(-hw, 0);
    const holes = r.id === 'cockpit' ? [] : r.id === 'hangar' ? [[-2.6, 3], [2.6, 3]] : r.w >= 7 ? [[-2.2, 2.9], [2.2, 2.9]] : [[0, 3.05]];
    if (r.id === 'cockpit') { const p = new THREE.Path(); p.moveTo(-1.4, 1.4); p.lineTo(3.2, 1.4); p.lineTo(3.2, 3.6); p.lineTo(-1.4, 3.6); p.lineTo(-1.4, 1.4); s.holes.push(p); }
    holes.forEach(([x, y]) => { const p = new THREE.Path(); p.absarc(x, y, 0.62, 0, Math.PI * 2, true); s.holes.push(p); });
    const wall = add(new THREE.ShapeGeometry(s, 16), M(r.wall), r.x, 0, BACK);
    holes.forEach(([x, y]) => { const rim = add(new THREE.RingGeometry(0.62, 0.78, 20), M('#c9c2b0'), r.x + x, y, BACK + 0.02); });
    box(r.w, 0.12, 0.08, M('#1b1b1b'), r.x, 1.1, BACK + 0.04); // dado rail
    box(r.w, 0.06, 0.08, trim, r.x, H - 0.25, BACK + 0.04);
    anchors[r.id] = new THREE.Vector3(r.x, 0, 0);
    void wall; void winDisc;
  }
  // bulkheads between rooms (open in front so the corridor is continuous)
  for (let i = 0; i < ROOMS.length - 1; i++) { const a = ROOMS[i]; const x = a.x + a.w / 2; box(0.3, H, 1.5, hullDark, x, H / 2, BACK + 0.75); box(0.3, 0.9, 4.2, hullDark, x, H - 0.45, -0.5); box(0.32, 0.12, 4.2, trim, x, H - 0.95, -0.5); }

  // ---------- props per room ----------
  const T = (txt, w, h, bg, fg, size, font = DISPLAY) => canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = `${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 2); });
  const sign = (txt, x, y, z, w = 2.4, bg = '#14110e', fg = '#efe2c4') => { const m = add(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: T(txt, 256, 64, bg, fg, 44) }), x, y, z); return m; };

  // HANGAR: little fighter + crates + striped door
  { const g = new THREE.Group(); g.position.set(-21, 1.0, -0.9); g.rotation.y = 0.25; scene.add(g);
    const red = M('#c23b2b'); const body = add(new THREE.CylinderGeometry(0.45, 0.6, 3.4, 10), red, 0, 0.2, 0, g); body.rotation.z = Math.PI / 2;
    const nose = add(new THREE.ConeGeometry(0.45, 1.3, 10), red, 2.35, 0.2, 0, g); nose.rotation.z = -Math.PI / 2;
    const canopy = add(new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#8fd3e6', emissive: '#1a3a44' }), 0.8, 0.55, 0, g); void canopy;
    box(1.4, 0.08, 3.6, M('#e2b04a'), -0.3, 0.1, 0, g); box(0.9, 0.9, 0.08, red, -1.6, 0.7, 0, g);
    [-1, 1].forEach((s) => { const lg = add(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6), hullDark, 0.4, -0.45, s * 0.9, g); void lg; });
    const exh = add(new THREE.CircleGeometry(0.4, 12), E('#ffb35c'), -1.71, 0.2, 0, g); exh.rotation.y = -Math.PI / 2;
    update.push((t) => { g.position.y = 1.0 + Math.sin(t * 1.2) * 0.04; });
    [[-24.6, 0.45], [-23.4, 0.45], [-24, 1.35]].forEach(([x, y], i) => box(0.9, 0.9, 0.9, M(i === 2 ? '#c8562b' : '#8a6a3a'), x + 1.2, y, -1.6));
    const stripes = canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#e2b04a'; c.fillRect(0, 0, w, h); c.fillStyle = '#14110e'; for (let i = -64; i < 64; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 8, 0); c.lineTo(i + 8 + 64, 64); c.lineTo(i + 64, 64); c.fill(); } });
    stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping; stripes.repeat.set(4, 0.4);
    add(new THREE.PlaneGeometry(0.4, H - 0.2), new THREE.MeshBasicMaterial({ map: stripes }), MIN_X + 0.05, H / 2, -1.2).rotation.y = Math.PI / 2;
    sign('FLIGHT LOG', -21, 3.85, BACK + 0.05, 2.2, '#e2b04a', '#14110e'); }
  // SCREENING ROOM: projector + screen showing a title card
  const screenTex = T('TRAILER · SOON', 512, 256, '#efe2c4', '#24323d', 96);
  { add(new THREE.PlaneGeometry(4.4, 2.2), new THREE.MeshBasicMaterial({ map: screenTex }), -13.5, 2.5, BACK + 0.06); box(4.7, 0.12, 0.1, hullDark, -13.5, 3.65, BACK + 0.08);
    const pj = new THREE.Group(); pj.position.set(-12, 1.1, 0.6); scene.add(pj); box(0.6, 0.4, 0.5, M('#24323d'), 0, 0, 0, pj); [-0.15, 0.2].forEach((x) => { const rl = add(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12), trim, x, 0.38, 0, pj); rl.rotation.x = Math.PI / 2; update.push((t, dt) => { rl.rotation.y += dt * 3; }); });
    box(0.08, 1.1, 0.08, hullDark, 0, -0.6, 0, pj);

    [-15.2, -14.2].forEach((x) => { box(0.8, 0.45, 0.7, M('#b23a2e'), x, 0.45, -1.4); box(0.8, 0.8, 0.15, M('#b23a2e'), x, 0.95, -1.75); }); }
  // BUNK ROOM: bunk bed + framed certificates
  const certFrames = [];
  { [0.55, 2.0].forEach((y) => { box(2.4, 0.3, 1.0, M('#8a6a3a'), -8.4, y, -2.0); box(2.2, 0.18, 0.9, M('#efe2c4'), -8.4, y + 0.22, -2.0); });
    box(0.1, 2.6, 0.1, M('#5a4028'), -9.55, 1.3, -1.55); box(0.1, 2.6, 0.1, M('#5a4028'), -7.25, 1.3, -1.55);
    const loader = new THREE.TextureLoader(); const thumbs = ['/img/certs/thumb/google-ai-professional.webp', '/img/certs/thumb/cega-unreal-100hrs-a.webp', '/img/certs/thumb/kda-it-internship.webp'];
    thumbs.forEach((u, i) => { const x = -6.6 + (i % 2) * 1.3; const y = 2.0 + Math.floor(i / 2) * 1.05 - (i === 2 ? 0 : 0); const px = i === 2 ? -5.95 : x; const py = i === 2 ? 1.6 : 2.75; box(1.1, 0.85, 0.06, trim, px, py, BACK + 0.05); const t = loader.load(u); t.colorSpace = THREE.SRGBColorSpace; const pic = add(new THREE.PlaneGeometry(0.95, 0.7), new THREE.MeshBasicMaterial({ map: t }), px, py, BACK + 0.09); certFrames.push(pic); void y; });
    sign('MEDALS', -7, 3.85, BACK + 0.05, 1.8, '#6b7a3a', '#efe2c4'); }
  // ARCADE: cabinet with a glowing screen
  const cabScreen = canvasTex(128, 96, () => {}); const cabCanvas = cabScreen.image; const cg = cabCanvas.getContext('2d');
  { const cab = new THREE.Group(); cab.position.set(-1, 0, -1.7); scene.add(cab); box(1.1, 2.1, 0.9, M('#24323d'), 0, 1.05, 0, cab); box(1.12, 0.35, 0.92, M('#e2b04a'), 0, 2.2, 0, cab);
    const scr = add(new THREE.PlaneGeometry(0.85, 0.65), new THREE.MeshBasicMaterial({ map: cabScreen }), 0, 1.55, 0.46, cab); scr.rotation.x = -0.15;
    box(1.0, 0.12, 0.35, M('#b23a2e'), 0, 1.05, 0.55, cab); add(new THREE.SphereGeometry(0.07, 8, 6), E('#ffd23a'), -0.25, 1.15, 0.6, cab); add(new THREE.SphereGeometry(0.06, 8, 6), E('#7fd6e8'), 0.15, 1.13, 0.62, cab); add(new THREE.SphereGeometry(0.06, 8, 6), E('#ff5a3a'), 0.3, 1.13, 0.62, cab);
    const marquee = add(new THREE.PlaneGeometry(1.0, 0.28), new THREE.MeshBasicMaterial({ map: T('SKILL SWIPE', 256, 72, '#14110e', '#e2b04a', 52) }), 0, 2.2, 0.47, cab); void marquee;
    [0.9, -2.8].forEach((x) => { box(0.08, 0.75, 0.08, hullDark, x, 0.38, -0.4); const seat = add(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 12), M('#b23a2e'), x, 0.8, -0.4); void seat; });
    let ph = 0; update.push((t, dt) => { ph += dt; if (ph < 0.12) return; ph = 0; cg.fillStyle = '#0b0e1c'; cg.fillRect(0, 0, 128, 96); for (let i = 0; i < 5; i++) { const a = t * 1.5 + i * 1.3; cg.strokeStyle = ['#e2b04a', '#7fd6e8', '#ff5a3a'][i % 3]; cg.lineWidth = 3; cg.beginPath(); cg.arc(64 + Math.cos(a) * 36, 50 + Math.sin(a * 1.3) * 26, 9, 0, 7); cg.stroke(); } cg.fillStyle = '#efe2c4'; cg.font = '14px monospace'; cg.fillText('INSERT COIN', 22, 90); cabScreen.needsUpdate = true; }); }
  // LOUNGE: couch, coffee table, plant, big CRT showing WANTED posters
  const posterImgs = projects.filter((p) => p.image).map((p) => p.image); const loader2 = new THREE.TextureLoader();
  const posterTex = posterImgs.map((u) => { const t = loader2.load(u); t.colorSpace = THREE.SRGBColorSpace; return t; });
  { box(3.2, 0.5, 1.0, M('#d9a23a'), 5.0, 0.45, -1.9); box(3.2, 0.9, 0.3, M('#c08a2a'), 5.0, 0.9, -2.35); [3.3, 6.7].forEach((x) => box(0.3, 0.75, 1.0, M('#c08a2a'), x, 0.55, -1.9));
    box(1.4, 0.08, 0.7, M('#5a4028'), 5.0, 0.5, -0.6); box(0.1, 0.45, 0.1, M('#5a4028'), 4.5, 0.25, -0.6); box(0.1, 0.45, 0.1, M('#5a4028'), 5.5, 0.25, -0.6);
    const mug = add(new THREE.CylinderGeometry(0.08, 0.07, 0.14, 8), M('#efe2c4'), 5.2, 0.62, -0.55); void mug;
    // bonsai
    box(0.6, 0.25, 0.4, M('#3a2a24'), 8.3, 0.55, -2.1); box(0.5, 0.4, 0.5, M('#24323d'), 8.3, 0.2, -2.1); const tree = add(new THREE.IcosahedronGeometry(0.42, 0), M('#4a6a3a'), 8.15, 1.15, -2.1); tree.scale.set(1.4, 0.7, 1); add(new THREE.CylinderGeometry(0.04, 0.06, 0.5, 5), M('#5a4028'), 8.3, 0.85, -2.1).rotation.z = 0.4;
    // CRT
    const tv = new THREE.Group(); tv.position.set(4.6, 2.75, BACK + 0.45); scene.add(tv); box(2.6, 1.9, 0.8, M('#5a4028'), 0, 0, 0, tv); box(2.2, 1.55, 0.05, M('#14110e'), 0, 0, 0.41, tv);
    const crt = add(new THREE.PlaneGeometry(1.15, 1.45), new THREE.MeshBasicMaterial({ map: posterTex[0] }), -0.35, 0, 0.44, tv);
    const wanted = add(new THREE.PlaneGeometry(0.9, 1.45), new THREE.MeshBasicMaterial({ map: canvasTex(128, 200, (g, w, h) => { g.fillStyle = '#efe2c4'; g.fillRect(0, 0, w, h); g.fillStyle = '#14110e'; g.font = `44px ${DISPLAY}`; g.textAlign = 'center'; g.fillText('WANTED', w / 2, 46); g.fillRect(12, 56, w - 24, 3); g.font = `22px ${DISPLAY}`; g.fillText('12 PROJECTS', w / 2, 92); g.fillText('ON THE', w / 2, 118); g.fillText('BOUNTY BOARD', w / 2, 144); g.fillStyle = '#b23a2e'; g.font = `26px ${DISPLAY}`; g.fillText('TAP TO VIEW', w / 2, 184); }) }), 0.62, 0, 0.44, tv); void wanted;
    [-0.6, 0.6].forEach((x) => { const leg = add(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 4), hullDark, x * 0.6, 1.25, 0, tv); leg.rotation.z = x; }); // rabbit ears
    let k = 0; let acc = 0; update.push((t, dt) => { acc += dt; if (acc > 2.6 && posterTex.length) { acc = 0; k = (k + 1) % posterTex.length; crt.material.map = posterTex[k]; } });
    sign('THE BOUNTY BOARD', 5.5, 3.95, BACK + 0.05, 2.6, '#14110e', '#e2b04a'); }
  // RADIO ROOM: console with dials, mic, blinking lights
  const radioLeds = [];
  { box(3.4, 1.0, 0.9, M('#5a4028'), 12, 0.5, -1.9); box(3.4, 1.2, 0.3, M('#24323d'), 12, 1.6, -2.3);
    for (let i = 0; i < 6; i++) { const d = add(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 12), M('#efe2c4'), 10.7 + i * 0.5, 1.8, -2.12); d.rotation.x = Math.PI / 2; update.push((t) => { d.rotation.z = Math.sin(t * 0.7 + i) * 1.5; }); }
    for (let i = 0; i < 10; i++) { const l = add(new THREE.CircleGeometry(0.05, 8), E('#7fd6e8'), 10.6 + i * 0.3, 1.3, -2.14); radioLeds.push(l); }
    update.push((t) => radioLeds.forEach((l, i) => { l.visible = Math.sin(t * 6 + i * 1.7) > -0.2; }));
    box(0.04, 0.5, 0.04, hullDark, 12.4, 1.25, -1.6); add(new THREE.SphereGeometry(0.09, 8, 6), M('#c9c2b0'), 12.4, 1.55, -1.6);
    const wave = canvasTex(256, 64, () => {}); const wg = wave.image.getContext('2d'); add(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: wave }), 12, 2.85, BACK + 0.05);
    let wa = 0; update.push((t, dt) => { wa += dt; if (wa < 0.08) return; wa = 0; wg.fillStyle = '#0b1a1e'; wg.fillRect(0, 0, 256, 64); wg.strokeStyle = '#7fd6e8'; wg.lineWidth = 2; wg.beginPath(); for (let x = 0; x < 256; x += 4) wg.lineTo(x, 32 + Math.sin(x * 0.08 + t * 8) * 14 * Math.sin(t * 1.3 + x * 0.01)); wg.stroke(); wave.needsUpdate = true; });
    sign('RADIO', 12, 3.85, BACK + 0.05, 1.6, '#c8562b', '#14110e'); }
  // COCKPIT: pilot seat + console
  { box(1.0, 0.25, 1.0, M('#b23a2e'), 18.6, 0.75, -0.9); box(1.0, 1.3, 0.25, M('#b23a2e'), 18.1, 1.4, -0.9).rotation.y = Math.PI / 2; box(0.15, 0.6, 0.15, hullDark, 18.6, 0.35, -0.9);
    box(1.6, 1.0, 3.6, M('#24323d'), 21.4, 0.9, -0.9); const panel = add(new THREE.PlaneGeometry(3.4, 0.7), new THREE.MeshBasicMaterial({ map: canvasTex(256, 52, (g, w, h) => { g.fillStyle = '#14110e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { g.fillStyle = ['#e2b04a', '#7fd6e8', '#ff5a3a', '#6b7a3a'][i % 4]; g.fillRect(8 + (i % 13) * 19, 8 + Math.floor(i / 13) * 22, 12, 12); } }) }), 20.58, 1.25, -0.9);
    panel.rotation.y = -Math.PI / 2; panel.rotation.x = 0.0; panel.rotateX(-0.5);
    const yoke = add(new THREE.TorusGeometry(0.22, 0.04, 6, 12, Math.PI), hullDark, 20.4, 1.45, -0.9); yoke.rotation.y = Math.PI / 2;
    sign('COCKPIT', 17.2, 3.85, BACK + 0.05, 1.8, '#24323d', '#e2b04a'); }

  // ---------- lights mode ----------
  function setLights(night) {
    hemi.color.set(night ? '#8fa8d8' : '#ffe6c4'); hemi.groundColor.set(night ? '#1a1a2a' : '#3a2a24'); hemi.intensity = night ? 0.9 : 1.45;
    key.intensity = night ? 0.45 : 1.1; key.color.set(night ? '#a8c4ff' : '#fff0dc'); fill.intensity = night ? 0.7 : 0.35;
  }
  return { update, anchors, sky, stars, setLights, screenTex };
}
