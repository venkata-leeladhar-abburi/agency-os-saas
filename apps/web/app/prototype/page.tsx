'use client';

import Link from 'next/link';
import { SCREENS } from './_wire/registry';

export default function PrototypeIndex() {
  const groups = [
    { title: 'R0 Foundation', screens: SCREENS.filter((s) => s.release === 'R0') },
    { title: 'R1 Core loop', screens: SCREENS.filter((s) => s.release === 'R1') },
  ];
  return (
    <main className="mx-auto grid max-w-content gap-8 px-6 py-10 text-foreground max-md:px-4">
      <header className="grid gap-2">
        <p className="text-overline-caps text-muted-foreground">Agency OS · Gate G1</p>
        <h1 className="text-title-xl">Wireframes</h1>
        <p className="max-w-prose text-body-lg text-muted-foreground">
          Every R0 and R1 screen from the screen inventory, with example data. Grey boxes show what
          goes where; labels, navigation and primary actions are real. Use the controls at the
          bottom right of each screen to switch state, theme and screen. Open any screen on a phone
          to see the phone layout.
        </p>
      </header>
      {groups.map((group) => (
        <section key={group.title} className="grid gap-3">
          <h2 className="text-title-md">{group.title}</h2>
          <ul className="grid gap-2 p-0 md:grid-cols-2">
            {group.screens.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/prototype/${s.slug}`}
                  className="grid gap-1 rounded-lg border border-border bg-card p-4 text-card-foreground no-underline transition-[border-color,box-shadow] duration-120 hover:border-border-strong hover:shadow-sm"
                >
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-mono-sm text-muted-foreground">{s.id}</span>
                    <span className="text-title-sm">{s.name}</span>
                    <span className="ml-auto text-caption text-muted-foreground">
                      {s.priority} · {s.who}
                    </span>
                  </span>
                  <span className="text-body-sm text-muted-foreground">{s.purpose}</span>
                  <span className="text-caption font-normal text-muted-foreground">
                    States: {s.states.map((st) => st.label).join(', ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
