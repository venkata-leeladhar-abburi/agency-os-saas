import { beforeEach, describe, expect, it } from 'vitest';
import { checkNotificationPrefs, checkSettings } from '../forms';
import { createClient, createLead, saveLogo } from './index';
import { exampleStore, resetExampleStore } from './example-store';
import { markAllRead, notifications, notify } from './notifications';
import { loadExampleData, onboarding, removeExampleData } from './onboarding';
import {
  decideGate,
  examplePayment,
  portalHome,
  portalInvoice,
  portalProject,
  sendMessage,
} from './portal';

beforeEach(() => {
  resetExampleStore();
});

const lead = {
  name: 'Rohan Verma',
  company: 'Example Bakes',
  email: null,
  phone: '+919876543210',
  source: 'referral' as const,
  service: 'Website',
  valueMinor: 0n,
  followUpOn: null,
  notes: '',
};

describe('onboarding', () => {
  it('counts only the workspace’s own records', async () => {
    const before = await onboarding();
    expect(before.steps.map((s) => [s.id, s.done])).toEqual([
      // Services are set; the logo isn't yet.
      ['services', false],
      ['lead', false],
      ['quote', false],
      ['portal', false],
      ['invoice', false],
    ]);
    expect(before.hasExample).toBe(true);
    await createLead(lead);
    expect((await onboarding()).steps[1]!.done).toBe(true);
    await saveLogo({ url: 'data:image/png;base64,AA==', name: 'logo.png' });
    expect((await onboarding()).steps[0]!.done).toBe(true);
  });

  it('removes example data but keeps what your records use', async () => {
    // An invoice of your own for the example client Acme Labs.
    exampleStore().invoices.push({
      id: 'mine',
      number: null,
      clientId: 'acme',
      currency: 'INR',
      issuedOn: null,
      dueOn: '2026-11-02',
      lines: [],
      exchangeRate: null,
      payments: [],
      reminders: true,
      remindersSent: [],
      payToken: 'mine-token',
      createdAt: new Date().toISOString(),
    });
    const id = await createLead(lead);
    const result = await removeExampleData();
    expect(result.kept).toEqual(['the client Acme Labs']);
    const s = exampleStore();
    expect(s.leads.map((l) => l.id)).toEqual([id]);
    expect(s.clients.map((c) => c.id)).toEqual(['acme']);
    expect(s.invoices.map((i) => i.id)).toEqual(['mine']);
    expect(s.projects).toHaveLength(0);
    expect((await onboarding()).hasExample).toBe(true); // Acme Labs is still an example client
  });

  it('loads the examples back without duplicates', async () => {
    expect((await onboarding()).allExamples).toBe(true);
    await removeExampleData();
    expect((await onboarding()).allExamples).toBe(false);
    const added = await loadExampleData();
    expect((await onboarding()).allExamples).toBe(true);
    expect(added).toBeGreaterThan(20);
    expect(await loadExampleData()).toBe(0);
  });
});

describe('notifications', () => {
  it('respects the in-app setting and marks all read', async () => {
    exampleStore().settings.notificationPrefs.enquiry.inApp = false;
    notify('enquiry', 'New enquiry from Example Bakes', 'Website form', '/leads/x');
    notify('message', 'Srinivas sent a message', 'Acme Labs', '/projects/acme-web');
    const { rows, unread } = await notifications('one-stop');
    expect(rows[0]).toMatchObject({
      title: 'Srinivas sent a message',
      href: '/w/one-stop/projects/acme-web',
    });
    expect(rows.some((r) => r.title.startsWith('New enquiry'))).toBe(false);
    expect(unread).toBe(3);
    await markAllRead();
    expect((await notifications('one-stop')).unread).toBe(0);
  });
});

describe('the client portal', () => {
  it('shows a client only their own projects and issued invoices', async () => {
    expect(await portalProject('acme', 'northwind-app')).toBeNull();
    expect(await portalInvoice('acme', 'inv-16')).toBeNull(); // Northwind's invoice
    expect(await portalInvoice('mitra', 'inv-draft')).toBeNull(); // not invited, and a draft
    const home = (await portalHome('acme', 'one-stop'))!;
    expect(home.needs.map((n) => n.kind)).toEqual(['approve', 'pay', 'pay']);
    expect(home.projects.map((p) => p.id)).toEqual(['acme-web']);
  });

  it('approves the waiting work and moves the project on', async () => {
    const before = exampleStore().projects.find((p) => p.id === 'acme-web')!.phase;
    expect(await decideGate('northwind', 'acme-web', 'approved', '')).toMatchObject({ ok: false });
    expect(await decideGate('acme', 'acme-web', 'approved', '')).toEqual({ ok: true });
    const p = exampleStore().projects.find((x) => x.id === 'acme-web')!;
    expect([p.phase, p.gate, p.gateHistory[0]!.decision]).toEqual([before + 1, null, 'approved']);
    expect(exampleStore().notifications[0]!.title).toBe('Srinivas Beere approved: Homepage design');
    expect(await decideGate('acme', 'acme-web', 'approved', '')).toMatchObject({ ok: false });
  });

  it('needs a note to ask for changes', async () => {
    expect(await decideGate('acme', 'acme-web', 'changes', ' ')).toMatchObject({ ok: false });
    expect(await decideGate('acme', 'acme-web', 'changes', 'Bigger logo')).toEqual({ ok: true });
    const p = exampleStore().projects.find((x) => x.id === 'acme-web')!;
    expect(p.gate?.status).toBe('changes');
    expect(p.gateHistory[0]).toMatchObject({ decision: 'changes', comment: 'Bigger logo' });
  });

  it('records an example payment once and tells the agency', async () => {
    expect(await examplePayment('acme', 'inv-15')).toEqual({ ok: true });
    expect((await portalInvoice('acme', 'inv-15'))!.state.status).toBe('paid');
    expect(await examplePayment('acme', 'inv-15')).toMatchObject({ ok: false });
    expect(exampleStore().notifications[0]!.category).toBe('payment_received');
  });

  it('lets the client and the team message on the client’s own project only', async () => {
    expect(await sendMessage('northwind-app', { clientId: 'acme' }, 'Hi')).toMatchObject({
      ok: false,
    });
    expect(await sendMessage('acme-web', { clientId: 'acme' }, '  ')).toMatchObject({ ok: false });
    expect(await sendMessage('acme-web', { clientId: 'acme' }, 'Looks good')).toEqual({ ok: true });
    expect(exampleStore().notifications[0]!.category).toBe('message');
    const before = exampleStore().notifications.length;
    expect(await sendMessage('acme-web', { member: 'Ananya Iyer' }, 'Thanks')).toEqual({
      ok: true,
    });
    expect(exampleStore().notifications.length).toBe(before); // the team’s own replies don’t notify the team
  });

  it('counts a client as on the portal once invited', async () => {
    const id = await createClient({
      name: 'Example Bakes',
      contactName: 'Rohan',
      email: 'rohan@example.in',
      phone: null,
      city: null,
      country: 'IN',
      currency: 'INR',
      gstin: null,
      stateCode: null,
      notes: '',
    });
    expect(await portalHome(id, 'one-stop')).toBeNull();
  });
});

describe('settings forms', () => {
  it('keeps only known services, once each', () => {
    const r = checkSettings({ name: 'One Stop', invoicePrefix: 'OSS', paymentTermsDays: '7' }, [
      'Website',
      'Website',
      'Hacking',
    ]);
    expect(r.ok && r.value.services).toEqual(['Website']);
  });
  it('reads notification ticks', () => {
    expect(
      checkNotificationPrefs({ 'inApp.enquiry': 'on' }, ['enquiry', 'message'] as const),
    ).toEqual({
      enquiry: { inApp: true, email: false },
      message: { inApp: false, email: false },
    });
  });
});
