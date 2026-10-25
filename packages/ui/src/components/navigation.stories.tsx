import { CalendarBlank, Kanban, ListBullets } from '@phosphor-icons/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ThemeToggle, type ThemeChoice } from '../theme/theme-toggle';
import { Row, Stack } from './_story';
import { Segmented } from './segmented';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

const meta = { title: 'Components/Tabs and segmented' } satisfies Meta;
export default meta;

export const RecordTabs: StoryObj = {
  name: 'Tabs',
  render: () => (
    <Stack>
      <Tabs defaultValue="overview">
        <TabsList aria-label="Project">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="phases" count={7}>
            Phases
          </TabsTrigger>
          <TabsTrigger value="tasks" count={24}>
            Tasks
          </TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="invoices" count={3}>
            Invoices
          </TabsTrigger>
          <TabsTrigger value="handoff" disabled>
            Handoff
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <p className="text-body text-muted-foreground">
            Overview of the Kite & Co website project.
          </p>
        </TabsContent>
        <TabsContent value="phases">Phases</TabsContent>
        <TabsContent value="tasks">Tasks</TabsContent>
        <TabsContent value="files">Files</TabsContent>
        <TabsContent value="invoices">Invoices</TabsContent>
      </Tabs>
    </Stack>
  ),
};

export const SegmentedControl: StoryObj = {
  name: 'Segmented',
  render: function Render() {
    const [view, setView] = useState('board');
    const [theme, setTheme] = useState<ThemeChoice>('system');
    return (
      <Stack>
        <Row label="Display mode">
          <Segmented
            label="View"
            value={view}
            onValueChange={setView}
            items={[
              { value: 'board', label: 'Board', icon: Kanban },
              { value: 'list', label: 'List', icon: ListBullets },
              { value: 'calendar', label: 'Calendar', icon: CalendarBlank },
            ]}
          />
          <Segmented
            label="Period"
            defaultValue="month"
            items={[
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
              { value: 'quarter', label: 'Quarter' },
            ]}
          />
        </Row>
        <Row label="Theme">
          <ThemeToggle value={theme} onValueChange={setTheme} />
        </Row>
      </Stack>
    );
  },
};
