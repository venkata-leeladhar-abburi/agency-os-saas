import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withUser, type Session } from '../src/client';
import { updateBranding, updateWorkspaceSettings, workspaceSettings } from '../src/settings';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let owner: Session;
let finance: Session;
let outsider: Session;
let ws: string;
const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);

const input = {
  name: 'One Stop Solutions',
  gstin: '37abcde1234f1zz',
  lutArn: 'ad3609260012345',
  invoicePrefix: 'oss',
  paymentTermsDays: 15,
  services: ['Website', 'Website', 'Brand identity'],
  address: ' 4th floor, Siripuram, Visakhapatnam ',
  bank: {
    accountName: 'One Stop Solutions',
    accountNumber: '123456789012',
    ifsc: 'ABCD0123456',
    swift: null,
  },
  invoiceFooter: 'Thank you for your business.',
};

beforeAll(async () => {
  t = await createTestDb();
  owner = { userId: await t.createUser('kiran@onestop.in'), email: 'kiran@onestop.in' };
  finance = { userId: await t.createUser('meera@onestop.in'), email: 'meera@onestop.in' };
  outsider = {
    userId: await t.createUser('sarah@northwind.example'),
    email: 'sarah@northwind.example',
  };
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop' }));
  await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
  const { token } = await as(owner, (tx) =>
    inviteMember(tx, {
      workspaceId: ws,
      email: finance.email!,
      role: 'finance',
      invitedBy: owner.userId,
    }),
  );
  await as(finance, (tx) => acceptInvitation(tx, token));
}, 60_000);

afterAll(async () => {
  await t?.drop();
});

describe('workspace settings', () => {
  it('saves what invoices print, cleaned up, with the state from the GSTIN', async () => {
    await as(owner, (tx) => updateWorkspaceSettings(tx, ws, input, owner.userId));
    expect(await as(finance, (tx) => workspaceSettings(tx, ws))).toMatchObject({
      name: 'One Stop Solutions',
      gstin: '37ABCDE1234F1ZZ',
      stateCode: '37',
      lutArn: 'AD3609260012345',
      invoicePrefix: 'OSS',
      paymentTermsDays: 15,
      services: ['Website', 'Brand identity'],
      address: '4th floor, Siripuram, Visakhapatnam',
      bank: input.bank,
      invoiceFooter: 'Thank you for your business.',
    });
  });

  it('says how to fix a bad GSTIN or prefix', async () => {
    await expect(
      as(owner, (tx) =>
        updateWorkspaceSettings(tx, ws, { ...input, gstin: '37ABCDE1234F1ZA' }, owner.userId),
      ),
    ).rejects.toMatchObject({ code: 'gstin_invalid' });
    await expect(
      as(owner, (tx) =>
        updateWorkspaceSettings(tx, ws, { ...input, invoicePrefix: 'ONE STOP/X' }, owner.userId),
      ),
    ).rejects.toMatchObject({ code: 'invoice_prefix_invalid' });
  });

  it('lets only people who manage the workspace change it', async () => {
    await expect(
      as(finance, (tx) => updateWorkspaceSettings(tx, ws, input, finance.userId)),
    ).rejects.toMatchObject({ code: 'no_access' });
    await expect(as(outsider, (tx) => workspaceSettings(tx, ws))).rejects.toMatchObject({
      code: 'no_access',
    });
  });

  it('keeps only a real hex colour for the brand', async () => {
    await as(owner, (tx) => updateBranding(tx, ws, { brandColor: '#0F766E' }, owner.userId));
    expect((await as(owner, (tx) => workspaceSettings(tx, ws))).brandColor).toBe('#0f766e');
    await expect(
      as(owner, (tx) => updateBranding(tx, ws, { brandColor: 'red;}' }, owner.userId)),
    ).rejects.toMatchObject({ code: 'brand_color_invalid' });
    await as(owner, (tx) => updateBranding(tx, ws, { brandColor: null }, owner.userId));
    expect((await as(owner, (tx) => workspaceSettings(tx, ws))).brandColor).toBeNull();
  });
});
