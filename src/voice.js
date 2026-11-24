// Voice chat for the dice companion using the browser's own speech features (no extra service or key).
// Speech-to-text: SpeechRecognition (Chrome, Edge, Safari). Text-to-speech: speechSynthesis (all modern browsers).
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = !!SR;
export const canSpeak = 'speechSynthesis' in window;

export function listen({ lang = navigator.language || 'en-US', onResult, onEnd, onError }) {
  if (!SR) return null;
  const r = new SR(); r.lang = lang; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
  let finalText = '';
  r.onresult = (e) => { let txt = ''; for (const res of e.results) { txt += res[0].transcript; if (res.isFinal) finalText = txt; } onResult?.(txt, !!finalText); };
  r.onerror = (e) => onError?.(e.error);
  r.onend = () => onEnd?.(finalText);
  r.start();
  return r;
}

// ---------- reading answers aloud (always a woman's voice, never the default male one) ----------
// Urdu answers: 1) server voice (Azure ur-PK "Uzma", via /api/tts) when it's configured;
// 2) the browser's own Urdu voice (Edge has them, Chrome on Windows does not);
// 3) otherwise the answer is spelled in Hindi letters by /api/tts and read by the browser's female Hindi voice
//    (Chrome's "Google हिन्दी"); spoken Urdu and Hindi sound alike. If none works, onNoVoice() is called (no male voice).
const FEMALE = /گل|عظمی|uzma|\bgul\b|female|zira|jenny|aria|michelle|ava\b|emma|salma|swara|kalpana|heera|google (us|हिन्दी|اردو)|google uk english female|samantha|karen|lekha/i;
const MALE = /اسد|سلمان|asad|salman|david|guy|mark|\bmale\b|ravi|hemant|madhur|daniel|alex|fred|rishi/i;
let audioEl = null; let token = 0;
function voicesNow() { return canSpeak ? speechSynthesis.getVoices() : []; }
function waitVoices() { return new Promise((res) => { if (voicesNow().length) return res(voicesNow()); const t = setTimeout(() => res(voicesNow()), 1500); speechSynthesis.addEventListener?.('voiceschanged', () => { clearTimeout(t); res(voicesNow()); }, { once: true }); }); }
function femaleVoice(voices, base) {
  const same = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  return same.find((v) => FEMALE.test(v.name) && !MALE.test(v.name)) || same.find((v) => !MALE.test(v.name)) || null;
}
function say(text, voice, rate = 1.0) {
  speechSynthesis.cancel();
  // one utterance per sentence: Chrome stops long single utterances after ~15 s
  for (const part of text.match(/[^.!?؟۔।\n]+[.!?؟۔।]*/g) || [text]) { const p = part.trim(); if (!p) continue; const u = new SpeechSynthesisUtterance(p); u.voice = voice; u.lang = voice.lang; u.rate = rate; u.pitch = 1.05; speechSynthesis.speak(u); }
}
export async function speak(text, { lang, onNoVoice } = {}) {
  const clean = text.replace(/\[\d+\]/g, '').replace(/[*_#`~]/g, '').replace(/\s+/g, ' ').trim(); if (!clean) return;
  stopSpeaking(); const my = ++token;
  const urdu = /[؀-ۿ]/.test(clean) || (lang || '').startsWith('ur');
  if (!urdu) {
    const voices = canSpeak ? await waitVoices() : []; const v = femaleVoice(voices, (lang || 'en').slice(0, 2));
    if (v) say(clean, v, 1.02); else onNoVoice?.('en');
    return;
  }
  // 1) server voice
  try {
    const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: clean }) });
    if (my !== token) return;
    if (r.ok && (r.headers.get('content-type') || '').includes('audio')) { const url = URL.createObjectURL(await r.blob()); audioEl = new Audio(url); window.__ttsPlaying = true; audioEl.onended = audioEl.onpause = () => { window.__ttsPlaying = false; URL.revokeObjectURL(url); }; await audioEl.play(); return; }
  } catch { /* fall through */ }
  if (my !== token || !canSpeak) return;
  // 2) the browser's own Urdu voice
  const voices = await waitVoices(); const ur = femaleVoice(voices, 'ur');
  if (ur) { say(clean, ur, 0.98); return; }
  // 3) Hindi voice reading the same words in Devanagari
  const hi = femaleVoice(voices, 'hi');
  if (hi) {
    try {
      const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: clean, mode: 'hindi' }) });
      const j = await r.json().catch(() => ({})); if (my !== token) return;
      if (r.ok && j.text) { say(j.text, hi, 0.97); return; }
    } catch { /* fall through */ }
  }
  onNoVoice?.('ur');
}
export function stopSpeaking() { token++; if (canSpeak) speechSynthesis.cancel(); if (audioEl) { audioEl.pause(); audioEl = null; } }
export const isSpeaking = () => (canSpeak && speechSynthesis.speaking) || !!(audioEl && !audioEl.paused);
