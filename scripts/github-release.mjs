export const repository = process.env.GITHUB_REPOSITORY;
export const tag = process.env.GITHUB_REF_NAME;
if (
  !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || '') ||
  !/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag || '')
)
  throw new Error('Invalid release context');
export async function api(path, options = {}) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/${path}`,
    {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        'X-GitHub-Api-Version': '2026-03-10',
        ...options.headers,
      },
    },
  );
  if (response.status === 404 && options.allowMissing) return null;
  if (!response.ok)
    throw new Error(`GitHub request failed: ${response.status}`);
  return response.json();
}
export const release = () =>
  api(`releases/tags/${tag}`, { allowMissing: true });
export async function exactRemoteTag() {
  let ref = (await api(`git/ref/tags/${tag}`)).object;
  while (ref.type === 'tag') ref = (await api(`git/tags/${ref.sha}`)).object;
  if (ref.type !== 'commit' || ref.sha !== process.env.GITHUB_SHA)
    throw new Error('Remote tag differs from event commit');
}
export async function assetBytes(asset) {
  const response = await fetch(asset.url, {
    headers: {
      Accept: 'application/octet-stream',
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      'X-GitHub-Api-Version': '2026-03-10',
    },
  });
  if (!response.ok)
    throw new Error(`Asset download failed: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}
