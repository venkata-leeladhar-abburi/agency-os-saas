import type { NextConfig } from 'next';
import { STATIC_SECURITY_HEADERS } from './lib/security-headers';

const config: NextConfig = {
  transpilePackages: [
    '@agency-os/core',
    '@agency-os/db',
    '@agency-os/emails',
    '@agency-os/jobs',
    '@agency-os/tokens',
    '@agency-os/ui',
  ],
  // Pages load only the components and icons they use, not every export of these packages.
  experimental: { optimizePackageImports: ['@agency-os/ui', '@phosphor-icons/react'] },
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: STATIC_SECURITY_HEADERS }];
  },
  // react-pdf runs in Node and loads its own font and layout engines.
  serverExternalPackages: ['@react-pdf/renderer'],
  // The PDF routes read Geist's TTF files at run time; ship them with the functions.
  outputFileTracingIncludes: {
    '/w/[workspace]/**/pdf': ['./node_modules/geist/dist/fonts/geist-*/*.ttf'],
    '/p/[workspace]/payments/[id]/pdf': ['./node_modules/geist/dist/fonts/geist-*/*.ttf'],
    '/proposal/[token]/pdf': ['./node_modules/geist/dist/fonts/geist-*/*.ttf'],
    '/pay/[token]/pdf': ['./node_modules/geist/dist/fonts/geist-*/*.ttf'],
  },
};

export default config;
