import { PublicError } from '../../../shared/PublicError.ts';

export function taskErrorMessage(error: unknown, fallback: string): string {
  return error instanceof PublicError ? error.message : fallback;
}
