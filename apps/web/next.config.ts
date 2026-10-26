import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@agency-os/core', '@agency-os/db', '@agency-os/tokens', '@agency-os/ui'],
  // react-pdf runs in Node and loads its own font and layout engines.
  serverExternalPackages: ['@react-pdf/renderer'],
  // The PDF routes read Geist's TTF files at run time; ship them with the functions.
  outputFileTracingIncludes: {
    '/w/[workspace]/**/pdf': ['./node_modules/geist/dist/fonts/geist-*/*.ttf'],
    '/p/[workspace]/payments/[id]/pdf': ['./node_modules/geist/dist/fonts/geist-*/*.ttf'],
    '/proposal/[token]/pdf': ['./node_modules/geist/dist/fonts/geist-*/*.ttf'],
  },
};

export default config;
