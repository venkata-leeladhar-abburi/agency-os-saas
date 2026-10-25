import type { Decorator, Preview } from '@storybook/react-vite';
import { useEffect, type ReactNode } from 'react';
import './preview.css';

function ThemeRoot({
  theme,
  bare,
  children,
}: {
  theme: 'light' | 'dark';
  bare: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <div
      className={
        bare ? 'bg-background text-foreground' : 'min-h-dvh bg-background p-6 text-foreground'
      }
    >
      {children}
    </div>
  );
}

// Screens set `parameters.bare` to render edge to edge, like the app.
const withTheme: Decorator = (Story, context) => (
  <ThemeRoot
    theme={context.globals.theme === 'dark' ? 'dark' : 'light'}
    bare={Boolean(context.parameters.bare)}
  >
    <Story />
  </ThemeRoot>
);

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true },
    a11y: { test: 'error' },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
