'use client';

import { Bell } from '@phosphor-icons/react';
import {
  Button,
  EmptyState,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
} from '@agency-os/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  markAllReadAction,
  markReadAction,
  notificationsAction,
} from '@/app/w/[workspace]/notification-actions';
import type { NotificationRow } from '@/lib/data/notifications';

/** The bell in the top bar: what happened since you last looked; each item opens its record. */
export function NotificationBell({ slug, unread }: { slug: string; unread: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  const [, start] = useTransition();

  const show = (next: boolean) => {
    setOpen(next);
    if (next) void notificationsAction(slug).then((r) => setRows(r.rows));
  };

  const openRow = (row: NotificationRow) => {
    setOpen(false);
    start(async () => {
      if (!row.read) await markReadAction(slug, row.id);
      router.push(row.href);
    });
  };

  return (
    <Popover open={open} onOpenChange={show}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          className="relative grid size-control-md cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Bell size={20} aria-hidden="true" />
          {unread ? (
            <span
              aria-hidden="true"
              className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-32px))] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-title-sm">Notifications</h2>
          <Button
            size="sm"
            variant="ghost"
            disabled={!rows?.some((r) => !r.read)}
            onClick={() =>
              start(async () => {
                await markAllReadAction(slug);
                setRows((r) => r?.map((x) => ({ ...x, read: true })) ?? null);
              })
            }
          >
            Mark all read
          </Button>
        </div>
        {rows === null ? (
          <div role="status" aria-label="Loading notifications" className="grid gap-3 p-4">
            {[0, 1, 2].map((k) => (
              <span key={k} className="grid gap-1.5">
                <Skeleton width="70%" />
                <Skeleton width="30%" height={10} />
              </span>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState compact icon={Bell} title="No notifications yet">
            New enquiries, signed proposals, approvals and payments show up here.
          </EmptyState>
        ) : (
          <ul className="max-h-96 overflow-y-auto p-1">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => openRow(row)}
                  className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-start gap-3 rounded-md px-3 py-2.5 text-left hover:bg-accent"
                >
                  <span className="grid min-w-0">
                    <span className={row.read ? 'text-body' : 'text-body font-semibold'}>
                      {row.title}
                    </span>
                    <span className="truncate text-caption font-normal text-muted-foreground">
                      {row.detail} · {row.when}
                    </span>
                  </span>
                  {row.read ? null : (
                    <span className="mt-1.5 size-2 rounded-full bg-primary">
                      <span className="sr-only">Unread</span>
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-border px-4 py-2.5">
          <Link
            href={`/w/${slug}/settings/notifications`}
            onClick={() => setOpen(false)}
            className="text-body-sm font-medium"
          >
            Notification settings
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
