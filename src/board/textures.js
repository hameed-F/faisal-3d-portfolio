// All textures are drawn in code (canvas): nothing to download, crisp at any size.
import * as THREE from 'three';
import { N, rc } from './layout.js';

const INK = '#1d2540';
const TILE_COLORS = ['#ef4b3f', '#2fb86e', '#2f8cf0', '#ffc72c']; // Ludo red, green, blue, yellow
const TILE_WHITE = '#fff8ea';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
// Tile art: emblems of Faisal's own projects + little Karachi / Pakistan doodles. All drawn in code, centred on 0,0, about 1 unit wide.
const ICONS = [
  // ---- his projects ----
  (g) => { g.beginPath(); g.arc(0, -.1, .32, Math.PI, 0); g.lineTo(.32, .38); g.lineTo(.16, .26); g.lineTo(0, .38); g.lineTo(-.16, .26); g.lineTo(-.32, .38); g.closePath(); g.fill(); hole(g, -.12, -.1, .07); hole(g, .12, -.1, .07); }, // ghost (Ghost Lantern)
  (g) => { g.fillRect(-.06, -.46, .12, .08); g.beginPath(); g.moveTo(-.22, -.36); g.lineTo(.22, -.36); g.lineTo(.3, .3); g.lineTo(-.3, .3); g.closePath(); g.fill(); g.fillRect(-.34, .3, .68, .1); hole(g, 0, -.02, .12); }, // lantern
  (g) => { g.beginPath(); g.moveTo(-.38, -.42); g.lineTo(-.18, -.2); g.lineTo(.18, -.2); g.lineTo(.38, -.42); g.lineTo(.4, .1); g.quadraticCurveTo(.38, .42, 0, .42); g.quadraticCurveTo(-.38, .42, -.4, .1); g.closePath(); g.fill(); hole(g, -.15, .02, .06); hole(g, .15, .02, .06); }, // cat (Mochi)
  (g) => { g.beginPath(); g.ellipse(-.06, 0, .32, .2, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(.2, 0); g.lineTo(.46, -.2); g.lineTo(.46, .2); g.closePath(); g.fill(); hole(g, -.24, -.04, .04); }, // fish (Royal Fish)
  (g) => { g.beginPath(); g.arc(0, -.12, .28, Math.PI * .8, Math.PI * .2); g.lineTo(.12, .2); g.lineTo(-.12, .2); g.closePath(); g.fill(); g.fillRect(-.12, .24, .24, .07); g.fillRect(-.09, .34, .18, .06); }, // bulb (Light Up The House)
  (g) => { g.beginPath(); g.arc(0, 0, .4, 0, 7); g.fill(); hole(g, 0, 0, .32); g.fillRect(-.03, -.25, .06, .27); g.save(); g.rotate(1.1); g.fillRect(-.03, -.2, .06, .22); g.restore(); }, // clock (Chrono Rebellion)
  (g) => { g.beginPath(); g.moveTo(-.46, -.12); g.quadraticCurveTo(0, -.32, .46, -.12); g.quadraticCurveTo(.44, .22, .14, .2); g.quadraticCurveTo(0, .08, -.14, .2); g.quadraticCurveTo(-.44, .22, -.46, -.12); g.fill(); hole(g, -.2, -.02, .08); hole(g, .2, -.02, .08); }, // mask (Behind the Smile, jam theme "Mask")
  (g) => { rr(g, -.44, -.2, .88, .4, .14); g.fill(); g.fillRect(-.5, -.06, .06, .12); g.fillRect(.44, -.06, .06, .12); hole(g, -.18, 0, .11); hole(g, .18, 0, .11); }, // VR headset (B99 VR)
  (g) => { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, .4, .6, Math.PI * 2 - .6); g.closePath(); g.fill(); for (const x of [.3, .44]) { g.beginPath(); g.arc(x + .06, 0, .05, 0, 7); g.fill(); } }, // chomper (Pac-Man clone)
  (g) => { g.beginPath(); g.moveTo(.46, 0); g.lineTo(-.3, -.06); g.lineTo(-.42, -.24); g.lineTo(-.48, -.24); g.lineTo(-.42, .02); g.lineTo(-.44, .06); g.lineTo(-.3, .06); g.closePath(); g.fill(); g.beginPath(); g.moveTo(.06, -.03); g.lineTo(-.14, -.42); g.lineTo(-.24, -.42); g.lineTo(-.12, -.03); g.moveTo(.06, .03); g.lineTo(-.14, .42); g.lineTo(-.24, .42); g.lineTo(-.12, .03); g.fill(); }, // aircraft (low-poly aircraft)
  (g) => { g.beginPath(); g.moveTo(0, -.42); g.lineTo(.4, -.2); g.lineTo(0, .02); g.lineTo(-.4, -.2); g.closePath(); g.fill(); g.globalAlpha *= .75; g.beginPath(); g.moveTo(-.4, -.2); g.lineTo(0, .02); g.lineTo(0, .46); g.lineTo(-.4, .24); g.closePath(); g.fill(); g.globalAlpha /= .75; g.beginPath(); g.moveTo(.4, -.2); g.lineTo(0, .02); g.lineTo(0, .46); g.lineTo(.4, .24); g.closePath(); g.fill(); }, // block (Mera Craft)
  (g) => { g.save(); g.rotate(-.2); g.fillRect(-.42, -.34, .84, .16); g.restore(); rr(g, -.42, -.12, .84, .5, .04); g.fill(); hole(g, -.18, .13, .05); hole(g, 0, .13, .05); hole(g, .18, .13, .05); }, // clapperboard (motion & video work)
  (g) => { rr(g, -.5, -.24, 1, .48, .22); g.fill(); hole(g, -.26, 0, .06); hole(g, .22, -.06, .05); hole(g, .34, .06, .05); }, // controller (game dev)
  // ---- Karachi / Pakistan doodles ----
  (g) => { rr(g, -.3, -.12, .5, .48, .08); g.fill(); g.lineWidth = .07; g.strokeStyle = g.fillStyle; g.beginPath(); g.arc(.24, .1, .12, -1.4, 1.4); g.stroke(); g.lineWidth = .05; for (const x of [-.16, 0]) { g.beginPath(); g.moveTo(x, -.22); g.quadraticCurveTo(x + .08, -.32, x, -.44); g.stroke(); } }, // cup of chai
  (g) => { g.save(); g.rotate(.7); rr(g, -.09, -.48, .18, .62, .06); g.fill(); g.fillRect(-.04, .14, .08, .26); g.restore(); g.beginPath(); g.arc(.28, .28, .1, 0, 7); g.fill(); }, // cricket bat + ball
  (g) => { g.beginPath(); g.moveTo(0, -.46); g.lineTo(.3, -.06); g.lineTo(0, .3); g.lineTo(-.3, -.06); g.closePath(); g.fill(); g.lineWidth = .04; g.strokeStyle = g.fillStyle; g.beginPath(); g.moveTo(0, .3); g.quadraticCurveTo(.15, .38, .05, .46); g.quadraticCurveTo(-.08, .5, .12, .52); g.stroke(); }, // kite (patang)
  (g) => { g.beginPath(); g.moveTo(-.44, .2); g.lineTo(-.44, -.06); g.quadraticCurveTo(-.36, -.36, -.02, -.36); g.lineTo(.26, -.36); g.lineTo(.4, -.04); g.lineTo(.46, .2); g.closePath(); g.fill(); for (const x of [-.26, .28]) { g.beginPath(); g.arc(x, .26, .1, 0, 7); g.fill(); } hole(g, .12, -.18, .09); }, // rickshaw
  (g) => { g.beginPath(); g.ellipse(0, .06, .3, .36, -.5, 0, 7); g.fill(); g.beginPath(); g.ellipse(.12, -.34, .14, .06, -.6, 0, 7); g.fill(); }, // mango
  (g) => { g.beginPath(); g.moveTo(-.06, -.48); g.lineTo(.06, -.48); g.lineTo(.12, .2); g.lineTo(.3, .3); g.lineTo(.36, .46); g.lineTo(-.36, .46); g.lineTo(-.3, .3); g.lineTo(-.12, .2); g.closePath(); g.fill(); g.fillRect(-.1, -.2, .2, .05); g.fillRect(-.13, .02, .26, .05); }, // minaret
  (g) => { for (let i = 0; i < 6; i++) { g.save(); g.rotate(i * Math.PI / 3); g.beginPath(); g.ellipse(0, -.24, .1, .2, 0, 0, 7); g.fill(); g.restore(); } hole(g, 0, 0, .09); }, // truck-art flower
  (g) => { g.beginPath(); g.arc(0, .08, .28, Math.PI, 0); g.lineTo(.28, .34); g.lineTo(-.28, .34); g.closePath(); g.fill(); g.fillRect(-.03, -.36, .06, .18); g.fillRect(-.42, .34, .84, .1); g.fillRect(-.42, -.04, .08, .38); g.fillRect(.34, -.04, .08, .38); }, // dome (Karachi's white domes)
  (g) => { g.beginPath(); g.moveTo(-.42, .36); g.lineTo(0, -.44); g.lineTo(.42, .36); g.closePath(); g.fill(); hole(g, 0, .08, .1); }, // samosa
  (g) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? .18 : .45; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); }, // star
];
function hole(g, x, y, r) { g.save(); g.globalAlpha = 1; g.fillStyle = g.canvas.__bg || '#fff'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.restore(); }

export function makeBoardTexture(size) {
  const px = size / N; const [c, g] = mk(size, size);
  g.fillStyle = '#1a1410'; g.fillRect(0, 0, size, size); // grout between the tiles
  const gap = px * .035; const s2 = px - gap * 2;
  for (let n = 1; n <= 100; n++) {
    const { r, c: col } = rc(n); const x = col * px + gap; const y = (N - 1 - r) * px + gap; // texture y grows downward; row 0 is the near edge
    const coloured = (r + col) % 2 === 0; const bg = coloured ? TILE_COLORS[(Math.floor(col / 2) + r) % 4] : TILE_WHITE; c.__bg = bg;
    // tile body with a soft glaze: lighter top-left, deeper bottom-right
    g.fillStyle = bg; g.beginPath(); g.roundRect(x, y, s2, s2, px * .06); g.fill();
    const gr = g.createLinearGradient(x, y, x + s2, y + s2); gr.addColorStop(0, '#ffffff2e'); gr.addColorStop(.55, '#ffffff00'); gr.addColorStop(1, '#00000026');
    g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, s2, s2, px * .06); g.fill();
    // bevel: highlight on top/left, shade on bottom/right
    g.lineWidth = px * .025; g.strokeStyle = '#ffffff55'; g.beginPath(); g.moveTo(x + px * .05, y + s2 - px * .04); g.lineTo(x + px * .04, y + px * .04); g.lineTo(x + s2 - px * .05, y + px * .04); g.stroke();
    g.strokeStyle = '#00000033'; g.beginPath(); g.moveTo(x + s2 - px * .03, y + px * .06); g.lineTo(x + s2 - px * .03, y + s2 - px * .03); g.lineTo(x + px * .06, y + s2 - px * .03); g.stroke();
    // a fine inset line, like a printed board
    g.lineWidth = Math.max(1, px * .008); g.strokeStyle = coloured ? '#ffffff40' : '#17203d22'; g.strokeRect(x + px * .1, y + px * .1, s2 - px * .2, s2 - px * .2);
    // emblem, quieter than before
    g.save(); g.translate(x + s2 * .5, y + s2 * .57); g.scale(px * .4, px * .4); g.fillStyle = coloured ? '#ffffff' : INK; g.globalAlpha = coloured ? .62 : .34; ICONS[(n * 7 + r * 3) % ICONS.length](g); g.restore();
    // number: small, clean
    g.globalAlpha = .9; g.fillStyle = coloured ? '#ffffff' : '#17203dcc'; g.font = `700 ${px * .15}px 'Nunito Sans', system-ui, sans-serif`; g.textBaseline = 'top'; g.textAlign = 'left'; g.fillText(String(n).padStart(2, '0'), x + px * .13, y + px * .12); g.globalAlpha = 1;
  }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

/** Board frame: dark lacquered walnut. */
export function makeEdgeTexture() { const [c, g] = mk(256, 32); g.fillStyle = '#3a2416'; g.fillRect(0, 0, 256, 32); for (let i = 0; i < 70; i++) { g.fillStyle = Math.random() < .5 ? '#2c1a10' : '#4a2f1d'; g.globalAlpha = .7; g.fillRect(0, Math.random() * 32, 256, 1 + Math.random()); } g.globalAlpha = 1; const t = tex(c); t.wrapS = THREE.RepeatWrapping; return t; }

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

/** Banner for a section: navy cloth, a coloured edge at the pole, the tile number and the title in clean capitals. */
export function makeFlag(text, color, tile) {
  const fs = 64; const label = text.toUpperCase(); const num = String(tile).padStart(2, '0');
  const [m, mg] = mk(1, 1); mg.font = `700 ${fs}px 'Nunito Sans', system-ui, sans-serif`; if ('letterSpacing' in mg) mg.letterSpacing = '6px';
  const tw = mg.measureText(label).width; mg.font = `600 ${fs * .62}px 'Nunito Sans', system-ui, sans-serif`; const nw = mg.measureText(num).width;
  const w = Math.ceil(fs * .55 + nw + fs * .6 + tw + fs * .8); const h = Math.ceil(fs * 1.9); const [c, g] = mk(w, h);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#222c52'); gr.addColorStop(1, '#141a36'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = color; g.fillRect(0, 0, fs * .22, h); g.fillRect(0, h - fs * .09, w, fs * .09); // accent edge + underline
  g.textBaseline = 'middle'; g.textAlign = 'left';
  g.font = `600 ${fs * .62}px 'Nunito Sans', system-ui, sans-serif`; g.fillStyle = color; g.fillText(num, fs * .55, h / 2 + 2);
  g.fillStyle = '#ffffff33'; g.fillRect(fs * .55 + nw + fs * .28, h * .3, 2, h * .4);
  g.font = `700 ${fs}px 'Nunito Sans', system-ui, sans-serif`; if ('letterSpacing' in g) g.letterSpacing = '6px'; g.fillStyle = '#f4f6ff'; g.fillText(label, fs * .55 + nw + fs * .6, h / 2 + 3);
  return { texture: tex(c), aspect: w / h };
}

/** Floating title label (sprite texture). Returns { texture, aspect }. */
export function makeLabel(text, color, dpr = 2) {
  const [c, g] = mk(1, 1); const fs = 44 * dpr; const font = `700 ${fs}px Fredoka, system-ui, sans-serif`; g.font = font;
  const w = Math.ceil(g.measureText(text).width + fs * 1.1); const h = Math.ceil(fs * 1.7); c.width = w; c.height = h;
  g.font = font; g.fillStyle = '#fbf3e2'; g.strokeStyle = INK; g.lineWidth = 5 * dpr; g.beginPath(); g.roundRect(3, 3, w - 6, h - 6, h / 2.2); g.fill(); g.stroke();
  g.fillStyle = color; g.beginPath(); g.arc(fs * .55, h / 2, fs * .2, 0, 7); g.fill();
  g.fillStyle = INK; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(text, fs * .9, h / 2 + 2);
  return { texture: tex(c), aspect: w / h };
}
