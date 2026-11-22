import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { psxMat, psxify } from './psx.js';
import * as TX from './textures.js';
import { projects, certificates } from '../content.js';

// World layout (metres). Cabin centred on the origin, door on the +Z side.
export const LAYOUT = {
  cabin: { w: 8, d: 6, h: 3.1 },
  table: { x: 0, z: -0.2, w: 2.7, d: 1.6, h: 0.8 },
  door: new THREE.Vector3(0, 0, 3),
  avatarHub: new THREE.Vector3(2.2, 0, -1.25),
  avatarDoor: new THREE.Vector3(1.0, 0, 3.9),
  carStop: new THREE.Vector3(3.2, 0, 9.5),
};
export const GROUP_COLORS = { Unreal: '#2f6f8f', Unity: '#8a3a1c', 'Three.js': '#5b8a5a', Systems: '#6a5aa0', Motion: '#c88a1c' };

export const ROAD = new THREE.CatmullRomCurve3([
  new THREE.Vector3(46, 0, 78), new THREE.Vector3(30, 0, 58), new THREE.Vector3(12, 0, 46), new THREE.Vector3(-6, 0, 34),
  new THREE.Vector3(-4, 0, 22), new THREE.Vector3(4, 0, 14), new THREE.Vector3(3.2, 0, 9.5),
], false, 'catmullrom', 0.4);

const C = (hex) => new THREE.Color(hex);

function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }

export function buildWorld(scene, tier) {
  const clickables = []; // { object, section }
  const update = []; // per-frame callbacks (t, dt)
  const texSize = tier.texSize;

  // ---------- sky + fog ----------
  const skyCol = { dusk: [C('#1b2a44'), C('#c0703f')], day: [C('#7fb2cf'), C('#f1d9a8')] };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 16, 10), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: skyCol.dusk[0].clone() }, bottom: { value: skyCol.dusk[1].clone() } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying float h; void main(){ float k = smoothstep(-0.05, 0.45, h); gl_FragColor = vec4(mix(bottom, top, k), 1.0); }',
  }));
  sky.renderOrder = -1; scene.add(sky);
  scene.fog = new THREE.Fog(C('#3a3f4a'), 14, 85);

  const hemi = new THREE.HemisphereLight(C('#8fa6c4'), C('#3a2a1c'), 1.1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(C('#ffb27a'), 1.4); sun.position.set(-40, 18, 30); scene.add(sun);

  const setTheme = (t) => {
    const [a, b] = skyCol[t] || skyCol.dusk; sky.material.uniforms.top.value.copy(a); sky.material.uniforms.bottom.value.copy(b);
    scene.fog.color.set(t === 'day' ? '#a9bfc6' : '#3a3f4a');
    hemi.intensity = t === 'day' ? 1.9 : 1.1; sun.intensity = t === 'day' ? 2.2 : 1.4; sun.color.set(t === 'day' ? '#fff1d6' : '#ffb27a');
  };

  // ---------- ground ----------
  const gGeo = new THREE.PlaneGeometry(260, 260, 56, 56); gGeo.rotateX(-Math.PI / 2);
  const pos = gGeo.attributes.position; const cols = []; const tmp = new THREE.Vector3();
  const roadPts = ROAD.getSpacedPoints(80);
  const distRoad = (x, z) => { let d = 1e9; for (const p of roadPts) d = Math.min(d, Math.hypot(p.x - x, p.z - z)); return d; };
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i); const r = Math.hypot(tmp.x, tmp.z); const dr = distRoad(tmp.x, tmp.z);
    const flat = Math.min(1, Math.max(0, (r - 12) / 10)) * Math.min(1, Math.max(0, (dr - 4) / 6));
    pos.setY(i, flat * (Math.sin(tmp.x * 0.09) * Math.cos(tmp.z * 0.07) * 1.6 + TX.rand(-0.25, 0.25)));
    const k = TX.rand(0, 1); const c = C(k < 0.5 ? '#3d4a2c' : k < 0.8 ? '#33402a' : '#4a4630'); cols.push(c.r, c.g, c.b);
  }
  gGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); gGeo.computeVertexNormals();
  const ground = new THREE.Mesh(gGeo, psxMat({ vertexColors: true })); scene.add(ground);

  // ---------- road (ribbon along the curve) ----------
  const seg = 160; const rv = []; const ruv = []; const ri = []; const half = 2.1;
  for (let i = 0; i <= seg; i++) {
    const t = i / seg; const p = ROAD.getPointAt(t); const tg = ROAD.getTangentAt(t); const n = new THREE.Vector3(-tg.z, 0, tg.x).normalize();
    rv.push(p.x + n.x * half, 0.03, p.z + n.z * half, p.x - n.x * half, 0.03, p.z - n.z * half); ruv.push(0, t * 40, 1, t * 40);
    if (i < seg) { const a = i * 2; ri.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const rGeo = new THREE.BufferGeometry(); rGeo.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3)); rGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ruv, 2)); rGeo.setIndex(ri); rGeo.computeVertexNormals();
  const roadTex = (() => { const c = document.createElement('canvas'); c.width = 32; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#3b3a38'; g.fillRect(0, 0, 32, 64);
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${TX.rand(0, 1) > 0.5 ? '255,255,255' : '0,0,0'},${TX.rand(0.03, 0.1)})`; g.fillRect(TX.rand(0, 32) | 0, TX.rand(0, 64) | 0, 1, 1); }
    g.fillStyle = '#c9a24a'; g.fillRect(15, 6, 2, 26); g.fillStyle = '#8f8a7d'; g.fillRect(1, 0, 1, 64); g.fillRect(30, 0, 1, 64);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const roadMesh = new THREE.Mesh(rGeo, psxMat({ map: roadTex })); scene.add(roadMesh);

  // ---------- trees + rocks (instanced: 3 draw calls for the whole forest) ----------
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.4, 5); trunkGeo.translate(0, 0.7, 0);
  const crown = mergeGeometries([
    new THREE.ConeGeometry(1.25, 2.2, 6).translate(0, 2.2, 0),
    new THREE.ConeGeometry(0.95, 1.8, 6).translate(0, 3.2, 0),
    new THREE.ConeGeometry(0.6, 1.4, 6).translate(0, 4.1, 0),
  ]);
  const nTrees = tier.trees;
  const trunks = new THREE.InstancedMesh(trunkGeo, psxMat({ color: C('#4a3222') }), nTrees);
  const crowns = new THREE.InstancedMesh(crown, psxMat({ color: C('#ffffff') }), nTrees);
  const mtx = new THREE.Matrix4(); const q = new THREE.Quaternion(); const sc = new THREE.Vector3(); const p = new THREE.Vector3();
  const treePalette = ['#2f4a33', '#3a5236', '#28403a', '#41573a', '#334a2e'].map(C);
  let placed = 0; let guard = 0; const treesXZ = [];
  while (placed < nTrees && guard++ < nTrees * 30) {
    const a = TX.rand(0, Math.PI * 2); const r = 10 + Math.pow(TX.rand(0, 1), 0.7) * 95; const x = Math.cos(a) * r; const z = Math.sin(a) * r;
    if (distRoad(x, z) < 4.2 || (Math.abs(x) < 9 && z > -8 && z < 14) || Math.hypot(x - 46, z - 78) < 13) continue;
    const s = TX.rand(0.75, 1.5); const y = 0; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), TX.rand(0, 6.28));
    sc.set(s, s * TX.rand(0.9, 1.25), s); p.set(x, y - 0.1, z); mtx.compose(p, q, sc);
    trunks.setMatrixAt(placed, mtx); crowns.setMatrixAt(placed, mtx); crowns.setColorAt(placed, treePalette[placed % treePalette.length]); treesXZ.push(x, z); placed++;
  }
  trunks.count = crowns.count = placed; scene.add(trunks, crowns);
  const rockGeo = new THREE.DodecahedronGeometry(0.6, 0); const rocks = new THREE.InstancedMesh(rockGeo, psxMat({ color: C('#5d5a52') }), tier.rocks);
  for (let i = 0; i < tier.rocks; i++) {
    let x; let z; do { const a = TX.rand(0, 6.28); const r = TX.rand(8, 70); x = Math.cos(a) * r; z = Math.sin(a) * r; } while (distRoad(x, z) < 3.5 || (Math.abs(x) < 6 && Math.abs(z - 2) < 7));
    const s = TX.rand(0.4, 1.6); mtx.compose(p.set(x, 0.1, z), q.setFromEuler(new THREE.Euler(TX.rand(0, 3), TX.rand(0, 3), 0)), sc.set(s, s * 0.7, s)); rocks.setMatrixAt(i, mtx);
  }
  scene.add(rocks);

  // ---------- car (built from boxes) ----------
  const car = new THREE.Group();
  const paint = psxMat({ color: C('#8a3e2c') }); const dark = psxMat({ color: C('#1d1d1f') }); const chrome = psxMat({ color: C('#b9b2a2') });
  const glass = psxMat({ color: C('#2a3a44') }); const lampM = psxMat({ color: C('#fff1c0'), emissive: C('#ffe7a0'), emissiveIntensity: 1 }); const tail = psxMat({ color: C('#5a1010'), emissive: C('#a01a10'), emissiveIntensity: 0.8 });
  car.add(box(1.8, 0.62, 4.1, paint, 0, 0.62, 0), box(1.6, 0.55, 2.2, paint, 0, 1.2, -0.25), box(1.62, 0.42, 2.0, glass, 0, 1.22, -0.25));
  car.add(box(1.84, 0.18, 0.2, chrome, 0, 0.42, 2.06), box(1.84, 0.18, 0.2, chrome, 0, 0.42, -2.06));
  car.add(box(0.36, 0.18, 0.06, lampM, -0.6, 0.72, 2.06), box(0.36, 0.18, 0.06, lampM, 0.6, 0.72, 2.06), box(0.3, 0.14, 0.06, tail, -0.65, 0.72, -2.06), box(0.3, 0.14, 0.06, tail, 0.65, 0.72, -2.06));
  car.add(box(1.5, 0.12, 1.2, dark, 0, 1.53, -0.25)); // roof rack
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 8); wheelGeo.rotateZ(Math.PI / 2);
  const wheels = [[-0.88, 1.35], [0.88, 1.35], [-0.88, -1.35], [0.88, -1.35]].map(([x, z]) => { const w = new THREE.Mesh(wheelGeo, dark); w.position.set(x, 0.36, z); car.add(w); return w; });
  const head = new THREE.SpotLight(C('#ffe2a8'), 60, 38, 0.45, 0.6, 1.4); head.position.set(0, 0.8, 1.9); head.target.position.set(0, 0, 14); car.add(head, head.target);
  // fake light cone on the road (cheap, no shadow)
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 10), new THREE.MeshBasicMaterial({ color: C('#ffd99a'), transparent: true, opacity: 0.12, depthWrite: false, fog: true }));
  beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.06, 7); car.add(beam);
  scene.add(car);
  const carState = { wheels, head, beam };
  const placeCarOnRoad = (t) => { const p0 = ROAD.getPointAt(Math.min(t, 1)); const tg = ROAD.getTangentAt(Math.min(t, 0.999)); car.position.copy(p0); car.rotation.y = Math.atan2(tg.x, tg.z); };
  placeCarOnRoad(0.0);

  // ---------- cabin exterior ----------
  const { w: CW, d: CD, h: CH } = LAYOUT.cabin;
  const cabin = new THREE.Group(); scene.add(cabin);
  const logTex = TX.planks(texSize >= 512 ? 128 : 64, '#6a4a30', '#3a2414'); logTex.wrapS = logTex.wrapT = THREE.RepeatWrapping; logTex.repeat.set(3, 1.5);
  const wallOut = psxMat({ map: logTex });
  const t = 0.18;
  cabin.add(box(CW, CH, t, wallOut, 0, CH / 2, -CD / 2), box(t, CH, CD, wallOut, -CW / 2, CH / 2, 0), box(t, CH, CD, wallOut, CW / 2, CH / 2, 0));
  // front wall with a door gap (1.2 m wide)
  const fw = (CW - 1.2) / 2; cabin.add(box(fw, CH, t, wallOut, -(1.2 / 2 + fw / 2), CH / 2, CD / 2), box(fw, CH, t, wallOut, 1.2 / 2 + fw / 2, CH / 2, CD / 2), box(1.2, CH - 2.2, t, wallOut, 0, 2.2 + (CH - 2.2) / 2, CD / 2));
  // gable roof
  const roofM = psxMat({ color: C('#3b2a22') });
  const rl = Math.hypot(CW / 2 + 0.5, 1.7);
  const r1 = box(rl, 0.16, CD + 1.0, roofM); r1.position.set(-(CW / 4 + 0.25), CH + 0.85, 0); r1.rotation.z = Math.atan2(1.7, CW / 2 + 0.5); cabin.add(r1);
  const r2 = r1.clone(); r2.position.x *= -1; r2.rotation.z *= -1; cabin.add(r2);
  const gable = new THREE.Shape([new THREE.Vector2(-CW / 2, 0), new THREE.Vector2(CW / 2, 0), new THREE.Vector2(0, 1.7)]);
  const gGeo2 = new THREE.ShapeGeometry(gable); [CD / 2 + 0.01, -CD / 2 - 0.01].forEach((z, i) => { const m = new THREE.Mesh(gGeo2, psxMat({ map: logTex, side: THREE.DoubleSide })); m.position.set(0, CH, z); if (i) m.rotation.y = Math.PI; cabin.add(m); });
  // door (swung open), porch, glowing windows, chimney
  const door = box(1.15, 2.15, 0.08, psxMat({ color: C('#4a2c18') }), 0, 0, 0); door.geometry.translate(0.575, 1.075, 0); door.position.set(-0.6, 0, CD / 2 + 0.05); door.rotation.y = -1.9; cabin.add(door);
  cabin.add(box(3.4, 0.2, 1.6, psxMat({ map: TX.planks(64, '#5a3a22', '#2e1a0c', true) }), 0, 0.1, CD / 2 + 0.8));
  const winM = psxMat({ color: C('#ffcf7a'), emissive: C('#ffb452'), emissiveIntensity: 1.1 });
  cabin.add(box(1.0, 0.8, 0.05, winM, -2.4, 1.6, CD / 2 + 0.1), box(1.0, 0.8, 0.05, winM, 2.4, 1.6, CD / 2 + 0.1), box(0.05, 0.8, 1.2, winM, -CW / 2 - 0.1, 1.6, 0));
  cabin.add(box(0.7, 2.0, 0.7, psxMat({ color: C('#5d5a52') }), 2.4, CH + 1.4, -1.2));
  const porchLight = new THREE.PointLight(C('#ffb45a'), 6, 9, 1.6); porchLight.position.set(0, 2.5, CD / 2 + 0.9); scene.add(porchLight);
  // signpost by the road
  // Free Drive signposts: one per section, in clearings beside the road
  const signs = [];
  const signPostM = psxMat({ color: C('#4a3222') });
  [['ABOUT', 'about', 0.12, 1], ['SKILLS', 'skills', 0.3, -1], ['PROJECTS', 'projects', 0.48, 1], ['JOURNEY', 'journey', 0.64, -1], ['TROPHIES', 'achievements', 0.8, 1]].forEach(([label, section, t, sideK]) => {
    const p0 = ROAD.getPointAt(t); const tg = ROAD.getTangentAt(t); const n = new THREE.Vector3(-tg.z, 0, tg.x).multiplyScalar(sideK * 3.6);
    const g = new THREE.Group(); g.position.set(p0.x + n.x, 0, p0.z + n.z); g.rotation.y = Math.atan2(tg.x, tg.z) + (sideK > 0 ? -Math.PI / 2 : Math.PI / 2) * 0.6;
    g.add(box(0.14, 2.0, 0.14, signPostM, 0, 1.0, 0)); const pl = box(1.9, 0.5, 0.07, psxMat({ map: TX.signTex(label + '  ▸', 256, 64, '#5a2f19') }), 0, 1.75, 0); g.add(pl);
    const lampS = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffd27a' })); lampS.position.set(0, 2.1, 0); g.add(lampS);
    scene.add(g); signs.push({ label, section, pos: g.position.clone(), group: g });
  });
  const signM = psxMat({ map: TX.signTex('CABIN  ▸') }); const post = box(0.12, 1.6, 0.12, psxMat({ color: C('#4a3222') }), 6.2, 0.8, 11.5); scene.add(post);
  const sign = box(1.5, 0.38, 0.06, signM, 6.2, 1.5, 11.5); sign.rotation.y = -0.6; scene.add(sign);

  // ---------- cabin interior (a back-faced room just inside the walls) ----------
  const room = new THREE.Group(); scene.add(room);
  const inW = CW - 0.4; const inD = CD - 0.4; const inH = CH - 0.05;
  const plankWall = TX.planks(texSize >= 512 ? 128 : 64, '#7a5534', '#4a2e18', true); plankWall.wrapS = plankWall.wrapT = THREE.RepeatWrapping; plankWall.repeat.set(4, 1.5);
  const floorTex = TX.planks(texSize >= 512 ? 128 : 64, '#5e3d24', '#2e1a0c'); floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(4, 3);
  const roomMats = [psxMat({ map: plankWall, side: THREE.BackSide }), psxMat({ map: plankWall, side: THREE.BackSide }), psxMat({ color: C('#3b2a1e'), side: THREE.BackSide }), psxMat({ map: floorTex, side: THREE.BackSide }), psxMat({ map: plankWall, side: THREE.BackSide }), psxMat({ map: plankWall, side: THREE.BackSide })];
  const roomBox = new THREE.Mesh(new THREE.BoxGeometry(inW, inH, inD), roomMats); roomBox.position.y = inH / 2; room.add(roomBox);
  // ceiling beams + rug
  for (let i = -1; i <= 1; i++) room.add(box(inW, 0.18, 0.22, psxMat({ color: C('#3a2414') }), 0, inH - 0.12, i * 1.6));
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.9, 10), psxMat({ color: C('#7a3a24') })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.012, -0.1); room.add(rug);
  const rug2 = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.7, 10), psxMat({ color: C('#d9a441') })); rug2.rotation.x = -Math.PI / 2; rug2.position.set(0, 0.015, -0.1); room.add(rug2);
  // interior window (dusk outside)
  room.add(box(0.04, 0.9, 1.3, psxMat({ color: C('#d48a52'), emissive: C('#c0703f'), emissiveIntensity: 0.9 }), -inW / 2 + 0.03, 1.6, 0));
  room.add(box(0.06, 0.06, 1.4, psxMat({ color: C('#2e1a0c') }), -inW / 2 + 0.06, 1.6, 0), box(0.06, 1.0, 0.06, psxMat({ color: C('#2e1a0c') }), -inW / 2 + 0.06, 1.6, 0));

  // lamp over the table (the main warm light)
  const lamp = new THREE.PointLight(C('#ffc27a'), 9, 9, 1.3); lamp.position.set(0, 2.2, -0.2); room.add(lamp);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.38, 8, 1, true), psxMat({ color: C('#2f4a3a'), side: THREE.DoubleSide })); shade.position.set(0, 2.42, -0.2); room.add(shade);
  room.add(box(0.02, 0.5, 0.02, psxMat({ color: C('#111') }), 0, 2.85, -0.2));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshBasicMaterial({ color: C('#fff0c8') })); bulb.position.set(0, 2.28, -0.2); room.add(bulb);
  const fill = new THREE.PointLight(C('#ff9a5a'), 2.2, 10, 1.5); fill.position.set(-2.5, 1.6, 1.5); room.add(fill);

  // ---------- table + boards ----------
  const T = LAYOUT.table;
  const tableTop = TX.planks(64, '#7a5030', '#3e2412'); tableTop.wrapS = tableTop.wrapT = THREE.RepeatWrapping;
  const tabM = psxMat({ map: tableTop }); const legM = psxMat({ color: C('#3e2412') });
  room.add(box(T.w, 0.08, T.d, tabM, T.x, T.h - 0.04, T.z));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => room.add(box(0.1, T.h - 0.08, 0.1, legM, T.x + a * (T.w / 2 - 0.12), (T.h - 0.08) / 2, T.z + b * (T.d / 2 - 0.12))));
  // stools
  [[-1.75, 0.2], [0, 1.25], [-0.9, -1.35]].forEach(([x, z]) => { room.add(box(0.42, 0.06, 0.42, tabM, x, 0.5, z)); room.add(box(0.06, 0.48, 0.06, legM, x, 0.24, z)); });

  const top = T.h + 0.002;
  function board(size, texture, x, z, section, rot = 0) {
    const g = new THREE.Group(); g.position.set(T.x + x, top, T.z + z); g.rotation.y = rot;
    const base = box(size + 0.02, 0.026, size + 0.02, psxMat({ color: C('#2a170b') }), 0, 0.013, 0); g.add(base);
    const fm = psxMat({ map: texture, flat: true }); fm.polygonOffset = true; fm.polygonOffsetFactor = -4; fm.polygonOffsetUnits = -4;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(size, size), fm); face.rotation.x = -Math.PI / 2; face.position.y = 0.034; g.add(face);
    g.userData.section = section; room.add(g); clickables.push({ object: g, section }); return g;
  }
  const feat = projects; // 12 projects
  const boards = {
    projects: board(0.78, TX.propertyTex(Math.max(256, texSize), feat, GROUP_COLORS), 0, 0, 'projects'),
    skills: board(0.5, TX.chessTex(texSize >= 512 ? 256 : 128), -1.0, -0.36, 'skills', 0.08),
    about: board(0.5, TX.ludoTex(texSize >= 512 ? 256 : 128), -1.0, 0.36, 'about', -0.1),
    journey: board(0.56, TX.snakesTex(Math.max(256, texSize), [1, 21, 28, 51, 72, 80, 100]), 1.0, -0.3, 'journey', -0.06),
  };
  // a few pieces on the boards (decor; the playable sets are built by the games)
  const pawnGeo = new THREE.LatheGeometry([[0, 0], [0.028, 0], [0.028, 0.008], [0.016, 0.016], [0.011, 0.045], [0.02, 0.052], [0.012, 0.06], [0.018, 0.072], [0.012, 0.085], [0, 0.088]].map(([a, b]) => new THREE.Vector2(a, b)), 8);
  const ivory = psxMat({ color: C('#d9c39a') }); const walnut = psxMat({ color: C('#3a2214') });
  [[-0.12, 0.15, ivory], [0.05, 0.12, ivory], [0.1, -0.15, walnut], [-0.05, -0.12, walnut]].forEach(([x, z, m]) => { const pc = new THREE.Mesh(pawnGeo, m); pc.position.set(x, 0.031, z); boards.skills.add(pc); });
  [['#c8553d', -0.18, -0.18], ['#5b8a5a', 0.18, -0.18], ['#d9a441', 0.18, 0.18], ['#2f6f8f', -0.18, 0.18]].forEach(([c, x, z]) => { const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.03, 8), psxMat({ color: C(c) })); tk.position.set(x, 0.046, z); boards.about.add(tk); });
  // dice on the table
  const dice = box(0.07, 0.07, 0.07, psxMat({ color: C('#efe6d2') }), T.x + 1.0, top + 0.035, T.z + 0.42); dice.rotation.y = 0.5; room.add(dice);

  // ---------- trophy shelf (certificates) on the back wall ----------
  const shelf = new THREE.Group(); shelf.position.set(0, 0, -inD / 2 + 0.16); room.add(shelf);
  shelf.add(box(3.6, 0.06, 0.28, tabM, 0, 1.25, 0), box(3.6, 0.06, 0.28, tabM, 0, 1.95, 0));
  const certW = 0.46; const certH = 0.34;
  certificates.forEach((c, i) => {
    const row = i < 3 ? 0 : 1; const col = i % 3; const x = -1.15 + col * 1.15 + (row ? 0.25 : -0.1); const y = row ? 2.17 : 1.47;
    const fr = new THREE.Group(); fr.position.set(x, y, 0.02); fr.rotation.x = -0.12;
    fr.add(box(certW + 0.06, certH + 0.06, 0.03, psxMat({ color: C('#4a2a14') }), 0, 0, -0.02));
    const img = new THREE.Mesh(new THREE.PlaneGeometry(certW, certH), psxMat({ map: TX.imageTex(c.image.replace('/certs/', '/certs/thumb/')), flat: true })); img.position.z = 0.0; fr.add(img);
    fr.userData.cert = c.id; shelf.add(fr); clickables.push({ object: fr, section: 'achievements', cert: c.id });
  });
  // a small trophy cup for flavour
  const cup = new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.07, 0.02], [0.02, 0.04], [0.02, 0.1], [0.08, 0.14], [0.1, 0.24], [0.0, 0.2]].map(([a, b]) => new THREE.Vector2(a, b)), 10);
  const trophy = new THREE.Mesh(cup, psxMat({ color: C('#d9a441') })); trophy.position.set(1.55, 1.28, 0.02); shelf.add(trophy);
  clickables.push({ object: shelf, section: 'achievements' });

  // ---------- CRT TV (promo) ----------
  const tv = new THREE.Group(); tv.position.set(inW / 2 - 0.75, 0, -inD / 2 + 0.85); tv.rotation.y = -0.75; room.add(tv);
  tv.add(box(0.9, 0.5, 0.6, tabM, 0, 0.25, 0));
  tv.add(box(0.82, 0.62, 0.62, psxMat({ color: C('#3d3a34') }), 0, 0.82, 0));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, map: { value: TX.tvScreenTex(128) } }, fog: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float t; uniform sampler2D map; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); } void main(){ vec3 c = texture2D(map, vUv).rgb; float n = h(floor(vUv*vec2(90.,60.)) + floor(t*24.)); c = mix(c, vec3(n), 0.18); c *= 0.85 + 0.15*sin(vUv.y*240. + t*8.); vec2 d = vUv-0.5; c *= 1.0 - dot(d,d)*1.4; gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0); }',
  }));
  scr.position.set(0, 0.84, 0.312); tv.add(scr);
  tv.add(box(0.06, 0.06, 0.02, psxMat({ color: C('#b9b2a2') }), 0.33, 0.6, 0.315));
  const tvGlow = new THREE.PointLight(C('#9fd3c7'), 1.2, 3, 2); tvGlow.position.set(0, 0.9, 0.7); tv.add(tvGlow);
  update.push((time) => { scr.material.uniforms.t.value = time; });
  clickables.push({ object: tv, section: 'promo' });

  // ---------- rotary phone on a side table (contact) ----------
  const ph = new THREE.Group(); ph.position.set(-inW / 2 + 0.7, 0, inD / 2 - 0.9); room.add(ph);
  ph.add(box(0.6, 0.7, 0.5, tabM, 0, 0.35, 0));
  const red = psxMat({ color: C('#8a2a1c') });
  ph.add(box(0.26, 0.1, 0.22, red, 0, 0.75, 0));
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 10), psxMat({ color: C('#efe6d2') })); dial.position.set(0, 0.81, 0.03); ph.add(dial);
  const handset = box(0.3, 0.05, 0.06, red, 0, 0.84, -0.06); ph.add(handset);
  // little letters tray = "mail"
  ph.add(box(0.18, 0.02, 0.12, psxMat({ color: C('#efe6d2') }), 0.16, 0.71, 0.12));
  clickables.push({ object: ph, section: 'contact' });

  // shelf of books + plant for life
  const bk = new THREE.Group(); bk.position.set(inW / 2 - 0.25, 0, 1.3); room.add(bk);
  bk.add(box(0.36, 1.8, 1.2, tabM, 0, 0.9, 0));
  const bookCols = ['#8a3a1c', '#2f6f8f', '#5b8a5a', '#d9a441', '#6a5aa0', '#3a2616'];
  for (let s = 0; s < 3; s++) for (let i = 0; i < 7; i++) { const h = TX.rand(0.22, 0.32); bk.add(box(0.24, h, 0.1, psxMat({ color: C(bookCols[(i + s) % 6]) }), -0.02, 0.35 + s * 0.55 + h / 2, -0.45 + i * 0.14)); }

  // Only one "half" of the world is drawn at a time: outside OR inside the cabin.
  const outdoor = [sky, ground, roadMesh, trunks, crowns, rocks, car, cabin, porchLight, post, sign, ...signs.map((s) => s.group)];
  const api = {};
  const setInterior = (inside) => { outdoor.forEach((o) => { o.visible = !inside; }); room.visible = inside; scene.fog.near = inside ? 30 : 14; api.onInterior?.(inside); };
  const setDensity = (frac) => { trunks.count = crowns.count = Math.max(1, Math.floor(placed * frac)); rocks.count = Math.max(1, Math.floor(tier.rocks * frac)); };
  update.push((time, dt, camera) => { if (camera) sky.position.copy(camera.position); });
  return Object.assign(api, { treesXZ, signs, setInterior, setDensity, clickables, update, car, carState, placeCarOnRoad, boards, room, cabin, setTheme, lamp, porchLight, sun, hemi, dice, tv });
}

// helper used by other modules (e.g. games) to get a psx material
export { psxMat, psxify };
