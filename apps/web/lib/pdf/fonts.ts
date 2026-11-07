// Server only. Geist and Geist Mono embedded in every PDF, from the `geist` package.
import { join } from 'node:path';
import { Font } from '@react-pdf/renderer';

const DIR = join(process.cwd(), 'node_modules/geist/dist/fonts');
let registered = false;

export function registerFonts() {
  if (registered) return;
  registered = true;
  Font.register({
    family: 'Geist',
    fonts: [
      { src: join(DIR, 'geist-sans/Geist-Regular.ttf'), fontWeight: 400 },
      { src: join(DIR, 'geist-sans/Geist-Medium.ttf'), fontWeight: 500 },
      { src: join(DIR, 'geist-sans/Geist-SemiBold.ttf'), fontWeight: 600 },
    ],
  });
  Font.register({
    family: 'Geist Mono',
    fonts: [
      { src: join(DIR, 'geist-mono/GeistMono-Regular.ttf'), fontWeight: 400 },
      { src: join(DIR, 'geist-mono/GeistMono-Medium.ttf'), fontWeight: 500 },
    ],
  });
  // Names, GSTINs and amounts must never break across lines with a hyphen.
  Font.registerHyphenationCallback((word) => [word]);
}
