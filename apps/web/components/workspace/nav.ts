import {
  CheckSquareOffset,
  FolderSimple,
  FunnelSimple,
  GearSix,
  House,
  Notepad,
  Question,
  Receipt,
  SquaresFour,
  UserCircle,
  UsersThree,
} from '@phosphor-icons/react';
import type { SidebarGroup, SidebarItem } from '@agency-os/ui';

/** Owner navigation from docs/02-product/information-architecture.md (R0 and R1 items). */
export function ownerNav(slug: string): SidebarGroup[] {
  const ws = (path = '') => `/w/${slug}${path}`;
  return [
    {
      items: [
        { value: 'today', label: 'Today', icon: House, href: ws() },
        { value: 'dashboard', label: 'Dashboard', icon: SquaresFour, href: ws('/dashboard') },
      ],
    },
    {
      label: 'Sell',
      items: [
        { value: 'leads', label: 'Leads', icon: FunnelSimple, href: ws('/leads') },
        { value: 'clients', label: 'Clients', icon: UsersThree, href: ws('/clients') },
        { value: 'sales', label: 'Sales docs', icon: Notepad, href: ws('/sales') },
      ],
    },
    {
      label: 'Deliver',
      items: [
        { value: 'projects', label: 'Projects', icon: FolderSimple, href: ws('/projects') },
        { value: 'tasks', label: 'Tasks', icon: CheckSquareOffset, href: ws('/tasks') },
      ],
    },
    {
      label: 'Money',
      items: [{ value: 'invoices', label: 'Invoices', icon: Receipt, href: ws('/invoices') }],
    },
    {
      label: 'Agency',
      items: [
        { value: 'team', label: 'Team', icon: UserCircle, href: ws('/team') },
        { value: 'settings', label: 'Settings', icon: GearSix, href: ws('/settings') },
      ],
    },
  ];
}

export function footerNav(slug: string): SidebarItem[] {
  return [{ value: 'help', label: 'Help', icon: Question, href: `/w/${slug}/help` }];
}

export const SECTION_LABELS: Record<string, string> = {
  today: 'Today',
  dashboard: 'Dashboard',
  leads: 'Leads',
  clients: 'Clients',
  sales: 'Sales docs',
  projects: 'Projects',
  tasks: 'Tasks',
  invoices: 'Invoices',
  team: 'Team',
  settings: 'Settings',
  help: 'Help',
};
