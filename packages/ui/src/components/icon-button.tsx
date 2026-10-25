'use client';

import type { Icon } from '@phosphor-icons/react';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { Tooltip } from './tooltip';

const iconButtonVariants = cva(
  'inline-grid shrink-0 cursor-pointer place-items-center rounded-md border border-transparent p-0 transition-[background-color,color] duration-120 ease-out disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        ghost:
          'bg-transparent text-muted-foreground hover:not-disabled:bg-accent hover:not-disabled:text-foreground',
        outline:
          'border-border-strong bg-card text-foreground shadow-xs hover:not-disabled:bg-accent',
      },
      size: { sm: 'size-7 rounded-sm', md: 'size-control-md' },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
);

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> &
  VariantProps<typeof iconButtonVariants> & {
    icon: Icon;
    /** Required: becomes the accessible name and the tooltip. */
    label: string;
    /** Set false inside places that already show the label. */
    tooltip?: boolean;
  };

/** A square button with only an icon. Always has a label and a tooltip. */
export function IconButton({
  icon: IconComponent,
  label,
  variant,
  size,
  tooltip = true,
  className,
  type,
  ...props
}: IconButtonProps) {
  const button = (
    <button
      type={type ?? 'button'}
      aria-label={label}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      <IconComponent size={size === 'sm' ? 16 : 18} aria-hidden="true" />
    </button>
  );
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button;
}
