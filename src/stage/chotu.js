import * as THREE from 'three';
import { psxify } from './psx.js';

// Chotu: a low-poly snake. The body is one tube along +X; a vertex shader bends it
// into an S-curve that travels along the body, so animation costs almost nothing.
export function buildChotu() {
  const group = new THREE.Group();
  const L = 0.62; const R = 0.024;
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(new THREE.Vector3((i / 20) * L, 0, 0));
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, R, 6, false);
  // taper the tail, store "along the body" coordinate
  const p = geo.attributes.position; const along = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i); const k = x / L; along[i] = k;
    const taper = 0.35 + 0.65 * Math.min(1, k * 1.6);
    p.setY(i, p.getY(i) * taper); p.setZ(i, p.getZ(i) * taper);
  }
  geo.setAttribute('along', new THREE.BufferAttribute(along, 1));
  // stripes via vertex colour
  const col = []; const a = new THREE.Color('#5b8a5a'); const b = new THREE.Color('#d9a441'); const belly = new THREE.Color('#e8dcb0');
  for (let i = 0; i < p.count; i++) { const k = along[i]; const stripe = Math.sin(k * 40) > 0.55; const under = p.getY(i) < -R * 0.4; const c = under ? belly : stripe ? b : a; col.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));

  const uniforms = { uT: { value: 0 }, uAmp: { value: 0.05 }, uLen: { value: L } };
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float along; uniform float uT; uniform float uAmp; uniform float uLen;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float k = along;
        float w = sin(k * 9.0 - uT * 4.0) * uAmp * (0.3 + k * 0.7);
        transformed.z += w;
        transformed.x -= abs(w) * 0.25;`);
  };
  psxify(mat, 'chotu');
  const body = new THREE.Mesh(geo, mat);
  body.position.x = -L; // head end sits at the group origin
  group.add(body);

  // head
  const headMat = psxify(new THREE.MeshLambertMaterial({ color: '#5b8a5a', flatShading: true }));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), headMat); head.scale.set(1.35, 0.8, 1.0); head.position.set(0.02, 0.012, 0);
  const eyeM = new THREE.MeshBasicMaterial({ color: '#111' }); const eyeW = new THREE.MeshBasicMaterial({ color: '#f3ead8' });
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), eyeW); w.position.set(0.045, 0.035, s * 0.024); head.add(w);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.008, 5, 3), eyeM); e.position.set(0.055, 0.037, s * 0.026); head.add(e);
  }
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.01), new THREE.MeshBasicMaterial({ color: '#c8553d' })); tongue.position.set(0.085, 0.0, 0); tongue.visible = false; head.add(tongue);
  group.add(head);

  const state = { mode: 'idle', t: 0, flick: 0 };
  function update(dt, time) {
    uniforms.uT.value = time;
    uniforms.uAmp.value += ((state.mode === 'thinking' ? 0.075 : 0.04) - uniforms.uAmp.value) * Math.min(1, dt * 3);
    const bob = state.mode === 'thinking' ? Math.sin(time * 8) * 0.018 : Math.sin(time * 1.6) * 0.008;
    head.position.y = 0.02 + bob + (state.mode === 'listening' ? 0.03 : 0);
    head.rotation.z = state.mode === 'thinking' ? Math.sin(time * 6) * 0.2 : 0.15;
    if (state.flick > 0) { state.flick -= dt; tongue.visible = Math.sin(state.flick * 40) > 0; } else tongue.visible = Math.sin(time * 0.9) > 0.985;
  }
  const setMode = (m) => { state.mode = m; if (m === 'answer') { state.flick = 0.6; state.mode = 'idle'; } };
  group.userData.isChotu = true;
  return { group, update, setMode, head };
}
