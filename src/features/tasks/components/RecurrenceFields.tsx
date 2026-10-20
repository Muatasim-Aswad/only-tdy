import { FieldRow } from '../../../shared/FieldRow.tsx';
import type { Recurrence } from '../contracts.ts';
import { defaultRecurrence, WEEKDAYS } from '../domain/recurrence.ts';
import { Select } from '../../../shared/Select.tsx';

interface RecurrenceFieldsProps {
  readonly value: Recurrence | null;
  readonly dueDate: string;
  readonly onChange: (value: Recurrence | null) => void;
}

export function RecurrenceFields({
  value,
  dueDate,
  onChange,
}: RecurrenceFieldsProps) {
  const update = (changes: Partial<Recurrence>) => {
    if (value) onChange({ ...value, ...changes });
  };
  return (
    <div className="focus-group [.focus-group_+_&]:mt-7 focus-repeat-fields [&_input:focus-visible]:[box-shadow:inset_0_-1px_0_var(--accent)]">
      <FieldRow className="min-w-0 min-[360px]:justify-start">
        <label
          className="focus-field__label text-muted min-[360px]:flex-none min-[360px]:w-24 text-meta"
          htmlFor="task-repeat"
        >
          Repeat
        </label>
        <Select
          id="task-repeat"
          value={value?.type ?? 'none'}
          onChange={(type) => {
            onChange(
              type === 'none'
                ? null
                : {
                    ...(value ??
                      defaultRecurrence(type as Recurrence['type'], dueDate)),
                    type: type as Recurrence['type'],
                  },
            );
          }}
        >
          <option value="none">Off</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="monthly_weekday">Monthly on a weekday</option>
          <option value="monthly_last_day">Last day of the month</option>
        </Select>
      </FieldRow>
      {value ? (
        <>
          <FieldRow className="min-w-0 min-[360px]:justify-start">
            <label
              className="focus-field__label text-muted min-[360px]:flex-none min-[360px]:w-24 text-meta"
              htmlFor="task-repeat-interval"
            >
              Every
            </label>
            <div className="focus-repeat-fields__interval [&_input]:flex-none [&_input]:w-[5ch] flex-auto flex items-center gap-3 min-w-0 text-task">
              <input
                id="task-repeat-interval"
                className="focus-detail__value placeholder:text-muted placeholder:opacity-55 placeholder:font-placeholder min-w-0 max-w-full border-0 p-0 bg-transparent text-ink resize-none min-[360px]:flex-auto"
                type="number"
                min="1"
                max="365"
                required
                value={value.interval || ''}
                onChange={(event) => {
                  update({ interval: Number(event.target.value) });
                }}
              />
              <span>
                {value.type === 'daily'
                  ? 'days'
                  : value.type === 'weekly'
                    ? 'weeks'
                    : 'months'}
              </span>
            </div>
          </FieldRow>
          {value.type === 'weekly' ? (
            <FieldRow
              className="focus-repeat-fields__weekdays min-w-0 min-[360px]:justify-start"
              block
              role="group"
              aria-labelledby="task-repeat-days-label"
            >
              <span
                id="task-repeat-days-label"
                className="focus-field__label text-muted min-[360px]:flex-none min-[360px]:w-24 text-meta"
              >
                On
              </span>
              <div className="focus-detail__value placeholder:text-muted placeholder:opacity-55 placeholder:font-placeholder min-w-0 max-w-full border-0 p-0 bg-transparent text-ink resize-none min-[360px]:flex-auto">
                <div className="focus-repeat-fields__days flex flex-wrap gap-1">
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                    <button
                      type="button"
                      key={day}
                      className="min-h-11 min-w-9.5 py-1 px-0 text-muted text-start border-b border-transparent aria-pressed:text-ink aria-pressed:border-b-current focus-visible:underline focus-visible:underline-offset-[3px] hover:underline hover:underline-offset-[3px] text-action"
                      aria-label={WEEKDAYS[day]}
                      aria-pressed={value.weekdays.includes(day)}
                      onClick={() => {
                        update({
                          weekdays: value.weekdays.includes(day)
                            ? value.weekdays.filter((item) => item !== day)
                            : [...value.weekdays, day].sort(),
                        });
                      }}
                    >
                      {WEEKDAYS[day]?.slice(0, 3)}
                    </button>
                  ))}
                </div>
                {value.weekdays.length === 0 ? (
                  <p className="text-meta">Choose at least one day.</p>
                ) : null}
              </div>
            </FieldRow>
          ) : null}
          {value.type === 'monthly' ? (
            <FieldRow className="min-w-0 min-[360px]:justify-start">
              <label
                htmlFor="task-repeat-day"
                className="focus-field__label text-muted min-[360px]:flex-none min-[360px]:w-24 text-meta"
              >
                Day of month
              </label>
              <input
                id="task-repeat-day"
                className="focus-detail__value placeholder:text-muted placeholder:opacity-55 placeholder:font-placeholder min-w-0 max-w-full border-0 p-0 bg-transparent text-ink resize-none focus-repeat-fields__number flex-none w-[5ch]"
                type="number"
                min="1"
                max="31"
                required
                value={value.monthDay || ''}
                onChange={(event) => {
                  update({ monthDay: Number(event.target.value) });
                }}
              />
            </FieldRow>
          ) : null}
          {value.type === 'monthly_weekday' ? (
            <>
              <FieldRow className="min-w-0 min-[360px]:justify-start">
                <label
                  htmlFor="task-repeat-week"
                  className="focus-field__label text-muted min-[360px]:flex-none min-[360px]:w-24 text-meta"
                >
                  Week
                </label>
                <Select
                  id="task-repeat-week"
                  value={String(value.weekOfMonth)}
                  onChange={(week) => {
                    update({ weekOfMonth: Number(week) });
                  }}
                >
                  {[
                    [1, 'First'],
                    [2, 'Second'],
                    [3, 'Third'],
                    [4, 'Fourth'],
                    [5, 'Fifth'],
                    [-1, 'Last'],
                  ].map(([week, label]) => (
                    <option key={week} value={week}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FieldRow>
              <FieldRow className="min-w-0 min-[360px]:justify-start">
                <label
                  htmlFor="task-repeat-weekday"
                  className="focus-field__label text-muted min-[360px]:flex-none min-[360px]:w-24 text-meta"
                >
                  Weekday
                </label>
                <Select
                  id="task-repeat-weekday"
                  value={String(value.weekdays[0] ?? 1)}
                  onChange={(day) => {
                    update({ weekdays: [Number(day)] });
                  }}
                >
                  {WEEKDAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </Select>
              </FieldRow>
            </>
          ) : null}
          <FieldRow className="min-w-0 min-[360px]:justify-start">
            <label
              htmlFor="task-repeat-based"
              className="focus-field__label text-muted min-[360px]:flex-none min-[360px]:w-24 text-meta"
            >
              Based on
            </label>
            <Select
              id="task-repeat-based"
              value={value.completionBased ? 'completion' : 'scheduled'}
              onChange={(basis) => {
                update({ completionBased: basis === 'completion' });
              }}
            >
              <option value="scheduled">Scheduled date</option>
              <option value="completion">Completion date</option>
            </Select>
          </FieldRow>
          <FieldRow className="min-w-0 min-[360px]:justify-start">
            <label
              htmlFor="task-repeat-end"
              className="focus-field__label text-muted min-[360px]:flex-none min-[360px]:w-24 text-meta"
            >
              Ends on (optional)
            </label>
            <input
              id="task-repeat-end"
              className="focus-detail__value placeholder:text-muted placeholder:opacity-55 placeholder:font-placeholder min-w-0 max-w-full border-0 p-0 bg-transparent text-ink resize-none min-[360px]:flex-auto text-task"
              type="date"
              min={dueDate || undefined}
              value={value.endDate}
              onChange={(event) => {
                update({ endDate: event.target.value });
              }}
            />
          </FieldRow>
        </>
      ) : null}
    </div>
  );
}
