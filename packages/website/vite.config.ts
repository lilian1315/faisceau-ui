import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const adapterSource = fileURLToPath(new URL("../faisceau-zag/src/index.ts", import.meta.url));
const stylesSource = fileURLToPath(new URL("../faisceau-ui/src/styles/index.css", import.meta.url));
const uiSource = fileURLToPath(new URL("../faisceau-ui/src/index.ts", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@lilian1315\/faisceau-ui\/styles\.css$/, replacement: stylesSource },
      { find: /^@lilian1315\/faisceau-ui$/, replacement: uiSource },
      { find: /^@lilian1315\/faisceau-zag$/, replacement: adapterSource },
    ],
  },
});
