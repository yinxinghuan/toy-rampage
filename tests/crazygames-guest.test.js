import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const deploy = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const vite = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('root page has no AlterU guest login script', () => {
  assert.equal(indexHtml.includes('guest-shell.js'), false);
  assert.equal(indexHtml.includes('images.aiwaves.tech'), false);
  assert.match(indexHtml, /alteru-storage-scope\.js/);
  assert.match(indexHtml, /src="\.\/src\/main\.js"/);
});

test('crazygames build is a separate Pages path and omits the portal watermark', () => {
  assert.match(pkg.scripts['build:crazygames'], /--mode crazygames/);
  assert.match(pkg.scripts['build:crazygames'], /verify-crazygames\.mjs/);
  assert.match(vite, /dist-crazygames/);
  assert.match(vite, /__isCrazyGamesBuild/);
  assert.match(deploy, /npm run build:crazygames/);
  assert.match(deploy, /dist\/crazygames/);
  assert.match(main, /import\.meta\.env\.MODE==='crazygames'/);
  assert.doesNotMatch(main, /import watermark from '\.\/img\/alteru\.svg'/);
});
