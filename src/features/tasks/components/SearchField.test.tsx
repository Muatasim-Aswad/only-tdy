import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SearchField, type SearchFieldProps } from './SearchField.tsx';

function renderSearch(props: Partial<SearchFieldProps> = {}) {
  const onValueChange = vi.fn<(value: string) => void>();
  const onSubmit = vi.fn<() => void>();
  const { unmount } = render(
    <SearchField
      value=""
      onValueChange={onValueChange}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onValueChange, onSubmit, unmount };
}

const field = () =>
  screen.getByRole('combobox', { name: 'Search the backlog' });
const submit = () => screen.queryByRole('button', { name: 'Search Backlog' });

describe('SearchField', () => {
  it('uses the capture placeholder and names itself in words', () => {
    renderSearch();

    expect(field()).toHaveAttribute('placeholder', '.....');
    expect(field()).toHaveAccessibleName('Search the backlog');
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  /* The same object as the capture field, drawn the same way: the classes are
     the assertion, because they are what carries the design. */
  it('is the capture field, with a glass where the plus is', () => {
    renderSearch({ value: 'bulb' });

    expect(document.querySelector('form')).toHaveClass('focus-capture');
    expect(field()).toHaveClass('focus-capture__input');
    expect(field().closest('.focus-tokens')).toHaveClass('text-capture');
    expect(submit()).toHaveClass('focus-capture__submit');

    const marker = document.querySelector('.focus-capture__marker');
    expect(marker).toHaveAccessibleName('Clear input');
    expect(marker?.querySelector('svg')).toBeInTheDocument();
    expect(marker).toHaveTextContent('');
  });

  it('paints a chip behind a marked term, and none behind words', () => {
    const { unmount } = renderSearch({ value: '#finance' });
    expect(
      [...document.querySelectorAll('.focus-chip')].map(
        (chip) => chip.textContent,
      ),
    ).toEqual(['#finance']);
    unmount();

    renderSearch({ value: 'bulb' });
    expect(document.querySelector('.focus-chip')).toBeNull();
  });

  it('shows Search on focus, usable only once there is something to search for', async () => {
    const user = userEvent.setup();
    renderSearch();
    expect(submit()).toBeNull();

    await user.click(field());
    expect(submit()).toBeDisabled();

    await user.click(document.body);
    expect(submit()).toBeNull();
  });

  it('reports each keystroke without owning the value', async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderSearch();

    await user.type(field(), '#');

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('#');
    expect(field()).toHaveValue('');
  });

  /* One request per search, not one per character: the return key is the
     whole interaction, and a phone keyboard is told to say so. */
  it('searches on Enter and says so on a phone keyboard', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSearch({ value: '#finance' });

    expect(field()).toHaveAttribute('enterkeyhint', 'search');
    await user.click(field());
    await user.keyboard('{Enter}');

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('refuses to search for whitespace', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSearch({ value: '   ' });

    expect(submit()).toBeNull();
    await user.click(field());
    await user.keyboard('{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks the search but keeps the field editable when offline', async () => {
    const user = userEvent.setup();
    const { onSubmit, onValueChange } = renderSearch({
      value: 'bulb',
      disabled: true,
    });

    expect(submit()).toBeDisabled();
    expect(field()).toBeEnabled();

    await user.type(field(), 's');
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('bulbs');
    await user.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it('offers the names a marked term could mean, whole line and all', async () => {
    const user = userEvent.setup();
    renderSearch({ value: '+Home', projects: ['Home', 'Home Office'] });

    await user.click(field());

    const list = await screen.findByRole('listbox');
    expect(
      within(list)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Home', 'Home Office']);
  });

  it('writes a picked name whole, spaces and no quotes', async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderSearch({
      value: '+Home',
      projects: ['Home Office'],
    });

    await user.click(field());
    await user.click(
      await screen.findByRole('option', { name: 'Home Office' }),
    );

    // The field takes the rest of the line as one name, so nothing is quoted.
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('+Home Office');
  });

  it('finishes a half-typed name with return before searching', async () => {
    const user = userEvent.setup();
    const { onSubmit, onValueChange } = renderSearch({
      value: '#ho',
      tags: ['home', 'household'],
    });

    await user.click(field());
    await screen.findByRole('listbox');

    await user.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('#home');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('searches on return once the name is typed in full', async () => {
    const user = userEvent.setup();
    const { onSubmit, onValueChange } = renderSearch({
      value: '#house',
      tags: ['house', 'household'],
    });

    await user.click(field());
    await screen.findByRole('listbox');

    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('offers nothing for a term that is only words', async () => {
    const user = userEvent.setup();
    renderSearch({ value: 'bulb', projects: ['Home'], tags: ['home'] });

    await user.click(field());

    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
