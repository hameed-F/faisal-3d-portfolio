import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeTextures, pixelLabel } from './pixels.js';
import { profile, aboutZones, journey, projects, skills, certificates } from '../content.js';

// ------------------------------------------------------------------
// One long level, 6 zones. 1 unit = 1 tile. Ground top is y = 0.
// solid cells live in a Map "x,y" → type; code blocks carry an info payload.
// ------------------------------------------------------------------
export const ZONES = [
  { id: 'about', name: 'ABOUT ME', x: 0, color: '#ff6b5a' },
  { id: 'journey', name: 'JOURNEY', x: 44, color: '#ffb020' },
  { id: 'projects', name: 'PROJECTS', x: 104, color: '#2bb3a3' },
  { id: 'skills', name: 'SKILLS', x: 186, color: '#5a8dee' },
  { id: 'trophies', name: 'TROPHIES', x: 220, color: '#c77dff' },
  { id: 'contact', name: 'CONTACT', x: 252, color: '#ff7eb6' },
];
export const LEVEL_END = 286;

const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

export function buildLevel(scene, tier) {
  const T = makeTextures(); const hi = tier.name === 'Full';
  const solid = new Map(); const blocks = []; const commits = []; const bugs = []; const trophies = []; const props = []; const update = [];
  const key = (x, y) => `${x},${y}`;
  const set = (x, y, type, extra) => solid.set(key(x, y), { type, x, y, ...extra });
  const ground = (x0, x1) => { for (let x = x0; x <= x1; x++) { set(x, -1, 'grass'); set(x, -2, 'dirt'); set(x, -3, 'dirt'); } };
  const platform = (x0, x1, y, type = 'stone') => { for (let x = x0; x <= x1; x++) set(x, y, type); };
  const block = (x, y, info) => { set(x, y, 'code', { info }); blocks.push({ x, y, info, used: false }); };
  const commitRow = (x0, n, y) => { for (let i = 0; i < n; i++) commits.push({ x: x0 + i + 0.5, y: y + 0.5, got: false }); };
  const bug = (x0, x1, y = 0) => bugs.push({ x0, x1, x: (x0 + x1) / 2, y, dir: 1, alive: true, squash: 0 });

  // ---------------- terrain + content ----------------
  ground(-2, LEVEL_END + 2);
  // walls at both ends
  for (let y = 0; y < 12; y++) { set(-1, y, 'stone'); set(LEVEL_END + 1, y, 'stone'); }

  // ZONE 1 · ABOUT
  block(10, 3, { kind: 'profile' });
  aboutZones.forEach((z, i) => block(16 + i * 2, 3, { kind: 'about', z }));
  commitRow(16, 7, 6);
  platform(28, 32, 3); commitRow(28, 5, 4); bug(24, 34);
  block(38, 3, { kind: 'cv' });

  // ZONE 2 · JOURNEY (a staircase: each step is a milestone)
  block(49, 3, { kind: 'education' });
  journey.slice(1).forEach((j, i) => {
    const x0 = 54 + i * 6; const h = i + 1;
    for (let x = x0; x < x0 + 6; x++) for (let y = 0; y < h; y++) set(x, y, y === h - 1 ? 'grass' : 'dirt');
    block(x0 + 3, h + 3, { kind: 'journey', j, step: i + 2 });
    commitRow(x0 + 1, 2, h + 1);
  });
  // stairs back down
  for (let i = 0; i < 6; i++) for (let y = 0; y < 6 - i; y++) set(90 + i, y, y === 5 - i ? 'grass' : 'dirt');
  bug(60, 65, 1); bug(78, 83, 4);

  // ZONE 3 · PROJECTS (12 blocks, each with its screen behind)
  const screens = [];
  projects.forEach((p, i) => {
    const x = 108 + i * 6; const high = i % 3 === 1; const y = high ? 5 : 3;
    if (high) platform(x - 1, x + 1, 2);
    block(x, y, { kind: 'project', p });
    screens.push({ x: x + 0.5, y: y + 4.2, p });
    if (i % 2 === 0) commitRow(x + 2, 3, 2);
  });
  bug(112, 120); bug(132, 140); bug(150, 158); bug(170, 178);

  // ZONE 4 · SKILLS (power-up blocks) + chess side quest cabinet
  skills.forEach((g, i) => block(190 + i * 4, 3 + (i % 2), { kind: 'skill', g }));
  commitRow(189, 18, 7);
  const chessX = 214; props.push({ type: 'arcade', x: chessX });
  bug(196, 204);

  // ZONE 5 · TROPHIES (collect them)
  certificates.forEach((c, i) => { const x = 224 + i * 4; const y = i % 2 ? 4.2 : 1.5; if (i % 2) platform(x - 1, x + 1, 3); trophies.push({ x: x + 0.5, y, c, got: false }); });
  bug(232, 240);

  // ZONE 6 · CONTACT: mailbox, promo TV, rocket
  props.push({ type: 'mailbox', x: 258 }, { type: 'tv', x: 264 }, { type: 'rocket', x: 276 });
  commitRow(254, 4, 3);

  // ---------------- tile meshes (instanced, one per texture set) ----------------
  const box = new THREE.BoxGeometry(1, 1, 1);
  const L = (t) => new THREE.MeshLambertMaterial({ map: t });
  const mats = {
    grass: [L(T.grassSide), L(T.grassSide), L(T.grassTop), L(T.dirt), L(T.grassSide), L(T.grassSide)],
    dirt: L(T.dirt), stone: L(T.stone), code: L(T.code), used: L(T.used),
  };
  const byType = {}; for (const c of solid.values()) (byType[c.type] = byType[c.type] || []).push(c);
  const m4 = new THREE.Matrix4(); const meshes = {};
  for (const [type, cells] of Object.entries(byType)) {
    const im = new THREE.InstancedMesh(box, mats[type], cells.length); cells.forEach((c, i) => { m4.makeTranslation(c.x + 0.5, c.y + 0.5, 0); im.setMatrixAt(i, m4); c.index = i; c.mesh = im; });
    im.castShadow = hi; im.receiveShadow = hi; scene.add(im); meshes[type] = im;
  }
  // code blocks need individual control (bump + swap to used), so draw them as separate meshes
  if (meshes.code) { scene.remove(meshes.code); }
  const codeMeshes = blocks.map((b) => { const m = new THREE.Mesh(box, mats.code); m.position.set(b.x + 0.5, b.y + 0.5, 0); m.castShadow = hi; scene.add(m); b.mesh = m; b.bump = 0; return m; });
  // depth slab behind the ground so the world reads as a 3D diorama
  const deep = new THREE.Mesh(new THREE.PlaneGeometry(LEVEL_END + 60, 40), new THREE.MeshLambertMaterial({ map: (() => { const t = T.dirt.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(LEVEL_END + 60, 40); t.needsUpdate = true; return t; })() })); deep.position.set(LEVEL_END / 2, -23, 0.5); scene.add(deep);
  const back = new THREE.Mesh(new THREE.BoxGeometry(LEVEL_END + 6, 3, 6), new THREE.MeshLambertMaterial({ color: '#9a5426' })); back.position.set(LEVEL_END / 2, -1.5, -3.5); scene.add(back);
  const meadow = new THREE.Mesh(new THREE.PlaneGeometry(LEVEL_END + 6, 6), new THREE.MeshLambertMaterial({ map: T.grassTop })); T.grassTop.wrapS = T.grassTop.wrapT = THREE.RepeatWrapping; meadow.material.map = T.grassTop.clone(); meadow.material.map.wrapS = meadow.material.map.wrapT = THREE.RepeatWrapping; meadow.material.map.repeat.set(LEVEL_END + 6, 6); meadow.material.map.needsUpdate = true; meadow.rotation.x = -Math.PI / 2; meadow.position.set(LEVEL_END / 2, 0.001, -3.5); meadow.receiveShadow = hi; scene.add(meadow);

  // ---------------- background: sky, hills, clouds, bushes, trees ----------------
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2000, 400), new THREE.ShaderMaterial({ depthWrite: false, uniforms: { a: { value: new THREE.Color('#6ec6ff') }, b: { value: new THREE.Color('#d9f2ff') } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 a; uniform vec3 b; varying vec2 vUv; void main(){ gl_FragColor = vec4(mix(b, a, smoothstep(0.48, 0.62, vUv.y)), 1.0); }' }));
  sky.position.set(LEVEL_END / 2, 40, -60); sky.renderOrder = -1; scene.add(sky);
  const deco = []; const paint = (g, col) => { const c = new THREE.Color(col); const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.index ? g.toNonIndexed() : g; };
  const add = (g, col) => deco.push(paint(g, col));
  // rolling hills (far)
  for (let x = -10; x < LEVEL_END + 20; x += 18 + ((x * 13) % 9)) { const r = 5 + ((x * 7) % 5); add(new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.4, 0.8, 0.6).translate(x, -0.5, -14), x % 2 ? '#56c36e' : '#49b363'); add(new THREE.SphereGeometry(r * 0.5, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.4, 0.8, 0.6).translate(x + r, -0.5, -11), '#6fd283'); }
  // trees + bushes (mid)
  for (let x = 4; x < LEVEL_END; x += 7 + ((x * 11) % 6)) {
    if ((x * 3) % 4 === 0) { add(new THREE.CylinderGeometry(0.25, 0.3, 2.2, 6).translate(x, 1.1, -5), '#8a5a2e'); add(new THREE.IcosahedronGeometry(1.4, 0).translate(x, 3.0, -5), '#3fae55'); add(new THREE.IcosahedronGeometry(1.0, 0).translate(x + 0.6, 3.8, -5.2), '#57c76a'); }
    else { for (let k = 0; k < 3; k++) add(new THREE.SphereGeometry(0.75 - k * 0.12, 8, 6).translate(x + k * 0.9, 0.35, -2.4), '#3db552'); }
  }
  // flowers
  for (let x = 2; x < LEVEL_END; x += 3) { const c = ['#ff6b8a', '#ffd23f', '#ffffff', '#b98cff'][x % 4]; add(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 4).translate(x + 0.3, 0.18, -1.2), '#2f8a3c'); add(new THREE.SphereGeometry(0.1, 6, 4).translate(x + 0.3, 0.38, -1.2), c); }
  scene.add(new THREE.Mesh(mergeGeometries(deco), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  // clouds (pixel-puff boxes), drifting
  const cloudG = []; for (let x = 0; x < LEVEL_END + 40; x += 14 + ((x * 5) % 9)) { const y = 9 + ((x * 3) % 5); const z = -16 - ((x * 7) % 10); [[0, 0, 3, 1.2], [0.6, 0.8, 1.8, 1], [-0.7, 0.5, 1.4, 0.9]].forEach(([dx, dy, w, h]) => cloudG.push(paint(new THREE.BoxGeometry(w, h, 1).translate(x + dx, y + dy, z), '#ffffff'))); }
  const clouds = new THREE.Mesh(mergeGeometries(cloudG), new THREE.MeshBasicMaterial({ vertexColors: true })); scene.add(clouds);
  update.push((t) => { clouds.position.x = (t * 0.6) % 14; });

  // zone signposts (just the zone name; no text walls)
  for (const z of ZONES) {
    const g = new THREE.Group(); g.position.set(z.x + 3, 0, -0.9); scene.add(g);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), new THREE.MeshLambertMaterial({ map: T.wood })); post.position.y = 1.1; g.add(post);
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.75, 0.12), [L(T.wood), L(T.wood), L(T.wood), L(T.wood), new THREE.MeshBasicMaterial({ map: pixelLabel(z.name) }), L(T.wood)]); board.position.y = 2.1; g.add(board);
  }
  // project screens behind the project blocks
  const loader = new THREE.TextureLoader();
  for (const s of screens) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.1, 0.2), new THREE.MeshLambertMaterial({ color: '#2a2438' })); frame.position.set(s.x, s.y, -1.6); scene.add(frame);
    const img = s.p.image ? loader.load(s.p.image) : null; if (img) { img.colorSpace = THREE.SRGBColorSpace; img.minFilter = THREE.LinearMipmapLinearFilter; }
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(3.15, 1.85), new THREE.MeshBasicMaterial(img ? { map: img } : { color: '#3b3452' })); pic.position.set(s.x, s.y, -1.49); scene.add(pic); s.pic = pic;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, s.y - 1.05, 0.15), new THREE.MeshLambertMaterial({ color: '#2a2438' })); leg.position.set(s.x, (s.y - 1.05) / 2, -1.6); scene.add(leg);
  }

  // ---------------- props ----------------
  const live = {};
  for (const p of props) {
    const g = new THREE.Group(); g.position.set(p.x + 0.5, 0, -0.2); scene.add(g); live[p.type] = g; const M = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    if (p.type === 'arcade') { g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.0), M('#5a8dee')), 0, 1.1, 0)); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), new THREE.MeshBasicMaterial({ map: pixelLabel('CHESS', { bg: '#14202b', fg: '#7fe0c4', w: 128, h: 96 }) })); s.position.set(0, 1.6, 0.51); g.add(s); g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.5), M('#23253a')), 0, 1.05, 0.55)); }
    if (p.type === 'mailbox') { g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.3, 0.15), M('#6b4a2e')), 0, 0.65, 0)); g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.6), M('#ff6b5a')), 0, 1.5, 0)); const flag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.2), M('#ffc93c')); flag.position.set(0.48, 1.7, 0); g.add(flag); update.push((t) => { flag.rotation.z = Math.sin(t * 3) * 0.3; }); }
    if (p.type === 'tv') { g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 0.8), M('#3d3a34')), 0, 0.9, 0)); const s = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.05), new THREE.MeshBasicMaterial({ map: pixelLabel('PROMO', { bg: '#14202b', fg: '#ffc93c', w: 128, h: 96 }) })); s.position.set(0, 0.92, 0.41); g.add(s); [-0.5, 0.5].forEach((x) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.1), M('#23253a')); leg.position.set(x, 0.1, 0); g.add(leg); }); }
    if (p.type === 'rocket') {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.4, 10), M('#737a91')); pad.position.y = 0.2; g.add(pad);
      const r = new THREE.Group(); r.position.y = 0.4; g.add(r); live.rocketBody = r;
      r.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 3.2, 10), M('#f3f3f3')), 0, 1.6, 0));
      r.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 10), M('#ff6b5a')), 0, 3.8, 0));
      const win = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 12), M('#6ec6ff')); win.rotation.x = Math.PI / 2; win.position.set(0, 2.3, 0.62); r.add(win);
      for (let k = 0; k < 3; k++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.7), M('#ff6b5a')); const a = (k / 3) * Math.PI * 2; fin.position.set(Math.cos(a) * 0.65, 0.45, Math.sin(a) * 0.65); fin.rotation.y = -a; r.add(fin); }
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 8), new THREE.MeshBasicMaterial({ color: '#ffb020' })); flame.rotation.x = Math.PI; flame.position.y = -0.5; flame.visible = false; r.add(flame); live.flame = flame;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: pixelLabel('SHIP IT!', { bg: '#23253a', fg: '#ffc93c' }) })); sign.position.set(-2.6, 2.4, 0); g.add(sign);
    }
  }

  // commits (spinning gems, one instanced mesh)
  const gem = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshLambertMaterial({ color: '#3fe0b0', emissive: '#0b5a46', flatShading: true }), commits.length); scene.add(gem);
  const q = new THREE.Quaternion(); const one = new THREE.Vector3(1, 1, 1); const zero = new THREE.Vector3(0, 0, 0); const Y = new THREE.Vector3(0, 1, 0);
  update.push((t) => { commits.forEach((c, i) => { q.setFromAxisAngle(Y, t * 3 + i); m4.compose(new THREE.Vector3(c.x, c.y + Math.sin(t * 3 + i) * 0.08, 0), q, c.got ? zero : one); gem.setMatrixAt(i, m4); }); gem.instanceMatrix.needsUpdate = true; });
  // trophies (gold cups)
  const cupGeo = new THREE.LatheGeometry([[0, 0], [0.25, 0], [0.25, 0.07], [0.08, 0.14], [0.08, 0.36], [0.26, 0.48], [0.33, 0.85], [0, 0.72]].map(([a, b]) => new THREE.Vector2(a, b)), 12);
  const cupMat = new THREE.MeshLambertMaterial({ color: '#ffc93c', emissive: '#5a3a00' });
  for (const tr of trophies) { const m = new THREE.Mesh(cupGeo, cupMat); m.position.set(tr.x, tr.y, 0); m.castShadow = hi; scene.add(m); tr.mesh = m; }
  update.push((t) => trophies.forEach((tr, i) => { if (tr.got) return; tr.mesh.rotation.y = t * 2 + i; tr.mesh.position.y = tr.y + Math.sin(t * 2 + i) * 0.12; }));

  // deadlines ⏰: little walking alarm clocks (stomp them before they ring)
  const bugGeo = (() => { const parts = []; const P = (g, c) => parts.push(paint(g, c));
    P(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 16).rotateX(Math.PI / 2).translate(0, 0.5, 0), '#e8413a');
    P(new THREE.CylinderGeometry(0.31, 0.31, 0.04, 16).rotateX(Math.PI / 2).translate(0, 0.5, 0.15), '#fff6d8');
    P(new THREE.BoxGeometry(0.04, 0.22, 0.02).translate(0, 0.58, 0.18), '#1a1c2c'); P(new THREE.BoxGeometry(0.16, 0.04, 0.02).translate(0.07, 0.5, 0.18), '#1a1c2c');
    P(new THREE.SphereGeometry(0.03, 6, 4).translate(0, 0.5, 0.19), '#e8413a');
    for (const s of [-1, 1]) { P(new THREE.SphereGeometry(0.13, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(s * 0.5).translate(s * 0.26, 0.86, 0), '#ffc93c'); P(new THREE.BoxGeometry(0.06, 0.16, 0.06).translate(s * 0.18, 0.12, 0), '#1a1c2c'); P(new THREE.BoxGeometry(0.14, 0.05, 0.12).translate(s * 0.2, 0.03, 0.02), '#1a1c2c'); }
    P(new THREE.BoxGeometry(0.08, 0.1, 0.08).translate(0, 0.92, 0), '#1a1c2c');
    for (const s of [-1, 1]) P(new THREE.BoxGeometry(0.07, 0.03, 0.02).translate(s * 0.1, 0.66, 0.18), '#1a1c2c'); // angry brows
    return mergeGeometries(parts); })();
  const bugMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  for (const b of bugs) { const m = new THREE.Mesh(bugGeo, bugMat); m.castShadow = hi; m.position.set(b.x, b.y, 0.1); scene.add(m); b.mesh = m; }

  return { solid, blocks, commits, bugs, trophies, props, live, screens, update, T, chessX, key };
}
