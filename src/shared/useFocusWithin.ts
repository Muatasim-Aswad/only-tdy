import { useState, type FocusEvent } from 'react';

export function useFocusWithin() {
  const [focused, setFocused] = useState(false);
  return {
    focused,
    containerProps: {
      onFocus: () => {
        setFocused(true);
      },
      onBlur: (event: FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      },
    },
  };
}
