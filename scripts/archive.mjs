import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { run } from './lib.mjs';

export function writeArchive(folder, destination, epoch, list) {
  if (!/^\d+$/.test(String(epoch))) throw new Error('Invalid archive epoch');
  const temp = mkdtempSync(join(tmpdir(), 'only-tdy-archive-'));
  try {
    const tar = join(temp, 'pack.tar');
    const args = [
      '--sort=name',
      '--format=gnu',
      '--mtime',
      `@${epoch}`,
      '--owner=0',
      '--group=0',
      '--numeric-owner',
      '--mode=go-w,a+rX,u+rw',
      '-cf',
      tar,
      '-C',
      folder,
    ];
    if (list) {
      writeFileSync(
        join(temp, 'members.txt'),
        [...list].sort().join('\n') + '\n',
      );
      args.push('--verbatim-files-from', '-T', join(temp, 'members.txt'));
    } else args.push('.');
    run('tar', args);
    writeFileSync(destination, gzipSync(readFileSync(tar), { level: 9 }));
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
