// Generates sky-blue SVG cards (stats, top-langs, repo pins) into assets/
// Usage: node scripts/update-stats.mjs   (requires gh CLI, authed as mitherly)
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets');

// ---------- palette ----------
const C = {
  bg: '#0D1B2A', border: '#1E3A5F', title: '#7DD3FC', accent: '#38BDF8',
  text: '#C9DCEB', muted: '#7FA8C9', num: '#E8F4FD', star: '#E3B341',
};
const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572a5',
  Java: '#b07219', HTML: '#e34c26', CSS: '#663399', Shell: '#89e051',
  Go: '#00ADD8', Kotlin: '#A97BFF', C: '#555555', 'C++': '#f34b7d',
};
const FONT = 'Segoe UI, Verdana, sans-serif';

// curated descriptions for pin cards (English, profile voice)
const PINS = [
  { repo: 'VK-Wave', desc: 'Unofficial desktop client for VK Music built with Electron, featuring Discord RPC' },
  { repo: 'sweetgram-fork', desc: 'Telegram fork with a signature pink style and a set of custom features' },
  { repo: 'nscan', desc: 'A simple network scanner inspired by nmap' },
  { repo: 'arsenalsmp', desc: 'Website for the ArsenalSMP minecraft server' },
];

// ---------- helpers ----------
const api = (path) => JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8' }));
const apiI = (path) => execFileSync('gh', ['api', '-i', path], { encoding: 'utf8' });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const wrap = (text, max) => {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max) { lines.push(line.trim()); line = w; }
    else line += ' ' + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.slice(0, 2); // pins show max 2 lines
};
const save = (name, svg) => { writeFileSync(join(OUT, name), svg); console.log('  +', name); };

// ---------- data ----------
console.log('fetching github data...');
const user = api('/users/mitherly');
const repos = api(`/users/${user.login}/repos?per_page=100`);

let stars = 0;
for (const r of repos) stars += r.stargazers_count;

let commits = 0;
for (const r of repos) {
  const raw = apiI(`/repos/${user.login}/${r.name}/commits?per_page=1&author=${user.login}`);
  const m = raw.match(/page=(\d+)>; rel="last"/);
  const n = m ? +m[1] : (raw.includes('"sha"') ? 1 : 0);
  commits += n;
}

// top languages by bytes across own repos (forks + profile repo excluded,
// same as github-readme-stats default)
const langBytes = {};
for (const r of repos) {
  if (r.fork || r.name === user.login) continue;
  try {
    const langs = api(`/repos/${user.login}/${r.name}/languages`);
    for (const [k, v] of Object.entries(langs)) langBytes[k] = (langBytes[k] || 0) + v;
  } catch { /* repo without languages */ }
}
const totalBytes = Object.values(langBytes).reduce((a, b) => a + b, 0);
const topLangs = Object.entries(langBytes)
  .sort((a, b) => b[1] - a[1]).slice(0, 6)
  .map(([name, bytes]) => ({
    name,
    pct: +((bytes / totalBytes) * 100).toFixed(1),
    color: LANG_COLORS[name] || '#8b949e',
  }));

console.log(`commits=${commits} stars=${stars} repos=${repos.length} langs=${topLangs.length}`);

mkdirSync(OUT, { recursive: true });

// ---------- stats card (2x2) ----------
const statsItems = [
  { label: 'TOTAL COMMITS', value: `${commits}+` },
  { label: 'STARS EARNED', value: String(stars) },
  { label: 'PUBLIC REPOS', value: String(repos.length) },
  { label: 'FOLLOWERS', value: String(user.followers) },
];
{
  const cols = [30, 235], rows = [86, 140];
  const items = statsItems.map((it, i) => `
    <text x="${cols[i % 2]}" y="${rows[Math.floor(i / 2)]}" font-family="${FONT}" font-size="24" font-weight="700" fill="${C.num}">${esc(it.value)}</text>
    <rect x="${cols[i % 2]}" y="${rows[Math.floor(i / 2)] + 8}" width="26" height="3" rx="1.5" fill="${C.accent}" />
    <text x="${cols[i % 2]}" y="${rows[Math.floor(i / 2)] + 26}" font-family="${FONT}" font-size="10" letter-spacing="1" fill="${C.muted}">${it.label}</text>`).join('');
  save('stats.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="176" viewBox="0 0 420 176">
  <rect width="420" height="176" rx="14" fill="${C.bg}" stroke="${C.border}" />
  <text x="24" y="38" font-family="${FONT}" font-size="15" font-weight="600" fill="${C.title}">${esc(user.login)}'s github stats</text>${items}
</svg>`);
}

// ---------- top languages card ----------
{
  const rowH = 38, top = 66, w = 420, h = top + topLangs.length * rowH + 16;
  const rows = topLangs.map((l, i) => {
    const y = top + i * rowH;
    return `
    <text x="24" y="${y}" font-family="${FONT}" font-size="12" fill="${C.text}">${esc(l.name)}</text>
    <text x="396" y="${y}" text-anchor="end" font-family="${FONT}" font-size="12" fill="${C.muted}">${l.pct}%</text>
    <rect x="24" y="${y + 7}" width="372" height="8" rx="4" fill="#16324F" />
    <rect x="24" y="${y + 7}" width="${Math.max(4, 372 * l.pct / 100)}" height="8" rx="4" fill="${l.color}" />`;
  }).join('');
  save('top-langs.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="14" fill="${C.bg}" stroke="${C.border}" />
  <text x="24" y="38" font-family="${FONT}" font-size="15" font-weight="600" fill="${C.title}">top languages</text>${rows}
</svg>`);
}

// ---------- pin cards ----------
for (const pin of PINS) {
  const r = repos.find((x) => x.name === pin.repo);
  if (!r) { console.log('  ! repo not found:', pin.repo); continue; }
  const lang = r.language || 'Code';
  const color = LANG_COLORS[lang] || '#8b949e';
  const lines = wrap(pin.desc, 47);
  const descSvg = lines.map((l, i) =>
    `<text x="20" y="${54 + i * 18}" font-family="${FONT}" font-size="12" fill="${C.text}">${esc(l)}</text>`).join('');
  const h = lines.length > 1 ? 110 : 100;
  save(`pin-${pin.repo}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="356" height="${h}" viewBox="0 0 356 ${h}">
  <rect width="356" height="${h}" rx="14" fill="${C.bg}" stroke="${C.border}" />
  <text x="20" y="32" font-family="${FONT}" font-size="15" font-weight="600" fill="${C.title}">${esc(pin.repo)}</text>
  ${descSvg}
  <circle cx="25" cy="${h - 17}" r="5" fill="${color}" />
  <text x="36" y="${h - 13}" font-family="${FONT}" font-size="11" fill="${C.muted}">${esc(lang)}</text>
  <text x="336" y="${h - 13}" text-anchor="end" font-family="${FONT}" font-size="12" fill="${C.star}">★ ${r.stargazers_count}</text>
</svg>`);
}

console.log('done.');
