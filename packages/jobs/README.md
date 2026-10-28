# @agency-os/jobs

Background jobs (D-059), as plain functions with thin Inngest wrappers.

- **Emails:** `runEmails` sends what's due in the email outbox (`@agency-os/db` `email.ts`), rendering each email with `@agency-os/emails` when it's sent, through Resend (`resendSender`). Every 5 minutes, and straight after an action queues one.
- **Invoice reminders:** `runReminders` puts the day's reminders in the outbox, at 08:00 India time.
- **Serving:** `@agency-os/jobs/next` gives the route handlers for `apps/web/app/api/inngest`.

Needs `RESEND_API_KEY` and `EMAIL_FROM` to send, `NEXT_PUBLIC_APP_URL` for links, `LINK_SIGNING_SECRET` for pay links, and `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` for the schedules. Without the email keys nothing is sent and nothing is marked sent.

Commands: `pnpm lint`, `pnpm typecheck`, `pnpm test` (the job tests need `TEST_DATABASE_URL`).
