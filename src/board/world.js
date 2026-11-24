// The 3D world: night sky, the life-size board, ladders, snakes, glowing tiles, lamps, Faisal and the dice companion.
import * as THREE from 'three';
import { T, N, tileXZ, SECTIONS, LADDERS, SNAKES } from './layout.js';
import * as TX from './textures.js';
import { loadAvatar } from './avatar.js';

export const TIER_CFG = {
  full: { dpr: 2, boardTex: 2048, snakeSegs: 110, stars: 320, lamps: 4, aa: true, fps: 60, avatarHz: 60 },
  lite: { dpr: 1.25, boardTex: 1024, snakeSegs: 56, stars: 90, lamps: 2, aa: false, fps: 30, avatarHz: 30 },
};
const SKY = new THREE.Color('#0a0f26');
const UP = new THREE.Vector3(0, 1, 0);
const ease = { io: (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), out: (t) => 1 - Math.pow(1 - t, 3), lin: (t) => t };
export const lerp = THREE.MathUtils.lerp;

function taperedTube(curve, segs, radial, rf) {
  const pos = []; const nor = []; const uv = []; const idx = []; const fr = curve.computeFrenetFrames(segs, false);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; const P = curve.getPointAt(t); const r = rf(t); const Nn = fr.normals[i]; const B = fr.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2; const nx = Math.cos(a) * Nn.x + Math.sin(a) * B.x; const ny = Math.cos(a) * Nn.y + Math.sin(a) * B.y; const nz = Math.cos(a) * Nn.z + Math.sin(a) * B.z;
      pos.push(P.x + nx * r, P.y + ny * r, P.z + nz * r); nor.push(nx, ny, nz); uv.push(t * 6, j / radial);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j; const b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}

/** Path of a snake (head tile -> tail tile) as a CatmullRom curve lying on the board. */
export function snakeCurve(a, b, k = 0) {
  const [ax, az] = tileXZ(a); const [bx, bz] = tileXZ(b); const d = new THREE.Vector3(bx - ax, 0, bz - az); const len = d.length(); const side = new THREE.Vector3(-d.z, 0, d.x).normalize();
  const pts = []; const n = 7;
  for (let i = 0; i <= n; i++) { const t = i / n; const w = Math.sin(t * Math.PI * 2.5 + k) * 0.9 * Math.sin(t * Math.PI); pts.push(new THREE.Vector3(ax + d.x * t + side.x * w, 0.28, az + d.z * t + side.z * w)); }
  const c = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5); c.userData = { len }; return c;
}
/** Ladder foot (on tile a) and top (beside tile b, raised). */
export function ladderEnds(a, b) {
  const [ax, az] = tileXZ(a); const [bx, bz] = tileXZ(b); const d = new THREE.Vector3(bx - ax, 0, bz - az).normalize();
  return { foot: new THREE.Vector3(ax + d.x * .9, .06, az + d.z * .9), top: new THREE.Vector3(bx - d.x * .85, 1.45, bz - d.z * .85) };
}

export async function createWorld({ canvas, tier = 'full', theme = 'light', onProgress = () => {}, onSlow, FpsGovernor }) {
  let cfg = TIER_CFG[tier] || TIER_CFG.full;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: cfg.aa, powerPreference: 'high-performance', alpha: false });
  renderer.setClearColor(SKY); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.dpr));
  const scene = new THREE.Scene(); scene.background = SKY.clone(); scene.fog = new THREE.Fog(SKY, 46, 110);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  try { await Promise.race([document.fonts.load('700 40px Fredoka'), new Promise((r) => setTimeout(r, 1500))]); } catch { /* font optional */ }
  onProgress(0.05, 'unfolding the board');

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight(0x7d89c8, 0x1a2040, 0.5); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x9db4ff, 0.3); moon.position.set(-8, 14, 6); scene.add(moon);
  // floating paper lanterns (light mode): they light the board; in dark mode they dim and the snakes glow instead
  const lamps = []; const glowTex0 = TX.makeGlowTexture();
  const lampPos = cfg.lamps === 2 ? [[-9.8, 6.4, -2], [9.8, 6.4, -2]] : [[-9.8, 6.6, -6.5], [9.8, 6.6, -6.5], [-9.8, 6.2, 3.5], [9.8, 6.2, 3.5]];
  const capMat = new THREE.MeshLambertMaterial({ color: 0x1d2540 });
  lampPos.forEach(([x, y, z], i) => {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const paper = new THREE.Mesh(new THREE.SphereGeometry(.62, 18, 14), new THREE.MeshBasicMaterial({ color: 0xfff0c8 })); paper.scale.set(1, 1.25, 1); g.add(paper);
    const ribs = new THREE.Mesh(new THREE.SphereGeometry(.635, 10, 7), new THREE.MeshBasicMaterial({ color: 0xc2503e, wireframe: true, transparent: true, opacity: .35 })); ribs.scale.set(1, 1.25, 1); g.add(ribs);
    for (const yy of [-.8, .8]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .14, 14), capMat); c.position.y = yy; g.add(c); }
    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(.03, .06, .5, 6), new THREE.MeshBasicMaterial({ color: [0xef4b3f, 0x2fb86e, 0x2f8cf0, 0xffc72c][i % 4] })); tassel.position.y = -1.1; g.add(tassel);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex0, color: 0xffc98a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .8 })); glow.scale.setScalar(4.2); g.add(glow);
    const light = new THREE.PointLight(0xfff1dd, 0, 60, 2); g.add(light);
    scene.add(g); lamps.push({ light, bulb: paper, glow, g, y, ph: i * 1.3 });
  });

  // ---------- ground + stars ----------
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshBasicMaterial({ map: TX.makeGroundTexture(), fog: false })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.42; scene.add(ground);
  const sp = new Float32Array(cfg.stars * 3); for (let i = 0; i < cfg.stars; i++) { const a = Math.random() * Math.PI * 2; const e = .15 + Math.random() * 1.2; const r = 90; sp[i * 3] = Math.cos(a) * Math.cos(e) * r; sp[i * 3 + 1] = Math.sin(e) * r * .9 + 4; sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: .8, fog: false })); scene.add(stars);

  // ---------- board ----------
  const board = new THREE.Group(); scene.add(board);
  const boardTex = TX.makeBoardTexture(cfg.boardTex);
  const boardMat = new THREE.MeshLambertMaterial({ map: boardTex, emissive: 0xffffff, emissiveMap: boardTex, emissiveIntensity: .3 });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(N * T, N * T), boardMat); top.rotation.x = -Math.PI / 2; top.position.y = 0.012; board.add(top);
  const edgeTex = TX.makeEdgeTexture(); const edgeMat = new THREE.MeshLambertMaterial({ map: edgeTex });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(N * T + .9, .42, N * T + .9), edgeMat); slab.position.y = -.21; board.add(slab);
  const rimMat = new THREE.MeshLambertMaterial({ color: 0x1d2540 }); const S = N * T + .9;
  for (const [w, d, x, z] of [[S, .22, 0, S / 2 - .11], [S, .22, 0, -S / 2 + .11], [.22, S, S / 2 - .11, 0], [.22, S, -S / 2 + .11, 0]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(w, .16, d), rimMat); r.position.set(x, .06, z); board.add(r); }
  onProgress(0.15, 'printing the tiles');

  // ---------- ladders ----------
  const woodMat = new THREE.MeshLambertMaterial({ color: 0xb87a3b });
  const box = new THREE.BoxGeometry(1, 1, 1);
  for (const [a, b] of LADDERS) {
    const { foot, top: tp } = ladderEnds(a, b); const dir = tp.clone().sub(foot); const L = dir.length(); dir.normalize();
    const side = new THREE.Vector3().crossVectors(UP, dir).normalize(); const upv = new THREE.Vector3().crossVectors(dir, side).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, upv, dir));
    const rails = new THREE.InstancedMesh(box, woodMat, 4); const m = new THREE.Matrix4(); const mid = foot.clone().add(tp).multiplyScalar(.5);
    for (const s of [-1, 1]) { m.compose(mid.clone().addScaledVector(side, s * .5), q, new THREE.Vector3(.14, .16, L)); rails.setMatrixAt(s < 0 ? 0 : 1, m); }
    for (const s of [-1, 1]) { const p = tp.clone().addScaledVector(side, s * .5); p.y = tp.y / 2; m.compose(p, new THREE.Quaternion(), new THREE.Vector3(.16, tp.y, .16)); rails.setMatrixAt(s < 0 ? 2 : 3, m); }
    board.add(rails);
    const nr = Math.floor(L / .5); const rungs = new THREE.InstancedMesh(box, woodMat, nr);
    for (let i = 0; i < nr; i++) { m.compose(foot.clone().addScaledVector(dir, .3 + i * (L - .5) / Math.max(1, nr - 1)), q, new THREE.Vector3(1.0, .1, .1)); rungs.setMatrixAt(i, m); }
    board.add(rungs);
  }

  // ---------- snakes ----------
  const snakeSkins = [['#3f8f7d', '#f0c85a', 0], ['#c2503e', '#f4dca0', 1], ['#7a58a8', '#e7c1a0', 2], ['#5f9a4d', '#2d4a2a', 0]];
  const snakes = [];
  SNAKES.forEach(([a, b], i) => {
    const [c1, c2, kind] = snakeSkins[i % snakeSkins.length]; const curve = snakeCurve(a, b, i * 1.7);
    const skin = TX.makeSnakeTexture(c1, c2, kind);
    const mat = new THREE.MeshLambertMaterial({ map: skin, emissive: new THREE.Color(c1).lerp(new THREE.Color('#9dffd0'), .55), emissiveMap: skin, emissiveIntensity: 0 });
    const rf = (t) => .38 * (t < .08 ? .75 + 3 * t : 1 - .72 * (t - .08) / .92);
    const body = new THREE.Mesh(taperedTube(curve, cfg.snakeSegs, 10, rf), mat); scene.add(body);
    const haloMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(c1).lerp(new THREE.Color('#9dffd0'), .6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const halo = new THREE.Mesh(taperedTube(curve, Math.floor(cfg.snakeSegs / 2), 8, (t) => rf(t) * 1.7), haloMat); scene.add(halo);
    // head
    const head = new THREE.Group(); const p0 = curve.getPointAt(0); const tan = curve.getTangentAt(0).negate();
    head.position.copy(p0); head.position.y = .42; head.rotation.y = Math.atan2(tan.x, tan.z);
    const hm = new THREE.Mesh(new THREE.SphereGeometry(.5, 16, 12), mat); hm.scale.set(.9, .62, 1.15); head.add(hm);
    const eyeM = new THREE.MeshBasicMaterial({ color: 0xffffff }); const pupM = new THREE.MeshBasicMaterial({ color: 0x111111 });
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), eyeM); e.position.set(s * .27, .2, .38); head.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), pupM); p.position.set(s * .27, .2, .48); head.add(p); }
    const tongue = new THREE.Mesh(new THREE.BoxGeometry(.05, .02, .4), new THREE.MeshBasicMaterial({ color: 0xd9334a })); tongue.position.set(0, -.05, .78); head.add(tongue);
    scene.add(head);
    snakes.push({ a, b, curve, mat, haloMat, head, rf, base: head.rotation.y });
  });
  onProgress(0.3, 'painting the snakes');

  // ---------- glowing tiles ----------
  const ringTex = TX.makeRingTexture(); const beamTex = TX.makeBeamTexture(); const glowTex = TX.makeGlowTexture();
  const markers = []; const hits = []; const poleMat = new THREE.MeshLambertMaterial({ color: 0x17203d }); const knobMat = new THREE.MeshLambertMaterial({ color: 0xffc72c, emissive: 0xffc72c, emissiveIntensity: .4 });
  for (const s of SECTIONS) {
    const [x, z] = tileXZ(s.tile); const col = new THREE.Color(s.color); const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(T * 1.55, T * 1.55), new THREE.MeshBasicMaterial({ map: ringTex, color: col, transparent: true, opacity: .9, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .05; g.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.62, .85, 3.2, 20, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color: col, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 1.6; g.add(beam);
    const orbs = []; for (let i = 0; i < 3; i++) { const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); o.scale.setScalar(.55); g.add(o); orbs.push(o); }
    // a flag planted on the tile, like a pin on a map; the cloth waves
    const fl = TX.makeFlag(s.title, s.color); const fh = .78; const fw = Math.min(3.4, fh * fl.aspect);
    const label = new THREE.Group(); label.position.set(-.62, 0, -.45); g.add(label);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.045, .06, 3.3, 8), poleMat); pole.position.y = 1.65; label.add(pole);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 8), knobMat); knob.position.y = 3.34; label.add(knob);
    const fgeo = new THREE.PlaneGeometry(fw, fh, 16, 2); fgeo.translate(fw / 2 + .04, 3.3 - fh / 2, 0);
    const cloth = new THREE.Mesh(fgeo, new THREE.MeshBasicMaterial({ map: fl.texture, transparent: true, alphaTest: .4, side: THREE.DoubleSide })); label.add(cloth);
    const base = Float32Array.from(fgeo.attributes.position.array); cloth.userData = { base, fw };
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, 3.4, 12), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1.5; hit.userData.section = s.id; g.add(hit); hits.push(hit);
    markers.push({ s, g, ring, beam, orbs, label, cloth, ph: Math.random() * 6.28 });
  }

  // ---------- holo projector (Projects) ----------
  const holo = new THREE.Group(); holo.visible = false; scene.add(holo);
  const holoMat = new THREE.MeshBasicMaterial({ color: 0x7fe3d4, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(2.6, .5, 3.4, 28, 1, true), holoMat); cone.position.y = 1.7; holo.add(cone);
  const hdisc = new THREE.Mesh(new THREE.RingGeometry(.4, .75, 28), new THREE.MeshBasicMaterial({ color: 0x7fe3d4, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); hdisc.rotation.x = -Math.PI / 2; hdisc.position.y = .06; holo.add(hdisc);

  // floating project cards inside the hologram
  const cards = new THREE.Group(); cards.visible = false; scene.add(cards); const cardHits = []; const texLoader = new THREE.TextureLoader();
  const frameMat = new THREE.LineBasicMaterial({ color: 0x9ff5e6, transparent: true, opacity: .9 });
  function buildCards(list) {
    if (cards.children.length) return;
    list.forEach((p, i) => {
      const g = new THREE.Group(); const mat = new THREE.MeshBasicMaterial({ color: 0xbffcf2, transparent: true, opacity: .0, side: THREE.DoubleSide, depthWrite: false });
      if (p.image) texLoader.load(p.image, (t) => { t.colorSpace = THREE.SRGBColorSpace; mat.map = t; mat.color.set(0xd8fff8); mat.needsUpdate = true; });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .9), mat); g.add(plane); plane.userData.project = p.id; cardHits.push(plane);
      const fr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.56, .96)), frameMat); g.add(fr);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.06), new THREE.MeshBasicMaterial({ color: 0x5fe0cc, transparent: true, opacity: .14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); back.position.z = -.02; g.add(back);
      g.userData = { i, mat, n: list.length }; cards.add(g);
    });
  }
  let cardsT = 0;
  function updateCards(dt) {
    if (!cards.visible) return; cardsT = Math.min(1, cardsT + dt * .9);
    cards.children.forEach((g) => {
      const { i, mat, n } = g.userData; const ring = i % 2; const per = Math.ceil(n / 2); const a = (Math.floor(i / 2) / per) * Math.PI * 2 + W.t * .22 + ring * .5;
      const rad = ring ? 2.3 : 3.1; const e = Math.min(1, Math.max(0, cardsT * 1.6 - i * .05));
      g.position.set(Math.cos(a) * rad * e, .3 + e * (ring ? 3.4 : 2.3) + Math.sin(W.t * 1.2 + i) * .06, Math.sin(a) * rad * e);
      g.scale.setScalar(.2 + .8 * e); g.lookAt(camera.position.x, g.getWorldPosition(tmp2).y, camera.position.z);
      mat.opacity = .9 * e;
    });
  }
  const tmp2 = new THREE.Vector3();

  // ---------- avatar ----------
  const avatar = await loadAvatar('/models/avatar.glb', (f) => onProgress(.35 + f * .5, 'waking Faisal up'));
  avatar.setHz(cfg.avatarHz); scene.add(avatar.group);
  const blobTex = TX.makeGlowTexture(); const mkBlob = (s) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, color: 0x000000, transparent: true, opacity: .5, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.scale.setScalar(s); m.position.y = .03; scene.add(m); return m; };
  const avBlob = mkBlob(1.7);
  const face = { yaw: 0 }; avatar.group.rotation.y = 0;
  onProgress(.88, 'rolling the dice');

  // ---------- dice companion ----------
  const dice = new THREE.Group(); scene.add(dice);
  const faceVals = [3, 4, 1, 6, 2, 5]; const diceMats = faceVals.map((v) => new THREE.MeshLambertMaterial({ map: TX.makeDiceFaceTexture(v), emissive: 0xffd9a0, emissiveIntensity: 0 }));
  const cube = new THREE.Mesh(new THREE.BoxGeometry(.9, .9, .9), diceMats); dice.add(cube);
  const normals = { 1: [0, 1, 0], 6: [0, -1, 0], 2: [0, 0, 1], 5: [0, 0, -1], 3: [1, 0, 0], 4: [-1, 0, 0] };
  const faceQ = (n, yaw = 0) => new THREE.Quaternion().setFromAxisAngle(UP, yaw).multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...normals[n]), UP));
  // little character: googly eyes + moustache that pop in when he is not tumbling
  const charG = new THREE.Group(); dice.add(charG);
  const eyeW = new THREE.MeshBasicMaterial({ color: 0xffffff }); const eyeB = new THREE.MeshBasicMaterial({ color: 0x151515 }); const stache = new THREE.MeshBasicMaterial({ color: 0x1b1b1b });
  const eyes = []; for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.15, 12, 10), eyeW); e.position.set(s * .2, .16, .5); const p = new THREE.Mesh(new THREE.SphereGeometry(.075, 10, 8), eyeB); p.position.set(0, 0, .11); e.add(p); charG.add(e); eyes.push(e); }
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(.04, .26, 4, 8), stache); m.rotation.z = Math.PI / 2 + s * .35; m.position.set(s * .15, -.1, .47); charG.add(m); }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.24, .3, .2, 14), new THREE.MeshLambertMaterial({ color: 0x2b6b5a })); cap.position.set(0, .5, 0); charG.add(cap); // a little topi on top
  const dBlob = mkBlob(1.1);
  const D = { target: new THREE.Vector3(), rolling: false, mood: 'idle', hover: false, q: faceQ(1), bob: 0, hide: 0, tumble: 0 };
  cube.quaternion.copy(D.q);

  // ---------- camera control ----------
  const cam = { pos: new THREE.Vector3(0, 20, 20), look: new THREE.Vector3(0, 0, 0), sx: 0, sy: 0, fov: 38 };
  const goal = { pos: cam.pos.clone(), look: cam.look.clone(), sx: 0, sy: 0, fov: 38, tau: 0.9 };
  const size = { w: 1, h: 1, a: 1 };
  function resize() {
    const w = canvas.clientWidth || window.innerWidth; const h = canvas.clientHeight || window.innerHeight; size.w = w; size.h = h; size.a = w / h;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.dpr));
  }
  /** pose that frames `halfW` world units of width around `center`, looking down at `elev` degrees */
  function fit(center, halfW, elev = 58, fov = 38, halfH = halfW * 0.55) {
    const tv = Math.tan(THREE.MathUtils.degToRad(fov / 2)); const D2 = Math.max(halfW / (size.a * tv), halfH / tv, 7.5); const e = THREE.MathUtils.degToRad(elev);
    return { look: center.clone(), pos: center.clone().add(new THREE.Vector3(0, Math.sin(e) * D2, Math.cos(e) * D2)), fov };
  }
  const boardFit = () => fit(new THREE.Vector3(0, 0, 1.9), 10.2, 58, 38, 9.4);
  function setCam(p, { tau = 0.9, sx = 0, sy = 0, snap = false } = {}) {
    goal.pos.copy(p.pos); goal.look.copy(p.look); goal.fov = p.fov ?? 38; goal.sx = sx; goal.sy = sy; goal.tau = tau;
    if (snap) { cam.pos.copy(goal.pos); cam.look.copy(goal.look); cam.sx = sx; cam.sy = sy; cam.fov = goal.fov; }
  }

  // ---------- tweens ----------
  const tweens = []; const W = { skip: false, active: true, t: 0 };
  function tween(dur, fn, e = 'io') {
    return new Promise((res) => {
      if (W.skip || dur <= 0) { fn(1); res(); return; }
      tweens.push({ t: 0, dur, fn, e: ease[e] || ease.io, res });
    });
  }
  const wait = (s) => tween(s, () => {}, 'lin');
  function stepTweens(dt) {
    for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(tw.e(k)); if (k >= 1 || W.skip) { if (W.skip) tw.fn(1); tweens.splice(i, 1); tw.res(); } }
  }

  // ---------- theme ----------
  const TH = { target: theme === 'dark' ? 1 : 0, v: theme === 'dark' ? 1 : 0 };
  function applyTheme(v) {
    const lit = 1 - v;
    hemi.intensity = lerp(.5, .28, v); moon.intensity = lerp(.3, .14, v);
    const lampI = lerp(60, 0, v) * (lamps.length === 2 ? 1.7 : 1);
    for (const l of lamps) { l.light.intensity = lampI; l.bulb.material.color.setHex(0x3a3f5c).lerp(new THREE.Color(0xfff0c8), lit); l.glow.material.opacity = .8 * lit; }
    boardMat.color.setScalar(lerp(1, .62, v)); boardMat.emissiveIntensity = lerp(.32, .05, v);
    for (const s of snakes) { s.mat.emissiveIntensity = v * (.9 + .25 * Math.sin(W.t * 2.2 + s.a)); s.haloMat.opacity = v * (.3 + .1 * Math.sin(W.t * 2.2 + s.a)); }
    for (const m of markers) m.ring.material.opacity = .85 + .1 * v;
    stars.material.opacity = lerp(.55, .95, v);
  }

  // ---------- picking ----------
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect(); ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    if (cards.visible) { const c = ray.intersectObjects(cardHits, false); if (c.length) return { project: c[0].object.userData.project }; }
    const d = ray.intersectObject(cube, false); const h = ray.intersectObjects(hits, false);
    if (d.length && (!h.length || d[0].distance < h[0].distance)) return { dice: true };
    if (h.length) return { section: h[0].object.userData.section };
    return null;
  }

  // ---------- loop ----------
  const clock = new THREE.Clock(); const frameCbs = []; let raf = 0; let lastRender = 0; const gov = FpsGovernor ? new FpsGovernor({ onSlow }) : null;
  const tmp = new THREE.Vector3(); const right = new THREE.Vector3(); const ndiff = new THREE.Vector3();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!W.active) { clock.getDelta(); return; }
    if (cfg.fps < 60 && now - lastRender < 1000 / cfg.fps - 2) return; lastRender = now;
    const dt = Math.min(clock.getDelta(), 0.1); W.t += dt; gov?.tick(now);
    stepTweens(dt);
    // theme blend
    if (Math.abs(TH.v - TH.target) > .001) TH.v += (TH.target - TH.v) * Math.min(1, dt * 4); else TH.v = TH.target; applyTheme(TH.v);
    // avatar facing + shadow
    let dy = face.yaw - avatar.pivot.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); avatar.pivot.rotation.y += dy * Math.min(1, dt * 9);
    avatar.update(dt);
    const ap = avatar.group.position; avBlob.position.x = ap.x; avBlob.position.z = ap.z; const hgt = Math.max(0, ap.y); avBlob.scale.setScalar(1.7 / (1 + hgt * .6)); avBlob.material.opacity = .5 / (1 + hgt * .8); avBlob.visible = hgt < 6;
    // markers: circling glow + title
    for (const m of markers) {
      const a = W.t * .9 + m.ph; m.ring.rotation.z = W.t * .5 + m.ph; m.ring.scale.setScalar(1 + .06 * Math.sin(W.t * 2 + m.ph));
      m.orbs.forEach((o, i) => { const aa = a * 1.4 + i * 2.094; o.position.set(Math.cos(aa) * .95, .55 + .55 * Math.sin(W.t * 1.3 + i * 2 + m.ph) + i * .35, Math.sin(aa) * .95); });
      if (m.label.visible) {
        m.label.rotation.y = Math.atan2(camera.position.x - m.g.position.x, camera.position.z - m.g.position.z) + Math.sin(W.t * .5 + m.ph) * .12;
        const pa = m.cloth.geometry.attributes.position; const b0 = m.cloth.userData.base; const fw = m.cloth.userData.fw;
        for (let i = 0; i < pa.count; i++) { const x = b0[i * 3] - .04; const f = Math.max(0, x / fw); pa.array[i * 3 + 2] = Math.sin(x * 2.4 - W.t * 3.2 + m.ph) * .16 * f; pa.array[i * 3 + 1] = b0[i * 3 + 1] - f * f * .08 + Math.sin(x * 1.7 - W.t * 2.4) * .03 * f; }
        pa.needsUpdate = true;
      }
      m.beam.material.opacity = .26 + .07 * Math.sin(W.t * 2.4 + m.ph);
    }
    for (const l of lamps) { l.g.position.y = l.y + Math.sin(W.t * .8 + l.ph) * .18; l.g.rotation.y = W.t * .2 + l.ph; }
    for (const s of snakes) { s.head.rotation.y = s.base + Math.sin(W.t * 1.4 + s.a) * .18; s.head.position.y = .42 + Math.sin(W.t * 2 + s.a) * .03; }
    cone.rotation.y = W.t * .6; hdisc.rotation.z = W.t * .8; updateCards(dt);
    // camera
    const k = 1 - Math.exp(-dt / Math.max(.05, goal.tau));
    cam.pos.lerp(goal.pos, k); cam.look.lerp(goal.look, k); cam.sx += (goal.sx - cam.sx) * k; cam.sy += (goal.sy - cam.sy) * k; cam.fov += (goal.fov - cam.fov) * k;
    camera.position.copy(cam.pos); camera.lookAt(cam.look);
    if (Math.abs(camera.fov - cam.fov) > .01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
    if (Math.abs(cam.sx) > .0005 || Math.abs(cam.sy) > .0005) camera.setViewOffset(size.w, size.h, cam.sx * size.w, cam.sy * size.h, size.w, size.h); else camera.clearViewOffset();
    camera.updateMatrixWorld();
    // dice follows Faisal on his left (as seen from the camera)
    right.setFromMatrixColumn(camera.matrixWorld, 0); right.y = 0; right.normalize();
    const fy = avatar.pivot.rotation.y; D.bob += dt; const bk = D.side ? .2 : 1.35; const sd = D.side ? 1.5 : .55; tmp.set(ap.x - Math.sin(fy) * bk + Math.cos(fy) * sd, ap.y, ap.z - Math.cos(fy) * bk - Math.sin(fy) * sd); if (D.side) tmp.y -= .6; tmp.y += 1.85 + Math.sin(D.bob * 2.2) * .09 + (D.mood === 'talk' ? Math.abs(Math.sin(D.bob * 7)) * .18 : 0);
    if (!D.rolling) { dice.position.lerp(tmp, Math.min(1, dt * 3.5)); }
    if (!D.rolling) { // idle motion
      const spin = D.mood === 'think' ? 1.6 : 0; if (spin) cube.rotation.y += dt * spin; else { cube.quaternion.slerp(D.q, Math.min(1, dt * 6)); }
      D.hv = (D.hv ?? 0) + (D.hide - (D.hv ?? 0)) * Math.min(1, dt * 6); const s = (D.hover ? 1.12 : 1) * (1 - D.hv); dice.scale.setScalar(Math.max(.001, s)); dice.visible = s > .02;
    }
    charG.visible = !D.rolling && D.mood !== 'think'; charG.scale.setScalar(D.rolling ? .001 : 1);
    ndiff.copy(camera.position).sub(dice.position).setY(0); charG.rotation.y = Math.atan2(ndiff.x, ndiff.z); // eyes always look toward the camera
    diceMats.forEach((m) => { m.emissiveIntensity = (D.mood === 'listen' ? .55 : 0) + (D.hover ? .15 : 0); });
    dBlob.position.x = dice.position.x; dBlob.position.z = dice.position.z; dBlob.scale.setScalar(1.1 / (1 + dice.position.y * .25)); dBlob.material.opacity = .32;
    for (const f of frameCbs) f(dt, W.t);
    renderer.render(scene, camera);
  }
  function start() { if (!raf) { clock.start(); raf = requestAnimationFrame(frame); } }
  const ro = new ResizeObserver(() => resize()); ro.observe(canvas); resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { W.active = !document.hidden && !W.covered; });

  // ---------- dice actions ----------
  async function rollDice(n) {
    D.rolling = true; D.hide = 0; const start = dice.position.clone(); const axis = new THREE.Vector3(Math.random() - .5, 1, Math.random() - .5).normalize(); const target = faceQ(n, Math.random() * 6.28); const spin = 7 + Math.random() * 3;
    const q0 = cube.quaternion.clone(); const qa = new THREE.Quaternion();
    await tween(1.05, (t) => {
      const h = Math.sin(Math.min(1, t) * Math.PI); dice.position.set(start.x, start.y + h * 1.9, start.z); qa.setFromAxisAngle(axis, spin * (1 - t)); cube.quaternion.copy(qa).multiply(t < .5 ? q0.clone().slerp(target, t * 2) : target);
      dice.scale.setScalar(1 + h * .25);
    }, 'out');
    D.q = target; cube.quaternion.copy(target); D.rolling = false;
  }
  function setDiceFace(n) { D.q = faceQ(n, 0.4); }

  const api = {
    renderer, scene, camera, avatar, dice, D, faceQ, W, size, snakes, markers, holo, hits, cube,
    camGoal: () => goal.pos.clone(), snapCam() { cam.pos.copy(goal.pos); cam.look.copy(goal.look); cam.sx = goal.sx; cam.sy = goal.sy; cam.fov = goal.fov; }, setCam, fit, boardFit, tween, wait, rollDice, setDiceFace, pick, start,
    onFrame: (f) => frameCbs.push(f),
    face: (yaw) => { face.yaw = yaw; }, faceSnap: (yaw) => { face.yaw = yaw; avatar.pivot.rotation.y = yaw; },
    setTheme(t) { TH.target = t === 'dark' ? 1 : 0; },
    showLabels(v) { for (const m of markers) m.label.visible = v; },
    showCards(list, at) { if (!list) { cards.visible = false; return; } buildCards(list); cards.position.copy(at); cards.visible = true; cardsT = 0; },
    setTier(t) { cfg = TIER_CFG[t] || cfg; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.dpr)); avatar.setHz(cfg.avatarHz); resize(); },
    setActive(v) { W.covered = !v; W.active = v && !document.hidden; },
    govReset: () => gov?.reset(), get gov() { return gov; },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); },
  };
  setCam(boardFit(), { snap: true }); applyTheme(TH.v);
  onProgress(1, 'ready');
  return api;
}
