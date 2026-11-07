import { Logo } from '@agency-os/ui';

/** Shown on a public link after too many links from this network opened nothing. */
export function TooManyTries() {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-4 px-4 py-10">
      <Logo />
      <h1 className="text-title-md">Too many tries</h1>
      <p className="text-body text-muted-foreground">
        Wait a few minutes, then open the link from your email or message again.
      </p>
    </main>
  );
}
