import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';
import { ConfirmDialog, Dialog, DialogContent, DialogTrigger } from './dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Sheet, SheetContent, SheetTrigger } from './sheet';
import { notify, Toaster, ToastCard } from './toast';

describe('Dialog', () => {
  it('opens from its trigger, traps focus, closes with Escape and returns focus', async () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Invite member</Button>
        </DialogTrigger>
        <DialogContent
          title="Invite a member"
          description="They get an email."
          footer={<Button>Send invite</Button>}
        />
      </Dialog>,
    );
    const trigger = screen.getByRole('button', { name: 'Invite member' });
    await userEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Invite a member' });
    expect(dialog).toHaveAccessibleDescription('They get an email.');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('closes with the close button', async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent title="Edit client" />
      </Dialog>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('ConfirmDialog', () => {
  it('names the action and only confirms on that button', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        trigger={<Button>Delete lead</Button>}
        title="Delete this lead?"
        description="It moves to Trash for 30 days."
        confirmLabel="Delete lead"
        onConfirm={onConfirm}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete lead' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this lead?' });
    expect(dialog).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete lead' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete lead' }).at(-1)!);
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

describe('Sheet', () => {
  it('opens a labelled panel', async () => {
    render(
      <Sheet>
        <SheetTrigger asChild>
          <Button>Open lead</Button>
        </SheetTrigger>
        <SheetContent title="Kite & Co" description="Website redesign">
          Details
        </SheetContent>
      </Sheet>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open lead' }));
    expect(screen.getByRole('dialog', { name: 'Kite & Co' })).toHaveTextContent('Details');
  });
});

describe('Dropdown menu', () => {
  it('opens with the keyboard and runs an item', async () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Duplicate</DropdownMenuItem>
          <DropdownMenuItem danger>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    screen.getByRole('button', { name: 'Actions' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
    expect(onSelect).toHaveBeenCalled();
  });
});

describe('Popover', () => {
  it('opens and closes with Escape', async () => {
    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>Filter</Button>
        </PopoverTrigger>
        <PopoverContent aria-label="Filter leads">Filters</PopoverContent>
      </Popover>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Filter' }));
    expect(screen.getByRole('dialog', { name: 'Filter leads' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('Toast', () => {
  it('renders the past-tense title with Undo', async () => {
    const onUndo = vi.fn();
    render(<ToastCard title="Proposal sent" action={{ label: 'Undo', onClick: onUndo }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalled();
  });

  it('shows through notify()', async () => {
    render(<Toaster />);
    notify({ title: 'Invoice sent' });
    expect(await screen.findByText('Invoice sent')).toBeInTheDocument();
  });
});
