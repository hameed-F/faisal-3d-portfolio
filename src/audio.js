// All sound is synthesized with the Web Audio API (no audio files to download or license).
// Off by default; the ♪ chip turns it on and the choice is remembered.
let ctx = null; let master = null; let amb = null; let enabled = false; let scene = 'outside'; let engine = null;

function ensure() {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
  return ctx;
}
function noiseBuffer(sec = 2) { const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function tone(freq, dur, type = 'square', vol = 0.12, slideTo = null, when = 0) {
  const t = ctx.currentTime + when; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur); env(g, t, 0.005, vol, dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function burst(dur, freq, vol = 0.2, when = 0, q = 1) {
  const t = ctx.currentTime + when; const s = ctx.createBufferSource(); s.buffer = noiseBuffer(0.3); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); env(g, t, 0.002, vol, dur); s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.05);
}

export const sfx = {
  click() { tone(880, 0.05, 'square', 0.06); },
  open() { tone(520, 0.06, 'triangle', 0.08); tone(780, 0.08, 'triangle', 0.07, null, 0.05); },
  close() { tone(600, 0.06, 'triangle', 0.07); tone(400, 0.08, 'triangle', 0.06, null, 0.05); },
  tick() { tone(1200, 0.03, 'square', 0.05); },
  dice() { for (let i = 0; i < 7; i++) burst(0.04, 2500 + Math.random() * 1500, 0.25, i * 0.07 + Math.random() * 0.03, 4); },
  ladder() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.09, 'square', 0.07, null, i * 0.07)); },
  snake() { tone(700, 0.6, 'sawtooth', 0.06, 120); burst(0.5, 4000, 0.06, 0, 0.5); },
  win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.08, null, i * 0.11)); },
  lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.22, 'triangle', 0.09, null, i * 0.18)); },
  chotu() { burst(0.25, 6000, 0.08, 0, 2); tone(1400, 0.08, 'sine', 0.04, 1800, 0.05); },
  ring() { for (let i = 0; i < 8; i++) { tone(1320, 0.05, 'square', 0.05, null, i * 0.07); tone(1100, 0.05, 'square', 0.05, null, i * 0.07 + 0.035); } },
  send() { tone(660, 0.07, 'square', 0.06); tone(990, 0.1, 'square', 0.06, null, 0.06); },
};

function startAmbience() {
  stopAmbience(); if (!enabled) return;
  const t = ctx.currentTime; const out = ctx.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(scene === 'inside' ? 0.18 : 0.22, t + 1.5); out.connect(master);
  const nodes = [out];
  const src = ctx.createBufferSource(); src.buffer = noiseBuffer(4); src.loop = true; const f = ctx.createBiquadFilter();
  if (scene === 'inside') { f.type = 'lowpass'; f.frequency.value = 260; } else { f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.4; }
  const lfo = ctx.createOscillator(); const lg = ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = scene === 'inside' ? 60 : 300; lfo.connect(lg).connect(f.frequency); lfo.start();
  src.connect(f).connect(out); src.start(); nodes.push(src, lfo);
  // crickets outside, fire crackle inside
  const timer = setInterval(() => {
    if (!enabled) return;
    if (scene === 'outside') { if (Math.random() < 0.6) for (let i = 0; i < 3; i++) tone(4200 + Math.random() * 300, 0.03, 'sine', 0.012, null, i * 0.06); }
    else if (Math.random() < 0.5) burst(0.03, 1500 + Math.random() * 2000, 0.05 + Math.random() * 0.05, 0, 3);
  }, 450);
  amb = { nodes, timer, out };
}
function stopAmbience() { if (!amb) return; clearInterval(amb.timer); const t = ctx.currentTime; amb.out.gain.cancelScheduledValues(t); amb.out.gain.setTargetAtTime(0.0001, t, 0.3); const n = amb.nodes; setTimeout(() => n.forEach((x) => { try { x.stop?.(); x.disconnect(); } catch { /* done */ } }), 1200); amb = null; }

export function setScene(s) { if (s === scene) return; scene = s; if (enabled && ctx) startAmbience(); }
export function setEngine(speed) { // free drive engine hum
  if (!enabled || !ctx) return;
  if (!engine) { const o = ctx.createOscillator(); o.type = 'sawtooth'; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; const g = ctx.createGain(); g.gain.value = 0; o.connect(f).connect(g).connect(master); o.start(); engine = { o, g }; }
  const a = Math.min(1, Math.abs(speed) / 16); engine.o.frequency.setTargetAtTime(45 + a * 90, ctx.currentTime, 0.1); engine.g.gain.setTargetAtTime(speed === null ? 0 : 0.03 + a * 0.05, ctx.currentTime, 0.15);
}
export function stopEngine() { if (engine) { engine.g.gain.setTargetAtTime(0, ctx.currentTime, 0.1); } }

export function setEnabled(on) {
  enabled = on; try { localStorage.setItem('sound', on ? '1' : '0'); } catch { /* ignore */ }
  if (on) { ensure(); ctx.resume(); startAmbience(); sfx.open(); } else if (ctx) { stopAmbience(); stopEngine(); }
}
export const isEnabled = () => enabled;
export function play(name) { if (enabled && ctx && sfx[name]) sfx[name](); }
export function savedPreference() { try { return localStorage.getItem('sound') === '1'; } catch { return false; } }
