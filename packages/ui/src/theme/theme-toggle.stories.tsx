import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ThemeToggle, type ThemeChoice } from './theme-toggle';

const meta = { title: 'Foundations/Theme toggle', component: ThemeToggle } satisfies Meta<
  typeof ThemeToggle
>;
export default meta;

export const Default: StoryObj<typeof meta> = {
  args: { value: 'system', onValueChange: () => {} },
  render: function Render() {
    const [value, setValue] = useState<ThemeChoice>('system');
    return <ThemeToggle value={value} onValueChange={setValue} />;
  },
};
