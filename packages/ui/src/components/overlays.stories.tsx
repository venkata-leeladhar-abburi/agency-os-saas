import {
  Archive,
  CopySimple,
  DotsThree,
  PencilSimple,
  Trash,
  UserPlus,
} from '@phosphor-icons/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Badge } from './badge';
import { Button } from './button';
import { ConfirmDialog, Dialog, DialogClose, DialogContent, DialogTrigger } from './dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown';
import { IconButton } from './icon-button';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Select } from './select';
import { Sheet, SheetContent, SheetTrigger } from './sheet';
import { Notify } from './toast.story';
import { Tooltip } from './tooltip';

const meta = { title: 'Components/Overlays', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;

export const DialogForm: StoryObj = {
  name: 'Dialog',
  render: () => (
    <div className="min-h-[560px]">
      <Dialog defaultOpen>
        <DialogTrigger asChild>
          <Button>Invite member</Button>
        </DialogTrigger>
        <DialogContent
          icon={UserPlus}
          title="Invite a member"
          description="They get an email with a link to join Kite & Co's workspace."
          footer={
            <>
              <DialogClose asChild>
                <Button>Cancel</Button>
              </DialogClose>
              <Button variant="primary">Send invite</Button>
            </>
          }
        >
          <div className="grid gap-4">
            <Input label="Email" type="email" placeholder="name@agency.in" />
            <Select
              label="Role"
              options={['Owner', 'Project lead', 'Member', 'Accountant']}
              defaultValue="Member"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  ),
};

export const Confirm: StoryObj = {
  name: 'Confirm (destructive)',
  render: () => (
    <div className="min-h-[360px]">
      <ConfirmDialog
        defaultOpen
        trigger={<Button>Delete lead</Button>}
        title="Delete this lead?"
        description="Kite & Co and its 12 activities move to Trash for 30 days, then they are gone."
        confirmLabel="Delete lead"
        onConfirm={() => {}}
        icon={Trash}
      />
    </div>
  ),
};

export const SheetDrawer: StoryObj = {
  name: 'Sheet',
  render: () => (
    <div className="min-h-[640px]">
      <Sheet defaultOpen>
        <SheetTrigger asChild>
          <Button>Open lead</Button>
        </SheetTrigger>
        <SheetContent
          title="Kite & Co"
          description="Website redesign · ₹80,000"
          actions={<Badge tone="brand">Proposal</Badge>}
          footer={
            <>
              <Button>Mark as lost</Button>
              <Button variant="primary">Send proposal</Button>
            </>
          }
        >
          <div className="grid gap-4">
            <Input label="Contact" defaultValue="Kiran Rao" />
            <Input label="Value" prefix="₹" defaultValue="80,000" />
            <Select
              label="Stage"
              options={['New', 'Contacted', 'Proposal', 'Won', 'Lost']}
              defaultValue="Proposal"
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  ),
};

export const Menu: StoryObj = {
  name: 'Dropdown menu',
  render: function Render() {
    const [sort, setSort] = useState('due');
    return (
      <div className="min-h-[380px] p-6">
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger asChild>
            <IconButton icon={DotsThree} label="Lead actions" variant="outline" tooltip={false} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Lead</DropdownMenuLabel>
            <DropdownMenuItem icon={PencilSimple} shortcut="E">
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem icon={CopySimple}>Duplicate</DropdownMenuItem>
            <DropdownMenuItem icon={Archive} disabled>
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
              <DropdownMenuRadioItem value="due">Follow-up date</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="value">Value</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={Trash} danger>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
};

export const PopoverAndTooltip: StoryObj = {
  name: 'Popover and tooltip',
  render: () => (
    <div className="flex min-h-[320px] items-start gap-6 p-6">
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button>Filter</Button>
        </PopoverTrigger>
        <PopoverContent aria-label="Filter leads">
          <div className="grid gap-3">
            <p className="text-title-sm">Filter leads</p>
            <Select
              label="Owner"
              options={['Anyone', 'Kiran Rao', 'Ananya Iyer']}
              defaultValue="Anyone"
            />
            <Button variant="primary" size="sm">
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <div className="ml-auto pt-10 pr-24">
        <Tooltip content="Copy invoice link" defaultOpen>
          <Button>Copy link</Button>
        </Tooltip>
      </div>
    </div>
  ),
};

export const LiveToast: StoryObj = { name: 'Toast (live)', render: () => <Notify /> };
