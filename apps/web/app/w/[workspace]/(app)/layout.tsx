import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { recordAt, recordExists } from '@/lib/data/exists';

/**
 * Every workspace page sits in this group so that a missing record answers with a real 404
 * (D-073). The loading skeleton (loading.tsx here) starts the response, after which the status
 * can't change; this layout runs before it, so a link to a record that isn't there (deleted,
 * another workspace's, or never was) stops here and gets the workspace's not-found page.
 *
 * It runs when a page is loaded in full. Moving between pages in the app doesn't run it again;
 * there the page's own check shows the same not-found page.
 */
export default async function WorkspacePages({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const [{ workspace }, h] = await Promise.all([params, headers()]);
  const record = recordAt(h.get('x-pathname') ?? '', workspace);
  if (record && !(await recordExists(record.kind, record.id, workspace))) notFound();
  return children;
}
