// The public enquiry form on the database (TEST_DATABASE_URL): Settings shows one stable link,
// each enquiry becomes a lead with source Website, and the owner hears about it.
import { randomBytes } from 'node:crypto';
import { createWorkspace, withUser, type Session } from '@agency-os/db';
import { createTestDb, type TestDb } from '@agency-os/db/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCtx } from '../../server/workspace';
import { enquiryBrandFor, enquiryLinkFor, submitEnquiryFor } from './enquiry';
import { leadList } from './people';
import { notificationList } from './team';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);
let t: TestDb;
let ctx: WorkspaceCtx;
const enquiry = {
  name: 'Example Meera Iyer',
  email: 'meera@kite.example',
  phone: null,
  company: 'Example Kite & Co',
  service: 'Website',
  budget: null,
  message: 'We need a new website before Diwali.',
};

run('the enquiry form on the database', () => {
  beforeAll(async () => {
    vi.stubEnv('LINK_SIGNING_SECRET', randomBytes(32).toString('hex'));
    t = await createTestDb();
    const kiran: Session = {
      userId: await t.createUser('kiran@onestop.in'),
      email: 'kiran@onestop.in',
    };
    const ws = await withUser(t.db, kiran, (tx) =>
      createWorkspace(tx, { name: 'One Stop Solutions', slug: 'one-stop' }),
    );
    await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
    ctx = {
      db: t.db,
      session: kiran,
      workspaceId: ws,
      slug: 'one-stop',
      role: 'owner',
      plan: 'growth',
    };
  }, 60_000);

  afterAll(async () => {
    vi.unstubAllEnvs();
    await t?.drop();
  });

  it('shows one link in Settings that keeps working, with the agency’s name on the form', async () => {
    const token = (await enquiryLinkFor(ctx))!;
    expect(await enquiryLinkFor(ctx)).toBe(token);
    expect(await enquiryBrandFor(token, t.db)).toMatchObject({ name: 'One Stop Solutions' });
    expect(await enquiryBrandFor('nope', t.db)).toBeNull();
    expect(await enquiryBrandFor('one-stop', t.db)).toBeNull(); // the slug isn't the link
  });

  it('turns an enquiry into a Website lead and tells the owner, by email too', async () => {
    const token = (await enquiryLinkFor(ctx))!;
    expect(await submitEnquiryFor(token, enquiry, t.db)).toBe(true);
    const [lead] = await leadList(ctx);
    expect(lead).toMatchObject({
      name: 'Example Meera Iyer',
      source: 'website',
      company: 'Example Kite & Co',
    });
    expect((await notificationList(ctx, 'one-stop')).rows[0]!.title).toBe(
      'New enquiry from Example Meera Iyer',
    );
    const emails =
      await t.admin`select kind, to_email from email_outbox where workspace_id = ${ctx.workspaceId}`;
    expect(emails).toEqual([{ kind: 'lead.enquiry', to_email: 'kiran@onestop.in' }]);
    expect(await submitEnquiryFor('nope', enquiry, t.db)).toBe(false);
  });
});
