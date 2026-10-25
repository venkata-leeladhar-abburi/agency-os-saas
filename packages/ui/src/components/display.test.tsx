import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Avatar, AvatarGroup, initials, tintFor } from './avatar';
import { Badge } from './badge';
import { EmptyState } from './empty-state';
import { Progress } from './progress';
import { Segmented } from './segmented';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Button } from './button';
import { Alert } from './alert';
import { Card } from './card';

describe('Badge', () => {
  it('always carries a word, with an optional hidden dot', () => {
    const { container } = render(
      <Badge tone="danger" dot>
        Overdue
      </Badge>,
    );
    expect(screen.getByText('Overdue')).toHaveClass('bg-danger-soft', 'text-danger');
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});

describe('Avatar', () => {
  it('makes initials from the first and last word', () => {
    expect(initials('Kiran Rao')).toBe('KR');
    expect(initials('Srinivas Venkata Beere')).toBe('SB');
    expect(initials('Meera')).toBe('M');
    expect(initials('  ')).toBe('?');
  });

  it('keeps the same tint for the same name', () => {
    expect(tintFor('Ananya Iyer')).toBe(tintFor('Ananya Iyer'));
  });

  it('names the person for screen readers', () => {
    render(<Avatar name="Arjun Mehta" />);
    expect(screen.getByRole('img', { name: 'Arjun Mehta' })).toHaveTextContent('AM');
  });

  it('stacks a group with an overflow count', () => {
    render(
      <AvatarGroup names={['Kiran Rao', 'Ananya Iyer', 'Arjun Mehta', 'Meera Pillai']} max={2} />,
    );
    expect(screen.getByRole('img', { name: 'and 2 more' })).toHaveTextContent('+2');
  });
});

describe('Tabs', () => {
  it('switches panels with the arrow keys', async () => {
    render(
      <Tabs defaultValue="overview">
        <TabsList aria-label="Project">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks" count={24}>
            Tasks
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Overview panel</TabsContent>
        <TabsContent value="tasks">Tasks panel</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Overview panel');
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Tasks/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Tasks panel');
  });
});

describe('Segmented', () => {
  it('always keeps one option selected', async () => {
    const onValueChange = vi.fn();
    render(
      <Segmented
        label="View"
        defaultValue="board"
        onValueChange={onValueChange}
        items={[
          { value: 'board', label: 'Board' },
          { value: 'list', label: 'List' },
        ]}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: 'View' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'List' }));
    expect(onValueChange).toHaveBeenLastCalledWith('list');
    await userEvent.click(screen.getByRole('radio', { name: 'List' }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });
});

describe('Progress', () => {
  it('exposes its value and label', () => {
    render(<Progress value={60} label="Onboarding" valueText="3 of 5" showValue />);
    const bar = screen.getByRole('progressbar', { name: 'Onboarding' });
    expect(bar).toHaveAttribute('aria-valuetext', '3 of 5');
    expect(screen.getByText('3 of 5')).toBeInTheDocument();
  });

  it('clamps values to 0 to 100', () => {
    render(<Progress value={140} label="Budget" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});

describe('EmptyState, Card and Alert', () => {
  it('gives one action under a heading', () => {
    render(
      <EmptyState title="No leads yet" action={<Button variant="primary">Add lead</Button>}>
        Add your first lead or import a CSV.
      </EmptyState>,
    );
    expect(screen.getByRole('heading', { name: 'No leads yet', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add lead' })).toBeInTheDocument();
  });

  it('titles a card as a region heading', () => {
    render(
      <Card title="Projects at risk" as="h3">
        Body
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Projects at risk', level: 3 })).toBeInTheDocument();
  });

  it('uses role alert only for danger and can be dismissed', async () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <Alert tone="warning" title="Two invoices are due" onDismiss={onDismiss} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Two invoices are due');
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalled();
    rerender(<Alert tone="danger" title="The payment link expired" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
