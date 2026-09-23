import type { StorybookConfig } from '@storybook/html-vite'

const config: StorybookConfig = {
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  docs: { defaultName: 'Documentation' },
  framework: '@storybook/html-vite',
  stories: ['../src/**/*.stories.tsx'],
}

export default config
