'use client';

import { CaretDown, Check, Plus, SignOut } from '@phosphor-icons/react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@agency-os/ui';
import { ROLE_LABELS, type Role } from '@agency-os/core';
import Link from 'next/link';
import { switchWorkspace } from './actions';

type Workspace = { id: string; name: string; role: string };

export function WorkspaceSwitcher({
  workspaces,
  activeId,
}: {
  workspaces: Workspace[];
  activeId: string;
}) {
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0]!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          iconRight={CaretDown}
          aria-label={`Workspace: ${active.name}. Switch workspace`}
        >
          {active.name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Your workspaces</DropdownMenuLabel>
        {workspaces.map((w) => (
          <form key={w.id} action={switchWorkspace}>
            <input type="hidden" name="workspaceId" value={w.id} />
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full">
                <span className="flex-1 text-left">{w.name}</span>
                <span className="text-caption text-muted-foreground">
                  {ROLE_LABELS[w.role as Role] ?? w.role}
                </span>
                {w.id === activeId ? <Check size={14} aria-label="Current workspace" /> : null}
              </button>
            </DropdownMenuItem>
          </form>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/setup">
            <Plus size={14} aria-hidden="true" />
            New workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserMenu({ email }: { email: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" iconRight={CaretDown}>
          {email || 'Account'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <form action="/auth/sign-out" method="post">
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <SignOut size={14} aria-hidden="true" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
        <form action="/auth/sign-out" method="post">
          <input type="hidden" name="scope" value="global" />
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <SignOut size={14} aria-hidden="true" />
              Sign out of all devices
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
