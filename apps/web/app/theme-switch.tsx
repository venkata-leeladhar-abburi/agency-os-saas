'use client';

import { ThemeToggle, type ThemeChoice } from '@agency-os/ui';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  // The saved theme is only known in the browser; render the default until then.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <ThemeToggle
      value={mounted ? ((theme as ThemeChoice | undefined) ?? 'system') : 'system'}
      onValueChange={setTheme}
    />
  );
}
