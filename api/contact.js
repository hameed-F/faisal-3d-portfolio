// Vercel serverless function: POST /api/contact
// Sends the visitor's message to the owner through Brevo's REST API (no SMTP, no Nodemailer).
// Secrets are read only from process.env (set in .env.local locally, in the Vercel dashboard in production).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LIMITS = { name: 80, email: 120, subject: 120, message: 2000 };
const MAX_BODY = 8 * 1024;

// Basic per-instance rate limit (serverless instances are short-lived, so this is a baseline, not a guarantee).
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now(); const windowMs = 10 * 60 * 1000; const max = 5;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now); hits.set(ip, list);
  if (hits.size > 500) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return list.length > max;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const noNewlines = (s) => s.replace(/[\r\n]+/g, ' ');

export function validate(d) {
  const f = {};
  if (d.name.length < 2) f.name = 'Please enter your name (at least 2 characters).';
  if (!EMAIL_RE.test(d.email)) f.email = 'Please enter a valid email address.';
  if (d.subject.length < 3) f.subject = 'Please enter a subject (at least 3 characters).';
  if (d.message.length < 10) f.message = 'Please write a message (at least 10 characters).';
  return f;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'Method not allowed.' }); }

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) return res.status(429).json({ ok: false, error: 'Too many messages from this connection. Please try again later.' });

  let body = req.body;
  if (typeof body === 'string') { if (body.length > MAX_BODY) return res.status(413).json({ ok: false, error: 'Message too large.' }); try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ ok: false, error: 'Invalid request.' });

  // Honeypot: real visitors never fill this hidden field. Pretend success so bots learn nothing.
  if (body.website) return res.status(200).json({ ok: true });

  const d = {
    name: noNewlines(clean(body.name, LIMITS.name)), email: noNewlines(clean(body.email, LIMITS.email)),
    subject: noNewlines(clean(body.subject, LIMITS.subject)), message: clean(body.message, LIMITS.message),
  };
  const fields = validate(d);
  if (Object.keys(fields).length) return res.status(400).json({ ok: false, error: 'Please fix the highlighted fields.', fields });

  const apiKey = process.env.BREVO_API_KEY; const to = process.env.CONTACT_RECEIVER_EMAIL;
  if (!apiKey || !to) { console.error('contact: missing BREVO_API_KEY or CONTACT_RECEIVER_EMAIL'); return res.status(500).json({ ok: false, error: 'The contact service is not configured yet. Please email me directly.' }); }

  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>New portfolio message</h2>
    <p><b>From:</b> ${esc(d.name)} &lt;${esc(d.email)}&gt;</p><p><b>Subject:</b> ${esc(d.subject)}</p><hr>
    <p style="white-space:pre-wrap">${esc(d.message)}</p></div>`;
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Muhammad Faisal Hameed', email: to },
        to: [{ email: to }],
        replyTo: { email: d.email, name: d.name },
        subject: `[Portfolio] ${d.subject}`,
        htmlContent: html,
        textContent: `From: ${d.name} <${d.email}>\nSubject: ${d.subject}\n\n${d.message}`,
      }),
    });
    if (!r.ok) { console.error('contact: Brevo responded', r.status, (await r.text()).slice(0, 300)); return res.status(502).json({ ok: false, error: 'Sorry, the message could not be sent right now. Please email me directly.' }); }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('contact: request failed', e?.message);
    return res.status(502).json({ ok: false, error: 'Sorry, the message could not be sent right now. Please email me directly.' });
  }
}
