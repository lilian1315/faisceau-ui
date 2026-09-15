// Every stylesheet exposed through the package exports must typecheck as a
// side-effect import without relying on ambient `*.css` shims such as
// `vite/client` (this fixture runs under a tsconfig with `"types": []`).
import "faisceau-ui/styles/index.css";
import "faisceau-ui/styles/checkbox.css";
import "faisceau-ui/styles/select.css";
import "faisceau-ui/styles/combobox.css";
import "faisceau-ui/styles/tooltip.css";
import "faisceau-ui/styles/dialog.css";
import "faisceau-ui/styles/drawer.css";
import "faisceau-ui/styles/toast.css";
import "faisceau-ui/styles/tokens.css";
