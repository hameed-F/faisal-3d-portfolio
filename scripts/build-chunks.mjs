// Builds data/portfolio-chunks.json from src/content.js (the single source of facts on the site,
// itself copied from ../source/). Each chunk is small, self-contained and tagged with where it came from.
// Run: node scripts/build-chunks.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { profile, aboutZones, skills, journey, projects, certificates } from '../src/content.js';

const chunks = [];
const add = (id, title, section, text) => chunks.push({ id, title, section, text: text.replace(/\s+/g, ' ').trim() });

add('profile', 'Profile', 'about', `${profile.name} is a ${profile.title}. ${profile.subtitle}. Tagline: "${profile.tagline}" Based in ${profile.location}. ${profile.availability}.`);
add('summary', 'Professional summary', 'about', profile.summary);
add('contact', 'Contact details', 'contact', `Email: ${profile.email}. Phone: ${profile.phone}. Location: ${profile.location}. GitHub: ${profile.github}. Earlier portfolio (Framer): ${profile.framer}. A downloadable CV is on the site. The contact form on the site sends a message straight to his email.`);
for (const z of aboutZones) add(`about-${z.id}`, `About: ${z.title}`, 'about', `${z.title}: ${z.text}`);
add('education', 'Education', 'journey', 'BS Computer Science (Gaming & Animation specialization), NED University of Engineering and Technology, Karachi, 2023 to early 2027 (4th year). CGPA 3.605/4.00. Focus: game engine architecture, real-time 3D mechanics, AI behavior systems, semester game production. A new game is built each semester as coursework across varied genres and engines.');
for (const [i, j] of journey.entries()) add(`journey-${i}`, j.title, 'journey', `${j.when}: ${j.title} (${j.where}). ${j.text}`);
for (const g of skills) add(`skills-${g.piece}`, `Skills: ${g.group}`, 'skills', `${g.group}: ` + g.items.map(([n, d]) => `${n} (shown in: ${d})`).join('; ') + '.');
add('skills-overview', 'Core technologies', 'skills', 'Core technologies: Unreal Engine 5 (C++ / Blueprints), Unity (C#), Three.js, Blender. Also C, C++, C#, JavaScript, Python, Java, React Native, Adobe After Effects, Premiere Pro, Illustrator, Autodesk Maya, Git & GitHub, VR/AR development.');
for (const p of projects) {
  const head = `${p.name} (${p.featured ? 'featured project' : 'project'}${p.year ? `, ${p.year}` : ''}). Stack: ${p.stack}. Role: ${p.role}. ${p.summary}`;
  add(`project-${p.id}`, p.name, 'projects', head + (p.links.length ? ' Links: ' + p.links.map(([l, u]) => `${l}: ${u}`).join(', ') + '.' : ' No public link.'));
  if (p.points) add(`project-${p.id}-details`, `${p.name}: contributions`, 'projects', `What ${profile.name.split(' ')[1]} did on ${p.name} (${p.stack}): ` + p.points.join(' '));
}
for (const g of [...new Set(projects.map((p) => p.group))]) {
  const list = projects.filter((p) => p.group === g);
  add(`projects-by-${g.toLowerCase().replace(/[^a-z]/g, '')}`, `Projects made with ${g}`, 'projects', `Projects in the ${g} group (${list.length}): ` + list.map((p) => `${p.name} (${p.stack}${p.year ? ', ' + p.year : ''})`).join('; ') + '.');
}
add('projects-overview', 'All projects', 'projects', `There are ${projects.length} projects: ` + projects.map((p) => `${p.name} (${p.group}${p.featured ? ', featured' : ''})`).join('; ') + '.');
for (const c of certificates) add(`cert-${c.id}`, c.title, 'achievements', `Certificate: ${c.title}, issued by ${c.issuer}${c.date ? `, dated ${c.date}` : ''}.${c.verify ? ` Verify: ${c.verify}` : ''}`);
add('certs-overview', 'Certifications overview', 'achievements', 'Certifications: Unreal Engine 100-hour training (CEGA); Google AI Professional Certificate (Coursera, June 2026); Walk Cycle Basics in Autodesk Maya, Adobe Premiere Pro Basics and Video Basics (ITeachStuff, November 2022); and an IT Department internship certificate from Karachi Development Authority. The resume also lists a CEGA Pre-Production certificate, but no copy of it is shown on the site.');
add('site', 'About this website', 'credits', 'This portfolio is an interactive 3D website built with Three.js and Vite and hosted on Vercel. It is a game-style cabin with board games: Ludo is About Me, chess is Skills (playable against an AI), the property board is Projects, Snakes & Ladders is the education and experience journey (playable), the trophy shelf holds certificates, the TV plays the promo video and the phone is the contact form. Chotu, the snake, is the chatbot.');

mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
writeFileSync(new URL('../data/portfolio-chunks.json', import.meta.url), JSON.stringify(chunks, null, 1));
console.log(`wrote ${chunks.length} chunks`);
