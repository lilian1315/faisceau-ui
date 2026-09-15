import type { Preview } from "@storybook/html-vite";

import "faisceau-ui/styles/index.scss";
import "../src/storybook.css";

const preview: Preview = {
  parameters: {
    a11y: { test: "error" },
    controls: { expanded: true },
    layout: "centered",
    options: {
      storySort: {
        order: [
          "Introduction",
          "Checkbox",
          "Select",
          "Combobox",
          "Tooltip",
          "Dialog",
          "Drawer",
          "Toast",
        ],
      },
    },
  },
};

export default preview;
