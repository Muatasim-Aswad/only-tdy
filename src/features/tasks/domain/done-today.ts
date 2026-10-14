import type { Task } from '../contracts.ts';

import { sortOpenTasks } from './task-order.ts';

/**
 * The day's record, joined to whichever list is open.
 *
 * Tududi's list endpoints answer with open tasks only, so a ticked row used to
 * survive exactly as long as the cache that held it: on screen until the next
 * load, gone after it. What the person actually did that day is not something
 * the screen should forget on a refresh, so the completed list is asked for
 * alongside the open one and the day's rows are joined onto the end of it.
 *
 * The cut is the local calendar day rather than a rolling window. A row ticked
 * at eleven last night has no business sitting under today's heading at ten
 * this morning, and a boundary that moves with the clock means a row can leave
 * the screen at any minute rather than when the date turns.
 */

/** Midnight this morning, by the clock the person is reading. */
export function startOfDay(now: Date): number {
  const start = new Date(now.getTime());
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

/** When a task was finished, or nothing if Tududi did not say. */
function completionTime(task: Task): number | undefined {
  if (task.completedAt === undefined) return undefined;
  const at = Date.parse(task.completedAt);
  return Number.isNaN(at) ? undefined : at;
}

/**
 * Where a done task sits among the others. One with no time of its own sorts
 * last, because the only way a row gets here without one is a tick a moment
 * ago whose answer did not carry the time — and a moment ago is the most
 * recent thing on the list.
 */
function completionOrder(task: Task): number {
  return completionTime(task) ?? Number.POSITIVE_INFINITY;
}

/**
 * Tasks from the completed list that were finished today.
 *
 * A row here has to say when it was finished to be kept. The record reaches
 * back as far as the page limit allows, so a task with no time on it is one
 * of unknown age rather than a recent one, and treating it as today's would
 * put a task finished last spring under this morning's.
 */
export function completedToday(
  tasks: readonly Task[],
  now: Date = new Date(),
): readonly Task[] {
  const since = startOfDay(now);
  return tasks.filter((task) => {
    if (task.status !== 'done') return false;
    const at = completionTime(task);
    return at !== undefined && at >= since;
  });
}

/**
 * One list: what is still open, in reading order (`sortOpenTasks`), then what
 * was finished today, oldest tick first.
 *
 * Oldest first is what puts a row just ticked at the very bottom, under
 * everything ticked before it — the same place the optimistic tick already
 * sank it to, so the row does not move when the real answer arrives.
 *
 * A task can reach this from both sides at once: the open list still holds the
 * row only-tdy ticked a moment ago, and the completed list now reports the same
 * task as done. The listed copy wins and the other is dropped, which is the
 * whole of the deduplication — without it every tick would show twice until
 * the next load.
 *
 * Done rows already in `listed` are kept whatever their time says. The only
 * way one gets there is a tick in this session, and a tick at one minute to
 * midnight must not take its own row off the screen a minute later. It is
 * also how a row survives the handover from Today to the backlog: ticking the
 * last thing on Today hands the screen to the backlog, and the row just ticked
 * is passed in as listed so the two lists trade it rather than drop it.
 */
export function withCompletedToday(
  listed: readonly Task[],
  completed: readonly Task[],
  now: Date = new Date(),
): readonly Task[] {
  const open: Task[] = [];
  const done: Task[] = [];
  const seen = new Set<string>();

  for (const task of listed) {
    if (seen.has(task.uid)) continue;
    seen.add(task.uid);
    (task.status === 'done' ? done : open).push(task);
  }

  for (const task of completedToday(completed, now)) {
    if (seen.has(task.uid)) continue;
    seen.add(task.uid);
    done.push(task);
  }

  const sortedOpen = sortOpenTasks(open);
  if (
    done.length === 0 &&
    open.length === listed.length &&
    sortedOpen === open
  ) {
    return listed;
  }
  done.sort((left, right) => completionOrder(left) - completionOrder(right));
  return [...sortedOpen, ...done];
}
