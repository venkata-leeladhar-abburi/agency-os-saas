import type { Icon } from '@phosphor-icons/react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import {
  Children,
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '../lib/cn';
import { Kbd } from './kbd';
import { Spinner } from './spinner';

export const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent text-body-medium leading-none whitespace-nowrap select-none transition-[background-color,border-color,color,box-shadow,transform] duration-120 ease-out active:not-disabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress aria-busy:opacity-80',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-xs inset-shadow-2xs inset-shadow-white/15 hover:not-disabled:bg-primary-hover',
        secondary:
          'border-border-strong bg-card text-foreground shadow-xs hover:not-disabled:bg-accent',
        soft: 'bg-secondary text-secondary-foreground hover:not-disabled:bg-border',
        ghost: 'bg-transparent text-foreground hover:not-disabled:bg-accent',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:not-disabled:bg-red-700',
        highlight: 'bg-highlight text-highlight-foreground hover:not-disabled:bg-lime-400',
        link: 'h-auto! border-0 bg-transparent px-0! text-link underline decoration-1 underline-offset-3',
      },
      size: {
        sm: 'h-control-sm gap-1.5 rounded-sm px-3 text-body-sm font-medium',
        md: 'h-control-md px-3.5',
        lg: 'h-control-lg px-4.5',
        xl: 'h-control-xl rounded-lg px-5 text-body-lg font-medium',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Phosphor icon before the label. Replaced by a spinner while loading. */
    icon?: Icon;
    /** Phosphor icon after the label. */
    iconRight?: Icon;
    /** Keeps the label, shows a spinner, disables the button and sets aria-busy. */
    loading?: boolean;
    /** Shortcut hint shown after the label, e.g. "Ctrl K". */
    kbd?: string;
    /** Render the child element (a link) with button styles. */
    asChild?: boolean;
  };

/** Starts an action. One `primary` per view; labels start with a verb. */
export function Button({
  className,
  variant,
  size,
  block,
  icon: IconBefore,
  iconRight: IconAfter,
  loading = false,
  kbd,
  asChild = false,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const iconSize = size === 'xl' ? 20 : size === 'sm' ? 14 : 16;
  const before = loading ? (
    <Spinner size={iconSize} />
  ) : IconBefore ? (
    <IconBefore size={iconSize} aria-hidden="true" className="shrink-0" />
  ) : null;
  const after = (
    <>
      {IconAfter ? <IconAfter size={iconSize} aria-hidden="true" className="shrink-0" /> : null}
      {kbd ? (
        <Kbd
          className={cn(
            'ml-0.5',
            variant === 'primary' && 'border-white/25 bg-white/15 text-primary-foreground',
          )}
        >
          {kbd}
        </Kbd>
      ) : null}
    </>
  );
  const classes = cn(buttonVariants({ variant, size, block }), className);

  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement<{ children?: ReactNode }>(child)) return null;
    return (
      <Slot.Root className={classes} aria-busy={loading || undefined} {...props}>
        {cloneElement(
          child as ReactElement<{ children?: ReactNode }>,
          undefined,
          <>
            {before}
            {child.props.children}
            {after}
          </>,
        )}
      </Slot.Root>
    );
  }

  return (
    <button
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {before}
      {children}
      {after}
    </button>
  );
}
