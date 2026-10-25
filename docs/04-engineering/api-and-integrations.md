# API and integrations

## Internal API

- **Server Actions** for every mutation from the UI. Each action: parse input with zod, check `can()`, run inside `withUser()` (RLS), write `audit_log` for important actions, emit an Inngest event if follow-up work is needed, return `{ ok: true, data } | { ok: false, error: { code, message, field? } }`. Messages follow `../03-design/content-style.md`.
- **Route handlers** (`app/api/…`) only for: webhooks, the Inngest endpoint, public pages that need tokens (proposal, invoice pay page, enquiry form submit), file download redirects, health.
- **Idempotency:** mutations that create money or messages (issue invoice, record payment, send proposal) accept an idempotency key from the client and store it for 24 hours.
- **Rate limits** (Upstash Redis): public endpoints (enquiry form, OTP requests, proposal sign) per IP and per token.
- **Public REST API and MCP connector:** R6. Design server actions around `packages/core` services now so the same services back the public API later.

## Payments: Razorpay (India first)

**Invoices (R1): Payment Links API.**
- On "Send invoice", a job creates a payment link for the amount due, with `reference_id` = invoice ID, the client's contact details, `expire_by` (due date + 30 days), and `accept_partial` when the agency allows part payments.
- The link is shown on the invoice page, the PDF (as a QR code) and the reminder emails, and can be shared to WhatsApp.
- **Webhooks:** `payment_link.paid`, `payment_link.partially_paid`, `payment_link.expired`, `payment_link.cancelled`, `payment.captured`. Verify the `X-Razorpay-Signature` header (HMAC-SHA256 of the raw body with the webhook secret) before anything else; store the event in `webhook_events` (unique `event_id`), return 200 fast, and process in a job. Processing creates a `payments` row (unique `provider_payment_id`), updates `amount_paid_minor` and the status, notifies the agency, and cancels pending reminders when paid.
- **Currencies:** Razorpay can accept many currencies with conversion once international payments are enabled on the agency's Razorpay account. Until then, foreign-currency invoices show bank or Wise details and are marked paid manually, with an optional FIRA/FIRC upload.
- **Which Razorpay account?** R1 uses **the agency's own** Razorpay keys (entered in Settings → Payments, stored encrypted), so money goes straight to the agency. A marketplace model (Razorpay Route) is a later decision (open question).

**Agency OS subscriptions (R0): Razorpay Subscriptions** on One Stop's own account: plans for Agency Starter and Growth, monthly and yearly; webhooks `subscription.activated`, `subscription.charged`, `subscription.halted`, `subscription.cancelled` update `subscriptions` and plan limits. USD billing for international customers comes later (open question: Razorpay international or another provider).

Test mode keys are used everywhere until the founder provides live keys and approves at G3.

## Proposal signing

R1: **in-house accept and sign.** The client opens the proposal link, reads it, types their name and draws or types a signature, verifies by a one-time code sent to their email (or phone when SMS is ready), and accepts. We store name, contact, verification method, time, IP, user agent and the SHA-256 hash of the exact proposal version, then generate a signed PDF with an audit page.

Behind a `SignatureProvider` interface, so a dedicated e-signature service (DocuSeal, self-hosted or cloud, or an Aadhaar eSign provider) can be added for contracts that need stronger signatures (R4 document studio). Legal adequacy for Indian and international clients is an open question for a lawyer before G3.

## Email: Resend + React Email

- Templates in `packages/emails`: magic link, invite, proposal sent and viewed, approval requested and decided, invoice sent, reminder, payment received, daily digest.
- Sending domain with SPF, DKIM and DMARC set by the founder (open question: domain). Reply-to is the agency member, so client replies reach the agency.
- Every send goes through a job; bounces and complaints come back by webhook and mark the contact.

## WhatsApp

- **R1: share links only.** "Share on WhatsApp" opens `https://wa.me/<number>?text=<message with link>` (or the share sheet on phones). No API, no templates, no cost.
- **R6: WhatsApp Business Platform (Cloud API)** for notifications, with approved templates and opt-in. Needs a Meta business account (founder).

## Sign-in providers (Supabase Auth)

- **Google OAuth** and **email magic link** at R0.
- **Phone OTP** for India: Supabase supports SMS through providers such as Twilio, MessageBird, Vonage or Textlocal, or any provider through the Send SMS hook. Sending OTPs to Indian numbers needs DLT registration of the sender and template with an Indian operator. Until the founder completes that, phone sign-in stays behind a feature flag; Google and email work from day one.
- **Two-factor:** Supabase MFA with TOTP authenticator apps.

## Google (R2)

Calendar (show meetings in Today, create Meet links for discovery calls), Drive file picker. Scopes requested only when the user connects.

## Exchange rates

A daily job stores reference rates (for example from the European Central Bank's free daily feed) in `exchange_rates`. The invoice form pre-fills the rate for the invoice date; the user can edit it, and the rate used is stored on the invoice. The rate source for GST purposes is confirmed with the CA.

## PDFs

`@react-pdf/renderer` in a job: invoices, quotes, signed proposals with audit page. Fonts embedded (Geist, with Noto Devanagari and Telugu for names). Stored in the `pdfs` bucket; regenerated if the branding changes before sending, never after issuing.

## Analytics, errors, flags

- PostHog: events from `../02-product/metrics.md` (no personal data in properties), feature flags, session replay with all inputs masked and the portal excluded until consent is designed.
- Sentry: errors and performance, PII scrubbing on.

## Accounts the founder creates

Vercel, Supabase (Mumbai region), Inngest, Resend, PostHog, Sentry, Razorpay (test then live), Upstash, GitHub. See `environments-and-deploy.md` for each key's name. Claude never asks for a secret in chat; the founder adds secrets in Vercel and GitHub settings.
