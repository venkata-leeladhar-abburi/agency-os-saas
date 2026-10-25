import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the Agency OS type scale, so `text-title-lg` is a font size and does not
// replace a text colour such as `text-foreground`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'display-lg',
        'display',
        'title-xl',
        'title-lg',
        'title-md',
        'title-sm',
        'body-lg',
        'body',
        'body-medium',
        'body-sm',
        'caption',
        'overline',
        'metric',
        'mono',
        'mono-sm',
      ],
    },
    classGroups: {
      'font-size': ['text-overline-caps'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
