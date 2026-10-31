import { beforeEach, describe, expect, it } from 'vitest';
import { checkDailyUpdate, checkInvite } from '../forms';
import { audit, auditEntries } from './audit';
import { exampleStore, resetExampleStore } from './example-store';
import { exportCsv, exportJson } from './export';
import { createLead } from './index';
import { importLeads } from './lead-import';
import { needsUpgrade, planOverview, setPlan, usage } from './plan';
import {
  acceptInvite,
  changeRole,
  dailyUpdates,
  invitationByToken,
  invite,
  postDailyUpdate,
  removeMember,
  resendInvite,
  revokeInvite,
} from './team';

beforeEach(() => {
  resetExampleStore();
});

const lead = (name: string) => ({
  name,
  company: null,
  email: null,
  phone: null,
  source: 'referral' as const,
  service: 'Website',
  valueMinor: 0n,
  followUpOn: null,
  notes: '',
});

describe('invites', () => {
  it('refuses owners, existing members and a second open invite', async () => {
    expect(await invite('x@agency.in', 'owner')).toMatchObject({ ok: false });
    expect(await invite('ananya@onestop.example', 'member')).toMatchObject({
      ok: false,
      error: 'They’re already a member of this workspace.',
    });
    expect(await invite('rahul@onestop.example', 'member')).toMatchObject({ ok: false });
    const ok = await invite('New@Agency.in', 'finance');
    expect(ok.ok && ok.token).toMatch(/^[\w-]{22}$/);
    expect(exampleStore().invitations[0]!.email).toBe('new@agency.in');
  });

  it('gives a fresh link when sent again, and a cancelled link stops working', async () => {
    const before = exampleStore().invitations[0]!.token;
    const again = await resendInvite('inv-rahul');
    expect(again!.token).not.toBe(before);
    expect((await invitationByToken(before)).state).toBe('invalid');
    await revokeInvite('inv-rahul');
    expect((await invitationByToken(again!.token)).state).toBe('revoked');
  });

  it('joins with the invite’s role, once', async () => {
    const token = exampleStore().invitations[0]!.token;
    expect(await acceptInvite(token, 'Rahul Nair')).toEqual({ ok: true });
    expect(exampleStore().members.at(-1)).toMatchObject({ name: 'Rahul Nair', role: 'member' });
    expect(await acceptInvite(token, 'Rahul Nair')).toMatchObject({ ok: false });
  });

  it('expires after 7 days', async () => {
    exampleStore().invitations[0]!.expiresAt = new Date(Date.now() - 1000).toISOString();
    expect((await invitationByToken(exampleStore().invitations[0]!.token)).state).toBe('expired');
  });
});

describe('roles', () => {
  it('keeps at least one owner and never removes yourself', async () => {
    expect(await changeRole('u-kiran', 'admin')).toMatchObject({ ok: false });
    expect(await removeMember('u-kiran')).toMatchObject({ ok: false });
    expect(await changeRole('u-arjun', 'project_lead')).toMatchObject({ ok: true });
    expect(await removeMember('u-arjun')).toMatchObject({ ok: true });
    expect(exampleStore().members.map((m) => m.id)).not.toContain('u-arjun');
  });
});

describe('daily updates', () => {
  it('keeps one update per person a day', async () => {
    await postDailyUpdate({ done: 'Invoices', next: '', blockers: '' });
    await postDailyUpdate({ done: 'Invoices and reminders', next: 'Payroll', blockers: '' });
    const d = await dailyUpdates();
    expect(d.mine).toMatchObject({ done: 'Invoices and reminders', next: 'Payroll' });
    expect(d.posted.filter((x) => x.member === 'Kiran Rao')).toHaveLength(1);
    expect(d.waiting).toEqual(['Meera Pillai']);
  });
});

describe('plan limits', () => {
  it('doesn’t count example records', async () => {
    const u = await usage();
    expect(u).toMatchObject({
      members: 5,
      open_leads: 0,
      portal_clients: 0,
      invoices_per_month: 0,
    });
  });

  it('asks to upgrade at the limit, never before', async () => {
    await setPlan('free');
    expect(await needsUpgrade('members')).toMatchObject({
      title: 'You’ve reached 1 member on the Free plan',
      // Five members already: a sixth needs Growth, since Starter stops at five.
      upgradeTo: 'Agency Growth',
    });
    for (let i = 0; i < 24; i++) await createLead(lead(`Lead ${i}`));
    expect(await needsUpgrade('open_leads')).toBeNull();
    await createLead(lead('Lead 25'));
    const limit = await needsUpgrade('open_leads');
    expect(limit?.title).toBe('You’ve reached 25 open leads on the Free plan');
    expect(limit?.plans.map((p) => [p.name, p.price])).toEqual([
      ['Agency Starter', '₹1,499 a month'],
      ['Agency Growth', '₹3,499 a month'],
      ['Agency Enterprise', '₹7,999 a month'],
    ]);
  });

  it('imports only what the plan has room for', async () => {
    const rows = [1, 2, 3].map((n) => [`Person ${n}`, `p${n}@example.in`]);
    const result = await importLeads(rows, { name: 0, email: 1 }, 2);
    expect(result.imported).toBe(2);
    expect(result.skipped[0]!.reasons[0]).toMatch(/limit of open leads/);
  });

  it('shows usage against the plan', async () => {
    const o = await planOverview();
    expect(o.details.name).toBe('Agency Growth');
    expect(o.rows.find((r) => r.resource === 'members')).toEqual({
      resource: 'members',
      used: 5,
      limit: 20,
    });
  });
});

describe('audit log and export', () => {
  it('records actions newest first and filters by kind', async () => {
    audit('data.exported', 'Leads (CSV)', '', '10.0.0.1');
    const all = await auditEntries();
    expect(all.rows[0]).toMatchObject({
      action: 'data.exported',
      actor: 'Kiran Rao',
      ip: '10.0.0.1',
    });
    expect((await auditEntries({ action: 'member.invited' })).rows).toHaveLength(1);
  });

  it('exports CSV with money as decimals and JSON without secrets', async () => {
    const csv = (await exportCsv('invoices'))!.replace(/^\uFEFF/, '');
    expect(csv.split('\r\n')[0]).toBe(
      'Number,Client,Type,Currency,Taxable,CGST,SGST,IGST,Total,Paid,Due,Issued,Due date,Exchange rate,Example',
    );
    expect(csv).toContain('OSS/26-27/015,Acme Labs,tax_invoice,INR,40000.00');
    const json = (await exportJson())!;
    expect(json).not.toContain('example-northwind-7Hq2xP9');
    expect(json).not.toContain('pendingCode');
    expect(JSON.parse(json).invoices).toHaveLength(5);
  });
});

describe('team forms', () => {
  it('checks an invite and a daily update', () => {
    expect(checkInvite({ email: 'Meera@Agency.in', role: 'finance' })).toEqual({
      ok: true,
      value: { email: 'meera@agency.in', role: 'finance' },
    });
    expect(checkInvite({ email: 'x', role: 'owner' }).ok).toBe(false);
    expect(checkDailyUpdate({ done: '', next: '', blockers: '' }).ok).toBe(false);
  });
});
