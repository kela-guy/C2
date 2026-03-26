import type { Preview } from '@storybook/react-vite';
import React, { useEffect } from 'react';
import { TooltipProvider } from '../src/app/components/ui/tooltip';
import './storybook.css';

function RTLWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'he');
    return () => {
      document.documentElement.removeAttribute('dir');
      document.documentElement.removeAttribute('lang');
    };
  }, []);

  return (
    <div
      style={{
        background: '#0b0d10',
        color: '#ffffff',
        padding: '24px',
        textAlign: 'right',
      }}
    >
      {children}
    </div>
  );
}

function SpecWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('dir', 'ltr');
    document.body.setAttribute('dir', 'ltr');
    document.body.style.background = '#f7f7f8';
    document.body.style.margin = '0';
    return () => {
      document.documentElement.removeAttribute('dir');
      document.body.removeAttribute('dir');
      document.body.style.background = '';
      document.body.style.margin = '';
    };
  }, []);

  return <>{children}</>;
}

const preview: Preview = {
  decorators: [
    (Story, context) => {
      if (context.parameters?.specDocs) {
        return (
          <TooltipProvider delayDuration={200}>
            <SpecWrapper>
              <Story />
            </SpecWrapper>
          </TooltipProvider>
        );
      }
      return (
        <TooltipProvider delayDuration={200}>
          <RTLWrapper>
            <Story />
          </RTLWrapper>
        </TooltipProvider>
      );
    },
  ],

  parameters: {
    layout: 'fullscreen',

    backgrounds: {
      options: {
        dark: { name: 'dark', value: '#0b0d10' },
        light: { name: 'light', value: '#ffffff' }
      }
    },

    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      test: 'error'
    }
  },

  initialGlobals: {
    backgrounds: {
      value: 'dark'
    }
  }
};
export default preview;
