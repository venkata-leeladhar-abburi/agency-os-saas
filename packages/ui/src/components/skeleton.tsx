import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type SkeletonProps = HTMLAttributes<HTMLSpanElement> & {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
};

/** A placeholder shape while data loads, matching the real layout. Shimmer stops under reduced motion. */
export function Skeleton({
  width,
  height = 12,
  circle,
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block animate-shimmer bg-linear-to-r from-muted via-border to-muted bg-size-[200%_100%] motion-reduce:animate-none',
        circle ? 'rounded-full' : 'rounded-sm',
        className,
      )}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}
