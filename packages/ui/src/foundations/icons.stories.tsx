import {
  Bell,
  BookOpenText,
  ChatCircleDots,
  CheckSquareOffset,
  Command,
  CurrencyInr,
  Flag,
  FolderSimple,
  FunnelSimple,
  GearSix,
  GlobeHemisphereEast,
  Handshake,
  LockSimple,
  MagnifyingGlass,
  Receipt,
  SealCheck,
  Signature,
  Sparkle,
  SquaresFour,
  Storefront,
  UsersThree,
  WhatsappLogo,
  type Icon,
} from '@phosphor-icons/react';
import type { Meta, StoryObj } from '@storybook/react-vite';

const ICONS: [string, Icon][] = [
  ['squares-four', SquaresFour],
  ['funnel-simple', FunnelSimple],
  ['users-three', UsersThree],
  ['folder-simple', FolderSimple],
  ['check-square-offset', CheckSquareOffset],
  ['receipt', Receipt],
  ['currency-inr', CurrencyInr],
  ['handshake', Handshake],
  ['signature', Signature],
  ['seal-check', SealCheck],
  ['flag', Flag],
  ['chat-circle-dots', ChatCircleDots],
  ['whatsapp-logo', WhatsappLogo],
  ['storefront', Storefront],
  ['globe-hemisphere-east', GlobeHemisphereEast],
  ['book-open-text', BookOpenText],
  ['bell', Bell],
  ['magnifying-glass', MagnifyingGlass],
  ['command', Command],
  ['gear-six', GearSix],
  ['lock-simple', LockSimple],
  ['sparkle', Sparkle],
];

function Icons() {
  return (
    <div className="flex max-w-content flex-col gap-8">
      <header>
        <h1 className="text-title-lg">Icons</h1>
        <p className="text-body text-muted-foreground">
          Phosphor only. Regular for UI at 16 to 20px, fill only for the selected navigation item,
          duotone only for empty states (28 to 36px). Icons support a label; they never replace it.
        </p>
      </header>
      {(['regular', 'fill', 'duotone'] as const).map((weight) => (
        <section key={weight} className="flex flex-col gap-3">
          <h2 className="text-overline-caps text-muted-foreground">{weight}</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {ICONS.map(([name, IconComponent]) => (
              <div
                key={name}
                className="flex flex-col items-center gap-2 rounded-md border border-border bg-card p-3 text-muted-foreground"
              >
                <IconComponent
                  size={weight === 'duotone' ? 32 : 20}
                  weight={weight}
                  className={weight === 'duotone' ? 'text-primary' : undefined}
                  aria-hidden="true"
                />
                <span className="text-center font-mono text-mono-sm">{name}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const meta = { title: 'Foundations/Icons' } satisfies Meta;
export default meta;

export const Library: StoryObj = { render: () => <Icons /> };
