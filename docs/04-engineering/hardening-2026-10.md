# Hardening pass, October 2026 (M16, part 1)

The parts of M16 that don't need the database: the security checklist in `security-and-compliance.md`, the performance budgets in `testing.md`, and the manual items in `../03-design/accessibility-checklist.md`. Run on 26 Oct 2026 against a production build in example mode. Everything here is re-checked at G3 once the screens use the database.

## Security checklist

| Area | State | Notes |
| --- | --- | --- |
| Tenant isolation | Partly | RLS and cross-tenant tests exist in `packages/db` (M5 to M12). The screens still read the example store; isolation is proven again when they're wired to the database. Download routes check membership themselves (`lib/server/access.ts`); the portal serves only the signed-in client's issued invoices. |
| Authentication | Waits on the database | Supabase Auth is wired (M5 part 2); TOTP for owners, sign out of all devices and session rotation come with the database. Signing codes: 10 minutes, 5 tries. |
| Authorisation | Waits on the database | `can()` checks run in the database layer; server actions call them once wired. |
| Input | Partly | Every form is checked server-side (`lib/forms.ts`, with tests). Server actions accept at most 1 MB. **Finding (medium):** per-field length limits are uneven; they come with the zod schemas that match the database columns. |
| Output | Done | React escaping only; no `dangerouslySetInnerHTML`. PDFs and emails are rendered from data. The reminder email preview is served with a CSP that allows no scripts. |
| CSRF | Done | Server Actions check the origin; the Razorpay webhook verifies its signature. |
| Headers | Done | A nonce-based CSP on every page (`proxy.ts`, `lib/security-headers.ts`, tested): scripts only with this request's nonce, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. HSTS (2 years, preload), `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, and no `X-Powered-By`. Pay and proposal links send no referrer. Styles allow inline (React style attributes, the brand colour sheet). |
| Files | Partly | Logos: PNG or JPEG under 500 KB, checked by their bytes; SVG refused. Private buckets and signed URLs come with Storage. |
| Secrets | Done | Names only in `.env.example`; nothing in the repo. Agencies' Razorpay keys go in Supabase Vault (M13 with the database). |
| Webhooks | Done | Razorpay: signature on the raw body, idempotent by event ID (M6 part 1). |
| Public links | Partly | 128-bit tokens. Pay links can be replaced from the invoice ("Make a new link"; the old one stops at once). The database stores hashes only (`data-model.md`). Proposals expire. |
| Rate limits | Done | `lib/rate-limit.ts` (tested): signing codes 5 an hour per proposal, 30 code requests or tries an hour per network, 5 enquiries a minute per network, 20 links that open nothing per 10 minutes per network (then "Too many tries"). Counts are in Upstash Redis when `UPSTASH_REDIS_REST_URL` and `_TOKEN` are set, else in memory. **Fixed:** a signing code could be requested again and again, each new code resetting the 5 tries. |
| Dependencies | Done | `pnpm audit --prod`: no known vulnerabilities. CI now fails on high or critical. Dependabot weekly (npm) and monthly (Actions); CodeQL on every PR and weekly. |
| Logging | Done | No `console` logging of user data in the app. Sentry scrubbing comes with Sentry. |
| Audit log | Done for what exists | Invites, joins, roles, removals, plan, settings, branding, invoices issued, pay links replaced, payments, proposals sent, portal invites, exports, example data removal. Sign-ins and data deletion come with the database. |
| Health check | **Fixed** | It hung for 30 seconds when the database was unreachable; it now answers in 3 seconds with 503, and the database client gives up connecting after 10. |

Still to do before G3: an OWASP ZAP baseline scan against the preview, a review of the RLS policies with the live database, and the cross-tenant test run in CI on the wired screens.

## Performance (`testing.md`: LCP < 2.5 s on mobile, simulated 4G; CLS < 0.1; JS budget)

Lighthouse 13.5 against `next start`, mobile.

| Page | LCP (applied 4G throttling) | LCP (Lighthouse simulated) | CLS | JS transferred |
| --- | --- | --- | --- | --- |
| Portal home | 1.8 s | 3.0 s | 0.001 | 277 KB |
| Leads board | 2.1 s | 3.0 s | 0 | 287 KB |
| Invoice page | 1.8 s | 2.4 s | 0.001 | 298 KB |
| Pay link | — | 2.3 s | 0 | 271 KB |

- With the network actually throttled, every page paints its largest element within budget. Lighthouse's simulated estimate counts all script downloads before the heading, which a local server exaggerates; measure again on the Vercel preview, where Lighthouse CI will run on each PR (`testing.md`).
- Changes: Geist Mono is no longer preloaded (it's for numbers and IDs, rarely on first paint), and the app has an icon (best practices now 100).
- **Finding (low):** about 280 KB of JavaScript on every page, and 450 to 570 ms of blocking time on a slowed CPU. Worth trimming before launch (the board's drag-and-drop and the command palette can load on demand).
- **Trimmed (31 Oct 2026, D-070):** portal home 206 KB, Today 218 KB, invoices 239 KB, leads board 271 KB, pay link 135 KB. The command palette now loads on demand and drag-and-drop only on pages with a board. Blocking time is to be measured again on the Vercel preview.

### Data at scale (31 Oct 2026, D-069)

A workspace with 10,000 records on Postgres 16 (`BENCH=1 pnpm vitest run search.bench` in `apps/web`), times as the member, worst of 5 for search:

| What | Before | After |
| --- | --- | --- |
| Command palette | 19.7 s to load everything when it opens | 30 to 72 ms per search as you type |
| Leads, clients, projects, tasks lists | 0.2 to 5.8 s (leads and clients stopped at 1,000) | 153 to 234 ms, every record |
| Dashboard, Today and export snapshot | 17.8 s | 0.86 s |

- **Fixed (medium):** lists stopped at 1,000 leads or clients, so the board, dashboard and data export could leave records out.
- **Fixed:** row-level security checked the member's role again for every row; the same rules now use a set worked out once per query (migration 0026), checked by a test that compares every role's rows with the old policies.

## Accessibility (manual items, checked by script on all 45 pages)

- axe with WCAG 2.1 AA and best-practice rules: clean on every page. **Fixed:** the sidebar is now a landmark, and the leads board's column headings follow the page heading in order.
- One `h1` per page: yes, everywhere.
- Keyboard: on every page, 30 Tabs move focus through the page with a visible ring each time; no traps.
- Reflow: no sideways scroll at 320 px or at 200% zoom (640 px), and none at 320 px with WCAG 1.4.12 text spacing, except the example-data badge (fixed).
- Client pages on phones: body text is 16 px (a scoped rule on the portal, pay link, proposal link and enquiry form); tap targets are at least 44 px. **Fixed:** the Approve and Ask-for-changes buttons, the portal home links and the Download PDF link were smaller.
- Autocomplete: set on fields about the person filling them in (workspace name and address, the enquiry form's contact). Fields about someone else (a client's email typed by the agency) are left without it on purpose, so the browser doesn't offer the agency's own details.
- Reduced motion: animations stop (`prefers-reduced-motion` in the tokens; spinners and skeletons have `motion-reduce`).
- Still to do with people (`accessibility-checklist.md`, G3): a screen reader or magnifier user and a low-cost Android phone in the usability round.
