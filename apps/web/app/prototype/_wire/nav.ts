import {
  Bell,
  ChatCircleDots,
  CheckSquareOffset,
  Files,
  Flag,
  FolderSimple,
  FunnelSimple,
  GearSix,
  House,
  Notepad,
  Question,
  Receipt,
  SealCheck,
  SquaresFour,
  Sun,
  UserCircle,
  UsersThree,
  Wallet,
} from '@phosphor-icons/react';
import type { SidebarGroup, SidebarItem } from '@agency-os/ui';

export type Role = 'owner' | 'lead' | 'member' | 'finance';

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  lead: 'Project lead',
  member: 'Member',
  finance: 'Finance',
};

const href = (screen: string) => `/prototype/${screen}`;

/** Navigation per role, from docs/02-product/information-architecture.md (R0 and R1 items only). */
export const NAV: Record<Role, SidebarGroup[]> = {
  owner: [
    {
      items: [
        { value: 'today', label: 'Today', icon: House, href: href('s10-today') },
        { value: 'dashboard', label: 'Dashboard', icon: SquaresFour, href: href('s11-dashboard') },
      ],
    },
    {
      label: 'Sell',
      items: [
        {
          value: 'leads',
          label: 'Leads',
          icon: FunnelSimple,
          href: href('s12-leads-board'),
          count: 7,
          alert: true,
        },
        { value: 'clients', label: 'Clients', icon: UsersThree, href: href('s22-clients') },
        {
          value: 'sales-docs',
          label: 'Sales docs',
          icon: Notepad,
          href: href('s19-proposal-builder'),
        },
      ],
    },
    {
      label: 'Deliver',
      items: [
        {
          value: 'projects',
          label: 'Projects',
          icon: FolderSimple,
          href: href('s24-projects'),
          count: 9,
        },
        { value: 'tasks', label: 'Tasks', icon: CheckSquareOffset, href: href('s28-tasks') },
      ],
    },
    {
      label: 'Money',
      items: [
        {
          value: 'invoices',
          label: 'Invoices',
          icon: Receipt,
          href: href('s32-invoices'),
          count: 2,
        },
        { value: 'payments', label: 'Payments', icon: Wallet, href: href('s35-record-payment') },
      ],
    },
    {
      label: 'Agency',
      items: [
        { value: 'team', label: 'Team', icon: UserCircle, href: href('s36-team') },
        { value: 'settings', label: 'Settings', icon: GearSix, href: href('s07-settings') },
      ],
    },
  ],
  lead: [
    {
      items: [
        { value: 'today', label: 'Today', icon: House, href: href('s10-today') },
        {
          value: 'projects',
          label: 'My projects',
          icon: FolderSimple,
          href: href('s24-projects'),
          count: 4,
        },
        { value: 'tasks', label: 'Tasks', icon: CheckSquareOffset, href: href('s28-tasks') },
        {
          value: 'approvals',
          label: 'Approvals',
          icon: Flag,
          href: href('s27-phases'),
          count: 2,
          alert: true,
        },
        { value: 'messages', label: 'Messages', icon: ChatCircleDots, href: href('s31-messages') },
        { value: 'settings', label: 'Settings', icon: GearSix, href: href('s07-settings') },
      ],
    },
  ],
  member: [
    {
      items: [
        { value: 'today', label: 'My day', icon: Sun, href: href('s37-my-day') },
        {
          value: 'tasks',
          label: 'My tasks',
          icon: CheckSquareOffset,
          href: href('s28-tasks'),
          count: 5,
        },
        { value: 'projects', label: 'Projects', icon: FolderSimple, href: href('s24-projects') },
        { value: 'messages', label: 'Messages', icon: ChatCircleDots, href: href('s31-messages') },
      ],
    },
  ],
  finance: [
    {
      items: [
        { value: 'dashboard', label: 'Dashboard', icon: SquaresFour, href: href('s11-dashboard') },
        { value: 'invoices', label: 'Invoices', icon: Receipt, href: href('s32-invoices') },
        { value: 'payments', label: 'Payments', icon: Wallet, href: href('s35-record-payment') },
        { value: 'clients', label: 'Clients', icon: UsersThree, href: href('s22-clients') },
        { value: 'settings', label: 'Settings', icon: GearSix, href: href('s07-settings') },
      ],
    },
  ],
};

export const FOOTER: SidebarItem[] = [
  { value: 'help', label: 'Help', icon: Question, href: href('s03-onboarding') },
];

export const PORTAL_TABS = [
  { value: 'home', label: 'Home', icon: House, href: href('s38-portal-home') },
  { value: 'project', label: 'Project', icon: FolderSimple, href: href('s39-portal-project') },
  { value: 'payments', label: 'Payments', icon: Receipt, href: href('s40-portal-invoices') },
  { value: 'messages', label: 'Messages', icon: ChatCircleDots, href: href('s41-portal-messages') },
];

export { Bell, Files, SealCheck };
