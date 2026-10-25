'use client';

import { CheckCircle, Info, WarningOctagon, X, type Icon } from '@phosphor-icons/react';
import { useSyncExternalStore, type ReactNode } from 'react';
import { toast as sonner, Toaster as SonnerToaster, type ToasterProps } from 'sonner';
import { cn } from '../lib/cn';

export type ToastTone = 'success' | 'danger' | 'info';

const ICONS: Record<ToastTone, { Icon: Icon; className: string }> = {
  success: { Icon: CheckCircle, className: 'text-success' },
  danger: { Icon: WarningOctagon, className: 'text-danger' },
  info: { Icon: Info, className: 'text-info' },
};

export type ToastCardProps = {
  tone?: ToastTone;
  /** Past tense: "Proposal sent". */
  title: ReactNode;
  description?: ReactNode;
  /** Usually Undo for a reversible action. */
  action?: { label: string; onClick: () => void };
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
};

/** The look of a toast. Use `notify()` to show one. */
export function ToastCard({
  tone = 'success',
  title,
  description,
  action,
  onClose,
  closeLabel = 'Close',
  className,
}: ToastCardProps) {
  const { Icon: IconComponent, className: iconClass } = ICONS[tone];
  return (
    <div
      className={cn(
        'flex w-[min(380px,calc(100vw-32px))] items-start gap-3 rounded-lg border border-border bg-popover py-3 pr-3 pl-4 text-popover-foreground shadow-lg',
        className,
      )}
    >
      <IconComponent size={18} aria-hidden="true" className={cn('mt-px shrink-0', iconClass)} />
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">{title}</p>
        {description ? (
          <p className="mt-0.5 text-body-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="h-7 shrink-0 cursor-pointer self-center rounded-sm bg-muted px-2.5 text-body-sm font-semibold text-foreground transition-colors duration-120 hover:bg-accent"
        >
          {action.label}
        </button>
      ) : null}
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="grid size-7 shrink-0 cursor-pointer place-items-center self-center rounded-sm text-muted-foreground transition-colors duration-120 hover:bg-accent hover:text-foreground"
        >
          <X size={14} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export type NotifyOptions = Omit<ToastCardProps, 'onClose' | 'className'> & {
  /** Milliseconds; 5 seconds by default. */
  duration?: number;
};

/** Shows a toast: bottom right on desktop, top on phones, for 5 seconds. */
export function notify({ duration = 5000, action, ...card }: NotifyOptions) {
  return sonner.custom(
    (id) => (
      <ToastCard
        {...card}
        action={
          action
            ? {
                label: action.label,
                onClick: () => {
                  action.onClick();
                  sonner.dismiss(id);
                },
              }
            : undefined
        }
        onClose={() => sonner.dismiss(id)}
      />
    ),
    { duration },
  );
}

export const dismissToast = sonner.dismiss;

const PHONE = '(max-width: 639px)';
const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(PHONE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

/** Place once in the app root. */
export function Toaster(props: ToasterProps) {
  const phone = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
  return (
    <SonnerToaster
      position={phone ? 'top-center' : 'bottom-right'}
      offset={24}
      mobileOffset={16}
      {...props}
    />
  );
}
