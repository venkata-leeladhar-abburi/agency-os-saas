import { onboardingProgress, type OnboardingProgress } from '@agency-os/core';
import { and, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { AccountError } from './accounts';
import type { Tx } from './client';
import { createClient } from './clients';
import { createInvoice } from './invoices';
import { createLead, listStages } from './leads';
import { createProject, getProject } from './projects';
import {
  activities,
  clientContacts,
  clients,
  gates,
  checklistItems,
  invoices,
  leads,
  payments,
  phases,
  projects,
  proposals,
  quotes,
  tasks,
  workspaces,
} from './schema';
import { localDate, workspaceTax } from './sales-docs';
import { createTask } from './tasks';

// ---- The checklist ----

/**
 * The onboarding checklist, worked out from the workspace's real records (example data never
 * ticks a step). Shown until complete or dismissed; Help brings it back.
 */
export async function onboardingState(tx: Tx, workspaceId: string): Promise<OnboardingProgress> {
  const [ws] = await tx
    .select({ logo: workspaces.logoPath, onboarding: workspaces.onboarding })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
  if (!ws) throw new AccountError('no_access');
  const exists = async (query: Promise<unknown[]>) => (await query).length > 0;
  type Table =
    typeof leads | typeof quotes | typeof proposals | typeof clientContacts | typeof invoices;
  const real = (table: Table) =>
    and(eq(table.workspaceId, workspaceId), eq(table.isExample, false));
  const done = {
    brand: ws.logo !== null,
    lead: await exists(tx.select({ id: leads.id }).from(leads).where(real(leads)).limit(1)),
    quote:
      (await exists(
        tx
          .select({ id: quotes.id })
          .from(quotes)
          .where(and(real(quotes), isNotNull(quotes.sentAt)))
          .limit(1),
      )) ||
      (await exists(
        tx
          .select({ id: proposals.id })
          .from(proposals)
          .where(and(real(proposals), isNotNull(proposals.sentAt)))
          .limit(1),
      )),
    portal: await exists(
      tx
        .select({ id: clientContacts.id })
        .from(clientContacts)
        .where(and(real(clientContacts), isNotNull(clientContacts.portalInvitedAt)))
        .limit(1),
    ),
    invoice: await exists(
      tx.select({ id: invoices.id }).from(invoices).where(real(invoices)).limit(1),
    ),
  };
  const dismissed = Boolean((ws.onboarding as { dismissedAt?: string } | null)?.dismissedAt);
  return onboardingProgress(done, dismissed);
}

/** Hides the checklist (needs workspace.manage); showOnboarding brings it back from Help. */
export async function dismissOnboarding(tx: Tx, workspaceId: string, at = new Date()) {
  await setOnboarding(
    tx,
    workspaceId,
    sql`${workspaces.onboarding} || ${JSON.stringify({ dismissedAt: at.toISOString() })}::jsonb`,
  );
}

export async function showOnboarding(tx: Tx, workspaceId: string) {
  await setOnboarding(tx, workspaceId, sql`${workspaces.onboarding} - 'dismissedAt'`);
}

async function setOnboarding(tx: Tx, workspaceId: string, value: ReturnType<typeof sql>) {
  const rows = await tx
    .update(workspaces)
    .set({ onboarding: value })
    .where(eq(workspaces.id, workspaceId))
    .returning({ id: workspaces.id });
  if (rows.length === 0) throw new AccountError('no_access');
}

// ---- Example data ----

export async function hasSampleData(tx: Tx, workspaceId: string) {
  const [row] = await tx
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.workspaceId, workspaceId), eq(clients.isExample, true)))
    .limit(1);
  return Boolean(row);
}

/**
 * Loads the example set (data-model.md, Sample data): one client, two leads, one project in the
 * Design phase with its gate waiting, three tasks, and one paid and one pending invoice. Every
 * record is marked is_example. Example invoices are numbered EXAMPLE-001 and EXAMPLE-002, outside
 * the real tax series, and nothing here counts towards plan limits.
 * A job runs it as the service role for the workspace; running it twice adds nothing.
 */
export async function loadSampleData(
  tx: Tx,
  workspaceId: string,
  actorId: string,
  now = new Date(),
) {
  if (await hasSampleData(tx, workspaceId)) return { loaded: false };
  const ws = await workspaceTax(tx, workspaceId);
  const today = localDate(now, ws.timeZone);
  const clientId = await createClient(
    tx,
    workspaceId,
    {
      name: 'Kite & Co',
      stateCode: ws.stateCode,
      isExample: true,
      contact: { name: 'Srinivas Beere', email: 'srinivas@kite.example' },
    },
    actorId,
  );
  await tx
    .update(clientContacts)
    .set({ isExample: true })
    .where(eq(clientContacts.clientId, clientId));

  const stages = await listStages(tx, workspaceId);
  const contacted =
    stages.find((s) => s.name === 'Contacted' && s.kind === 'open') ??
    stages.find((s) => s.kind === 'open')!;
  await createLead(
    tx,
    workspaceId,
    {
      name: 'Sarah Lewis',
      company: 'Northwind',
      email: 'sarah@northwind.example',
      source: 'linkedin',
      valueMinor: 24_000_000n,
      service: 'Web app or SaaS',
      stageId: contacted.id,
      isExample: true,
    },
    actorId,
    { now, enforceLimit: false },
  );
  await createLead(
    tx,
    workspaceId,
    {
      name: 'Lumen Foods',
      company: 'Lumen Foods',
      phone: '+919800000000',
      source: 'instagram',
      valueMinor: 8_000_000n,
      service: 'Online store',
      isExample: true,
    },
    actorId,
    { now, enforceLimit: false },
  );

  // A project in Design: the first three phases done with their gates approved, Design's waiting.
  const projectId = await createProject(
    tx,
    workspaceId,
    {
      clientId,
      name: 'Website redesign',
      budgetMinor: 48_600_000n,
      leadMemberId: actorId,
      isExample: true,
    },
    actorId,
  );
  const project = (await getProject(tx, projectId))!;
  await tx.execute(sql`select set_config('app.gate_decision', 'on', true)`);
  for (const phase of project.phases.slice(0, 3)) {
    await tx
      .update(checklistItems)
      .set({ doneAt: now, doneBy: actorId })
      .where(eq(checklistItems.phaseId, phase.id));
    if (phase.gate)
      await tx
        .update(gates)
        .set({ status: 'approved', decidedAt: now, requestedAt: now })
        .where(eq(gates.id, phase.gate.id));
    await tx.update(phases).set({ status: 'done' }).where(eq(phases.id, phase.id));
  }
  const design = project.phases[3]!;
  await tx.update(phases).set({ status: 'in_progress' }).where(eq(phases.id, design.id));
  await tx
    .update(gates)
    .set({
      status: 'waiting',
      requestedAt: now,
      requestedBy: actorId,
      requestMessage: 'The home and product pages are ready for your sign-off.',
    })
    .where(eq(gates.id, design.gate!.id));
  await tx.execute(sql`select set_config('app.gate_decision', 'off', true)`);
  for (const [title, due] of [
    ['Hi-fi design, desktop and phone', 0],
    ['Copy for the home page', 2],
    ['Clickable prototype', 5],
  ] as const) {
    const dueOn = new Date(`${today}T00:00:00Z`);
    dueOn.setUTCDate(dueOn.getUTCDate() + due);
    await createTask(
      tx,
      workspaceId,
      {
        projectId,
        phaseId: design.id,
        title,
        assigneeId: actorId,
        dueOn: dueOn.toISOString().slice(0, 10),
        isExample: true,
      },
      actorId,
    );
  }

  // One paid and one pending invoice, numbered outside the real series.
  const work = {
    description: 'Website design',
    sacCode: '998314',
    quantity: 1,
    rateMinor: 10_000_000n,
    taxRateBp: 1800,
  };
  for (const [n, paid] of [
    [1, true],
    [2, false],
  ] as const) {
    const id = await createInvoice(
      tx,
      workspaceId,
      { clientId, projectId, items: [work], isExample: true },
      actorId,
      now,
    );
    const due = new Date(`${today}T00:00:00Z`);
    due.setUTCDate(due.getUTCDate() + 7);
    await tx
      .update(invoices)
      .set({
        status: 'issued',
        number: `EXAMPLE-00${n}`,
        issueOn: today,
        dueOn: due.toISOString().slice(0, 10),
        issuedAt: now,
        issuedBy: actorId,
      })
      .where(eq(invoices.id, id));
    if (paid) {
      const [inv] = await tx
        .select({ total: invoices.totalMinor, currency: invoices.currency })
        .from(invoices)
        .where(eq(invoices.id, id));
      await tx.execute(
        sql`select record_invoice_payment(${id}::uuid, ${inv!.total}, ${inv!.currency}, 'upi'::payment_method, ${today}::date, 'Example payment', null, null, null)`,
      );
    }
  }
  return { loaded: true, clientId, projectId };
}

/** Removes every example record, and only those. A job runs it as the service role. */
export async function removeSampleData(tx: Tx, workspaceId: string) {
  const exampleInvoices = await tx
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.workspaceId, workspaceId), eq(invoices.isExample, true)));
  const invoiceIds = exampleInvoices.map((i) => i.id);
  if (invoiceIds.length) {
    await tx.delete(payments).where(inArray(payments.invoiceId, invoiceIds));
    await tx.delete(invoices).where(inArray(invoices.id, invoiceIds));
  }
  const exampleProjects = (
    await tx
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), eq(projects.isExample, true)))
  ).map((p) => p.id);
  const exampleLeads = (
    await tx
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.workspaceId, workspaceId), eq(leads.isExample, true)))
  ).map((l) => l.id);
  const exampleClients = (
    await tx
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.workspaceId, workspaceId), eq(clients.isExample, true)))
  ).map((c) => c.id);
  const subjects = [...invoiceIds, ...exampleProjects, ...exampleLeads, ...exampleClients];
  await tx
    .delete(activities)
    .where(
      and(
        eq(activities.workspaceId, workspaceId),
        or(
          eq(activities.isExample, true),
          subjects.length ? inArray(activities.subjectId, subjects) : undefined,
        ),
      ),
    );
  if (exampleProjects.length) {
    await tx.delete(tasks).where(inArray(tasks.projectId, exampleProjects));
    await tx.delete(projects).where(inArray(projects.id, exampleProjects));
  }
  if (exampleLeads.length) await tx.delete(leads).where(inArray(leads.id, exampleLeads));
  if (exampleClients.length) await tx.delete(clients).where(inArray(clients.id, exampleClients));
  return {
    invoices: invoiceIds.length,
    projects: exampleProjects.length,
    leads: exampleLeads.length,
    clients: exampleClients.length,
  };
}
