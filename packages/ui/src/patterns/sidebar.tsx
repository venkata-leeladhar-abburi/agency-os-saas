'use client';

import { CaretUpDown, MagnifyingGlass, type Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { Avatar } from '../components/avatar';
import { Kbd } from '../components/kbd';
import { Tooltip } from '../components/tooltip';
import { cn } from '../lib/cn';
import type { LinkComponent } from './link';
import { BrandTile } from './logo';

export type SidebarItem = {
  value: string;
  label: string;
  icon: Icon;
  href: string;
  count?: number;
  /** The count needs action: shown in violet. */
  alert?: boolean;
};

export type SidebarGroup = { label?: string; items: SidebarItem[] };

export type SidebarProps = {
  workspace: { name: string; plan?: string };
  groups: SidebarGroup[];
  /** Items pinned to the bottom, such as Help. */
  footerItems?: SidebarItem[];
  active?: string;
  user?: { name: string; role: string };
  collapsed?: boolean;
  onSearch?: () => void;
  onSwitchWorkspace?: () => void;
  linkAs?: LinkComponent;
  labels?: {
    search?: string;
    searchShortcut?: string;
    switchWorkspace?: string;
    navigation?: string;
    /** Names the sidebar landmark. */
    sidebar?: string;
  };
  className?: string;
  /** Extra content above the footer, such as the onboarding checklist link. */
  children?: ReactNode;
};

function Item({
  item,
  active,
  collapsed,
  linkAs: LinkAs,
}: {
  item: SidebarItem;
  active: boolean;
  collapsed: boolean;
  linkAs?: LinkComponent;
}) {
  const { icon: IconComponent } = item;
  const Anchor = LinkAs ?? 'a';
  const link = (
    <Anchor
      href={item.href}
      aria-current={active ? 'page' : undefined}
      aria-label={
        collapsed ? (item.count ? `${item.label}, ${item.count}` : item.label) : undefined
      }
      className={cn(
        'flex h-8.5 items-center gap-2.5 rounded-sm px-2.5 text-body-medium text-sidebar-foreground no-underline transition-[background-color,color] duration-120 hover:bg-accent hover:text-foreground',
        active &&
          'bg-sidebar-active text-sidebar-active-foreground shadow-sm ring-1 ring-border hover:bg-sidebar-active',
        collapsed && 'justify-center px-0',
      )}
    >
      <IconComponent
        size={18}
        weight={active ? 'fill' : 'regular'}
        aria-hidden="true"
        className={cn('shrink-0', active && 'text-primary')}
      />
      {collapsed ? null : <span className="min-w-0 flex-1 truncate">{item.label}</span>}
      {!collapsed && item.count !== undefined ? (
        <span
          className={cn(
            'min-w-5 shrink-0 rounded-full px-1.5 text-center text-caption leading-4.5 tabular-nums',
            item.alert ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {item.count}
        </span>
      ) : null}
    </Anchor>
  );
  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

/** The app's main navigation, grouped by how each role works. */
export function Sidebar({
  workspace,
  groups,
  footerItems = [],
  active,
  user,
  collapsed = false,
  onSearch,
  onSwitchWorkspace,
  linkAs,
  labels,
  className,
  children,
}: SidebarProps) {
  return (
    // A landmark, so the workspace switcher and the signed-in person aren't outside every region.
    <aside
      aria-label={labels?.sidebar ?? 'Sidebar'}
      className={cn(
        'flex h-full flex-col gap-4 border-r border-border bg-sidebar p-3 text-sidebar-foreground',
        collapsed ? 'w-sidebar-collapsed items-stretch' : 'w-sidebar-width',
        className,
      )}
    >
      <button
        type="button"
        onClick={onSwitchWorkspace}
        aria-label={
          collapsed
            ? `${labels?.switchWorkspace ?? 'Switch workspace'}: ${workspace.name}`
            : undefined
        }
        className={cn(
          'flex cursor-pointer items-center gap-2.5 rounded-md p-1.5 text-left transition-colors duration-120 hover:bg-accent',
          collapsed && 'justify-center',
        )}
      >
        <BrandTile />
        {collapsed ? null : (
          <>
            <span className="grid min-w-0 flex-1 leading-4">
              <span className="truncate text-body font-semibold text-foreground">
                {workspace.name}
              </span>
              {workspace.plan ? (
                <span className="text-caption font-normal text-muted-foreground">
                  {workspace.plan}
                </span>
              ) : null}
            </span>
            <CaretUpDown size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
            <span className="sr-only">{labels?.switchWorkspace ?? 'Switch workspace'}</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onSearch}
        aria-label={collapsed ? (labels?.search ?? 'Search') : undefined}
        className={cn(
          'flex h-8.5 cursor-pointer items-center gap-2 rounded-md border border-border bg-card pr-2 pl-2.5 text-body text-muted-foreground shadow-xs transition-colors duration-120 hover:text-foreground',
          collapsed && 'justify-center px-0',
        )}
      >
        <MagnifyingGlass size={16} aria-hidden="true" className="shrink-0" />
        {collapsed ? null : (
          <>
            <span className="flex-1 text-left">{labels?.search ?? 'Search'}</span>
            <Kbd>{labels?.searchShortcut ?? 'Ctrl K'}</Kbd>
          </>
        )}
      </button>

      <nav
        aria-label={labels?.navigation ?? 'Main'}
        className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1"
      >
        {groups.map((group, i) => (
          <div key={group.label ?? i} className="grid gap-px">
            {group.label && !collapsed ? (
              <p className="mb-1 px-2.5 text-overline-caps text-muted-foreground">{group.label}</p>
            ) : null}
            {group.label && collapsed && i > 0 ? <hr className="mx-2 mb-1 border-border" /> : null}
            {group.items.map((item) => (
              <Item
                key={item.value}
                item={item}
                active={item.value === active}
                collapsed={collapsed}
                linkAs={linkAs}
              />
            ))}
          </div>
        ))}
        {children}
        <div className="mt-auto grid gap-px">
          {footerItems.map((item) => (
            <Item
              key={item.value}
              item={item}
              active={item.value === active}
              collapsed={collapsed}
              linkAs={linkAs}
            />
          ))}
        </div>
      </nav>

      {user ? (
        <div
          className={cn(
            'flex items-center gap-2.5 border-t border-border px-1.5 pt-2',
            collapsed && 'justify-center px-0',
          )}
        >
          <Avatar name={user.name} size="md" />
          {collapsed ? null : (
            <span className="grid min-w-0 leading-4">
              <span className="truncate text-body-sm font-semibold text-foreground">
                {user.name}
              </span>
              <span className="text-caption font-normal text-muted-foreground">{user.role}</span>
            </span>
          )}
        </div>
      ) : null}
    </aside>
  );
}
