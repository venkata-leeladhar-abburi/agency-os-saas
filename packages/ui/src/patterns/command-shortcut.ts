'use client';

import { useEffect } from 'react';

/**
 * Opens the palette with Ctrl+K or Cmd+K anywhere in the app. Kept apart from the palette so a
 * page can listen for the shortcut without loading the palette until it's wanted.
 */
export function useCommandShortcut(toggle: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);
}
