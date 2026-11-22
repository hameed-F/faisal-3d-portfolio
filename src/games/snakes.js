// Snakes & Ladders vs the computer. The controller is view-agnostic:
// a 3D view (on the cabin table) or a 2D canvas view (text-only mode) draws it.
import { hud, setHud } from './hud.js';
import { journey } from '../content.js';

export const SNAKES = { 17: 7, 54: 34, 62: 19, 64: 60, 87: 36, 93: 73, 95: 75, 98: 79 };
export const LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 72: 91, 80: 99 };
export const MILESTONES = [1, 21, 28, 51, 72, 80, 100]; // each one reveals a step of the journey

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createSnakes({ view, onEnd, onExit, toast }) {
  const h = hud(); let st; let alive = true; let seen = new Set();
  const name = { you: 'You', cpu: 'Chotu' };

  function reset() {
    st = { pos: { you: 0, cpu: 0 }, turn: 'you', busy: false, over: false };
    seen = new Set(); view.reset(st.pos);
    setHud({ title: 'Snakes & Ladders', status: 'Your turn. Roll the dice! Gold squares reveal a step of Faisal\'s journey.', main: { label: '🎲 Roll' }, extra: '<span class="gh-key"><i class="dot you"></i>You <i class="dot cpu"></i>Chotu</span>' });
  }
  async function turn(who) {
    if (st.busy || st.over || !alive) return; st.busy = true;
    setHud({ main: { label: who === 'you' ? '🎲 Rolling…' : 'Chotu is rolling…', disabled: true } });
    const roll = 1 + Math.floor(Math.random() * 6);
    await view.rollDice(roll, who);
    if (!alive) return;
    let from = st.pos[who]; let to = from + roll;
    let msg = `${name[who]} rolled a <b>${roll}</b>.`;
    if (to > 100) { msg += ' Too far: you need the exact number to land on 100.'; to = from; }
    else {
      const path = []; for (let s = from + 1; s <= to; s++) path.push(s);
      await view.movePawn(who, path); st.pos[who] = to;
      if (LADDERS[to]) { msg += ` Ladder! Up from ${to} to <b>${LADDERS[to]}</b>.`; await view.slidePawn(who, to, LADDERS[to], 'ladder'); to = LADDERS[to]; }
      else if (SNAKES[to]) { msg += ` Snake! Down from ${to} to <b>${SNAKES[to]}</b>.`; await view.slidePawn(who, to, SNAKES[to], 'snake'); to = SNAKES[to]; }
      st.pos[who] = to;
    }
    // journey milestone squares (only revealed by the player's pawn)
    const mi = MILESTONES.indexOf(st.pos[who]);
    if (who === 'you' && mi >= 0 && !seen.has(mi) && journey[mi]) { seen.add(mi); const j = journey[mi]; toast?.(`<b>${j.when}: ${j.title}</b><br>${j.where}`, 6000); }
    if (st.pos[who] === 100) {
      st.over = true; const won = who === 'you';
      setHud({ status: `${msg} ${won ? '<b>You win!</b> 🎉' : '<b>Chotu wins this time.</b>'}`, main: { label: 'Play again' } });
      onEnd?.(won); st.busy = false; return;
    }
    st.turn = who === 'you' ? 'cpu' : 'you';
    setHud({ status: `${msg} ${st.turn === 'you' ? 'Your turn.' : 'Chotu\'s turn…'}`, main: { label: '🎲 Roll', disabled: st.turn !== 'you' } });
    st.busy = false;
    if (st.turn === 'cpu') { await sleep(700); turn('cpu'); }
  }
  const onMain = () => { if (st.over) reset(); else if (st.turn === 'you') turn('you'); };
  const onRestart = () => { if (!st.busy) reset(); };
  const onExitBtn = () => exit();
  h.querySelector('.gh-main').onclick = onMain; h.querySelector('.gh-restart').onclick = onRestart; h.querySelector('.gh-exit').onclick = onExitBtn;
  const onKey = (e) => { if (e.key === ' ' || e.key === 'Enter') { if (document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); onMain(); } } if (e.key === 'Escape') exit(); };
  addEventListener('keydown', onKey);
  function exit() { alive = false; removeEventListener('keydown', onKey); h.hidden = true; view.dispose?.(); onExit?.(); }
  h.hidden = false; h.dataset.kind = 'snakes'; view.mount?.(h.querySelector('.gh-board'));
  reset();
  return { exit };
}

// ---------- 2D canvas view (text-only mode / no WebGL) ----------
export function snakes2DView(boardCanvas) {
  let cv; let ctx; let pos = { you: 0, cpu: 0 }; const size = 360; const m = size * 0.05;
  const xy = (n) => { const s = (size - 2 * m) / 10; const i = n - 1; const row = Math.floor(i / 10); let col = i % 10; if (row % 2) col = 9 - col; return [m + col * s + s / 2, size - m - row * s - s / 2, s]; };
  function draw(extra) {
    ctx.drawImage(boardCanvas, 0, 0, size, size);
    for (const [who, col, off] of [['you', '#2f6f8f', -0.18], ['cpu', '#c8553d', 0.18]]) {
      const n = pos[who]; const [x, y, s] = n ? xy(n) : [m * 0.6 + (who === 'cpu' ? 14 : 0), size - 6, 30];
      ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + off * s, y, s * 0.22, 0, 7); ctx.fill(); ctx.stroke();
    }
    if (extra) { ctx.fillStyle = 'rgba(20,32,43,.85)'; ctx.fillRect(size / 2 - 40, size / 2 - 40, 80, 80); ctx.fillStyle = '#f3ead8'; ctx.font = 'bold 48px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(extra, size / 2, size / 2 + 2); }
  }
  return {
    mount(host) { host.innerHTML = ''; cv = document.createElement('canvas'); cv.width = cv.height = size; cv.className = 'gh-canvas'; host.appendChild(cv); ctx = cv.getContext('2d'); draw(); },
    reset(p) { pos = { ...p }; draw(); },
    async rollDice(v) { for (let i = 0; i < 6; i++) { draw('⚀⚁⚂⚃⚄⚅'[Math.floor(Math.random() * 6)]); await sleep(60); } draw('⚀⚁⚂⚃⚄⚅'[v - 1]); await sleep(350); },
    async movePawn(who, path) { for (const n of path) { pos[who] = n; draw(); await sleep(140); } },
    async slidePawn(who, a, b) { await sleep(200); pos[who] = b; draw(); await sleep(250); },
    dispose() { cv?.remove(); },
  };
}
