// Server only. The background jobs as the app runs them: the Inngest functions, and a nudge
// after an action queues emails so they go out straight away.
import { EMAIL_QUEUED, inngest, resendSender, runEmails, type JobEnv } from '@agency-os/jobs';
import { database } from './db';

/** NEXT_PUBLIC_APP_URL and LINK_SIGNING_SECRET, as the jobs need them. */
export function jobEnv(): JobEnv {
  return {
    appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, ''),
    linkSecret: process.env.LINK_SIGNING_SECRET ?? null,
  };
}

/**
 * After an action queued emails: with Inngest set up, asks it to send them now; without it,
 * sends this workspace's due emails here, once Resend is set up. Otherwise they wait in the
 * outbox. A failure to send never fails the action: the email stays queued for the next try.
 */
export async function emailsQueued(workspaceId: string) {
  try {
    if (process.env.INNGEST_EVENT_KEY) {
      await inngest.send({ name: EMAIL_QUEUED, data: { workspaceId } });
      return;
    }
    const send = resendSender();
    const db = database();
    const env = jobEnv();
    if (!send || !db || !env.appUrl) return;
    await runEmails(db, { send, env, workspaceId });
  } catch (error) {
    console.error('Queued emails were not sent yet', error);
  }
}
