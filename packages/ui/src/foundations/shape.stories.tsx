import { tokens } from '@agency-os/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';

const RADIUS: Record<string, string> = {
  'radius-xs': 'rounded-xs',
  'radius-sm': 'rounded-sm',
  'radius-md': 'rounded-md',
  'radius-lg': 'rounded-lg',
  'radius-xl': 'rounded-xl',
  'radius-full': 'rounded-full',
};

const SHADOW: Record<string, string> = {
  'shadow-xs': 'shadow-xs',
  'shadow-sm': 'shadow-sm',
  'shadow-md': 'shadow-md',
  'shadow-lg': 'shadow-lg',
};

function Token({ name, value, usage }: { name: string; value: string; usage: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-mono">{name}</span>
      <span className="font-mono text-mono-sm text-muted-foreground">{value}</span>
      <span className="text-body-sm text-muted-foreground">{usage}</span>
    </div>
  );
}

function Shape() {
  return (
    <div className="flex max-w-content flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-title-lg">Radius</h1>
        <div className="grid gap-6 sm:grid-cols-3">
          {tokens.radius.tokens.map((t) => (
            <div key={t.name} className="flex items-center gap-4">
              <span
                className={`block size-16 shrink-0 border border-border-strong bg-brand-soft ${RADIUS[t.name]}`}
              />
              <Token name={t.name} value={t.value} usage={t.usage} />
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <h1 className="text-title-lg">Depth</h1>
        <p className="text-body text-muted-foreground">{tokens.shadow.note}</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tokens.shadow.tokens.map((t) => (
            <div key={t.name} className="flex flex-col gap-3">
              <span
                className={`block h-20 rounded-lg border border-border bg-card ${SHADOW[t.name]}`}
              />
              <Token name={t.name} value="light / dark" usage={t.usage} />
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <h1 className="text-title-lg">Sizes</h1>
        <p className="text-body text-muted-foreground">{tokens.size.note}</p>
        <div className="flex flex-col gap-3">
          {tokens.size.tokens.map((t) => (
            <div key={t.name} className="grid items-center gap-4 sm:grid-cols-[240px_1fr]">
              <Token name={t.name} value={t.value} usage={t.usage} />
              <span
                className="block h-3 max-w-full rounded-xs bg-primary"
                style={{ width: t.value }}
              />
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <h1 className="text-title-lg">Spacing</h1>
        <div className="flex flex-col gap-3">
          {tokens.spacing.tokens.map((t) => (
            <div key={t.name} className="grid items-center gap-4 sm:grid-cols-[240px_1fr]">
              <Token name={t.name} value={t.value} usage={t.usage} />
              <span className="block h-3 rounded-xs bg-chart-2" style={{ width: t.value }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta = { title: 'Foundations/Shape and size' } satisfies Meta;
export default meta;

export const All: StoryObj = { name: 'Radius, depth, sizes', render: () => <Shape /> };
