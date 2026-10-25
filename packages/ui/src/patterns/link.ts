import type { AnchorHTMLAttributes, ComponentType, ReactNode } from 'react';

/** Patterns render plain <a> by default; apps pass next/link so navigation stays client-side. */
export type LinkComponent = ComponentType<
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode }
>;
