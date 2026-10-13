import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from 'react';

export const TaskSessionContext = createContext<{
  readonly captureValue: string;
  readonly onCaptureChange: Dispatch<SetStateAction<string>>;
} | null>(null);

export function useTaskSession() {
  const session = useContext(TaskSessionContext);
  if (session === null) throw new Error('Task pages require TaskProvider.');
  return session;
}
