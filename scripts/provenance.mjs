import { join } from 'node:path';
import { digest } from './lib.mjs';

export function sourceManifest(root, paths) {
  return paths.map((path) => ({ sha256: digest(join(root, path)), path }));
}

export function readSourceManifest(records) {
  if (!Array.isArray(records)) throw new Error('Invalid source provenance');
  const result = Object.create(null);
  for (const record of records) {
    if (
      !record ||
      typeof record !== 'object' ||
      Object.keys(record).sort().join(',') !== 'path,sha256' ||
      typeof record.path !== 'string' ||
      record.path.startsWith('/') ||
      record.path.split('/').includes('..') ||
      typeof record.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(record.sha256) ||
      Object.hasOwn(result, record.path)
    )
      throw new Error('Invalid source provenance record');
    result[record.path] = record.sha256;
  }
  return result;
}
