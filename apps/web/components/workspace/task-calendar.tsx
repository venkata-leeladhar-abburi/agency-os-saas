import { CaretLeft, CaretRight } from '@phosphor-icons/react/dist/ssr';
import { formatDate } from '@agency-os/core';
import Link from 'next/link';
import type { TaskRow } from '@/lib/data/tasks';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** "2026-10" → the month before or after. */
function shift(month: string, by: number) {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

/** The month's weeks, Monday first, as YYYY-MM-DD (days outside the month included). */
function weeksOf(month: string) {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7));
  const weeks: string[][] = [];
  const day = new Date(start);
  do {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day.toISOString().slice(0, 10));
      day.setUTCDate(day.getUTCDate() + 1);
    }
    weeks.push(week);
  } while (day.toISOString().slice(0, 7) === month);
  return weeks;
}

const monthName = (month: string) =>
  new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month}-01T00:00:00Z`),
  );

function TaskChip({ t, base }: { t: TaskRow; base: string }) {
  const tone =
    t.status === 'Done'
      ? 'text-muted-foreground line-through'
      : t.overdue
        ? 'bg-danger-soft text-foreground'
        : 'bg-brand-soft text-brand-soft-foreground';
  return (
    <Link
      href={`${base}/${t.id}`}
      className={`block truncate rounded-xs px-1.5 py-0.5 text-caption no-underline ${tone}`}
      title={`${t.title} · ${t.assignee}`}
    >
      {t.overdue && t.status !== 'Done' ? <span className="sr-only">Late: </span> : null}
      {t.title}
    </Link>
  );
}

/**
 * Tasks by due date, a month at a time: a grid on wider screens, a list of days on phones.
 * Tasks without a due date are counted, with a link to the table.
 */
export function TaskCalendar({
  rows,
  base,
  month,
  today,
  link,
}: {
  rows: TaskRow[];
  base: string;
  /** YYYY-MM */
  month: string;
  /** YYYY-MM-DD, in the workspace's time zone */
  today: string;
  /** The page's link for another month (keeps the other filters). */
  link: (month: string) => string;
}) {
  const byDay = new Map<string, TaskRow[]>();
  for (const t of rows) if (t.dueOn) byDay.set(t.dueOn, [...(byDay.get(t.dueOn) ?? []), t]);
  const undated = rows.filter((t) => !t.dueOn && t.status !== 'Done').length;
  const weeks = weeksOf(month);
  const days = weeks.flat().filter((d) => d.startsWith(month) && byDay.has(d));
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title-sm">{monthName(month)}</h2>
        <nav aria-label="Months" className="flex items-center gap-1">
          <Link
            href={link(shift(month, -1))}
            className="inline-flex min-h-control-lg items-center gap-1 rounded-md px-2 text-body-medium"
          >
            <CaretLeft size={16} aria-hidden="true" /> {monthName(shift(month, -1))}
          </Link>
          {today.slice(0, 7) !== month ? (
            <Link
              href={link(today.slice(0, 7))}
              className="inline-flex min-h-control-lg items-center rounded-md px-2 text-body-medium"
            >
              This month
            </Link>
          ) : null}
          <Link
            href={link(shift(month, 1))}
            className="inline-flex min-h-control-lg items-center gap-1 rounded-md px-2 text-body-medium"
          >
            {monthName(shift(month, 1))} <CaretRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
        <table className="w-full table-fixed border-collapse text-body-sm">
          <caption className="sr-only">Tasks due in {monthName(month)}</caption>
          <thead>
            <tr className="bg-muted text-caption text-muted-foreground">
              {WEEKDAYS.map((d) => (
                <th key={d} scope="col" className="px-2 py-2 text-left font-medium">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0]}>
                {week.map((d) => {
                  const inMonth = d.startsWith(month);
                  const list = byDay.get(d) ?? [];
                  return (
                    <td
                      key={d}
                      className="h-24 border-t border-l border-border px-2 py-1.5 align-top first:border-l-0"
                    >
                      <span
                        className={`text-caption ${
                          d === today
                            ? 'rounded-full bg-primary px-1.5 text-primary-foreground'
                            : inMonth
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                        }`}
                      >
                        <span className="sr-only">{formatDate(d)}</span>
                        <span aria-hidden="true">{Number(d.slice(8))}</span>
                      </span>
                      {list.length ? (
                        <ul className="mt-1 grid gap-1 p-0">
                          {list.slice(0, 3).map((t) => (
                            <li key={t.id}>
                              <TaskChip t={t} base={base} />
                            </li>
                          ))}
                          {list.length > 3 ? (
                            <li className="text-caption text-muted-foreground">
                              {list.length - 3} more
                            </li>
                          ) : null}
                        </ul>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {days.length === 0 ? (
          <p className="text-body text-muted-foreground">Nothing due in {monthName(month)}.</p>
        ) : (
          days.map((d) => (
            <section key={d} aria-labelledby={`day-${d}`} className="grid gap-1">
              <h3 id={`day-${d}`} className="text-overline-caps text-muted-foreground">
                {d === today ? `Today · ${formatDate(d)}` : formatDate(d)}
              </h3>
              <ul className="grid gap-1 p-0">
                {byDay.get(d)!.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`${base}/${t.id}`}
                      className="grid min-h-control-xl gap-0.5 rounded-lg border border-border bg-card px-3 py-2 text-foreground no-underline"
                    >
                      <span
                        className={`text-body font-medium ${t.status === 'Done' ? 'line-through' : ''}`}
                      >
                        {t.title}
                      </span>
                      <span className="text-body-sm text-muted-foreground">
                        {[t.project, t.assignee, t.overdue && t.status !== 'Done' ? 'Late' : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {undated ? (
        <p className="text-body-sm text-muted-foreground">
          {undated} open {undated === 1 ? 'task has' : 'tasks have'} no due date.{' '}
          <Link href={`${base}?view=table`}>See them in the table</Link>
        </p>
      ) : null}
    </div>
  );
}
