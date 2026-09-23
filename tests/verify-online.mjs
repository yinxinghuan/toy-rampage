import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const base = 'https://game.aiwaves.tech/0b7bc17b-d66e-4b51-9b7d-5a5c178dc4ae/';
const build = 'toy-workshop-playtest-20260911-r8';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const evidence = { base, build, verifiedAt: new Date().toISOString(), files: [] };
async function walk(directory, relative = '') {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const rel = relative + entry.name;
    if (entry.isDirectory()) { await walk(directory + '/' + entry.name, rel + '/'); continue; }
    const local = await fs.readFile(directory + '/' + entry.name), response = await fetch(new URL(rel, base));
    assert.equal(response.status, 200, rel);
    const remote = Buffer.from(await response.arrayBuffer());
    assert.equal(sha(remote), sha(local), `Deployment differs: ${rel}`);
    evidence.files.push({ path: rel, status: response.status, bytes: remote.length, sha256: sha(remote) });
  }
}
await walk(root + 'dist');
const response = await fetch(new URL('api/health', base));
assert.equal(response.status, 200); const health = await response.json(); assert.equal(health.build, build); assert.equal(health.persistence, false);
evidence.health = health;
assert.equal((await fetch(new URL('api/save', base))).status, 404);
assert.equal((await fetch(new URL('api/health', base), { method: 'POST' })).status, 404);
await fs.mkdir(root + '_qa', { recursive: true });
await fs.writeFile(root + '_qa/online-verification.json', JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
