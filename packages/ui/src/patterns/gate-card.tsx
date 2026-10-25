import { Check, Flag, Paperclip, WhatsappLogo } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { Avatar } from '../components/avatar';
import { Badge, type BadgeProps } from '../components/badge';
import { Button } from '../components/button';
import { cn } from '../lib/cn';

export type GateStatus = 'draft' | 'waiting' | 'approved' | 'changes';

export type GateCardLabels = {
  status?: Partial<Record<GateStatus, string>>;
  approver?: string;
  approvedBy?: string;
  changesBy?: string;
  approve?: string;
  askForChanges?: string;
  remind?: string;
  send?: string;
  files?: string;
};

export type GateCardProps = {
  /** "Design gate" */
  phase: string;
  /** What is being approved: "Approve the homepage design". */
  title: string;
  status?: GateStatus;
  /** Agency view offers Remind; client view offers Approve and Ask for changes. */
  view?: 'agency' | 'client';
  description?: ReactNode;
  files?: string[];
  approver: string;
  /** "sent 2 h ago", "14 Oct 2026". */
  when?: string;
  onApprove?: () => void;
  onAskForChanges?: () => void;
  onRemind?: () => void;
  onSend?: () => void;
  labels?: GateCardLabels;
  className?: string;
};

const STATUS: Record<GateStatus, { tone: BadgeProps['tone']; text: string }> = {
  draft: { tone: 'neutral', text: 'Not sent' },
  waiting: { tone: 'warning', text: 'Waiting for client' },
  approved: { tone: 'success', text: 'Approved' },
  changes: { tone: 'danger', text: 'Changes requested' },
};

/** An approval at a phase gate: what, files, who approves, and the decision. */
export function GateCard({
  phase,
  title,
  status = 'waiting',
  view = 'agency',
  description,
  files = [],
  approver,
  when,
  onApprove,
  onAskForChanges,
  onRemind,
  onSend,
  labels,
  className,
}: GateCardProps) {
  const statusText = labels?.status?.[status] ?? STATUS[status].text;
  const decided = status === 'approved' || status === 'changes';
  const whoLabel =
    status === 'approved'
      ? (labels?.approvedBy ?? 'Approved by')
      : status === 'changes'
        ? (labels?.changesBy ?? 'Changes asked by')
        : `${labels?.approver ?? 'Approver'}:`;
  return (
    <article
      className={cn(
        'grid gap-2 rounded-lg border border-border bg-card p-4 text-card-foreground',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-caption font-semibold tracking-[0.04em] text-muted-foreground uppercase">
          <Flag size={14} aria-hidden="true" />
          {phase}
        </span>
        <Badge tone={STATUS[status].tone} dot>
          {statusText}
        </Badge>
      </div>
      <h3 className="text-title-sm">{title}</h3>
      {description ? <p className="text-body text-muted-foreground">{description}</p> : null}
      {files.length ? (
        <ul aria-label={labels?.files ?? 'Files'} className="flex flex-wrap gap-1.5 p-0">
          {files.map((file) => (
            <li
              key={file}
              className="inline-flex h-6.5 items-center gap-1 rounded-sm border border-border px-2 text-caption font-normal text-muted-foreground"
            >
              <Paperclip size={12} aria-hidden="true" />
              {file}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <span className="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
          <Avatar name={approver} size="sm" />
          <span>
            {whoLabel} <span className="font-medium text-foreground">{approver}</span>
            {when ? ` · ${when}` : null}
          </span>
        </span>
        {!decided ? (
          <div className="flex flex-wrap gap-2">
            {view === 'client' ? (
              <>
                <Button onClick={onAskForChanges}>
                  {labels?.askForChanges ?? 'Ask for changes'}
                </Button>
                <Button variant="primary" icon={Check} onClick={onApprove}>
                  {labels?.approve ?? 'Approve'}
                </Button>
              </>
            ) : status === 'draft' ? (
              <Button variant="primary" size="sm" onClick={onSend}>
                {labels?.send ?? 'Send for approval'}
              </Button>
            ) : (
              <Button size="sm" icon={WhatsappLogo} onClick={onRemind}>
                {labels?.remind ?? 'Remind'}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}
