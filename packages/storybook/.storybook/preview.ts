import type { Preview } from '@storybook/html-vite'

import '../src/storybook.css'

const preview: Preview = {
  parameters: {
    a11y: { test: 'error' },
    controls: { expanded: true },
    layout: 'centered',
    options: {
      storySort: {
        order: [
          'Introduction',
          'Checkbox',
          'Collapsible',
          'Select',
          'Combobox',
          'Tooltip',
          'Dialog',
          'Drawer',
          'Toast',
        ],
      },
    },
  },
}

export default preview
