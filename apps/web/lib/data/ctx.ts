// Server only. Whether a data function reads the example store or the database.
import { workspaceCtx } from '../server/workspace';

export function exampleMode(): boolean {
  return process.env.EXAMPLE_MODE === 'true';
}

/**
 * The database context for a workspace's screens, or null for the example store: in example
 * mode, and for callers that pass no slug (public pages and jobs not wired to the database yet).
 */
export async function ctxFor(slug: string | undefined) {
  if (exampleMode() || !slug) return null;
  return workspaceCtx(slug);
}
