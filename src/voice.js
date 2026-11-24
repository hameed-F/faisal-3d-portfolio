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

// ---------- text to speech ----------
// Voices load asynchronously (Chrome returns [] at first), so we wait for them. For Urdu we prefer a female ur-PK voice
// (e.g. Microsoft "Uzma", Google "Urdu"), then any Urdu voice. Long answers are spoken sentence by sentence, because Chrome
// silently stops a single utterance after ~15 s. If the device has no Urdu voice at all, onNoVoice() is called instead of
// failing silently.
const FEMALE = /uzma|عظمی|gul|گل|female|woman|zira|aria|jenny|salma|neerja|swara|heera|kalpana|google/i; // Edge names its Urdu voices in Urdu script: عظمیٰ (Uzma), گل (Gul)
const MALE = /asad|اسد|salman|سلمان|male|david|guy|ravi|hemant|madhur/i;
let voicesReady = null;
function getVoices() {
  if (!canSpeak) return Promise.resolve([]);
  const now = speechSynthesis.getVoices(); if (now.length) return Promise.resolve(now);
  voicesReady ||= new Promise((res) => { const done = () => res(speechSynthesis.getVoices()); speechSynthesis.addEventListener('voiceschanged', done, { once: true }); setTimeout(done, 1500); });
  return voicesReady;
}
export function pickVoice(voices, lang) {
  const base = lang.slice(0, 2).toLowerCase(); const exact = voices.filter((v) => v.lang.toLowerCase().replace('_', '-') === lang.toLowerCase());
  const same = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  const rank = (v) => (FEMALE.test(v.name) ? 0 : 1) + (MALE.test(v.name) ? 2 : 0) + (v.localService ? 0 : -0.5); // online/natural voices sound better
  return [...exact].sort((a, b) => rank(a) - rank(b))[0] || [...same].sort((a, b) => rank(a) - rank(b))[0] || null;
}
const clean = (t) => t.replace(/\[\d+\]/g, '').replace(/[*_#`~]/g, '').replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim();
const chunks = (t) => (t.match(/[^.!?؟۔\n]+[.!?؟۔]*/g) || [t]).map((x) => x.trim()).filter(Boolean);
let keepAlive = 0;
export async function speak(text, { lang, onNoVoice } = {}) {
  if (!canSpeak) return;
  const body = clean(text); if (!body) return;
  const urduScript = /[؀-ۿ]/.test(body);
  const want = lang || (urduScript ? 'ur-PK' : 'en-US');
  const voices = await getVoices(); const voice = pickVoice(voices, want);
  if (!voice && want.startsWith('ur') && urduScript) { onNoVoice?.(); return; } // no Urdu voice on this device: an English voice cannot read Urdu script
  speechSynthesis.cancel(); clearInterval(keepAlive);
  const parts = chunks(body);
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p); u.lang = voice?.lang || want; if (voice) u.voice = voice;
    u.rate = urduScript ? 0.95 : 1.02; u.pitch = 1.1;
    if (i === parts.length - 1) u.onend = () => clearInterval(keepAlive);
    // an online voice can fail (network); fall back once to a local voice of the same language
    if (i === 0 && voice && !voice.localService) u.onerror = (e) => { if (e.error === 'interrupted' || e.error === 'canceled') return; const local = voices.find((v) => v.localService && v.lang.slice(0, 2) === voice.lang.slice(0, 2)); if (local) { speechSynthesis.cancel(); parts.forEach((q) => { const w = new SpeechSynthesisUtterance(q); w.voice = local; w.lang = local.lang; speechSynthesis.speak(w); }); } else if (want.startsWith('ur')) onNoVoice?.(); };
    speechSynthesis.speak(u);
  });
  keepAlive = setInterval(() => { if (!speechSynthesis.speaking) { clearInterval(keepAlive); return; } speechSynthesis.pause(); speechSynthesis.resume(); }, 10000); // Chrome desktop stall workaround
}
export function stopSpeaking() { if (canSpeak) { speechSynthesis.cancel(); clearInterval(keepAlive); } }
