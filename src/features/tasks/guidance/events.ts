import { useEffect, useRef } from 'react';
import type { Fact, PageContext, Signal } from './model.ts';
const listeners = new Set<(signal: Signal) => void>();
let page: PageContext | null = null;
let queued: Signal[] = [];
export function reportGuidance(signal: Signal): void {
  if (signal.kind === 'page') page = signal.page;
  if (listeners.size === 0) queued = [...queued.slice(-63), signal];
  for (const listener of listeners) listener(signal);
}
export function guidanceFacts(...facts: readonly Fact[]): void {
  reportGuidance({ kind: 'facts', facts });
}
export function subscribeGuidance(
  listener: (signal: Signal) => void,
): () => void {
  listeners.add(listener);
  const pending = queued;
  queued = [];
  for (const signal of pending) listener(signal);
  return () => {
    listeners.delete(listener);
  };
}
export function guidancePage(): PageContext | null {
  return page;
}
export function clearGuidanceEvents(): void {
  page = null;
  queued = [];
  pendingTour = false;
}
export function useGuidancePage(context: PageContext | null): void {
  const signature = context === null ? '' : JSON.stringify(context);
  const previous = useRef('');
  useEffect(() => {
    if (signature === '' || signature === previous.current) return;
    previous.current = signature;
    reportGuidance({
      kind: 'page',
      page: JSON.parse(signature) as PageContext,
    });
    return () => {
      previous.current = '';
    };
  }, [signature]);
}
const commands = new Set<() => void>();
let pendingTour = false;
export function requestTour(): void {
  if (commands.size === 0) pendingTour = true;
  for (const receive of commands) receive();
}
export function subscribeTour(receive: () => void): () => void {
  commands.add(receive);
  if (pendingTour) {
    pendingTour = false;
    receive();
  }
  return () => {
    commands.delete(receive);
  };
}
