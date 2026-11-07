import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withUser, type Session } from '../src/client';
import { digestRecipients } from '../src/digest';
import { createLead } from '../src/leads';
import { setNotificationPreference } from '../src/platform';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let owner: Session;
let coOwner: Session;
let lead: Session;
let member: Session;
let quiet: Session;
let ws: string;

const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
// 08:30 in India is 03:00 UTC.
const at = (hhmm: string) => new Date(`2026-10-30T${hhmm}:00Z`);

beforeAll(async () => {
  t = await createTestDb();
  const user = async (email: string) => ({ userId: await t.createUser(email), email });
  owner = await user('kiran@onestop.in');
  coOwner = await user('anil@onestop.in');
  lead = await user('ravi@onestop.in');
  member = await user('arjun@onestop.in');
  quiet = await user('neha@onestop.in');
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
  for (const [s, role] of [
    [coOwner, 'admin'],
    [lead, 'project_lead'],
    [member, 'member'],
    [quiet, 'member'],
  ] as const) {
    const { token } = await as(owner, (tx) =>
      inviteMember(tx, { workspaceId: ws, email: s.email!, role, invitedBy: owner.userId }),
    );
    await as(s, (tx) => acceptInvitation(tx, token));
  }
  // Make the second person an owner too (owners are made from the members list).
  await t.admin`update memberships set role = 'owner' where user_id = ${coOwner.userId}`;
  // Ravi owns a lead to follow up today; Neha owns one, but turned follow-up emails off.
  for (const [s, name] of [
    [lead, 'Example Kite'],
    [quiet, 'Example Lumen'],
  ] as const)
    await as(owner, (tx) =>
      createLead(
        tx,
        ws,
        {
          name,
          email: `${s.email!.split('@')[0]}@client.example`,
          ownerId: s.userId,
          nextFollowUpAt: at('05:30'),
        },
        owner.userId,
      ),
    );
  await as(quiet, (tx) =>
    setNotificationPreference(tx, {
      workspaceId: ws,
      userId: quiet.userId,
      kind: 'lead.follow_up_due',
      pref: { email: 'off' },
    }),
  );
}, 60_000);

afterAll(async () => {
  await t?.drop();
});

describe('the daily digest', () => {
  it('goes out only in the half hour from 08:30 on the workspace’s clock', async () => {
    expect(await digestRecipients(t.db, ws, at('02:59'))).toBeNull();
    expect(await digestRecipients(t.db, ws, at('03:00'))).toMatchObject({ date: '2026-10-30' });
    expect(await digestRecipients(t.db, ws, at('03:29'))).not.toBeNull();
    expect(await digestRecipients(t.db, ws, at('03:30'))).toBeNull();
  });

  it('goes to owners, and to lead owners for their follow-ups, by their settings', async () => {
    const due = (await digestRecipients(t.db, ws, at('03:05')))!;
    expect(due.recipients.map((r) => [r.email, r.reason]).sort()).toEqual([
      ['anil@onestop.in', 'digest'],
      ['kiran@onestop.in', 'digest'],
      ['ravi@onestop.in', 'follow_ups'],
    ]);
  });

  it('lets an owner switch it off and anyone else switch it on', async () => {
    await as(coOwner, (tx) =>
      setNotificationPreference(tx, {
        workspaceId: ws,
        userId: coOwner.userId,
        kind: 'digest.daily',
        pref: { email: 'off' },
      }),
    );
    await as(member, (tx) =>
      setNotificationPreference(tx, {
        workspaceId: ws,
        userId: member.userId,
        kind: 'digest.daily',
        pref: { email: 'on' },
      }),
    );
    const due = (await digestRecipients(t.db, ws, at('03:05')))!;
    expect(due.recipients.map((r) => [r.email, r.reason]).sort()).toEqual([
      ['arjun@onestop.in', 'digest'],
      ['kiran@onestop.in', 'digest'],
      ['ravi@onestop.in', 'follow_ups'],
    ]);
  });

  it('follows the workspace’s own time zone', async () => {
    await t.admin`update workspaces set time_zone = 'Europe/London' where id = ${ws}`;
    // 30 Oct is GMT in London: 08:30 there is 08:30 UTC.
    expect(await digestRecipients(t.db, ws, at('03:05'))).toBeNull();
    expect(await digestRecipients(t.db, ws, at('08:35'))).not.toBeNull();
    await t.admin`update workspaces set time_zone = 'Asia/Kolkata' where id = ${ws}`;
  });
});
