import { ThemeSwitch } from './theme-switch';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-prose flex-col justify-center gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <p className="text-overline-caps text-muted-foreground">One Stop Solutions</p>
        <h1 className="text-title-xl text-foreground">Agency OS</h1>
        <p className="text-body-lg text-muted-foreground">
          Get found, win the work, deliver, get paid and hand over. The product screens arrive with
          the next milestones.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <h2 className="text-title-sm text-card-foreground">Theme</h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          Light, dark or follow your device setting.
        </p>
        <ThemeSwitch />
      </div>
    </main>
  );
}
