import * as THREE from 'three';

// Little toys on the street: golden film reels to collect, and pigeons that scatter when you run at them.
const SPOTS = [[-15, -10], [-6, -11], [6, -11], [15, -10], [-17, -3], [-11, 1], [-3, 3], [3, -3], [11, -1], [17, 5], [-16, 7], [-6, 12], [5, 9], [11, 13], [0, 20], [-12, 21], [12, 21], [-3, -6]];

export function buildFun(scene, { lite }) {
  // ----- film reels -----
  const reelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.14, 16); reelGeo.rotateX(Math.PI / 2);
  const holeGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.14, 8); holeGeo.rotateX(Math.PI / 2);
  const gold = new THREE.MeshLambertMaterial({ color: '#e0b04e', emissive: '#5a3c08' }); const dark = new THREE.MeshBasicMaterial({ color: '#1a120a' });
  const reels = SPOTS.map(([x, z], i) => {
    const g = new THREE.Group(); g.add(new THREE.Mesh(reelGeo, gold));
    for (let k = 0; k < 5; k++) { const h = new THREE.Mesh(holeGeo, dark); const a = (k / 5) * Math.PI * 2; h.position.set(Math.cos(a) * 0.27, Math.sin(a) * 0.27, 0); g.add(h); }
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.7, 16), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.18, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = -0.95; glow.visible = false;
    g.position.set(x, 1.1, z); g.userData = { i, phase: i * 0.7, got: false, pop: 0 }; scene.add(g); return g;
  });
  // ----- pigeons -----
  const pigeons = []; const N = lite ? 6 : 12;
  const bodyM = new THREE.MeshLambertMaterial({ color: '#6b6f78', flatShading: true }); const wingM = new THREE.MeshLambertMaterial({ color: '#4b4f58', flatShading: true, side: THREE.DoubleSide });
  for (let i = 0; i < N; i++) {
    const p = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.36), bodyM); b.position.y = 0.16; p.add(b);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), bodyM); head.position.set(0, 0.3, 0.18); p.add(head);
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.08), new THREE.MeshBasicMaterial({ color: '#d9a441' })); beak.position.set(0, 0.29, 0.28); p.add(beak);
    const wings = [-1, 1].map((s) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), wingM); w.position.set(s * 0.11, 0.22, 0); w.rotation.z = s * 0.2; w.geometry.translate(s * 0.17, 0, 0); p.add(w); return w; });
    const home = new THREE.Vector3((Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 20 + 2);
    p.position.copy(home); p.rotation.y = Math.random() * 6.28; scene.add(p);
    pigeons.push({ g: p, head, wings, home, state: 'peck', t: Math.random() * 3, vel: new THREE.Vector3() });
  }

  let got = 0; const total = reels.length;
  function update(t, dt, pos, running) {
    const events = [];
    for (const r of reels) {
      const u = r.userData;
      if (u.got) { if (u.pop > 0) { u.pop -= dt; r.position.y += dt * 6; r.scale.multiplyScalar(1 - dt * 3); if (u.pop <= 0) r.visible = false; } continue; }
      r.rotation.y = t * 2 + u.phase; r.position.y = 1.1 + Math.sin(t * 2.5 + u.phase) * 0.12;
      const dx = r.position.x - pos.x; const dz = r.position.z - pos.z;
      if (dx * dx + dz * dz < 1.1) { u.got = true; u.pop = 0.35; got++; events.push({ type: 'reel', got, total }); }
    }
    for (const p of pigeons) {
      const dx = p.g.position.x - pos.x; const dz = p.g.position.z - pos.z; const d = Math.hypot(dx, dz);
      if (p.state === 'peck') {
        p.t -= dt; p.head.position.y = 0.3 - (Math.sin(t * 9 + p.t) > 0.6 ? 0.08 : 0);
        if (p.t < 0) { p.t = 1 + Math.random() * 3; p.g.rotation.y += (Math.random() - 0.5) * 2; }
        if (d < (running ? 3.2 : 2)) { p.state = 'fly'; p.t = 2.5 + Math.random() * 2; p.vel.set(dx / (d || 1) * 4, 5 + Math.random() * 2, dz / (d || 1) * 4); p.g.rotation.y = Math.atan2(dx, dz); events.push({ type: 'flap' }); }
      } else if (p.state === 'fly') {
        p.g.position.addScaledVector(p.vel, dt); p.vel.y -= dt * 1.2; p.wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * Math.sin(t * 28) * 0.9; });
        p.t -= dt; if (p.t < 0) { p.state = 'land'; p.home.set((Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 20 + 2); }
      } else { // glide back down somewhere else
        const to = new THREE.Vector3().subVectors(p.home, p.g.position); const L = to.length();
        if (L < 0.3) { p.g.position.copy(p.home); p.state = 'peck'; p.t = 1; p.wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * 0.2; }); continue; }
        p.g.position.addScaledVector(to.normalize(), Math.min(L, dt * 6)); p.g.rotation.y = Math.atan2(to.x, to.z); p.wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * Math.sin(t * 20) * 0.6; });
      }
    }
    return events;
  }
  return { update, total, get got() { return got; } };
}
