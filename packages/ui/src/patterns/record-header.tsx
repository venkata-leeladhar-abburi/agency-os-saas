import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { Avatar } from '../components/avatar';
import { Badge, type BadgeProps } from '../components/badge';
import { cn } from '../lib/cn';

export type RecordHeaderProps = {
  title: string;
  /** Shows a company avatar from the title. */
  avatar?: boolean;
  icon?: Icon;
  status?: string;
  statusTone?: BadgeProps['tone'];
  meta?: { icon: Icon; text: ReactNode }[];
  /** Secondary actions first, one primary last. */
  actions?: ReactNode;
  className?: string;
};

/** The top of every record page: name, status, meta and the record's actions. */
export function RecordHeader({
  title,
  avatar,
  icon: IconComponent,
  status,
  statusTone = 'neutral',
  meta = [],
  actions,
  className,
}: RecordHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-4">
        {avatar ? <Avatar name={title} size="lg" /> : null}
        {IconComponent && !avatar ? (
          <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-soft-foreground">
            <IconComponent size={24} aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title-lg">{title}</h1>
            {status ? (
              <Badge tone={statusTone} dot>
                {status}
              </Badge>
            ) : null}
          </div>
          {meta.length ? (
            <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 p-0 text-body-sm text-muted-foreground">
              {meta.map(({ icon: MetaIcon, text }, i) => (
                <li key={i} className="inline-flex items-center gap-1.5">
                  <MetaIcon size={14} aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
