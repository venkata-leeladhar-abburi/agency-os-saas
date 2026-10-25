import {
  ArrowRight,
  Check,
  DotsThree,
  Eye,
  HandHeart,
  MagnifyingGlass,
  PaperPlaneTilt,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Row, Stack } from './_story';
import { Button } from './button';
import { IconButton } from './icon-button';
import { Kbd } from './kbd';

const meta = {
  title: 'Components/Button',
  component: Button,
  args: { children: 'Send proposal', variant: 'primary', size: 'md' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'soft', 'ghost', 'destructive', 'highlight', 'link'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg', 'xl'] },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Row label="Variants">
        <Button variant="primary" icon={PaperPlaneTilt}>
          Send proposal
        </Button>
        <Button variant="secondary">Save draft</Button>
        <Button variant="soft" icon={Eye}>
          Preview
        </Button>
        <Button variant="ghost" icon={DotsThree}>
          More
        </Button>
        <Button variant="highlight" icon={HandHeart}>
          Mark as won
        </Button>
        <Button variant="destructive" icon={Trash}>
          Delete lead
        </Button>
        <Button variant="link">View invoice</Button>
      </Row>
      <Row label="Sizes">
        <Button variant="primary" size="sm" icon={Plus}>
          New
        </Button>
        <Button variant="primary" size="md">
          Create invoice
        </Button>
        <Button variant="primary" size="lg">
          Create invoice
        </Button>
        <Button variant="primary" size="xl" icon={Check}>
          Approve design
        </Button>
      </Row>
      <Row label="States">
        <Button variant="primary" loading>
          Sending
        </Button>
        <Button variant="secondary" disabled>
          Disabled
        </Button>
        <Button variant="secondary" icon={MagnifyingGlass} kbd="Ctrl K">
          Search
        </Button>
        <Button variant="secondary" iconRight={ArrowRight}>
          Continue
        </Button>
        <Button variant="primary" asChild>
          <a href="#invoice">Open invoice</a>
        </Button>
      </Row>
      <Row label="Block (phones)">
        <div className="w-full max-w-sm">
          <Button variant="primary" size="xl" block>
            Pay ₹47,200
          </Button>
        </div>
      </Row>
    </Stack>
  ),
};

export const IconButtons: Story = {
  name: 'Icon buttons',
  render: () => (
    <Stack>
      <Row label="Ghost and outline, md and sm">
        <IconButton icon={DotsThree} label="More actions" />
        <IconButton icon={DotsThree} label="More actions" variant="outline" />
        <IconButton icon={Trash} label="Delete" size="sm" />
        <IconButton icon={Plus} label="Add lead" size="sm" variant="outline" />
        <IconButton icon={Plus} label="Add lead" disabled />
      </Row>
      <Row label="Keyboard keys">
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
        <Kbd>Esc</Kbd>
      </Row>
    </Stack>
  ),
};
