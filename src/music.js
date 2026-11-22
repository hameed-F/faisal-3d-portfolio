// A tiny generative jazz band (drums, walking bass, electric piano) made with the Web Audio API.
// Nothing to download; a look-ahead scheduler keeps it steady and cheap. Moods change per chapter.
import { audioCtx, onToggle, isEnabled } from './audio.js';

const MOODS = {
  road: { bpm: 104, swing: 0.6, drums: 1, keys: 0.7, prog: [['G', 'm7'], ['C', '7'], ['F', 'maj7'], ['D', 'm7']] },
  hut: { bpm: 86, swing: 0.66, drums: 0.6, keys: 1, prog: [['D', 'm7'], ['G', '7'], ['C', 'maj7'], ['A', 'm7']] },
  board: { bpm: 112, swing: 0.58, drums: 1, keys: 0.8, bells: true, prog: [['C', 'maj7'], ['A', 'm7'], ['D', 'm7'], ['G', '7']] },
  film: { bpm: 72, swing: 0.5, drums: 0.35, keys: 1, prog: [['A', 'm7'], ['F', 'maj7'], ['D', 'm7'], ['E', '7']] },
  dance: { bpm: 120, swing: 0.55, drums: 1.2, keys: 0.9, bells: true, prog: [['F', 'm7'], ['Bb', '7'], ['Eb', 'maj7'], ['C', '7']] },
};
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const QUAL = { m7: [0, 3, 7, 10], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11] };
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

let ctx = null; let out = null; let timer = null; let mood = 'road'; let nextT = 0; let step = 0; let noise = null; let wanted = false; let level = 0.16;

function ensure() { const a = audioCtx(); if (!a) return false; if (!out) { ctx = a.ctx; out = ctx.createGain(); out.gain.value = 0; out.connect(a.master); const b = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noise = b; } return true; }
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function kick(t, v) { const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); env(g, t, 0.003, 0.9 * v, 0.22); o.connect(g).connect(out); o.start(t); o.stop(t + 0.3); }
function hit(t, f, q, v, dec) { const s = ctx.createBufferSource(); s.buffer = noise; const bp = ctx.createBiquadFilter(); bp.type = f > 5000 ? 'highpass' : 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const g = ctx.createGain(); env(g, t, 0.002, v, dec); s.connect(bp).connect(g).connect(out); s.start(t); s.stop(t + dec + 0.05); }
function bass(t, midi, dur) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(midi); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; const g = ctx.createGain(); env(g, t, 0.01, 0.5, dur); o.connect(lp).connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05); }
function epiano(t, midis, dur, v) { for (const m of midis) { for (const det of [-4, 4]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(m); o.detune.value = det; const g = ctx.createGain(); env(g, t, 0.008, 0.07 * v, dur); o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05); } } }
function bell(t, midi) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(midi); const g = ctx.createGain(); env(g, t, 0.004, 0.08, 0.6); o.connect(g).connect(out); o.start(t); o.stop(t + 0.7); }

function schedule() {
  if (!ctx) return; const M = MOODS[mood]; const beat = 60 / M.bpm; const eighth = beat / 2;
  while (nextT < ctx.currentTime + 0.25) {
    const bar = Math.floor(step / 8); const pos = step % 8; const [root, q] = M.prog[bar % M.prog.length]; const r = 36 + NOTE[root]; const chord = QUAL[q];
    const t = nextT + (pos % 2 ? eighth * (M.swing - 0.5) * 2 : 0); // swing the off-beats
    if (M.drums) {
      if (pos === 0 || pos === 4 || (pos === 7 && Math.random() < 0.3)) kick(t, 0.6 * M.drums);
      if (pos === 2 || pos === 6) hit(t, 1800, 0.8, 0.25 * M.drums, 0.12);
      hit(t, 8000, 0.7, (pos % 2 ? 0.05 : 0.09) * M.drums, 0.04);
    }
    if (pos % 2 === 0) { const walk = [chord[0], chord[1], chord[2], chord[3] - 12 + (Math.random() < 0.4 ? 1 : 0)][pos / 2]; bass(t, r + walk, beat * 0.9); }
    if ((pos === 2 || pos === 5) && Math.random() < 0.85) epiano(t, chord.map((c) => r + 24 + c), beat * 0.8, M.keys);
    if (M.bells && pos % 2 && Math.random() < 0.35) bell(t, r + 48 + chord[Math.floor(Math.random() * 4)]);
    nextT += eighth; step++;
  }
}
function start() { if (!ensure()) return; if (timer) return; nextT = ctx.currentTime + 0.1; step = 0; timer = setInterval(schedule, 90); out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setTargetAtTime(level, ctx.currentTime, 0.8); }
function stop() { if (!timer || !ctx) return; out.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4); const t = timer; timer = null; setTimeout(() => clearInterval(t), 1500); }

export function setMood(m) { if (!MOODS[m] || m === mood) return; mood = m; }
export function swell(on) { level = on ? 0.26 : 0.16; if (ctx && out && timer) out.gain.setTargetAtTime(level, ctx.currentTime, 0.5); }
export function music(on) { wanted = on; if (on && isEnabled()) start(); else stop(); }
onToggle.push((on) => { if (on && wanted) start(); else if (!on) stop(); });
