import { render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Project, TaskDetail, TaskEdit } from '../contracts.ts';

import { TaskEditor, type TaskEditorProps } from './TaskEditor.tsx';
import { currentDate, displayDate, resolveDate } from '../domain/task-dates.ts';

const TASK: TaskDetail = {
  uid: 'task-invoice',
  title: 'Send the invoice',
  priority: 'high',
  status: 'planned',
  projectName: 'Work',
  projectUid: 'project-work',
  tags: ['finance', 'q4'],
  note: 'Attach the timesheet.',
  dueDate: '2026-10-01',
  deferUntil: '',
};

const PROJECTS: readonly Project[] = [
  { uid: 'project-work', name: 'Work' },
  { uid: 'project-home', name: 'Home' },
];

/* The page draws Save at its head and submits the form by id; this stands in
   for that head, so the editor is tested the way it is actually used. */
function Harness(props: TaskEditorProps) {
  const [dirty, setDirty] = useState(false);
  return (
    <>
      {dirty ? (
        <button type="submit" form="task-form">
          Save
        </button>
      ) : null}
      <TaskEditor {...props} formId="task-form" onDirtyChange={setDirty} />
    </>
  );
}

function renderEditor(props: Partial<TaskEditorProps> = {}) {
  const onSave = vi.fn<(edit: TaskEdit) => Promise<TaskDetail | undefined>>(
    (edit) => {
      const { recurrence, ...fields } = edit;
      return Promise.resolve({
        ...TASK,
        ...fields,
        ...(recurrence ? { recurrence } : {}),
      });
    },
  );
  render(
    <Harness
      task={TASK}
      projects={PROJECTS}
      onSave={onSave}
      feedback={{ kind: 'none' }}
      {...props}
    />,
  );
  return { onSave };
}

const title = () => screen.getByRole('combobox', { name: 'Title' });
/** Absent until something is unsaved, which is the point of it. */
const save = () => screen.queryByRole('button', { name: 'Save' });
const clickSave = () => screen.getByRole('button', { name: 'Save' });

describe('TaskEditor', () => {
  it('preserves editing and compact mode when the browser denies storage', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    const user = userEvent.setup();
    const { onSave } = renderEditor({ task: { ...TASK, dueDate: '' } });
    await user.clear(title());
    await user.type(title(), 'Keep this draft');
    await user.click(screen.getByRole('button', { name: 'Compact form' }));
    expect(title()).toHaveValue('Keep this draft');
    expect(
      screen.getByRole('button', { name: 'Compact form' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await user.click(clickSave());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Keep this draft' }),
    );
  });

  it('uses a date-only Hide until field and retains its draft across status changes', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({
      task: {
        ...TASK,
        status: 'not_started',
        dueDate: '9999-12-31',
        deferUntil: '9999-12-01',
      },
    });
    expect(screen.getByLabelText('Hide until')).toHaveAttribute('type', 'date');
    await user.selectOptions(screen.getByLabelText('Status'), 'planned');
    expect(screen.queryByLabelText('Hide until')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Status'), 'not_started');
    expect(screen.getByLabelText('Hide until')).toHaveValue('9999-12-01');
    await user.selectOptions(screen.getByLabelText('Status'), 'planned');
    await user.click(clickSave());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'planned', deferUntil: '' }),
    );
  });

  it('applies title grammar while preserving unspecified fields', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({
      task: { ...TASK, status: 'not_started', dueDate: '' },
    });
    await user.clear(title());
    await user.type(title(), 'Book trip /due:+7 /hide:+3 +Home #travel !1');
    await user.click(clickSave());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Book trip',
        status: 'not_started',
        priority: 'low',
        projectUid: 'project-home',
        dueDate: resolveDate('+7'),
        deferUntil: resolveDate('+3'),
        tags: ['finance', 'q4', 'travel'],
        note: TASK.note,
      }),
    );
  });

  it('completes relative dates with Tab, but Enter resolves and submits', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({
      task: { ...TASK, status: 'not_started', dueDate: '' },
    });
    await user.clear(title());
    await user.type(title(), 'Task /due:+3');
    expect(
      within(
        screen.getByRole('listbox', { name: 'Title suggestions' }),
      ).getByRole('option'),
    ).toHaveTextContent(displayDate(resolveDate('+3') ?? ''));
    await user.tab();
    expect(title()).toHaveValue(
      `Task /due:${displayDate(resolveDate('+3') ?? '')} `,
    );
    await user.clear(title());
    await user.type(title(), 'Task /due:today{Enter}');
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Task',
        dueDate: currentDate(),
        status: 'planned',
        deferUntil: '',
      }),
    );
  });

  it('moves Today to Backlog with a changed future date and keeps completed tasks completed', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor();
    await user.clear(title());
    await user.type(title(), 'Task /due:+7');
    await user.click(clickSave());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'not_started' }),
    );
    await user.selectOptions(screen.getByLabelText('Status'), 'done');
    await user.click(clickSave());
    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'done' }),
    );
  });

  it('opens every editable field filled in from the task', () => {
    renderEditor();

    expect(title()).toHaveValue('Send the invoice');
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue(
      'Attach the timesheet.',
    );
    expect(screen.getByLabelText('Status')).toHaveValue('planned');
    expect(screen.getByLabelText('Priority')).toHaveValue('high');
    expect(screen.getByLabelText('Project')).toHaveValue('project-work');
    expect(screen.getByLabelText('Due date')).toHaveValue('2026-10-01');
    expect(screen.queryByLabelText('Hide until')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Tags')).toHaveValue('finance, q4');
  });

  it('offers the two lists and Done, and nothing else', () => {
    renderEditor();

    const options = [
      ...screen.getByLabelText<HTMLSelectElement>('Status').options,
    ].map((option) => [option.value, option.text]);

    expect(options).toEqual([
      ['planned', 'Today'],
      ['not_started', 'Backlog'],
      ['done', 'Done'],
    ]);
  });

  it('offers no status only-tdy has no name for', () => {
    renderEditor();

    const values = [
      ...screen.getByLabelText<HTMLSelectElement>('Status').options,
    ].map((option) => option.value);

    expect(values).not.toContain('archived');
    expect(values).not.toContain('cancelled');
  });

  it('keeps a status set in Tududi rather than showing one that is not set', () => {
    renderEditor({ task: { ...TASK, status: 'waiting' } });

    const status = screen.getByLabelText<HTMLSelectElement>('Status');

    expect(status).toHaveValue('waiting');
    expect([...status.options].map((option) => option.text)).toEqual([
      'Waiting',
      'Today',
      'Backlog',
      'Done',
    ]);
  });

  it('stops offering that status once it has been changed away from', async () => {
    const user = userEvent.setup();
    renderEditor({ task: { ...TASK, status: 'waiting' } });

    const status = screen.getByLabelText<HTMLSelectElement>('Status');
    await user.selectOptions(status, 'planned');

    expect([...status.options].map((option) => option.value)).toEqual([
      'planned',
      'not_started',
      'done',
    ]);
  });

  it('keeps Save off the page until something has actually changed', async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(save()).toBeNull();

    await user.type(title(), '!');
    expect(save()).toBeInTheDocument();
  });

  it('does not call a trailing space or a respaced tag list a change', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(title(), ' ');
    expect(save()).toBeNull();

    await user.clear(screen.getByLabelText('Tags'));
    await user.type(screen.getByLabelText('Tags'), 'finance,q4');
    expect(save()).toBeNull();
  });

  it('sends every field, with the tags split out of what was typed', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor();

    await user.clear(screen.getByLabelText('Tags'));
    await user.type(screen.getByLabelText('Tags'), '#finance, next quarter');
    await user.selectOptions(screen.getByLabelText('Status'), 'planned');
    await user.click(clickSave());

    expect(onSave).toHaveBeenCalledExactlyOnceWith({
      title: 'Send the invoice',
      note: 'Attach the timesheet.',
      status: 'planned',
      priority: 'high',
      projectUid: 'project-work',
      dueDate: '2026-10-01',
      deferUntil: '',
      tags: ['finance', 'next quarter'],
    });
  });

  it('clears the project and the dates by emptying them', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor();

    await user.selectOptions(screen.getByLabelText('Project'), '');
    await user.clear(screen.getByLabelText('Due date'));
    await user.click(clickSave());

    expect(onSave.mock.calls[0]?.[0]).toMatchObject({
      projectUid: '',
      dueDate: '',
    });
  });

  it('saves from the keyboard, and Enter in the title does not open a line', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor();

    await user.clear(title());
    await user.type(title(), 'Send the invoice today{Enter}');

    expect(onSave).toHaveBeenCalledOnce();
    expect(title()).toHaveValue('Send the invoice today');
  });

  it('keeps Enter as a new line in the note, which is the field for one', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor();

    await user.type(screen.getByRole('textbox', { name: 'Notes' }), '{Enter}x');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue(
      'Attach the timesheet.\nx',
    );
  });

  it('settles on what the server saved rather than on what was typed', async () => {
    const user = userEvent.setup();
    const saved: TaskDetail = { ...TASK, tags: ['finance', 'q4', 'urgent'] };
    renderEditor({ onSave: () => Promise.resolve(saved) });

    await user.type(screen.getByLabelText('Tags'), ', urgent');
    await user.click(clickSave());

    expect(screen.getByLabelText('Tags')).toHaveValue('finance, q4, urgent');
    // Settled means nothing is unsaved, so Save leaves again.
    await waitFor(() => {
      expect(save()).toBeNull();
    });
  });

  it('loses nothing when the save is refused', async () => {
    const user = userEvent.setup();
    renderEditor({
      onSave: () => Promise.resolve(undefined),
      feedback: { kind: 'error', message: 'That task already exists.' },
    });

    await user.clear(title());
    await user.type(title(), 'Renamed');
    await user.click(clickSave());

    expect(title()).toHaveValue('Renamed');
    expect(save()).toBeInTheDocument();
    expect(screen.getByText('That task already exists.')).toBeInTheDocument();
  });

  it('keeps the fields editable offline and only stops the writes', () => {
    renderEditor({ disabled: true, feedback: { kind: 'offline' } });

    expect(title()).toBeEnabled();
    expect(
      screen.getByText('You’re offline. Reconnect to save this task.'),
    ).toBeInTheDocument();
  });

  it('holds a project it cannot list rather than dropping it on the next save', () => {
    renderEditor({
      task: { ...TASK, projectUid: 'project-shared', projectName: 'Shared' },
      projects: [{ uid: 'project-home', name: 'Home' }],
    });

    expect(screen.getByLabelText('Project')).toHaveValue('project-shared');
    expect(screen.getByRole('option', { name: 'Shared' })).toBeInTheDocument();
  });

  it('announces what happened without stealing focus', () => {
    renderEditor({ feedback: { kind: 'offline' } });

    const region = document.querySelector('.focus-detail__feedback');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent(
      'You’re offline. Reconnect to save this task.',
    );
  });
  it('paints each tag in the field as a chip', () => {
    renderEditor();

    expect(
      [...document.querySelectorAll('.focus-chip')].map(
        (chip) => chip.textContent,
      ),
    ).toEqual(['finance', 'q4']);
    // Still one comma-separated line, exactly as it is saved.
    expect(screen.getByLabelText('Tags')).toHaveValue('finance, q4');
  });

  it('completes the tag being typed against the names already in use', async () => {
    const user = userEvent.setup();
    renderEditor({ tags: ['finance', 'fitness', 'q4'] });

    const tags = screen.getByLabelText('Tags');
    await user.clear(tags);
    await user.type(tags, 'fin');

    const list = await screen.findByRole('listbox');
    expect(
      within(list)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['finance']);

    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Tags')).toHaveValue('finance, ');
  });

  it('completes the tag after a comma without closing up the space', async () => {
    const user = userEvent.setup();
    renderEditor({ tags: ['urgent'] });

    const tags = screen.getByLabelText('Tags');
    await user.type(tags, ', urg');
    await user.click(await screen.findByRole('option', { name: 'urgent' }));

    expect(tags).toHaveValue('finance, q4, urgent, ');
  });

  it('takes the first tag on return, then saves on the next', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({ tags: ['finance', 'fitness'] });

    const tags = screen.getByLabelText('Tags');
    await user.type(tags, ', fit');
    await screen.findByRole('listbox');

    await user.keyboard('{Enter}');
    expect(tags).toHaveValue('finance, q4, fitness, ');
    expect(onSave).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    expect(onSave).toHaveBeenCalledOnce();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem('only-tdy:editor-layout:v1');
});

it('toggles compact layout without losing edits or making the form dirty', async () => {
  const user = userEvent.setup();
  const { onSave } = renderEditor();
  await user.click(screen.getByRole('button', { name: 'Compact form' }));
  expect(save()).toBeNull();
  expect(screen.getByRole('combobox', { name: 'Tags' })).toHaveValue(
    '#finance, #q4',
  );
  expect(screen.getByRole('combobox', { name: 'Priority' })).toHaveDisplayValue(
    '!High',
  );
  expect(screen.getByRole('combobox', { name: 'Project' })).toHaveDisplayValue(
    '+Work',
  );
  expect(title()).toHaveValue(TASK.title);
  await user.clear(screen.getByRole('textbox', { name: 'Notes' }));
  await user.type(
    screen.getByRole('textbox', { name: 'Notes' }),
    'Updated note',
  );
  await user.click(screen.getByRole('button', { name: 'Compact form' }));
  expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue(
    'Updated note',
  );
  await user.click(clickSave());
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({ note: 'Updated note', tags: ['finance', 'q4'] }),
  );
});

it('adds Repeat quietly and saves the chosen schedule', async () => {
  const user = userEvent.setup();
  const { onSave } = renderEditor();
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Repeat' }),
    'weekly',
  );
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  await user.clear(screen.getByRole('spinbutton', { name: 'Every' }));
  await user.type(screen.getByRole('spinbutton', { name: 'Every' }), '2');
  await user.click(screen.getByRole('button', { name: 'Friday' }));
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(onSave).toHaveBeenCalledOnce();
  const recurrence = onSave.mock.calls[0]?.[0].recurrence;
  expect(recurrence?.type).toBe('weekly');
  expect(recurrence?.interval).toBe(2);
  expect(recurrence?.weekdays).toContain(5);
});
