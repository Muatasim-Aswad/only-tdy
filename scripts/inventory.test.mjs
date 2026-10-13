import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { files, same, sourceFiles } from './lib.mjs';

test('Inventories reject additions and symlinks and keep private/generated state outside source', () => {
  const root = mkdtempSync(join(tmpdir(), 'only-tdy-inventory-'));
  try {
    mkdirSync(join(root, 'src'));
    mkdirSync(join(root, 'docs/plans'), { recursive: true });
    mkdirSync(join(root, 'release/out'), { recursive: true });
    writeFileSync(join(root, 'src/main.ts'), 'export {};');
    writeFileSync(
      join(root, 'docs/plans/private.md'),
      'Synthetic private fixture',
    );
    writeFileSync(join(root, 'release/out/output.txt'), 'Generated fixture');
    writeFileSync(join(root, '.env'), 'SYNTHETIC=1');
    assert.deepEqual(sourceFiles(root), ['src/main.ts']);
    writeFileSync(join(root, 'src/added.ts'), 'export {};');
    assert.throws(
      () => same(sourceFiles(root), ['src/main.ts'], 'Source'),
      /added/,
    );
    symlinkSync(join(root, 'src/main.ts'), join(root, 'linked'));
    assert.throws(() => files(root), /Symlink/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
