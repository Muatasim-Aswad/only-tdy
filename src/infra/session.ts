/** Invalidates credentials and responses across every same-origin API adapter. */
let generation = 0;
const listeners = new Set<() => void>();

export function sessionGeneration(): number {
  return generation;
}

export function changeSession(): void {
  generation += 1;
}

export function expireSession(): void {
  for (const listener of listeners) listener();
}

export function subscribeSessionExpiry(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
