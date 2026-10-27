import { t } from '../messages.ts';
import type { Task } from '../contracts.ts';
import { currentDate } from '../domain/task-dates.ts';

export interface DuePage {
  readonly tasks: readonly Task[];
  readonly hasMore: boolean;
}

export async function promoteDueTasks(
  loadPage: (offset: number) => Promise<DuePage>,
  move: (task: Task) => Promise<Task>,
  timezone: string,
  now = new Date(),
): Promise<readonly Task[]> {
  const today = currentDate({ timezone, now });
  const candidates: Task[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let finished = false;
  while (!finished) {
    const page = await loadPage(offset);
    if (page.tasks.length === 0) break;
    for (const task of page.tasks) {
      if (seen.has(task.uid))
        throw new Error(
          t(
            'taskSync.promoteDueTasks.tududiReturnedOverlappingTaskPagesRefresh',
          ),
        );
      seen.add(task.uid);
      if (
        task.dueDate === undefined ||
        task.dueDate === '' ||
        task.dueDate > today
      ) {
        finished = true;
        break;
      }
      if (task.status === 'not_started') candidates.push(task);
    }
    if (!page.hasMore) finished = true;
    offset += page.tasks.length;
  }
  const moved: Task[] = [];
  for (let index = 0; index < candidates.length; index += 4) {
    const outcomes = await Promise.allSettled(
      candidates.slice(index, index + 4).map(move),
    );
    let failure: unknown;
    for (const outcome of outcomes) {
      if (outcome.status === 'fulfilled') moved.push(outcome.value);
      else failure ??= outcome.reason;
    }
    if (failure !== undefined)
      throw failure instanceof Error
        ? failure
        : new Error(t('taskSync.promoteDueTasks.aDueTaskCouldNotBe'));
  }
  return moved;
}
