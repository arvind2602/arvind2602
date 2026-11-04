// Generates languages.svg from public GitHub data. No personal token required.
import { writeFileSync } from "node:fs";

const USER = process.env.GH_USER || "arvind2602";
const TOKEN = process.env.GH_TOKEN || "";
const base = { "Accept": "application/vnd.github+json", "User-Agent": "profile-languages" };
const auth = TOKEN ? { ...base, Authorization: `Bearer ${TOKEN}` } : base;

const COLORS = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", HTML: "#e34c26",
  CSS: "#563d7c", SCSS: "#c6538c", Java: "#b07219", "C++": "#f34b7d", C: "#555555",
  "C#": "#178600", Ruby: "#701516", PHP: "#4F5D95", Go: "#00ADD8", Rust: "#dea584",
  Shell: "#89e051", Dart: "#00B4AB", Kotlin: "#A97BFF", Swift: "#F05138", Vue: "#41b883",
  Jupyter: "#DA5B0B", "Jupyter Notebook": "#DA5B0B", MDX: "#fcb32c", Astro: "#ff5a03",
  Svelte: "#ff3e00", "EJS": "#a91e50", Blade: "#f7523f", Dockerfile: "#384d54",
};

async function gh(url, headers) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function listRepos(headers) {
  const all = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh(`https://api.github.com/users/${USER}/repos?per_page=100&type=owner&page=${page}`, headers);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all.filter((r) => !r.fork && !r.archived);
}

let repos = await listRepos(auth).catch(() => []);
if (repos.length < 3) repos = await listRepos(base).catch(() => repos); // fallback: unauthenticated

const totals = {};
for (const r of repos) {
  try {
    const langs = await gh(`https://api.github.com/repos/${USER}/${r.name}/languages`, auth).catch(() => ({}));
    for (const [k, v] of Object.entries(langs)) totals[k] = (totals[k] || 0) + v;
  } catch { /* skip */ }
}

const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
const langs = Object.entries(totals)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 6)
  .map(([name, bytes]) => ({ name, pct: (bytes / sum) * 100 }));

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const color = (n) => COLORS[n] || "#8b949e";

const W = 495, pad = 25, rowH = 30, top = 70, barW = W - pad * 2;
const HEIGHT = top + Math.max(langs.length, 1) * rowH + 24;

let rows = "";
langs.forEach((l, i) => {
  const y = top + i * rowH;
  const w = Math.max(4, (barW * l.pct) / 100);
  rows += `<circle cx="${pad + 5}" cy="${y - 4}" r="5" fill="${color(l.name)}"/>`
    + `<text x="${pad + 18}" y="${y}" class="name">${esc(l.name)}</text>`
    + `<text x="${W - pad}" y="${y}" text-anchor="end" class="pct">${l.pct.toFixed(1)}%</text>`
    + `<rect x="${pad}" y="${y + 8}" width="${barW}" height="8" rx="4" fill="#21262d"/>`
    + `<rect x="${pad}" y="${y + 8}" width="${w.toFixed(1)}" height="8" rx="4" fill="${color(l.name)}"/>`;
});

const F = '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif';
const svg = `<svg width="${W}" height="${HEIGHT}" viewBox="0 0 ${W} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Most used languages">
<style>
  .title{font:600 18px ${F};fill:#58a6ff}
  .name{font:400 14px ${F};fill:#c9d1d9}
  .pct{font:600 13px ${F};fill:#8b949e}
  .cap{font:400 11px ${F};fill:#6e7681}
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${HEIGHT - 1}" rx="6" fill="#0d1117" stroke="#30363d"/>
<text x="${pad}" y="42" class="title">Most Used Languages</text>
<text x="${W - pad}" y="42" text-anchor="end" class="cap">by bytes of code</text>
${rows}
</svg>`;

writeFileSync("languages.svg", svg);
console.log(`Wrote languages.svg — ${langs.length} languages from ${repos.length} repos`);
