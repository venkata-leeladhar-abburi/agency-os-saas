// Server only. The data the workspace screens read.
// In example mode (EXAMPLE_MODE=true) every function returns the labelled example data, so the
// screens can be built and reviewed before the database is reachable. The database versions
// replace these one by one as each screen is wired up; the shapes stay the same.
import {
  AT_RISK,
  CLIENTS,
  INVOICES,
  LEAD_ROWS,
  MEMBERS,
  METRICS,
  PIPELINE,
  PROJECTS,
  TASKS,
  TEAM_LOAD,
  TODAY,
  WORKSPACE,
} from '@agency-os/ui/example';

export function exampleMode(): boolean {
  return process.env.EXAMPLE_MODE === 'true';
}

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: string;
  plan: string;
};

export const EXAMPLE_WORKSPACE: WorkspaceSummary = {
  id: 'example',
  name: WORKSPACE.name,
  slug: WORKSPACE.slug,
  role: 'owner',
  plan: WORKSPACE.plan,
};
export const EXAMPLE_USER = { name: 'Kiran Rao', email: 'kiran@example.in' };

export async function leads() {
  return {
    rows: LEAD_ROWS,
    board: [...PIPELINE, { id: 'lost', name: 'Lost', total: '₹0', cards: [] }],
  };
}
export async function clients() {
  return CLIENTS;
}
export async function projects() {
  return PROJECTS;
}
export async function tasks() {
  return TASKS;
}
export async function invoices() {
  return INVOICES;
}
export async function members() {
  return MEMBERS;
}
export async function dashboard() {
  return { metrics: METRICS, atRisk: AT_RISK, teamLoad: TEAM_LOAD, today: TODAY };
}
