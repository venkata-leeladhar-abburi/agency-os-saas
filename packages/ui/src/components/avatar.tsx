'use client';

import { useState } from 'react';
import { cn } from '../lib/cn';

const TINTS = [
  'bg-violet-100 text-violet-800',
  'bg-teal-100 text-teal-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-blue-100 text-blue-800',
  'bg-lime-200 text-lime-900',
] as const;

const SIZES = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-caption',
  lg: 'size-12 rounded-lg! text-body-lg',
} as const;

export type AvatarSize = keyof typeof SIZES;

/** Up to two initials: first and last word. */
export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** A stable tint per name, so a person keeps their colour everywhere. */
export function tintFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length] as string;
}

export type AvatarProps = {
  name: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
};

/** A person or company: a photo when given, otherwise initials on a tint picked from the name. */
export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold tracking-[0.01em]',
        SIZES[size],
        tintFor(name),
        className,
      )}
    >
      {showImage ? (
        <img src={src} alt="" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}

export type AvatarGroupProps = {
  names: string[];
  max?: number;
  size?: AvatarSize;
  className?: string;
  /** Accessible text for the overflow, e.g. "and 3 more". */
  moreLabel?: (count: number) => string;
};

/** People stacked, with a +N overflow. */
export function AvatarGroup({
  names,
  max = 4,
  size = 'sm',
  className,
  moreLabel = (n) => `and ${n} more`,
}: AvatarGroupProps) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <div className={cn('inline-flex', className)}>
      {shown.map((name, i) => (
        <Avatar
          key={`${name}-${i}`}
          name={name}
          size={size}
          className={cn('ring-2 ring-card', i > 0 && '-ml-1.5')}
        />
      ))}
      {rest > 0 ? (
        <span
          role="img"
          aria-label={moreLabel(rest)}
          className={cn(
            '-ml-1.5 inline-grid shrink-0 place-items-center rounded-full bg-muted font-semibold text-muted-foreground ring-2 ring-card',
            SIZES[size],
          )}
        >
          <span aria-hidden="true">+{rest}</span>
        </span>
      ) : null}
    </div>
  );
}
