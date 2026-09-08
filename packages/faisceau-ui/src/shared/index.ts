/** Shared item types and normalization helpers for collection components. */
export { type FuiItem, type FuiItemInput, normalizeItems } from "./items.ts";

/** DOM part discovery helpers. All owned class names are validated as `fui-*`. */
export {
  addFuiClasses,
  partSelector,
  queryPart,
  queryParts,
  requirePart,
  requireParts,
} from "./parts.ts";

/** Unique DOM id generation. */
export { createId } from "./id.ts";

/** DOM lookup helpers shared by Zag-powered components. */
export { getLookupRoot } from "./dom.ts";

/** Native select helpers shared by form-compatible collection components. */
export {
  captureAttributes,
  createNativeSelectField,
  getNativeSelectValue,
  readNativeSelect,
  requireNativeSelect,
  setNativeSelectValue,
  type NativeSelectFieldController,
  type NativeSelectFieldProps,
  type NativeSelectSource,
} from "./native-select.js";

/** Lucide icons rendered through @lilian1315/create-element/faisceau. */
export {
  createCheckIcon,
  createChevronDownIcon,
  createClearIcon,
  createMinusIcon,
  createXIcon,
} from "./icons.ts";
