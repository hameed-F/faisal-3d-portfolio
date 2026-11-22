import * as THREE from 'three';

// Clean, stylized low-poly look: flat-shaded Lambert, no grain, no dithering.
const cache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!opts.map && cache.has(key)) return cache.get(key);
  const { flat = true, ...rest } = opts;
  const m = new THREE.MeshLambertMaterial({ color, flatShading: flat, ...rest });
  if (m.map) { m.map.colorSpace = THREE.SRGBColorSpace; m.map.anisotropy = 4; }
  if (!opts.map) cache.set(key, m);
  return m;
}
export const C = (hex) => new THREE.Color(hex);
export function box(w, h, d, material, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); return m; }
export function shadowy(obj, cast = true, receive = false) { obj.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } }); return obj; }

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function labelTex(text, { w = 512, h = 128, bg = '#16222c', fg = '#f3ead8', accent = '#e8b25a', font = 'Chakra Petch' } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = accent; g.fillRect(0, h - 10, w, 10);
    g.fillStyle = fg; g.font = `700 ${h * 0.46}px "${font}", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h * 0.46);
  });
}
