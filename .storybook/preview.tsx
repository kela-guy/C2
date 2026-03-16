import type { Preview } from '@storybook/react-vite';
import React, { useEffect } from 'react';
import { TooltipProvider } from '../src/app/components/ui/tooltip';
import './storybook.css';

function RTLWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('dir', 'rtl');
    document.body.setAttribute('dir', 'rtl');
    return () => {
      document.documentElement.removeAttribute('dir');
      document.body.removeAttribute('dir');
    };
  }, []);

  return (
    <div
      dir="rtl"
      style={{
        background: '#0b0d10',
        color: '#ffffff',
        fontFamily: "'Inter', sans-serif",
        padding: '24px',
        direction: 'rtl',
        textAlign: 'right',
      }}
    >
      {children}
    </div>
  );
}

const preview: Preview = {
  decorators: [
    (Story) => (
      <TooltipProvider delayDuration={200}>
        <RTLWrapper>
          <Story />
        </RTLWrapper>
      </TooltipProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',

    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0b0d10' },
        { name: 'light', value: '#ffffff' },
      ],
    },

    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};
export default preview;
