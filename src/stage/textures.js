import * as THREE from 'three';

// All textures are drawn at runtime on small canvases (nothing to download),
// then shown with nearest filtering for the PS1 look.

function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter;
  t.anisotropy = 1;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
// deterministic noise so every load looks the same
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
export const rand = (a = 0, b = 1) => a + (b - a) * rnd();

export function planks(size = 128, base = '#6b4428', dark = '#4a2c18', vertical = false) {
  const [c, g] = canvas(size); g.fillStyle = base; g.fillRect(0, 0, size, size);
  const n = 6; const bw = size / n;
  for (let i = 0; i < n; i++) {
    const shade = rand(-18, 18);
    g.fillStyle = `rgba(${shade > 0 ? 255 : 0},${shade > 0 ? 220 : 0},${shade > 0 ? 180 : 0},${Math.abs(shade) / 255})`;
    vertical ? g.fillRect(i * bw, 0, bw, size) : g.fillRect(0, i * bw, size, bw);
    g.fillStyle = dark; vertical ? g.fillRect(i * bw, 0, 2, size) : g.fillRect(0, i * bw, size, 2);
    for (let k = 0; k < 14; k++) { // grain streaks
      g.fillStyle = `rgba(30,15,5,${rand(0.08, 0.22)})`;
      const p = rand(0, size); const q = i * bw + rand(3, bw - 2);
      vertical ? g.fillRect(q, p, 1, rand(6, 30)) : g.fillRect(p, q, rand(6, 30), 1);
    }
    g.fillStyle = 'rgba(20,10,4,.6)'; // nail heads
    vertical ? g.fillRect(i * bw + bw / 2, rand(4, 10), 2, 2) : g.fillRect(rand(4, 10), i * bw + bw / 2, 2, 2);
  }
  return tex(c);
}

export function noiseTex(size, colors, speck = 0.5) {
  const [c, g] = canvas(size); g.fillStyle = colors[0]; g.fillRect(0, 0, size, size);
  const n = size * size * speck * 0.25;
  for (let i = 0; i < n; i++) { g.fillStyle = colors[1 + Math.floor(rand(0, colors.length - 1))]; g.fillRect(rand(0, size) | 0, rand(0, size) | 0, rand(1, 3) | 0, rand(1, 3) | 0); }
  return tex(c, [1, 1]);
}

const BOARD_EDGE = '#2a170b';

export function chessTex(size) {
  const [c, g] = canvas(size); const m = size * 0.06; const s = (size - 2 * m) / 8;
  g.fillStyle = BOARD_EDGE; g.fillRect(0, 0, size, size);
  g.fillStyle = '#8a5a34'; g.fillRect(m * 0.4, m * 0.4, size - m * 0.8, size - m * 0.8);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#5a3418' : '#e6cf9f'; g.fillRect(m + x * s, m + y * s, s, s); }
  return tex(c);
}

// Snakes & Ladders: 10x10, boustrophedon numbering from bottom-left
export const SNAKES = { 17: 7, 54: 34, 62: 19, 64: 60, 87: 36, 93: 73, 95: 75, 98: 79 };
export const LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 72: 91, 80: 99 };
export function cellXY(n, size, m) { // returns centre of square n (1..100) in canvas px
  const s = (size - 2 * m) / 10; const i = n - 1; const row = Math.floor(i / 10); let col = i % 10; if (row % 2) col = 9 - col;
  return [m + col * s + s / 2, size - m - row * s - s / 2, s];
}
export function snakesTex(size, milestones = []) {
  const [c, g] = canvas(size); const m = size * 0.05;
  g.fillStyle = BOARD_EDGE; g.fillRect(0, 0, size, size);
  const pal = ['#e6cf9f', '#d7b77c', '#c9d6c2', '#e3b9a0'];
  for (let n = 1; n <= 100; n++) {
    const [x, y, s] = cellXY(n, size, m); g.fillStyle = pal[(n + Math.floor((n - 1) / 10)) % pal.length]; g.fillRect(x - s / 2, y - s / 2, s, s);
    if (milestones.includes(n)) { g.fillStyle = '#d9a441'; g.beginPath(); g.arc(x, y, s * 0.36, 0, 7); g.fill(); g.strokeStyle = '#5a2f19'; g.lineWidth = 2; g.stroke(); }
    g.fillStyle = '#3a2616'; g.font = `bold ${Math.max(8, s * 0.3) | 0}px Arial`; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(String(n), x - s / 2 + 2, y - s / 2 + 1);
  }
  // ladders
  g.lineCap = 'round';
  for (const [a, b] of Object.entries(LADDERS)) {
    const [x1, y1, s] = cellXY(+a, size, m); const [x2, y2] = cellXY(b, size, m);
    const dx = x2 - x1; const dy = y2 - y1; const L = Math.hypot(dx, dy); const nx = -dy / L * s * 0.16; const ny = dx / L * s * 0.16;
    g.strokeStyle = '#7a4a26'; g.lineWidth = Math.max(2, s * 0.08);
    g.beginPath(); g.moveTo(x1 + nx, y1 + ny); g.lineTo(x2 + nx, y2 + ny); g.moveTo(x1 - nx, y1 - ny); g.lineTo(x2 - nx, y2 - ny); g.stroke();
    const rungs = Math.max(3, Math.floor(L / (s * 0.35)));
    g.lineWidth = Math.max(1.5, s * 0.05);
    for (let r = 1; r < rungs; r++) { const t = r / rungs; g.beginPath(); g.moveTo(x1 + dx * t + nx, y1 + dy * t + ny); g.lineTo(x1 + dx * t - nx, y1 + dy * t - ny); g.stroke(); }
  }
  // snakes (curvy bodies)
  const colors = ['#5b8a5a', '#a8462a', '#2f6f8f', '#8a6a1c'];
  Object.entries(SNAKES).forEach(([a, b], i) => {
    const [x1, y1, s] = cellXY(+a, size, m); const [x2, y2] = cellXY(b, size, m);
    const dx = x2 - x1; const dy = y2 - y1; const L = Math.hypot(dx, dy); const nx = -dy / L; const ny = dx / L;
    g.strokeStyle = colors[i % colors.length]; g.lineWidth = Math.max(3, s * 0.18);
    g.beginPath(); g.moveTo(x1, y1);
    const seg = 24; for (let k = 1; k <= seg; k++) { const t = k / seg; const w = Math.sin(t * Math.PI * 3) * s * 0.45 * (1 - t * 0.6); g.lineTo(x1 + dx * t + nx * w, y1 + dy * t + ny * w); }
    g.stroke(); g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(x1, y1, s * 0.17, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.fillRect(x1 - s * 0.08, y1 - s * 0.06, 2, 2); g.fillRect(x1 + s * 0.05, y1 - s * 0.06, 2, 2);
  });
  return tex(c);
}

export function ludoTex(size) {
  const [c, g] = canvas(size); const u = size / 15;
  g.fillStyle = '#efe2c4'; g.fillRect(0, 0, size, size);
  const homes = [['#c8553d', 0, 0], ['#5b8a5a', 9, 0], ['#d9a441', 9, 9], ['#2f6f8f', 0, 9]];
  for (const [col, x, y] of homes) {
    g.fillStyle = col; g.fillRect(x * u, y * u, 6 * u, 6 * u);
    g.fillStyle = '#efe2c4'; g.fillRect((x + 1) * u, (y + 1) * u, 4 * u, 4 * u);
    g.fillStyle = col; for (const [a, b] of [[2, 2], [4, 2], [2, 4], [4, 4]]) { g.beginPath(); g.arc((x + a) * u, (y + b) * u, u * 0.6, 0, 7); g.fill(); }
  }
  g.strokeStyle = '#7a6a50'; g.lineWidth = 1;
  for (let i = 0; i < 15; i++) for (let j = 0; j < 15; j++) {
    const inCross = (i >= 6 && i <= 8) || (j >= 6 && j <= 8); const inHome = (i < 6 || i > 8) && (j < 6 || j > 8);
    if (inCross && !inHome && !(i >= 6 && i <= 8 && j >= 6 && j <= 8)) g.strokeRect(i * u, j * u, u, u);
  }
  // home lanes
  g.fillStyle = '#c8553d'; g.fillRect(1 * u, 7 * u, 5 * u, u); g.fillStyle = '#d9a441'; g.fillRect(9 * u, 7 * u, 5 * u, u);
  g.fillStyle = '#5b8a5a'; g.fillRect(7 * u, 1 * u, u, 5 * u); g.fillStyle = '#2f6f8f'; g.fillRect(7 * u, 9 * u, u, 5 * u);
  // centre triangles
  const cx = 7.5 * u; const cy = 7.5 * u; const tri = (col, a, b) => { g.fillStyle = col; g.beginPath(); g.moveTo(cx, cy); g.lineTo(a[0] * u, a[1] * u); g.lineTo(b[0] * u, b[1] * u); g.fill(); };
  tri('#c8553d', [6, 6], [6, 9]); tri('#5b8a5a', [6, 6], [9, 6]); tri('#d9a441', [9, 6], [9, 9]); tri('#2f6f8f', [6, 9], [9, 9]);
  g.strokeStyle = BOARD_EDGE; g.lineWidth = size * 0.02; g.strokeRect(0, 0, size, size);
  return tex(c);
}

// Original property-trading board: 12 project "properties" around the edge, grouped by colour.
export function propertyTex(size, projects, groupColors) {
  const [c, g] = canvas(size); g.fillStyle = '#d8e3cf'; g.fillRect(0, 0, size, size);
  const corner = size * 0.16; const side = (size - 2 * corner) / 3; // 3 properties per side → 12
  g.strokeStyle = BOARD_EDGE; g.lineWidth = 2;
  const cells = [];
  for (let sideI = 0; sideI < 4; sideI++) for (let k = 0; k < 3; k++) cells.push([sideI, k]);
  cells.forEach(([sI, k], idx) => {
    const p = projects[idx]; if (!p) return;
    g.save(); g.translate(size / 2, size / 2); g.rotate(sI * Math.PI / 2); g.translate(-size / 2, -size / 2);
    const x = corner + k * side; const y = size - corner;
    g.fillStyle = '#f3ead8'; g.fillRect(x, y, side, corner); g.strokeRect(x, y, side, corner);
    g.fillStyle = groupColors[p.group] || '#555'; g.fillRect(x, y, side, corner * 0.28); g.strokeRect(x, y, side, corner * 0.28);
    g.fillStyle = '#22160d'; g.font = `bold ${Math.max(7, side * 0.13) | 0}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const words = p.name.replace(/\(.*\)|:.*$/g, '').trim().split(' '); const lines = []; let line = '';
    for (const w of words) { if ((line + ' ' + w).trim().length > 11) { lines.push(line.trim()); line = w; } else line += ' ' + w; } lines.push(line.trim());
    lines.slice(0, 3).forEach((l, i) => g.fillText(l.toUpperCase(), x + side / 2, y + corner * 0.48 + i * side * 0.15));
    if (p.featured) { g.fillStyle = '#8a3a1c'; g.fillText('★', x + side / 2, y + corner * 0.9); }
    g.restore();
  });
  // corners
  const corners = ['START', 'JAM', 'LAB', 'SHIP IT'];
  [[0, size - corner], [0, 0], [size - corner, 0], [size - corner, size - corner]].forEach(([x, y], i) => {
    g.fillStyle = '#f3ead8'; g.fillRect(x, y, corner, corner); g.strokeRect(x, y, corner, corner);
    g.fillStyle = '#5a2f19'; g.font = `bold ${corner * 0.17 | 0}px Arial`; g.textAlign = 'center'; g.fillText(corners[i], x + corner / 2, y + corner / 2);
  });
  // centre logo
  g.save(); g.translate(size / 2, size / 2); g.rotate(-Math.PI / 4);
  g.fillStyle = '#8a3a1c'; g.fillRect(-size * 0.27, -size * 0.07, size * 0.54, size * 0.14);
  g.fillStyle = '#f3ead8'; g.font = `bold ${size * 0.06 | 0}px Arial Black, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PROJECTS', 0, 0);
  g.restore();
  g.strokeStyle = BOARD_EDGE; g.lineWidth = size * 0.015; g.strokeRect(0, 0, size, size);
  return tex(c);
}

export function tvScreenTex(size = 128) {
  const [c, g] = canvas(size, size * 0.75);
  g.fillStyle = '#0b1418'; g.fillRect(0, 0, size, size * 0.75);
  g.fillStyle = '#9fd3c7'; g.font = `bold ${size * 0.11 | 0}px Arial`; g.textAlign = 'center'; g.fillText('PROMO', size / 2, size * 0.32); g.font = `${size * 0.08 | 0}px Arial`; g.fillText('press to play', size / 2, size * 0.48);
  g.fillStyle = '#e8b25a'; g.beginPath(); g.moveTo(size * 0.45, size * 0.55); g.lineTo(size * 0.45, size * 0.68); g.lineTo(size * 0.57, size * 0.615); g.fill();
  return tex(c);
}

export function blobShadowTex() {
  const [c, g] = canvas(64); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); return t;
}

export function signTex(text, w = 256, h = 64, bg = '#3a2616', fg = '#f3ead8') {
  const [c, g] = canvas(w, h); g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = '#1c0f06'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
  g.fillStyle = fg; g.font = `bold ${h * 0.42 | 0}px Arial Black, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2);
  return tex(c);
}

const loader = new THREE.TextureLoader();
export function imageTex(url) { const t = loader.load(url); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; return t; }
