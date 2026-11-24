// All textures are drawn in code (canvas): nothing to download, crisp at any size.
import * as THREE from 'three';
import { N, rc } from './layout.js';

const INK = '#1d2540';
const TILE_COLORS = ['#ef4b3f', '#2fb86e', '#2f8cf0', '#ffc72c']; // Ludo red, green, blue, yellow
const TILE_WHITE = '#fff8ea';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

// ---- printed gaming icons (unit box, centred on 0,0, about 1 wide) ----
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const ICONS = [
  (g) => { rr(g, -.5, -.26, 1, .52, .24); g.fill(); g.fillStyle = '#fff8'; g.fillRect(-.3, -.04, .2, .06); g.fillRect(-.23, -.11, .06, .2); g.beginPath(); g.arc(.22, -.04, .05, 0, 7); g.arc(.34, .06, .05, 0, 7); g.fill(); }, // controller
  (g) => { g.beginPath(); g.arc(0, -.2, .17, 0, 7); g.fill(); g.fillRect(-.04, -.2, .08, .45); g.beginPath(); g.ellipse(0, .3, .3, .11, 0, 0, 7); g.fill(); }, // joystick
  (g) => { g.fillRect(-.12, -.42, .24, .84); g.fillRect(-.42, -.12, .84, .24); }, // d-pad
  (g) => { rr(g, -.3, -.42, .6, .84, .06); g.fill(); g.fillStyle = '#fff9'; g.fillRect(-.2, -.32, .4, .3); }, // cartridge
  (g) => { g.beginPath(); g.moveTo(0, .38); g.bezierCurveTo(-.7, -.1, -.3, -.55, 0, -.2); g.bezierCurveTo(.3, -.55, .7, -.1, 0, .38); g.fill(); }, // heart
  (g) => { g.beginPath(); g.arc(0, 0, .4, 0, 7); g.fill(); g.strokeStyle = '#fffa'; g.lineWidth = .06; g.beginPath(); g.arc(0, 0, .26, 0, 7); g.stroke(); }, // coin
  (g) => { g.save(); g.rotate(.7); g.fillRect(-.05, -.5, .1, .75); g.fillRect(-.22, .2, .44, .08); g.fillRect(-.05, .28, .1, .2); g.restore(); }, // sword
  (g) => { g.beginPath(); g.moveTo(-.34, -.36); g.lineTo(.34, -.36); g.lineTo(.34, .05); g.quadraticCurveTo(.3, .35, 0, .46); g.quadraticCurveTo(-.3, .35, -.34, .05); g.fill(); }, // shield
  (g) => { g.beginPath(); g.arc(0, .14, .3, 0, 7); g.fill(); g.fillRect(-.09, -.42, .18, .35); g.fillRect(-.14, -.46, .28, .07); }, // potion
  (g) => { g.beginPath(); g.arc(-.22, 0, .2, 0, 7); g.fill(); g.fillRect(-.08, -.05, .6, .1); g.fillRect(.3, .05, .07, .16); g.fillRect(.42, .05, .07, .12); }, // key
  (g) => { g.beginPath(); g.moveTo(-.28, -.4); g.lineTo(.28, -.4); g.lineTo(.2, .05); g.quadraticCurveTo(0, .25, -.2, .05); g.fill(); g.fillRect(-.04, .1, .08, .22); g.fillRect(-.2, .3, .4, .1); }, // trophy
  (g) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? .18 : .45; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); }, // star
  (g) => { g.beginPath(); g.arc(0, -.1, .32, Math.PI, 0); g.lineTo(.32, .38); g.lineTo(.16, .26); g.lineTo(0, .38); g.lineTo(-.16, .26); g.lineTo(-.32, .38); g.closePath(); g.fill(); g.fillStyle = '#fffc'; g.beginPath(); g.arc(-.12, -.1, .07, 0, 7); g.arc(.12, -.1, .07, 0, 7); g.fill(); }, // ghost
  (g) => { g.beginPath(); g.moveTo(0, -.46); g.quadraticCurveTo(.26, -.15, .16, .25); g.lineTo(-.16, .25); g.quadraticCurveTo(-.26, -.15, 0, -.46); g.fill(); g.beginPath(); g.moveTo(.16, .05); g.lineTo(.34, .32); g.lineTo(.16, .25); g.moveTo(-.16, .05); g.lineTo(-.34, .32); g.lineTo(-.16, .25); g.fill(); }, // rocket
  (g) => { g.lineWidth = .08; g.strokeStyle = INK; g.beginPath(); g.arc(0, 0, .3, Math.PI, 0); g.stroke(); rr(g, -.4, -.02, .16, .3, .05); g.fill(); rr(g, .24, -.02, .16, .3, .05); g.fill(); }, // headset
  (g) => { rr(g, -.4, -.34, .8, .68, .12); g.fill(); g.fillStyle = '#fff9'; rr(g, -.3, -.26, .6, .46, .08); g.fill(); }, // keycap
  (g) => { g.beginPath(); g.arc(0, -.22, .15, 0, 7); g.fill(); g.beginPath(); g.moveTo(-.1, -.1); g.lineTo(.1, -.1); g.lineTo(.16, .22); g.lineTo(-.16, .22); g.fill(); g.fillRect(-.3, .22, .6, .12); }, // pawn
  (g) => { rr(g, -.36, -.36, .72, .72, .12); g.fill(); g.fillStyle = '#fffd'; for (const [x, y] of [[-.18, -.18], [.18, -.18], [0, 0], [-.18, .18], [.18, .18]]) { g.beginPath(); g.arc(x, y, .06, 0, 7); g.fill(); } }, // dice
  (g) => { g.beginPath(); g.moveTo(-.4, -.3); g.lineTo(-.13, -.4); g.lineTo(.13, -.3); g.lineTo(.4, -.4); g.lineTo(.4, .32); g.lineTo(.13, .42); g.lineTo(-.13, .32); g.lineTo(-.4, .42); g.closePath(); g.fill(); g.strokeStyle = '#fff9'; g.lineWidth = .04; g.beginPath(); g.moveTo(-.13, -.4); g.lineTo(-.13, .32); g.moveTo(.13, -.3); g.lineTo(.13, .42); g.stroke(); }, // map
  (g) => { rr(g, -.4, -.05, .8, .42, .06); g.fill(); g.beginPath(); g.arc(0, -.05, .4, Math.PI, 0); g.fill(); g.fillStyle = '#fffb'; g.fillRect(-.05, .02, .1, .14); }, // chest
];

export function makeBoardTexture(size) {
  const px = size / N; const [c, g] = mk(size, size);
  for (let n = 1; n <= 100; n++) {
    const { r, c: col } = rc(n); const x = col * px; const y = (N - 1 - r) * px; // texture y grows downward; row 0 is the near (bottom) edge
    const coloured = (r + col) % 2 === 0; g.fillStyle = coloured ? TILE_COLORS[(Math.floor(col / 2) + r) % 4] : TILE_WHITE; g.fillRect(x, y, px, px);
    if (coloured) { g.fillStyle = '#ffffff22'; g.fillRect(x + px * .06, y + px * .06, px * .88, px * .88); }
    // paper grain
    g.globalAlpha = 0.06; for (let i = 0; i < 26; i++) { g.fillStyle = Math.random() < .5 ? '#fff' : '#000'; g.fillRect(x + Math.random() * px, y + Math.random() * px, 1 + Math.random() * 2, 1 + Math.random() * 2); } g.globalAlpha = 1;
    // printed icon (varies per tile, pseudo-random but fixed)
    g.save(); g.translate(x + px * .5, y + px * .56); g.scale(px * .5, px * .5); g.fillStyle = coloured ? '#ffffff' : INK; g.globalAlpha = coloured ? .85 : .55; ICONS[(n * 7 + r * 3) % ICONS.length](g); g.restore();
    // number
    g.fillStyle = coloured ? '#ffffff' : INK; g.font = `700 ${px * .2}px Fredoka, system-ui, sans-serif`; g.textBaseline = 'top'; g.textAlign = 'left'; g.fillText(String(n), x + px * .09, y + px * .06);
    // grid line
    g.strokeStyle = '#1d254033'; g.lineWidth = Math.max(1, px * .02); g.strokeRect(x, y, px, px);
  }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

/** Board edge (cardboard) texture. */
export function makeEdgeTexture() { const [c, g] = mk(128, 32); g.fillStyle = '#b98a58'; g.fillRect(0, 0, 128, 32); for (let i = 0; i < 40; i++) { g.fillStyle = Math.random() < .5 ? '#a47745' : '#c99a66'; g.fillRect(0, Math.random() * 32, 128, 1); } const t = tex(c); t.wrapS = THREE.RepeatWrapping; return t; }

/** Snake skin: along the length (u). */
export function makeSnakeTexture(a, b, kind) {
  const [c, g] = mk(256, 64); g.fillStyle = a; g.fillRect(0, 0, 256, 64);
  g.fillStyle = b;
  if (kind === 0) for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16 + 8, 32); g.lineTo(i * 16, 64); g.lineTo(i * 16 - 8, 32); g.fill(); }
  else if (kind === 1) for (let i = 0; i < 16; i += 2) g.fillRect(i * 16, 0, 16, 64);
  else for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(i * 16 + 8, 32, 9, 0, 7); g.fill(); }
  g.fillStyle = '#ffffff33'; g.fillRect(0, 0, 256, 12); // belly/top highlight band
  const t = tex(c); t.wrapS = THREE.RepeatWrapping; return t;
}

export function makeDiceFaceTexture(n) {
  const [c, g] = mk(128, 128); g.fillStyle = '#fbf3e2'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#d8c9a8'; g.lineWidth = 6; g.strokeRect(3, 3, 122, 122);
  const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  g.fillStyle = n === 1 ? '#c0392b' : INK;
  for (const [x, y] of P[n]) { g.beginPath(); g.arc(64 + x * 30, 64 + y * 30, n === 1 ? 17 : 11, 0, 7); g.fill(); }
  if (n === 1) { g.fillStyle = '#fff'; g.beginPath(); g.arc(58, 58, 4, 0, 7); g.fill(); }
  return tex(c);
}

/** Soft round glow sprite texture. */
export function makeGlowTexture() { const [c, g] = mk(64, 64); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, '#ffffffaa'); gr.addColorStop(1, '#fff0'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return tex(c); }
/** Ring texture (for the glowing tile marker). */
export function makeRingTexture() { const [c, g] = mk(256, 256); const gr = g.createRadialGradient(128, 128, 70, 128, 128, 126); gr.addColorStop(0, '#fff0'); gr.addColorStop(.55, '#ffffffcc'); gr.addColorStop(.7, '#fff'); gr.addColorStop(1, '#fff0'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return tex(c); }
/** Vertical light column (fades upward). */
export function makeBeamTexture() { const [c, g] = mk(8, 128); const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, '#ffffffcc'); gr.addColorStop(1, '#fff0'); g.fillStyle = gr; g.fillRect(0, 0, 8, 128); return tex(c); }
/** Ground: dark, fading radial pool. */
export function makeGroundTexture() { const [c, g] = mk(256, 256); const gr = g.createRadialGradient(128, 128, 20, 128, 128, 128); gr.addColorStop(0, '#26305a'); gr.addColorStop(.5, '#151b38'); gr.addColorStop(1, '#0a0e22'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return tex(c); }

/** Floating title label (sprite texture). Returns { texture, aspect }. */
export function makeLabel(text, color, dpr = 2) {
  const [c, g] = mk(1, 1); const fs = 44 * dpr; const font = `700 ${fs}px Fredoka, system-ui, sans-serif`; g.font = font;
  const w = Math.ceil(g.measureText(text).width + fs * 1.1); const h = Math.ceil(fs * 1.7); c.width = w; c.height = h;
  g.font = font; g.fillStyle = '#fbf3e2'; g.strokeStyle = INK; g.lineWidth = 5 * dpr; g.beginPath(); g.roundRect(3, 3, w - 6, h - 6, h / 2.2); g.fill(); g.stroke();
  g.fillStyle = color; g.beginPath(); g.arc(fs * .55, h / 2, fs * .2, 0, 7); g.fill();
  g.fillStyle = INK; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(text, fs * .9, h / 2 + 2);
  return { texture: tex(c), aspect: w / h };
}
