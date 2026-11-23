// A small procedural jazz loop (Web Audio, no files): walking bass, ride cymbal, brushed snare, electric-piano chords.
// Original progression and lines generated in code. Plays only while sound is on.
const PROG = [ // [root midi, chord intervals] : a minor ii-V-i turnaround, 2 bars each
  [50, [0, 3, 7, 10]], [55, [0, 4, 7, 10]], [48, [0, 4, 7, 11]], [45, [0, 3, 7, 10]],
  [50, [0, 3, 7, 10]], [43, [0, 4, 7, 10]], [48, [0, 4, 7, 11]], [52, [0, 4, 7, 10]],
];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
export function createJazz(getAudio) {
  let timer = null; let next = 0; let step = 0; let out = null; let noise = null;
  const BPM = 132; const beat = 60 / BPM;
  function voice(ctx, f, t, dur, type, vol, dest, attack = 0.01) { const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05); }
  function hit(ctx, t, dur, freq, vol, type = 'highpass') { const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f).connect(g).connect(out); s.start(t, Math.random()); s.stop(t + dur + 0.05); }
  function schedule() {
    const a = getAudio(); if (!a) { stop(); return; } const { ctx } = a;
    while (next < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 8) % PROG.length; const [root, iv] = PROG[bar]; const eighth = step % 8; const swing = eighth % 2 ? beat * 0.66 : 0; const t = next + (eighth % 2 ? swing - beat * 0.5 : 0);
      if (eighth % 2 === 0) { // quarter notes: walking bass + ride
        const q = eighth / 2; const notes = [root, root + iv[1], root + iv[2], root + (q === 3 ? (PROG[(bar + 1) % PROG.length][0] - root > 0 ? -1 : 1) + (PROG[(bar + 1) % PROG.length][0] - root) : iv[3] - 12)];
        voice(ctx, hz(notes[q] - 12), t, beat * 0.9, 'triangle', 0.22, out, 0.005);
        hit(ctx, t, 0.35, 7000, 0.05);
        if (q === 1 || q === 3) hit(ctx, t, 0.18, 1800, 0.06, 'bandpass');
        if (q === 0 && Math.random() < 0.8) iv.forEach((n) => voice(ctx, hz(root + 12 + n), t + beat * 0.02, beat * 1.6, 'sine', 0.035, out, 0.02));
      } else if (Math.random() < 0.45) hit(ctx, t, 0.12, 8000, 0.03);
      if (eighth === 5 && Math.random() < 0.5) iv.slice(1).forEach((n) => voice(ctx, hz(root + 12 + n), t, beat * 0.4, 'sine', 0.03, out, 0.01));
      next += beat / 2; step++;
    }
  }
  function start() {
    const a = getAudio(); if (!a || timer) return; const { ctx, master } = a;
    if (!noise) { noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    out = ctx.createGain(); out.gain.value = 0.0001; out.gain.exponentialRampToValueAtTime(0.55, ctx.currentTime + 1.2); out.connect(master);
    next = ctx.currentTime + 0.1; step = 0; timer = setInterval(schedule, 80);
  }
  function stop() { clearInterval(timer); timer = null; if (out) { const o = out; try { o.gain.setTargetAtTime(0.0001, o.context.currentTime, 0.2); setTimeout(() => o.disconnect(), 800); } catch { /* ignore */ } out = null; } }
  return { start, stop, get playing() { return !!timer; } };
}
