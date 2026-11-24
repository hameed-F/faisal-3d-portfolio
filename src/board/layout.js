// Board geometry and the story route. Pure data + math (no three.js), shared by the 3D world, the trips and the game.
export const T = 1.6;            // tile size (world units, about 1 m: the avatar is 1.76 tall)
export const N = 10;

/** tile number (1..100) -> { r, c } with r = row from the near edge, c = column from the left (zig-zag board) */
export function rc(n) { const r = Math.floor((n - 1) / 10); const k = (n - 1) % 10; return { r, c: r % 2 === 0 ? k : 9 - k }; }
export function tileXZ(n) { const { r, c } = rc(n); return [(c - 4.5) * T, (4.5 - r) * T]; }
/** tile numbers from a to b inclusive, walking the numbered path */
export function tilesBetween(a, b) { const out = []; const s = a <= b ? 1 : -1; for (let i = a; i !== b + s; i += s) out.push(i); return out; }

export const LADDERS = [[8, 29], [70, 91]];
export const SNAKES = [[58, 18], [97, 63], [85, 47]];
export const JUMPS = Object.fromEntries([...LADDERS, ...SNAKES].map(([a, b]) => [a, b]));

/** The seven glowing tiles, in story order. */
export const SECTIONS = [
  { id: 'about', tile: 5, title: 'About me', next: 'About me', color: '#ff8a65', motion: 'roll' },
  { id: 'edu', tile: 29, title: 'Education & Experience', next: 'Education', color: '#4dd0c8', motion: 'climb', via: 8 },
  { id: 'projects', tile: 35, title: 'Projects', next: 'Projects', color: '#ffd54a', motion: 'slide' },
  { id: 'skills', tile: 41, title: 'Skills & Tech', next: 'Skills', color: '#9ccc65', motion: 'jump' },
  { id: 'contact', tile: 52, title: 'Contact me', next: 'Contact', color: '#64b5f6', motion: 'walk' },
  { id: 'video', tile: 18, title: 'Promo video', next: 'the video', color: '#ba68c8', motion: 'snake', via: 58 },
  { id: 'play', tile: 100, title: 'Play with me!', next: 'the finish', color: '#f06292', motion: 'fly' },
];

/** Split a number of steps into dice rolls (a 6 rolls again). */
export function rollsFor(steps) { const out = []; let n = Math.max(1, steps); while (n > 6) { out.push(6); n -= 6; } out.push(n); return out; }
