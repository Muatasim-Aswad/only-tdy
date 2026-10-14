import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { digest } from './lib.mjs';
import { publishContainer } from './publish-container.mjs';
import { CONTAINER_EXPORT } from './provenance.mjs';

function fixture(run) {
  const assets = mkdtempSync(join(tmpdir(), 'only-tdy-registry-test-'));
  const context = {
    assets,
    repository: 'Example/only-tdy',
    tag: 'v0.1.2',
    revision: 'a'.repeat(40),
    version: '0.1.2',
  };
  const config = `sha256:${'b'.repeat(64)}`;
  const remote = new Map();
  const calls = [];
  try {
    for (const kind of ['source', 'static'])
      writeFileSync(join(assets, `only-tdy-v0.1.2-${kind}.tar.gz`), 'fixture');
    writeFileSync(join(assets, CONTAINER_EXPORT), 'synthetic CI export');
    writeFileSync(
      join(assets, 'provenance.json'),
      JSON.stringify({
        version: context.version,
        tag: context.tag,
        revision: context.revision,
        image: `only-tdy:${context.tag}-${context.revision}`,
        containerExportSha256: digest(join(assets, CONTAINER_EXPORT)),
      }),
    );
    const names = [
      'only-tdy-v0.1.2-source.tar.gz',
      'only-tdy-v0.1.2-static.tar.gz',
      'provenance.json',
    ];
    writeFileSync(
      join(assets, 'SHA256SUMS'),
      names.map((name) => `${digest(join(assets, name))}  ${name}\n`).join(''),
    );
    const execute = (args) => {
      calls.push(args);
      if (args[0] === 'manifest') {
        const previous = remote.get(args[2]);
        return previous
          ? {
              status: 0,
              stdout: JSON.stringify({ config: { digest: previous } }),
              stderr: '',
            }
          : { status: 1, stdout: '', stderr: 'no such manifest' };
      }
      if (args[0] === 'image') return { status: 0, stdout: config, stderr: '' };
      if (args[0] === 'push') remote.set(args[1], config);
      return { status: 0, stdout: '', stderr: '' };
    };
    run({ context, config, remote, calls, execute });
  } finally {
    rmSync(assets, { recursive: true, force: true });
  }
}

test('Publishes the verified archive under version and full-commit tags; retries do not push', () => {
  fixture(({ context, remote, calls, execute }) => {
    const targets = publishContainer(context, execute);
    assert.equal(remote.size, 2);
    assert.equal(targets[0], 'ghcr.io/example/only-tdy:v0.1.2');
    calls.length = 0;
    publishContainer(context, execute);
    assert.ok(!calls.some(([command]) => command === 'push'));
  });
});

test('Changed existing images and registry errors refuse publication before pushing', () => {
  fixture(({ context, remote, calls, execute }) => {
    remote.set('ghcr.io/example/only-tdy:v0.1.2', `sha256:${'c'.repeat(64)}`);
    assert.throws(
      () => publishContainer(context, execute),
      /Refusing to replace/,
    );
    assert.ok(!calls.some(([command]) => command === 'push'));
    assert.throws(
      () =>
        publishContainer(context, (args) =>
          args[0] === 'manifest'
            ? { status: 1, stdout: '', stderr: 'access denied' }
            : execute(args),
        ),
      /Registry inspection failed/,
    );
  });
});

test('Corrupt assets and wrong provenance refuse all Docker commands', () => {
  fixture(({ context, calls, execute }) => {
    writeFileSync(
      join(context.assets, 'only-tdy-v0.1.2-static.tar.gz'),
      'changed',
    );
    assert.throws(
      () => publishContainer(context, execute),
      /checksum mismatch/,
    );
    assert.equal(calls.length, 0);
    assert.throws(
      () => publishContainer({ ...context, revision: 'd'.repeat(40) }, execute),
      /identity mismatch/,
    );
    assert.equal(calls.length, 0);
  });
});

test('A changed internal image export refuses all Docker commands despite valid public checksums', () => {
  fixture(({ context, calls, execute }) => {
    writeFileSync(join(context.assets, CONTAINER_EXPORT), 'changed image');
    assert.throws(
      () => publishContainer(context, execute),
      /CI container export checksum mismatch/,
    );
    assert.equal(calls.length, 0);
  });
});
