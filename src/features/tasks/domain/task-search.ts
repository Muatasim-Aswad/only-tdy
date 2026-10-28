import { tokenDigits } from './token-language.ts';
import { t } from '../messages.ts';
/**
 * What a search field means, and what Tududi can be asked for it.
 *
 * Both searchable pages — the backlog and the record — use one grammar,
 * because both ask the same three questions of the same endpoints and only
 * differ in which tasks they keep. The field is the capture field read
 * backwards, so it is read with the same marks: `#` names a tag, `+` names a
 * project, and anything else is words to look for. That is not decoration —
 * it is the only honest grammar available, because Tududi answers exactly
 * four questions about a list of tasks and each mark picks one of them:
 *
 * | Typed      | Asked                                            |
 * | ---------- | ------------------------------------------------ |
 * | `#finance` | `GET /api/tasks?tag=finance` — exact tag name    |
 * | `+Work`    | `GET /api/tasks?project_uid=…` — one project     |
 * | `!2`       | `GET /api/tasks?priority=medium` — one priority  |
 * | `bulb`     | `GET /api/search?q=bulb` — title or note text    |
 *
 * One term at a time, and no combining: there is no endpoint that takes two of
 * these together, and intersecting two capped pages in the browser would
 * quietly answer a different question than the one that was asked.
 *
 * Unlike quick entry the rest of the line is taken whole rather than split on
 * spaces, because a tag and a project may both contain one and searching for
 * the first word of a name is not what was asked.
 */

import type { Project, SearchRequest, SearchTerm, Task } from '../contracts.ts';

import { matchProjectByName } from './project-lookup.ts';
import { PRIORITY_VALUES } from './quick-entry.ts';

/** Reads the field. Whitespace either side is never part of what was meant. */
export function parseSearch(input: string): SearchTerm {
  const trimmed = input.trim();
  if (trimmed === '') return { kind: 'none' };

  if (trimmed.startsWith('#')) {
    const name = trimmed.slice(1).trim();
    return name === '' ? { kind: 'none' } : { kind: 'tag', name };
  }

  if (trimmed.startsWith('+')) {
    const name = trimmed.slice(1).trim();
    return name === '' ? { kind: 'none' } : { kind: 'project', name };
  }

  if (trimmed.startsWith('!')) {
    const value = trimmed.slice(1).trim();
    return value === ''
      ? { kind: 'none' }
      : { kind: 'priority', value: tokenDigits(value) };
  }

  return { kind: 'text', query: trimmed };
}

/**
 * The term with everything a request needs, or the reason there is no request.
 *
 * A project is the only term that needs anything resolved, and it is resolved
 * here rather than sent as typed: Tududi drops a `project_uid` it does not
 * recognise and answers with the whole list, which would read as "everything
 * matches" for a name that matches nothing. `projectsLoaded` separates a name
 * that is genuinely unknown from one that has not been looked up yet.
 */
export function resolveSearch(
  term: SearchTerm,
  projects: readonly Project[],
  projectsLoaded: boolean,
): SearchRequest {
  if (term.kind === 'priority') {
    if (!Object.hasOwn(PRIORITY_VALUES, term.value)) {
      return {
        kind: 'refused',
        message: t('taskSearch.resolveSearch.message'),
      };
    }
    return {
      kind: 'priority',
      priority: PRIORITY_VALUES[term.value as keyof typeof PRIORITY_VALUES],
    };
  }

  if (term.kind !== 'project') return term;

  if (!projectsLoaded) return { kind: 'pending' };

  const match = matchProjectByName(projects, term.name);
  if (match.status === 'unknown') {
    return {
      kind: 'refused',
      message: t('search.unknownProject', { name: term.name }),
    };
  }
  if (match.status === 'ambiguous') {
    return {
      kind: 'refused',
      message: t('search.ambiguousProject', { name: term.name }),
    };
  }
  return { kind: 'project', projectUid: match.project.uid };
}

/**
 * The cache key for a request, which is also the only place the difference
 * between a tag and a project and a phrase has to be spelled out once. Which
 * list was searched is not in it: that is a separate segment of the query key,
 * so a write can reach every search of one list without parsing this string.
 */
export function searchRequestKey(request: SearchRequest): string {
  switch (request.kind) {
    case 'tag':
      return `tag:${request.name}`;
    case 'project':
      return `project:${request.projectUid}`;
    case 'priority':
      return `priority:${request.priority}`;
    case 'text':
      return `text:${request.query}`;
    case 'none':
    case 'pending':
    case 'refused':
      return '';
  }
}

/**
 * Whether a task already on screen answers a term, judged in the browser.
 *
 * This is the field's answer while it is still being typed: the list on
 * screen narrows with each character, and the return key is what asks Tududi
 * the real question. So it only has to be a good guess about rows it already
 * holds — names and titles are matched by what they contain rather than
 * exactly, because half a word is what a field holds while it is typed, and a
 * note is not matched at all, since a row does not carry one.
 */
export function matchesTask(task: Task, term: SearchTerm): boolean {
  switch (term.kind) {
    case 'none':
      return true;
    case 'tag': {
      const needle = term.name.toLocaleLowerCase();
      return task.tags.some((tag) => tag.toLocaleLowerCase().includes(needle));
    }
    case 'project':
      return (task.projectName ?? '')
        .toLocaleLowerCase()
        .includes(term.name.toLocaleLowerCase());
    case 'priority':
      /* `!` followed by anything but a digit it knows narrows nothing yet —
         the field is still on its way to a priority. */
      return Object.hasOwn(PRIORITY_VALUES, term.value)
        ? task.priority ===
            PRIORITY_VALUES[term.value as keyof typeof PRIORITY_VALUES]
        : true;
    case 'text':
      return `${task.title} ${task.note ?? ''}`
        .toLocaleLowerCase()
        .includes(term.query.toLocaleLowerCase());
  }
}

/** True when two terms ask the same question. */
export function sameSearchTerm(left: SearchTerm, right: SearchTerm): boolean {
  switch (left.kind) {
    case 'none':
      return right.kind === 'none';
    case 'tag':
      return right.kind === 'tag' && right.name === left.name;
    case 'project':
      return right.kind === 'project' && right.name === left.name;
    case 'priority':
      return right.kind === 'priority' && right.value === left.value;
    case 'text':
      return right.kind === 'text' && right.query === left.query;
  }
}
