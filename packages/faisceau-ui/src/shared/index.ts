/** Shared item types and normalization helpers for collection components. */
export { type FuiItem, type FuiItemInput, normalizeItems } from "./items.js";

/** DOM part discovery helpers. All owned class names are validated as `fui-*`. */
export {
  addFuiClasses,
  partSelector,
  queryPart,
  queryParts,
  requirePart,
  requireParts,
} from "./parts.js";

/** Unique DOM id generation. */
export { createId } from "./id.js";

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
export { createCheckIcon, createChevronDownIcon, createClearIcon, createXIcon } from "./icons.js";
