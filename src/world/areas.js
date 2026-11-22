import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat, C, box, shadowy, labelTex } from './materials.js';
import { plaqueTex, standee } from './plaque.js';
import { chessTex, snakesTex, ludoTex, planks, rand } from '../stage/textures.js';
import { makePiece } from '../stage/games3d.js';
import { profile, aboutZones, skills, journey, projects, certificates } from '../content.js';
import { MILESTONES } from '../games/snakes.js';

export const GROUP_COLORS = { Unreal: '#2f6f8f', Unity: '#a8462a', 'Three.js': '#5b8a5a', Systems: '#6a5aa0', Motion: '#c88a1c' };
const Y = new THREE.Vector3(0, 1, 0);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Areas live far apart in one scene; only the active one is visible.
export const OFFS = { outdoor: 0, hut: 300, projects: 600, journey: 900, about: 1200, skills: 1500, trophy: 1800, house: 2100 };
export const HUT = V(0, 0, -30); // hut position outdoors
export const ROAD = new THREE.CatmullRomCurve3([V(5, 0, 52), V(12, 0, 30), V(-7, 0, 10), V(4, 0, -10), V(0, 0, -21)], false, 'catmullrom', 0.45);

export function blocked(colliders, x, z, r) {
  for (const c of colliders) {
    if (c.off) continue;
    if (c.ring) { if (Math.hypot(x - c.x, z - c.z) > c.ring - r) return true; continue; }
    if (c.inside) { if (x < c.minX + r || x > c.maxX - r || z < c.minZ + r || z > c.maxZ - r) return true; continue; }
    if (c.r !== undefined) { const dx = x - c.x; const dz = z - c.z; if (dx * dx + dz * dz < (c.r + r) * (c.r + r)) return true; }
    else if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return true;
  }
  return false;
}
const boxCol = (cx, cz, hw, hd) => ({ minX: cx - hw, maxX: cx + hw, minZ: cz - hd, maxZ: cz + hd });
function area(id, extra = {}) { return { id, group: new THREE.Group(), colliders: [], interactables: [], update: [], ...extra }; }

// ======================================================================
export function buildAreas(scene, tier) {
  const hi = tier.name === 'Full';
  const areas = {};

  // ---------- shared sky + light ----------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(280, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: C('#2a3d63') }, mid: { value: C('#b9805f') }, sun: { value: C('#f3cf8a') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 sun; varying vec3 vP; void main(){ float h = vP.y; vec3 c = mix(mid, top, smoothstep(-0.02, 0.32, h)); float s = pow(max(dot(normalize(vec3(-0.6,0.18,0.5)), vP), 0.0), 24.0); c = mix(c, sun, s*0.9); gl_FragColor = vec4(c, 1.0); }',
  }));
  sky.frustumCulled = false; scene.add(sky);
  scene.fog = new THREE.Fog(C('#5b5a63'), 50, 160);
  const hemi = new THREE.HemisphereLight(C('#b4c6e0'), C('#4a3a2a'), 1.25); scene.add(hemi);
  const sun = new THREE.DirectionalLight(C('#ffc58a'), 2.2);
  if (hi) { sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera; sc.left = sc.bottom = -20; sc.right = sc.top = 20; sc.near = 1; sc.far = 90; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03; }
  scene.add(sun, sun.target);
  const skyCols = { dusk: ['#2a3d63', '#b9805f', '#f3cf8a'], day: ['#5f9ccf', '#bfe0f0', '#f6efd8'] };
  const setTheme = (t) => { const c = skyCols[t] || skyCols.dusk; sky.material.uniforms.top.value.set(c[0]); sky.material.uniforms.mid.value.set(c[1]); sky.material.uniforms.sun.value.set(c[2]); scene.fog.color.set(t === 'day' ? '#b9d3df' : '#5b5a63'); hemi.intensity = t === 'day' ? 1.8 : 1.25; sun.intensity = t === 'day' ? 2.8 : 2.2; };

  const grassMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  function grassDisc(radius, segs = 40) {
    const g = new THREE.CircleGeometry(radius, segs, 0, Math.PI * 2); g.rotateX(-Math.PI / 2); const cols = [];
    for (let i = 0; i < g.attributes.position.count; i++) { const k = rand(0, 1); const c = C(k < 0.5 ? '#58703c' : k < 0.85 ? '#4e6636' : '#667a40'); cols.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); const m = new THREE.Mesh(g, grassMat); m.receiveShadow = hi; return m;
  }
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.24, 1.6, 5).translate(0, 0.8, 0);
  const pineGeo = mergeGeometries([new THREE.ConeGeometry(1.5, 2.6, 7).translate(0, 2.5, 0), new THREE.ConeGeometry(1.15, 2.1, 7).translate(0, 3.6, 0), new THREE.ConeGeometry(0.75, 1.6, 7).translate(0, 4.6, 0)]);
  const roundGeo = new THREE.IcosahedronGeometry(1.5, 0).translate(0, 2.6, 0);
  const pal = ['#2f5a3a', '#3c6a3e', '#2a4f44', '#4a7040', '#36603a', '#5a7a3a'].map(C);
  /** instanced trees at the given positions; adds a collider for each */
  function forest(a, spots) {
    const n = spots.length; const trunks = new THREE.InstancedMesh(trunkGeo, mat('#5a3d28'), n);
    const pines = new THREE.InstancedMesh(pineGeo, new THREE.MeshLambertMaterial({ flatShading: true }), n); const rounds = new THREE.InstancedMesh(roundGeo, new THREE.MeshLambertMaterial({ flatShading: true }), n);
    const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const s3 = new THREE.Vector3(); let np = 0; let nr = 0;
    spots.forEach(([x, z, s], i) => { q.setFromAxisAngle(Y, rand(0, 6.28)); s3.set(s, s * rand(0.9, 1.25), s); m4.compose(V(x, 0, z), q, s3); trunks.setMatrixAt(i, m4); if (rand(0, 1) < 0.7) { pines.setMatrixAt(np, m4); pines.setColorAt(np, pal[np % 4]); np++; } else { rounds.setMatrixAt(nr, m4); rounds.setColorAt(nr, pal[2 + (nr % 4)]); nr++; } a.colliders.push({ x, z, r: 0.6 * s }); });
    pines.count = np; rounds.count = nr; [trunks, pines, rounds].forEach((im) => { im.castShadow = hi; a.group.add(im); });
  }
  function ringSpots(cx, cz, rMin, rMax, n, avoid = () => false) { const out = []; let g = 0; while (out.length < n && g++ < n * 30) { const an = rand(0, 6.28); const r = rMin + rand(0, 1) * (rMax - rMin); const x = cx + Math.cos(an) * r; const z = cz + Math.sin(an) * r; if (!avoid(x, z)) out.push([x, z, rand(0.8, 1.4)]); } return out; }

  // ---------- portal (exit / enter glowing ring) ----------
  function portal(a, pos, label, kind, color = '#e8b25a') {
    const g = new THREE.Group(); g.position.copy(pos); a.group.add(g);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.35, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); beam.position.y = 1.5; g.add(beam);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.55), new THREE.MeshBasicMaterial({ map: labelTex(label, { w: 640, h: 96 }) })); lab.position.y = 3.3; g.add(lab);
    a.update.push((t, dt, cam) => { ring.rotation.z = t * 0.6; beam.material.opacity = 0.1 + Math.sin(t * 2) * 0.04; if (cam) lab.lookAt(cam.position.x, lab.getWorldPosition(new THREE.Vector3()).y, cam.position.z); });
    a.interactables.push({ pos: pos.clone(), radius: 1.8, kind, label });
    return g;
  }

  // ======================= OUTDOOR =======================
  {
    const a = area('outdoor'); areas.outdoor = a; scene.add(a.group);
    const gGeo = new THREE.PlaneGeometry(240, 240, 56, 56); gGeo.rotateX(-Math.PI / 2); const gp = gGeo.attributes.position; const gc = [];
    for (let i = 0; i < gp.count; i++) { const x = gp.getX(i); const z = gp.getZ(i); const r = Math.hypot(x, z + 5); const hill = Math.max(0, (r - 70) / 30); gp.setY(i, hill * (2 + Math.sin(x * 0.07) * Math.cos(z * 0.06) * 3)); const k = rand(0, 1); const c = C(k < 0.45 ? '#58703c' : k < 0.8 ? '#4e6636' : '#667a40'); gc.push(c.r, c.g, c.b); }
    gGeo.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3)); gGeo.computeVertexNormals();
    const ground = new THREE.Mesh(gGeo, grassMat); ground.receiveShadow = hi; a.group.add(ground);
    // road ribbon
    const seg = 120; const rv = []; const ri = []; const half = 2.6;
    for (let i = 0; i <= seg; i++) { const t = i / seg; const p = ROAD.getPointAt(t); const tg = ROAD.getTangentAt(t); const n = V(-tg.z, 0, tg.x); rv.push(p.x + n.x * half, 0.03, p.z + n.z * half, p.x - n.x * half, 0.03, p.z - n.z * half); if (i < seg) { const k = i * 2; ri.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
    const rGeo = new THREE.BufferGeometry(); rGeo.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3)); rGeo.setIndex(ri); rGeo.computeVertexNormals();
    const road = new THREE.Mesh(rGeo, new THREE.MeshLambertMaterial({ color: '#4a4440' })); road.receiveShadow = hi; a.group.add(road);
    const roadPts = ROAD.getSpacedPoints(60); const distRoad = (x, z) => { let d = 1e9; for (const p of roadPts) d = Math.min(d, Math.hypot(p.x - x, p.z - z)); return d; };
    // dashed centre line
    const dashes = []; for (let i = 0; i < 60; i += 2) { const p = ROAD.getPointAt(i / 60); const tg = ROAD.getTangentAt(i / 60); const d = new THREE.PlaneGeometry(0.18, 1.6); d.rotateX(-Math.PI / 2); d.rotateY(Math.atan2(tg.x, tg.z)); d.translate(p.x, 0.05, p.z); dashes.push(d); }
    a.group.add(new THREE.Mesh(mergeGeometries(dashes), new THREE.MeshBasicMaterial({ color: '#c9a24a' })));
    // clearing at the landing + around the hut
    const clear = (x, z) => distRoad(x, z) < 5 || Math.hypot(x - 2, z - 46) < 11 || Math.hypot(x - HUT.x, z - HUT.z) < 13;
    forest(a, ringSpots(0, 10, 9, 105, tier.trees, clear));
    a.colliders.push({ x: 0, z: 5, ring: 108 });
    // rocks
    const rockN = Math.floor(tier.trees / 6); const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.7, 0), mat('#7a776e'), rockN); const m4 = new THREE.Matrix4(); let rk = 0;
    for (let i = 0; i < rockN * 5 && rk < rockN; i++) { const x = rand(-90, 90); const z = rand(-90, 90); if (clear(x, z)) continue; const s = rand(0.4, 1.3); m4.compose(V(x, 0.15, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(0, 3), rand(0, 3), 0)), V(s, s * 0.7, s)); rocks.setMatrixAt(rk++, m4); if (s > 0.9) a.colliders.push({ x, z, r: 0.6 * s }); }
    rocks.count = rk; rocks.castShadow = hi; a.group.add(rocks);

    // ----- the hut (exterior) -----
    const hut = new THREE.Group(); hut.position.copy(HUT); a.group.add(hut);
    const logTex = planks(128, '#6a4a30', '#3a2414'); logTex.wrapS = logTex.wrapT = THREE.RepeatWrapping; logTex.repeat.set(4, 1.5); logTex.magFilter = THREE.LinearFilter;
    const wallM = new THREE.MeshLambertMaterial({ map: logTex }); const W = 12; const D = 9; const H = 3.4;
    hut.add(shadowy(box(W, H, 0.3, wallM, 0, H / 2, -D / 2), true, true), shadowy(box(0.3, H, D, wallM, -W / 2, H / 2, 0), true, true), shadowy(box(0.3, H, D, wallM, W / 2, H / 2, 0), true, true));
    const fw = (W - 1.6) / 2; hut.add(shadowy(box(fw, H, 0.3, wallM, -(0.8 + fw / 2), H / 2, D / 2), true, true), shadowy(box(fw, H, 0.3, wallM, 0.8 + fw / 2, H / 2, D / 2), true, true), shadowy(box(1.6, H - 2.4, 0.3, wallM, 0, 2.4 + (H - 2.4) / 2, D / 2)));
    const roofM = mat('#3b2a22'); const rl = Math.hypot(W / 2 + 0.6, 2.2);
    const r1 = shadowy(box(rl, 0.2, D + 1.2, roofM)); r1.position.set(-(W / 4 + 0.3), H + 1.1, 0); r1.rotation.z = Math.atan2(2.2, W / 2 + 0.6); hut.add(r1); const r2 = r1.clone(); r2.position.x *= -1; r2.rotation.z *= -1; hut.add(r2);
    const gable = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, 2.2)]));
    [D / 2 + 0.16, -D / 2 - 0.16].forEach((z, i) => { const m = new THREE.Mesh(gable, new THREE.MeshLambertMaterial({ map: logTex, side: THREE.DoubleSide })); m.position.set(0, H, z); if (i) m.rotation.y = Math.PI; hut.add(m); });
    const doorM = mat('#4a2c18'); const door = box(1.5, 2.35, 0.1, doorM); door.geometry.translate(0.75, 1.175, 0); door.position.set(-0.78, 0, D / 2 + 0.1); door.rotation.y = -1.6; hut.add(door);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.3), new THREE.MeshBasicMaterial({ color: '#ffb35c' })); glow.position.set(0, 1.15, D / 2 - 0.05); hut.add(glow);
    hut.add(shadowy(box(4.4, 0.25, 2.2, mat('#5a3a22'), 0, 0.12, D / 2 + 1.1), false, true));
    const winM = new THREE.MeshBasicMaterial({ color: '#ffcf7a' }); hut.add(box(1.3, 1.0, 0.05, winM, -3.5, 1.8, D / 2 + 0.17), box(1.3, 1.0, 0.05, winM, 3.5, 1.8, D / 2 + 0.17), box(0.05, 1.0, 1.4, winM, -W / 2 - 0.17, 1.8, 0));
    hut.add(shadowy(box(0.9, 2.4, 0.9, mat('#5d5a52'), 3.2, H + 1.8, -1.5)));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.7), new THREE.MeshBasicMaterial({ map: labelTex('THE HUT · GAME NIGHT', { w: 768, h: 128 }) })); sign.position.set(0, H + 0.55, D / 2 + 0.2); hut.add(sign);
    const porch = new THREE.PointLight(C('#ffb45a'), 10, 12, 1.6); porch.position.set(0, 2.8, D / 2 + 1.2); hut.add(porch);
    a.colliders.push(boxCol(HUT.x, HUT.z, W / 2 + 0.3, D / 2 + 0.3));
    a.interactables.push({ pos: V(HUT.x, 0, HUT.z + D / 2 + 1.6), radius: 2.4, kind: 'enterHut', label: 'the hut' });
    // signpost at the landing
    const sp = new THREE.Group(); sp.position.set(-3, 0, 41); a.group.add(sp); sp.add(shadowy(box(0.16, 2.6, 0.16, mat('#4a3222'), 0, 1.3, 0)));
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.06), new THREE.MeshBasicMaterial({ map: labelTex('THE HUT  ›', { w: 384, h: 72 }) })); arm.position.set(0.9, 2.3, 0); arm.rotation.y = -0.3; sp.add(arm);
    a.colliders.push({ x: -3, z: 41, r: 0.3 });
    a.spawn = { pos: V(0.5, 0, 46.5), yaw: 0 };
    a.hut = hut; a.objective = HUT.clone();
  }

  // ======================= HUT INTERIOR =======================
  const boards = {}; // mini boards on the table (click to enter) and giant boards (games)
  {
    const a = area('hut', { interior: true }); areas.hut = a; scene.add(a.group); const O = OFFS.hut; a.group.position.x = O;
    const inW = 14; const inD = 10; const inH = 3.6;
    const wallTex = planks(128, '#7a5534', '#4a2e18', true); wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(6, 1.6); wallTex.magFilter = THREE.LinearFilter;
    const floorTex = planks(128, '#5e3d24', '#2e1a0c'); floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(5, 4); floorTex.magFilter = THREE.LinearFilter;
    const wm = new THREE.MeshLambertMaterial({ map: wallTex, side: THREE.BackSide }); const room = new THREE.Mesh(new THREE.BoxGeometry(inW, inH, inD), [wm, wm, new THREE.MeshLambertMaterial({ color: '#3b2a1e', side: THREE.BackSide }), new THREE.MeshLambertMaterial({ map: floorTex, side: THREE.BackSide }), wm, wm]);
    room.position.y = inH / 2; room.receiveShadow = true; a.group.add(room);
    for (let i = -2; i <= 2; i++) a.group.add(box(inW, 0.2, 0.25, mat('#3a2414'), 0, inH - 0.12, i * 2));
    const rug = new THREE.Mesh(new THREE.CircleGeometry(3.2, 12), mat('#7a3a24')); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.01, -0.5); rug.receiveShadow = true; a.group.add(rug);
    const lamp = new THREE.PointLight(C('#ffc27a'), 22, 14, 1.4); lamp.position.set(0, 2.9, -0.5); a.group.add(lamp);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.5, 10, 1, true), mat('#2f4a3a', { side: THREE.DoubleSide })); shade.position.set(0, 3.05, -0.5); a.group.add(shade);
    const fill = new THREE.PointLight(C('#ff9a5a'), 6, 14, 1.5); fill.position.set(-5, 2.2, 3); a.group.add(fill);
    a.bounds = { minX: O - inW / 2 + 0.2, maxX: O + inW / 2 - 0.2, minZ: -inD / 2 + 0.2, maxZ: inD / 2 - 0.2, maxY: inH - 0.3 }; a.colliders.push({ inside: true, ...a.bounds });
    // table
    const T = { w: 4.2, d: 2.4, h: 0.85, z: -0.6 };
    const topTex = planks(128, '#7a5030', '#3e2412'); topTex.magFilter = THREE.LinearFilter;
    a.group.add(shadowy(box(T.w, 0.1, T.d, new THREE.MeshLambertMaterial({ map: topTex }), 0, T.h - 0.05, T.z), true, true));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => a.group.add(shadowy(box(0.14, T.h - 0.1, 0.14, mat('#3e2412'), x * (T.w / 2 - 0.2), (T.h - 0.1) / 2, T.z + z * (T.d / 2 - 0.2)))));
    a.colliders.push(boxCol(O, T.z, T.w / 2 + 0.15, T.d / 2 + 0.15));
    function mini(id, texture, size, x, z, rot, label) {
      const g = new THREE.Group(); g.position.set(x, T.h + 0.002, T.z + z); g.rotation.y = rot; a.group.add(g);
      g.add(shadowy(box(size + 0.03, 0.04, size + 0.03, mat('#2a170b'), 0, 0.02, 0)));
      const f = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ map: texture, polygonOffset: true, polygonOffsetFactor: -4 })); f.rotation.x = -Math.PI / 2; f.position.y = 0.045; g.add(f);
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.9, size * 0.17), new THREE.MeshBasicMaterial({ map: labelTex(label, { w: 512, h: 96 }) })); tag.position.set(0, 0.32, -size / 2 + 0.02); tag.rotation.x = -0.3; g.add(tag);
      g.userData.boardId = id; boards['mini_' + id] = g;
      const front = z >= 0; const px = x === 0 ? 0 : x * 1.05; const pz = T.z + (front ? T.d / 2 + 0.75 : -T.d / 2 - 0.75);
      a.interactables.push({ pos: V(O + px, 0, pz), radius: 1.3, kind: 'board', id, label, mini: g });
      return g;
    }
    const projTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#d8e3cf'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#7aa36a'; g.fillRect(90, 90, 332, 332); const cols = Object.values(GROUP_COLORS); for (let i = 0; i < 12; i++) { const s = Math.floor(i / 3); const k = i % 3; g.save(); g.translate(256, 256); g.rotate(s * Math.PI / 2); g.fillStyle = cols[i % cols.length]; g.fillRect(-150 + k * 100, 175, 80, 26); g.fillStyle = '#efe6d2'; g.fillRect(-150 + k * 100, 201, 80, 50); g.restore(); } g.save(); g.translate(256, 256); g.rotate(-Math.PI / 4); g.fillStyle = '#8a3a1c'; g.fillRect(-140, -28, 280, 56); g.fillStyle = '#fff'; g.font = 'bold 40px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PROJECTS', 0, 2); g.restore(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    mini('projects', projTex, 1.0, 0, 0, 0, 'PROJECTS');
    mini('skills', chessTex(256), 0.75, -1.45, -0.42, 0.06, 'SKILLS · CHESS');
    mini('about', ludoTex(256), 0.75, -1.45, 0.48, -0.08, 'ABOUT · LUDO');
    mini('journey', snakesTex(512, MILESTONES), 0.8, 1.45, -0.42, -0.05, 'JOURNEY');
    // trophy hall door (back wall) and exit door (front wall)
    const tdoor = new THREE.Group(); tdoor.position.set(4.6, 0, -inD / 2 + 0.06); a.group.add(tdoor);
    tdoor.add(box(1.6, 2.5, 0.08, mat('#5a3418'), 0, 1.25, 0)); tdoor.add(box(1.9, 0.12, 0.12, mat('#d9a441'), 0, 2.6, 0.02));
    const tsign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), new THREE.MeshBasicMaterial({ map: labelTex('TROPHY HALL', { w: 512, h: 112 }) })); tsign.position.set(0, 2.95, 0.05); tdoor.add(tsign);
    a.interactables.push({ pos: V(O + 4.6, 0, -inD / 2 + 1.1), radius: 1.6, kind: 'trophy', label: 'Trophy Hall' });
    const xdoor = new THREE.Group(); xdoor.position.set(0, 0, inD / 2 - 0.06); a.group.add(xdoor);
    xdoor.add(box(1.6, 2.5, 0.08, mat('#4a2c18'), 0, 1.25, 0)); const xg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ color: '#c0703f' })); xg.position.set(0, 1.9, -0.05); xg.rotation.y = Math.PI; xdoor.add(xg);
    a.interactables.push({ pos: V(O, 0, inD / 2 - 1.0), radius: 1.5, kind: 'exitHut', label: 'outside' });
    // CRT TV (promo) in the back-left corner
    const tv = new THREE.Group(); tv.position.set(-5.6, 0, -3.8); tv.rotation.y = 0.75; a.group.add(tv);
    tv.add(shadowy(box(1.3, 0.7, 0.8, mat('#5a3418'), 0, 0.35, 0)), shadowy(box(1.1, 0.85, 0.8, mat('#3d3a34'), 0, 1.13, 0)));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.62), new THREE.ShaderMaterial({ uniforms: { t: { value: 0 } }, fog: false, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }', fragmentShader: 'uniform float t; varying vec2 vUv; float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);} void main(){ vec3 c=vec3(0.1,0.16,0.18)+h(floor(vUv*vec2(90.,60.))+floor(t*20.))*0.08; float b=step(0.42,vUv.y)*step(vUv.y,0.58)*step(0.2,vUv.x)*step(vUv.x,0.8); c=mix(c,vec3(0.91,0.7,0.35),b*0.9); gl_FragColor=vec4(pow(c,vec3(2.2)),1.0);} ' }));
    scr.position.set(0, 1.15, 0.41); tv.add(scr); a.update.push((t) => { scr.material.uniforms.t.value = t; });
    const tvl = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.3), new THREE.MeshBasicMaterial({ map: labelTex('PROMO', { w: 384, h: 88 }) })); tvl.position.set(0, 1.8, 0.4); tv.add(tvl);
    a.colliders.push({ x: O - 5.6, z: -3.8, r: 0.9 });
    a.interactables.push({ pos: V(O - 4.8, 0, -3.0), radius: 1.6, kind: 'promo', label: 'Promo video' });
    // old telephone on a side table (front-left): rings when you walk near
    const ph = new THREE.Group(); ph.position.set(-5.6, 0, 3.2); a.group.add(ph);
    ph.add(shadowy(box(0.9, 0.85, 0.7, mat('#5a3418'), 0, 0.425, 0)));
    const red = mat('#8a2a1c'); const base = shadowy(box(0.42, 0.16, 0.34, red, 0, 0.93, 0)); ph.add(base);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 14), mat('#efe6d2')); dial.position.set(0, 1.02, 0.05); ph.add(dial);
    const handset = new THREE.Group(); handset.position.set(0, 1.08, -0.06); ph.add(handset);
    handset.add(box(0.46, 0.07, 0.09, red, 0, 0, 0), box(0.1, 0.1, 0.12, red, -0.21, -0.03, 0), box(0.1, 0.1, 0.12, red, 0.21, -0.03, 0));
    const phl = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.3), new THREE.MeshBasicMaterial({ map: labelTex('CONTACT', { w: 384, h: 88 }) })); phl.position.set(0, 1.7, 0); ph.add(phl);
    a.colliders.push({ x: O - 5.6, z: 3.2, r: 0.6 });
    a.interactables.push({ pos: V(O - 4.6, 0, 3.2), radius: 1.7, kind: 'phone', label: 'telephone' });
    a.phone = { group: ph, handset, pos: V(O - 5.6, 0, 3.2), ringing: false };
    a.update.push((t, dt, cam, ctx) => { const ring = a.phone.ringing; handset.position.y = 1.08 + (ring ? Math.abs(Math.sin(t * 40)) * 0.04 : 0); handset.rotation.z = ring ? Math.sin(t * 50) * 0.08 : 0; base.rotation.z = ring ? Math.sin(t * 45) * 0.03 : 0; void ctx; });
    // bookshelf + sofa for life
    const bk = new THREE.Group(); bk.position.set(6.6, 0, 1.2); a.group.add(bk); bk.add(shadowy(box(0.5, 2.4, 2.2, mat('#5a3418'), 0, 1.2, 0)));
    const bc = ['#8a3a1c', '#2f6f8f', '#5b8a5a', '#d9a441', '#6a5aa0', '#3a2616']; for (let s = 0; s < 4; s++) for (let i = 0; i < 9; i++) { const h = rand(0.26, 0.38); bk.add(box(0.32, h, 0.16, mat(bc[(i + s) % 6]), -0.04, 0.3 + s * 0.55 + h / 2, -0.9 + i * 0.21)); }
    a.colliders.push(boxCol(O + 6.6, 1.2, 0.35, 1.2));
    const sofa = new THREE.Group(); sofa.position.set(3.6, 0, 3.5); sofa.rotation.y = Math.PI + 0.3; a.group.add(sofa); sofa.add(shadowy(box(2.4, 0.5, 0.9, mat('#2f4a3a'), 0, 0.35, 0)), shadowy(box(2.4, 0.7, 0.25, mat('#2f4a3a'), 0, 0.75, -0.35)));
    a.colliders.push({ x: O + 3.6, z: 3.5, r: 1.2 });
    a.spawn = { pos: V(O, 0, 2.6), yaw: Math.PI }; a.tableCenter = V(O, T.h, T.z);
  }

  // ---------- helper: a board world (grass island with hedge ring and an exit portal) ----------
  function boardWorld(id, radius = 30) {
    const a = area(id); areas[id] = a; scene.add(a.group); const O = OFFS[id]; a.origin = V(O, 0, 0);
    const g = grassDisc(radius + 14); g.position.set(O, 0, 0); a.group.add(g);
    // hedge ring = invisible wall
    const hedge = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.1, 0), mat('#3c6a3e'), 70); const m4 = new THREE.Matrix4();
    for (let i = 0; i < 70; i++) { const an = (i / 70) * Math.PI * 2; const s = rand(0.9, 1.3); m4.compose(V(O + Math.cos(an) * (radius + 1), 0.6, Math.sin(an) * (radius + 1)), new THREE.Quaternion(), V(s, s * 0.8, s)); hedge.setMatrixAt(i, m4); }
    hedge.castShadow = hi; a.group.add(hedge);
    forest(a, ringSpots(O, 0, radius + 4, radius + 13, 40)); a.colliders.splice(a.colliders.length - 40, 40); // scenery only (outside the hedge)
    a.colliders.push({ x: O, z: 0, ring: radius });
    portal(a, V(O + 7, 0, radius - 4), 'BACK TO THE HUT', 'exitBoard');
    a.spawn = { pos: V(O, 0, radius - 5), yaw: Math.PI };
    return a;
  }
  function giantBoard(a, id, tex, size, extra = {}) {
    const g = new THREE.Group(); g.position.copy(a.origin); a.group.add(g);
    g.add(shadowy(box(size + 1.2, 0.3, size + 1.2, mat('#3a2412'), 0, 0.15, 0), false, true));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ map: tex })); face.rotation.x = -Math.PI / 2; face.position.y = 0.31; face.receiveShadow = hi; g.add(face);
    boards[id] = { group: g, size, top: 0.31, face, ...extra }; return g;
  }

  // ======================= PROJECTS: Monopoly-style street =======================
  {
    const a = boardWorld('projects', 30); const O = a.origin; const S = 34;
    const g = new THREE.Group(); g.position.copy(O); a.group.add(g);
    g.add(shadowy(box(S, 0.2, S, mat('#d8e3cf'), 0, 0.1, 0), false, true)); const inner = box(S - 12, 0.22, S - 12, mat('#7aa36a'), 0, 0.11, 0); inner.receiveShadow = hi; g.add(inner);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.6), new THREE.MeshBasicMaterial({ map: labelTex('PROJECTS', { w: 640, h: 140, bg: '#8a3a1c' }) })); logo.rotation.x = -Math.PI / 2; logo.rotation.z = Math.PI / 4; logo.position.y = 0.24; g.add(logo);
    const half = S / 2 - 3; const sideLen = S - 12;
    a.houses = {};
    projects.forEach((p, i) => {
      const side = Math.floor(i / 3); const k = i % 3; const t = (k + 0.5) / 3 - 0.5;
      const local = [[t * sideLen, half], [half, -t * sideLen], [-t * sideLen, -half], [-half, t * sideLen]][side]; const rot = [0, Math.PI / 2, Math.PI, -Math.PI / 2][side];
      // houses face the inside of the square
      const b = new THREE.Group(); b.position.set(local[0], 0.2, local[1]); b.rotation.y = rot + Math.PI; g.add(b);
      const col = GROUP_COLORS[p.group] || '#555'; const h = p.featured ? 3.6 : 2.8;
      b.add(shadowy(box(3.6, h, 3.2, mat('#efe6d2'), 0, h / 2, 0), true, true));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.6, 4), mat(col)); roof.rotation.y = Math.PI / 4; roof.position.y = h + 0.8; roof.castShadow = hi; b.add(roof);
      b.add(box(1.0, 1.7, 0.06, mat('#4a2c18'), 0, 0.85, 1.61));
      b.add(box(0.7, 0.6, 0.05, new THREE.MeshBasicMaterial({ color: '#ffd08a' }), -1.15, 1.7, 1.61), box(0.7, 0.6, 0.05, new THREE.MeshBasicMaterial({ color: '#ffd08a' }), 1.15, 1.7, 1.61));
      if (p.image) { const tex = new THREE.TextureLoader().load(p.image); tex.colorSpace = THREE.SRGBColorSpace; const pic = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.85), new THREE.MeshBasicMaterial({ map: tex })); pic.position.set(0, h + 1.9, 1.3); pic.rotation.x = -0.12; b.add(pic); b.add(box(0.1, 1.2, 0.1, mat('#3a2616'), -1.25, h + 0.8, 1.3), box(0.1, 1.2, 0.1, mat('#3a2616'), 1.25, h + 0.8, 1.3)); }
      const nameT = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.5), new THREE.MeshBasicMaterial({ map: labelTex(p.name.replace(/\(.*\)|:.*$/g, '').trim().slice(0, 24), { w: 640, h: 92, bg: col }) })); nameT.position.set(0, h - 0.4, 1.62); b.add(nameT);
      const wp = O.clone().add(V(local[0], 0, local[1])); a.colliders.push({ x: wp.x, z: wp.z, r: 2.0 });
      const front = V(0, 0, 3.0).applyAxisAngle(Y, rot + Math.PI).add(wp);
      a.interactables.push({ pos: front, radius: 1.8, kind: 'house', id: p.id, label: p.name });
      a.houses[p.id] = { front, yaw: rot };
    });
  }
  // ======================= JOURNEY: Snakes & Ladders =======================
  {
    const a = boardWorld('journey', 22); const tex = snakesTex(1024, MILESTONES); tex.magFilter = THREE.LinearFilter;
    giantBoard(a, 'journey', tex, 20, { margin: 1 });
    a.spawn = { pos: V(OFFS.journey, 0, 15.5), yaw: Math.PI };
    // giant dice on a podium = start the game
    const pod = new THREE.Group(); pod.position.set(OFFS.journey - 13, 0, 8); a.group.add(pod);
    pod.add(shadowy(box(1.6, 0.6, 1.6, mat('#3a2412'), 0, 0.3, 0)));
    const dice = shadowy(box(1, 1, 1, mat('#efe6d2'), 0, 1.15, 0)); dice.rotation.set(0.4, 0.6, 0.2); pod.add(dice);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshBasicMaterial({ map: labelTex('ROLL TO PLAY', { w: 512, h: 96 }) })); pl.position.set(0, 2.3, 0); pod.add(pl);
    a.update.push((t, dt, cam) => { dice.rotation.y = t * 0.8; if (cam) pl.lookAt(cam.position.x, pl.getWorldPosition(new THREE.Vector3()).y, cam.position.z); });
    a.colliders.push({ x: OFFS.journey - 13, z: 8, r: 1.1 });
    a.interactables.push({ pos: V(OFFS.journey - 13, 0, 9.6), radius: 1.8, kind: 'playSnakes', label: 'Snakes & Ladders' });
  }
  // ======================= ABOUT: Ludo garden with plaques =======================
  {
    const a = boardWorld('about', 22); giantBoard(a, 'about', ludoTex(1024), 16);
    const O = OFFS.about; const homes = [[-5, -5], [5, -5], [5, 5], [-5, 5]];
    aboutZones.forEach((z, i) => {
      const [x, zz] = homes[i]; const tok = new THREE.Group(); tok.position.set(O + x, 0.31, zz); a.group.add(tok);
      tok.add(shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 0.5, 12), mat(z.color)))); tok.children[0].position.y = 0.25;
      const hd = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), mat(z.color))); hd.position.y = 0.9; tok.add(hd);
      const st = standee(plaqueTex([{ k: `About me · ${i + 1}/4` }, { h: z.title }, { t: z.text }], { accent: z.color }), 3.4, 2.1);
      st.position.set(O + x * 1.55, 0.31, zz * 1.55); st.lookAt(O, 0.31, 0); a.group.add(st);
      a.colliders.push({ x: O + x, z: zz, r: 0.75 }, { x: O + x * 1.55, z: zz * 1.55, r: 0.6 });
      a.interactables.push({ pos: V(O + x * 1.3, 0, zz * 1.3), radius: 2.2, kind: 'aboutPlaque', id: z.id, label: z.title, plaque: st });
    });
    const centre = standee(plaqueTex([{ k: profile.location }, { h: profile.name }, { t: profile.title }, { t: profile.tagline }, { li: 'BS Computer Science (Gaming & Animation), NED University · CGPA 3.605/4.00' }, { li: profile.availability }]), 4.2, 2.6);
    centre.position.set(O, 0.31, -1.2); a.group.add(centre); a.colliders.push({ x: O, z: -1.2, r: 0.8 });
    a.interactables.push({ pos: V(O, 0, 0.6), radius: 2.0, kind: 'aboutPlaque', id: 'profile', label: 'Profile', plaque: centre });
  }
  // ======================= SKILLS: chess plaza with statues =======================
  {
    const a = boardWorld('skills', 24); const tex = chessTex(512); tex.magFilter = THREE.NearestFilter; giantBoard(a, 'skills', tex, 16, { margin: 16 * 0.06 });
    const O = OFFS.skills; const spots = [[-12, -6], [-12, 3], [12, -6], [12, 3], [0, -12.5]];
    skills.forEach((sg, i) => {
      const [x, z] = spots[i]; const statue = makePiece({ king: 'k', queen: 'q', rook: 'r', bishop: 'b', knight: 'n' }[sg.piece], 'w', 1.5); statue.traverse((o) => { if (o.isMesh) o.castShadow = hi; });
      const ped = shadowy(box(1.6, 0.5, 1.6, mat('#6b6458'), O + x, 0.25, z)); a.group.add(ped); statue.position.set(O + x, 0.5, z); a.group.add(statue);
      const st = standee(plaqueTex([{ k: 'Skills' }, { h: sg.group }, ...sg.items.slice(0, 4).map(([n]) => ({ li: n }))]), 3.2, 2.0);
      st.position.set(O + x + (x === 0 ? 2.6 : 0), 0, z + (x === 0 ? 0 : 2.6)); st.lookAt(O, 0, 0); a.group.add(st);
      a.colliders.push({ x: O + x, z, r: 1.0 }, { x: st.position.x, z: st.position.z, r: 0.6 });
      a.interactables.push({ pos: V(O + x * 0.8, 0, z * 0.8 + (x === 0 ? 1.5 : 1.3)), radius: 2.0, kind: 'skillPlaque', id: sg.piece, label: sg.group, plaque: st });
    });
    const pod = new THREE.Group(); pod.position.set(O, 0, 11.5); a.group.add(pod); pod.add(shadowy(box(1.4, 1.0, 0.8, mat('#3a2412'), 0, 0.5, 0)));
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshBasicMaterial({ map: labelTex('PLAY CHESS VS AI', { w: 512, h: 96 }) })); pl.position.set(0, 1.5, 0.41); pod.add(pl);
    a.colliders.push({ x: O, z: 11.5, r: 0.8 });
    a.interactables.push({ pos: V(O, 0, 13), radius: 1.6, kind: 'playChess', label: 'Chess vs AI' });
  }
  // ======================= TROPHY HALL =======================
  {
    const a = area('trophy', { interior: true }); areas.trophy = a; scene.add(a.group); const O = OFFS.trophy; a.origin = V(O, 0, 0);
    const W = 16; const D = 11; const H = 4.6;
    const room = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [mat('#6b4a2e', { side: THREE.BackSide }), mat('#6b4a2e', { side: THREE.BackSide }), mat('#2a2018', { side: THREE.BackSide }), mat('#a8916a', { side: THREE.BackSide }), mat('#6b4a2e', { side: THREE.BackSide }), mat('#6b4a2e', { side: THREE.BackSide })]);
    room.position.set(O, H / 2, 0); room.receiveShadow = true; a.group.add(room);
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(3, D - 1), mat('#7a2a1c')); carpet.rotation.x = -Math.PI / 2; carpet.position.set(O, 0.01, 0); a.group.add(carpet);
    { const l = new THREE.PointLight(C('#ffd08a'), 25, 18, 1.4); l.position.set(O, 3.8, 0); a.group.add(l); }
    certificates.forEach((c, i) => {
      const leftWall = i < 3; const k = i % 3; const z = -3 + k * 3; const x = leftWall ? O - W / 2 + 0.1 : O + W / 2 - 0.1;
      const fr = new THREE.Group(); fr.position.set(x, 2.3, z); fr.rotation.y = leftWall ? Math.PI / 2 : -Math.PI / 2; a.group.add(fr);
      fr.add(box(2.2, 1.7, 0.1, mat('#4a2a14'), 0, 0, 0)); const tex = new THREE.TextureLoader().load(c.image.replace('/certs/', '/certs/thumb/')); tex.colorSpace = THREE.SRGBColorSpace;
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 1.45), new THREE.MeshLambertMaterial({ map: tex })); pic.position.z = 0.06; fr.add(pic);
      const cap = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.62), new THREE.MeshBasicMaterial({ map: plaqueTex([{ h: c.title }, { t: c.issuer + (c.date ? ' · ' + c.date : '') }], { w: 768, h: 216, pad: 28 }) })); cap.position.set(0, -1.25, 0.06); fr.add(cap);
      const spot = new THREE.SpotLight(C('#fff1d0'), 18, 6, 0.5, 0.5, 1.2); spot.position.set(x + (leftWall ? 1.5 : -1.5), 4.2, z); spot.target = fr; a.group.add(spot);
      a.interactables.push({ pos: V(x + (leftWall ? 1.6 : -1.6), 0, z), radius: 1.6, kind: 'cert', id: c.id, label: c.title });
    });
    const cup = new THREE.LatheGeometry([[0, 0], [0.4, 0], [0.4, 0.15], [0.14, 0.3], [0.14, 0.7], [0.45, 0.9], [0.6, 1.5], [0, 1.3]].map(([a1, b]) => new THREE.Vector2(a1, b)), 16);
    const ped = shadowy(box(1.2, 1.0, 1.2, mat('#3a2616'), O, 0.5, -3.5)); a.group.add(ped); const trophy = shadowy(new THREE.Mesh(cup, new THREE.MeshLambertMaterial({ color: '#e0b04a' }))); trophy.position.set(O, 1.0, -3.5); a.group.add(trophy);
    a.update.push((t) => { trophy.rotation.y = t * 0.5; });
    a.colliders.push({ x: O, z: -3.5, r: 0.9 });
    a.bounds = { minX: O - W / 2 + 0.2, maxX: O + W / 2 - 0.2, minZ: -D / 2 + 0.2, maxZ: D / 2 - 0.2, maxY: H - 0.3 }; a.colliders.push({ inside: true, ...a.bounds });
    portal(a, V(O + 5, 0, D / 2 - 1.8), 'BACK TO THE HUT', 'exitBoard');
    a.spawn = { pos: V(O, 0, D / 2 - 3.2), yaw: Math.PI };
  }
  // ======================= HOUSE INTERIOR (re-dressed per project) =======================
  {
    const a = area('house', { interior: true }); areas.house = a; scene.add(a.group); const O = OFFS.house; a.origin = V(O, 0, 0);
    const W = 9; const D = 7.5; const H = 3.4;
    const wallM = new THREE.MeshLambertMaterial({ color: '#efe6d2', side: THREE.BackSide });
    const room = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [wallM, wallM, new THREE.MeshLambertMaterial({ color: '#2a2018', side: THREE.BackSide }), new THREE.MeshLambertMaterial({ color: '#7a5a3a', side: THREE.BackSide }), wallM, wallM]);
    room.position.set(O, H / 2, 0); room.receiveShadow = true; a.group.add(room);
    const stripeM = new THREE.MeshLambertMaterial({ color: '#888', side: THREE.BackSide }); const noFace = new THREE.MeshBasicMaterial({ visible: false });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 0.4, D - 0.1), [stripeM, stripeM, noFace, noFace, stripeM, stripeM]); stripe.position.set(O, 0.2, 0); stripe.material.color = stripeM.color; a.group.add(stripe);
    { const l = new THREE.PointLight(C('#ffe2b0'), 16, 12, 1.4); l.position.set(O, 3, 0); a.group.add(l); }
    // big poster (project image) on the back wall, info boards on the side walls
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.0), new THREE.MeshBasicMaterial({ color: '#333' })); poster.position.set(O, 1.85, -D / 2 + 0.03); a.group.add(poster);
    const infoL = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.88), new THREE.MeshBasicMaterial({ color: '#16222c' })); infoL.position.set(O - W / 2 + 0.03, 1.75, -0.3); infoL.rotation.y = Math.PI / 2; a.group.add(infoL);
    const infoR = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.88), new THREE.MeshBasicMaterial({ color: '#16222c' })); infoR.position.set(O + W / 2 - 0.03, 1.75, -0.3); infoR.rotation.y = -Math.PI / 2; a.group.add(infoR);
    // arcade cabinet = open the project's link
    const arc = new THREE.Group(); arc.position.set(O + 2.8, 0, -2.4); arc.rotation.y = -0.6; a.group.add(arc);
    const arcM = mat('#2a2a30'); arc.add(shadowy(box(0.9, 1.9, 0.8, arcM, 0, 0.95, 0))); const arcScr = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.55), new THREE.MeshBasicMaterial({ color: '#222' })); arcScr.position.set(0, 1.45, 0.41); arcScr.rotation.x = -0.2; arc.add(arcScr);
    a.colliders.push({ x: O + 2.8, z: -2.4, r: 0.7 });
    a.interactables.push({ pos: V(O + 2.1, 0, -1.7), radius: 1.5, kind: 'link', label: 'project link' });
    a.interactables.push({ pos: V(O, 0, D / 2 - 0.9), radius: 1.4, kind: 'exitHouse', label: 'the street' });
    const door = box(1.4, 2.3, 0.08, mat('#4a2c18'), O, 1.15, D / 2 - 0.05); a.group.add(door);
    a.bounds = { minX: O - W / 2 + 0.2, maxX: O + W / 2 - 0.2, minZ: -D / 2 + 0.2, maxZ: D / 2 - 0.2, maxY: H - 0.3 }; a.colliders.push({ inside: true, ...a.bounds });
    a.spawn = { pos: V(O, 0, D / 2 - 1.6), yaw: Math.PI };
    const loader = new THREE.TextureLoader();
    a.dress = (p) => {
      const col = GROUP_COLORS[p.group] || '#666'; stripeM.color.set(col);
      if (p.image) { const t = loader.load(p.image); t.colorSpace = THREE.SRGBColorSpace; poster.material = new THREE.MeshBasicMaterial({ map: t }); arcScr.material = new THREE.MeshBasicMaterial({ map: t }); }
      else { poster.material = new THREE.MeshBasicMaterial({ map: plaqueTex([{ h: p.name }, { t: 'Screenshot not provided yet.' }], { accent: col }) }); }
      infoL.material = new THREE.MeshBasicMaterial({ map: plaqueTex([{ k: `${p.group}${p.year ? ' · ' + p.year : ''}${p.featured ? ' · featured' : ''}` }, { h: p.name }, { t: p.stack }, { t: p.role }, { t: p.summary }], { accent: col }) });
      infoR.material = new THREE.MeshBasicMaterial({ map: plaqueTex([{ k: 'What I did' }, ...(p.points || [p.summary]).map((x) => ({ li: x })), { k: p.links.length ? 'Links: walk to the arcade cabinet' : 'No public link yet' }, ...p.links.map(([l, u]) => ({ li: `${l}: ${u.replace(/^https?:\/\//, '')}` }))], { accent: col }) });
      a.link = p.links[0]?.[1] || null; a.project = p;
    };
  }

  return { areas, boards, sky, sun, hemi, setTheme };
}
