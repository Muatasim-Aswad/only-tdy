import { scanEntryTokens } from '../domain/entry-tokens.ts';
import { commandValue } from '../domain/token-language.ts';
import type { Fact } from './model.ts';
/** Only grammar evidence leaves the successful capture/editor path. */
export function tokenFacts(input: string): Fact[] {
  return scanEntryTokens(input).flatMap((token): Fact[] => {
    if (token.value === '' || token.unterminated) return [];
    if (token.kind === 'tag') return ['token-tag'];
    if (token.kind === 'priority') return ['token-priority'];
    if (token.kind === 'command') {
      const command = commandValue(token.value);
      if (command === 'today') return ['token-today'];
      if (command.startsWith('due:')) return ['token-due'];
    }
    return [];
  });
}
