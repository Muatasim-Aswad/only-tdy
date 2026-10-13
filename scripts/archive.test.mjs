import assert from 'node:assert/strict';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { writeArchive } from './archive.mjs';
import { digest, output } from './lib.mjs';

test('Archives ignore file order, wall-clock times and non-executable write-mode differences', () => {
  const root = mkdtempSync(join(tmpdir(), 'only-tdy-archive-test-'));
  try {
    const source = join(root, 'source');
    mkdirSync(source);
    writeFileSync(join(source, 'a.txt'), 'Synthetic a');
    writeFileSync(join(source, 'b.txt'), 'Synthetic b');
    writeArchive(source, join(root, 'first.tar.gz'), 1767225600, [
      'a.txt',
      'b.txt',
    ]);
    utimesSync(join(source, 'a.txt'), 1234567890, 1234567890);
    chmodSync(join(source, 'a.txt'), 0o600);
    writeArchive(source, join(root, 'second.tar.gz'), 1767225600, [
      'b.txt',
      'a.txt',
    ]);
    assert.equal(
      digest(join(root, 'first.tar.gz')),
      digest(join(root, 'second.tar.gz')),
    );
    assert.equal(
      output('tar', ['-tzf', join(root, 'first.tar.gz')]),
      'a.txt\nb.txt',
    );
    assert.throws(
      () => writeArchive(source, join(root, 'bad.tar.gz'), -1),
      /epoch/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
