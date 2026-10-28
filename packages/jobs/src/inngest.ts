// The Inngest functions: emails every few minutes (and straight after an action asks), and the
// invoice reminders each morning in India. They run once INNGEST_EVENT_KEY and
// INNGEST_SIGNING_KEY are set; the app serves them at /api/inngest.
import type { Db } from '@agency-os/db';
import { Inngest } from 'inngest';
import type { JobEnv } from './render';
import { resendSender } from './resend';
import { runEmails, runReminders } from './run';

export const inngest = new Inngest({ id: 'agency-os' });

/** Sent after an action queues emails, so they go out without waiting for the schedule. */
export const EMAIL_QUEUED = 'agency-os/email.queued';

export function jobFunctions(deps: { db: () => Db; env: () => JobEnv }) {
  const sendEmails = inngest.createFunction(
    {
      id: 'send-emails',
      triggers: [{ event: EMAIL_QUEUED }, { cron: '*/5 * * * *' }],
      // One run at a time; rows are locked as they're sent in any case.
      concurrency: { limit: 1 },
    },
    async () => {
      const send = resendSender();
      if (!send) return { waiting: 'RESEND_API_KEY and EMAIL_FROM are not set' };
      const env = deps.env();
      if (!env.appUrl) return { waiting: 'NEXT_PUBLIC_APP_URL is not set' };
      return runEmails(deps.db(), { send, env });
    },
  );

  const dailyReminders = inngest.createFunction(
    { id: 'invoice-reminders', triggers: [{ cron: 'TZ=Asia/Kolkata 0 8 * * *' }] },
    async ({ step }) => {
      const queued = await step.run('queue reminders', () => runReminders(deps.db()));
      await step.sendEvent('send them', { name: EMAIL_QUEUED, data: {} });
      return queued;
    },
  );

  return [sendEmails, dailyReminders];
}
