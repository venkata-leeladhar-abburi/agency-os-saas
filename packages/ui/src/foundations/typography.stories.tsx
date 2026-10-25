import { tokens } from '@agency-os/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';

// Written out in full so Tailwind generates every class.
const CLASS: Record<string, string> = {
  'display-lg': 'text-display-lg',
  display: 'text-display',
  'title-xl': 'text-title-xl',
  'title-lg': 'text-title-lg',
  'title-md': 'text-title-md',
  'title-sm': 'text-title-sm',
  'body-lg': 'text-body-lg',
  body: 'text-body',
  'body-medium': 'text-body-medium',
  'body-sm': 'text-body-sm',
  caption: 'text-caption',
  overline: 'text-overline-caps',
  metric: 'text-metric tabular-nums',
  mono: 'font-mono text-mono',
  'mono-sm': 'font-mono text-mono-sm',
};

function TypeScale() {
  return (
    <div className="flex max-w-content flex-col gap-8">
      <header>
        <h1 className="text-title-lg">Type</h1>
        <p className="text-body text-muted-foreground">
          Geist for everything; Geist Mono for IDs, invoice numbers, GSTINs, codes and keys.
        </p>
      </header>
      {tokens.type.groups.map((group) => (
        <section key={group.name} className="flex flex-col gap-4">
          <h2 className="text-overline-caps text-muted-foreground">{group.name}</h2>
          {group.styles.map((s) => (
            <div
              key={s.name}
              className="grid gap-2 border-b border-border pb-4 md:grid-cols-[200px_1fr]"
            >
              <div className="flex flex-col">
                <span className="font-mono text-mono">{s.name}</span>
                <span className="text-body-sm text-muted-foreground">
                  {s.fontSize} / {s.lineHeight} · {s.fontWeight}
                  {'letterSpacing' in s ? ` · ${s.letterSpacing}` : ''}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className={CLASS[s.name]}>{s.sample}</span>
                <span className="text-body-sm text-muted-foreground">{s.usage}</span>
              </div>
            </div>
          ))}
        </section>
      ))}
      <section className="flex flex-col gap-2">
        <h2 className="text-overline-caps text-muted-foreground">Money and Indian formats</h2>
        <p className="text-metric tabular-nums">₹4,86,000</p>
        <p className="text-body tabular-nums">₹4.86 L · ₹1.2 Cr · $486,000 · 25 Oct 2026</p>
        <p className="font-mono text-mono">OSS/26-27/014 · 36AABCO1234F1Z5</p>
        <p className="text-body">नमस्ते · నమస్కారం (Noto fallbacks for Indian scripts)</p>
      </section>
    </div>
  );
}

const meta = { title: 'Foundations/Type' } satisfies Meta;
export default meta;

export const Scale: StoryObj = { render: () => <TypeScale /> };
