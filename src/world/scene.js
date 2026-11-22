import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat, C, box, shadowy, labelTex, canvasTex } from './materials.js';
import { chessTex, snakesTex, ludoTex, rand } from '../stage/textures.js';
import { projects, certificates } from '../content.js';
import { MILESTONES } from '../games/snakes.js';

export const GROUP_COLORS = { Unreal: '#2f6f8f', Unity: '#a8462a', 'Three.js': '#5b8a5a', Systems: '#6a5aa0', Motion: '#c88a1c' };

// World layout (metres). Spawn plaza at the origin; each section is a zone around it.
export const ZONES = {
  skills: { label: 'Skills · Chess Plaza', center: new THREE.Vector3(0, 0, -34), size: 16, pad: new THREE.Vector3(0, 0, -23.5) },
  journey: { label: 'Journey · Snakes & Ladders', center: new THREE.Vector3(36, 0, 0), size: 20, pad: new THREE.Vector3(23.5, 0, 0) },
  about: { label: 'About · Ludo Garden', center: new THREE.Vector3(-34, 0, 0), size: 15, pad: new THREE.Vector3(-24.5, 0, 0) },
  projects: { label: 'Projects · Property Street', center: new THREE.Vector3(0, 0, 36), size: 26, pad: new THREE.Vector3(0, 0, 21.5) },
  achievements: { label: 'Trophy Hall', center: new THREE.Vector3(26, 0, -26), size: 8, pad: new THREE.Vector3(21.5, 0, -21.5) },
  promo: { label: 'Drive-in Screen', center: new THREE.Vector3(-27, 0, -27), size: 10, pad: new THREE.Vector3(-21, 0, -21) },
  contact: { label: 'Post Box', center: new THREE.Vector3(5, 0, 5), size: 2, pad: new THREE.Vector3(4.2, 0, 4.2) },
};

export function buildScene(scene, tier) {
  const colliders = []; // circles { x, z, r }  and boxes { minX, maxX, minZ, maxZ }
  const interactables = []; // { pos, radius, kind, id, label }
  const update = [];
  const hi = tier.name === 'Full';

  // ---------- sky, fog, light ----------
  const skyCols = { dusk: ['#22355a', '#c98a62', '#f3cf8a'], day: ['#5f9ccf', '#bfe0f0', '#f6efd8'] };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: C(skyCols.dusk[0]) }, mid: { value: C(skyCols.dusk[1]) }, sun: { value: C(skyCols.dusk[2]) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 sun; varying vec3 vP; void main(){ float h = vP.y; vec3 c = mix(mid, top, smoothstep(0.02, 0.55, h)); float s = pow(max(dot(normalize(vec3(-0.6,0.18,0.5)), vP), 0.0), 24.0); c = mix(c, sun, s*0.9); gl_FragColor = vec4(c, 1.0); }',
  }));
  scene.add(sky);
  scene.fog = new THREE.Fog(C('#5b5a63'), 45, 150);
  const hemi = new THREE.HemisphereLight(C('#b4c6e0'), C('#4a3a2a'), 1.25); scene.add(hemi);
  const sun = new THREE.DirectionalLight(C('#ffc58a'), 2.2); sun.position.set(-30, 26, 22);
  if (hi) { sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera; sc.left = sc.bottom = -22; sc.right = sc.top = 22; sc.near = 1; sc.far = 90; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03; }
  scene.add(sun, sun.target);
  const setTheme = (t) => {
    const c = skyCols[t] || skyCols.dusk; sky.material.uniforms.top.value.set(c[0]); sky.material.uniforms.mid.value.set(c[1]); sky.material.uniforms.sun.value.set(c[2]);
    scene.fog.color.set(t === 'day' ? '#b9d3df' : '#5b5a63'); hemi.intensity = t === 'day' ? 1.8 : 1.25; sun.color.set(t === 'day' ? '#fff3dc' : '#ffc58a'); sun.intensity = t === 'day' ? 2.8 : 2.2;
  };

  // ---------- ground + paths ----------
  const gGeo = new THREE.PlaneGeometry(260, 260, 64, 64); gGeo.rotateX(-Math.PI / 2);
  const gp = gGeo.attributes.position; const gc = [];
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i); const z = gp.getZ(i); const r = Math.hypot(x, z);
    const hill = Math.max(0, (r - 62) / 30); gp.setY(i, hill * (2 + Math.sin(x * 0.07) * Math.cos(z * 0.06) * 3) + (r > 62 ? rand(-0.2, 0.2) : 0));
    const k = rand(0, 1); const c = C(k < 0.45 ? '#58703c' : k < 0.8 ? '#4e6636' : '#667a40'); gc.push(c.r, c.g, c.b);
  }
  gGeo.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3)); gGeo.computeVertexNormals();
  const ground = new THREE.Mesh(gGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })); ground.receiveShadow = hi; scene.add(ground);

  // dirt paths from the plaza to every zone pad + a ring road for the car
  const pathM = new THREE.MeshLambertMaterial({ color: C('#b08a5a') });
  const pathGeos = [];
  for (const z of Object.values(ZONES)) { const len = Math.hypot(z.pad.x, z.pad.z); if (len < 7) continue; const g = new THREE.PlaneGeometry(3.2, len - 5); g.rotateX(-Math.PI / 2); g.translate(0, 0.02, -(len - 5) / 2 - 5); g.rotateY(Math.atan2(-z.pad.x, -z.pad.z)); pathGeos.push(g); }
  const ring = new THREE.RingGeometry(46, 51, 64, 1); ring.rotateX(-Math.PI / 2); ring.translate(0, 0.025, 0);
  scene.add(new THREE.Mesh(mergeGeometries(pathGeos), pathM));
  const road = new THREE.Mesh(ring, new THREE.MeshLambertMaterial({ color: C('#3f3d3a') })); road.receiveShadow = hi; scene.add(road);
  const dash = new THREE.RingGeometry(48.4, 48.6, 64, 1, 0, Math.PI * 2); dash.rotateX(-Math.PI / 2); dash.translate(0, 0.03, 0); scene.add(new THREE.Mesh(dash, new THREE.MeshBasicMaterial({ color: '#c9a24a' })));
  // plaza
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(7, 24), new THREE.MeshLambertMaterial({ color: C('#a89878') })); plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.03; plaza.receiveShadow = hi; scene.add(plaza);
  // campfire + lamp posts
  const fire = new THREE.Group(); fire.position.set(-2.5, 0, -2.5); scene.add(fire);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; fire.add(box(0.35, 0.25, 0.3, mat('#6b6458'), Math.cos(a) * 0.75, 0.12, Math.sin(a) * 0.75)); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 6), new THREE.MeshBasicMaterial({ color: '#ffb347' })); flame.position.y = 0.5; fire.add(flame);
  const fireLight = new THREE.PointLight(C('#ff9a4a'), 14, 12, 1.6); fireLight.position.set(-2.5, 1.2, -2.5); scene.add(fireLight);
  colliders.push({ x: -2.5, z: -2.5, r: 1.1 });
  update.push((t) => { flame.scale.set(1 + Math.sin(t * 13) * 0.08, 1 + Math.sin(t * 9) * 0.15, 1 + Math.cos(t * 11) * 0.08); fireLight.intensity = 13 + Math.sin(t * 17) * 2; });

  // signpost in the plaza pointing to each zone
  const sp = new THREE.Group(); sp.position.set(2.2, 0, -1.8); scene.add(sp); sp.add(box(0.16, 3.2, 0.16, mat('#4a3222'), 0, 1.6, 0));
  Object.entries(ZONES).forEach(([id, z], i) => {
    if (id === 'contact') return;
    const a = Math.atan2(z.center.x - 2.2, z.center.z + 1.8); const arm = box(2.2, 0.36, 0.06, mat('#fff', { map: labelTex(z.label.split(' · ')[0] + '  ›', { w: 384, h: 64 }), flat: false }), 0, 0, 0);
    arm.geometry.translate(1.1, 0, 0); arm.position.y = 2.9 - i * 0.42; arm.rotation.y = a - Math.PI / 2; sp.add(arm);
  });
  colliders.push({ x: 2.2, z: -1.8, r: 0.3 });

  // ---------- forest (instanced) ----------
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.24, 1.6, 5); trunkGeo.translate(0, 0.8, 0);
  const crownGeo = mergeGeometries([new THREE.ConeGeometry(1.5, 2.6, 7).translate(0, 2.5, 0), new THREE.ConeGeometry(1.15, 2.1, 7).translate(0, 3.6, 0), new THREE.ConeGeometry(0.75, 1.6, 7).translate(0, 4.6, 0)]);
  const roundGeo = new THREE.IcosahedronGeometry(1.5, 0).translate(0, 2.6, 0);
  const n = tier.trees; const trunks = new THREE.InstancedMesh(trunkGeo, mat('#5a3d28'), n);
  const pines = new THREE.InstancedMesh(crownGeo, new THREE.MeshLambertMaterial({ flatShading: true }), n); const rounds = new THREE.InstancedMesh(roundGeo, new THREE.MeshLambertMaterial({ flatShading: true }), n);
  const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const s3 = new THREE.Vector3(); const p3 = new THREE.Vector3(); const Y = new THREE.Vector3(0, 1, 0);
  const pal = ['#2f5a3a', '#3c6a3e', '#2a4f44', '#4a7040', '#36603a', '#5a7a3a'].map(C);
  let np = 0; let nr = 0; let placed = 0; let guard = 0;
  const free = (x, z) => { const r = Math.hypot(x, z); if (r < 9) return false; if (r > 45 && r < 52.5) return false; for (const zz of Object.values(ZONES)) if (Math.abs(x - zz.center.x) < zz.size / 2 + 4 && Math.abs(z - zz.center.z) < zz.size / 2 + 4) return false; for (const zz of Object.values(ZONES)) { const L = Math.hypot(zz.pad.x, zz.pad.z); const t = (x * zz.pad.x + z * zz.pad.z) / (L * L); if (t > 0 && t < 1.05 && Math.abs(x * zz.pad.z - z * zz.pad.x) / L < 3.5) return false; } return true; };
  while (placed < n && guard++ < n * 40) {
    const a = rand(0, Math.PI * 2); const r = 10 + Math.pow(rand(0, 1), 0.55) * 100; const x = Math.cos(a) * r; const z = Math.sin(a) * r;
    if (!free(x, z)) continue;
    const s = rand(0.8, 1.45); q.setFromAxisAngle(Y, rand(0, 6.28)); s3.set(s, s * rand(0.9, 1.25), s); p3.set(x, r > 62 ? 1.2 : 0, z); m4.compose(p3, q, s3);
    trunks.setMatrixAt(placed, m4);
    if (rand(0, 1) < 0.72) { pines.setMatrixAt(np, m4); pines.setColorAt(np, pal[np % 4]); np++; } else { rounds.setMatrixAt(nr, m4); rounds.setColorAt(nr, pal[2 + (nr % 4)]); nr++; }
    colliders.push({ x, z, r: 0.55 * s }); placed++;
  }
  trunks.count = placed; pines.count = np; rounds.count = nr;
  [trunks, pines, rounds].forEach((im) => { im.castShadow = hi; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; scene.add(im); });
  // rocks + bushes
  const rockN = Math.floor(tier.trees / 5); const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.7, 0), mat('#7a776e'), rockN); let rk = 0;
  for (let i = 0; i < rockN * 6 && rk < rockN; i++) { const a = rand(0, 6.28); const r = rand(10, 90); const x = Math.cos(a) * r; const z = Math.sin(a) * r; if (!free(x, z)) continue; const s = rand(0.4, 1.4); m4.compose(p3.set(x, 0.15, z), q.setFromEuler(new THREE.Euler(rand(0, 3), rand(0, 3), 0)), s3.set(s, s * 0.7, s)); rocks.setMatrixAt(rk++, m4); if (s > 0.9) colliders.push({ x, z, r: 0.6 * s }); }
  rocks.count = rk; rocks.castShadow = hi; scene.add(rocks);

  // ---------- zone pads (glowing rings you walk onto) ----------
  const padMat = new THREE.MeshBasicMaterial({ color: '#e8b25a', transparent: true, opacity: 0.85 });
  for (const [id, z] of Object.entries(ZONES)) {
    const g = new THREE.Group(); g.position.copy(z.pad); scene.add(g);
    const ringM = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.35, 32), padMat); ringM.rotation.x = -Math.PI / 2; ringM.position.y = 0.05; g.add(ringM);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd08a', transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); beam.position.y = 1.5; g.add(beam);
    if (id !== 'contact') { const lab = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.62), new THREE.MeshBasicMaterial({ map: labelTex(z.label, { w: 768, h: 112 }), transparent: false })); lab.position.y = 3.4; g.add(lab); update.push((t, dt, cam) => { if (cam) lab.lookAt(cam.position.x, lab.getWorldPosition(new THREE.Vector3()).y, cam.position.z); }); }
    update.push((t) => { beam.material.opacity = 0.1 + Math.sin(t * 2 + g.position.x) * 0.04; ringM.rotation.z = t * 0.6; });
    interactables.push({ pos: z.pad.clone(), radius: 1.6, kind: 'zone', id, label: z.label });
  }

  // ---------- SKILLS: giant chess plaza ----------
  const boards = {};
  {
    const z = ZONES.skills; const g = new THREE.Group(); g.position.copy(z.center); scene.add(g);
    g.add(shadowy(box(z.size + 1, 0.3, z.size + 1, mat('#3a2412'), 0, 0.15, 0), false, true));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(z.size, z.size), new THREE.MeshLambertMaterial({ map: chessTex(512) })); face.material.map.magFilter = THREE.NearestFilter; face.rotation.x = -Math.PI / 2; face.position.y = 0.31; face.receiveShadow = hi; g.add(face);
    boards.skills = { group: g, size: z.size, margin: z.size * 0.06, top: 0.31, face };
  }
  // ---------- JOURNEY: giant Snakes & Ladders field with 3D ladders and snakes ----------
  {
    const z = ZONES.journey; const g = new THREE.Group(); g.position.copy(z.center); scene.add(g);
    g.add(shadowy(box(z.size + 1, 0.3, z.size + 1, mat('#3a2412'), 0, 0.15, 0), false, true));
    const tex = snakesTex(1024, MILESTONES); tex.magFilter = THREE.LinearFilter;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(z.size, z.size), new THREE.MeshLambertMaterial({ map: tex })); face.rotation.x = -Math.PI / 2; face.position.y = 0.31; face.receiveShadow = hi; g.add(face);
    boards.journey = { group: g, size: z.size, margin: z.size * 0.05, top: 0.31, face };
  }
  // ---------- ABOUT: Ludo garden ----------
  {
    const z = ZONES.about; const g = new THREE.Group(); g.position.copy(z.center); scene.add(g);
    g.add(shadowy(box(z.size + 1, 0.3, z.size + 1, mat('#3a2412'), 0, 0.15, 0), false, true));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(z.size, z.size), new THREE.MeshLambertMaterial({ map: ludoTex(512) })); face.rotation.x = -Math.PI / 2; face.position.y = 0.31; face.receiveShadow = hi; g.add(face);
    const u = z.size / 15; const homes = [['who', '#c8553d', -4.5, -4.5], ['build', '#5b8a5a', 4.5, -4.5], ['now', '#d9a441', 4.5, 4.5], ['next', '#2f6f8f', -4.5, 4.5]];
    for (const [id, col, hx, hz] of homes) {
      const token = new THREE.Group(); token.position.set(hx * u, 0.31, hz * u); g.add(token);
      token.add(shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.5, 12), mat(col)))); token.children[0].position.y = 0.25;
      const head = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), mat(col))); head.position.y = 0.95; token.add(head);
      interactables.push({ pos: g.position.clone().add(token.position).setY(0), radius: 2.6, kind: 'about', id, label: 'About' });
      colliders.push({ x: g.position.x + token.position.x, z: g.position.z + token.position.z, r: 0.7 });
    }
    boards.about = { group: g, size: z.size, top: 0.31, face };
  }
  // ---------- PROJECTS: property street (12 little buildings around a square board) ----------
  {
    const z = ZONES.projects; const g = new THREE.Group(); g.position.copy(z.center); scene.add(g);
    g.add(shadowy(box(z.size, 0.2, z.size, mat('#d8e3cf'), 0, 0.1, 0), false, true));
    const inner = box(z.size - 9, 0.22, z.size - 9, mat('#7aa36a'), 0, 0.11, 0); inner.receiveShadow = hi; g.add(inner);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.2), new THREE.MeshBasicMaterial({ map: labelTex('PROJECTS', { w: 512, h: 112, bg: '#8a3a1c' }) })); logo.rotation.x = -Math.PI / 2; logo.rotation.z = Math.PI / 4; logo.position.y = 0.24; g.add(logo);
    const half = z.size / 2 - 2.2; const per = 3; const sideLen = z.size - 9;
    projects.forEach((p, i) => {
      const side = Math.floor(i / per); const k = i % per; const t = (k + 0.5) / per - 0.5;
      const local = [[t * sideLen, half], [half, -t * sideLen], [-t * sideLen, -half], [-half, t * sideLen]][side];
      const rot = [Math.PI, Math.PI / 2, 0, -Math.PI / 2][side];
      const b = new THREE.Group(); b.position.set(local[0], 0.2, local[1]); b.rotation.y = rot; g.add(b);
      const col = GROUP_COLORS[p.group] || '#555'; const h = p.featured ? 3.2 : 2.3;
      b.add(shadowy(box(2.8, h, 2.4, mat('#efe6d2'), 0, h / 2, 0), true, true));
      b.add(shadowy(box(3.0, 0.5, 2.6, mat(col), 0, h + 0.25, 0)));
      b.add(box(0.8, 1.3, 0.05, mat('#4a2c18'), 0, 0.65, 1.21));
      if (p.image) { const tex = new THREE.TextureLoader().load(p.image); tex.colorSpace = THREE.SRGBColorSpace; const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ map: tex })); sign.position.set(0, h + 1.35, 1.0); sign.rotation.x = -0.15; b.add(sign); b.add(box(0.1, 1.0, 0.1, mat('#3a2616'), -1.0, h + 0.6, 1.0), box(0.1, 1.0, 0.1, mat('#3a2616'), 1.0, h + 0.6, 1.0)); }
      const nameT = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.42), new THREE.MeshBasicMaterial({ map: labelTex(p.name.replace(/\(.*\)|:.*$/g, '').trim().slice(0, 22), { w: 512, h: 80, bg: col }) })); nameT.position.set(0, h - 0.35, 1.22); b.add(nameT);
      const wp = g.position.clone().add(new THREE.Vector3(local[0], 0, local[1]));
      colliders.push({ minX: wp.x - 1.5, maxX: wp.x + 1.5, minZ: wp.z - 1.5, maxZ: wp.z + 1.5 });
      const front = new THREE.Vector3(0, 0, 2.6).applyAxisAngle(Y, rot).add(wp);
      interactables.push({ pos: front, radius: 2.0, kind: 'project', id: p.id, label: p.name });
    });
    boards.projects = { group: g };
  }
  // ---------- TROPHY HALL ----------
  {
    const z = ZONES.achievements; const g = new THREE.Group(); g.position.copy(z.center); g.rotation.y = -Math.PI / 4 + Math.PI; scene.add(g);
    g.add(shadowy(box(9, 0.3, 6, mat('#cbbf9f'), 0, 0.15, 0), false, true));
    g.add(shadowy(box(9, 4, 0.4, mat('#7a5534'), 0, 2.15, -2.8), true, true));
    [-4.3, 4.3].forEach((x) => g.add(shadowy(box(0.4, 4, 6, mat('#7a5534'), x, 2.15, 0), true, true)));
    const roofM = mat('#3b2a22'); g.add(shadowy(box(10, 0.3, 7, roofM, 0, 4.3, 0)));
    certificates.forEach((c, i) => {
      const x = -3.2 + (i % 3) * 3.2; const y = i < 3 ? 2.9 : 1.55; const tex = new THREE.TextureLoader().load(c.image.replace('/certs/', '/certs/thumb/')); tex.colorSpace = THREE.SRGBColorSpace;
      g.add(box(1.75, 1.3, 0.08, mat('#4a2a14'), x, y, -2.55)); const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.12), new THREE.MeshLambertMaterial({ map: tex })); pic.position.set(x, y, -2.5); g.add(pic);
      const wp = pic.getWorldPosition(new THREE.Vector3()); // computed after add; group not yet in world matrix, so compute manually
      const local = new THREE.Vector3(x, 0, -1.2).applyAxisAngle(Y, g.rotation.y).add(g.position);
      interactables.push({ pos: local, radius: 1.5, kind: 'cert', id: c.id, label: c.title });
      void wp;
    });
    const cup = new THREE.LatheGeometry([[0, 0], [0.3, 0], [0.3, 0.1], [0.1, 0.2], [0.1, 0.5], [0.35, 0.65], [0.45, 1.1], [0, 0.95]].map(([a, b]) => new THREE.Vector2(a, b)), 14);
    const trophy = shadowy(new THREE.Mesh(cup, new THREE.MeshLambertMaterial({ color: '#e0b04a' }))); trophy.position.set(0, 0.3, 0.6); g.add(trophy);
    const hallLight = new THREE.PointLight(C('#ffd08a'), 6, 9, 1.6); hallLight.position.set(0, 3.4, 0); g.add(hallLight);
    const back = new THREE.Vector3(0, 0, -2.8).applyAxisAngle(Y, g.rotation.y).add(g.position); colliders.push({ x: back.x, z: back.z, r: 2.2 });
  }
  // ---------- DRIVE-IN SCREEN (promo) ----------
  {
    const z = ZONES.promo; const g = new THREE.Group(); g.position.copy(z.center); g.rotation.y = Math.PI / 4; scene.add(g);
    [-3.6, 3.6].forEach((x) => g.add(shadowy(box(0.3, 5, 0.3, mat('#3a2616'), x, 2.5, 0))));
    g.add(shadowy(box(8, 4.6, 0.25, mat('#2a2622'), 0, 4.2, 0)));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 4.1), new THREE.ShaderMaterial({ uniforms: { t: { value: 0 } }, fog: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform float t; varying vec2 vUv; float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);} void main(){ vec3 c=vec3(0.08,0.12,0.14); float n=h(floor(vUv*vec2(160.,90.))+floor(t*20.)); c+=n*0.06; float bar=smoothstep(0.42,0.43,vUv.y)*smoothstep(0.58,0.57,vUv.y); c=mix(c,vec3(0.91,0.7,0.35),bar*0.9*step(0.15,vUv.x)*step(vUv.x,0.85)); gl_FragColor=vec4(pow(c,vec3(2.2)),1.0); }' }));
    scr.position.set(0, 4.2, 0.14); g.add(scr);
    const title = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 0.75), new THREE.MeshBasicMaterial({ map: labelTex('PROMO · PRESS E', { w: 768, h: 104, bg: '#e8b25a', fg: '#16222c', accent: '#16222c' }) })); title.position.set(0, 4.2, 0.16); g.add(title);
    update.push((t) => { scr.material.uniforms.t.value = t; });
    colliders.push({ x: g.position.x, z: g.position.z, r: 1.2 });
    interactables.push({ pos: new THREE.Vector3(0, 0, 4).applyAxisAngle(Y, g.rotation.y).add(g.position), radius: 3.2, kind: 'promo', id: 'promo', label: 'Promo video' });
  }
  // ---------- POST BOX (contact) ----------
  {
    const g = new THREE.Group(); g.position.set(5.6, 0, 5.6); g.rotation.y = -Math.PI * 0.75; scene.add(g);
    g.add(shadowy(box(0.12, 1.1, 0.12, mat('#3a2616'), 0, 0.55, 0)));
    g.add(shadowy(box(0.55, 0.45, 0.8, mat('#a8462a'), 0, 1.3, 0)));
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.8, 12, 1, false, 0, Math.PI), mat('#a8462a')); lid.rotation.z = Math.PI / 2; lid.rotation.y = Math.PI / 2; lid.position.y = 1.52; g.add(shadowy(lid));
    const flag = box(0.04, 0.4, 0.12, mat('#e8b25a'), 0.3, 1.6, 0.1); g.add(flag);
    update.push((t) => { flag.rotation.z = Math.sin(t * 2) * 0.2; });
    colliders.push({ x: 5.6, z: 5.6, r: 0.4 });
  }

  // ---------- car ----------
  const car = new THREE.Group();
  const paint = mat('#8a3e2c'); const dark = mat('#1d1d1f'); const chrome = mat('#c9c2b2'); const glass = mat('#2a3a44');
  car.add(box(1.8, 0.62, 4.1, paint, 0, 0.62, 0), box(1.6, 0.55, 2.2, paint, 0, 1.2, -0.25), box(1.64, 0.42, 2.02, glass, 0, 1.22, -0.25));
  car.add(box(1.84, 0.18, 0.2, chrome, 0, 0.42, 2.06), box(1.84, 0.18, 0.2, chrome, 0, 0.42, -2.06), box(1.5, 0.1, 1.2, dark, 0, 1.53, -0.25));
  const lampM = new THREE.MeshBasicMaterial({ color: '#fff2c4' }); const tailM = new THREE.MeshBasicMaterial({ color: '#c42a1a' });
  car.add(box(0.36, 0.18, 0.06, lampM, -0.6, 0.72, 2.07), box(0.36, 0.18, 0.06, lampM, 0.6, 0.72, 2.07), box(0.3, 0.14, 0.06, tailM, -0.65, 0.72, -2.07), box(0.3, 0.14, 0.06, tailM, 0.65, 0.72, -2.07));
  const wGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10); wGeo.rotateZ(Math.PI / 2);
  const wheels = [[-0.88, 1.35], [0.88, 1.35], [-0.88, -1.35], [0.88, -1.35]].map(([x, z]) => { const w = new THREE.Mesh(wGeo, dark); w.position.set(x, 0.36, z); car.add(w); return w; });
  const head = new THREE.SpotLight(C('#ffe2a8'), 0, 30, 0.5, 0.6, 1.2); head.position.set(0, 0.8, 1.9); head.target.position.set(0, 0, 12); car.add(head, head.target);
  shadowy(car); car.position.set(7.5, 0, -5); car.rotation.y = Math.PI * 0.8; scene.add(car);
  interactables.push({ pos: car.position, radius: 2.8, kind: 'car', id: 'car', label: 'Car' });

  const outdoorLight = { sun, hemi };
  return { colliders, interactables, update, boards, car, carWheels: wheels, headlight: head, setTheme, sun, ground, outdoorLight, treesCount: placed };
}

// circle/box collision test used by the player and the car
export function blocked(colliders, x, z, r) {
  if (Math.hypot(x, z) > 108) return true;
  for (const c of colliders) {
    if (c.r !== undefined) { const dx = x - c.x; const dz = z - c.z; if (dx * dx + dz * dz < (c.r + r) * (c.r + r)) return true; }
    else if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return true;
  }
  return false;
}
export { canvasTex };
