import * as THREE from 'three';
import { psxMat } from './psx.js';
import { frToSq } from '../games/chess.js';
import { SNAKES, LADDERS } from '../games/snakes.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function tween(dur, fn) { return new Promise((res) => { const t0 = performance.now(); const step = (now) => { const k = Math.min(1, (now - t0) / (dur * 1000)); fn(k); if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }); }
const easeOut = (k) => 1 - Math.pow(1 - k, 3);

// ---------------- chess pieces (lathe shapes + extruded knight) ----------------
const V2 = (a) => a.map(([x, y]) => new THREE.Vector2(x, y));
const PROFILES = {
  p: [[0, 0], [0.42, 0], [0.42, 0.07], [0.36, 0.11], [0.38, 0.16], [0.25, 0.22], [0.16, 0.52], [0.27, 0.6], [0.27, 0.64], [0.15, 0.68], [0.18, 0.74], [0.18, 0.92], [0.12, 1.0], [0, 1.03]],
  r: [[0, 0], [0.46, 0], [0.46, 0.08], [0.4, 0.12], [0.42, 0.18], [0.3, 0.26], [0.27, 0.9], [0.38, 0.95], [0.38, 1.22], [0.3, 1.22], [0.3, 1.12], [0, 1.12]],
  b: [[0, 0], [0.45, 0], [0.45, 0.08], [0.38, 0.12], [0.4, 0.18], [0.27, 0.25], [0.17, 0.85], [0.3, 0.92], [0.3, 0.97], [0.16, 1.02], [0.24, 1.18], [0.2, 1.36], [0.1, 1.46], [0.06, 1.52], [0.08, 1.58], [0, 1.62]],
  q: [[0, 0], [0.48, 0], [0.48, 0.08], [0.4, 0.13], [0.42, 0.19], [0.28, 0.27], [0.18, 1.0], [0.32, 1.08], [0.32, 1.14], [0.2, 1.18], [0.34, 1.5], [0.24, 1.56], [0.1, 1.62], [0.09, 1.7], [0, 1.74]],
  k: [[0, 0], [0.5, 0], [0.5, 0.08], [0.42, 0.13], [0.44, 0.2], [0.3, 0.28], [0.2, 1.05], [0.34, 1.12], [0.34, 1.18], [0.22, 1.22], [0.3, 1.52], [0.22, 1.6], [0.07, 1.62], [0.07, 1.72], [0.16, 1.72], [0.16, 1.8], [0.07, 1.8], [0.07, 1.92], [0, 1.92]],
};
const KNIGHT_BASE = [[0, 0], [0.5, 0], [0.5, 0.08], [0.44, 0.12], [0.47, 0.18], [0.38, 0.24], [0.33, 0.3], [0, 0.3]];
const KNIGHT_HEAD = [[-0.36, 0], [-0.41, 0.35], [-0.39, 0.65], [-0.3, 0.95], [-0.16, 1.15], [-0.06, 1.3], [0.01, 1.43], [0.08, 1.26], [0.22, 1.18], [0.4, 1.0], [0.52, 0.82], [0.56, 0.7], [0.47, 0.61], [0.3, 0.59], [0.18, 0.5], [0.13, 0.4], [0.22, 0.22], [0.27, 0]];
const KNIGHT_MANE = [[-0.43, 0.3], [-0.47, 0.62], [-0.4, 0.95], [-0.25, 1.17], [-0.17, 1.12], [-0.31, 0.92], [-0.37, 0.64], [-0.33, 0.32]];
let GEOS = null;
function pieceGeos() {
  if (GEOS) return GEOS;
  GEOS = {};
  for (const [t, prof] of Object.entries(PROFILES)) GEOS[t] = new THREE.LatheGeometry(V2(prof), 10);
  const base = new THREE.LatheGeometry(V2(KNIGHT_BASE), 10);
  const ex = (pts, depth) => { const g = new THREE.ExtrudeGeometry(new THREE.Shape(V2(pts)), { depth, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 1 }); g.translate(0, 0, -depth / 2); return g; };
  const head = ex(KNIGHT_HEAD, 0.27).translate(0, 0.3, 0); const mane = ex(KNIGHT_MANE, 0.15).translate(0, 0.3, 0);
  GEOS.n = [base, head, mane];
  return GEOS;
}
export function makePiece(type, color, scale) {
  const mat = color === 'w' ? psxMat({ color: '#f4ecd8' }) : psxMat({ color: '#2a1609' });
  const g = new THREE.Group(); const geos = pieceGeos();
  if (type === 'n') {
    geos.n.forEach((ge) => g.add(new THREE.Mesh(ge, mat)));
    const eye = new THREE.MeshBasicMaterial({ color: color === 'w' ? '#22160d' : '#e6cf9f' });
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 3), eye); e.position.set(0.24, 1.32, s * 0.17); g.add(e); }
    g.rotation.y = color === 'w' ? Math.PI / 2 : -Math.PI / 2; // face the opponent
  } else g.add(new THREE.Mesh(geos[type], mat));
  g.scale.setScalar(scale); g.userData = { type, color };
  return g;
}

export function chess3DView(stage) {
  const board = stage.world.boards.skills; const S = 0.5; const m = S * 0.06; const s = (S - 2 * m) / 8; const Y = 0.034;
  const decor = board.children.filter((c) => c.isMesh && c.geometry.type === 'LatheGeometry'); decor.forEach((d) => { d.visible = false; });
  const layer = new THREE.Group(); board.add(layer);
  const pos = (f, r) => new THREE.Vector3(-S / 2 + m + (f + 0.5) * s, Y, -S / 2 + m + (8 - r + 0.5) * s);
  const scale = s * 0.62; let pieces = new Map(); let cb = null;
  // highlight markers
  const dotGeo = new THREE.CylinderGeometry(s * 0.17, s * 0.17, 0.004, 8); const dotMat = new THREE.MeshBasicMaterial({ color: '#2f9fb8', transparent: true, opacity: 0.85 });
  const dots = Array.from({ length: 28 }, () => { const d = new THREE.Mesh(dotGeo, dotMat); d.visible = false; layer.add(d); return d; });
  const selRing = new THREE.Mesh(new THREE.RingGeometry(s * 0.38, s * 0.5, 12), new THREE.MeshBasicMaterial({ color: '#e8b25a', side: THREE.DoubleSide })); selRing.rotation.x = -Math.PI / 2; selRing.visible = false; layer.add(selRing);

  function setPosition(b) {
    layer.children.filter((c) => c.userData.type).forEach((c) => layer.remove(c)); pieces = new Map();
    for (let row = 0; row < 8; row++) for (let f = 0; f < 8; f++) {
      const p = b[row][f]; if (!p) continue; const r = 8 - row; const mesh = makePiece(p.type, p.color, scale); mesh.position.copy(pos(f, r)); layer.add(mesh); pieces.set(frToSq(f, r), mesh);
    }
  }
  stage.setGameClick((hit) => {
    if (hit.board !== board) return; const l = hit.local; const f = Math.floor((l.x + S / 2 - m) / s); const row = Math.floor((l.z + S / 2 - m) / s);
    if (f < 0 || f > 7 || row < 0 || row > 7) return; cb?.(frToSq(f, 8 - row));
  });
  return {
    setPosition,
    highlight(targets, sel) {
      dots.forEach((d, i) => { const t = targets[i]; d.visible = !!t; if (t) { const p = pos('abcdefgh'.indexOf(t[0]), +t[1]); d.position.set(p.x, Y + 0.003, p.z); } });
      selRing.visible = !!sel; if (sel) { const p = pos('abcdefgh'.indexOf(sel[0]), +sel[1]); selRing.position.set(p.x, Y + 0.004, p.z); }
    },
    async animateMove(mv, b) {
      const mesh = pieces.get(mv.from);
      if (mesh) {
        const a = mesh.position.clone(); const z = pos('abcdefgh'.indexOf(mv.to[0]), +mv.to[1]);
        const victim = pieces.get(mv.to);
        await tween(0.38, (k) => { const e = easeOut(k); mesh.position.lerpVectors(a, z, e); mesh.position.y = Y + Math.sin(k * Math.PI) * s * 1.2; if (victim && k > 0.6) victim.scale.setScalar(scale * (1 - (k - 0.6) / 0.4)); });
      }
      stage.sfx?.('click');
      setPosition(b);
    },
    onSquare(f) { cb = f; },
    dispose() { board.remove(layer); decor.forEach((d) => { d.visible = true; }); stage.setGameClick(null); },
  };
}

// ---------------- Snakes & Ladders ----------------
export function diceMaterials() {
  const pips = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };
  const make = (n) => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.fillStyle = '#efe6d2'; g.fillRect(0, 0, 32, 32); g.fillStyle = n === 1 ? '#a8462a' : '#22160d'; for (const [x, y] of pips[n]) { g.beginPath(); g.arc(7 + x * 9, 7 + y * 9, 3.1, 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return psxMat({ map: t }); };
  // box face order: +x, -x, +y, -y, +z, -z
  return [make(3), make(4), make(1), make(6), make(2), make(5)];
}
export const FACE_UP = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2] };

export function snakes3DView(stage) {
  const board = stage.world.boards.journey; const S = 0.56; const m = S * 0.05; const s = (S - 2 * m) / 10; const Y = 0.034;
  const cell = (n) => { if (n <= 0) return new THREE.Vector3(-S / 2 - 0.04, Y, S / 2 - 0.03); const i = n - 1; const row = Math.floor(i / 10); let col = i % 10; if (row % 2) col = 9 - col; return new THREE.Vector3(-S / 2 + m + (col + 0.5) * s, Y, S / 2 - m - (row + 0.5) * s); };
  const layer = new THREE.Group(); board.add(layer);
  const tokenGeo = new THREE.ConeGeometry(s * 0.26, s * 0.75, 7); tokenGeo.translate(0, s * 0.375, 0);
  const headGeo = new THREE.SphereGeometry(s * 0.17, 6, 4);
  const mk = (col) => { const g = new THREE.Group(); const mat = psxMat({ color: col }); g.add(new THREE.Mesh(tokenGeo, mat)); const h = new THREE.Mesh(headGeo, mat); h.position.y = s * 0.8; g.add(h); layer.add(g); return g; };
  const tokens = { you: mk('#2f6f8f'), cpu: mk('#c8553d') };
  const offset = { you: new THREE.Vector3(-s * 0.18, 0, 0), cpu: new THREE.Vector3(s * 0.18, 0, 0) };
  const place = (who, n) => tokens[who].position.copy(cell(n)).add(offset[who]);
  // dice
  const dice = stage.world.dice; const oldMat = dice.material; const oldPos = dice.position.clone(); const oldRot = dice.rotation.clone();
  dice.material = diceMaterials();
  const boardWorld = board.getWorldPosition(new THREE.Vector3());
  const diceRest = dice.parent.worldToLocal(boardWorld.clone().add(new THREE.Vector3(0.05, 0.035, 0.42)));
  dice.position.copy(diceRest);

  return {
    reset(p) { place('you', p.you); place('cpu', p.cpu); },
    async rollDice(v, who) {
      if (who === 'you') stage.avatar.play('Throw');
      const start = diceRest.clone().add(new THREE.Vector3(0.1, 0.25, 0.2)); const end = diceRest.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.08));
      const spin = new THREE.Vector3(6 + Math.random() * 6, 4 + Math.random() * 6, 5 + Math.random() * 5); const fin = FACE_UP[v]; const yaw = Math.random() * Math.PI * 2;
      await sleep(who === 'you' ? 650 : 100);
      stage.sfx?.('dice');
      await tween(0.85, (k) => {
        const e = easeOut(k); dice.position.lerpVectors(start, end, e); dice.position.y = end.y + Math.abs(Math.sin(k * Math.PI * 2.2)) * 0.12 * (1 - k);
        const rem = 1 - e; dice.rotation.set(fin[0] + spin.x * rem, yaw + spin.y * rem, fin[2] + spin.z * rem);
      });
      dice.rotation.set(fin[0], yaw, fin[2]); await sleep(280);
    },
    async movePawn(who, path) {
      for (const n of path) {
        const a = tokens[who].position.clone(); const b = cell(n).add(offset[who]);
        await tween(0.16, (k) => { tokens[who].position.lerpVectors(a, b, k); tokens[who].position.y = Y + Math.sin(k * Math.PI) * s * 0.6; });
        stage.sfx?.('tick');
      }
    },
    async slidePawn(who, from, to, kind) {
      const a = cell(from).add(offset[who]); const b = cell(to).add(offset[who]); const d = b.clone().sub(a); const n = new THREE.Vector3(-d.z, 0, d.x).normalize();
      stage.sfx?.(kind);
      await tween(kind === 'snake' ? 0.9 : 0.7, (k) => { tokens[who].position.lerpVectors(a, b, kind === 'ladder' ? easeOut(k) : k); if (kind === 'snake') tokens[who].position.addScaledVector(n, Math.sin(k * Math.PI * 3) * s * 0.5 * (1 - k)); tokens[who].position.y = Y + (kind === 'ladder' ? Math.sin(k * Math.PI) * s * 0.8 : 0); });
    },
    dispose() { board.remove(layer); dice.material = oldMat; dice.position.copy(oldPos); dice.rotation.copy(oldRot); },
  };
}
export { SNAKES, LADDERS };
