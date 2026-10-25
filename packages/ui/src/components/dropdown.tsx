'use client';

import { Check } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { DropdownMenu as Menu } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

/** Non-modal by default: the page stays readable to assistive technology while the menu is open. */
export function DropdownMenu({ modal = false, ...props }: ComponentProps<typeof Menu.Root>) {
  return <Menu.Root modal={modal} {...props} />;
}
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuGroup = Menu.Group;
export const DropdownMenuRadioGroup = Menu.RadioGroup;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = 'start',
  ...props
}: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-50 min-w-48 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md',
          'origin-(--radix-dropdown-menu-content-transform-origin) duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

const item =
  'relative flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-body outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground';

export type DropdownMenuItemProps = ComponentProps<typeof Menu.Item> & {
  icon?: Icon;
  /** Shortcut hint, e.g. "Ctrl D". */
  shortcut?: string;
  /** For destructive actions such as Delete. */
  danger?: boolean;
};

export function DropdownMenuItem({
  className,
  icon: IconComponent,
  shortcut,
  danger,
  children,
  ...props
}: DropdownMenuItemProps) {
  return (
    <Menu.Item
      className={cn(item, danger && 'text-danger data-highlighted:text-danger', className)}
      {...props}
    >
      {IconComponent ? (
        <IconComponent
          size={16}
          aria-hidden="true"
          className={cn('shrink-0', danger ? 'text-danger' : 'text-muted-foreground')}
        />
      ) : null}
      <span className="flex-1">{children}</span>
      {shortcut ? (
        <span className="font-mono text-mono-sm text-muted-foreground">{shortcut}</span>
      ) : null}
    </Menu.Item>
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem className={cn(item, 'pl-8', className)} {...props}>
      <Menu.ItemIndicator className="absolute left-2 grid size-4 place-items-center text-primary">
        <Check size={14} weight="bold" aria-hidden="true" />
      </Menu.ItemIndicator>
      {children}
    </Menu.RadioItem>
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof Menu.CheckboxItem>) {
  return (
    <Menu.CheckboxItem className={cn(item, 'pl-8', className)} {...props}>
      <Menu.ItemIndicator className="absolute left-2 grid size-4 place-items-center text-primary">
        <Check size={14} weight="bold" aria-hidden="true" />
      </Menu.ItemIndicator>
      {children}
    </Menu.CheckboxItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return (
    <Menu.Label
      className={cn('px-2 pt-1.5 pb-1 text-overline-caps text-muted-foreground', className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}
