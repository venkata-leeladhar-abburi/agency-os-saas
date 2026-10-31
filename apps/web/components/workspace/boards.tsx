'use client';

// The boards with drag-and-drop, kept apart from the tables so pages without a board don't load it.
import { Avatar, PipelineBoard, type PipelineColumn } from '@agency-os/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { TaskRow } from '@/lib/data/tasks';
import { moveLeadAction } from '@/app/w/[workspace]/leads/actions';

/** The leads board: open a card, add a lead, move a card to change its stage. */
export function LeadsBoard({
  columns,
  base,
  size,
}: {
  columns: PipelineColumn[];
  /** The leads path: /w/<workspace>/leads. */
  base: string;
  size?: 'sm' | 'md';
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <PipelineBoard
      columns={columns}
      size={size}
      // On the leads page the columns sit right under the page heading; on the dashboard, in a card.
      headingLevel={size === 'sm' ? 3 : 2}
      onOpen={(id) => router.push(`${base}/${id}`)}
      onAddLead={size === 'sm' ? undefined : () => router.push(`${base}/new`)}
      onMove={(id, to) => {
        // Lost needs a reason, so it opens the lead to ask for one.
        if (to === 'lost') return router.push(`${base}/${id}?lost=1`);
        startTransition(async () => {
          const next = await moveLeadAction(base.split('/')[2]!, id, to);
          if (next) router.push(`${base.replace(/\/leads$/, '')}/${next}`);
          else router.refresh();
        });
      }}
    />
  );
}

const STATUS_COLUMNS = ['To do', 'In progress', 'In review', 'Done'] as const;

export function TaskBoard({ rows, base }: { rows: TaskRow[]; base: string }) {
  return (
    <div
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard (WCAG 2.1.1)
      tabIndex={0}
      role="region"
      aria-label="Task board"
      className="grid auto-cols-[minmax(220px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2"
    >
      {STATUS_COLUMNS.map((col) => {
        const list = rows.filter((t) => t.status === col);
        return (
          <section
            key={col}
            aria-label={col}
            className="grid content-start gap-2 rounded-lg bg-muted p-2"
          >
            <header className="flex items-center gap-1.5 px-1.5 pt-1 text-body-sm font-semibold">
              {col}
              <span className="rounded-full bg-card px-1.5 text-caption leading-4.5 text-muted-foreground">
                {list.length}
              </span>
            </header>
            <ul className="grid gap-2 p-0">
              {list.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`${base}/${t.id}`}
                    className="grid gap-2 rounded-md border border-border bg-card p-3 text-foreground no-underline shadow-xs hover:border-border-strong"
                  >
                    <span className="text-body font-medium">{t.title}</span>
                    <span className="text-caption font-normal text-muted-foreground">
                      {t.project}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <Avatar name={t.assignee} size="xs" />
                      <span
                        className={
                          t.overdue
                            ? 'text-caption font-medium text-danger'
                            : 'text-caption font-normal text-muted-foreground'
                        }
                      >
                        {t.due}
                      </span>
                    </span>
                    {t.subtasks || t.comments ? (
                      <span className="text-caption font-normal text-muted-foreground">
                        {[
                          t.subtasks ? `${t.subtasks} subtasks` : null,
                          t.comments
                            ? `${t.comments} ${t.comments === 1 ? 'comment' : 'comments'}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
