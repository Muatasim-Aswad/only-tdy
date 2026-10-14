import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lines, output, run, same } from './lib.mjs';
const temp = mkdtempSync(join(tmpdir(), 'only-tdy-runtime-'));
try {
  const archive = join(temp, 'rootfs.tar');
  run('docker', ['export', '-o', archive, process.argv[2]]);
  const list = output('tar', ['-tf', archive])
    .split('\n')
    .filter(
      (p) =>
        !p.endsWith('/') &&
        !p.startsWith('tmp/') &&
        ![
          '.dockerenv',
          'etc/hostname',
          'etc/hosts',
          'etc/resolv.conf',
        ].includes(p),
    )
    .map((p) =>
      p.replace(/-[A-Za-z0-9_-]{8}(?=\.(?:js|css|woff2)$)/g, '-{hash}'),
    );
  same(
    list,
    lines(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../release/runtime-files.txt',
      ),
    ),
    'Runtime filesystem',
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
