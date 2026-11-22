// Chess vs an AI (easy / medium / hard). You play white. View-agnostic controller.
import { Chess } from 'chess.js';
import { hud, setHud } from './hud.js';

const FILES = 'abcdefgh';
export const sqToFR = (sq) => [FILES.indexOf(sq[0]), +sq[1]]; // file 0..7, rank 1..8
export const frToSq = (f, r) => FILES[f] + r;
const NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export function createChess({ view, onEnd, onExit, onThink }) {
  const h = hud(); const game = new Chess(); let selected = null; let busy = false; let alive = true; let level = 'medium'; let reqId = 0;
  const worker = new Worker(new URL('./chess-ai.worker.js', import.meta.url), { type: 'module' });

  const levelSel = () => `<label class="gh-level">AI <select aria-label="AI difficulty"><option value="easy">Easy</option><option value="medium" selected>Medium</option><option value="hard">Hard</option></select></label>`;
  function status(extra = '') {
    let s = '';
    if (game.isCheckmate()) s = game.turn() === 'w' ? '<b>Checkmate. The AI wins.</b>' : '<b>Checkmate! You win!</b> 🎉';
    else if (game.isDraw()) s = '<b>Draw.</b>';
    else if (game.turn() === 'w') s = (game.inCheck() ? '<b>Check!</b> ' : '') + 'Your move (white). Tap a piece, then a square.';
    else s = 'The AI is thinking…';
    setHud({ status: (extra ? extra + ' ' : '') + s });
  }
  function reset() {
    game.reset(); selected = null; busy = false; reqId++;
    view.setPosition(game.board(), true); view.highlight([], null);
    setHud({ title: 'Chess vs AI', main: false, extra: levelSel() });
    h.querySelector('.gh-level select').value = level;
    h.querySelector('.gh-level select').onchange = (e) => { level = e.target.value; };
    status();
  }
  async function makeMove(m) {
    const mv = game.move(m); if (!mv) return null;
    await view.animateMove(mv, game.board());
    return mv;
  }
  function finished() {
    if (!game.isGameOver()) return false;
    onEnd?.(game.isCheckmate() ? game.turn() === 'b' : null, level);
    status(); return true;
  }
  async function aiTurn() {
    busy = true; status(); onThink?.(true);
    const id = ++reqId; const started = performance.now();
    const res = await new Promise((resolve) => { worker.onmessage = (e) => { if (e.data.id === id) resolve(e.data); }; worker.postMessage({ fen: game.fen(), level, id }); });
    const wait = 450 - (performance.now() - started); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    onThink?.(false);
    if (!alive || id !== reqId) return;
    let mv = res.none ? null : await makeMove({ from: res.from, to: res.to, promotion: res.promotion || 'q' });
    if (!mv && !game.isGameOver()) { const all = game.moves({ verbose: true }); mv = await makeMove(all[Math.floor(Math.random() * all.length)]); } // safety net
    busy = false;
    if (!finished()) status(mv ? `AI played ${NAMES[mv.piece]} ${mv.from}→${mv.to}${mv.captured ? `, taking your ${NAMES[mv.captured]}` : ''}.` : '');
  }
  async function onSquare(sq) {
    if (busy || game.turn() !== 'w' || game.isGameOver()) return;
    const piece = game.get(sq);
    if (selected) {
      const legal = game.moves({ square: selected, verbose: true }).find((m) => m.to === sq);
      if (legal) {
        selected = null; view.highlight([], null); busy = true;
        await makeMove({ from: legal.from, to: legal.to, promotion: 'q' });
        busy = false; if (!finished()) aiTurn(); return;
      }
    }
    if (piece && piece.color === 'w') {
      selected = sq; const targets = game.moves({ square: sq, verbose: true }).map((m) => m.to);
      view.highlight(targets, sq); if (!targets.length) setHud({ status: 'That piece has no legal moves. Pick another.' });
    } else { selected = null; view.highlight([], null); }
  }
  view.onSquare(onSquare);
  h.querySelector('.gh-restart').onclick = () => reset();
  h.querySelector('.gh-exit').onclick = () => exit();
  const onKey = (e) => { if (e.key === 'Escape') exit(); };
  addEventListener('keydown', onKey);
  function exit() { alive = false; reqId++; worker.terminate(); removeEventListener('keydown', onKey); h.hidden = true; view.dispose?.(); onExit?.(); }
  h.hidden = false; h.dataset.kind = 'chess'; view.mount?.(h.querySelector('.gh-board'));
  reset();
  return { exit, game };
}

// ---------- 2D canvas view (text-only mode) ----------
const GLYPH = { w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' }, b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' } };
export function chess2DView() {
  let cv; let ctx; let board = []; let hl = []; let sel = null; let cb = null; const size = 360; const s = size / 8;
  function draw() {
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      ctx.fillStyle = (r + f) % 2 ? '#8a5a34' : '#e6cf9f'; ctx.fillRect(f * s, r * s, s, s);
      const sq = frToSq(f, 8 - r);
      if (sq === sel) { ctx.fillStyle = 'rgba(217,164,65,.6)'; ctx.fillRect(f * s, r * s, s, s); }
      if (hl.includes(sq)) { ctx.fillStyle = 'rgba(47,111,143,.55)'; ctx.beginPath(); ctx.arc(f * s + s / 2, r * s + s / 2, s * 0.16, 0, 7); ctx.fill(); }
      const p = board[r]?.[f];
      if (p) { // solid glyph in the piece colour, plus a dark outline glyph on white pieces (︎ forces text, not emoji)
        const x = f * s + s / 2; const y = r * s + s / 2 + 2; ctx.font = `${s * 0.8}px "Segoe UI Symbol","DejaVu Sans",serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = p.color === 'w' ? '#fff8e8' : '#1a0f08'; ctx.fillText(GLYPH.b[p.type] + '︎', x, y);
        if (p.color === 'w') { ctx.fillStyle = '#22160d'; ctx.fillText(GLYPH.w[p.type] + '︎', x, y); }
      }
    }
  }
  return {
    mount(host) { host.innerHTML = ''; cv = document.createElement('canvas'); cv.width = cv.height = size; cv.className = 'gh-canvas'; host.appendChild(cv); ctx = cv.getContext('2d');
      cv.addEventListener('click', (e) => { const r = cv.getBoundingClientRect(); const f = Math.floor((e.clientX - r.left) / r.width * 8); const rr = Math.floor((e.clientY - r.top) / r.height * 8); cb?.(frToSq(f, 8 - rr)); }); draw(); },
    setPosition(b) { board = b; draw(); }, highlight(t, s0) { hl = t; sel = s0; draw(); },
    async animateMove(mv, b) { board = b; draw(); await new Promise((r) => setTimeout(r, 120)); },
    onSquare(f) { cb = f; }, dispose() { cv?.remove(); },
  };
}
