# Environments and deployment

## Environments

| Environment | App | Database | Payments | Who uses it |
| --- | --- | --- | --- | --- |
| Local / Claude Code session | `pnpm dev` | Supabase CLI (Docker) if available; otherwise the **dev** Supabase project | Razorpay test mode | Development |
| Preview | Vercel preview per pull request | Dev Supabase project (or Supabase branching once on a paid plan) | Test mode | Founder reviews, e2e in CI |
| Production | Vercel production (`main`) | Production Supabase project, Mumbai region | Live mode after G3 | Agencies and clients |

Production data is never copied to dev or preview. Sample and test data only.

## Setup the founder does once (Claude gives step-by-step instructions when it reaches each milestone)

1. **GitHub:** the `agency-os-app` repository (this pack at the root), with branch protection on `main` (CI must pass).
2. **Vercel:** import the repository; root `apps/web`; framework Next.js; add the env vars below for Preview and Production.
3. **Supabase:** two projects, `agency-os-dev` and `agency-os-prod`, region **South Asia (Mumbai)**; enable Google and email auth; add the site URLs and redirect URLs for preview and production.
4. **Razorpay:** test keys now; live keys and KYC before G3; a webhook pointing to `/api/webhooks/razorpay` with its secret.
5. **Resend:** verify the sending domain (SPF, DKIM, DMARC).
6. **Inngest, PostHog, Sentry, Upstash:** create projects and add keys.
7. **Claude Code cloud environment** for this repo:
   - **Network access:** allow the hosts the build needs, for example the npm registry, `*.supabase.co`, `api.razorpay.com`, `api.resend.com`, `*.inngest.com`, `*.posthog.com`, `*.sentry.io`, `*.upstash.io`, `fonts.googleapis.com` and `fonts.gstatic.com`. Change it from the cloud environment menu in the session's title bar → Edit → Network access (steps: https://code.claude.com/docs/en/cloud-environments#network-access).
   - **Secrets:** add the **dev and test** keys (never production keys) in the same Edit screen as environment variables or network secrets, using the names below. Never paste a key into the chat.
   - **Setup script (optional):** `corepack enable && pnpm install` so each session starts ready.

## Environment variables

Listed in `.env.example` with no values. "Public" means it is safe in the browser.

| Name | Where | Public | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | all | yes | Base URL for links in emails and PDFs |
| `NEXT_PUBLIC_SUPABASE_URL` | all | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all | yes | Supabase anon key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | no | Jobs and webhooks only |
| `DATABASE_URL` | server | no | Pooled Postgres connection for Drizzle |
| `DATABASE_URL_DIRECT` | CI, migrations | no | Direct connection for migrations |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | server | no | One Stop's account (Agency OS subscriptions) |
| `RAZORPAY_WEBHOOK_SECRET` | server | no | Verifies webhooks |
| `APP_ENCRYPTION_KEY` | server | no | Wraps agencies' stored third-party keys (Vault) |
| `RESEND_API_KEY` | server | no | Email |
| `EMAIL_FROM` | server | no | Sender, for example `Agency OS <hello@…>` |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | server | no | Jobs |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | all | yes | Analytics and flags |
| `SENTRY_DSN` / `SENTRY_AUTH_TOKEN` | server, CI | no | Errors; source maps upload |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | server | no | Rate limits |

## CI/CD (GitHub Actions)

- **On pull request:** install (pnpm cache) → lint → typecheck → unit and component tests → token check → start Postgres (Supabase CLI) → migrations → RLS tests → build → Playwright smoke and axe against the Vercel preview → Lighthouse CI on three pages.
- **On merge to main:** run migrations against production (`DATABASE_URL_DIRECT`, only after the founder enables it at G3), then Vercel deploys production.
- **Nightly:** full e2e suite against preview, dependency audit.
- Migrations are forward-only and backward compatible with the previous app version (deploy order: migrate, then app).

## Releases

- Trunk-based: small PRs to `main`; unfinished features behind PostHog feature flags.
- Production deploys only after G3 (beta). Before that, production can stay empty or show the waitlist.
- Each release gets a changelog entry in the app (Help → What's new), written for users.
- Rollback: Vercel instant rollback for the app; migrations are written so the previous app version still works.

## Domains

To decide (open question). Suggested shape: marketing at the root domain, the app at `app.`, the client portal at `portal.` (and later on an agency's own domain in R5), emails from a subdomain such as `mail.`.

## Monitoring and support

- Sentry alerts to the founder's email; PostHog dashboards from `../02-product/metrics.md`.
- A status page and an in-app support chat are added before G4.
- Weekly: review errors, slow queries (Supabase advisors), failed jobs and webhook errors.

## Deploying to Vercel (checklist)

**Project settings** (Vercel, Add New, Project, import the repository):

| Setting | Value |
| --- | --- |
| Framework preset | Next.js (detected) |
| Root Directory | `apps/web`, with "Include source files outside of the Root Directory" **on** (the default) so the workspace packages are found |
| Install and build commands | Leave the defaults. Vercel detects pnpm from `packageManager` and the lockfile; the workspace packages are compiled by Next (`transpilePackages`), so no extra build step |
| Node.js version | 22.x (also pinned in `engines`) |
| Production branch | `main` |
| Function region | Mumbai (`bom1`), set in `apps/web/vercel.json`, next to the Supabase database |

**Environment variables** (Settings, Environment Variables). Add each for **Production** and **Preview** unless noted:

| Name | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dev project for Preview; prod project for Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Sensitive. Server only |
| `DATABASE_URL` | The **pooled** (transaction, port 6543) connection string. Not the direct one; `DATABASE_URL_DIRECT` is for the migrate workflow and is not needed on Vercel |
| `NEXT_PUBLIC_APP_URL` | Production: the real domain. Preview: leave **unset**; the app then uses the deployment's own URL |
| `NEXT_PUBLIC_GOOGLE_AUTH` | `1` once Google is enabled in Supabase Auth. Needs a redeploy (read at build time) |
| `RAZORPAY_*` | Test keys on Preview, live keys on Production only after G3 |

**Supabase, Authentication, URL Configuration:** set the Site URL to the production domain; add Redirect URLs for `https://<domain>/**` and the preview pattern `https://*-<team-slug>.vercel.app/**`.

**Before the first production deploy (G3):**
1. `/api/health` returns `ok` on a preview.
2. Email sign-in and an invite work on a preview.
3. Production variables use the production Supabase project; never reuse the dev keys.
4. `/prototype` is public today (for design review). Decide whether to keep it on the production domain.
5. Add the Razorpay webhook URL `https://<domain>/api/webhooks/razorpay` in Razorpay with its secret.

