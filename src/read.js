// Read-aloud for any section (browser speech, no service, no cost). Highlights the block being read.
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
export const canRead = !!synth;
let queue = []; let idx = 0; let active = null; let btn = null;

function blocks(root) { return [...root.querySelectorAll('h2, h3, p, li, .when, .where')].filter((el) => el.innerText.trim() && !el.closest('[hidden]') && !el.closest('form')); }
function mark(el) { active?.classList.remove('reading'); active = el; if (el) { el.classList.add('reading'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }
export function stopReading() { if (!synth) return; synth.cancel(); queue = []; mark(null); if (btn) { btn.textContent = '🔊 Read aloud'; btn.setAttribute('aria-pressed', 'false'); btn = null; } }

function speakNext() {
  if (idx >= queue.length) { stopReading(); return; }
  const el = queue[idx++]; mark(el);
  const text = el.innerText.replace(/\s+/g, ' ').trim();
  const u = new SpeechSynthesisUtterance(text); u.lang = /[؀-ۿ]/.test(text) ? 'ur-PK' : (document.documentElement.lang || 'en-US'); u.rate = 1;
  const v = synth.getVoices().find((x) => x.lang.toLowerCase().startsWith(u.lang.slice(0, 2).toLowerCase())); if (v) u.voice = v;
  u.onend = speakNext; u.onerror = () => stopReading();
  synth.speak(u);
}

/** Toggle reading of the section that contains `button`. Click again to stop. */
export function toggleRead(button) {
  if (!synth) return;
  if (btn === button && synth.speaking) { stopReading(); return; }
  stopReading();
  const root = button.closest('.panel, .bubble, [data-section]'); if (!root) return;
  queue = blocks(root.querySelector('.panel-body') || root); idx = 0; btn = button; button.textContent = '⏹ Stop reading'; button.setAttribute('aria-pressed', 'true');
  speakNext();
}
