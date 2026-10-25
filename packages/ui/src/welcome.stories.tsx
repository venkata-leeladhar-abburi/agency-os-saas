import type { Meta, StoryObj } from '@storybook/react-vite';

function Welcome() {
  return <p>Agency OS component library. Components arrive in M2.</p>;
}

const meta = { title: 'Welcome', component: Welcome } satisfies Meta<typeof Welcome>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
