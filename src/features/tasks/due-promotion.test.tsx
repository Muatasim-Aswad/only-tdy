import { QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DuePromotionAction } from './components/DuePromotionAction.tsx';
import { backlogQueryOptions, todayQueryOptions } from './data/queries.ts';
import { createTududiApi } from './data/tududi-api.ts';
import { readDuePromotion, setDuePromotion } from './due-promotion.ts';

afterEach(() => {
  vi.restoreAllMocks();
  setDuePromotion(false);
  localStorage.clear();
});

describe('automatic due promotion', () => {
  it('has a neutral off default and reads lists without initiating writes', async () => {
    const api = createTududiApi();
    const sync = vi.spyOn(api, 'syncDueTasks').mockResolvedValue([]);
    vi.spyOn(api, 'fetchTodayTasks').mockResolvedValue([]);
    vi.spyOn(api, 'fetchBacklogTasks').mockResolvedValue([]);
    const client = new QueryClient();
    expect(readDuePromotion()).toBe(false);
    await client.query(todayQueryOptions(api));
    await client.query(backlogQueryOptions(true, api));
    expect(sync).not.toHaveBeenCalled();
  });

  it('deduplicates opted-in synchronization across concurrent list reads', async () => {
    setDuePromotion(true);
    const api = createTududiApi();
    const sync = vi.spyOn(api, 'syncDueTasks').mockResolvedValue([]);
    vi.spyOn(api, 'fetchTodayTasks').mockResolvedValue([]);
    vi.spyOn(api, 'fetchBacklogTasks').mockResolvedValue([]);
    const client = new QueryClient();
    await Promise.all([
      client.query(todayQueryOptions(api)),
      client.query(backlogQueryOptions(true, api)),
    ]);
    expect(sync).toHaveBeenCalledOnce();
  });

  it('keeps the menu setting usable for this session when storage is blocked', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    render(<DuePromotionAction />);
    const action = screen.getByRole('button', {
      name: 'Automatically move due tasks to Today',
    });
    expect(action).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(action);
    expect(action).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(action);
    expect(action).toHaveAttribute('aria-pressed', 'false');
  });

  it('clears opt-in when the preference is removed', () => {
    setDuePromotion(true);
    localStorage.clear();
    expect(readDuePromotion()).toBe(false);
  });
});
