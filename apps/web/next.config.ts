import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@agency-os/core', '@agency-os/tokens', '@agency-os/ui'],
};

export default config;
