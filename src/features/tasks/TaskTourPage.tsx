import { t as taskCopy } from './messages.ts';
import { useState } from 'react';
import { routePath } from '../../config/routes.ts';
import { handleLinkNavigation, navigate } from '../../infra/navigation.ts';
import type { TaskDetail, TaskEdit } from './contracts.ts';
import { TaskDetailScreen } from './components/TaskDetailScreen.tsx';
import { t } from './guidance/messages-guidance.ts';

/** The ordinary editor with a temporary task; no task transport is involved. */
export function TaskTourPage() {
  const [task, setTask] = useState<TaskDetail>(() => ({
    uid: 'only-tdy-tour-example',
    title: t('exampleTitle'),
    note: t('exampleNote'),
    status: 'planned',
    priority: 'low',
    tags: [],
    dueDate: '',
    deferUntil: '',
    projectUid: '',
  }));
  const back = routePath({ kind: 'guide' });
  const save = (edit: TaskEdit): Promise<TaskDetail> => {
    const updated: TaskDetail = {
      uid: task.uid,
      title: edit.title,
      note: edit.note,
      status: edit.status,
      priority: edit.priority,
      tags: edit.tags,
      dueDate: edit.dueDate,
      deferUntil: edit.deferUntil,
      projectUid: edit.projectUid,
      ...(edit.newProjectName ? { projectName: edit.newProjectName } : {}),
      ...(edit.recurrence ? { recurrence: edit.recurrence } : {}),
    };
    setTask(updated);
    return Promise.resolve(updated);
  };
  return (
    <TaskDetailScreen
      preview
      state={{ kind: 'ready', task }}
      projects={[]}
      tags={[]}
      backHref={back}
      backLabel={taskCopy('settingsPage.backLabel')}
      onBack={(event) => {
        handleLinkNavigation(event, back);
      }}
      onSave={save}
      onDelete={() => {
        navigate(back);
      }}
      onRetry={() => undefined}
      feedback={{ kind: 'none' }}
    />
  );
}
