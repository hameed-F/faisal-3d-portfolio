import * as THREE from 'three';

// In-world text: information is painted onto 3D signs, boards and walls instead of HTML overlays.
function wrap(g, text, maxW) {
  const words = String(text).split(/\s+/); const lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
/** blocks: [{ h: 'title' } | { t: 'text' } | { k: 'small caps label' } | { li: 'bullet' }] */
export function plaqueTex(blocks, { w = 1024, h = 640, bg = '#16222c', fg = '#eef1f4', accent = '#e8b25a', border = true, pad = 56 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (border) { g.strokeStyle = accent; g.lineWidth = 10; g.strokeRect(12, 12, w - 24, h - 24); }
  let y = pad + 8; const maxW = w - pad * 2;
  for (const b of blocks) {
    if (y > h - pad) break;
    if (b.k) { g.fillStyle = accent; g.font = `700 ${Math.round(w * 0.026)}px "Chakra Petch", Arial, sans-serif`; g.fillText(b.k.toUpperCase(), pad, y); y += w * 0.04; }
    else if (b.h) { g.fillStyle = '#ffffff'; g.font = `700 ${Math.round(w * 0.058)}px "Chakra Petch", Arial, sans-serif`; for (const l of wrap(g, b.h, maxW)) { g.fillText(l, pad, y + w * 0.04); y += w * 0.064; } y += w * 0.012; g.fillStyle = accent; g.fillRect(pad, y - w * 0.008, w * 0.09, 6); y += w * 0.03; }
    else if (b.t) { g.fillStyle = fg; g.font = `400 ${Math.round(w * 0.03)}px Inter, Arial, sans-serif`; for (const l of wrap(g, b.t, maxW)) { if (y > h - pad) break; g.fillText(l, pad, y + w * 0.022); y += w * 0.041; } y += w * 0.016; }
    else if (b.li) { g.fillStyle = accent; g.fillRect(pad, y + w * 0.008, 10, 10); g.fillStyle = fg; g.font = `400 ${Math.round(w * 0.027)}px Inter, Arial, sans-serif`; for (const l of wrap(g, b.li, maxW - 30)) { if (y > h - pad) break; g.fillText(l, pad + 26, y + w * 0.02); y += w * 0.037; } y += w * 0.01; }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
/** A free-standing sign on two posts with a painted plaque. */
export function standee(tex, width = 3, height = 1.9, postColor = '#3a2616') {
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: tex })); face.position.y = 0.7 + height / 2; g.add(face);
  const back = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, height + 0.12, 0.08), new THREE.MeshLambertMaterial({ color: postColor })); back.position.set(0, 0.7 + height / 2, -0.06); g.add(back);
  const pm = new THREE.MeshLambertMaterial({ color: postColor });
  for (const x of [-width / 2 + 0.15, width / 2 - 0.15]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8 + height, 0.12), pm); p.position.set(x, (0.8 + height) / 2, -0.1); p.castShadow = true; g.add(p); }
  g.userData.face = face; return g;
}
