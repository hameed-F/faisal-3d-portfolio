import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ------------------------------------------------------------------
// The floating island: a level-select map. Static props are baked into ONE
// vertex-coloured mesh (their material colours become vertex colours).
// ------------------------------------------------------------------
export const LEVELS = [
  { id: 'player', n: 1, name: 'Player', sub: 'who I am', color: '#ff6b5a', icon: '🙂' },
  { id: 'quests', n: 2, name: 'Quest Log', sub: 'education & experience', color: '#ffb020', icon: '📜' },
  { id: 'library', n: 3, name: 'Game Library', sub: '12 projects', color: '#2bb3a3', icon: '🎮' },
  { id: 'inventory', n: 4, name: 'Inventory', sub: 'skills & tools', color: '#5a8dee', icon: '🧰' },
  { id: 'trophies', n: 5, name: 'Trophy Room', sub: 'certificates', color: '#c77dff', icon: '🏆' },
  { id: 'multiplayer', n: 6, name: 'Multiplayer', sub: 'contact & promo', color: '#ff7eb6', icon: '📡' },
];
// path control points (x, z); level nodes sit on these
const PTS = [[0.5, 10.5], [-3.5, 9.6], [-7.6, 6.4], [-9.6, 1.6], [-8.4, -3.2], [-4.6, -7.4], [0.4, -8.8], [5.2, -7.2], [8.6, -3.6], [9.8, 1.2], [7.6, 5.6], [3.8, 7.4]];
const NODE_IDX = { start: 0, player: 2, quests: 4, library: 6, inventory: 7, trophies: 9, multiplayer: 11 };

const C = (h) => new THREE.Color(h);
const rnd = (() => { let s = 11; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const r = (a, b) => a + (b - a) * rnd();

export async function buildIsland(scene, tier, onProgress) {
  const hi = tier.name === 'Full';
  const bake = []; // geometries with colour attribute, world-space
  const update = [];

  // ---------- sky ----------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: C('#86c2f7') }, mid: { value: C('#ffe3cf') }, bot: { value: C('#bfe2f6') } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying float h; void main(){ vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, h)) : mix(mid, bot, smoothstep(0.0, -0.5, h)); gl_FragColor = vec4(c, 1.0); }',
  }));
  sky.frustumCulled = false; scene.add(sky);
  const hemi = new THREE.HemisphereLight(C('#fff4e4'), C('#86a86e'), 1.55); scene.add(hemi);
  const sun = new THREE.DirectionalLight(C('#fff0d6'), 2.4); sun.position.set(-14, 22, 12);
  if (hi) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const s = sun.shadow.camera; s.left = s.bottom = -16; s.right = s.top = 16; s.near = 1; s.far = 60; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; }
  scene.add(sun);

  // ---------- island body ----------
  const shapePts = []; const N = 40;
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; const rad = 14 + Math.sin(a * 3) * 0.9 + Math.cos(a * 5) * 0.5 + r(-0.25, 0.25); shapePts.push(new THREE.Vector2(Math.cos(a) * rad, Math.sin(a) * rad)); }
  const top = new THREE.ExtrudeGeometry(new THREE.Shape(shapePts), { depth: 1.0, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.35, bevelSegments: 1, curveSegments: 1 });
  top.rotateX(Math.PI / 2); top.translate(0, 0, 0); // top face at y = 0 (+bevel), body goes down
  const grassMat = new THREE.MeshLambertMaterial({ color: '#9bd36a', flatShading: true });
  const sideMat = new THREE.MeshLambertMaterial({ color: '#c98b5a', flatShading: true });
  const slab = new THREE.Mesh(top, [grassMat, sideMat]); slab.position.y = -0.0; slab.receiveShadow = hi; scene.add(slab);
  // rocky underside: a jagged cone
  const under = new THREE.ConeGeometry(14.2, 11, 20, 4, true); under.rotateX(Math.PI); under.translate(0, -6.6, 0);
  const up = under.attributes.position; for (let i = 0; i < up.count; i++) { const y = up.getY(i); if (y > -1.2) continue; up.setX(i, up.getX(i) * r(0.82, 1.12)); up.setZ(i, up.getZ(i) * r(0.82, 1.12)); up.setY(i, y + r(-0.5, 0.5)); }
  under.computeVertexNormals();
  const underMesh = new THREE.Mesh(under, new THREE.MeshLambertMaterial({ color: '#a46a4c', flatShading: true })); scene.add(underMesh);
  // grass top colour variation (flat patches)
  for (let i = 0; i < 26; i++) { const a = r(0, 6.28); const d = r(2, 12); const g = new THREE.CircleGeometry(r(0.8, 2.2), 7).rotateX(-Math.PI / 2).translate(Math.cos(a) * d, 0.27, Math.sin(a) * d); paint(g, ['#8fca5e', '#a9db78', '#88c35a'][i % 3]); bake.push(g); }
  // small floating rocks around the island
  const floaters = [];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + 0.4; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r(0.6, 1.4), 0), new THREE.MeshLambertMaterial({ color: '#b07a58', flatShading: true })); m.position.set(Math.cos(a) * r(17, 21), r(-4, 1.5), Math.sin(a) * r(17, 21)); m.userData.y0 = m.position.y; m.userData.ph = r(0, 6); scene.add(m); floaters.push(m); }
  update.push((t) => floaters.forEach((m) => { m.position.y = m.userData.y0 + Math.sin(t * 0.6 + m.userData.ph) * 0.35; m.rotation.y = t * 0.1 + m.userData.ph; }));

  // ---------- path ----------
  const curve = new THREE.CatmullRomCurve3(PTS.map(([x, z]) => new THREE.Vector3(x, 0.3, z)), false, 'catmullrom', 0.5);
  const seg = 200; const pv = []; const pi = []; const half = 0.72;
  for (let i = 0; i <= seg; i++) { const t = i / seg; const p = curve.getPointAt(t); const tg = curve.getTangentAt(t); const n = new THREE.Vector3(-tg.z, 0, tg.x); pv.push(p.x + n.x * half, 0.29, p.z + n.z * half, p.x - n.x * half, 0.29, p.z - n.z * half); if (i < seg) { const k = i * 2; pi.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
  const pathGeo = new THREE.BufferGeometry(); pathGeo.setAttribute('position', new THREE.Float32BufferAttribute(pv, 3)); pathGeo.setIndex(pi); pathGeo.computeVertexNormals();
  bake.push(paint(pathGeo.toNonIndexed(), '#f4dfab'));
  // dots along the path (Mario-map style)
  for (let i = 1; i < 60; i++) { const p = curve.getPointAt(i / 60); bake.push(paint(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 6).translate(p.x, 0.32, p.z).toNonIndexed(), '#e8c27a')); }
  // node t positions
  const nodeT = {}; for (const [k, idx] of Object.entries(NODE_IDX)) { let best = 0; let bd = 1e9; for (let i = 0; i <= 400; i++) { const p = curve.getPointAt(i / 400); const d = Math.hypot(p.x - PTS[idx][0], p.z - PTS[idx][1]); if (d < bd) { bd = d; best = i / 400; } } nodeT[k] = best; }

  // ---------- props ----------
  onProgress?.(0.2);
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/models/props.glb');
  const props = {}; gltf.scene.children.forEach((n) => { props[n.name] = n; });
  const H = { house: 4.4, house2: 5.0, gate: 3.6, book: 0.35, tv: 0.95, computer: 0.75, workbench: 1.15, anvil: 0.9, toolbox: 0.5, pedestal: 1.1, trophy: 1.1, tower: 7.5, dish: 1.6, mailbox: 1.35, tree1: 4.2, tree2: 3.8, autumn: 4.3, bush: 0.95, flowers: 0.55, rock1: 1.3, rock2: 0.6, fence: 1.0, lamp: 3.0, signpost: 1.9, bench: 0.95, windmill: 6.2, fountain: 1.5, bridge: 1.1, cloud: 2.4, sailboat: 1.7 };
  const norm = {}; // per-prop scale + bottom offset
  for (const [k, n] of Object.entries(props)) { n.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(n); const h = b.max.y - b.min.y || 1; const s = (H[k] || 1) / h; norm[k] = { s, y0: -b.min.y * s, cx: (b.max.x + b.min.x) / 2 * s, cz: (b.max.z + b.min.z) / 2 * s }; }
  const tmpM = new THREE.Matrix4();
  /** bake a prop into the static mesh at (x, z) with rotation ry and extra scale */
  function place(k, x, z, ry = 0, sc = 1, y = 0.27) {
    const n = props[k]; if (!n) return; const { s, y0, cx, cz } = norm[k]; const S = s * sc;
    const root = new THREE.Matrix4().compose(new THREE.Vector3(x, y + y0 * sc, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(S, S, S)).multiply(new THREE.Matrix4().makeTranslation(-cx / s, 0, -cz / s));
    n.updateMatrixWorld(true);
    n.traverse((o) => {
      if (!o.isMesh) return; const mats = Array.isArray(o.material) ? o.material : [o.material];
      const g0 = o.geometry; const groups = g0.groups.length ? g0.groups : [{ start: 0, count: g0.index ? g0.index.count : g0.attributes.position.count, materialIndex: 0 }];
      for (const gr of groups) {
        const mat = mats[gr.materialIndex] || mats[0]; const col = mat.color ? mat.color.clone() : new THREE.Color('#ccc');
        const g = new THREE.BufferGeometry(); const src = g0.attributes.position; const idx = g0.index; const cnt = gr.count; const pos = new Float32Array(cnt * 3);
        for (let i = 0; i < cnt; i++) { const vi = idx ? idx.getX(gr.start + i) : gr.start + i; pos[i * 3] = src.getX(vi); pos[i * 3 + 1] = src.getY(vi); pos[i * 3 + 2] = src.getZ(vi); }
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        tmpM.multiplyMatrices(root, o.matrixWorld); g.applyMatrix4(tmpM); g.computeVertexNormals();
        const ca = new Float32Array(cnt * 3); for (let i = 0; i < cnt; i++) { ca[i * 3] = col.r; ca[i * 3 + 1] = col.g; ca[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(ca, 3));
        bake.push(g);
      }
    });
  }
  /** a live (animated) copy of a prop */
  function live(k, x, z, ry = 0, sc = 1, y = 0.27) {
    const n = props[k]; const { s, y0, cx, cz } = norm[k]; const holder = new THREE.Group(); const c = n.clone(true); c.position.set(-cx / s, 0, -cz / s); const inner = new THREE.Group(); inner.scale.setScalar(s * sc); inner.add(c); holder.add(inner);
    holder.position.set(x, y + y0 * sc, z); holder.rotation.y = ry; holder.traverse((o) => { if (o.isMesh) { o.castShadow = hi; const m = o.material; o.material = new THREE.MeshLambertMaterial({ color: m.color, flatShading: true }); } }); scene.add(holder); return holder;
  }
  const P = (k) => { const p = curve.getPointAt(nodeT[k]); return p; };
  const CAMD = new THREE.Vector3(0.52, 0, 0.85);
  // landmarks go outward, but never between the camera and the avatar
  const outward = (k, d) => { const p = P(k); let v = new THREE.Vector3(p.x, 0, p.z).normalize(); if (v.dot(CAMD) > 0.25) v = v.clone().addScaledVector(CAMD, -1.6).normalize(); return [p.x + v.x * d, p.z + v.z * d, Math.atan2(-v.x, -v.z)]; };

  // landmarks
  { const [x, z, ry] = outward('player', 3.6); place('house', x, z, ry); const [bx, bz] = outward('player', 1.7); place('flowers', bx + 1.5, bz - 0.8, 0); place('flowers', bx - 1.6, bz + 0.6, 1); place('bench', x + 2.6, z + 1.4, ry + 0.4); }
  { const [x, z, ry] = outward('quests', 3.2); place('gate', x, z, ry); place('lamp', x + 2.0, z - 1.6, 0); place('pedestal', x - 1.2, z + 2.2, 0, 0.8); place('book', x - 1.2, z + 2.2, 0.4, 1, 0.27 + 0.88); }
  { const [x, z, ry] = outward('library', 3.7); place('house2', x, z, ry); place('signpost', x - 2.6, z + 1.2, ry); place('tv', x + 2.4, z + 1.0, ry - 0.4, 1, 0.27); place('computer', x + 2.7, z + 2.0, ry - 0.8); }
  { const [x, z, ry] = outward('inventory', 2.8); place('workbench', x, z, ry); place('anvil', x - 1.6, z + 0.4, ry + 0.3); place('toolbox', x + 1.3, z + 0.6, ry - 0.2); }
  { const [x, z, ry] = outward('trophies', 2.4); place('pedestal', x, z, 0, 1.3); place('flowers', x - 1.3, z + 0.9, 2); place('flowers', x + 1.2, z - 1.0, 4); }
  { const [x, z, ry] = outward('multiplayer', 3.4); place('tower', x, z, ry); place('dish', x - 2.2, z + 0.4, ry + 0.8); place('mailbox', x + 1.6, z - 1.4, ry); }
  // start: fountain (Chotu's home)
  const sp = P('start'); place('fountain', sp.x + 2.2, sp.z + 0.4, 0);
  // pond + bridge + boat
  const pond = new THREE.Mesh(new THREE.CircleGeometry(2.6, 18), new THREE.MeshLambertMaterial({ color: '#79c6e6' })); pond.rotation.x = -Math.PI / 2; pond.position.set(1.0, 0.285, -1.2); scene.add(pond);
  bake.push(paint(new THREE.RingGeometry(2.6, 3.0, 18).rotateX(-Math.PI / 2).translate(1.0, 0.288, -1.2).toNonIndexed(), '#d9c08a'));
  const boat = live('sailboat', 0.6, -1.0, 0.6, 0.55, 0.22); update.push((t) => { boat.position.y = 0.22 + Math.sin(t * 1.5) * 0.04; boat.rotation.z = Math.sin(t * 1.1) * 0.05; boat.position.x = 1.0 + Math.cos(t * 0.25) * 1.2; boat.position.z = -1.2 + Math.sin(t * 0.25) * 1.2; boat.rotation.y = -t * 0.25; });
  // windmill behind the workshop (blades turn: whole prop gently rotates? no: live)
  { const [x, z, ry] = outward('inventory', 6.2); const wm = live('windmill', x - 1.5, z, ry); void wm; }
  // trophy on its pedestal (spins)
  const [tx, tz] = outward('trophies', 2.4); const trophy = live('trophy', tx, tz, 0, 1, 0.27 + 1.43); update.push((t) => { trophy.rotation.y = t * 0.8; });
  // scatter trees, bushes, rocks, fences around the rim (avoid the path)
  const nearPath = (x, z, d) => { for (let i = 0; i <= 60; i++) { const p = curve.getPointAt(i / 60); if (Math.hypot(p.x - x, p.z - z) < d) return true; } return false; };
  const taken = []; const free = (x, z, d) => !taken.some(([a, b, c]) => Math.hypot(a - x, b - z) < c + d);
  const landmarkSpots = ['player', 'quests', 'library', 'inventory', 'trophies', 'multiplayer'].map((k) => outward(k, 3.4)); landmarkSpots.forEach(([x, z]) => taken.push([x, z, 3.2]));
  taken.push([1.0, -1.2, 3.4], [sp.x + 2.2, sp.z + 0.4, 1.6]);
  const treeN = hi ? 22 : 14; let placed = 0; let guard = 0;
  const front = (x, z) => x * 0.52 + z * 0.85 > 1.5; // the side facing the camera keeps only low props so nothing hides the avatar
  while (placed < treeN && guard++ < 1500) { const a = r(0, 6.28); const d = r(5, 12.8); const x = Math.cos(a) * d; const z = Math.sin(a) * d; if (front(x, z) || nearPath(x, z, 2.6) || !free(x, z, 1.5)) continue; const k = ['tree1', 'tree2', 'autumn', 'tree1'][placed % 4]; place(k, x, z, r(0, 6.28), r(0.7, 1.0)); taken.push([x, z, 1.5]); placed++; }
  for (let i = 0; i < (hi ? 26 : 14); i++) { const a = r(0, 6.28); const d = r(3, 13.2); const x = Math.cos(a) * d; const z = Math.sin(a) * d; if (nearPath(x, z, 1.1) || !free(x, z, 0.6)) continue; place(['flowers', 'rock2', 'flowers', 'rock1', 'flowers'][i % 5], x, z, r(0, 6.28), r(0.8, 1.2)); taken.push([x, z, 0.6]); }
  // fence segments at the rim near the start
  for (let i = 0; i < 6; i++) { const a = 1.2 + i * 0.14; place('fence', Math.cos(a) * 13.2, Math.sin(a) * 13.2, -a + Math.PI / 2, 1); }
  // clouds drifting under and around
  const clouds = []; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const c = live('cloud', Math.cos(a) * r(19, 26), Math.sin(a) * r(19, 26), r(0, 6), r(1.2, 2.2), Math.cos(a) * 0.52 + Math.sin(a) * 0.85 > 0 ? r(-11, -6) : r(-4, 3)); c.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.material = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#6a6a6a', flatShading: true }); } }); c.userData.a = a; c.userData.r = Math.hypot(c.position.x, c.position.z); clouds.push(c); }
  update.push((t) => clouds.forEach((c) => { const a = c.userData.a + t * 0.012; c.position.x = Math.cos(a) * c.userData.r; c.position.z = Math.sin(a) * c.userData.r; }));

  // ---------- level pads, flags (badges) and hit targets ----------
  const pads = {}; const hits = [];
  for (const L of LEVELS) {
    const p = P(L.id);
    bake.push(paint(new THREE.CylinderGeometry(1.15, 1.25, 0.22, 20).translate(p.x, 0.36, p.z).toNonIndexed(), '#ffffff'));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.09, 6, 28), new THREE.MeshBasicMaterial({ color: L.color })); ring.rotation.x = Math.PI / 2; ring.position.set(p.x, 0.49, p.z); scene.add(ring);
    const badgeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = L.color; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = '#fff'; g.font = '700 64px Fredoka, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(L.n), 64, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex, depthTest: true })); badge.scale.set(1.15, 1.15, 1); badge.position.set(p.x, 2.7, p.z); scene.add(badge);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 4, 10), new THREE.MeshBasicMaterial({ visible: false })); const [hx, hz] = outward(L.id, 1.8); hit.position.set(hx, 2, hz); hit.userData.level = L.id; scene.add(hit); hits.push(hit);
    pads[L.id] = { pos: p.clone(), ring, badge, t: nodeT[L.id], done: false };
    update.push((t) => { const k = pads[L.id]; badge.position.y = 2.7 + Math.sin(t * 2 + L.n) * 0.12; ring.scale.setScalar(1 + (k.hover ? 0.12 : 0) + Math.sin(t * 3 + L.n) * 0.03); });
  }
  const startPos = P('start');

  // ---------- bake ----------
  const merged = new THREE.Mesh(mergeGeometries(bake.map((g0) => { const g = g0.index ? g0.toNonIndexed() : g0; const n = new THREE.BufferGeometry(); n.setAttribute('position', g.attributes.position); n.setAttribute('normal', g.attributes.normal || (g.computeVertexNormals(), g.attributes.normal)); n.setAttribute('color', g.attributes.color); return n; })), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  merged.castShadow = hi; merged.receiveShadow = hi; scene.add(merged);

  function paint(g, col) { const c = C(col); const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (!g.attributes.normal) g.computeVertexNormals(); return g; }
  return { curve, nodeT, pads, hits, startPos, update, sky, sun, fountainPos: new THREE.Vector3(sp.x + 2.2, 0.27, sp.z + 0.4) };
}
