import * as THREE from 'three';
import { makePiece, diceMaterials, FACE_UP } from '../stage/games3d.js';
import { frToSq } from '../games/chess.js';
import { SNAKES, LADDERS } from '../games/snakes.js';
import { mat } from './materials.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tween = (dur, fn) => new Promise((res) => { const t0 = performance.now(); const step = (now) => { const k = Math.min(1, (now - t0) / (dur * 1000)); fn(k); if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
const easeOut = (k) => 1 - Math.pow(1 - k, 3);

// ---------------- CHESS on the giant plaza ----------------
export function chessGiantView(api) {
  const b = api.boards.skills; const S = b.size; const m = b.margin; const s = (S - 2 * m) / 8; const Y = b.top;
  const layer = new THREE.Group(); b.group.add(layer);
  const pos = (f, r) => new THREE.Vector3(-S / 2 + m + (f + 0.5) * s, Y, -S / 2 + m + (8 - r + 0.5) * s);
  const scale = s * 0.6; let pieces = new Map(); let cb = null;
  const dotGeo = new THREE.CylinderGeometry(s * 0.18, s * 0.18, 0.05, 16); const dotMat = new THREE.MeshBasicMaterial({ color: '#3fb6d4', transparent: true, opacity: 0.9 });
  const dots = Array.from({ length: 28 }, () => { const d = new THREE.Mesh(dotGeo, dotMat); d.visible = false; layer.add(d); return d; });
  const ring = new THREE.Mesh(new THREE.RingGeometry(s * 0.38, s * 0.5, 24), new THREE.MeshBasicMaterial({ color: '#e8b25a', side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.visible = false; layer.add(ring);
  // the avatar stands at the white side, like the player at the table
  const side = b.group.position.clone().add(new THREE.Vector3(S / 2 + 1.4, 0, S / 2 - 2)); api.avatar.group.position.copy(side); api.avatar.group.rotation.y = -Math.PI * 0.75; api.avatar.setBase('Idle');
  function setPosition(board) {
    layer.children.filter((c) => c.userData.type).forEach((c) => layer.remove(c)); pieces = new Map();
    for (let row = 0; row < 8; row++) for (let f = 0; f < 8; f++) { const p = board[row][f]; if (!p) continue; const r = 8 - row; const mesh = makePiece(p.type, p.color, scale); mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; }); mesh.position.copy(pos(f, r)); layer.add(mesh); pieces.set(frToSq(f, r), mesh); }
  }
  api.setGameClick((hit) => { if (hit.board !== b) return; const l = hit.local; const f = Math.floor((l.x + S / 2 - m) / s); const row = Math.floor((l.z + S / 2 - m) / s); if (f < 0 || f > 7 || row < 0 || row > 7) return; cb?.(frToSq(f, 8 - row)); });
  const sqPos = (sq) => pos('abcdefgh'.indexOf(sq[0]), +sq[1]);
  return {
    setPosition,
    highlight(targets, sel) { dots.forEach((d, i) => { const t = targets[i]; d.visible = !!t; if (t) { const p = sqPos(t); d.position.set(p.x, Y + 0.03, p.z); } }); ring.visible = !!sel; if (sel) { const p = sqPos(sel); ring.position.set(p.x, Y + 0.04, p.z); } },
    async animateMove(mv, board) {
      const mesh = pieces.get(mv.from); const victim = pieces.get(mv.to);
      if (mesh) { const a = mesh.position.clone(); const z = sqPos(mv.to); await tween(0.5, (k) => { mesh.position.lerpVectors(a, z, easeOut(k)); mesh.position.y = Y + Math.sin(k * Math.PI) * s * 0.9; if (victim && k > 0.55) victim.scale.setScalar(scale * Math.max(0.01, 1 - (k - 0.55) / 0.45)); }); }
      api.sfx?.('click'); setPosition(board);
    },
    onSquare(f) { cb = f; },
    dispose() { b.group.remove(layer); api.setGameClick(null); },
  };
}

// ---------------- SNAKES & LADDERS on the giant field: YOU are the token ----------------
function cellLocal(b, n) {
  const S = b.size; const m = b.margin; const s = (S - 2 * m) / 10;
  if (n <= 0) return new THREE.Vector3(-S / 2 - 1.2, b.top, S / 2 - 1);
  const i = n - 1; const row = Math.floor(i / 10); let col = i % 10; if (row % 2) col = 9 - col;
  return new THREE.Vector3(-S / 2 + m + (col + 0.5) * s, b.top, S / 2 - m - (row + 0.5) * s);
}
function buildProps(b) { // giant 3D ladders and snakes (built once, they stay as part of the field)
  if (b.propsBuilt) return; b.propsBuilt = true;
  const g = new THREE.Group(); b.group.add(g); const s = (b.size - 2 * b.margin) / 10;
  const wood = mat('#8a5a30'); const rail = new THREE.CylinderGeometry(0.07, 0.07, 1, 6); const rung = new THREE.CylinderGeometry(0.05, 0.05, 1, 5);
  for (const [a, z] of Object.entries(LADDERS)) {
    const p1 = cellLocal(b, +a); const p2 = cellLocal(b, z); const d = p2.clone().sub(p1); const L = d.length(); const ang = Math.atan2(d.x, d.z);
    const lad = new THREE.Group(); lad.position.copy(p1).setY(b.top + 0.12); lad.rotation.y = ang; g.add(lad);
    for (const sx of [-0.45, 0.45]) { const r = new THREE.Mesh(rail, wood); r.scale.y = L; r.rotation.x = Math.PI / 2; r.position.set(sx, 0, L / 2); r.castShadow = true; lad.add(r); }
    for (let k = 0.5; k < L; k += 0.7) { const r = new THREE.Mesh(rung, wood); r.scale.y = 0.9; r.rotation.z = Math.PI / 2; r.position.set(0, 0, k); lad.add(r); }
  }
  const cols = ['#5b8a5a', '#a8462a', '#2f6f8f', '#c88a1c'];
  Object.entries(SNAKES).forEach(([a, z], i) => {
    const p1 = cellLocal(b, +a); const p2 = cellLocal(b, z); const d = p2.clone().sub(p1); const n = new THREE.Vector3(-d.z, 0, d.x).normalize(); const pts = [];
    for (let k = 0; k <= 24; k++) { const t = k / 24; const wv = Math.sin(t * Math.PI * 3) * s * 0.55 * (1 - t * 0.6); pts.push(p1.clone().addScaledVector(d, t).addScaledVector(n, wv).setY(b.top + 0.18)); }
    const curve = new THREE.CatmullRomCurve3(pts); const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.22, 7, false), mat(cols[i % 4])); tube.castShadow = true; g.add(tube);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 7), mat(cols[i % 4])); head.scale.set(1.3, 0.7, 1); head.position.copy(p1).setY(b.top + 0.3); head.castShadow = true; g.add(head);
    for (const sx of [-0.18, 0.18]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshBasicMaterial({ color: '#111' })); e.position.copy(p1).add(new THREE.Vector3(sx, 0.55, 0)); g.add(e); }
    b.snakeCurves = b.snakeCurves || {}; b.snakeCurves[a] = curve;
  });
}

export function snakesGiantView(api) {
  const b = api.boards.journey; buildProps(b);
  const toWorld = (n) => b.group.localToWorld(cellLocal(b, n).clone());
  const offset = { you: new THREE.Vector3(-0.45, 0, 0), cpu: new THREE.Vector3(0.5, 0, 0.1) };
  const actor = { you: api.avatar.group, cpu: api.chotu.group };
  api.chotuBusy = true;
  const place = (who, n) => { actor[who].position.copy(toWorld(n)).add(offset[who]); if (who === 'cpu') actor.cpu.position.y += 0.05; };
  const face = (who, target) => { const d = target.clone().sub(actor[who].position); if (who === 'you') actor.you.rotation.y = Math.atan2(d.x, d.z); else actor.cpu.rotation.y = Math.atan2(-d.z, d.x); };
  // giant dice
  const dice = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), diceMaterials()); dice.castShadow = true; dice.visible = false; b.group.parent.add(dice);
  const savedAvatar = { pos: api.avatar.group.position.clone(), rot: api.avatar.group.rotation.y };
  return {
    reset(p) { place('you', p.you); place('cpu', p.cpu); face('you', toWorld(1)); api.avatar.setBase('Idle'); api.gameFollow = actor.you; },
    async rollDice(v, who) {
      api.gameFollow = actor[who]; const from = actor[who].position.clone(); if (who === 'you') { api.avatar.play('Throw'); await sleep(1700); }
      const start = from.clone().add(new THREE.Vector3(0, 2.2, 0)); const toC = b.group.position.clone().sub(from).setY(0).normalize(); const end = from.clone().addScaledVector(toC, 1.8); end.y = b.group.position.y + b.top + 0.45;
      const spin = new THREE.Vector3(8 + Math.random() * 6, 5 + Math.random() * 5, 6 + Math.random() * 6); const fin = FACE_UP[v]; const yaw = Math.random() * Math.PI * 2;
      dice.visible = true; api.sfx?.('dice');
      await tween(0.9, (k) => { const e = easeOut(k); dice.position.lerpVectors(start, end, e); dice.position.y = end.y + Math.abs(Math.sin(k * Math.PI * 2.3)) * 1.4 * (1 - k); const r = 1 - e; dice.rotation.set(fin[0] + spin.x * r, yaw + spin.y * r, fin[2] + spin.z * r); });
      dice.rotation.set(fin[0], yaw, fin[2]); await sleep(500);
    },
    async movePawn(who, path) {
      if (who === 'you') api.avatar.setBase('Walk');
      for (const n of path) {
        const a = actor[who].position.clone(); const z = toWorld(n).add(offset[who]); face(who, z);
        await tween(0.3, (k) => { actor[who].position.lerpVectors(a, z, k); actor[who].position.y = a.y + Math.sin(k * Math.PI) * 0.45; });
        api.sfx?.('tick');
      }
      if (who === 'you') api.avatar.setBase('Idle');
    },
    async slidePawn(who, from, to, kind) {
      const a = toWorld(from).add(offset[who]); const z = toWorld(to).add(offset[who]); api.sfx?.(kind);
      const curve = kind === 'snake' && b.snakeCurves?.[from];
      if (who === 'you') api.avatar.setBase(kind === 'ladder' ? 'Walk' : 'Idle');
      await tween(kind === 'snake' ? 1.4 : 1.2, (k) => {
        if (curve) { const p = b.group.localToWorld(curve.getPointAt(k).clone()); actor[who].position.set(p.x + offset[who].x, b.group.position.y + b.top + 0.1 + Math.sin(k * 30) * 0.05, p.z + offset[who].z); }
        else { actor[who].position.lerpVectors(a, z, easeOut(k)); actor[who].position.y = a.y + Math.sin(k * Math.PI) * 1.2; }
      });
      if (who === 'you') { api.avatar.setBase('Idle'); if (kind === 'snake') api.avatar.play('Disappointed'); else api.avatar.play('Victory'); }
    },
    dispose() { dice.parent?.remove(dice); api.chotuBusy = false; api.avatar.group.position.copy(savedAvatar.pos); api.avatar.group.rotation.y = savedAvatar.rot; api.avatar.setBase('Idle'); },
  };
}
