'use client';

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  MagnifyingGlass,
  Plus,
  SquaresFour,
  UsersThree,
} from '@phosphor-icons/react';
import {
  AppShell,
  Button,
  IconButton,
  PortalShell,
  ThemeToggle,
  type ThemeChoice,
} from '@agency-os/ui';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useSyncExternalStore } from 'react';
import { PEOPLE, WORKSPACE } from '@agency-os/ui/example';
import { FOOTER, NAV, PORTAL_TABS, ROLE_COOKIE, ROLE_LABEL, type Role } from './nav';
import { findScreen, SCREENS } from './registry';

const subscribe = () => () => {};

function Toolbar({ slug, state }: { slug: string; state: string }) {
  const screen = findScreen(slug)!;
  const index = SCREENS.indexOf(screen);
  const prev = SCREENS[index - 1];
  const next = SCREENS[index + 1];
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <aside
      aria-label="Prototype controls"
      className="fixed right-4 bottom-4 z-60 flex max-w-[calc(100vw-32px)] flex-wrap items-center gap-2 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg max-md:bottom-24"
    >
      <Link
        href="/prototype"
        className="flex items-center gap-1.5 px-1 text-body-sm font-semibold text-foreground no-underline"
      >
        <SquaresFour size={16} aria-hidden="true" />
        <span className="font-mono text-mono-sm">{screen.id}</span>
        <span className="max-w-40 truncate max-sm:hidden">{screen.name}</span>
      </Link>
      {/* Hidden on phones, where one more button would wrap the bar over the page's own buttons. */}
      <Button asChild size="sm" variant="ghost" icon={UsersThree} className="max-sm:hidden">
        <Link href="/">Roles</Link>
      </Button>
      <label className="sr-only" htmlFor="state">
        State
      </label>
      <select
        id="state"
        value={state}
        onChange={(e) => {
          const url = new URL(window.location.href);
          url.searchParams.set('state', e.target.value);
          window.location.assign(url.toString());
        }}
        className="h-control-sm rounded-sm border border-input bg-card px-2 text-body-sm"
      >
        {screen.states.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <ThemeToggle
        value={mounted ? ((theme as ThemeChoice | undefined) ?? 'system') : 'system'}
        onValueChange={setTheme}
        labels={{ light: 'Light', dark: 'Dark', system: 'Auto' }}
        className="max-sm:hidden"
      />
      {prev ? (
        <Button
          asChild
          size="sm"
          variant="ghost"
          icon={ArrowLeft}
          aria-label={`Previous: ${prev.id} ${prev.name}`}
        >
          <Link href={`/prototype/${prev.slug}`}>{prev.id}</Link>
        </Button>
      ) : null}
      {next ? (
        <Button
          asChild
          size="sm"
          variant="ghost"
          iconRight={ArrowRight}
          aria-label={`Next: ${next.id} ${next.name}`}
        >
          <Link href={`/prototype/${next.slug}`}>{next.id}</Link>
        </Button>
      ) : null}
    </aside>
  );
}

/** Renders a wireframe in its frame (app, portal or bare) with the prototype controls. */
export function PrototypeScreen({
  slug,
  state: requested,
  chrome,
  role: chosen,
}: {
  slug: string;
  state: string;
  chrome: boolean;
  /** The role picked on the home page; otherwise each screen shows its own role. */
  role?: Role;
}) {
  // Remember the choice for this visit, so buttons inside screens keep the same view.
  useEffect(() => {
    if (chosen) document.cookie = `${ROLE_COOKIE}=${chosen}; path=/; SameSite=Lax`;
  }, [chosen]);
  const screen = findScreen(slug);
  if (!screen) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="grid gap-3">
          <h1 className="text-title-lg">There’s no screen called “{slug}”</h1>
          <Link href="/prototype" className="text-link">
            See all screens
          </Link>
        </div>
      </main>
    );
  }
  const state = screen.states.some((s) => s.id === requested) ? requested : 'default';
  const role: Role =
    screen.id === 'S04' && state in NAV ? (state as Role) : (chosen ?? screen.role ?? 'owner');
  const person =
    role === 'member'
      ? PEOPLE.developer
      : role === 'lead'
        ? PEOPLE.designer
        : role === 'finance'
          ? PEOPLE.pm
          : PEOPLE.owner;
  // Room below the content so the prototype controls never cover the last button.
  const content = (
    <div className={chrome ? 'pb-28 md:pb-16' : undefined}>
      {screen.render({ state, firstName: person.split(' ')[0]! })}
    </div>
  );

  let framed;
  if (screen.frame === 'app') {
    framed = (
      <AppShell
        sidebar={{
          workspace: WORKSPACE,
          groups: NAV[role],
          footerItems: FOOTER,
          active: screen.active,
          user: { name: person, role: ROLE_LABEL[role] },
          linkAs: Link,
        }}
        topbar={{
          crumbs: [
            { label: WORKSPACE.name, href: '/prototype' },
            ...(
              (typeof screen.crumbs === 'function' ? screen.crumbs(state) : screen.crumbs) ?? [
                screen.name,
              ]
            ).map((label) => ({ label })),
          ],
          linkAs: Link,
          actions: (
            <>
              <Button icon={MagnifyingGlass} kbd="Ctrl K" className="max-md:hidden">
                Search
              </Button>
              <IconButton icon={Bell} label="Notifications" />
              <Button variant={screen.pagePrimary ? 'secondary' : 'primary'} icon={Plus}>
                New
              </Button>
            </>
          ),
        }}
      >
        {content}
      </AppShell>
    );
  } else if (screen.frame === 'portal') {
    framed = (
      <PortalShell
        agency={WORKSPACE.name}
        client={PEOPLE.client}
        tabs={PORTAL_TABS}
        active={screen.active}
        linkAs={Link}
      >
        {content}
      </PortalShell>
    );
  } else {
    framed = (
      <main className="grid min-h-dvh content-start bg-background px-4 py-12 text-foreground">
        {content}
      </main>
    );
  }

  return (
    <>
      {framed}
      {chrome ? <Toolbar slug={slug} state={state} /> : null}
    </>
  );
}
