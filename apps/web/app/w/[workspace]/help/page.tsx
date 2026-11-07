import { Card, Kbd, PageHeader } from '@agency-os/ui';
import { Submit } from '@/components/workspace/form-bits';
import { onboarding } from '@/lib/data/onboarding';
import { loadExampleAction, showOnboardingAction } from '../onboarding-actions';
import { RemoveExampleButton } from './remove-example';

export const metadata = { title: 'Help · Agency OS' };

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], what: 'Search records and run actions (Cmd K on a Mac)' },
  { keys: ['Esc'], what: 'Close a dialog, the search or a menu' },
  { keys: ['Space'], what: 'Pick up a lead on the board; arrows move it; Space drops it' },
];

export default async function HelpPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const o = await onboarding(workspace);
  return (
    <div className="grid max-w-3xl gap-4">
      <PageHeader title="Help" subtitle="Getting set up, example data and shortcuts" />
      <Card
        title="Setup checklist"
        description={`${o.done} of ${o.steps.length} steps done.${o.dismissed ? ' It’s hidden right now.' : ''}`}
      >
        {o.dismissed ? (
          <form action={showOnboardingAction.bind(null, workspace)}>
            <Submit variant="secondary">Show the checklist again</Submit>
          </form>
        ) : (
          <p className="text-body-sm text-muted-foreground">
            It’s on Today and the dashboard until every step is done.
          </p>
        )}
      </Card>
      <Card
        title="Example data"
        description={
          o.hasExample
            ? 'Example leads, clients, projects and invoices are in your workspace, marked “Example data”.'
            : 'Load example leads, clients, a project and invoices to look around.'
        }
      >
        <div className="grid gap-3">
          {o.hasExample && o.canManageExamples ? <RemoveExampleButton slug={workspace} /> : null}
          {o.allExamples || !o.canManageExamples ? null : (
            <form action={loadExampleAction.bind(null, workspace)}>
              <Submit variant="secondary">Load example data</Submit>
            </form>
          )}
        </div>
      </Card>
      <Card title="Keyboard shortcuts">
        <dl className="grid gap-2 text-body">
          {SHORTCUTS.map((s) => (
            <div key={s.what} className="flex flex-wrap items-center justify-between gap-3">
              <dt>{s.what}</dt>
              <dd className="flex gap-1">
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
