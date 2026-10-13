import { createContext, useContext } from 'react';
import { DEFAULT_TIMEZONE } from './domain/task-dates.ts';

export const DateTimezoneContext = createContext(DEFAULT_TIMEZONE);
export const useDateTimezone = () => useContext(DateTimezoneContext);
