// The film layer: Godard-style chapter cards, kinetic info cards, narrator subtitles and letterbox bars.
// Pure HTML/CSS (cheap to render), optionally read aloud with the browser's speech voice.
import { canSpeak } from './voice.js';

const PAL = [['#e2231a', '#fff'], ['#0a3ba8', '#fff'], ['#f6d32d', '#111'], ['#111', '#f6d32d'], ['#fff', '#e2231a']];
let root; let speakOn = () => false; let current = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function el() {
  if (root) return root;
  root = document.createElement('div'); root.className = 'cine'; root.innerHTML = `
    <div class="cine-bar top"></div><div class="cine-bar bot"></div>
    <div class="cine-card" hidden></div>
    <div class="cine-sub" aria-live="polite" hidden></div>
    <button class="cine-skip" hidden>Skip ›</button>`;
  document.body.appendChild(root);
  return root;
}
export function setNarrationVoice(fn) { speakOn = fn; }
function say(text) {
  if (!canSpeak || !speakOn()) return;
  const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, '')); u.rate = 1.0; u.pitch = 0.9;
  const v = speechSynthesis.getVoices().find((x) => /en-GB|en_GB/i.test(x.lang)) || speechSynthesis.getVoices().find((x) => /^en/i.test(x.lang)); if (v) u.voice = v;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
export function letterbox(on) { el().classList.toggle('lb', on); }
export function isPlaying() { return !!current; }

let subT = null;
export function subtitle(text, ms = 3800) {
  const s = el().querySelector('.cine-sub'); s.innerHTML = text; s.hidden = false; s.classList.remove('out');
  clearTimeout(subT); subT = setTimeout(() => { s.classList.add('out'); setTimeout(() => { s.hidden = true; }, 400); }, ms);
}

/** A chapter card: "CHAPTER 3" + title, in a bold colour block. */
export async function chapter(n, title, sub = '') {
  const c = el().querySelector('.cine-card'); const [bg, fg] = PAL[n % PAL.length];
  c.className = 'cine-card chap'; c.style.setProperty('--bg', bg); c.style.setProperty('--fg', fg);
  c.innerHTML = `<small>CHAPITRE ${n} · CHAPTER ${n}</small><b>${title}</b>${sub ? `<i>${sub}</i>` : ''}`; c.hidden = false;
  say(`Chapter ${n}. ${title}.`);
  await sleep(1900); c.classList.add('out'); await sleep(350); c.hidden = true;
}

/**
 * Kinetic cards: short phrases that punch onto the screen one after another.
 * items: [{ k: 'small label', t: 'BIG TEXT', img?: url }]. Click / tap / E / Space advances. Returns when done or skipped.
 */
export function cards(items, { label = '' } = {}) {
  const r = el(); const c = r.querySelector('.cine-card'); const skip = r.querySelector('.cine-skip');
  if (current) current.stop();
  return new Promise((resolve) => {
    let i = -1; let timer = null; let done = false;
    const finish = () => { if (done) return; done = true; clearTimeout(timer); c.classList.add('out'); setTimeout(() => { c.hidden = true; }, 300); skip.hidden = true; removeEventListener('keydown', onKey); c.removeEventListener('click', next); if (canSpeak) speechSynthesis.cancel(); current = null; resolve(); };
    const next = () => {
      i++; if (i >= items.length) { finish(); return; }
      const it = items[i]; const [bg, fg] = PAL[(i + (label.length % 5)) % PAL.length];
      c.className = 'cine-card kin'; c.style.setProperty('--bg', bg); c.style.setProperty('--fg', fg);
      c.innerHTML = `${label ? `<span class="kin-label">${label} · ${i + 1}/${items.length}</span>` : ''}${it.img ? `<img src="${it.img}" alt="" />` : ''}${it.k ? `<small>${it.k}</small>` : ''}<b>${it.t}</b><em>tap to continue</em>`;
      c.hidden = false; void c.offsetWidth; c.classList.add('in');
      say(`${it.k ? it.k + '. ' : ''}${it.t}`);
      clearTimeout(timer); timer = setTimeout(next, Math.min(7000, 2200 + it.t.length * 45));
    };
    const onKey = (e) => { if (['e', 'E', ' ', 'Enter', 'ArrowRight'].includes(e.key)) { e.preventDefault(); next(); } if (e.key === 'Escape') finish(); };
    c.addEventListener('click', next); addEventListener('keydown', onKey);
    skip.hidden = false; skip.onclick = finish;
    current = { stop: finish };
    next();
  });
}
export function stopAll() { current?.stop(); letterbox(false); }

// narrator lines: a little fourth-wall wit, Godard style
export const NARRATOR = {
  start: ['This is Faisal. He thinks he is in a portfolio. He is in a film.', 'A boy, a car, a hut full of games. That is the whole plot.'],
  car: ['He drives. The road does not know where it goes. He does.', 'No roof. No plan. Excellent.'],
  hut: ['The hut. Where every board game is secretly a CV.', 'Inside, the table waits. Pick a game, any game.'],
  crash: ['That tree was there before you, Faisal.', 'Cinema is also failure. Mostly trees.', 'The tree wins this round.'],
  dance: ['Nobody is watching. Except you. Keep dancing, Faisal.', 'When the plot stops, the dancing starts.'],
  discover: ['A new place. The camera approves.', 'Discovery! Write that in the report.'],
  chotu: ['Enter Chotu, the snake who read the whole CV.', 'A snake appears. In this film, snakes are helpful.'],
};
export const pick = (k) => { const a = NARRATOR[k]; return a[Math.floor(Math.random() * a.length)]; };
