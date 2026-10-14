import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { VersionScreen } from './VersionScreen.tsx';

const running = {
  version: '0.1.0',
  revision: 'a1b2c3d4e5f6',
  committedAt: '2026-09-30T18:42:00Z',
  builtAt: '2026-10-01T14:20:00Z',
};

describe('VersionScreen', () => {
  it('lists the running build', () => {
    render(
      <VersionScreen
        running={running}
        deployed={{ kind: 'checking' }}
        onReload={vi.fn()}
      />,
    );

    expect(
      screen.getByText('App version').nextElementSibling,
    ).toHaveTextContent('0.1.0');
    expect(screen.getByText('Revision').nextElementSibling).toHaveTextContent(
      'a1b2c3d',
    );
    expect(screen.getByText('Released')).toBeInTheDocument();
    expect(screen.getByText('Built')).toBeInTheDocument();
    expect(screen.getByText('Checking for updates…')).toBeInTheDocument();
  });

  it('leaves out the app version when there is none', () => {
    render(
      <VersionScreen
        running={{ ...running, version: null }}
        deployed={{ kind: 'unknown' }}
        onReload={vi.fn()}
      />,
    );

    expect(screen.queryByText('App version')).not.toBeInTheDocument();
    expect(screen.getByText('Couldn’t check for updates.')).toBeInTheDocument();
  });

  it('says it is up to date when the server has the same build', () => {
    render(
      <VersionScreen
        running={running}
        deployed={{ kind: 'known', build: running }}
        onReload={vi.fn()}
      />,
    );

    expect(screen.getByText('Up to date.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reload' }),
    ).not.toBeInTheDocument();
  });

  it('offers a reload onto a newer deployed build', async () => {
    const onReload = vi.fn();
    render(
      <VersionScreen
        running={running}
        deployed={{
          kind: 'known',
          build: { ...running, version: '0.2.0', revision: 'b2c3d4e5' },
        }}
        onReload={onReload}
      />,
    );

    expect(
      screen.getByText('Update available: 0.2.0 · b2c3d4e.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalledOnce();
  });
});
