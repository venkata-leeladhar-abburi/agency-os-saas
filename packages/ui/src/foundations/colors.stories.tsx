import { tokens } from '@agency-os/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';

type ColorToken = (typeof tokens.color.tokens)[number];
type SemanticToken = ColorToken & { value: { light: string; dark: string } };

const semantic = tokens.color.tokens.filter((t): t is SemanticToken => typeof t.value === 'object');
const scales = tokens.color.tokens.filter((t) => typeof t.value === 'string');
const ramps = [...new Set(scales.map((t) => t.name.replace(/-\d+$/, '')))];

function SemanticColors() {
  return (
    <div className="flex max-w-content flex-col gap-4">
      <header>
        <h1 className="text-title-lg">Semantic colours</h1>
        <p className="text-body text-muted-foreground">
          Components use only these. Switch the theme in the toolbar to see the dark values.
        </p>
      </header>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-left text-body">
          <thead className="text-overline-caps text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-2">Swatch</th>
              <th className="px-4 py-2">Token</th>
              <th className="px-4 py-2">Light / dark</th>
              <th className="px-4 py-2">Use</th>
            </tr>
          </thead>
          <tbody>
            {semantic.map((t) => (
              <tr key={t.name} className="border-b border-border last:border-0">
                <td className="px-4 py-2">
                  <span
                    className="block size-8 rounded-sm border border-border"
                    style={{ background: `var(--${t.name})` }}
                  />
                </td>
                <td className="px-4 py-2 font-mono text-mono">{t.name}</td>
                <td className="px-4 py-2 font-mono text-mono-sm text-muted-foreground">
                  {t.value.light.slice(1, -1)} / {t.value.dark.slice(1, -1)}
                </td>
                <td className="px-4 py-2 text-body-sm text-muted-foreground">{t.usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Scales() {
  return (
    <div className="flex max-w-content flex-col gap-6">
      <header>
        <h1 className="text-title-lg">Raw scales</h1>
        <p className="text-body text-muted-foreground">
          Reference only. Components never use these directly.
        </p>
      </header>
      {ramps.map((ramp) => (
        <section key={ramp} className="flex flex-col gap-2">
          <h2 className="text-title-sm capitalize">{ramp}</h2>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-9 lg:grid-cols-12">
            {scales
              .filter((t) => t.name.replace(/-\d+$/, '') === ramp)
              .map((t) => (
                <div key={t.name} className="flex flex-col gap-1">
                  <span
                    className="block h-10 rounded-sm border border-border"
                    style={{ background: `var(--color-${t.name})` }}
                  />
                  <span className="font-mono text-mono-sm">{t.name.replace(`${ramp}-`, '')}</span>
                  <span className="font-mono text-mono-sm text-muted-foreground">
                    {String(t.value)}
                  </span>
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const meta = { title: 'Foundations/Colour' } satisfies Meta;
export default meta;

export const Semantic: StoryObj = { render: () => <SemanticColors /> };
export const RawScales: StoryObj = { name: 'Raw scales', render: () => <Scales /> };
