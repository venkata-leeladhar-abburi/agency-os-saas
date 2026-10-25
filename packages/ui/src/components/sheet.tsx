'use client';

import { X } from '@phosphor-icons/react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

const SIDES = {
  right:
    'inset-y-0 right-0 h-full w-full border-l sm:max-w-lg data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
  bottom:
    'inset-x-0 bottom-0 max-h-[90dvh] rounded-t-xl border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
} as const;

export type SheetContentProps = Omit<ComponentProps<typeof SheetPrimitive.Content>, 'title'> & {
  title: ReactNode;
  description?: ReactNode;
  side?: keyof typeof SIDES;
  /** Actions in the header next to the close button. */
  actions?: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
};

/** Opens a record without leaving the list (the lead drawer). */
export function SheetContent({
  title,
  description,
  side = 'right',
  actions,
  footer,
  closeLabel = 'Close',
  className,
  children,
  ...props
}: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-975/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <SheetPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col border-border bg-card text-card-foreground shadow-lg outline-none duration-320 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out',
          SIDES[side],
          className,
        )}
        {...(description ? {} : { 'aria-describedby': undefined })}
        {...props}
      >
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <SheetPrimitive.Title className="text-title-md">{title}</SheetPrimitive.Title>
            {description ? (
              <SheetPrimitive.Description className="mt-0.5 text-body-sm text-muted-foreground">
                {description}
              </SheetPrimitive.Description>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          <SheetPrimitive.Close
            aria-label={closeLabel}
            className="-mr-2 grid size-control-md shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors duration-120 hover:bg-accent hover:text-foreground"
          >
            <X size={18} aria-hidden="true" />
          </SheetPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
            {footer}
          </div>
        ) : null}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
