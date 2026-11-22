import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { chessTex, snakesTex } from '../stage/textures.js';
import { makePiece } from '../stage/games3d.js';
import { projects, certificates, journey, skills } from '../content.js';
import { MILESTONES } from '../games/snakes.js';

// ------------------------------------------------------------------
// A cutaway tower (front wall removed, like a dollhouse). One theme per floor.
// Static geometry is merged into a single vertex-coloured mesh (1 draw call).
// ------------------------------------------------------------------
export const H = 3.4; export const BASE = 0.4; export const LIFT_X = 9.2; export const LIFT_DOOR_X = 7.5;
export const fy = (i) => BASE + i * H;
export const FLOORS = [
  { id: 'lobby', n: 'L', name: 'Lobby', icon: '🛎', wall: '#efe3cc', floor: '#b8916a', sub: 'Chotu · promo · contact' },
  { id: 'about', n: '1', name: 'About me', icon: '🙂', wall: '#d6e6d2', floor: '#a7835e', sub: 'who I am' },
  { id: 'journey', n: '2', name: 'Journey', icon: '🎓', wall: '#d3e0f0', floor: '#9c7a58', sub: 'education & experience' },
  { id: 'projects', n: '3', name: 'Projects', icon: '🕹', wall: '#3b3452', floor: '#2b2539', sub: '12 projects' },
  { id: 'skills', n: '4', name: 'Skills', icon: '♞', wall: '#d5ebe4', floor: '#a07e5c', sub: 'tools & chess' },
  { id: 'trophies', n: '5', name: 'Trophies', icon: '🏆', wall: '#7a3238', floor: '#3e2b24', sub: 'certificates' },
  { id: 'roof', n: 'R', name: 'Roof', icon: '☀', wall: null, floor: '#7f9a62', sub: 'take a break' },
];
export const BOUNDS = { minX: -7.4, maxX: 7.6, minZ: -1.5, maxZ: 2.3 };

const C = (h) => new THREE.Color(h);
function rand(a, b) { return a + Math.random() * (b - a); }

export function buildTower(scene, tier) {
  const hi = tier.name === 'Full';
  const parts = []; const inter = []; const update = []; const markers = [];
  const paint = (g, col) => { const c = C(col); const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const add = (g, col, x = 0, y = 0, z = 0, ry = 0) => { if (ry) g.rotateY(ry); g.translate(x, y, z); parts.push(paint(g.index ? g : g, col)); };
  const box = (w, h, d, col, x, y, z, ry) => add(new THREE.BoxGeometry(w, h, d), col, x, y, z, ry);
  const cyl = (rt, rb, h, col, x, y, z, seg = 10) => add(new THREE.CylinderGeometry(rt, rb, h, seg), col, x, y, z);
  const sph = (r, col, x, y, z, seg = 8) => add(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), col, x, y, z);
  const cone = (r, h, col, x, y, z, seg = 7) => add(new THREE.ConeGeometry(r, h, seg), col, x, y, z);
  const flat = (mat) => { if (mat.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.anisotropy = 4; } return mat; };
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const plane = (w, h, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; };
  const loader = new THREE.TextureLoader();
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  /** register something you can click: stand = where the avatar walks to */
  function hotspot({ floor, x, z = -2, w = 1.4, h = 1.6, d = 1.2, y = 0, stand, face = -Math.PI / 2 * 0 + Math.PI, label, kind, data }) {
    const hit = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat); hit.position.set(x, fy(floor) + y + h / 2, z); scene.add(hit);
    const it = { floor, label, kind, data, hit, stand: stand || new THREE.Vector3(x, fy(floor), Math.min(z + d / 2 + 0.75, 1.2)), face, top: new THREE.Vector3(x, fy(floor) + y + h + 0.45, z), seen: false };
    hit.userData.it = it; inter.push(it); return it;
  }

  // ---------------- sky + ground + street ----------------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(260, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: C('#5d9ad6') }, bot: { value: C('#fbe3b7') } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying float h; void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.05, 0.5, h)), 1.0); }',
  }));
  scene.add(sky); scene.fog = new THREE.Fog(C('#e7d9c0'), 70, 200);
  const hemi = new THREE.HemisphereLight(C('#fdf4e6'), C('#8a7a62'), 1.7); scene.add(hemi);
  const sun = new THREE.DirectionalLight(C('#fff1dc'), 2.0); sun.position.set(-14, 34, 26); sun.target.position.set(0, 10, 0);
  if (hi) { sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const s = sun.shadow.camera; s.left = -18; s.right = 18; s.bottom = -6; s.top = 28; s.near = 5; s.far = 80; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; }
  scene.add(sun, sun.target);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshLambertMaterial({ color: '#8fbf6a' })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = hi; scene.add(ground);
  box(220, 0.04, 9, '#565a63', 0, 0.02, 11.5);            // road
  for (let x = -60; x <= 60; x += 6) box(2.6, 0.05, 0.22, '#f3e3a0', x, 0.03, 11.5); // lane dashes
  box(220, 0.16, 3.4, '#cfc6b6', 0, 0.08, 5.6);             // sidewalk
  box(220, 0.2, 0.2, '#9e978a', 0, 0.1, 7.3);               // kerb
  box(20.5, BASE, 7.6, '#d9cdb7', 0.8, BASE / 2, 0);        // plinth
  for (let i = 0; i < 3; i++) box(2.2, BASE * (i + 1) / 3, 0.45, '#cbbfa8', -5.8, BASE * (i + 1) / 6, 4.85 - i * 0.45); // entrance steps
  // street lamps + benches + flower beds
  for (const x of [-16, 16, 30, -30]) { cyl(0.07, 0.09, 4.2, '#2d3138', x, 2.1, 6.9); box(0.9, 0.12, 0.25, '#2d3138', x + 0.35, 4.2, 6.9); sph(0.22, '#fff3c4', x + 0.7, 4.05, 6.9); }
  for (const x of [-11, 13]) { box(1.8, 0.1, 0.5, '#8a5a34', x, 0.55, 4.3); box(1.8, 0.5, 0.08, '#8a5a34', x, 0.85, 4.05); box(0.1, 0.5, 0.4, '#3a3a3a', x - 0.8, 0.3, 4.3); box(0.1, 0.5, 0.4, '#3a3a3a', x + 0.8, 0.3, 4.3); }
  for (const x of [-9, 11.5]) { box(2.6, 0.35, 1.2, '#7a5a3a', x, 0.58, 2.6); for (let k = 0; k < 6; k++) sph(0.22, ['#e85a5a', '#f6c445', '#f08ab8', '#ffffff'][k % 4], x - 1 + k * 0.4, 0.9, 2.6 + (k % 2 ? 0.2 : -0.2), 6); }
  // background city: pastel blocks (one merged mesh)
  const pastel = ['#f2c6b4', '#c9d9ef', '#f6e2a6', '#cfe7d1', '#e7c9e8', '#f4d0a3'];
  for (let i = 0; i < 22; i++) { const x = -70 + i * 6.6 + rand(-1, 1); const h = rand(6, 20); const z = rand(-30, -18); box(rand(4, 6), h, rand(4, 6), pastel[i % 6], x, h / 2, z); for (let k = 1; k < h / 2.2; k++) box(0.05, 0.9, 3.4, '#ffffffaa'.slice(0, 7), x + 2.6, k * 2.2, z); }
  for (let i = 0; i < 16; i++) { const x = -60 + i * 8 + rand(-2, 2); const h = rand(4, 9); box(rand(4, 6), h, 4, pastel[(i + 2) % 6], x, h / 2, rand(22, 30)); }
  // trees (instanced)
  const tPos = []; for (let i = 0; i < 26; i++) { let x = rand(-48, 48); if (Math.abs(x - 0.8) < 12) x += x < 0 ? -12 : 12; tPos.push([x, rand(-12, -6)]); }
  for (let i = 0; i < 10; i++) tPos.push([-44 + i * 10 + rand(-1, 1), 16.8]);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, 1.6, 6).translate(0, 0.8, 0), new THREE.MeshLambertMaterial({ color: '#7a5236' }), tPos.length);
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.4, 0).translate(0, 2.5, 0), new THREE.MeshLambertMaterial({ flatShading: true }), tPos.length);
  const m4 = new THREE.Matrix4(); const greens = ['#5f9e4a', '#4f8a3e', '#76ad55', '#3f7a3a'].map(C);
  tPos.forEach(([x, z], i) => { const s = rand(0.8, 1.3); m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); trunk.setMatrixAt(i, m4); crown.setMatrixAt(i, m4); crown.setColorAt(i, greens[i % 4]); });
  trunk.castShadow = crown.castShadow = hi; scene.add(trunk, crown);
  // clouds (one mesh, drifting)
  const cl = []; for (let i = 0; i < 9; i++) { const x = rand(-60, 60); const y = rand(26, 36); const z = rand(-40, -15); for (let k = 0; k < 3; k++) cl.push(new THREE.IcosahedronGeometry(rand(1.6, 2.6), 0).translate(x + k * 2, y + rand(-0.4, 0.4), z)); }
  const clouds = new THREE.Mesh(mergeGeometries(cl), new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, emissive: '#555555' })); scene.add(clouds);
  update.push((t) => { clouds.position.x = Math.sin(t * 0.02) * 10; });

  // ---------------- the tower shell ----------------
  const W = 16; const D = 6; const zBack = -3; const zFront = 2.8;
  for (let i = 0; i < FLOORS.length; i++) {
    const f = FLOORS[i]; const y = fy(i);
    box(W + 0.6, 0.3, D + 0.2, i === 0 ? '#cdbfa6' : '#e8dcc6', 0, y - 0.15, -0.1);      // slab
    box(W + 0.6, 0.32, 0.12, '#d64b3a', 0, y - 0.14, zFront + 0.05);                     // red slab edge (cutaway trim)
    box(W, 0.02, D - 0.4, f.floor, 0, y + 0.01, -0.2);                                   // floor finish
    if (f.wall) {
      box(W, H - 0.3, 0.2, f.wall, 0, y + (H - 0.3) / 2, zBack);                         // back wall
      box(0.2, H - 0.3, D - 0.2, f.wall, -W / 2, y + (H - 0.3) / 2, -0.1);               // left wall
      box(0.2, H - 0.3, 2.6, f.wall, W / 2 + 0.05, y + (H - 0.3) / 2, -1.7);             // right wall (with lift door gap)
      box(0.2, H - 0.3, 1.5, f.wall, W / 2 + 0.05, y + (H - 0.3) / 2, 2.05);
      box(0.2, 0.8, 1.4, f.wall, W / 2 + 0.05, y + H - 0.7, 0.6);
      box(W, 0.14, 0.14, '#ffffff', 0, y + 0.07, zBack + 0.15);                          // skirting
      box(0.25, H - 0.3, 0.25, '#d64b3a', -W / 2 + 0.02, y + (H - 0.3) / 2, zFront);     // front pillars
      box(0.25, H - 0.3, 0.25, '#d64b3a', W / 2 + 0.05, y + (H - 0.3) / 2, zFront);
      if (i === 0) for (const z of [-1.8, 0.6]) box(0.08, 1.2, 1.2, '#bfe0f2', -W / 2 - 0.08, y + 1.6, z); // lobby side windows
    }
    // floor sign (painted label on the back wall)
    if (f.wall) {
      const dark = i === 3 || i === 5; const tex = canvasTex(512, 128, (g, w, h) => { g.fillStyle = dark ? '#f6d32d' : '#1b2430'; g.font = '700 64px "Chakra Petch", Arial'; g.textBaseline = 'middle'; g.fillText(`${f.n} · ${f.name.toUpperCase()}`, 10, h / 2); });
      plane(4.2, 1.05, flat(new THREE.MeshBasicMaterial({ map: tex, transparent: true })), -5.4, y + H - 0.85, zBack + 0.12);
    }
  }
  // roof parapet + lift shaft
  const yR = fy(6);
  box(W + 0.6, 0.9, 0.2, '#e8dcc6', 0, yR + 0.45, zBack); box(0.2, 0.9, D, '#e8dcc6', -W / 2 - 0.2, yR + 0.45, -0.1); box(W + 0.6, 0.5, 0.15, '#e8dcc6', 0, yR + 0.25, zFront + 0.1);
  const shaftTop = yR + H;
  box(0.15, shaftTop, 0.15, '#2d3138', LIFT_X - 1.0, shaftTop / 2, 1.3); box(0.15, shaftTop, 0.15, '#2d3138', LIFT_X + 1.0, shaftTop / 2, 1.3);
  box(0.15, shaftTop, 0.15, '#2d3138', LIFT_X - 1.0, shaftTop / 2, -0.7); box(0.15, shaftTop, 0.15, '#2d3138', LIFT_X + 1.0, shaftTop / 2, -0.7);
  box(2.3, 0.3, 2.3, '#2d3138', LIFT_X, shaftTop, 0.3); box(2.0, 0.6, 0.1, '#d64b3a', LIFT_X, shaftTop + 0.45, 1.4);
  const shaftGlass = new THREE.Mesh(new THREE.BoxGeometry(2.0, shaftTop - BASE, 0.05), new THREE.MeshLambertMaterial({ color: '#bfe0f2', transparent: true, opacity: 0.18, depthWrite: false })); shaftGlass.position.set(LIFT_X, BASE + (shaftTop - BASE) / 2, -0.7); scene.add(shaftGlass);
  // lift car (moving)
  const car = new THREE.Group(); car.position.set(LIFT_X, BASE, 0.3); scene.add(car);
  const carGeo = [new THREE.BoxGeometry(1.8, 0.12, 1.8).translate(0, 0.06, 0), new THREE.BoxGeometry(1.8, 2.6, 0.08).translate(0, 1.3, -0.9), new THREE.BoxGeometry(0.08, 2.6, 1.8).translate(0.9, 1.3, 0), new THREE.BoxGeometry(1.8, 0.12, 1.8).translate(0, 2.6, 0)];
  const carMesh = new THREE.Mesh(mergeGeometries(carGeo), new THREE.MeshLambertMaterial({ color: '#f6d32d' })); carMesh.castShadow = hi; car.add(carMesh);
  const liftLamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), new THREE.MeshBasicMaterial({ color: '#fff6d8' })); liftLamp.position.y = 2.54; car.add(liftLamp);

  // ---------------- LOBBY (0) ----------------
  let y = fy(0);
  box(2.8, 1.0, 1.0, '#d64b3a', -1.4, y + 0.5, -1.6); box(3.0, 0.08, 1.2, '#f3ead8', -1.4, y + 1.04, -1.6); // reception desk
  box(1.1, 0.06, 0.6, '#3a3a3a', -2.2, y + 1.1, -1.7);
  const chotuSpot = new THREE.Vector3(-1.0, y + 1.08, -1.55);
  hotspot({ floor: 0, x: -1.4, z: -1.6, w: 3, h: 1.6, d: 1.2, stand: new THREE.Vector3(-1.4, y, -0.3), label: 'Chotu · ask me anything', kind: 'chotu' });
  // promo TV
  box(3.0, 1.8, 0.12, '#1c1c22', 3.6, y + 1.8, zBack + 0.15);
  const tvScr = plane(2.75, 1.55, new THREE.ShaderMaterial({ uniforms: { t: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }', fragmentShader: 'uniform float t; varying vec2 vUv; void main(){ vec3 a=vec3(0.84,0.29,0.23); vec3 b=vec3(0.96,0.83,0.18); vec3 c=mix(a,b,0.5+0.5*sin(vUv.x*6.0+t)); float tri=step(abs(vUv.x-0.5)*1.4, (vUv.y-0.3)*1.2)*step(vUv.y,0.7)*step(0.3,vUv.y); c=mix(c,vec3(1.0),tri); gl_FragColor=vec4(c,1.0);} ' }), 3.6, y + 1.8, zBack + 0.22);
  update.push((t) => { tvScr.material.uniforms.t.value = t; });
  box(1.6, 0.5, 0.6, '#8a5a34', 3.6, y + 0.25, -2.4);
  hotspot({ floor: 0, x: 3.6, z: -2.5, w: 3, h: 2.6, d: 0.8, label: 'Promo video', kind: 'promo' });
  // red telephone booth
  box(1.2, 2.5, 1.2, '#c8312a', 6.3, y + 1.25, -1.9); box(0.95, 1.7, 0.05, '#bfe0f2', 6.3, y + 1.45, -1.28); box(1.3, 0.2, 1.3, '#a02520', 6.3, y + 2.6, -1.9);
  const phoneTex = canvasTex(256, 64, (g) => { g.fillStyle = '#fff'; g.font = '700 40px "Chakra Petch", Arial'; g.fillText('PHONE', 52, 46); }); plane(1.0, 0.25, new THREE.MeshBasicMaterial({ map: phoneTex, transparent: true }), 6.3, y + 2.35, -1.27);
  const booth = hotspot({ floor: 0, x: 6.3, z: -1.9, w: 1.3, h: 2.6, d: 1.3, label: 'Telephone · contact me', kind: 'contact' });
  // sofa
  box(2.2, 0.45, 0.9, '#3d6b8c', -5.4, y + 0.3, -2.3); box(2.2, 0.7, 0.25, '#3d6b8c', -5.4, y + 0.7, -2.7); box(0.25, 0.65, 0.9, '#3d6b8c', -6.5, y + 0.4, -2.3); box(0.25, 0.65, 0.9, '#3d6b8c', -4.3, y + 0.4, -2.3);
  hotspot({ floor: 0, x: -5.4, z: -2.3, w: 2.2, h: 1.1, d: 1.0, stand: new THREE.Vector3(-5.4, y, -2.15), face: 0, label: 'Sofa · sit down', kind: 'sit' });
  cyl(0.28, 0.22, 0.5, '#d9cbb0', -7.2, y + 0.25, -2.4); sph(0.55, '#4f8a3e', -7.2, y + 0.95, -2.4); // plant
  add(new THREE.CircleGeometry(1.6, 16).rotateX(-Math.PI / 2), '#e2b04a', 0.5, y + 0.03, 0.4);         // rug

  // ---------------- ABOUT (1) ----------------
  y = fy(1);
  box(2.0, 0.08, 0.9, '#8a5a34', -4.2, y + 0.78, -2.1); box(0.08, 0.76, 0.8, '#5a3a22', -5.1, y + 0.38, -2.1); box(0.08, 0.76, 0.8, '#5a3a22', -3.3, y + 0.38, -2.1);
  box(0.7, 0.04, 0.45, '#2a2a30', -4.2, y + 0.84, -2.15); const lap = plane(0.66, 0.42, new THREE.MeshBasicMaterial({ color: '#7fc4e8' }), -4.2, y + 1.07, -2.36); lap.rotation.x = -0.2;
  box(0.55, 0.08, 0.55, '#2d3138', -4.2, y + 0.46, -1.35); box(0.55, 0.6, 0.08, '#2d3138', -4.2, y + 0.8, -1.08); cyl(0.04, 0.04, 0.42, '#2d3138', -4.2, y + 0.21, -1.35, 6); // chair
  hotspot({ floor: 1, x: -4.2, z: -1.9, w: 2.2, h: 1.4, d: 1.6, stand: new THREE.Vector3(-4.2, y, -1.45), face: Math.PI, label: 'Desk · my profile', kind: 'bio' });
  box(2.6, 2.4, 0.5, '#8a5a34', 0.6, y + 1.2, -2.65);
  const bookCols = ['#d64b3a', '#3d6b8c', '#f6c445', '#5b8a5a', '#6a5aa0', '#e8dcc6'];
  for (let s = 0; s < 4; s++) for (let k = 0; k < 9; k++) { const h = rand(0.32, 0.46); box(0.22, h, 0.3, bookCols[(k + s) % 6], -0.4 + k * 0.25, y + 0.25 + s * 0.56 + h / 2, -2.5); }
  hotspot({ floor: 1, x: 0.6, z: -2.6, w: 2.6, h: 2.4, d: 0.8, label: 'Bookshelf · about me', kind: 'aboutme' });
  box(0.9, 1.1, 0.6, '#c9ccd2', 3.6, y + 0.55, -2.5); box(0.7, 0.08, 0.4, '#fff', 3.6, y + 1.16, -2.4); box(0.6, 0.3, 0.45, '#2d3138', 3.6, y + 1.35, -2.5);
  hotspot({ floor: 1, x: 3.6, z: -2.5, w: 1.0, h: 1.6, d: 0.8, label: 'Printer · download my CV', kind: 'cv' });
  box(0.6, 1.0, 0.5, '#2d3138', 6.2, y + 1.3, -2.55); box(1.0, 0.8, 0.6, '#8a5a34', 6.2, y + 0.4, -2.5); cyl(0.07, 0.06, 0.12, '#ffffff', 6.2, y + 0.86, -2.35, 8);
  hotspot({ floor: 1, x: 6.2, z: -2.5, w: 1.0, h: 1.8, d: 0.8, label: 'Coffee machine', kind: 'coffee' });
  for (const x of [-6.6, -1.9]) { box(1.4, 1.2, 0.05, '#bfe0f2', x, y + 1.8, zBack + 0.13); box(1.5, 0.08, 0.1, '#ffffff', x, y + 1.18, zBack + 0.16); }

  // ---------------- JOURNEY (2) ----------------
  y = fy(2);
  box(3.2, 1.8, 0.08, '#2f4a3a', -4.6, y + 1.8, zBack + 0.15); box(3.4, 0.1, 0.18, '#8a5a34', -4.6, y + 0.88, zBack + 0.2);
  const chalk = canvasTex(512, 288, (g, w, h) => { g.fillStyle = '#2f4a3a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e9efe6'; g.fillStyle = '#e9efe6'; g.font = '700 46px "Chakra Petch", Arial'; g.fillText('BS Computer Science', 24, 72); g.font = '400 30px Inter, Arial'; g.fillText('Gaming & Animation · NED University', 24, 122); g.fillText('CGPA 3.605 / 4.00', 24, 168); g.fillText('2023 → early 2027', 24, 214); g.lineWidth = 3; g.beginPath(); g.moveTo(24, 236); g.lineTo(300, 236); g.stroke(); });
  plane(3.05, 1.7, flat(new THREE.MeshBasicMaterial({ map: chalk })), -4.6, y + 1.8, zBack + 0.2);
  hotspot({ floor: 2, x: -4.6, z: -2.6, w: 3.2, h: 2.4, d: 0.6, label: 'Chalkboard · education', kind: 'education' });
  // timeline strip
  const tl = canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d64b3a'; g.lineWidth = 6; g.beginPath(); g.moveTo(30, 128); g.lineTo(w - 30, 128); g.stroke(); journey.forEach((j, i) => { const x = 70 + i * ((w - 140) / (journey.length - 1)); g.fillStyle = '#d64b3a'; g.beginPath(); g.arc(x, 128, 16, 0, 7); g.fill(); g.fillStyle = '#1b2430'; g.font = '700 22px "Chakra Petch", Arial'; g.textAlign = 'center'; g.fillText(j.when.replace('Present (2026)', 'NOW'), x, 88); g.font = '400 18px Inter, Arial'; const t = j.title.length > 16 ? j.title.slice(0, 15) + '…' : j.title; g.fillText(t, x, 178); }); });
  box(4.6, 1.25, 0.08, '#1b2430', 1.2, y + 1.9, zBack + 0.14); plane(4.45, 1.1, flat(new THREE.MeshBasicMaterial({ map: tl })), 1.2, y + 1.9, zBack + 0.2);
  hotspot({ floor: 2, x: 1.2, z: -2.6, w: 4.6, h: 2.4, d: 0.6, label: 'Timeline · my journey', kind: 'journey' });
  // Snakes & Ladders table
  const boards = {};
  function table(cx, cz, yy) { box(1.5, 0.08, 1.1, '#8a5a34', cx, yy + 0.78, cz); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.08, 0.76, 0.08, '#5a3a22', cx + a * 0.65, yy + 0.38, cz + b * 0.45); return yy + 0.82; }
  function tableBoard(id, tex, size, cx, cz, top) {
    const g = new THREE.Group(); g.position.set(cx, top, cz); scene.add(g);
    const base = new THREE.Mesh(new THREE.BoxGeometry(size + 0.02, 0.03, size + 0.02), new THREE.MeshLambertMaterial({ color: '#2a170b' })); base.position.y = 0.015; g.add(base);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -4 })); face.rotation.x = -Math.PI / 2; face.position.y = 0.031; g.add(face);
    boards[id] = g; g.userData.face = face; return g;
  }
  const slTop = table(5.4, -1.2, y); const slTex = snakesTex(512, MILESTONES); tableBoard('journey', slTex, 0.56, 5.4, -1.2, slTop);
  const dice = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), new THREE.MeshLambertMaterial({ color: '#efe6d2' })); dice.position.set(5.85, slTop + 0.035, -0.95); scene.add(dice);
  hotspot({ floor: 2, x: 5.4, z: -1.2, w: 1.6, h: 1.2, d: 1.2, stand: new THREE.Vector3(5.4, y, -0.15), label: 'Snakes & Ladders · play', kind: 'snakes' });
  box(0.4, 0.5, 0.4, '#f3ead8', 7.0, y + 0.25, -2.5); box(0.4, 0.5, 0.4, '#f3ead8', 7.0, y + 0.75, -2.5);

  // ---------------- PROJECTS (3) ----------------
  y = fy(3);
  box(W - 0.4, 0.08, 0.06, '#f6d32d', 0, y + 0.3, zBack + 0.15); box(W - 0.4, 0.08, 0.06, '#e2468a', 0, y + H - 0.45, zBack + 0.15); // neon strips
  const screens = [];
  projects.forEach((p, i) => {
    const col = i % 6; const row = i < 6 ? 1 : 0; const x = -6.25 + col * 2.5; const yy = y + 0.95 + row * 1.5;
    box(2.25, 1.32, 0.08, '#14111c', x, yy + 0.55, zBack + 0.15);
    const tex = p.image ? loader.load(p.image) : canvasTex(256, 160, (g) => { g.fillStyle = '#2b2539'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#f6d32d'; g.font = '700 22px "Chakra Petch"'; g.fillText(p.name.slice(0, 18), 14, 86); });
    const scr = plane(2.1, 1.18, flat(new THREE.MeshBasicMaterial({ map: tex })), x, yy + 0.55, zBack + 0.2); screens.push(scr);
    hotspot({ floor: 3, x, z: -2.7, w: 2.2, h: 1.3, d: 0.4, y: yy + 0.55 - y - 0.65, stand: new THREE.Vector3(x, y, -0.6), label: p.name, kind: 'project', data: p });
  });
  // arcade cabinet + an NPC playing it
  box(0.9, 1.9, 0.8, '#2a2a30', -7.0, y + 0.95, 0.9); box(0.75, 0.55, 0.05, '#7fe0c4', -7.0, y + 1.5, 1.31); box(0.8, 0.08, 0.35, '#d64b3a', -7.0, y + 1.05, 1.45);
  hotspot({ floor: 3, x: -7.0, z: 0.9, w: 1.0, h: 2.0, d: 1.0, stand: new THREE.Vector3(-6.0, y, 1.4), face: -Math.PI / 2, label: 'Arcade · play my web games', kind: 'arcade' });

  // ---------------- SKILLS (4) ----------------
  y = fy(4);
  const groups = skills.slice(0, 5); const pieceCode = { king: 'k', queen: 'q', rook: 'r', bishop: 'b', knight: 'n' };
  groups.forEach((g, i) => {
    const x = -6.4 + i * 2.25; box(1.0, 0.8, 1.0, '#e8dcc6', x, y + 0.4, -2.3); box(1.1, 0.06, 1.1, '#d64b3a', x, y + 0.82, -2.3);
    const pc = makePiece(pieceCode[g.piece], i % 2 ? 'b' : 'w', 0.62); pc.position.set(x, y + 0.85, -2.3); pc.traverse((o) => { if (o.isMesh) o.castShadow = hi; }); scene.add(pc);
    const lt = canvasTex(256, 64, (gg) => { gg.fillStyle = '#1b2430'; gg.font = '700 26px "Chakra Petch", Arial'; gg.textAlign = 'center'; gg.fillText(g.group.split(' ')[0].replace('&', '').toUpperCase(), 128, 42); });
    plane(1.0, 0.25, new THREE.MeshBasicMaterial({ map: lt, transparent: true }), x, y + 0.55, -1.79);
    hotspot({ floor: 4, x, z: -2.3, w: 1.1, h: 2.2, d: 1.1, label: `${g.group}`, kind: 'skill', data: g });
  });
  const chTop = table(5.4, -1.2, y); tableBoard('skills', chessTex(256), 0.5, 5.4, -1.2, chTop);
  hotspot({ floor: 4, x: 5.4, z: -1.2, w: 1.6, h: 1.2, d: 1.2, stand: new THREE.Vector3(5.4, y, -0.15), label: 'Chess · play vs AI', kind: 'chess' });

  // ---------------- TROPHIES (5) ----------------
  y = fy(5);
  certificates.forEach((c, i) => {
    const x = -5.6 + i * 2.15; box(1.8, 1.4, 0.08, '#c9a24a', x, y + 1.85, zBack + 0.15);
    plane(1.62, 1.22, flat(new THREE.MeshLambertMaterial({ map: loader.load(c.image.replace('/certs/', '/certs/thumb/')) })), x, y + 1.85, zBack + 0.2);
    hotspot({ floor: 5, x, z: -2.7, w: 1.8, h: 1.5, d: 0.4, y: 1.1, stand: new THREE.Vector3(x, y, -0.8), label: c.title, kind: 'cert', data: c });
  });
  box(0.9, 1.0, 0.9, '#2a1d18', 7.0, y + 0.5, -2.2);
  const cup = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.25, 0], [0.25, 0.08], [0.08, 0.16], [0.08, 0.42], [0.28, 0.56], [0.36, 0.95], [0, 0.82]].map(([a, b]) => new THREE.Vector2(a, b)), 14), new THREE.MeshLambertMaterial({ color: '#f2c046', emissive: '#3a2a00' }));
  cup.position.set(7.0, y + 1.0, -2.2); cup.castShadow = hi; scene.add(cup); update.push((t) => { cup.rotation.y = t * 0.6; });
  hotspot({ floor: 5, x: 7.0, z: -2.2, w: 1.0, h: 2.0, d: 1.0, label: 'Trophy', kind: 'trophy' });
  add(new THREE.PlaneGeometry(13, 1.4).rotateX(-Math.PI / 2), '#a8323a', -0.5, y + 0.03, 0.2);

  // ---------------- ROOF (6) ----------------
  y = fy(6);
  cyl(1.1, 1.1, 0.12, '#2d3138', -4.5, y + 0.45, -0.8, 16); const tramp = new THREE.Mesh(new THREE.CircleGeometry(1.0, 16).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#3d6b8c' })); tramp.position.set(-4.5, y + 0.52, -0.8); scene.add(tramp);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; cyl(0.04, 0.04, 0.45, '#2d3138', -4.5 + Math.cos(a) * 1.0, y + 0.22, -0.8 + Math.sin(a) * 1.0, 5); }
  hotspot({ floor: 6, x: -4.5, z: -0.8, w: 2.2, h: 1, d: 2.2, stand: new THREE.Vector3(-4.5, y, -0.8), face: 0, label: 'Trampoline · jump!', kind: 'jump' });
  box(1.8, 0.1, 0.5, '#8a5a34', 0.6, y + 0.48, -2.3); box(1.8, 0.45, 0.08, '#8a5a34', 0.6, y + 0.75, -2.55); box(0.08, 0.45, 0.45, '#2d3138', -0.25, y + 0.22, -2.3); box(0.08, 0.45, 0.45, '#2d3138', 1.45, y + 0.22, -2.3);
  hotspot({ floor: 6, x: 0.6, z: -2.3, w: 1.9, h: 1.1, d: 0.8, stand: new THREE.Vector3(0.6, y, -2.15), face: 0, label: 'Bench · enjoy the view', kind: 'sit' });
  box(0.9, 0.55, 0.4, '#2d3138', 4.4, y + 0.28, -2.2); cyl(0.17, 0.17, 0.05, '#f6d32d', 4.15, y + 0.3, -1.99, 12); cyl(0.17, 0.17, 0.05, '#f6d32d', 4.65, y + 0.3, -1.99, 12);
  hotspot({ floor: 6, x: 4.4, z: -2.2, w: 1.0, h: 1.0, d: 0.8, label: 'Boombox · dance', kind: 'dance' });
  for (const x of [-7.2, 6.8]) { box(0.8, 0.5, 0.8, '#b0703e', x, y + 0.25, -2.4); sph(0.5, '#5f9e4a', x, y + 0.85, -2.4); }
  cyl(0.04, 0.04, 2.6, '#2d3138', -7.4, y + 1.3, 1.6, 5); const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), new THREE.MeshLambertMaterial({ color: '#d64b3a', side: THREE.DoubleSide })); flag.position.set(-6.9, y + 2.3, 1.6); scene.add(flag);
  update.push((t) => { flag.rotation.y = Math.sin(t * 2) * 0.25; });

  // ---------------- merge the static world ----------------
  const merged = new THREE.Mesh(mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g))), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  merged.castShadow = hi; merged.receiveShadow = hi; scene.add(merged);
  parts.forEach((g) => g.dispose());

  // markers above unseen hotspots (one instanced mesh)
  const mk = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.13, 0), new THREE.MeshBasicMaterial({ color: '#f6d32d' }), inter.length); scene.add(mk);
  const q = new THREE.Quaternion(); const one = new THREE.Vector3(1, 1, 1); const zero = new THREE.Vector3(0, 0, 0);
  update.push((t) => { inter.forEach((it, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t * 2); const p = it.top.clone(); p.y += Math.sin(t * 3 + i) * 0.08; m4.compose(p, q, it.seen ? zero : one); mk.setMatrixAt(i, m4); }); mk.instanceMatrix.needsUpdate = true; });

  return { inter, update, boards, dice, car, sky, sun, booth, chotuSpot, screens, liftLamp };
}

// -------- simple NPC figures (one merged, vertex-coloured mesh each) --------
export function npc(colors = {}) {
  const { shirt = '#3d6b8c', pants = '#2d3138', skin = '#c98e6a', hair = '#2a1d18' } = colors;
  const g = []; const P = (geo, col, x, y, z) => { geo.translate(x, y, z); const c = new THREE.Color(col); const n = geo.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.push(geo.index ? geo.toNonIndexed() : geo); };
  P(new THREE.CylinderGeometry(0.22, 0.25, 0.6, 8), shirt, 0, 1.1, 0); P(new THREE.SphereGeometry(0.2, 10, 8), skin, 0, 1.6, 0); P(new THREE.SphereGeometry(0.21, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 1.64, 0);
  P(new THREE.CylinderGeometry(0.09, 0.09, 0.8, 6), pants, -0.1, 0.4, 0); P(new THREE.CylinderGeometry(0.09, 0.09, 0.8, 6), pants, 0.1, 0.4, 0);
  P(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 6), shirt, -0.3, 1.1, 0); P(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 6), shirt, 0.3, 1.1, 0);
  const m = new THREE.Mesh(mergeGeometries(g), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })); m.castShadow = true; return m;
}
export function cat() {
  const g = []; const P = (geo, x, y, z, col = '#e28a3a') => { geo.translate(x, y, z); const c = new THREE.Color(col); const n = geo.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.push(geo.index ? geo.toNonIndexed() : geo); };
  P(new THREE.BoxGeometry(0.22, 0.2, 0.5), 0, 0.25, 0); P(new THREE.BoxGeometry(0.2, 0.18, 0.18), 0, 0.38, 0.3); P(new THREE.ConeGeometry(0.05, 0.1, 4), -0.06, 0.5, 0.3); P(new THREE.ConeGeometry(0.05, 0.1, 4), 0.06, 0.5, 0.3);
  for (const [x, z] of [[-0.08, 0.18], [0.08, 0.18], [-0.08, -0.18], [0.08, -0.18]]) P(new THREE.BoxGeometry(0.05, 0.16, 0.05), x, 0.08, z);
  P(new THREE.BoxGeometry(0.04, 0.04, 0.32), 0, 0.42, -0.36); P(new THREE.SphereGeometry(0.02, 4, 3), -0.05, 0.4, 0.4, '#111'); P(new THREE.SphereGeometry(0.02, 4, 3), 0.05, 0.4, 0.4, '#111');
  return new THREE.Mesh(mergeGeometries(g), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
}
