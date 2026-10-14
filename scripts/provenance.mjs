import { join } from 'node:path';
import { digest } from './lib.mjs';

export const CONTAINER_EXPORT = 'container.tar.gz';

export function verifiedContainerExport(root, provenance) {
  const hash = provenance.containerExportSha256;
  if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash))
    throw new Error('Invalid CI container export provenance');
  const archive = join(root, CONTAINER_EXPORT);
  if (digest(archive) !== hash)
    throw new Error('CI container export checksum mismatch');
  return archive;
}

export function sourceManifest(root, paths) {
  return paths.map((path) => ({ sha256: digest(join(root, path)), path }));
}

export function readArtifactManifest(records, names) {
  if (!records || typeof records !== 'object' || Array.isArray(records))
    throw new Error('Invalid artifact provenance');
  const entries = Object.entries(records);
  if (
    entries.length !== names.length ||
    entries.some(
      ([path, hash]) =>
        !names.includes(path) ||
        typeof hash !== 'string' ||
        !/^[a-f0-9]{64}$/.test(hash),
    )
  )
    throw new Error('Invalid artifact provenance');
  return entries;
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
