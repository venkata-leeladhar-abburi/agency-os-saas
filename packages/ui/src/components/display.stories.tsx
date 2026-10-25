import { CurrencyInr, SealCheck } from '@phosphor-icons/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Row, Stack } from './_story';
import { Avatar, AvatarGroup } from './avatar';
import { Badge } from './badge';
import { Progress } from './progress';
import { Skeleton } from './skeleton';

const meta = { title: 'Components/Display' } satisfies Meta;
export default meta;

const PEOPLE = [
  'Kiran Rao',
  'Ananya Iyer',
  'Arjun Mehta',
  'Meera Pillai',
  'Srinivas Beere',
  'Sarah Lewis',
];

export const Badges: StoryObj = {
  render: () => (
    <Stack>
      <Row label="Tones">
        <Badge>Draft</Badge>
        <Badge tone="brand">Proposal</Badge>
        <Badge tone="success" dot>
          Paid
        </Badge>
        <Badge tone="warning" dot>
          Waiting for client
        </Badge>
        <Badge tone="danger" dot>
          Overdue
        </Badge>
        <Badge tone="info">Sent</Badge>
        <Badge tone="highlight">Won</Badge>
        <Badge tone="outline">Example</Badge>
      </Row>
      <Row label="Small, with icons">
        <Badge size="sm" tone="success" icon={SealCheck}>
          Verified
        </Badge>
        <Badge size="sm" tone="brand" icon={CurrencyInr}>
          GST
        </Badge>
        <Badge size="sm" tone="danger" dot>
          3 days overdue
        </Badge>
      </Row>
    </Stack>
  ),
};

export const Avatars: StoryObj = {
  render: () => (
    <Stack>
      <Row label="Sizes">
        <Avatar name="Kiran Rao" size="xs" />
        <Avatar name="Kiran Rao" size="sm" />
        <Avatar name="Kiran Rao" size="md" />
        <Avatar name="Kite & Co" size="lg" />
      </Row>
      <Row label="Tint from the name">
        {PEOPLE.map((name) => (
          <Avatar key={name} name={name} />
        ))}
      </Row>
      <Row label="Group with overflow">
        <AvatarGroup names={PEOPLE} max={4} />
        <AvatarGroup names={PEOPLE.slice(0, 3)} size="md" />
      </Row>
    </Stack>
  ),
};

export const ProgressAndSkeleton: StoryObj = {
  name: 'Progress and skeleton',
  render: () => (
    <Stack>
      <div className="grid max-w-xl gap-5">
        <Progress value={60} label="Onboarding" showValue valueText="3 of 5" />
        <Progress value={42} label="Budget used" showValue />
        <Progress value={100} label="Design phase" showValue tone="success" />
        <Progress value={100} label="Over budget" showValue valueText="112%" tone="danger" />
        <Progress value={80} label="Setup" tone="highlight" />
      </div>
      <div
        className="flex max-w-xl flex-col gap-3 rounded-lg border border-border bg-card p-5"
        aria-label="Loading"
        role="status"
      >
        <div className="flex items-center gap-3">
          <Skeleton circle width={32} height={32} />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton width="40%" />
            <Skeleton width="25%" height={10} />
          </div>
        </div>
        <Skeleton height={10} />
        <Skeleton width="80%" height={10} />
      </div>
    </Stack>
  ),
};
