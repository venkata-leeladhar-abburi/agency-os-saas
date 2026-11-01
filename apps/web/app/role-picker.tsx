'use client';

import {
  ArrowRight,
  CheckSquareOffset,
  Flag,
  Handshake,
  Receipt,
  SquaresFour,
  type Icon,
} from '@phosphor-icons/react';
import { Button, Card } from '@agency-os/ui';
import { PEOPLE } from '@agency-os/ui/example';
import Link from 'next/link';
import { ROLE_COOKIE, type Role } from './prototype/_wire/role';

type View = {
  /** An agency role, or the client in the portal. */
  role: Role | 'client';
  title: string;
  person: string;
  icon: Icon;
  description: string;
  /** The screen the view opens on: that person's home. */
  screen: string;
  action: string;
};

const VIEWS: View[] = [
  {
    role: 'owner',
    title: 'Owner',
    person: PEOPLE.owner,
    icon: SquaresFour,
    description:
      'Runs the agency. Revenue, the leads pipeline, projects at risk and team load, with every part of the app in the sidebar.',
    screen: 's11-dashboard',
    action: 'Open the owner dashboard',
  },
  {
    role: 'lead',
    title: 'Project lead',
    person: PEOPLE.designer,
    icon: Flag,
    description:
      'Runs client projects. Today’s follow-ups, tasks, approvals waiting on clients and project messages.',
    screen: 's10-today',
    action: 'Open the project lead view',
  },
  {
    role: 'member',
    title: 'Team member',
    person: PEOPLE.developer,
    icon: CheckSquareOffset,
    description: 'Does the work. Their tasks for the day, their projects and the daily update.',
    screen: 's37-my-day',
    action: 'Open the team member view',
  },
  {
    role: 'finance',
    title: 'Finance',
    person: PEOPLE.pm,
    icon: Receipt,
    description:
      'Looks after the money. Invoices with GST, payments received and the ones that are overdue.',
    screen: 's32-invoices',
    action: 'Open the finance view',
  },
  {
    role: 'client',
    title: 'Client',
    person: PEOPLE.client,
    icon: Handshake,
    description:
      'The agency’s client, in the client portal. Follows the project, approves work, pays invoices and sends messages.',
    screen: 's38-portal-home',
    action: 'Open the client portal',
  },
];

function remember(role: View['role'] | undefined) {
  document.cookie =
    role && role !== 'client'
      ? `${ROLE_COOKIE}=${role}; path=/; SameSite=Lax`
      : `${ROLE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/** The home page's way into the product: one view per role, each opening that person's home. */
export function RolePicker() {
  return (
    <section aria-labelledby="views" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="views" className="text-title-md text-foreground">
          Choose a view
        </h2>
        <p className="max-w-prose text-body-sm text-muted-foreground">
          Each view opens that person’s home. Move around with the sidebar; the view stays until you
          choose another. Example data: nothing is saved yet.
        </p>
      </div>
      <ul className="grid gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {VIEWS.map((view) => {
          const query = view.role === 'client' ? '' : `?as=${view.role}`;
          return (
            <li key={view.role} className="grid">
              <Card
                as="h3"
                icon={view.icon}
                title={view.title}
                description={`Example: ${view.person}`}
                className="grid grid-rows-[auto_1fr]"
              >
                <div className="grid h-full content-between gap-4">
                  <p className="text-body-sm text-muted-foreground">{view.description}</p>
                  <Button asChild iconRight={ArrowRight} className="justify-self-start">
                    <Link
                      href={`/prototype/${view.screen}${query}`}
                      onClick={() => remember(view.role)}
                    >
                      {view.action}
                    </Link>
                  </Button>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
      <p className="text-body-sm text-muted-foreground">
        Looking for one screen?{' '}
        <Link
          href="/prototype"
          className="text-link underline decoration-1 underline-offset-3"
          onClick={() => remember(undefined)}
        >
          See all 42 screens
        </Link>
      </p>
    </section>
  );
}
