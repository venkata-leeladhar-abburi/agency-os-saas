// The daily digest ("Today at [workspace]", defaults-and-content.md §7): who gets it this
// morning, worked out as the service role for one workspace. What it lists is each person's own
// Today, which the app builds as that member, so it never shows more than they can see.
import { channelsFor, DIGEST_LOCAL_TIME } from '@agency-os/core';
import { and, eq, inArray, isNull, lte, sql } from 'drizzle-orm';
import { withService, type Db } from './client';
import { userEmails } from './email';
import { leads, memberships, notificationPreferences, workspaces } from './schema';

export type DigestRecipient = {
  userId: string;
  email: string;
  role: (typeof memberships.$inferSelect)['role'];
  /** Why they get it: the digest itself, or only their follow-ups due. */
  reason: 'digest' | 'follow_ups';
};

/** The time on the workspace's clock, "HH:MM". */
function localTime(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
}

/**
 * This morning's digest for a workspace, or null outside the half hour from 08:30 on its clock
 * (the job runs every 30 minutes). Owners get it unless they turned it off, and anyone who
 * turned it on; lead owners with follow-ups due get it for those, as their setting says.
 */
export async function digestRecipients(db: Db, workspaceId: string, now = new Date()) {
  return withService(db, workspaceId, async (tx, ws) => {
    const [w] = await tx
      .select({
        name: workspaces.name,
        slug: workspaces.slug,
        plan: workspaces.plan,
        timeZone: workspaces.timeZone,
      })
      .from(workspaces)
      .where(and(eq(workspaces.id, ws), isNull(workspaces.deletedAt)));
    if (!w) return null;
    const time = localTime(now, w.timeZone);
    const [h, m] = DIGEST_LOCAL_TIME.split(':').map(Number) as [number, number];
    const minutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) - (h * 60 + m);
    if (minutes < 0 || minutes >= 30) return null;
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: w.timeZone }).format(now);

    const members = await tx
      .select({ userId: memberships.userId, role: memberships.role })
      .from(memberships)
      .where(and(eq(memberships.workspaceId, ws), eq(memberships.status, 'active')));
    if (!members.length) return null;
    const prefs = await tx
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.workspaceId, ws),
          inArray(notificationPreferences.kind, ['digest.daily', 'lead.follow_up_due']),
        ),
      );
    const pref = (userId: string, kind: 'digest.daily' | 'lead.follow_up_due') => {
      const p = prefs.find((x) => x.userId === userId && x.kind === kind);
      return channelsFor(kind, {
        inApp: p?.inApp ?? undefined,
        email: (p?.email as 'on' | 'off' | 'digest' | null) ?? undefined,
      });
    };
    // Follow-ups due by the end of today, by their owner.
    const endOfDay = sql`((${date}::date + 1)::timestamp at time zone ${w.timeZone})`;
    const due = await tx
      .selectDistinct({ ownerId: leads.ownerId })
      .from(leads)
      .where(
        and(
          eq(leads.workspaceId, ws),
          isNull(leads.deletedAt),
          lte(leads.nextFollowUpAt, endOfDay),
        ),
      );
    const withFollowUps = new Set(due.flatMap((d) => (d.ownerId ? [d.ownerId] : [])));

    const chosen = members.flatMap((mb): Omit<DigestRecipient, 'email'>[] => {
      const digest = pref(mb.userId, 'digest.daily').email;
      // The digest goes to owners by default; anyone can switch it on or off.
      const wantsDigest =
        mb.role === 'owner'
          ? digest !== 'off'
          : prefs.some(
              (x) => x.userId === mb.userId && x.kind === 'digest.daily' && x.email === 'on',
            );
      if (wantsDigest) return [{ ...mb, reason: 'digest' }];
      if (withFollowUps.has(mb.userId) && pref(mb.userId, 'lead.follow_up_due').email === 'digest')
        return [{ ...mb, reason: 'follow_ups' }];
      return [];
    });
    const emails = await userEmails(
      tx,
      chosen.map((c) => c.userId),
    );
    const recipients: DigestRecipient[] = chosen.flatMap((c) => {
      const email = emails.get(c.userId);
      return email ? [{ ...c, email }] : [];
    });
    return { workspaceId: ws, name: w.name, slug: w.slug, plan: w.plan, date, recipients };
  });
}
