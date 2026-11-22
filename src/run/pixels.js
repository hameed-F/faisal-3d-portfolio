import * as THREE from 'three';

// 16×16 pixel-art textures drawn on canvases (nothing to download), shown with nearest filtering = crisp pixels.
function tex(draw, w = 16, h = 16) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; return t;
}
let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };

export const PAL = { grass: '#5cd65c', grassD: '#2fa84a', grassL: '#9af07a', dirt: '#c97b3d', dirtD: '#9a5426', dirtL: '#e39a5a', stone: '#a7adc0', stoneD: '#737a91', stoneL: '#d3d8e6', gold: '#ffc93c', goldD: '#c47f12', goldL: '#ffe58a', used: '#8a6a52', usedD: '#5e4532' };

export function makeTextures() {
  const dirt = (g) => { g.fillStyle = PAL.dirt; g.fillRect(0, 0, 16, 16); for (let i = 0; i < 22; i++) px(g, (rnd() * 16) | 0, (rnd() * 16) | 0, rnd() > 0.5 ? PAL.dirtD : PAL.dirtL); };
  const T = {
    grassTop: tex((g) => { g.fillStyle = PAL.grass; g.fillRect(0, 0, 16, 16); for (let i = 0; i < 26; i++) px(g, (rnd() * 16) | 0, (rnd() * 16) | 0, rnd() > 0.5 ? PAL.grassD : PAL.grassL); }),
    grassSide: tex((g) => { dirt(g); g.fillStyle = PAL.grass; g.fillRect(0, 0, 16, 5); for (let x = 0; x < 16; x++) { const d = 4 + ((x * 7) % 3); g.fillStyle = PAL.grass; g.fillRect(x, 0, 1, d); px(g, x, d, PAL.grassD); } g.fillStyle = PAL.grassL; g.fillRect(0, 0, 16, 1); }),
    dirt: tex(dirt),
    stone: tex((g) => { g.fillStyle = PAL.stone; g.fillRect(0, 0, 16, 16); g.fillStyle = PAL.stoneD; [[0, 7, 16, 1], [0, 15, 16, 1], [7, 0, 1, 7], [3, 8, 1, 7], [12, 8, 1, 7]].forEach(([a, b, c, d]) => g.fillRect(a, b, c, d)); g.fillStyle = PAL.stoneL; g.fillRect(0, 0, 7, 1); g.fillRect(8, 0, 8, 1); g.fillRect(4, 8, 8, 1); }),
    code: tex((g) => { g.fillStyle = PAL.gold; g.fillRect(0, 0, 16, 16); g.fillStyle = PAL.goldD; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16); g.fillStyle = PAL.goldL; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); [[1, 1], [14, 1], [1, 14], [14, 14]].forEach(([x, y]) => px(g, x, y, PAL.goldD));
      const C = '#7a3e00'; // the </> glyph
      [[4, 7], [5, 6], [6, 5], [5, 8], [6, 9]].forEach(([x, y]) => px(g, x, y, C)); [[11, 7], [10, 6], [9, 5], [10, 8], [9, 9]].forEach(([x, y]) => px(g, x, y, C)); [[8, 4], [8, 5], [7, 6], [7, 7], [7, 8], [6, 10], [7, 9]].forEach(([x, y]) => px(g, x + 0, y, C)); }),
    used: tex((g) => { g.fillStyle = PAL.used; g.fillRect(0, 0, 16, 16); g.fillStyle = PAL.usedD; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16); g.fillRect(4, 4, 8, 1); g.fillRect(4, 11, 8, 1); g.fillRect(4, 4, 1, 8); g.fillRect(11, 4, 1, 8); px(g, 7, 7, '#c9a17a'); px(g, 8, 8, '#c9a17a'); }),
    cloud: tex((g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#dcefff'; g.fillRect(0, 12, 16, 4); }),
    hill: tex((g) => { g.fillStyle = '#4fbf6a'; g.fillRect(0, 0, 16, 16); for (let i = 0; i < 10; i++) px(g, (rnd() * 16) | 0, (rnd() * 16) | 0, '#3fa65a'); }),
    wood: tex((g) => { g.fillStyle = '#b06a32'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#8a4e22'; for (let y = 0; y < 16; y += 4) g.fillRect(0, y, 16, 1); px(g, 3, 2, '#5e3416'); px(g, 12, 10, '#5e3416'); }),
  };
  return T;
}

/** pixel text on a canvas texture (for zone signs) */
export function pixelLabel(text, { bg = '#5e3416', fg = '#fff6d8', w = 256, h = 64 } = {}) {
  return tex((g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = '#3e2410'; g.fillRect(0, h - 6, w, 6); g.fillStyle = fg; g.font = `${Math.floor(h * 0.42)}px "Press Start 2P", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2); }, w, h);
}
