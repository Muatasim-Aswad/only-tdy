import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  api,
  assetBytes,
  exactRemoteTag,
  release,
  tag,
} from './github-release.mjs';
import { digest, files, json, lines, same } from './lib.mjs';
import { CONTAINER_EXPORT, verifiedContainerExport } from './provenance.mjs';

await exactRemoteTag();
const assets = 'release/out/assets';
const provenance = json(join(assets, 'provenance.json'));
if (
  provenance.tag !== tag ||
  provenance.revision !== process.env.GITHUB_SHA ||
  provenance.version !== json('package.json').version
)
  throw new Error('Publication identity mismatch');
const names = lines('release/release-files.txt').map((p) =>
  p.replace('{tag}', tag),
);
same(files(assets), [...names, CONTAINER_EXPORT], 'Publication');
verifiedContainerExport(assets, provenance);
const checksumLines = lines(join(assets, 'SHA256SUMS'));
same(
  checksumLines.map((line) => line.split('  ')[1]),
  names.filter((name) => name !== 'SHA256SUMS'),
  'Publication checksums',
);
for (const line of checksumLines) {
  const [hash, name] = line.split('  ');
  if (!names.includes(name) || digest(join(assets, name)) !== hash)
    throw new Error('Publication checksum mismatch');
}
// The repository setting is a prerequisite; this script never changes settings.
if (process.env.IMMUTABLE_RELEASES_ENABLED !== 'true')
  throw new Error(
    'Coordinator must verify immutable releases and set the repository variable before publishing',
  );
let current = await release();
if (!current)
  current = await api('releases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tag_name: tag,
      target_commitish: provenance.revision,
      name: tag,
      body: readFileSync('CHANGELOG.md', 'utf8'),
      draft: true,
      prerelease: false,
    }),
  });
let remote = await api(`releases/${current.id}/assets?per_page=100`);
for (const asset of remote) {
  if (!names.includes(asset.name))
    throw new Error('Unexpected existing release asset');
  const hash = createHash('sha256')
    .update(await assetBytes(asset))
    .digest('hex');
  if (hash !== digest(join(assets, asset.name)))
    throw new Error(
      `Existing asset differs: ${asset.name}; retain the tag and recover original verified artifacts`,
    );
}
if (!current.draft) {
  same(
    remote.map((a) => a.name),
    names,
    'Published immutable release',
  );
  if (!current.immutable) throw new Error('Published release is mutable');
  console.log(
    'Existing immutable release and downloaded assets verified; no mutation',
  );
} else {
  for (const name of names.filter((p) => !remote.some((a) => a.name === p))) {
    const url = `${current.upload_url.replace('{?name,label}', '')}?name=${encodeURIComponent(name)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        'Content-Type': 'application/octet-stream',
      },
      body: readFileSync(join(assets, name)),
    });
    if (!response.ok)
      throw new Error(`Draft upload failed: ${response.status}`);
  }
  remote = await api(`releases/${current.id}/assets?per_page=100`);
  same(
    remote.map((a) => a.name),
    names,
    'Complete draft',
  );
  for (const asset of remote)
    if (
      createHash('sha256')
        .update(await assetBytes(asset))
        .digest('hex') !== digest(join(assets, asset.name))
    )
      throw new Error('Downloaded draft bytes differ');
  current = await api(`releases/${current.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draft: false, make_latest: 'true' }),
  });
  if (!current.immutable)
    throw new Error('Published release did not become immutable');
  console.log(
    `Published complete immutable ${tag}; downloaded assets verified`,
  );
}
