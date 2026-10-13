import type { Project } from '../contracts.ts';

/**
 * How only-tdy turns a project name someone typed into the project it means.
 *
 * One rule, shared by quick entry and by backlog search, because the two are
 * the same field read in two directions and a name that captures into a
 * project must be the same name that finds it again. Matching is exact once
 * case is folded: no prefixes, no fuzziness — Tududi's own project filter is
 * exact, and a guess here would be a guess the server cannot honour.
 */
export type ProjectMatch =
  | { readonly status: 'found'; readonly project: Project }
  | { readonly status: 'unknown' }
  | { readonly status: 'ambiguous' };

export function matchProjectByName(
  projects: readonly Project[],
  name: string,
): ProjectMatch {
  const requested = name.toLocaleLowerCase();
  const matches = projects.filter(
    (project) => project.name.toLocaleLowerCase() === requested,
  );

  const project = matches[0];
  if (project === undefined) return { status: 'unknown' };
  if (matches.length > 1) return { status: 'ambiguous' };
  return { status: 'found', project };
}
