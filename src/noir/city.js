import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { psxify } from '../stage/psx.js';
import { projects } from '../content.js';

// ------------------------------------------------------------------
// MIDNIGHT REEL: one city block around a small plaza. PS1-era look:
// small textures, nearest filtering, vertex snapping, flat lighting.
// ------------------------------------------------------------------
export function blocked(cols, x, z, r) {
  for (const c of cols) {
    if (c.inside) { if (x < c.minX + r || x > c.maxX - r || z < c.minZ + r || z > c.maxZ - r) return true; continue; }
    if (c.r !== undefined) { const dx = x - c.x; const dz = z - c.z; if (dx * dx + dz * dz < (c.r + r) * (c.r + r)) return true; }
    else if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return true;
  }
  return false;
}
const tex = (w, h, draw, repeat) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.colorSpace = THREE.SRGBColorSpace; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; };
let sd = 9; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
const noise = (g, w, h, cols, n) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[(rnd() * cols.length) | 0]; g.fillRect((rnd() * w) | 0, (rnd() * h) | 0, 1 + ((rnd() * 2) | 0), 1); } };

function facade(base, trim, lit) { // a building face: bricks + windows (some lit)
  return (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h); noise(g, w, h, ['rgba(0,0,0,.25)', 'rgba(255,255,255,.08)'], 500);
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    for (let y = 6; y < h - 8; y += 16) for (let x = 5; x < w - 8; x += 16) { const on = lit && rnd() < 0.42; g.fillStyle = '#1b1d24'; g.fillRect(x - 1, y - 1, 10, 12); g.fillStyle = on ? (rnd() < 0.5 ? '#ffcf7a' : '#ffb35c') : '#2c3442'; g.fillRect(x, y, 8, 10); g.fillStyle = trim; g.fillRect(x - 1, y + 10, 10, 2); if (on) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 3, y, 1, 10); } }
  };
}
export function signTex(text, { bg = '#14110e', fg = '#f3e6c4', font = 'Limelight', w = 512, h = 128, bulbs = true } = {}) {
  return tex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a24a'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); if (bulbs) { g.fillStyle = '#ffe2a0'; for (let x = 20; x < w - 10; x += 22) { g.beginPath(); g.arc(x, 18, 4, 0, 7); g.arc(x, h - 18, 4, 0, 7); g.fill(); } } g.fillStyle = fg; g.font = `${Math.floor(h * 0.4)}px "${font}", Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2); });
}

export function buildCity(scene, tier) {
  const hi = tier.name === 'Full'; const update = []; const cols = []; const inter = [];
  const M = (opts) => psxify(new THREE.MeshLambertMaterial({ flatShading: true, ...opts }));
  const at = (m, x, y, z, ry = 0) => { m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; };
  const boxM = (w, h, d, mat, x, y, z, ry) => at(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z, ry);

  // ---------- lights (night defaults; setDay() changes them) ----------
  const hemi = new THREE.HemisphereLight('#4a5a7a', '#1a1612', 0.9); scene.add(hemi);
  const moon = new THREE.DirectionalLight('#9fb4e0', 0.75); moon.position.set(-20, 30, 10); scene.add(moon);
  scene.fog = new THREE.Fog('#0d1018', 14, 62);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 16, 10), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new THREE.Color('#05070d') }, bot: { value: new THREE.Color('#1c2232') } }, vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }', fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying float h; void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(0.0, 0.5, h)), 1.0); }' }));
  sky.frustumCulled = false; scene.add(sky);
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(5, 16), new THREE.MeshBasicMaterial({ color: '#f1ead2', fog: false })); moonDisc.position.set(-60, 70, -120); moonDisc.lookAt(0, 0, 0); scene.add(moonDisc);
  const lampLights = [];

  // ---------- ground: asphalt road + sidewalks + plaza cobbles ----------
  const asphalt = tex(64, 64, (g, w, h) => { g.fillStyle = '#23252b'; g.fillRect(0, 0, w, h); noise(g, w, h, ['#2e3138', '#1a1c21', '#34363d'], 900); }, [24, 6]);
  const road = at(new THREE.Mesh(new THREE.PlaneGeometry(120, 14), M({ map: asphalt })), 0, 0, 21); road.rotation.x = -Math.PI / 2; road.receiveShadow = hi;
  const lines = []; for (let x = -58; x < 60; x += 5) lines.push(new THREE.PlaneGeometry(2.4, 0.2).rotateX(-Math.PI / 2).translate(x, 0.02, 21));
  at(new THREE.Mesh(mergeGeometries(lines), new THREE.MeshBasicMaterial({ color: '#c9b46a' })), 0, 0, 0);
  const cobble = tex(64, 64, (g, w, h) => { g.fillStyle = '#4a4540'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < w; x += 8) { g.fillStyle = ['#56504a', '#5e5750', '#4f4a44'][(rnd() * 3) | 0]; g.fillRect(x + 1, y + 1, 6, 6); } }, [10, 8]);
  const plaza = at(new THREE.Mesh(new THREE.PlaneGeometry(40, 30), M({ map: cobble })), 0, 0.01, -1); plaza.rotation.x = -Math.PI / 2; plaza.receiveShadow = hi;
  const side = tex(32, 32, (g, w, h) => { g.fillStyle = '#6b6862'; g.fillRect(0, 0, w, h); g.fillStyle = '#58554f'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); noise(g, w, h, ['#757169', '#5f5c56'], 120); }, [60, 2]);
  boxM(120, 0.18, 2.4, M({ map: side }), 0, 0.09, 15);
  // puddles (night reflections: cheap emissive patches)
  const puddles = []; [[-6, 6], [5, 3], [-11, -4], [9, -7], [1, 11], [-2, 19], [14, 22]].forEach(([x, z]) => { const p = at(new THREE.Mesh(new THREE.CircleGeometry(1 + rnd() * 1.2, 10), new THREE.MeshBasicMaterial({ color: '#1e2a40', transparent: true, opacity: 0.75 })), x, 0.03, z); p.rotation.x = -Math.PI / 2; p.scale.set(1.4, 1, 1); puddles.push(p); });

  // ---------- buildings ----------
  const brickRed = (lit) => tex(64, 128, facade('#5a2e24', '#3a1d17', lit));
  const brickGrey = (lit) => tex(64, 128, facade('#3e4148', '#25272c', lit));
  const brickTan = (lit) => tex(64, 128, facade('#6b5a44', '#463a2c', lit));
  const roofM = M({ color: '#1b1c20' });
  function building(x, z, w, d, h, texFn, ry = 0) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); const t = texFn(true); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(w / 6)), Math.max(1, Math.round(h / 12))); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [M({ map: t }), M({ map: t }), roofM, roofM, M({ map: t }), M({ map: t })]); m.position.y = h / 2; m.castShadow = hi; m.receiveShadow = hi; g.add(m); g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.4, d + 0.4), M({ color: '#2a2b30' })), {}).translateY(h + 0.2)); const hw = ry ? d / 2 : w / 2; const hd = ry ? w / 2 : d / 2; cols.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd }); return g; }
  // background ring (non-interactive)
  building(-30, -26, 14, 10, 22, brickGrey); building(-4, -32, 16, 10, 28, brickTan); building(22, -30, 14, 10, 24, brickGrey); building(36, -8, 10, 14, 18, brickRed); building(-36, -6, 10, 14, 20, brickTan);
  building(-34, 34, 16, 10, 16, brickRed); building(-10, 36, 18, 10, 20, brickGrey); building(16, 35, 16, 10, 14, brickTan); building(38, 32, 12, 10, 22, brickGrey);

  // CINEMA (north, centre) → projects
  const cin = building(0, -19, 14, 8, 11, brickRed);
  const marquee = new THREE.Mesh(new THREE.BoxGeometry(11, 1.6, 1.8), [M({ color: '#2a1d14' }), M({ color: '#2a1d14' }), M({ color: '#2a1d14' }), M({ color: '#2a1d14' }), new THREE.MeshBasicMaterial({ map: signTex('PICTURE HOUSE') }), M({ color: '#2a1d14' })]); marquee.position.set(0, 4.6, 4.8); cin.add(marquee);
  const nowShowing = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 1.0), new THREE.MeshBasicMaterial({ map: signTex('NOW SHOWING · 12 FILMS', { h: 96, w: 640, bulbs: false }) })); nowShowing.position.set(0, 6.3, 4.02); cin.add(nowShowing);
  const loader = new THREE.TextureLoader(); const posterFrames = [];
  projects.filter((p) => p.image).slice(0, 4).forEach((p, i) => { const x = [-5.6, -3.6, 3.6, 5.6][i]; const fr = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, 0.1), M({ color: '#c9a24a' })); fr.position.set(x, 1.9, 4.06); cin.add(fr); const t = loader.load(p.image); t.colorSpace = THREE.SRGBColorSpace; const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.9), new THREE.MeshBasicMaterial({ map: t })); pic.position.set(x, 1.9, 4.12); cin.add(pic); posterFrames.push(pic); });
  const cinDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 2.8, 0.1), new THREE.MeshBasicMaterial({ map: tex(48, 48, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffdc96'); gr.addColorStop(1, '#a8572a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#2a1d14'; g.fillRect(0, 0, w, 3); g.fillRect(w / 2 - 1, 0, 2, h); g.fillRect(0, 0, 3, h); g.fillRect(w - 3, 0, 3, h); g.fillStyle = '#c9a24a'; g.fillRect(w / 2 - 6, h / 2, 3, 6); g.fillRect(w / 2 + 3, h / 2, 3, 6); g.fillStyle = 'rgba(60,20,10,.5)'; g.fillRect(8, h - 14, 10, 14); }) })); cinDoor.position.set(0, 1.4, 4.05); cin.add(cinDoor);
  inter.push({ id: 'cinema', label: 'Picture House · my 12 projects', pos: new THREE.Vector3(0, 0, -13.2), face: Math.PI, sign: 'PICTURE HOUSE' });
  // CAMPUS (north-west) → journey
  const camp = building(-14, -18, 10, 8, 9, brickTan);
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 4.2, 8), M({ color: '#cfc6b2' })); c.position.set(-3 + i * 2, 2.1, 4.4); camp.add(c); }
  const pedi = new THREE.Mesh(new THREE.BoxGeometry(9, 0.8, 1.2), M({ color: '#cfc6b2' })); pedi.position.set(0, 4.6, 4.4); camp.add(pedi);
  const campSign = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.7), new THREE.MeshBasicMaterial({ map: signTex('THE ACADEMY', { bulbs: false, h: 96 }) })); campSign.position.set(0, 4.6, 5.02); camp.add(campSign);
  inter.push({ id: 'campus', label: 'The Academy · my journey', pos: new THREE.Vector3(-14, 0, -11.6), face: Math.PI });
  // PAWN SHOP (north-east) → certificates
  const pawn = building(14, -18, 10, 8, 8, brickGrey);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.4), new THREE.MeshBasicMaterial({ map: tex(96, 40, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe0a0'); gr.addColorStop(1, '#b0662e'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#3a2416'; for (const y of [14, 28]) g.fillRect(0, y, w, 2); g.fillStyle = '#2a1a10'; [[6, 6, 6, 8], [20, 4, 4, 10], [34, 8, 10, 6], [52, 5, 5, 9], [66, 2, 8, 12], [82, 7, 6, 7], [10, 19, 12, 9], [30, 21, 5, 7], [44, 18, 8, 10], [62, 20, 14, 8], [84, 17, 5, 11]].forEach(([x, y, a, b]) => g.fillRect(x, y, a, b)); g.fillStyle = '#1a120c'; g.fillRect(0, 0, w, 2); g.fillRect(w / 2 - 1, 0, 2, h); g.font = '7px Georgia'; g.fillStyle = '#5a1e18'; g.fillText('WE BUY · WE SELL', 4, h - 3); }) })); win.position.set(0, 1.8, 4.03); pawn.add(win);
  const awning = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.2, 1.8), M({ color: '#6e1f1f' })); awning.position.set(0, 3.4, 4.8); awning.rotation.x = 0.25; pawn.add(awning);
  const pawnSign = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.8), new THREE.MeshBasicMaterial({ map: signTex('TROPHIES & PAWN', { bulbs: false, h: 96 }) })); pawnSign.position.set(0, 4.4, 4.03); pawn.add(pawnSign);
  for (let i = 0; i < 6; i++) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.08, 0.4, 8), M({ color: '#d9a441', emissive: '#3a2a00' })); cup.position.set(-2.4 + i * 0.96, 1.3, 4.1); pawn.add(cup); }
  inter.push({ id: 'pawn', label: 'Trophies & Pawn · certificates', pos: new THREE.Vector3(14, 0, -11.6), face: Math.PI });
  // ARCADE (west) → mini-games
  const arc = building(-22, 0, 10, 8, 8, brickRed, Math.PI / 2);
  const arcSign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.0), new THREE.MeshBasicMaterial({ map: signTex('PENNY ARCADE') })); arcSign.position.set(0, 4.3, 4.03); arc.add(arcSign);
  const arcDoor = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.8), new THREE.MeshBasicMaterial({ color: '#9fd8c7' })); arcDoor.position.set(0, 1.4, 4.03); arc.add(arcDoor);
  inter.push({ id: 'arcade', label: 'Penny Arcade · play', pos: new THREE.Vector3(-16.4, 0, 0), face: -Math.PI / 2 });
  // NEWSPAPER KIOSK (east) → about me
  const kiosk = new THREE.Group(); kiosk.position.set(16, 0, 1); scene.add(kiosk);
  kiosk.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 2.4), M({ color: '#2c4a3a' })), {}).translateY(1.2));
  const kroof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.2, 4), M({ color: '#1e3328' })); kroof.position.y = 3; kroof.rotation.y = Math.PI / 4; kiosk.add(kroof);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4), new THREE.MeshBasicMaterial({ map: tex(256, 140, (g, w, h) => { g.fillStyle = '#efe6cf'; g.fillRect(0, 0, w, h); g.fillStyle = '#14110e'; g.font = '26px "Limelight", Georgia'; g.textAlign = 'center'; g.fillText('THE DAILY REEL', w / 2, 32); g.fillRect(16, 40, w - 32, 3); g.font = 'bold 16px Georgia'; g.fillText('LOCAL GAME DEV', w / 2, 70); g.fillText('BUILDS WORLDS!', w / 2, 92); g.font = '12px Georgia'; g.fillText('read all about him →', w / 2, 122); }) })); paper.position.set(-1.62, 1.3, 0); paper.rotation.y = -Math.PI / 2; kiosk.add(paper);
  cols.push({ x: 16, z: 1, r: 2.2 });
  inter.push({ id: 'kiosk', label: 'The Daily Reel · about me', pos: new THREE.Vector3(13.2, 0, 1), face: Math.PI / 2 });
  // PHONE BOOTH (south-east corner) → contact
  const booth = new THREE.Group(); booth.position.set(15, 0, 10); scene.add(booth);
  booth.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.7, 1.3), M({ color: '#7a1c18' })), {}).translateY(1.35));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.7), new THREE.MeshBasicMaterial({ color: '#ffe2a0' })); glass.position.set(-0.66, 1.5, 0); glass.rotation.y = -Math.PI / 2; booth.add(glass);
  cols.push({ x: 15, z: 10, r: 1.0 });
  inter.push({ id: 'phone', label: 'Phone booth · contact me', pos: new THREE.Vector3(13.2, 0, 10), face: Math.PI / 2 });
  // BILLBOARD (south-west, on poles) → promo
  const bb = new THREE.Group(); bb.position.set(-14, 0, 11); bb.rotation.y = 0.5; scene.add(bb);
  [-2.2, 2.2].forEach((x) => bb.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.25, 5, 0.25), M({ color: '#2a2b30' })), {}).translateX(x).translateY(2.5)));
  const bbFace = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: tex(256, 128, (g, w, h) => { g.fillStyle = '#14110e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a24a'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#f3e6c4'; g.font = '28px "Limelight", Georgia'; g.textAlign = 'center'; g.fillText('THE TRAILER', w / 2, 56); g.font = '14px Georgia'; g.fillText('★ starring Muhammad Faisal Hameed ★', w / 2, 86); g.fillText('coming soon to this billboard', w / 2, 108); }) })); bbFace.position.set(0, 5.4, 0.15); bb.add(bbFace);
  bb.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(6.3, 3.3, 0.2), M({ color: '#2a2b30' })), {}).translateY(5.4));
  cols.push({ x: -14, z: 11, r: 0.6 });
  inter.push({ id: 'billboard', label: 'Billboard · the trailer', pos: new THREE.Vector3(-12.3, 0, 14.4), face: Math.PI + 0.5 });

  // ---------- street furniture: lamps (with real light), benches, trees, hydrant, car ----------
  const lampSpots = [[-8, 4], [8, 4], [-8, -8], [8, -8], [6, 13]];
  lampSpots.forEach(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.2, 6), M({ color: '#16171b' })), {}).translateY(2.1));
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.32), new THREE.MeshBasicMaterial({ color: '#ffd28a' })); head.position.y = 4.25; g.add(head);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.3, 4), M({ color: '#16171b' })); cap.position.y = 4.6; cap.rotation.y = Math.PI / 4; g.add(cap);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 16), new THREE.MeshBasicMaterial({ color: '#ffcf8a', transparent: true, opacity: 0.085, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.04; g.add(pool);
    if (i < (hi ? 5 : 2)) { const L = new THREE.PointLight('#ffc27a', 18, 11, 1.6); L.position.set(x, 4.0, z); scene.add(L); lampLights.push(L); }
    cols.push({ x, z, r: 0.25 }); lampHeads.push(head, pool);
  });
  [[-4, 8, 0], [4, 8, 0], [-10, -2, Math.PI / 2]].forEach(([x, z, r]) => { const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = r; scene.add(b); b.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 0.6), M({ color: '#4a3020' })), {}).translateY(0.5)); b.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 0.1), M({ color: '#4a3020' })), {}).translateY(0.85).translateZ(-0.28)); inter.push({ id: 'bench', label: 'Bench · sit for a while', pos: new THREE.Vector3(x + Math.sin(r) * 0.15, 0, z + Math.cos(r) * 0.15), face: r, bench: true }); });
  [[-12, 4], [12, -4], [-4, -8], [4, -9]].forEach(([x, z]) => { scene.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.4), M({ color: '#3a3833' })), {}).translateX(x).translateZ(z).translateY(0.3)); const tr = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0), M({ color: '#1f3326' })); tr.position.set(x, 2.6, z); tr.castShadow = hi; scene.add(tr); scene.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2, 5), M({ color: '#2b2117' })), {}).translateX(x).translateZ(z).translateY(1.3)); cols.push({ x, z, r: 0.9 }); });
  // vintage car parked on the street (a nod to Keaton's chases)
  const car = new THREE.Group(); car.position.set(-4, 0, 18); car.rotation.y = Math.PI / 2; scene.add(car);
  cols.push({ minX: -6.2, maxX: -1.8, minZ: 17.1, maxZ: 18.9 });
  const cm = M({ color: '#141518' }); car.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 4.2), cm), {}).translateY(0.8)); car.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.8), cm), {}).translateY(1.6).translateZ(-0.5));
  [[-0.95, 1.3], [0.95, 1.3], [-0.95, -1.3], [0.95, -1.3]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 10), M({ color: '#0b0b0c' })); w.rotation.z = Math.PI / 2; w.position.set(x, 0.45, z); car.add(w); });
  const hl = new THREE.MeshBasicMaterial({ color: '#ffe8b0' }); [-0.6, 0.6].forEach((x) => { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 8), hl); h.rotation.x = Math.PI / 2; h.position.set(x, 0.95, 2.12); car.add(h); });

  // ---------- rain ----------
  const N = hi ? 1400 : 600; const rg = new THREE.BufferGeometry(); const rp = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) { const x = (rnd() - 0.5) * 50; const y = rnd() * 20; const z = (rnd() - 0.5) * 50; rp.set([x, y, z, x + 0.05, y - 0.6, z], i * 6); }
  rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#8fa3c4', transparent: true, opacity: 0.35 })); rain.frustumCulled = false; scene.add(rain);
  update.push((t, dt, cam) => { const a = rain.geometry.attributes.position; for (let i = 0; i < a.count; i += 2) { let y = a.getY(i) - dt * 22; if (y < 0) y += 20; a.setY(i, y); a.setY(i + 1, y - 0.6); } a.needsUpdate = true; if (cam) rain.position.set(cam.position.x, 0, cam.position.z); });

  // plaza bounds (walkable area)
  cols.push({ inside: true, minX: -19, maxX: 19, minZ: -14.4, maxZ: 25 });

  // ---------- day / night ----------
  function setDay(day) {
    hemi.color.set(day ? '#dfe4ea' : '#4a5a7a'); hemi.groundColor.set(day ? '#6a5a48' : '#1a1612'); hemi.intensity = day ? 1.5 : 0.9;
    moon.color.set(day ? '#fff1dc' : '#9fb4e0'); moon.intensity = day ? 1.6 : 0.75;
    scene.fog.color.set(day ? '#c8bea8' : '#0d1018'); scene.fog.near = day ? 30 : 14; scene.fog.far = day ? 120 : 62;
    sky.material.uniforms.top.value.set(day ? '#5d84b8' : '#05070d'); sky.material.uniforms.bot.value.set(day ? '#e3d3b2' : '#1c2232');
    moonDisc.visible = !day; lampLights.forEach((l) => { l.intensity = day ? 0 : 18; }); lampHeads.forEach((h) => { h.visible = !day || h.geometry.type !== 'CircleGeometry'; });
    rain.visible = !day; puddles.forEach((p) => { p.material.color.set(day ? '#5a6370' : '#1e2a40'); });
  }
  return { cols, inter, update, sky, setDay };
}
const lampHeads = [];
