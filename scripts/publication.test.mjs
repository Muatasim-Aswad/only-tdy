import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { digest } from './lib.mjs';

const publisher = resolve('scripts/publish-release.mjs');
function fixture(mode) {
  const root = mkdtempSync(join(tmpdir(), 'only-tdy-publication-test-'));
  try {
    mkdirSync(join(root, 'release/out/assets'), { recursive: true });
    const names = [
      'SHA256SUMS',
      'only-tdy-v0.1.0-container-linux-amd64.tar.gz',
      'only-tdy-v0.1.0-source.tar.gz',
      'only-tdy-v0.1.0-static.tar.gz',
      'provenance.json',
    ];
    const assets = join(root, 'release/out/assets');
    writeFileSync(join(root, 'package.json'), '{"version":"0.1.0"}');
    writeFileSync(join(root, 'CHANGELOG.md'), 'Synthetic release fixture');
    writeFileSync(
      join(root, 'release/release-files.txt'),
      names.join('\n').replaceAll('v0.1.0', '{tag}') + '\n',
    );
    for (const name of names.filter((n) => n.endsWith('.gz')))
      writeFileSync(join(assets, name), 'Synthetic archive fixture');
    writeFileSync(
      join(assets, 'provenance.json'),
      JSON.stringify({
        tag: 'v0.1.0',
        version: '0.1.0',
        revision: 'a'.repeat(40),
      }),
    );
    writeFileSync(
      join(assets, 'SHA256SUMS'),
      names
        .filter((n) => n !== 'SHA256SUMS')
        .map((n) => `${digest(join(assets, n))}  ${n}\n`)
        .join(''),
    );
    const bytes = Object.fromEntries(
      names.map((n) => [n, readFileSync(join(assets, n)).toString('base64')]),
    );
    const script = `
      import assert from 'node:assert/strict';
      const bytes = ${JSON.stringify(bytes)};
      const mode = ${JSON.stringify(mode)};
      const remote = new Map(Object.keys(bytes).filter((n) => mode === 'draft' ? n === 'provenance.json' : true).map((n) => [n, Buffer.from(bytes[n], 'base64')]));
      if (mode === 'mismatch') remote.set('provenance.json', Buffer.from('Different synthetic bytes'));
      let writes = 0;
      let publishes = 0;
      const json = (value) => new globalThis.Response(JSON.stringify(value), { headers: {'Content-Type':'application/json'} });
      globalThis.fetch = async (url, opts = {}) => {
        const u = new URL(url);
        const method = opts.method || 'GET';
        if (method !== 'GET') writes++;
        if (u.pathname.includes('/git/ref/tags/')) return json({ object: { type:'commit', sha: mode === 'tag-mismatch' ? 'b'.repeat(40) : 'a'.repeat(40) } });
        if (u.pathname.includes('/releases/tags/')) return json({id:1, draft:mode === 'draft', immutable:mode !== 'draft', upload_url:'https://uploads.github.com/repos/example/only-tdy/releases/1/assets{?name,label}'});
        if (u.pathname.endsWith('/releases/1/assets') && method === 'GET') return json([...remote.keys()].map((name) => ({name,url:'https://api.github.com/repos/example/only-tdy/asset/' + name})));
        if (u.pathname.includes('/asset/')) return new globalThis.Response(remote.get(u.pathname.split('/').at(-1)));
        if (u.hostname === 'uploads.github.com') { const name=u.searchParams.get('name'); remote.set(name, Buffer.from(opts.body)); return json({name}); }
        if (method === 'PATCH') { assert.equal(remote.size,5); publishes++; return json({immutable:true}); }
        throw new Error('Unexpected synthetic API call');
      };
      if (mode === 'mismatch' || mode === 'tag-mismatch') {
        await assert.rejects(import(${JSON.stringify(publisher)}), mode === 'mismatch' ? /Existing asset differs/ : /Remote tag differs/);
        assert.equal(writes,0);
      } else {
        await import(${JSON.stringify(publisher)});
        assert.equal(publishes,mode === 'draft' ? 1 : 0);
        if (mode !== 'draft') assert.equal(writes,0);
      }
    `;
    execFileSync('node', ['--input-type=module', '-e', script], {
      cwd: root,
      stdio: 'pipe',
      env: {
        ...process.env,
        GITHUB_REPOSITORY: 'example/only-tdy',
        GITHUB_REF_NAME: 'v0.1.0',
        GITHUB_SHA: 'a'.repeat(40),
        GH_TOKEN: 'synthetic-fixture',
        IMMUTABLE_RELEASES_ENABLED: 'true',
      },
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('Immutable release retries verify every asset without mutation', () =>
  assert.doesNotThrow(() => fixture('published')));
test('Incomplete drafts upload only missing verified bytes before publishing', () =>
  assert.doesNotThrow(() => fixture('draft')));
test('Changed existing assets and wrong tag commits stop before mutation', () => {
  fixture('mismatch');
  fixture('tag-mismatch');
});
