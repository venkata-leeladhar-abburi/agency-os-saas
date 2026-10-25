import type { Icon } from '@phosphor-icons/react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type CardProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title?: ReactNode;
  description?: ReactNode;
  icon?: Icon;
  /** Buttons or links at the top right. */
  actions?: ReactNode;
  /** The body runs edge to edge, for tables and lists. */
  flush?: boolean;
  /** Heading level for the title. */
  as?: 'h2' | 'h3' | 'h4';
};

/** The basic surface: card colour, 1px border, radius-lg, no shadow. Don't nest cards. */
export function Card({
  title,
  description,
  icon: IconComponent,
  actions,
  flush,
  as: Heading = 'h2',
  className,
  children,
  ...props
}: CardProps) {
  const hasHead = Boolean(title || description || actions);
  return (
    <section
      className={cn(
        'min-w-0 rounded-lg border border-border bg-card text-card-foreground',
        className,
      )}
      {...props}
    >
      {hasHead ? (
        <div className="flex items-start justify-between gap-3 px-5 pt-4 max-sm:px-4">
          <div className="min-w-0">
            {title ? (
              <Heading className="flex items-center gap-2 text-title-sm">
                {IconComponent ? (
                  <IconComponent
                    size={18}
                    aria-hidden="true"
                    className="shrink-0 text-muted-foreground"
                  />
                ) : null}
                {title}
              </Heading>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-body-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div
        className={cn(
          flush ? 'pt-3' : 'px-5 pt-4 pb-5 max-sm:px-4 max-sm:pb-4',
          !hasHead && !flush && 'pt-5 max-sm:pt-4',
          !hasHead && flush && 'pt-0',
        )}
      >
        {children}
      </div>
    </section>
  );
}
