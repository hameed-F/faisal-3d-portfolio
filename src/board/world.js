// The 3D world: night sky, the life-size board, ladders, snakes, glowing tiles, lamps, Faisal and the dice companion.
import * as THREE from 'three';
import { T, N, tileXZ, SECTIONS, LADDERS, SNAKES } from './layout.js';
import * as TX from './textures.js';
import { loadAvatar } from './avatar.js';
import { sfx } from '../audio.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const TIER_CFG = {
  full: { shadows: true, dpr: 2, boardTex: 2048, snakeSegs: 110, stars: 320, lamps: 4, aa: true, fps: 60, avatarHz: 60 },
  lite: { shadows: false, dpr: 1.25, boardTex: 1024, snakeSegs: 56, stars: 90, lamps: 2, aa: false, fps: 30, avatarHz: 30 },
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
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j; const b = a + radial + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
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

// Study-table props around the board (simple shapes, refined materials). Returns the desk lamp's bulb (the key light sits there).
function addStationery(scene, cfg) {
  const Y = -.42; const g = new THREE.Group(); scene.add(g); const lite = cfg.lamps === 2;
  const M = (c, r = .6, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const put = (m, x, z, ry = 0, y = 0) => { m.position.set(x, Y + y, z); m.rotation.y = ry; g.add(m); m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return m; };
  // pencils: slim hexagonal lacquer, sharpened wood, graphite, brass ferrule
  const pencil = (col, x, z, ry, len = 4.4) => {
    const p = new THREE.Group(); const r = .085;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), M(col, .35)); body.rotation.z = Math.PI / 2; p.add(body);
    const wood = new THREE.Mesh(new THREE.ConeGeometry(r, .34, 6), M(0xd9b48a, .8)); wood.rotation.z = -Math.PI / 2; wood.position.x = len / 2 + .17; p.add(wood);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.03, .1, 6), M(0x2a2a2a, .4, .3)); tip.rotation.z = -Math.PI / 2; tip.position.x = len / 2 + .3; p.add(tip);
    const fer = new THREE.Mesh(new THREE.CylinderGeometry(r + .006, r + .006, .2, 12), M(0xb89a5a, .3, .9)); fer.rotation.z = Math.PI / 2; fer.position.x = -len / 2 - .1; p.add(fer);
    const er = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .16, 12), M(0xc98a82, .9)); er.rotation.z = Math.PI / 2; er.position.x = -len / 2 - .28; p.add(er);
    return put(p, x, z, ry, r);
  };
  pencil(0x2e4a3f, -11.4, 6.6, .42); pencil(0xd9a83a, -12.6, 4.9, -.16); pencil(0x1f1f24, 11.9, -2.6, 2.5, 3.8);
  // paper notes: soft pastel paper, faint handwriting, a slight curl
  const noteTex = (c) => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 256, 256); const gr = x.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, '#ffffff22'); gr.addColorStop(1, '#00000018'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#2a2f4a66'; x.lineWidth = 3; x.lineCap = 'round'; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(30, 60 + i * 34); let px = 30; while (px < 200 - (i === 4 ? 70 : 0)) { px += 8 + Math.random() * 10; x.lineTo(px, 60 + i * 34 + (Math.random() - .5) * 5); } x.stroke(); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const notes = [['#f3e3a0', -11.8, -2.4, .22], ['#efcfc9', -10.6, -4.1, -.3], ['#d6e6d8', 11.4, 6.0, .14], ['#f3e3a0', 12.4, 7.8, -.36], ['#dfe4ef', 4.8, 10.8, .26]];
  notes.slice(0, lite ? 3 : 5).forEach(([c, x, z, ry], i) => {
    const geo = new THREE.PlaneGeometry(1.9, 1.9, 6, 6); const pa = geo.attributes.position; for (let k = 0; k < pa.count; k++) { const v = pa.getY(k); if (v < -.5) pa.setZ(k, (-.5 - v) * (-.5 - v) * .18); } geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: noteTex(c), roughness: .95, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.set(x, Y + .012 + i * .004, z); m.receiveShadow = true; g.add(m);
  });
  // notebook: leather cover, cream pages, elastic band, ribbon
  const nb = new THREE.Group(); nb.add(new THREE.Mesh(new THREE.BoxGeometry(4.2, .26, 5.6), M(0x2b2420, .7)));
  const pages = new THREE.Mesh(new THREE.BoxGeometry(4.05, .2, 5.45), M(0xeee6d4, .95)); pages.position.set(.06, .01, 0); nb.add(pages);
  const band = new THREE.Mesh(new THREE.BoxGeometry(.08, .28, 5.62), M(0x111111, .6)); band.position.x = 1.6; nb.add(band);
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(.14, .02, 1.0), M(0x8a2b2b, .7)); ribbon.position.set(-.6, -.12, 3.2); nb.add(ribbon);
  put(nb, 11.6, 1.2, -.12, .13);
  // steel ruler
  const rcv = document.createElement('canvas'); rcv.width = 1024; rcv.height = 64; const rx = rcv.getContext('2d'); rx.fillStyle = '#c9ced6'; rx.fillRect(0, 0, 1024, 64); rx.fillStyle = '#20232b'; for (let i = 0; i < 120; i++) rx.fillRect(10 + i * 8.4, 0, 1.5, i % 10 ? (i % 5 ? 12 : 20) : 28); const rt = new THREE.CanvasTexture(rcv); rt.colorSpace = THREE.SRGBColorSpace; rt.anisotropy = 4;
  const steel = M(0xb8bec8, .35, .85);
  const ruler = new THREE.Mesh(new THREE.BoxGeometry(7, .04, .8), [steel, steel, new THREE.MeshStandardMaterial({ map: rt, roughness: .35, metalness: .7 }), steel, steel, steel]); put(ruler, -4.5, 10.8, .08, .02);
  // eraser, paper clips
  put(new THREE.Mesh(new THREE.BoxGeometry(.9, .28, .5), M(0xe9e4dc, .95)), -9.8, 9.4, .6, .14);
  if (!lite) for (let i = 0; i < 3; i++) { const clip = new THREE.Mesh(new THREE.TorusGeometry(.18, .022, 6, 18), steel); clip.scale.set(1, 2.3, 1); clip.rotation.x = Math.PI / 2; clip.rotation.z = i * .5; clip.position.set(9.6 + i * .45, Y + .03, 10.2 - i * .3); g.add(clip); }
  // pen cup: matte ceramic with pens and a brush
  const cup = new THREE.Group(); const cer = M(0x2d3138, .85);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(.8, .72, 2.2, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0x2d3138, roughness: .85, side: THREE.DoubleSide })); cyl.position.y = 1.1; cup.add(cyl);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(.8, .04, 6, 28), cer); lip.rotation.x = Math.PI / 2; lip.position.y = 2.2; cup.add(lip);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(.72, 24), cer); bottom.rotation.x = -Math.PI / 2; bottom.position.y = .04; cup.add(bottom);
  [[0x1b1d22, .2, .1, .15], [0x7a2e2a, -.25, .15, -.2], [0x2b3f5c, .05, -.3, .1], [0xb89a5a, .3, -.1, -.25]].forEach(([c, x, z, t], i) => { const pen = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 3.0, 10), M(c, .35, i === 3 ? .8 : 0)); pen.position.set(x, 1.9, z); pen.rotation.z = t; pen.rotation.x = t * .6; cup.add(pen); });
  put(cup, -12.0, -6.6, 0, 0);
  // desk lamp: weighted base, two brass arms, a dark metal shade aimed at the board
  const lamp = new THREE.Group(); const iron = M(0x22252c, .45, .6); const brass = M(0xb8954f, .3, .9);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, .35, 32), iron); base.position.y = .18; lamp.add(base);
  const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 4.2, 12), brass); arm1.position.set(.6, 2.2, 0); arm1.rotation.z = -.3; lamp.add(arm1);
  const joint = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 10), iron); joint.position.set(1.22, 4.2, 0); lamp.add(joint);
  const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 3.4, 12), brass); arm2.position.set(-.2, 4.75, 0); arm2.rotation.z = 1.25; lamp.add(arm2);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.4, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x1f3a33, roughness: .4, metalness: .5, side: THREE.DoubleSide })); shade.position.set(-1.75, 4.6, 0); shade.rotation.z = .5; lamp.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.3, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff0c8 })); bulb.position.set(-1.95, 4.25, 0); lamp.add(bulb);
  lamp.scale.setScalar(1.9); put(lamp, 15.0, -8.6, .41, 0);
  // cup of chai on a saucer
  if (!lite) { const mug = new THREE.Group(); const por = M(0xf1ece2, .25); const sau = new THREE.Mesh(new THREE.CylinderGeometry(1.0, .85, .08, 32), por); sau.position.y = .04; mug.add(sau); const body = new THREE.Mesh(new THREE.CylinderGeometry(.6, .48, 1.0, 28), por); body.position.y = .58; mug.add(body); const tea = new THREE.Mesh(new THREE.CircleGeometry(.56, 28), M(0x8a5328, .15)); tea.rotation.x = -Math.PI / 2; tea.position.y = .98; mug.add(tea); const h = new THREE.Mesh(new THREE.TorusGeometry(.26, .06, 8, 18), por); h.position.set(.66, .6, 0); mug.add(h); put(mug, 9.6, 8.8, .4, 0); }
  g.updateMatrixWorld(true);
  return { bulb };
}

export async function createWorld({ canvas, tier = 'full', theme = 'light', onProgress = () => {}, onSlow, FpsGovernor }) {
  let cfg = TIER_CFG[tier] || TIER_CFG.full;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: cfg.aa, powerPreference: 'high-performance', alpha: false });
  renderer.setClearColor(SKY); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.dpr));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = !!cfg.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = SKY.clone(); scene.fog = new THREE.Fog(SKY, 40, 95);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .35; pm.dispose(); }
  try { await Promise.race([Promise.all([document.fonts.load('700 40px Fredoka'), document.fonts.load("700 40px 'Nunito Sans'"), document.fonts.load("600 40px 'Nunito Sans'")]), new Promise((r) => setTimeout(r, 1500))]); } catch { /* font optional */ }
  onProgress(0.05, 'unfolding the board');

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight(0x8a93c8, 0x20160f, 0.5); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x9db4ff, 0.3); moon.position.set(-8, 14, 6); scene.add(moon);
  const lamps = []; // (the floating lanterns were removed; the desk lamp is the key light now)

  // ---------- ground + stars ----------
  // the board rests on a big wooden table (top, thick edge, four legs) standing on a dark floor
  const ground = new THREE.Mesh(new THREE.CircleGeometry(70, 40), new THREE.MeshBasicMaterial({ map: TX.makeGroundTexture(), fog: false })); ground.rotation.x = -Math.PI / 2; ground.position.y = -9.5; scene.add(ground);
  const tableTex = TX.makeTableTexture(); tableTex.wrapS = tableTex.wrapT = THREE.RepeatWrapping; tableTex.repeat.set(2, 2);
  const tableMat = new THREE.MeshStandardMaterial({ map: tableTex, roughness: .5, metalness: 0 });
  const TW = 30, TD = 27, TT = .9;
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(TW, TT, TD), tableMat); tableTop.position.set(0, -.42 - TT / 2, .4); scene.add(tableTop);
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x24160d, roughness: .6 });
  const apron = new THREE.Mesh(new THREE.BoxGeometry(TW - 1.6, 1.1, TD - 1.6), apronMat); apron.position.set(0, -.42 - TT - .55, .4); scene.add(apron);
  const legGeo = new THREE.BoxGeometry(1.1, 8.2, 1.1);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = new THREE.Mesh(legGeo, apronMat); leg.position.set(lx * (TW / 2 - 1.3), -.42 - TT - 4.1, .4 + lz * (TD / 2 - 1.3)); scene.add(leg); }
  const desk = addStationery(scene, cfg);
  const keyPos = new THREE.Vector3(); desk.bulb.getWorldPosition(keyPos);
  const key = new THREE.SpotLight(0xffe2b8, 0, 0, .72, .75, 1.4); key.position.copy(keyPos); key.target.position.set(-1.5, 0, 1.5); scene.add(key, key.target);
  if (cfg.shadows) { key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0004; key.shadow.normalBias = .03; key.shadow.camera.near = 4; key.shadow.camera.far = 50; key.shadow.radius = 4; }
  const fill = new THREE.PointLight(0xc8d2ff, 0, 0, 1.6); fill.position.set(-10, 14, 12); scene.add(fill);
  // dark mode only: a soft cool light that travels with Faisal (front-left of him) plus a faint rim from behind, so he is never a silhouette
  const avFill = new THREE.PointLight(0xcfd8ff, 0, 3.6, 1.6); const avRim = new THREE.PointLight(0x9fe8ff, 0, 3.4, 1.6); scene.add(avFill, avRim);
  tableTop.receiveShadow = true;
  const sp = new Float32Array(cfg.stars * 3); for (let i = 0; i < cfg.stars; i++) { const a = Math.random() * Math.PI * 2; const e = .15 + Math.random() * 1.2; const r = 90; sp[i * 3] = Math.cos(a) * Math.cos(e) * r; sp[i * 3 + 1] = Math.sin(e) * r * .9 + 4; sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: .8, fog: false })); scene.add(stars);

  // ---------- board ----------
  const board = new THREE.Group(); scene.add(board);
  const boardTex = TX.makeBoardTexture(cfg.boardTex);
  const boardMat = new THREE.MeshStandardMaterial({ map: boardTex, roughness: .66, metalness: 0, emissive: 0xffffff, emissiveMap: boardTex, emissiveIntensity: .1 });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(N * T, N * T), boardMat); top.rotation.x = -Math.PI / 2; top.position.y = 0.012; top.receiveShadow = true; board.add(top);
  const edgeTex = TX.makeEdgeTexture(); const edgeMat = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: .35 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(N * T + .9, .42, N * T + .9), edgeMat); slab.position.y = -.21; board.add(slab);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xc09a50, roughness: .3, metalness: .9 }); const S = N * T + .9;
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
  const snakeSkins = [['#3f7f68', '#d8b768', 0], ['#a4533a', '#e2c38f', 1], ['#5c5290', '#c9ad80', 2], ['#6b7f3a', '#2c3d20', 0]];
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
    const eyeM = new THREE.MeshStandardMaterial({ color: 0xd9b23c, roughness: .2, emissive: 0x2a1e00 }); const pupM = new THREE.MeshBasicMaterial({ color: 0x0b0b0b });
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 8), eyeM); e.position.set(s * .3, .16, .34); head.add(e); const p = new THREE.Mesh(new THREE.BoxGeometry(.018, .1, .02), pupM); p.position.set(s * .3 + s * .018, .16, .405); head.add(p); }
    const tongue = new THREE.Mesh(new THREE.BoxGeometry(.05, .02, .4), new THREE.MeshBasicMaterial({ color: 0xd9334a })); tongue.position.set(0, -.05, .78); head.add(tongue);
    scene.add(head);
    // in dark mode each snake lights the board around it
    const glowL = new THREE.PointLight(haloMat.color.getHex(), 0, 9, 1.6); const mid = curve.getPointAt(.5); glowL.position.set(mid.x, 1.2, mid.z); scene.add(glowL);
    snakes.push({ a, b, curve, mat, haloMat, head, rf, base: head.rotation.y, glowL });
  });
  onProgress(0.3, 'painting the snakes');

  // ---------- glowing tiles ----------
  const ringTex = TX.makeRingTexture(); const beamTex = TX.makeBeamTexture(); const glowTex = TX.makeGlowTexture();
  const markers = []; const hits = []; const poleMat = new THREE.MeshLambertMaterial({ color: 0xc9ced8, emissive: 0x30343e }); const knobMat = new THREE.MeshLambertMaterial({ color: 0xd9b45a, emissive: 0x6a5420 });
  for (const s of SECTIONS) {
    const [x, z] = tileXZ(s.tile); const col = new THREE.Color(s.color); const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(T * 1.55, T * 1.55), new THREE.MeshBasicMaterial({ map: ringTex, color: col, transparent: true, opacity: .6, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .05; g.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.62, .85, 3.2, 20, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color: col, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 1.6; g.add(beam);
    const orbs = []; for (let i = 0; i < 3; i++) { const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); o.scale.setScalar(.32); g.add(o); orbs.push(o); }
    // a flag planted on the tile, like a pin on a map; the cloth waves
    const fl = TX.makeFlag(s.title, s.color, s.tile); const fh = .56; const fw = Math.min(3.6, fh * fl.aspect);
    const label = new THREE.Group(); label.position.set(-.62, 0, -.45); g.add(label);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .04, 3.3, 10), poleMat); pole.position.y = 1.65; label.add(pole);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), knobMat); const foot = new THREE.Mesh(new THREE.CylinderGeometry(.14, .17, .06, 16), knobMat); foot.position.y = .05; label.add(foot); knob.position.y = 3.34; label.add(knob);
    const fgeo = new THREE.PlaneGeometry(fw, fh, 16, 2); fgeo.translate(fw / 2 + .04, 3.3 - fh / 2, 0);
    const cloth = new THREE.Mesh(fgeo, new THREE.MeshBasicMaterial({ map: fl.texture, side: THREE.DoubleSide })); label.add(cloth);
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
  avatar.setHz(cfg.avatarHz); scene.add(avatar.group); avatar.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const blobTex = TX.makeGlowTexture(); const mkBlob = (s) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, color: 0x000000, transparent: true, opacity: .5, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.scale.setScalar(s); m.position.y = .03; scene.add(m); return m; };
  const avBlob = mkBlob(1.7);
  const face = { yaw: 0 }; avatar.group.rotation.y = 0;
  onProgress(.88, 'rolling the dice');

  // ---------- dice companion ----------
  const dice = new THREE.Group(); scene.add(dice);
  const faceVals = [3, 4, 1, 6, 2, 5]; const diceMats = faceVals.map((v) => new THREE.MeshStandardMaterial({ map: TX.makeDiceFaceTexture(v), roughness: .3, emissive: 0xffd9a0, emissiveIntensity: 0 }));
  const cube = new THREE.Mesh(new THREE.BoxGeometry(.9, .9, .9), diceMats); dice.add(cube);
  const normals = { 1: [0, 1, 0], 6: [0, -1, 0], 2: [0, 0, 1], 5: [0, 0, -1], 3: [1, 0, 0], 4: [-1, 0, 0] };
  const faceQ = (n, yaw = 0) => new THREE.Quaternion().setFromAxisAngle(UP, yaw).multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...normals[n]), UP));
  // little character: googly eyes + moustache that pop in when he is not tumbling
  const charG = new THREE.Group(); dice.add(charG);
  const eyeW = new THREE.MeshBasicMaterial({ color: 0xffffff }); const eyeB = new THREE.MeshBasicMaterial({ color: 0x151515 }); const stache = new THREE.MeshBasicMaterial({ color: 0x1b1b1b });
  const eyes = []; for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.09, 14, 10), eyeW); e.position.set(s * .17, .14, .47); const p = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), eyeB); p.position.set(0, 0, .06); e.add(p); charG.add(e); eyes.push(e); }
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(.025, .2, 4, 8), stache); m.rotation.z = Math.PI / 2 + s * .3; m.position.set(s * .11, -.08, .46); charG.add(m); }
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
    hemi.intensity = lerp(.32, .045, v); moon.intensity = lerp(.18, .03, v); scene.environmentIntensity = lerp(.35, .03, v); renderer.toneMappingExposure = lerp(.95, .85, v);
    key.intensity = lerp(250, 0, v); fill.intensity = lerp(110, 0, v); avFill.intensity = v * 8; avRim.intensity = v * 6; desk.bulb.material.color.setHex(0x55504a).lerp(new THREE.Color(0xfff0c8), lit);
    const lampI = 0;
    for (const l of lamps) { l.light.intensity = lampI; l.bulb.material.color.setHex(0x3a3f5c).lerp(new THREE.Color(0xfff0c8), lit); l.glow.material.opacity = .8 * lit; }
    boardMat.color.setScalar(lerp(1, .55, v)); boardMat.emissiveIntensity = lerp(.1, .0, v);
    for (const s of snakes) { const pulse = Math.sin(W.t * 2.2 + s.a); s.mat.emissiveIntensity = v * (1.5 + .35 * pulse); s.haloMat.opacity = v * (.42 + .12 * pulse); s.glowL.intensity = v * (16 + 4 * pulse); }
    for (const m of markers) m.ring.material.opacity = .55 + .25 * v;
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
    { const ap0 = avatar.group.position; const fy0 = avatar.pivot.rotation.y; const cdx = camera.position.x - ap0.x; const cdz = camera.position.z - ap0.z; const cl = Math.hypot(cdx, cdz) || 1;
      avFill.position.set(ap0.x + cdx / cl * 1.5 - cdz / cl * .7, ap0.y + 2.4, ap0.z + cdz / cl * 1.7 + cdx / cl * .8);
      avRim.position.set(ap0.x - cdx / cl * 1.3, ap0.y + 2.3, ap0.z - cdz / cl * 1.3); void fy0; }
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
        for (let i = 0; i < pa.count; i++) { const x = b0[i * 3] - .04; const f = Math.max(0, x / fw); pa.array[i * 3 + 2] = Math.sin(x * 1.8 - W.t * 2.2 + m.ph) * .07 * f; pa.array[i * 3 + 1] = b0[i * 3 + 1] - f * f * .03; }
        pa.needsUpdate = true;
      }
      m.beam.material.opacity = .14 + .04 * Math.sin(W.t * 2.4 + m.ph);
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
    sfx('roll');
    D.rolling = true; D.hide = 0; const start = dice.position.clone(); const axis = new THREE.Vector3(Math.random() - .5, 1, Math.random() - .5).normalize(); const target = faceQ(n, Math.random() * 6.28); const spin = 7 + Math.random() * 3;
    const q0 = cube.quaternion.clone(); const qa = new THREE.Quaternion();
    await tween(1.05, (t) => {
      const h = Math.sin(Math.min(1, t) * Math.PI); dice.position.set(start.x, start.y + h * 1.9, start.z); qa.setFromAxisAngle(axis, spin * (1 - t)); cube.quaternion.copy(qa).multiply(t < .5 ? q0.clone().slerp(target, t * 2) : target);
      dice.scale.setScalar(1 + h * .25);
    }, 'out');
    D.q = target; cube.quaternion.copy(target); D.rolling = false; sfx('land');
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
