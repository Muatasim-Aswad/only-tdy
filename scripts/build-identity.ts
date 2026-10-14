import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface BuildIdentity {
  version: string;
  revision: string;
  committedAt: string | null;
  builtAt: string;
}

function git(root: string, ...args: string[]): string | null {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();
  } catch {
    return null;
  }
}

export function readBuildIdentity(
  root: string,
  env: NodeJS.ProcessEnv = process.env,
): BuildIdentity {
  const { version } = JSON.parse(
    readFileSync(resolve(root, 'package.json'), 'utf8'),
  ) as { version: string };
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version))
    throw new Error('Invalid package version');
  const head = git(root, 'rev-parse', 'HEAD');
  const dirty =
    head !== null &&
    git(root, 'status', '--porcelain', '--untracked-files=all') !== '';
  const optional = (value: string | undefined): string | null =>
    value === undefined || value === '' ? null : value;
  const requested = optional(env.APP_REVISION) ?? head ?? 'dev';
  if (requested !== 'dev' && !/^[a-f0-9]{40}$/.test(requested))
    throw new Error('Invalid APP_REVISION');
  if (head && !dirty && requested !== 'dev' && requested !== head)
    throw new Error('Revision differs from checked-out commit');
  if (
    head === null &&
    requested !== 'dev' &&
    (!optional(env.APP_COMMIT_TIME) ||
      !optional(env.APP_BUILD_TIME) ||
      !optional(env.SOURCE_DATE_EPOCH))
  )
    throw new Error('Complete identity inputs are required without Git');
  const epoch =
    optional(env.SOURCE_DATE_EPOCH) ??
    git(root, 'show', '-s', '--format=%ct', 'HEAD') ??
    '0';
  if (!/^\d+$/.test(epoch) || !Number.isSafeInteger(Number(epoch)))
    throw new Error('Invalid SOURCE_DATE_EPOCH');
  if (
    head !== null &&
    !dirty &&
    requested !== 'dev' &&
    epoch !== git(root, 'show', '-s', '--format=%ct', 'HEAD')
  )
    throw new Error(
      'SOURCE_DATE_EPOCH differs from the checked-out commit timestamp',
    );
  const stamp = new Date(Number(epoch) * 1000)
    .toISOString()
    .replace('.000Z', 'Z');
  const normalize = (value: string): string => {
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:Z|[+-]\d\d:\d\d)$/.test(value))
      throw new Error('Invalid identity timestamp');
    if (
      !new Date(value.slice(0, 19) + 'Z')
        .toISOString()
        .startsWith(value.slice(0, 19))
    )
      throw new Error('Invalid calendar timestamp');
    return new Date(value).toISOString().replace('.000Z', 'Z');
  };
  if (env.APP_BUILD_TIME && normalize(env.APP_BUILD_TIME) !== stamp)
    throw new Error('APP_BUILD_TIME must equal SOURCE_DATE_EPOCH');
  const revision = dirty ? 'dev' : requested;
  const committedAt =
    revision === 'dev'
      ? null
      : normalize(
          optional(env.APP_COMMIT_TIME) ??
            git(root, 'show', '-s', '--format=%cI', 'HEAD') ??
            stamp,
        );
  if (committedAt !== null && committedAt !== stamp)
    throw new Error('Commit time must equal SOURCE_DATE_EPOCH');
  return { version, revision, committedAt, builtAt: stamp };
}

export function identityEnv(identity: BuildIdentity): NodeJS.ProcessEnv {
  return {
    APP_REVISION: identity.revision,
    APP_COMMIT_TIME: identity.committedAt ?? '',
    APP_BUILD_TIME: identity.builtAt,
    SOURCE_DATE_EPOCH: String(Date.parse(identity.builtAt) / 1000),
  };
}
