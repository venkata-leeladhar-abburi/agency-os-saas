'use client';

import {
  Alert,
  Button,
  buttonVariants,
  Card,
  Checklist,
  Dialog,
  DialogContent,
} from '@agency-os/ui';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  dismissOnboardingAction,
  loadExampleAction,
  removeExampleAction,
} from '@/app/w/[workspace]/onboarding-actions';
import type { OnboardingStep } from '@/lib/data/onboarding';
import type { RemoveResult } from '@/lib/data/onboarding';

const STEPS: Record<
  OnboardingStep['id'],
  { label: string; hint: string; action: string; href: string }
> = {
  services: {
    label: 'Add your logo and services',
    hint: 'Clients see them on proposals, invoices and the portal.',
    action: 'Open settings',
    href: '/settings',
  },
  lead: {
    label: 'Add your first lead',
    hint: 'Or load example data to look around.',
    action: 'Add lead',
    href: '/leads/new',
  },
  quote: {
    label: 'Send a quote',
    hint: 'GST is added for you.',
    action: 'Create quote',
    href: '/sales/quotes/new',
  },
  portal: {
    label: 'Invite a client to the portal',
    hint: 'They can approve work and pay from their phone.',
    action: 'Invite client',
    href: '/clients',
  },
  invoice: {
    label: 'Create an invoice',
    hint: 'With a UPI and card payment link.',
    action: 'Create invoice',
    href: '/invoices/new',
  },
};

/** The setup checklist (defaults-and-content.md §5): the next step carries its button. */
export function SetupChecklist({ slug, steps }: { slug: string; steps: OnboardingStep[] }) {
  const [, start] = useTransition();
  const next = steps.find((s) => !s.done)?.id;
  return (
    <Checklist
      title="Get started"
      onDismiss={() => start(() => dismissOnboardingAction(slug))}
      labels={{ dismiss: 'Hide the checklist (bring it back from Help)' }}
      items={steps.map((s) => ({
        id: s.id,
        label: STEPS[s.id].label,
        hint: STEPS[s.id].hint,
        done: s.done,
        action:
          s.id === next ? (
            <Link
              href={`/w/${slug}${STEPS[s.id].href}`}
              className={buttonVariants({ variant: 'primary', size: 'sm' })}
            >
              {STEPS[s.id].action}
            </Link>
          ) : undefined,
      }))}
    />
  );
}

/** "You're looking at example data. Remove it" — removes only example records. */
export function ExampleDataBanner({
  slug,
  canRemove = true,
}: {
  slug: string;
  /** Owners and admins remove it; everyone else sees the label only. */
  canRemove?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<RemoveResult | null>(null);
  if (!canRemove)
    return (
      <Alert tone="brand" title="You’re looking at example data">
        An owner or admin can remove it. Anything you add is yours.
      </Alert>
    );
  if (result?.error)
    return (
      <Alert tone="danger" title="The example data wasn’t removed">
        {result.error}
      </Alert>
    );
  if (result)
    return (
      <Alert tone="success" title={`Example data removed (${result.removed} records)`}>
        {result.kept.length
          ? `Kept ${result.kept.join(', ')}, because your own records use them.`
          : 'Everything left is yours.'}
      </Alert>
    );
  return (
    <>
      <Alert
        tone="brand"
        title="You’re looking at example data"
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            Remove it
          </Button>
        }
      >
        Only the example records are removed. Anything you added stays.
      </Alert>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Remove the example data?"
          description="This removes the example leads, clients, projects, tasks, quotes and invoices. Your own records stay. You can load the examples again from Help."
          footer={
            <>
              <Button onClick={() => setOpen(false)}>Keep it</Button>
              <Button
                variant="destructive"
                loading={pending}
                onClick={() =>
                  start(async () => {
                    setResult(await removeExampleAction(slug));
                    setOpen(false);
                  })
                }
              >
                Remove example data
              </Button>
            </>
          }
        />
      </Dialog>
    </>
  );
}

/** Offered while the workspace has no leads of its own and no examples loaded. */
export function LoadExampleCard({ slug }: { slug: string }) {
  const [pending, start] = useTransition();
  return (
    <Card
      title="Look around first"
      description="Load example leads, clients, a project and invoices. Remove them in one click."
    >
      <Button loading={pending} onClick={() => start(() => loadExampleAction(slug))}>
        Load example data
      </Button>
    </Card>
  );
}
