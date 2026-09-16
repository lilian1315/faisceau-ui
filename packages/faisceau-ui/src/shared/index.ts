/** Shared item types and normalization helpers for collection components. */
export { type FuiItem, type FuiItemInput, normalizeItems } from "./items.ts";
export {
  createKeyedReconciler,
  reconcileKeyedValues,
  type KeyedReconciler,
} from "./keyed-reconciler.ts";

/** Structural class helpers. All owned class names are validated as `fui-*`. */
export { addFuiClasses, requireFuiClass } from "./parts.ts";

/** Unique DOM id generation. */
export { createId } from "./id.ts";

/** DOM lookup and snapshot helpers shared by Zag-powered components. */
export { captureAttributes, getLookupRoot } from "./dom.ts";

/** Scroll-edge shadow flags for overlay body scrollers. */
export { bindScrollShadows } from "./scroll-shadow.ts";

/** External trigger-selector bindings for overlay components. */
export { createTriggerBinding, type TriggerBinding } from "./triggers.ts";

/** Lucide icons rendered through @lilian1315/create-element. */
export {
  createCheckIcon,
  createChevronDownIcon,
  createClearIcon,
  createMinusIcon,
  createXIcon,
} from "./icons.ts";
