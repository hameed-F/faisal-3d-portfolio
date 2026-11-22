// Quality tiers + automatic Lite mode.
// full  : everything (PS1 post FX at 360p, dense forest, wobble, grain)
// lite  : 240p, fewer props, no wobble/grain, 30 fps cap, short intro, no Free Drive
// basic : no WebGL at all, the HTML page (also the accessibility fallback)

export const TIERS = {
  full: { name: 'Full', renderH: 360, trees: 650, rocks: 90, grain: 0.07, snap: true, dither: true, maxFps: 60, drive: true, freeDrive: true, avatarHz: 60, texSize: 512 },
  lite: { name: 'Lite', renderH: 240, trees: 220, rocks: 30, grain: 0.0, snap: false, dither: true, maxFps: 30, drive: false, freeDrive: false, avatarHz: 30, texSize: 256 },
  basic: { name: 'Text only' },
};

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

/** Look at the device before loading anything heavy. Returns { tier, reasons[] }. */
export function detectTier() {
  const reasons = [];
  const saved = store.get('tier');
  if (saved && TIERS[saved]) return { tier: saved, reasons: ['your saved choice'], manual: true };

  // WebGL available? Software renderer?
  let gl = null; let renderer = '';
  try {
    const c = document.createElement('canvas');
    gl = c.getContext('webgl2') || c.getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch { gl = null; }
  if (!gl) return { tier: 'basic', reasons: ['WebGL is not available'] };
  if (/swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(renderer)) return { tier: 'basic', reasons: ['no hardware graphics (software renderer)'] };

  let tier = 'full';
  const mem = navigator.deviceMemory; const cores = navigator.hardwareConcurrency || 4;
  const conn = navigator.connection || {};
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (mem && mem <= 3) { tier = 'lite'; reasons.push(`${mem} GB device memory`); }
  if (cores <= 4 && coarse) { tier = 'lite'; reasons.push(`${cores}-core mobile CPU`); }
  if (conn.saveData) { tier = 'lite'; reasons.push('Data Saver is on'); }
  if (/^(slow-2g|2g|3g)$/.test(conn.effectiveType || '')) { tier = 'lite'; reasons.push(`slow network (${conn.effectiveType})`); }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { tier = 'lite'; reasons.push('reduced motion preference'); }
  if (/mali-4|adreno \(tm\) [2-4]\d\d|powervr sgx|intel\(r\) hd graphics( [2-4]\d{3})?$/i.test(renderer)) { tier = 'lite'; reasons.push('older GPU'); }
  return { tier, reasons, renderer };
}

export function saveTier(t) { store.set('tier', t); }
export function clearSavedTier() { try { localStorage.removeItem('tier'); } catch { /* ignore */ } }

/**
 * Watches the real frame rate. Calls onSlow() once if the average stays low.
 * Waits for a warm-up period (shader compiles, first texture uploads) before judging.
 */
export class FpsGovernor {
  constructor({ threshold = 38, seconds = 3, warmup = 4, onSlow }) {
    Object.assign(this, { threshold, seconds, warmup, onSlow });
    this.t0 = performance.now(); this.samples = []; this.fired = false; this.paused = false; this.last = 0;
  }
  reset() { this.t0 = performance.now(); this.samples = []; this.fired = false; }
  tick(now) {
    if (this.fired || this.paused) { this.last = now; return; }
    const dt = this.last ? now - this.last : 16; this.last = now;
    if (dt > 250) { this.samples = []; return; } // tab switch or a hitch, ignore
    if ((now - this.t0) / 1000 < this.warmup) return;
    this.samples.push([now, dt]);
    while (this.samples.length && now - this.samples[0][0] > this.seconds * 1000) this.samples.shift();
    if (this.samples.length && now - this.samples[0][0] >= this.seconds * 1000 * 0.95) {
      const avg = this.samples.reduce((s, x) => s + x[1], 0) / this.samples.length;
      const fps = 1000 / avg; this.fps = fps;
      if (fps < this.threshold) { this.fired = true; this.onSlow?.(fps); }
    }
  }
}
