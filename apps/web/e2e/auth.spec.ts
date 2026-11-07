import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// These flows need the Supabase project's URL and anon key (the proxy and sign-in page read them).
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'Needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
);

for (const scheme of ['light', 'dark'] as const) {
  test(`sign-in page has no accessibility violations (${scheme})`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { name: 'Sign in or create an account' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    await context.close();
  });
}

test('signed-out visitors are sent to sign in and brought back afterwards', async ({ page }) => {
  for (const path of ['/home', '/settings/members', '/setup', '/invite/some-token']) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/sign-in\\?next=${encodeURIComponent(path)}`));
  }
});

test('a bad email says how to fix it, without leaving the page', async ({ page }) => {
  await page.goto('/sign-in');
  // Skip the browser's own check so the server's message is what we see.
  await page
    .getByRole('textbox', { name: 'Email' })
    .evaluate((el) => el.closest('form')?.setAttribute('novalidate', ''));
  await page.getByRole('textbox', { name: 'Email' }).fill('not-an-email');
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(
    page.getByText('Check your email address. It should look like you@agency.in.'),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
});

test('an expired or invalid link shows the expired state', async ({ page }) => {
  await page.goto('/auth/callback?code=not-a-real-code');
  await expect(page).toHaveURL(/\/sign-in\?error=link/);
  await expect(page.getByText('This sign-in link has expired')).toBeVisible();
});

test('the callback never redirects off the site', async ({ request }) => {
  const res = await request.get('/auth/callback?code=bad&next=//evil.example', { maxRedirects: 0 });
  expect(res.headers()['location'] ?? '').not.toContain('evil.example');
});

test('Google sign-in is hidden until it is switched on', async ({ page }) => {
  test.skip(process.env.NEXT_PUBLIC_GOOGLE_AUTH === '1', 'Google is enabled here');
  await page.goto('/sign-in');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);
});
