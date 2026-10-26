'use client';

import { ChartLineUp } from '@phosphor-icons/react';
import { Button, buttonVariants, Dialog, DialogContent } from '@agency-os/ui';
import Link from 'next/link';
import { useState } from 'react';
import type { LimitInfo } from '@/lib/data/plan';

/**
 * Shown only at a limit, never before. Existing records stay viewable and exportable, so the
 * dialog says so and offers the plans with room.
 */
export function PlanLimitDialog({ limit, slug }: { limit?: LimitInfo; slug: string }) {
  // Closing hides this limit; a new attempt (a new `at`) opens the dialog again.
  const [closedAt, setClosedAt] = useState<number | null>(null);
  const open = Boolean(limit) && closedAt !== limit!.at;
  if (!limit) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : setClosedAt(limit.at))}>
      <DialogContent
        icon={ChartLineUp}
        title={limit.title}
        description={`${limit.message} Everything you have stays viewable and exportable.`}
        footer={
          <>
            <Button onClick={() => setClosedAt(limit.at)}>Not now</Button>
            <Link
              href={`/w/${slug}/settings/plan`}
              className={buttonVariants({ variant: 'primary' })}
            >
              See plans
            </Link>
          </>
        }
      >
        {limit.plans.length ? (
          <ul className="grid gap-2 p-0">
            {limit.plans.map((p) => (
              <li
                key={p.name}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <span className="grid">
                  <span className="text-body-medium">{p.name}</span>
                  <span className="text-caption font-normal text-muted-foreground">{p.detail}</span>
                </span>
                <span className="text-body font-semibold whitespace-nowrap tabular-nums">
                  {p.price}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
