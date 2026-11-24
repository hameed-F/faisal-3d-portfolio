// Sound, all generated in code with WebAudio (no files, no licences, nothing to download).
// - Music: a soft, slow night tune (warm pad chords + a music-box melody), very quiet.
// - Effects: footsteps, running, slide, ladder climb, jump/land, flying whoosh, fall, dice rattle, a soft chime.
// Sound is OFF until the visitor turns it on (browsers block audio before a click anyway); the choice is remembered.
// While the page reads text aloud (chat voice or "Read aloud"), the music ducks so speech stays clear.

const KEY = 'sound';
let ctx = null; let master = null; let musicBus = null; let sfxBus = null; let on = false; let musicTimer = 0; let duckTimer = 0; let noiseBuf = null;
const listeners = [];
const store = { get: () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } }, set: (v) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* private mode */ } } };

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = .22; musicBus.connect(comp);
  sfxBus = ctx.createGain(); sfxBus.gain.value = .5; sfxBus.connect(comp);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // duck the music while speech synthesis is talking
  duckTimer = setInterval(() => { if (!musicBus) return; const talking = 'speechSynthesis' in window && speechSynthesis.speaking; musicBus.gain.setTargetAtTime(talking ? .05 : .22, ctx.currentTime, .3); }, 400);
  return ctx;
}

export const isOn = () => on;
export const onChange = (f) => listeners.push(f);
export function setOn(v, save = true) {
  on = !!v; if (save) store.set(on);
  if (on) { if (!ensure()) return; ctx.resume(); master.gain.setTargetAtTime(1, ctx.currentTime, .4); startMusic(); }
  else if (ctx) { master.gain.setTargetAtTime(0, ctx.currentTime, .15); clearTimeout(musicTimer); musicTimer = 0; }
  listeners.forEach((f) => f(on));
}
export const savedOn = () => store.get();

// ---------- music: 70 BPM, Fmaj7 - Dm9 - Bbmaj7 - C6, music-box notes over a soft pad ----------
const CHORDS = [[53, 57, 60, 64], [50, 57, 60, 65], [46, 53, 57, 62], [48, 55, 57, 64]];
const MEL = [[72, 0], [69, 1], [67, 1.5], [65, 2], [67, 3], [69, 3.5], [72, 4.5], [74, 5], [72, 6], [69, 7], [67, 8], [65, 9], [64, 10], [65, 11], [67, 11.5], [69, 12.5], [72, 13], [70, 14], [69, 15]];
const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
const BEAT = 60 / 70; const BAR = BEAT * 4;
let loopStart = 0;
function pad(t, notes, dur) {
  for (const n of notes) {
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(n); o.detune.value = det;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + 1.2); g.gain.setValueAtTime(.05, t + dur - 1.2); g.gain.linearRampToValueAtTime(0, t + dur + .3);
      o.connect(f).connect(g).connect(musicBus); o.start(t); o.stop(t + dur + .4);
    }
  }
}
function bell(t, n, vel = .12) {
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(n);
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = hz(n) * 3.01; const g2 = ctx.createGain(); g2.gain.value = .25;
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .01); g.gain.exponentialRampToValueAtTime(.0005, t + 2.2);
  o.connect(g); o2.connect(g2).connect(g); g.connect(musicBus); o.start(t); o2.start(t); o.stop(t + 2.3); o2.stop(t + 2.3);
}
function scheduleLoop() {
  if (!on || !ctx) return;
  const t0 = Math.max(ctx.currentTime + .1, loopStart);
  CHORDS.forEach((c, i) => pad(t0 + i * BAR, c, BAR));
  MEL.forEach(([n, b]) => bell(t0 + b * BEAT, n, .09 + Math.random() * .03));
  loopStart = t0 + BAR * 4;
  musicTimer = setTimeout(scheduleLoop, (loopStart - ctx.currentTime - 1.5) * 1000);
}
function startMusic() { if (musicTimer) return; loopStart = 0; scheduleLoop(); }

// ---------- effects ----------
function noise(t, dur, { type = 'lowpass', f0 = 800, f1 = f0, q = 1, vol = .3, attack = .005 } = {}) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  s.connect(f).connect(g).connect(sfxBus); s.start(t, Math.random()); s.stop(t + dur + .05);
}
function tone(t, f0, f1, dur, vol = .15, type = 'sine') {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  o.connect(g).connect(sfxBus); o.start(t); o.stop(t + dur + .05);
}
const FX = {
  step: (t) => { noise(t, .09, { f0: 520 + Math.random() * 120, f1: 180, vol: .16 }); tone(t, 110, 70, .07, .05); },
  run: (t) => { noise(t, .07, { f0: 700 + Math.random() * 150, f1: 220, vol: .18 }); tone(t, 120, 75, .06, .05); },
  slide: (t) => noise(t, .9, { type: 'bandpass', f0: 1800, f1: 500, q: .8, vol: .16, attack: .06 }),
  climb: (t) => { tone(t, 330 + Math.random() * 40, 260, .09, .07, 'triangle'); noise(t, .06, { f0: 1200, f1: 400, vol: .07 }); },
  jump: (t) => noise(t, .25, { type: 'bandpass', f0: 500, f1: 1400, q: 1.2, vol: .1, attack: .03 }),
  land: (t) => { tone(t, 140, 60, .14, .12); noise(t, .1, { f0: 400, f1: 120, vol: .12 }); },
  whoosh: (t) => noise(t, 1.6, { type: 'bandpass', f0: 300, f1: 1100, q: .7, vol: .12, attack: .5 }),
  fall: (t) => { tone(t, 420, 120, .35, .06, 'triangle'); tone(t + .35, 110, 45, .25, .16); noise(t + .35, .2, { f0: 500, f1: 90, vol: .2 }); },
  roll: (t) => { for (let i = 0; i < 7; i++) { const tt = t + i * (.06 + i * .018); tone(tt, 900 + Math.random() * 500, 600, .04, .05, 'square'); noise(tt, .04, { type: 'highpass', f0: 2500, f1: 2000, vol: .06 }); } },
  chime: (t) => { tone(t, hz(84), hz(84), .9, .05); tone(t + .08, hz(88), hz(88), 1.0, .04); },
};
export function sfx(name) { if (!on || !ctx || !FX[name]) return; FX[name](ctx.currentTime + .01); }

// repeating footsteps while moving: interval in seconds
let stepTimer = 0;
export function steps(kind = 'step', every = .42) { stopSteps(); if (!on) return; sfx(kind); stepTimer = setInterval(() => sfx(kind), every * 1000); }
export function stopSteps() { clearInterval(stepTimer); stepTimer = 0; }
