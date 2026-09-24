// Check the Crazy Games guest folder is playable without an AlterU login wall.
// Hosting for Basic Launch is the GitHub Pages iframe URL, not a zip upload.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist-crazygames');
const BUILD_ID = 'toy-rampage-crazygames-20260924-r51';
const MAX_INITIAL = 50 * 1024 * 1024;
const MAX_TOTAL = 250 * 1024 * 1024;

const forbidden = [
  'guest-shell.js',
  'images.aiwaves.tech/alteru/guest-shell',
  'apps.apple.com',
  'Get AlterU on the App Store',
  '下载 AlterU',
  '在 AlterU 中打开',
  'Open in AlterU',
  'alteru.svg',
];

const indexPath = path.join(dist, 'index.html');
let indexHtml;
try {
  indexHtml = readFileSync(indexPath, 'utf8');
} catch {
  console.error('dist-crazygames/index.html is missing. Run vite build --mode crazygames first.');
  process.exit(1);
}

if (!/__isCrazyGamesBuild\s*=\s*true/.test(indexHtml)) {
  console.error('crazygames index.html did not set __isCrazyGamesBuild');
  process.exit(1);
}
if (!indexHtml.includes(`content="${BUILD_ID}"`)) {
  console.error(`crazygames index.html is missing build-id ${BUILD_ID}`);
  process.exit(1);
}
if (!indexHtml.includes('alteru-storage-scope.js')) {
  console.error('crazygames index.html is missing the storage-scope adapter');
  process.exit(1);
}
if (!indexHtml.includes('src="./src/main.js"') && !/src="\.\/assets\/[^"]+\.js"/.test(indexHtml)) {
  console.error('crazygames index.html has no game module');
  process.exit(1);
}

const infoPath = path.join(dist, 'build-info.json');
const info = JSON.parse(readFileSync(infoPath, 'utf8'));
info.build = BUILD_ID;
info.mode = 'crazygames-guest';
info.persistence = 'local-browser';
info.payments = false;
info.hosting = 'external-iframe';
writeFileSync(infoPath, JSON.stringify(info, null, 2) + '\n');

const hits = [];
let total = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const filePath = path.join(dir, name);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath);
      continue;
    }
    total += stat.size;
    if (/alteru.*\.svg$/i.test(name)) hits.push(`${path.relative(root, filePath)}: AlterU watermark asset`);
    if (!/\.(html|js|css|svg|json|txt)$/i.test(name)) continue;
    const text = readFileSync(filePath, 'utf8');
    for (const needle of forbidden) {
      if (text.includes(needle)) hits.push(`${path.relative(root, filePath)}: ${needle}`);
    }
  }
}
walk(dist);

if (hits.length) {
  console.error('crazygames build still contains an AlterU login wall, App Store gate, or portal mark:');
  for (const hit of hits) console.error(`  ${hit}`);
  process.exit(1);
}

// Boot waits on the module graph, Vite-emitted assets, and ./animation/ sheets.
// Dialog art, music, and the platform poster load later and stay in the total.
let startup = 0;
function addStartup(dir) {
  for (const name of readdirSync(dir)) {
    const filePath = path.join(dir, name);
    const stat = statSync(filePath);
    if (stat.isDirectory()) addStartup(filePath);
    else startup += stat.size;
  }
}
startup += statSync(indexPath).size;
for (const name of ['assets', 'animation']) {
  const dir = path.join(dist, name);
  try {
    addStartup(dir);
  } catch {
    /* optional until the build emits that folder */
  }
}

if (total > MAX_TOTAL) {
  console.error(`crazygames build is ${(total / 1e6).toFixed(1)} MB, over the 250 MB total limit`);
  process.exit(1);
}
if (startup > MAX_INITIAL) {
  console.error(`crazygames initial load is ${(startup / 1e6).toFixed(1)} MB, over the 50 MB limit`);
  process.exit(1);
}

console.log(`crazygames guest: initial ${(startup / 1e6).toFixed(2)} MB / total ${(total / 1e6).toFixed(2)} MB (limits 50 / 250 MB)`);
console.log('login wall: none; storage scope kept; AlterU watermark omitted');
