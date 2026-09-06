import type { Preview } from "@storybook/html-vite";

import "@lilian1315/faisceau-ui/styles.css";
import "../src/storybook.css";

const preview: Preview = {
  parameters: {
    a11y: { test: "error" },
    controls: { expanded: true },
    layout: "centered",
    options: {
      storySort: {
        order: ["Introduction", "Checkbox", "Select", "Combobox", "Tooltip"],
      },
    },
  },
};

export default preview;
