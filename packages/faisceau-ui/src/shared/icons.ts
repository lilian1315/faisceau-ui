import type { LucideIconData } from "@lucide/icons";
import Check from "@lucide/icons/icons/check";
import ChevronDown from "@lucide/icons/icons/chevron-down";
import Minus from "@lucide/icons/icons/minus";
import X from "@lucide/icons/icons/x";
import { h } from "@lilian1315/create-element";

/** Creates the decorative downward chevron used by triggers. */
export function createChevronDownIcon(): SVGSVGElement {
  return createLucideIcon(ChevronDown);
}

/** Creates the decorative check mark used by selected items. */
export function createCheckIcon(): SVGSVGElement {
  return createLucideIcon(Check);
}

/** Creates the decorative minus used by indeterminate checkboxes. */
export function createMinusIcon(): SVGSVGElement {
  return createLucideIcon(Minus);
}

/** Creates the decorative X used by clear controls. */
export function createXIcon(): SVGSVGElement {
  return createLucideIcon(X);
}

/** Alias naming the X icon after its common UI purpose. */
export const createClearIcon = createXIcon;

function createLucideIcon(iconData: LucideIconData): SVGSVGElement {
  const children = iconData.node.map(createLucideChild);
  const icon = h("svg", null, children);

  const width = "size" in iconData ? iconData.size : iconData.width;
  const height = "size" in iconData ? iconData.size : iconData.height;
  setSvgAttributes(icon, {
    "aria-hidden": "true",
    "data-fui-icon": iconData.name,
    fill: "none",
    focusable: "false",
    height: "16",
    stroke: "currentColor",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "stroke-width": "2",
    viewBox: `0 0 ${width} ${height}`,
    width: "16",
  });

  return icon;
}

function createLucideChild([
  tag,
  attributes,
  children,
]: LucideIconData["node"][number]): SVGElement {
  const element = h(`svg:${tag}` as "svg:path", null) as SVGElement;
  setSvgAttributes(element, attributes);
  if (children) element.append(...children.map(createLucideChild));
  return element;
}

function setSvgAttributes(element: SVGElement, attributes: Readonly<Record<string, string>>): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (name !== "key") element.setAttribute(name, value);
  }
}
