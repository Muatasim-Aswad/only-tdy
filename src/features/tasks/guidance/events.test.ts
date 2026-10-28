import { expect, it, vi } from 'vitest';
import { clearGuidanceEvents, requestTour, subscribeTour } from './events.ts';

it('retains one tour request while the renderer loads and clears it on account exit', () => {
  clearGuidanceEvents();
  requestTour();
  requestTour();
  const receive = vi.fn();
  const stop = subscribeTour(receive);
  expect(receive).toHaveBeenCalledTimes(1);
  requestTour();
  expect(receive).toHaveBeenCalledTimes(2);
  stop();
  requestTour();
  clearGuidanceEvents();
  const next = vi.fn();
  const stopNext = subscribeTour(next);
  expect(next).not.toHaveBeenCalled();
  stopNext();
});
