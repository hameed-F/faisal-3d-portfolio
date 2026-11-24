// The dice companion's chat (English / Urdu / Roman Urdu), grounded in the portfolio by /api/chat.
import { canListen, canSpeak, listen, speak, stopSpeaking } from './voice.js';
import { esc } from './panels.js';
const $ = (s) => document.querySelector(s);

const SECTION_MAP = { journey: 'edu', achievements: 'about', skills: 'skills', projects: 'projects', contact: 'contact', about: 'about', promo: 'video' };
const CHIPS = ['What has Faisal built?', 'Which tools does he use?', 'فیصل کون ہے؟', 'Faisal ke projects batao', 'کیا وہ انٹرن شپ کر رہا ہے؟'];

export function initChat({ go, hooks, name }) {
  const chat = $('#chat'); const log = $('#chatLog'); const form = $('#chatForm'); const input = $('#chatInput'); const fab = $('#chatFab');
  const mic = $('#micBtn'); const spk = $('#speakBtn'); const langSel = $('#chatLang');
  const history = []; let busy = false; let speakOn = false; let rec = null;
  $('#botName').textContent = name; fab.hidden = false;

  const dir = (t) => { const u = (t.match(/[؀-ۿ]/g) || []).length; const l = (t.match(/[A-Za-z]/g) || []).length; return u > l ? 'rtl' : 'ltr'; };
  const bubble = (who, text, raw = false) => { const d = document.createElement('div'); d.className = `b ${who}`; if (raw) d.innerHTML = text; else { d.textContent = text; d.dir = dir(text); } log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
  $('#chatChips').innerHTML = CHIPS.map((c) => `<button type="button" dir="${dir(c)}">${esc(c)}</button>`).join('');
  $('#chatChips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { input.value = b.textContent; form.requestSubmit(); } });

  $('#ragInfo').innerHTML = `<ol>
    <li><b>Collect:</b> Faisal's profile, projects, skills, journey and certificates are split into about 50 small passages, each tagged with where it came from.</li>
    <li><b>Embed:</b> each passage was turned into a 768-number vector with Google's multilingual <code>gemini-embedding-001</code> model (so an Urdu question can find an English passage), once, and saved with the site.</li>
    <li><b>Retrieve:</b> your question is embedded the same way and compared with every passage (cosine similarity). The closest few are kept.</li>
    <li><b>Generate:</b> only those passages go to Gemini, with strict instructions to answer from them alone, in the language you used, and to say so when the portfolio doesn't cover something.</li>
    <li><b>Cite:</b> the chips under each answer show which passages were used. Tap one to open that section.</li></ol>`;

  if (canListen) { mic.hidden = false; mic.addEventListener('click', () => {
    if (rec) { rec.stop(); return; }
    stopSpeaking(); mic.classList.add('on'); input.placeholder = 'Listening…';
    const lang = langSel.value === 'auto' ? (document.documentElement.dataset.voice || navigator.language || 'en-US') : langSel.value;
    rec = listen({ lang, onResult: (t) => { input.value = t; dirFix(); }, onError: (err) => { input.placeholder = err === 'not-allowed' ? 'Microphone permission was blocked.' : 'Could not hear you. Try again.'; },
      onEnd: (t) => { rec = null; mic.classList.remove('on'); input.placeholder = 'Ask anything about Faisal…'; if (t.trim()) { speakOn = speakOn || canSpeak; spk.setAttribute('aria-pressed', String(speakOn)); form.requestSubmit(); } } });
  }); }
  if (canSpeak) { spk.hidden = false; spk.addEventListener('click', () => { speakOn = !speakOn; spk.setAttribute('aria-pressed', String(speakOn)); if (!speakOn) stopSpeaking(); }); }
  const dirFix = () => { input.dir = dir(input.value); };
  input.addEventListener('input', dirFix);

  const open = () => {
    chat.hidden = false; fab.setAttribute('aria-expanded', 'true'); input.focus(); hooks.onChat?.('open');
    if (!log.children.length) bubble('bot', `Salaam! I'm ${name}, Faisal's lucky dice. Ask me anything about his projects, skills, studies or experience, in English or اردو. I only answer from his portfolio.`);
  };
  const close = () => { chat.hidden = true; stopSpeaking(); hooks.onChat?.('close'); fab.focus(); };
  hooks.openChat = open; hooks.closeChat = close;
  fab.addEventListener('click', () => (chat.hidden ? open() : close()));
  $('#chatClose').addEventListener('click', close);
  chat.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); const q = input.value.trim(); if (!q || busy) return;
    busy = true; input.value = ''; dirFix(); bubble('me', q);
    const wait = bubble('bot', '…'); hooks.onChat?.('think');
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, history }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.answer) throw new Error(j.error || 'I could not answer right now.');
      const used = (j.sources || []).filter((s) => s.used); const shown = used.length ? used : (j.sources || []).slice(0, 2);
      wait.dir = dir(j.answer);
      wait.innerHTML = esc(j.answer).replace(/\n/g, '<br>').replace(/\[(\d+)\]/g, '<sup>[$1]</sup>')
        + (shown.length ? `<div class="src" dir="ltr">${shown.map((s) => `<button type="button" data-sec="${esc(s.section)}" title="relevance ${s.score}">[${s.n}] ${esc(s.title)}</button>`).join('')}</div>` : '');
      history.push({ role: 'user', text: q }, { role: 'bot', text: j.answer }); history.splice(0, Math.max(0, history.length - 6));
      hooks.onChat?.('talk'); if (speakOn) speak(j.answer, { lang: langSel.value === 'auto' ? undefined : langSel.value });
    } catch (err) { wait.dir = 'ltr'; wait.textContent = err.message || 'Something went wrong.'; hooks.onChat?.('open'); }
    finally { busy = false; log.scrollTop = log.scrollHeight; }
  });
  log.addEventListener('click', (e) => { const b = e.target.closest('[data-sec]'); if (b) { const id = SECTION_MAP[b.dataset.sec] || 'about'; close(); go(id); } });
  hooks.ask = (q) => { open(); input.value = q; form.requestSubmit(); };
}
