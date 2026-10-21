import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TaskInput } from './TaskInput.tsx';

function Harness({ onSubmit = vi.fn() }: { onSubmit?: () => void }) {
  const [mode, setMode] = useState<'add' | 'search'>('add');
  const [add, setAdd] = useState('');
  const [search, setSearch] = useState('');
  return (
    <>
      <TaskInput
        mode={mode}
        onToggleMode={() => {
          setMode(mode === 'add' ? 'search' : 'add');
        }}
        value={mode === 'add' ? add : search}
        onValueChange={mode === 'add' ? setAdd : setSearch}
        onSubmit={onSubmit}
      />
      <input aria-label="Other field" />
      <div
        contentEditable
        suppressContentEditableWarning
        aria-label="Editable text"
      />
      <button type="button">Other action</button>
      <p>Outside the field</p>
    </>
  );
}

const field = () => screen.getByRole('combobox');

describe('TaskInput keyboard', () => {
  it('focuses on typing, inserts the first character and appends to an existing draft', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.keyboard('Buy milk');
    expect(field()).toHaveFocus();
    expect(field()).toHaveValue('Buy milk');
    await user.click(screen.getByText('Outside the field'));
    await user.keyboard(' tomorrow');
    expect(field()).toHaveValue('Buy milk tomorrow');
  });

  it('toggles from the page or field and restores separate drafts without submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await user.keyboard('Buy milk{Control>}/{/Control}');
    expect(field()).toHaveAttribute('type', 'search');
    expect(field()).toHaveFocus();
    expect(field()).toHaveValue('');
    await user.keyboard('invoice');
    await user.click(screen.getByText('Outside the field'));
    await user.keyboard('{Control>}/{/Control}');
    expect(field()).toHaveFocus();
    expect(field()).toHaveValue('Buy milk');
    await user.keyboard('{Meta>}/{/Meta}');
    expect(field()).toHaveValue('invoice');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('leaves other editable fields and button keyboard activation alone', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const other = screen.getByLabelText('Other field');
    await user.type(other, 'hello{Control>}/{/Control}');
    expect(other).toHaveFocus();
    expect(other).toHaveValue('hello');
    expect(field()).toHaveValue('');
    const editable = screen.getByLabelText('Editable text');
    await user.click(editable);
    await user.keyboard('notes{Control>}/{/Control}');
    expect(editable).toHaveTextContent('notes');
    expect(field()).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Other action' }));
    await user.keyboard(' ');
    expect(field()).not.toHaveFocus();
  });

  it('respects modifiers, composition, selected text and open menus or dialogs', () => {
    render(<Harness />);
    for (const options of [
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { isComposing: true },
    ]) {
      fireEvent.keyDown(document.body, { key: 'a', ...options });
    }
    const selection = window.getSelection();
    selection?.selectAllChildren(screen.getByText('Outside the field'));
    fireEvent.keyDown(document.body, { key: 'a' });
    selection?.removeAllRanges();
    expect(field()).toHaveValue('');
    for (const role of ['menu', 'dialog']) {
      const overlay = document.createElement('div');
      overlay.setAttribute('role', role);
      document.body.append(overlay);
      fireEvent.keyDown(document.body, { key: '/', ctrlKey: true });
      fireEvent.keyDown(document.body, { key: 'a' });
      expect(field()).toHaveValue('');
      expect(field()).not.toHaveAttribute('type', 'search');
      overlay.remove();
    }
  });
});
