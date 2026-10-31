import { Check, Square } from '@phosphor-icons/react/dist/ssr';
import { Fragment } from 'react';
import { parseMarkdown, type Inline } from '@/lib/markdown';

function Inlines({ nodes }: { nodes: Inline[] }) {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text':
        return <Fragment key={i}>{n.v}</Fragment>;
      case 'strong':
        return (
          <strong key={i} className="font-semibold">
            <Inlines nodes={n.c} />
          </strong>
        );
      case 'em':
        return (
          <em key={i}>
            <Inlines nodes={n.c} />
          </em>
        );
      case 'code':
        return (
          <code key={i} className="rounded-xs bg-muted px-1 py-0.5 font-mono text-body-sm">
            {n.v}
          </code>
        );
      case 'link': {
        const outside = /^https?:/i.test(n.href);
        return (
          <a
            key={i}
            href={n.href}
            className="text-link underline decoration-1 underline-offset-3"
            {...(outside ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {})}
          >
            <Inlines nodes={n.c} />
            {outside ? <span className="sr-only"> (opens in a new tab)</span> : null}
          </a>
        );
      }
    }
  });
}

/** A knowledge item's body, drawn from Markdown without any HTML from the text. */
export function Markdown({ source }: { source: string }) {
  const blocks = parseMarkdown(source);
  return (
    <div className="grid gap-3 text-body leading-relaxed">
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h': {
            const Tag = `h${b.level}` as 'h2' | 'h3' | 'h4';
            return (
              <Tag
                key={i}
                className={
                  b.level === 2
                    ? 'mt-3 text-title-sm first:mt-0'
                    : 'mt-2 text-body-lg font-semibold first:mt-0'
                }
              >
                <Inlines nodes={b.c} />
              </Tag>
            );
          }
          case 'p':
            return (
              <p key={i}>
                <Inlines nodes={b.c} />
              </p>
            );
          case 'ul':
          case 'ol': {
            const checklist = b.items.some((x) => x.checked !== null);
            const List = b.t;
            return (
              <List
                key={i}
                className={
                  checklist
                    ? 'grid gap-1.5 p-0'
                    : b.t === 'ul'
                      ? 'grid list-disc gap-1 pl-5'
                      : 'grid list-decimal gap-1 pl-5'
                }
              >
                {b.items.map((item, j) =>
                  item.checked === null ? (
                    <li key={j}>
                      <Inlines nodes={item.c} />
                    </li>
                  ) : (
                    <li key={j} className="flex list-none items-start gap-2">
                      {item.checked ? (
                        <Check
                          size={18}
                          weight="bold"
                          className="mt-0.5 shrink-0 text-success"
                          aria-hidden="true"
                        />
                      ) : (
                        <Square
                          size={18}
                          className="mt-0.5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                      <span>
                        <span className="sr-only">{item.checked ? 'Done: ' : 'To do: '}</span>
                        <Inlines nodes={item.c} />
                      </span>
                    </li>
                  ),
                )}
              </List>
            );
          }
          case 'quote':
            return (
              <blockquote
                key={i}
                className="border-l-2 border-border-strong pl-4 text-muted-foreground"
              >
                <Inlines nodes={b.c} />
              </blockquote>
            );
          case 'code':
            return (
              <pre
                key={i}
                className="overflow-x-auto rounded-md border border-border bg-muted p-3 font-mono text-body-sm whitespace-pre"
              >
                <code>{b.v}</code>
              </pre>
            );
          case 'hr':
            return <hr key={i} className="border-border" />;
        }
      })}
    </div>
  );
}
