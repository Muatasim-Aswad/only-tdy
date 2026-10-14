import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  readArtifactManifest,
  readSourceManifest,
  sourceManifest,
} from './provenance.mjs';

test('artifact provenance rejects extra or traversing paths before file access', () => {
  const name = 'only-tdy-v0.1.0-source.tar.gz';
  const hash = 'a'.repeat(64);
  assert.deepEqual(readArtifactManifest({ [name]: hash }, [name]), [
    [name, hash],
  ]);
  for (const records of [
    null,
    [],
    {},
    { [name]: 'bad-hash' },
    { [name]: hash, '../outside': hash },
    { '../outside': hash },
    { '/outside': hash },
  ])
    assert.throws(() => readArtifactManifest(records, [name]));
});

test('source provenance rejects ambiguous paths, duplicate records and invalid hashes', () => {
  const record = { path: 'README.md', sha256: 'a'.repeat(64) };
  assert.deepEqual(Object.entries(readSourceManifest([record])), [
    ['README.md', record.sha256],
  ]);
  assert.throws(() => readSourceManifest([record, record]));
  assert.throws(() =>
    readSourceManifest([{ ...record, path: '../README.md' }]),
  );
  assert.throws(() => readSourceManifest([{ ...record, sha256: 'invalid' }]));
  assert.throws(() =>
    readSourceManifest([{ ...record, secret: 'unexpected' }]),
  );
});

test('generated file provenance passes scanning while credential-shaped values fail', () => {
  const temp = mkdtempSync(join(tmpdir(), 'only-tdy-provenance-'));
  try {
    const source = join(temp, 'source');
    const assets = join(temp, 'assets');
    mkdirSync(source);
    mkdirSync(assets);
    const name = 'api-contract.ts';
    writeFileSync(
      join(source, name),
      'export type Task = { title: string };\n',
    );
    writeFileSync(
      join(assets, 'provenance.json'),
      JSON.stringify({ source: sourceManifest(source, [name]) }, null, 2),
    );
    const scan = () =>
      execFileSync('gitleaks', ['dir', assets, '--redact=100', '--no-banner'], {
        stdio: 'pipe',
      });
    assert.doesNotThrow(scan);
    writeFileSync(
      join(assets, 'credential.json'),
      JSON.stringify({
        [['api', 'key'].join('_')]: randomBytes(32).toString('hex'),
      }),
    );
    assert.throws(scan, (error) => error.status === 1);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
