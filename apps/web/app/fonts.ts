// Geist from the `geist` package. Geist Mono (IDs, numbers, codes) isn't on the first paint
// of most pages, so it isn't preloaded: that keeps it off the critical path on slow phones.
import { GeistSans } from 'geist/font/sans';
import localFont from 'next/font/local';

export { GeistSans };

export const GeistMono = localFont({
  src: '../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2',
  variable: '--font-geist-mono',
  adjustFontFallback: false,
  preload: false,
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
  weight: '100 900',
});
