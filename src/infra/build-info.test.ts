import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildLabel,
  RUNNING_BUILD,
  SEEN_REVISION_KEY,
  takeUpdateNotice,
} from './build-info.ts';

const build = {
  version: '0.1.0',
  revision: 'a1b2c3d4e5f6',
  committedAt: '2026-09-30T18:42:00Z',
  builtAt: '2026-10-01T14:20:00Z',
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

describe('buildLabel', () => {
  it('pairs the version with the short revision', () => {
    expect(buildLabel(build)).toBe('0.1.0 · a1b2c3d');
  });

  it('is the revision alone when there is no version', () => {
    expect(buildLabel({ ...build, version: null })).toBe('a1b2c3d');
  });
});

describe('takeUpdateNotice', () => {
  it('says nothing on a first visit, and remembers the build', () => {
    expect(takeUpdateNotice()).toBeNull();
    expect(localStorage.getItem(SEEN_REVISION_KEY)).toBe(
      RUNNING_BUILD.revision,
    );
  });

  it('announces a new build once', () => {
    localStorage.setItem(SEEN_REVISION_KEY, 'an-older-revision');
    expect(takeUpdateNotice()).toEqual(RUNNING_BUILD);
    expect(takeUpdateNotice()).toBeNull();
  });

  it('says nothing again for the same build', () => {
    localStorage.setItem(SEEN_REVISION_KEY, RUNNING_BUILD.revision);
    expect(takeUpdateNotice()).toBeNull();
  });
});

it('keeps first-visit and update notices safe when storage is blocked', () => {
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError');
  });
  expect(takeUpdateNotice()).toBeNull();
});
