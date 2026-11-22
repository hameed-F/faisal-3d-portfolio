# DEVLOG

## 2026-11-22
- Plan approved; everything is built the same day, nothing cut up front.
- Avatar exported: 0.85 MB GLB, 10 clips (WebP textures + meshopt). Loads in 0.34 s in a Three.js test page.
- Phase 1: Vite skeleton; all sections as real HTML panels (this is also the no-3D "Basic" tier). Build: JS 25 kB (9.8 kB gzip), CSS 14.8 kB. Public assets 1.6 MB (images in WebP).
- Contact API (/api/contact): Brevo REST, honeypot, 5 msgs/10 min per instance, server validation, HTML escaping. Unit-tested with mocked Brevo (405, 400, honeypot, 200, 429, 502, 500 all as expected). Real delivery not tested yet (needs Vercel env vars).
