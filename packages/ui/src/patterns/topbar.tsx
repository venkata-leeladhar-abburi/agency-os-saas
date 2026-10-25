import { CaretRight } from '@phosphor-icons/react';
import { Fragment, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import type { LinkComponent } from './link';

export type Crumb = { label: string; href?: string };

export type TopbarProps = {
  crumbs: Crumb[];
  /** Search, notifications, + New. */
  actions?: ReactNode;
  /** The menu button that opens the navigation drawer on phones. */
  leading?: ReactNode;
  linkAs?: LinkComponent;
  breadcrumbLabel?: string;
  className?: string;
};

/** The top bar: where am I (breadcrumbs) and the global actions. */
export function Topbar({
  crumbs,
  actions,
  leading,
  linkAs,
  breadcrumbLabel = 'Breadcrumb',
  className,
}: TopbarProps) {
  const Anchor = linkAs ?? 'a';
  return (
    <header
      className={cn(
        'flex h-topbar-height shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6 max-md:px-4',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {leading}
        <nav aria-label={breadcrumbLabel} className="min-w-0">
          <ol className="flex min-w-0 items-center gap-1.5 text-body-medium text-muted-foreground">
            {crumbs.map((crumb, i) => {
              const last = i === crumbs.length - 1;
              return (
                <Fragment key={`${crumb.label}-${i}`}>
                  <li className={cn('min-w-0 truncate', !last && 'max-sm:hidden')}>
                    {last || !crumb.href ? (
                      <span
                        aria-current={last ? 'page' : undefined}
                        className={cn(last && 'text-foreground')}
                      >
                        {crumb.label}
                      </span>
                    ) : (
                      <Anchor
                        href={crumb.href}
                        className="text-muted-foreground no-underline hover:text-foreground"
                      >
                        {crumb.label}
                      </Anchor>
                    )}
                  </li>
                  {!last ? (
                    <li aria-hidden="true" className="shrink-0 max-sm:hidden">
                      <CaretRight size={14} />
                    </li>
                  ) : null}
                </Fragment>
              );
            })}
          </ol>
        </nav>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
