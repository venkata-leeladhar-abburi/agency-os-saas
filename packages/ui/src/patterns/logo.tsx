import { cn } from '../lib/cn';

/** The One Stop Solutions glyph used for Agency OS: disc, two squares and a quarter circle. Draws in currentColor. */
export function Mark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <circle cx="18" cy="18" r="18" />
      <rect x="44" y="0" width="36" height="36" rx="4" />
      <rect x="0" y="44" width="36" height="36" rx="4" />
      <path d="M44 80A36 36 0 0 1 80 44V80Z" />
    </svg>
  );
}

/** The lockup: the glyph in primary and the wordmark in Geist SemiBold. */
export function Logo({
  size = 22,
  className,
  label = 'Agency OS',
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-foreground', className)}>
      <Mark size={size} className="text-primary" />
      <span className="text-title-sm tracking-[-0.03em]">{label}</span>
    </span>
  );
}

/** The workspace tile: the glyph in lime on a violet (or ink) square. */
export function BrandTile({
  size = 'md',
  tone = 'violet',
  className,
}: {
  size?: 'md' | 'lg';
  tone?: 'violet' | 'ink';
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center text-highlight',
        tone === 'violet' ? 'bg-primary' : 'bg-neutral-950',
        size === 'md' ? 'size-8 rounded-md' : 'size-9 rounded-[10px]',
        className,
      )}
    >
      <Mark size={size === 'md' ? 18 : 20} />
    </span>
  );
}
