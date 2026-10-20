import { QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DuePromotionAction } from './components/DuePromotionAction.tsx';
import { backlogQueryOptions, todayQueryOptions } from './data/queries.ts';
import { createTududiApi } from './data/tududi-api.ts';
import { readDuePromotion, setDuePromotion } from './due-promotion.ts';

afterEach(() => {
  vi.restoreAllMocks();
  setDuePromotion(true);
  localStorage.clear();
});

describe('automatic due promotion', () => {
  it('synchronizes due tasks by default before reading lists', async () => {
    const api = createTududiApi();
    const sync = vi.spyOn(api, 'syncDueTasks').mockResolvedValue([]);
    vi.spyOn(api, 'fetchTodayTasks').mockResolvedValue([]);
    vi.spyOn(api, 'fetchBacklogTasks').mockResolvedValue([]);
    const client = new QueryClient();
    expect(readDuePromotion()).toBe(true);
    await client.query(todayQueryOptions(api));
    await client.query(backlogQueryOptions(true, api));
    expect(sync).toHaveBeenCalledOnce();
  });

  it('preserves an explicit off choice and reads lists without initiating writes', async () => {
    setDuePromotion(false);
    const api = createTududiApi();
    const sync = vi.spyOn(api, 'syncDueTasks').mockResolvedValue([]);
    vi.spyOn(api, 'fetchTodayTasks').mockResolvedValue([]);
    vi.spyOn(api, 'fetchBacklogTasks').mockResolvedValue([]);
    const client = new QueryClient();
    expect(localStorage.getItem('only-tdy:auto-due-promotion:v1')).toBe('off');
    expect(readDuePromotion()).toBe(false);
    await client.query(todayQueryOptions(api));
    await client.query(backlogQueryOptions(true, api));
    expect(sync).not.toHaveBeenCalled();
  });

  it('deduplicates synchronization across concurrent list reads', async () => {
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
    expect(action).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(action);
    expect(action).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(action);
    expect(action).toHaveAttribute('aria-pressed', 'true');
  });

  it('restores the on default when the preference is removed', () => {
    setDuePromotion(false);
    localStorage.clear();
    expect(readDuePromotion()).toBe(true);
  });

  it('retains the existing on preference', () => {
    localStorage.setItem('only-tdy:auto-due-promotion:v1', 'on');
    expect(readDuePromotion()).toBe(true);
  });
});
