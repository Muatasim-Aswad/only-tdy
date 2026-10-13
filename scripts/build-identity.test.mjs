import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { readBuildIdentity } from './build-identity.ts';
import { output, run } from './lib.mjs';

test('Clean/dirty identity, exact commit checks and normalized reproducible timestamps', () => {
  const root = mkdtempSync(join(tmpdir(), 'only-tdy-identity-'));
  try {
    writeFileSync(join(root, 'package.json'), '{"version":"0.1.0"}\n');
    run('git', ['init', '-q', root]);
    run('git', ['-C', root, 'add', 'package.json']);
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
          ...process.env,
          GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z',
          GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z',
        },
      },
    );
    const sha = output('git', ['-C', root, 'rev-parse', 'HEAD']);
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
