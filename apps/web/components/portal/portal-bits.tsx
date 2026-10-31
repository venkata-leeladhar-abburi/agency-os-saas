'use client';

import { Flag, Receipt } from '@phosphor-icons/react';
import {
  Alert,
  Avatar,
  Button,
  Dialog,
  DialogContent,
  GateCard,
  NeedsYouItem,
  Textarea,
} from '@agency-os/ui';
import Link from 'next/link';
import { useActionState, useEffect, useRef, useState } from 'react';
import { decideGateAction, sendMessageAction } from '@/app/p/[workspace]/actions';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import type { NeedsYou } from '@/lib/data/portal';
import { EMPTY_FORM } from '@/lib/form-state';

export function NeedsYouList({ items }: { items: NeedsYou[] }) {
  return (
    <div className="grid gap-2">
      {items.map((n) => (
        <NeedsYouItem
          key={n.id}
          icon={n.kind === 'approve' ? Flag : Receipt}
          tone={n.kind === 'approve' ? 'brand' : 'warning'}
          title={n.title}
          detail={n.detail}
          href={n.href}
          linkAs={Link}
        />
      ))}
    </div>
  );
}

/** The work waiting for the client: approve it, or ask for changes with a note. */
export function GateDecision({
  slug,
  projectId,
  phase,
  title,
  approver,
  when,
  lead,
}: {
  slug: string;
  projectId: string;
  phase: string;
  title: string;
  approver: string;
  when: string;
  lead: string;
}) {
  const [asking, setAsking] = useState(false);
  const [approveState, approve] = useActionState(
    decideGateAction.bind(null, slug, projectId, 'approved'),
    EMPTY_FORM,
  );
  const [changeState, askForChanges] = useActionState(
    decideGateAction.bind(null, slug, projectId, 'changes'),
    EMPTY_FORM,
  );
  const approveForm = useRef<HTMLFormElement>(null);
  return (
    <div className="grid gap-3">
      <FormMessage state={approveState} title="Not approved yet" />
      <GateCard
        phase={phase}
        title={title}
        view="client"
        status="waiting"
        description={`After you approve, ${lead} starts the next phase.`}
        approver={approver}
        when={when}
        onApprove={() => approveForm.current?.requestSubmit()}
        onAskForChanges={() => setAsking(true)}
      />
      <form ref={approveForm} action={approve} hidden />
      <Dialog open={asking && !changeState.done} onOpenChange={setAsking}>
        <DialogContent
          title="What should change?"
          description={`${lead} sees your note and replies here.`}
        >
          <form action={askForChanges} className="grid gap-4" noValidate>
            <Textarea
              label="Your changes"
              name="comment"
              rows={4}
              defaultValue={changeState.values?.comment}
              error={changeState.errors?.comment}
            />
            <div className="flex justify-end gap-2">
              <Button size="xl" onClick={() => setAsking(false)}>
                Cancel
              </Button>
              <Submit size="xl">Send</Submit>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export type ThreadMessage = { id: string; who: string; mine: boolean; text: string; when: string };

/** A project thread; your own messages sit on the right. */
export function Thread({ messages, you }: { messages: ThreadMessage[]; you: string }) {
  if (messages.length === 0)
    return (
      <p className="text-body text-muted-foreground">
        No messages yet. Ask the team anything. They usually reply within a working day.
      </p>
    );
  return (
    <ol className="grid gap-4 p-0">
      {messages.map((m) => (
        <li key={m.id} className={`flex gap-2.5 ${m.mine ? 'flex-row-reverse' : ''}`}>
          <Avatar name={m.who} size="sm" />
          <div className={`grid max-w-[80%] gap-1 ${m.mine ? 'justify-items-end' : ''}`}>
            <span className="text-caption font-normal text-muted-foreground">
              {m.mine ? you : m.who} · {m.when}
            </span>
            <p
              className={`rounded-lg px-3 py-2 text-body whitespace-pre-line ${m.mine ? 'bg-brand-soft text-foreground' : 'bg-muted'}`}
            >
              {m.text}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function PortalMessageForm({ slug, projectId }: { slug: string; projectId: string }) {
  const [state, action] = useActionState(sendMessageAction.bind(null, slug, projectId), EMPTY_FORM);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.done) form.current?.reset();
  }, [state.done]);
  return (
    <form ref={form} action={action} className="grid gap-2" noValidate>
      <Textarea
        label="Message"
        name="text"
        rows={3}
        defaultValue={state.values?.text}
        error={state.errors?.text}
      />
      {state.done ? <Alert tone="success" title="Sent. The team has been told." /> : null}
      <Submit size="xl" block>
        Send
      </Submit>
    </form>
  );
}
