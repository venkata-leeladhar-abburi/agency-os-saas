'use client';

import {
  CheckCircle,
  Info,
  Sparkle,
  Warning,
  WarningOctagon,
  X,
  type Icon,
} from '@phosphor-icons/react';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { IconButton } from './icon-button';

const alertVariants = cva('flex items-start gap-3 rounded-lg border border-transparent px-4 py-3', {
  variants: {
    tone: {
      info: 'bg-info-soft [&_[data-alert-icon]]:text-info',
      success: 'bg-success-soft [&_[data-alert-icon]]:text-success',
      warning: 'bg-warning-soft [&_[data-alert-icon]]:text-warning',
      danger: 'bg-danger-soft [&_[data-alert-icon]]:text-danger',
      brand: 'bg-brand-soft [&_[data-alert-icon]]:text-brand-soft-foreground',
    },
  },
  defaultVariants: { tone: 'info' },
});

const ICONS: Record<NonNullable<AlertProps['tone']>, Icon> = {
  info: Info,
  success: CheckCircle,
  warning: Warning,
  danger: WarningOctagon,
  brand: Sparkle,
};

export type AlertProps = VariantProps<typeof alertVariants> & {
  title?: ReactNode;
  children?: ReactNode;
  /** One action, such as a button. */
  action?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  icon?: Icon;
  className?: string;
};

/** An inline message about this screen's state: what happened, then what to do. */
export function Alert({
  tone = 'info',
  title,
  children,
  action,
  onDismiss,
  dismissLabel = 'Dismiss',
  icon,
  className,
}: AlertProps) {
  const IconComponent = icon ?? ICONS[tone ?? 'info'];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(alertVariants({ tone }), className)}
    >
      <IconComponent size={18} aria-hidden="true" data-alert-icon="" className="mt-px shrink-0" />
      <div className="min-w-0 flex-1 text-body text-foreground">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-0.5')}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
      {onDismiss ? (
        <IconButton
          icon={X}
          label={dismissLabel}
          size="sm"
          onClick={onDismiss}
          className="-my-1 -mr-1"
        />
      ) : null}
    </div>
  );
}
