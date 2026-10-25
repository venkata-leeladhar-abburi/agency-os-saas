# Security, privacy and compliance

Baseline: **OWASP ASVS level 1** for R1, moving to level 2 for the vault and payments features (R5). Agencies trust us with their clients' data and money; the UI shows that care (rulebook section 10).

## Application security

| Area | Rule |
| --- | --- |
| Tenant isolation | RLS on every table (`architecture.md`), plus app-level `can()` checks; automated cross-tenant tests in CI |
| Authentication | Supabase Auth; sessions 30 days with rotation; sign out of all devices; TOTP two-factor for owners and admins (required for owners on paid plans after launch); OTP expiry 10 minutes, 5 attempts |
| Authorisation | Role permissions stored as data; every server action checks the permission; portal contacts limited to their client |
| Input | zod schemas on every action and route; size limits; HTML in rich text sanitised (allow-list) |
| Output | React escaping; no `dangerouslySetInnerHTML` outside the sanitiser; PDFs rendered from data, never from user HTML |
| CSRF | Server Actions' origin checks; route handlers that change state require a token or signature |
| Headers | CSP (nonce-based scripts), HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, frame-ancestors none (except where a proposal must embed) |
| Files | Type allow-list, size limits, private buckets, short-lived signed URLs, no executing user files; malware scanning before R5 |
| Secrets | Only in Vercel, Supabase and GitHub settings; `.env.example` lists names only; secret scanning on the repo; agencies' third-party keys (their Razorpay keys) encrypted with Supabase Vault |
| Webhooks | Signature verified on the raw body; idempotent; replay window |
| Public links | 128-bit random tokens stored hashed; can be revoked; expire where sensible (proposals, invoices) |
| Rate limits | OTP, sign-in, enquiry form, public pages |
| Dependencies | Renovate or Dependabot; `pnpm audit` in CI; CodeQL; lockfile committed |
| Logging | No passwords, tokens, OTPs, full card or bank numbers, or document contents in logs; Sentry PII scrubbing |
| Audit log | Sign-ins, role changes, invitations, exports, invoice issue and cancel, payment records, gate decisions, settings changes, data deletion |
| Backups | Supabase daily backups and point-in-time recovery on the paid plan; a restore drill before G4 |

## Vault (R5)

Credentials handed over to clients are encrypted per workspace (envelope encryption: a data key per secret, wrapped by a key in Supabase Vault), revealed once with an audit entry, copy-only, and never logged.

## Privacy: India (DPDP) and UK/EU (GDPR)

Agency OS is mostly a **processor** for agencies' client data, and a **controller** for its own users' account data.

- **Notice and consent:** a clear privacy notice at sign-up; separate, optional consent for marketing email; cookie consent on the marketing site only if non-essential cookies are used. The DPDP Act 2023 and the DPDP Rules 2025 phase in, with remaining obligations from 13 May 2027; build to them now. Indian-language notices may be needed (verify with the lawyer).
- **Rights:** export all workspace data (CSV and JSON) at any time (R0); account and workspace deletion with a 30-day grace period; correction through the UI; a grievance contact in the footer and settings.
- **Breach:** an incident runbook; notify affected workspaces and the authorities within the legal deadlines (GDPR 72 hours to the authority; DPDP to the Data Protection Board and affected people as the Rules require).
- **Processors:** a public list of sub-processors (Supabase, Vercel, Resend, Inngest, PostHog, Sentry, Razorpay, Upstash) with regions; a Data Processing Addendum for UK and EU customers.
- **Data residency:** primary database in Supabase's Mumbai region (ap-south-1). Note in the DPA that some processors are outside India.
- **Minimisation:** collect only what a feature needs; analytics events carry IDs and bands, never names, emails, phones or amounts.
- **Retention:** active data while the workspace exists; deleted workspaces purged after 30 days; backups roll off by the provider's schedule; invoices kept as long as the agency needs them for tax (the agency can export before deleting).
- **Children:** the product is for businesses; terms require users to be 18 or older.

## Money and tax compliance

- GST invoice content (supplier and buyer details, GSTIN, SAC, place of supply, tax breakdown, amount in words, signature line), numbering, export under LUT wording and exchange-rate source are **reviewed by a chartered accountant before launch** (blocking for G3).
- Agency OS does not hold client money in R1: payments go to the agency's own Razorpay account.
- E-invoicing (IRN) is out of scope until an agency above ₹5 crore needs it.

## Legal documents (founder, with a lawyer, before G3)

Terms of service, privacy policy, DPA, acceptable use, refund policy for subscriptions, cookie notice, and confirmation that click-to-sign proposals are adequate evidence for Indian and international clients.

## Security review before each gate

At G3 and G4: run the checklist above, a dependency audit, a cross-tenant test run, an authenticated scan of the app (for example OWASP ZAP baseline against the preview), and a review of RLS policies. Findings are fixed or written down with a date in `../00-plan/decisions.md`.
