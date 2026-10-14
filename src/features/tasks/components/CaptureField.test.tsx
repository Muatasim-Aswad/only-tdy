import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CaptureField, type CaptureFieldProps } from './CaptureField.tsx';

function renderCapture(props: Partial<CaptureFieldProps> = {}) {
  const onValueChange = vi.fn<(value: string) => void>();
  const onSubmit = vi.fn<() => void>();
  const view = render(
    <CaptureField
      value=""
      onValueChange={onValueChange}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onValueChange, onSubmit, view };
}

const field = () => screen.getByRole('combobox', { name: 'What needs doing?' });
const addButton = () => screen.getByRole('button', { name: 'Add' });
const queryAddButton = () => screen.queryByRole('button', { name: 'Add' });

describe('CaptureField', () => {
  it('shows dots but still names itself in words', () => {
    renderCapture();

    expect(field()).toHaveAttribute('placeholder', '.....');
    // The dots say where to type; only the label says what the field is for.
    expect(field()).toHaveAccessibleName('What needs doing?');
  });

  it('shows Add on focus, usable only once there is something to add', async () => {
    const user = userEvent.setup();
    const { view } = renderCapture();

    expect(queryAddButton()).toBeNull();

    await user.click(field());
    expect(addButton()).toBeDisabled();

    await user.click(document.body);
    expect(queryAddButton()).toBeNull();

    view.rerender(
      <CaptureField value="   " onValueChange={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(queryAddButton()).toBeNull();

    view.rerender(
      <CaptureField
        value="Book the MOT"
        onValueChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(addButton()).toBeEnabled();
  });

  it('reports each keystroke without owning the value', async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderCapture();

    await user.type(field(), 'B');

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('B');
    // The field is controlled: it still shows what the caller last passed.
    expect(field()).toHaveValue('');
  });

  it('submits on Enter', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderCapture({ value: 'Book the MOT' });

    await user.click(field());
    await user.keyboard('{Enter}');

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('submits on Add', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderCapture({ value: 'Book the MOT' });

    await user.click(addButton());

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('refuses to submit whitespace', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderCapture({ value: '   ' });

    await user.click(field());
    await user.keyboard('{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks Add but keeps the field editable when nothing can be saved', async () => {
    const user = userEvent.setup();
    const { onSubmit, onValueChange } = renderCapture({
      value: 'Book the MOT',
      disabled: true,
    });

    expect(addButton()).toBeDisabled();
    await user.click(addButton());
    expect(onSubmit).not.toHaveBeenCalled();

    // The thought in progress survives: typing still works, and Enter is
    // refused rather than swallowing the line.
    expect(field()).toBeEnabled();
    await user.type(field(), '!');
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('Book the MOT!');
    await user.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('paints a chip behind each token without taking it out of the text', () => {
    const { view } = renderCapture({
      value: 'Call the dentist #health +Admin !2 /today',
    });

    // The value is untouched: the chips are a second layer, not the field.
    expect(field()).toHaveValue('Call the dentist #health +Admin !2 /today');
    expect(
      [...view.container.querySelectorAll('.focus-chip')].map(
        (chip) => chip.textContent,
      ),
    ).toEqual(['#health', '+Admin', '!2', '/today']);
    // The layer says nothing a screen reader has not already been told.
    expect(view.container.querySelector('.focus-chips')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('offers the three priorities after !, each said in words', async () => {
    const user = userEvent.setup();
    renderCapture({ value: 'Call !' });

    await user.click(field());

    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual(['!1 Low', '!2 Medium', '!3 High']);
  });

  it('offers /today after / and writes it into the line', async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderCapture({ value: 'Call /t' });

    await user.click(field());
    await user.click(screen.getByRole('option', { name: '/today' }));

    expect(onValueChange).toHaveBeenLastCalledWith('Call /today ');
  });

  it('offers the names that would finish the token being typed', async () => {
    const user = userEvent.setup();
    renderCapture({
      value: 'Call +Ho',
      projects: ['Home', 'Home Office', 'Work'],
    });

    // Nothing is offered until the caret says where it is.
    await user.click(field());

    const list = await screen.findByRole('listbox');
    expect(
      within(list)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Home', 'Home Office', '+Ho new project']);
    expect(field()).toHaveAttribute('aria-expanded', 'true');
  });

  it('offers a name no project has as a new one, leaving return to add the task', async () => {
    const user = userEvent.setup();
    const { onSubmit, onValueChange } = renderCapture({
      value: 'Call +Garden',
      projects: ['Home', 'Work'],
    });

    await user.click(field());
    const list = await screen.findByRole('listbox');
    expect(
      within(list)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['+Garden new project']);

    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('offers no new project for a name that exists in another case', async () => {
    const user = userEvent.setup();
    renderCapture({ value: 'Call +home', projects: ['Home'] });

    await user.click(field());
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('offers no new project before the project list has arrived', async () => {
    const user = userEvent.setup();
    renderCapture({ value: 'Call +Home' });

    await user.click(field());
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('finishes a half-typed name with return, taking the first row', async () => {
    const user = userEvent.setup();
    const { onSubmit, onValueChange } = renderCapture({
      value: 'Call +Ho',
      projects: ['Home', 'Home Office'],
    });

    await user.click(field());
    await screen.findByRole('listbox');
    expect(screen.getByRole('option', { name: 'Home' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('Call +Home ');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('finishes a half-typed name with tab', async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderCapture({
      value: 'Call +Ho',
      projects: ['Home', 'Home Office'],
    });

    await user.click(field());
    await screen.findByRole('listbox');

    await user.keyboard('{ArrowDown}{Tab}');
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(
      'Call +(Home Office) ',
    );
  });

  it('leaves return to the field once the name is typed in full', async () => {
    const user = userEvent.setup();
    const { onSubmit, onValueChange } = renderCapture({
      value: 'Call +Home',
      projects: ['Home', 'Home Office'],
    });

    await user.click(field());
    await screen.findByRole('listbox');

    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('leaves return to the field while only the mark is typed', async () => {
    const user = userEvent.setup();
    const { onSubmit, onValueChange } = renderCapture({
      value: 'Call +',
      projects: ['Home', 'Home Office'],
    });

    await user.click(field());
    await screen.findByRole('listbox');

    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('gives return back to the field above the first row', async () => {
    const user = userEvent.setup();
    const { onSubmit, onValueChange } = renderCapture({
      value: 'Call +Ho',
      projects: ['Home', 'Home Office'],
    });

    await user.click(field());
    await screen.findByRole('listbox');

    await user.keyboard('{ArrowUp}{Enter}');
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('brackets a name that has a space in it', async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderCapture({
      value: 'Call +Ho',
      projects: ['Home Office'],
    });

    await user.click(field());
    await user.click(
      await screen.findByRole('option', { name: 'Home Office' }),
    );

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(
      'Call +(Home Office) ',
    );
  });

  it('puts the list away on Escape without touching the line', async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderCapture({
      value: 'Call +Ho',
      projects: ['Home', 'Home Office'],
    });

    await user.click(field());
    await screen.findByRole('listbox');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('offers nothing for a title word', async () => {
    const user = userEvent.setup();
    renderCapture({ value: 'Call the home', projects: ['Home'] });

    await user.click(field());

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('shows nothing but the marker and the placeholder at rest', () => {
    const { view } = renderCapture();

    expect(view.container.querySelectorAll('button')).toHaveLength(1);
    expect(view.container.textContent).toBe('+');
  });

  it('names the rail marker as a mode switch', () => {
    renderCapture();

    const marker = document.querySelector('.focus-capture__marker');
    expect(marker).toHaveTextContent('+');
    expect(marker).toHaveAccessibleName('Switch to search');
    expect(screen.queryByRole('button', { name: '+' })).toBeNull();
  });
});
