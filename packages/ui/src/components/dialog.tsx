'use client';

import { Warning, X, type Icon } from '@phosphor-icons/react';
import { AlertDialog as AlertDialogPrimitive, Dialog as DialogPrimitive } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Button } from './button';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const overlay =
  'fixed inset-0 z-50 bg-neutral-975/55 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0';
const panel =
  'fixed top-1/2 left-1/2 z-50 w-[min(460px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg outline-none duration-320 ease-out data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95';

const ICON_TONES = {
  brand: 'bg-brand-soft text-brand-soft-foreground',
  danger: 'bg-danger-soft text-danger',
} as const;

function Head({
  icon: IconComponent,
  tone = 'brand',
  title,
  description,
  Title,
  Description,
}: {
  icon?: Icon;
  tone?: keyof typeof ICON_TONES;
  title: ReactNode;
  description?: ReactNode;
  Title: typeof DialogPrimitive.Title | typeof AlertDialogPrimitive.Title;
  Description: typeof DialogPrimitive.Description | typeof AlertDialogPrimitive.Description;
}) {
  return (
    <div className="flex gap-4 px-5 pt-5 pr-12">
      {IconComponent ? (
        <span
          className={cn('grid size-10 shrink-0 place-items-center rounded-lg', ICON_TONES[tone])}
        >
          <IconComponent size={20} aria-hidden="true" />
        </span>
      ) : null}
      <div className="min-w-0">
        <Title className="text-title-md">{title}</Title>
        {description ? (
          <Description className="mt-1 text-body text-muted-foreground">{description}</Description>
        ) : null}
      </div>
    </div>
  );
}

export type DialogContentProps = Omit<ComponentProps<typeof DialogPrimitive.Content>, 'title'> & {
  /** States the decision. */
  title: ReactNode;
  /** States the consequence. */
  description?: ReactNode;
  icon?: Icon;
  tone?: keyof typeof ICON_TONES;
  /** Buttons, right-aligned. */
  footer?: ReactNode;
  closeLabel?: string;
};

/** Focused decisions and short forms. Escape and the close button close it; focus is trapped. */
export function DialogContent({
  title,
  description,
  icon,
  tone,
  footer,
  closeLabel = 'Close',
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlay} />
      <DialogPrimitive.Content
        className={cn(panel, className)}
        {...(description ? {} : { 'aria-describedby': undefined })}
        {...props}
      >
        <Head
          icon={icon}
          tone={tone}
          title={title}
          description={description}
          Title={DialogPrimitive.Title}
          Description={DialogPrimitive.Description}
        />
        {children ? <div className="px-5 pt-4">{children}</div> : null}
        <div className="flex flex-wrap justify-end gap-2 p-5">{footer}</div>
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="absolute top-3 right-3 grid size-control-md cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors duration-120 hover:bg-accent hover:text-foreground"
        >
          <X size={18} aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export type ConfirmDialogProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The element that opens the dialog. */
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Names the action: "Delete lead", never "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** `danger` for destructive actions. */
  tone?: keyof typeof ICON_TONES;
  icon?: Icon;
  loading?: boolean;
};

/** Confirms a destructive or high-impact action. Everything else gets a toast with Undo. */
export function ConfirmDialog({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  tone = 'danger',
  icon = Warning,
  loading,
}: ConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger ? (
        <AlertDialogPrimitive.Trigger asChild>{trigger}</AlertDialogPrimitive.Trigger>
      ) : null}
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={overlay} />
        <AlertDialogPrimitive.Content className={panel}>
          <Head
            icon={icon}
            tone={tone}
            title={title}
            description={description}
            Title={AlertDialogPrimitive.Title}
            Description={AlertDialogPrimitive.Description}
          />
          <div className="flex flex-wrap justify-end gap-2 p-5">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="secondary">{cancelLabel}</Button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              <Button
                variant={tone === 'danger' ? 'destructive' : 'primary'}
                loading={loading}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
