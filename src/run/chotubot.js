import * as THREE from 'three';

// Chotu, reimagined: a little hovering TV-head robot that follows the player.
// Its screen shows a face that blinks, and "..." while it is thinking.
export function buildChotuBot() {
  const g = new THREE.Group();
  const M = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: e || '#000000', flatShading: true });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.56, 0.5), M('#ffc93c')); g.add(head);
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.44, 0.02), M('#23253a')); bezel.position.z = 0.26; g.add(bezel);
  const c = document.createElement('canvas'); c.width = 32; c.height = 24; const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.38), new THREE.MeshBasicMaterial({ map: tex })); screen.position.z = 0.272; g.add(screen);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), M('#23253a')); ant.position.set(0.18, 0.42, 0); g.add(ant);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M('#ff6b5a', '#7a1a10')); bulb.position.set(0.18, 0.58, 0); g.add(bulb);
  const prop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.08), M('#5a8dee')); prop.position.y = 0.36; g.add(prop);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 6), M('#23253a')); hub.position.y = 0.32; g.add(hub);
  const glow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#7fe0ff', transparent: true, opacity: 0.25, depthWrite: false })); glow.rotation.x = Math.PI; glow.position.y = -0.5; g.add(glow);
  let mode = 'idle'; let blinkT = 0;
  function face(t) {
    ctx.fillStyle = '#14202b'; ctx.fillRect(0, 0, 32, 24);
    ctx.fillStyle = mode === 'thinking' ? '#ffc93c' : '#7fe0c4';
    if (mode === 'thinking') { const k = Math.floor(t * 4) % 4; for (let i = 0; i < 3; i++) if (i < k) ctx.fillRect(8 + i * 6, 11, 3, 3); }
    else { const blink = (t % 3.2) < 0.12; if (blink) { ctx.fillRect(8, 10, 5, 1); ctx.fillRect(19, 10, 5, 1); } else { ctx.fillRect(9, 7, 3, 5); ctx.fillRect(20, 7, 3, 5); } ctx.fillRect(12, 16, 8, 1); ctx.fillRect(11, 15, 1, 1); ctx.fillRect(20, 15, 1, 1); if (mode === 'happy') { ctx.fillRect(12, 17, 8, 1); } }
    tex.needsUpdate = true;
  }
  return {
    group: g,
    setMode(m) { mode = m; },
    update(dt, t) { prop.rotation.y += dt * 22; bulb.material.emissive.setHSL(0.02, 0.9, 0.25 + Math.sin(t * 6) * 0.15); blinkT += dt; if (blinkT > 0.1) { blinkT = 0; face(t); } glow.material.opacity = 0.18 + Math.sin(t * 5) * 0.06; },
  };
}
