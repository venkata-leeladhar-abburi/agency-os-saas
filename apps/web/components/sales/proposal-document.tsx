import { Flag } from '@phosphor-icons/react/dist/ssr';
import { formatDate, type InvoiceTotals, type ProposalBlock } from '@agency-os/core';
import { Badge, BrandTile, InvoiceSummary } from '@agency-os/ui';
import type { ReactNode } from 'react';

function Section({
  title,
  placeholder,
  children,
}: {
  title: string;
  placeholder?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-2" aria-label={title}>
      <h2 className="flex items-center gap-2 text-title-sm">
        {title}
        {placeholder ? (
          <Badge size="sm" tone="warning">
            Fill this in
          </Badge>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

/**
 * A proposal as the client reads it. `forClient` hides blocks still showing the template's
 * placeholder text; the agency's preview shows them marked "Fill this in".
 */
export function ProposalDocument({
  blocks,
  workspace,
  validUntil,
  totals,
  forClient,
  signSlot,
}: {
  blocks: ProposalBlock[];
  workspace: string;
  validUntil: string;
  totals: InvoiceTotals;
  forClient?: boolean;
  /** What goes in the "Accept and sign" block: the signing panel, or a note in the preview. */
  signSlot?: ReactNode;
}) {
  return (
    <div className="grid gap-8">
      {blocks.map((b, i) => {
        const key = `${b.type}-${i}`;
        const placeholder = 'placeholder' in b && b.placeholder;
        if (forClient && placeholder) return null;
        switch (b.type) {
          case 'cover':
            return (
              <header key={key} className="grid gap-3 border-b border-border pb-6">
                <span className="flex items-center gap-2.5 text-body font-semibold">
                  <BrandTile />
                  {workspace}
                </span>
                {/* The page's own heading in the client's view; a styled line in the agency's preview. */}
                {forClient ? (
                  <h1 className="text-title-xl">{b.title}</h1>
                ) : (
                  <p className="text-title-xl">{b.title}</p>
                )}
                <p className="text-body text-muted-foreground">
                  {formatDate(b.date)} · Prepared by {b.preparedBy} · valid until{' '}
                  {formatDate(validUntil)}
                </p>
              </header>
            );
          case 'text':
            return (
              <Section key={key} title={b.heading} placeholder={placeholder}>
                <p
                  className={
                    placeholder
                      ? 'text-body text-muted-foreground italic'
                      : 'text-body-lg whitespace-pre-line'
                  }
                >
                  {b.body}
                </p>
              </Section>
            );
          case 'list':
            return (
              <Section key={key} title={b.heading} placeholder={placeholder}>
                <ul
                  className={`grid list-disc gap-1 pl-5 ${placeholder ? 'text-body text-muted-foreground italic' : 'text-body-lg'}`}
                >
                  {b.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Section>
            );
          case 'scope':
            return (
              <Section key={key} title={b.heading}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-body-medium">Included</p>
                    <ul className="grid list-disc gap-1 pl-5 text-body">
                      {b.included.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  {b.excluded.length ? (
                    <div>
                      <p className="mb-1 text-body-medium">Not included</p>
                      <ul className="grid list-disc gap-1 pl-5 text-body text-muted-foreground">
                        {b.excluded.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </Section>
            );
          case 'timeline':
            return (
              <Section key={key} title={b.heading}>
                <ol className="grid gap-1 p-0">
                  {b.phases.map((p) => (
                    <li
                      key={p.name}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-body last:border-0"
                    >
                      <span className="font-medium">{p.name}</span>
                      {p.clientSignOff ? (
                        <Badge size="sm" tone="brand" icon={Flag}>
                          Your sign-off
                        </Badge>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </Section>
            );
          case 'price':
            return (
              <Section key={key} title={b.heading}>
                <InvoiceSummary type="Quote" totals={totals} />
              </Section>
            );
          case 'sign':
            return signSlot ? (
              <Section key={key} title={b.heading}>
                {signSlot}
              </Section>
            ) : null;
        }
      })}
    </div>
  );
}
