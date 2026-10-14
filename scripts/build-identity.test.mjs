import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { identityEnv, readBuildIdentity } from './build-identity.ts';
import { output, run } from './lib.mjs';

const gitEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
);

test('Docker source builds accept the three srvr metadata inputs', () => {
  const root = mkdtempSync(join(tmpdir(), 'only-tdy-source-stamp-'));
  try {
    writeFileSync(join(root, 'package.json'), '{"version":"0.1.2"}\n');
    const env = {
      APP_REVISION: 'a'.repeat(40),
      APP_COMMIT_TIME: '2026-01-01T00:00:00Z',
      APP_BUILD_TIME: '2026-01-02T00:00:00Z',
    };
    for (const SOURCE_DATE_EPOCH of [undefined, '0']) {
      const identity = readBuildIdentity(root, { ...env, SOURCE_DATE_EPOCH });
      assert.deepEqual(identity, {
        version: '0.1.2',
        revision: env.APP_REVISION,
        committedAt: env.APP_COMMIT_TIME,
        builtAt: env.APP_BUILD_TIME,
      });
      assert.deepEqual(
        readBuildIdentity(root, identityEnv(identity)),
        identity,
      );
    }
    assert.throws(
      () =>
        readBuildIdentity(root, { ...env, SOURCE_DATE_EPOCH: '1767225600' }),
      /must equal/,
    );
    assert.throws(
      () => readBuildIdentity(root, { ...env, APP_COMMIT_TIME: '' }),
      /Complete identity/,
    );
    assert.throws(
      () =>
        readBuildIdentity(root, {
          ...env,
          APP_BUILD_TIME: '2026-02-30T00:00:00Z',
        }),
      /Invalid calendar/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Clean/dirty identity, exact commit checks and normalized reproducible timestamps', () => {
  const root = mkdtempSync(join(tmpdir(), 'only-tdy-identity-'));
  try {
    writeFileSync(join(root, 'package.json'), '{"version":"0.1.0"}\n');
    run('git', ['init', '-q', root], { env: gitEnv });
    run('git', ['-C', root, 'add', 'package.json'], { env: gitEnv });
    run(
      'git',
      [
        '-C',
        root,
        '-c',
        'user.name=Synthetic Test',
        '-c',
        'user.email=test@example.invalid',
        'commit',
        '-qm',
        'Synthetic identity fixture',
      ],
      {
        env: {
          ...gitEnv,
          GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z',
          GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z',
        },
      },
    );
    const sha = output('git', ['-C', root, 'rev-parse', 'HEAD'], {
      env: gitEnv,
    });
    assert.deepEqual(readBuildIdentity(root, {}), {
      version: '0.1.0',
      revision: sha,
      committedAt: '2026-01-01T00:00:00Z',
      builtAt: '2026-01-01T00:00:00Z',
    });
    assert.throws(
      () => readBuildIdentity(root, { APP_REVISION: 'a'.repeat(40) }),
      /differs/,
    );
    assert.throws(
      () => readBuildIdentity(root, { SOURCE_DATE_EPOCH: '-1' }),
      /Invalid/,
    );
    assert.throws(
      () => readBuildIdentity(root, { APP_BUILD_TIME: '2027-01-01T00:00:00Z' }),
      /must equal/,
    );
    assert.throws(
      () =>
        readBuildIdentity(root, {
          SOURCE_DATE_EPOCH: '1798761600',
          APP_COMMIT_TIME: '2027-01-01T00:00:00Z',
          APP_BUILD_TIME: '2027-01-01T00:00:00Z',
        }),
      /checked-out commit timestamp/,
    );
    writeFileSync(join(root, 'extra.txt'), 'Untracked synthetic source');
    assert.equal(
      readBuildIdentity(root, { APP_REVISION: sha }).revision,
      'dev',
    );
    assert.equal(readBuildIdentity(root, {}).committedAt, null);
    writeFileSync(join(root, 'package.json'), '{"version":"bad"}');
    assert.throws(() => readBuildIdentity(root, {}), /version/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
