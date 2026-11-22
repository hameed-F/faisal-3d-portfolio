// Chess AI in a Web Worker (the page never freezes).
// Own compact 0x88 engine (chess.js was ~400 nodes/s, far too slow to search well):
// pseudo-legal move generation + king-safety check, negamax alpha-beta, iterative deepening
// with a time limit, MVV-LVA + killer move ordering, capture-only quiescence, piece-square tables.
// The UI still uses chess.js for the rules, so every AI move is validated there.

const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
const VAL = [0, 100, 320, 330, 500, 900, 20000];
const PST = [null,
  [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
];
const KDIR = [-17, -16, -15, -1, 1, 15, 16, 17]; const NDIR = [-33, -31, -18, -14, 14, 18, 31, 33];
const BDIR = [-17, -15, 15, 17]; const RDIR = [-16, -1, 1, 16];
const MATE = 1e6;

let bd = new Int8Array(128); let side = 1; let castle = 0; let ep = -1; const stack = []; const kingSq = { 1: 0, '-1': 0 };

function loadFen(fen) {
  bd = new Int8Array(128); const [pos, s, c, e] = fen.split(' ');
  let r = 7; let f = 0;
  for (const ch of pos) {
    if (ch === '/') { r--; f = 0; continue; }
    if (/\d/.test(ch)) { f += +ch; continue; }
    const t = 'pnbrqk'.indexOf(ch.toLowerCase()) + 1; const col = ch === ch.toUpperCase() ? 1 : -1;
    bd[r * 16 + f] = t * col; if (t === K) kingSq[col] = r * 16 + f; f++;
  }
  side = s === 'w' ? 1 : -1;
  castle = (c.includes('K') ? 1 : 0) | (c.includes('Q') ? 2 : 0) | (c.includes('k') ? 4 : 0) | (c.includes('q') ? 8 : 0);
  ep = e && e !== '-' ? (+e[1] - 1) * 16 + 'abcdefgh'.indexOf(e[0]) : -1;
}

function attacked(sq, by) {
  // pawns
  const pd = by === 1 ? -16 : 16;
  for (const d of [pd - 1, pd + 1]) { const s = sq + d; if (!(s & 0x88) && bd[s] === P * by) return true; }
  for (const d of NDIR) { const s = sq + d; if (!(s & 0x88) && bd[s] === N * by) return true; }
  for (const d of KDIR) { const s = sq + d; if (!(s & 0x88) && bd[s] === K * by) return true; }
  for (const d of BDIR) { let s = sq + d; while (!(s & 0x88)) { const p = bd[s]; if (p) { if (p === B * by || p === Q * by) return true; break; } s += d; } }
  for (const d of RDIR) { let s = sq + d; while (!(s & 0x88)) { const p = bd[s]; if (p) { if (p === R * by || p === Q * by) return true; break; } s += d; } }
  return false;
}

// move: from | to<<7 | promo<<14 | flags<<17   flags: 1 capture, 2 en passant, 4 castle, 8 double push
const mv = (f, t, pr = 0, fl = 0) => f | (t << 7) | (pr << 14) | (fl << 17);
const mFrom = (m) => m & 127; const mTo = (m) => (m >> 7) & 127; const mPro = (m) => (m >> 14) & 7; const mFl = (m) => m >> 17;

function gen(capsOnly) {
  const out = []; const us = side; const them = -side;
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const p = bd[sq]; if (!p || Math.sign(p) !== us) continue; const t = p * us;
    if (t === P) {
      const fwd = 16 * us; const rank = sq >> 4; const promoRank = us === 1 ? 6 : 1; const startRank = us === 1 ? 1 : 6;
      const push = (to, fl) => { if (rank === promoRank) for (const pr of [Q, N, R, B]) out.push(mv(sq, to, pr, fl)); else out.push(mv(sq, to, 0, fl)); };
      if (!capsOnly || rank === promoRank) { const one = sq + fwd; if (!(one & 0x88) && !bd[one]) { push(one, 0); if (!capsOnly && rank === startRank && !bd[one + fwd]) out.push(mv(sq, one + fwd, 0, 8)); } }
      for (const d of [fwd - 1, fwd + 1]) { const to = sq + d; if (to & 0x88) continue; if (bd[to] && Math.sign(bd[to]) === them) push(to, 1); else if (to === ep) out.push(mv(sq, to, 0, 3)); }
    } else if (t === N || t === K) {
      for (const d of (t === N ? NDIR : KDIR)) { const to = sq + d; if (to & 0x88) continue; const q = bd[to]; if (!q) { if (!capsOnly) out.push(mv(sq, to)); } else if (Math.sign(q) === them) out.push(mv(sq, to, 0, 1)); }
      if (t === K && !capsOnly) {
        const r0 = us === 1 ? 0 : 112; const ks = us === 1 ? 1 : 4; const qs = us === 1 ? 2 : 8;
        if (sq === r0 + 4 && (castle & ks) && !bd[r0 + 5] && !bd[r0 + 6] && bd[r0 + 7] === R * us && !attacked(r0 + 4, them) && !attacked(r0 + 5, them) && !attacked(r0 + 6, them)) out.push(mv(sq, r0 + 6, 0, 4));
        if (sq === r0 + 4 && (castle & qs) && !bd[r0 + 3] && !bd[r0 + 2] && !bd[r0 + 1] && bd[r0] === R * us && !attacked(r0 + 4, them) && !attacked(r0 + 3, them) && !attacked(r0 + 2, them)) out.push(mv(sq, r0 + 2, 0, 4));
      }
    } else {
      const dirs = t === B ? BDIR : t === R ? RDIR : KDIR;
      for (const d of dirs) { let to = sq + d; while (!(to & 0x88)) { const q = bd[to]; if (!q) { if (!capsOnly) out.push(mv(sq, to)); } else { if (Math.sign(q) === them) out.push(mv(sq, to, 0, 1)); break; } to += d; } }
    }
  }
  return out;
}

const CASTLE_MASK = new Uint8Array(128).fill(15); CASTLE_MASK[0] = 13; CASTLE_MASK[7] = 14; CASTLE_MASK[4] = 12; CASTLE_MASK[112] = 7; CASTLE_MASK[119] = 11; CASTLE_MASK[116] = 3;
function make(m) {
  const f = mFrom(m); const t = mTo(m); const fl = mFl(m); const p = bd[f];
  let cap = bd[t]; let capSq = t;
  if (fl & 2) { capSq = t - 16 * side; cap = bd[capSq]; bd[capSq] = 0; }
  stack.push([m, cap, capSq, castle, ep]);
  bd[t] = mPro(m) ? mPro(m) * side : p; bd[f] = 0;
  if (Math.abs(p) === K) { kingSq[side] = t; if (fl & 4) { if (t > f) { bd[f + 1] = bd[f + 3]; bd[f + 3] = 0; } else { bd[f - 1] = bd[f - 4]; bd[f - 4] = 0; } } }
  castle &= CASTLE_MASK[f] & CASTLE_MASK[t];
  ep = fl & 8 ? f + 16 * side : -1;
  side = -side;
  return !attacked(kingSq[-side], side); // false = left own king in check (illegal)
}
function unmake() {
  const [m, cap, capSq, c, e] = stack.pop(); side = -side; castle = c; ep = e;
  const f = mFrom(m); const t = mTo(m); const fl = mFl(m);
  bd[f] = mPro(m) ? P * side : bd[t]; bd[t] = 0; bd[capSq] = cap;
  if (Math.abs(bd[f]) === K) { kingSq[side] = f; if (fl & 4) { if (t > f) { bd[f + 3] = bd[f + 1]; bd[f + 1] = 0; } else { bd[f - 4] = bd[f - 1]; bd[f - 1] = 0; } } }
}

function evaluate() {
  let s = 0;
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const p = bd[sq]; if (!p) continue; const t = Math.abs(p); const r = sq >> 4; const f = sq & 7;
    const idx = p > 0 ? (7 - r) * 8 + f : r * 8 + f;
    const v = VAL[t] + PST[t][idx]; s += p > 0 ? v : -v;
  }
  return s * side;
}

let deadline = 0; let nodes = 0; let stopped = false; const killers = [];
const score = (m, ply) => { const fl = mFl(m); let s = 0; if (fl & 1) s += 10 * VAL[Math.abs(bd[mTo(m)]) || P] - VAL[Math.abs(bd[mFrom(m)])] + 100000; if (mPro(m)) s += 90000; if (killers[ply] === m) s += 50000; return s; };
const ordered = (list, ply, first) => list.map((m) => [m === first ? 1e9 : score(m, ply), m]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);

function quiesce(alpha, beta, depth) {
  if ((++nodes & 1023) === 0 && performance.now() > deadline) stopped = true;
  if (stopped) return alpha;
  const stand = evaluate(); if (stand >= beta) return beta; if (stand > alpha) alpha = stand; if (depth === 0) return alpha;
  for (const m of ordered(gen(true), 0)) {
    if (!make(m)) { unmake(); continue; }
    const sc = -quiesce(-beta, -alpha, depth - 1); unmake();
    if (sc >= beta) return beta; if (sc > alpha) alpha = sc;
  }
  return alpha;
}
function negamax(depth, alpha, beta, ply) {
  if ((++nodes & 1023) === 0 && performance.now() > deadline) stopped = true;
  if (stopped) return 0;
  const inCheck = attacked(kingSq[side], -side);
  if (depth <= 0 && !inCheck) return quiesce(alpha, beta, 6);
  let legal = 0; let best = -MATE;
  for (const m of ordered(gen(false), ply)) {
    if (!make(m)) { unmake(); continue; }
    legal++; const sc = -negamax(depth - 1 + (inCheck && ply < 8 ? 1 : 0), -beta, -alpha, ply + 1); unmake();
    if (stopped) return 0;
    if (sc > best) best = sc;
    if (sc > alpha) alpha = sc;
    if (alpha >= beta) { if (!(mFl(m) & 1)) killers[ply] = m; break; }
  }
  if (!legal) return inCheck ? -MATE + ply : 0;
  return best;
}

function search(fen, level) {
  loadFen(fen);
  const cfg = { easy: { maxDepth: 2, ms: 250, noise: 90, blunder: 0.25 }, medium: { maxDepth: 4, ms: 900, noise: 12, blunder: 0 }, hard: { maxDepth: 7, ms: 2200, noise: 0, blunder: 0 } }[level] || { maxDepth: 3, ms: 600, noise: 20, blunder: 0 };
  deadline = performance.now() + cfg.ms; nodes = 0; stopped = false; killers.length = 0;
  let root = gen(false).filter((m) => { const ok = make(m); unmake(); return ok; });
  if (!root.length) return null;
  if (cfg.blunder && Math.random() < cfg.blunder) { const m = root[Math.floor(Math.random() * root.length)]; return { m, depth: 0 }; }
  let best = root[0]; let bestDepth = 0;
  for (let d = 1; d <= cfg.maxDepth; d++) {
    let alpha = -Infinity; let localBest = null; const scored = [];
    for (const m of ordered(root, 0, best)) {
      // with noise (easy/medium) every root move gets an exact score (full window), then noise picks among them;
      // without noise (hard) the usual narrowing window is used
      make(m); const raw = -negamax(d - 1, -MATE - 1, cfg.noise ? MATE + 1 : -alpha, 1); unmake();
      if (stopped) break;
      const sc = raw + (cfg.noise && Math.abs(raw) < MATE - 100 ? (Math.random() - 0.5) * cfg.noise : 0);
      scored.push([sc, m]); if (sc > alpha) { alpha = sc; localBest = m; }
    }
    // a partial iteration still searched the previous best first, so its winner is at least as good
    if (localBest !== null) { best = localBest; if (!stopped) bestDepth = d; }
    if (stopped) break;
    if (alpha > MATE - 100) break; // found a mate
  }
  return { m: best, depth: bestDepth };
}

const sqName = (s) => 'abcdefgh'[s & 7] + ((s >> 4) + 1);
self.onmessage = (e) => {
  const { fen, level, id } = e.data; const t = performance.now(); const r = search(fen, level);
  if (!r) { self.postMessage({ id, none: true }); return; }
  self.postMessage({ id, from: sqName(mFrom(r.m)), to: sqName(mTo(r.m)), promotion: mPro(r.m) ? ' pnbrqk'[mPro(r.m)] : undefined, depth: r.depth, nodes, ms: Math.round(performance.now() - t) });
};
