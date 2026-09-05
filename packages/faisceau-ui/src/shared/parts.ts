const PART_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Adds owned `fui-*` classes without replacing classes supplied by a caller. */
export function addFuiClasses<T extends Element>(element: T, ...classes: readonly string[]): T {
  for (const className of classes) {
    if (!className.startsWith("fui-") || /\s/.test(className)) {
      throw new Error(
        `[Faisceau UI] Invalid owned class "${className}". Every owned class must be a single fui-* token.`,
      );
    }

    element.classList.add(className);
  }

  return element;
}

/** Finds the first descendant with an exact `data-fui-part` value. */
export function queryPart<T extends Element = HTMLElement>(
  root: ParentNode,
  part: string,
): T | null {
  return root.querySelector<T>(partSelector(part));
}

/** Finds every descendant with an exact `data-fui-part` value. */
export function queryParts<T extends Element = HTMLElement>(root: ParentNode, part: string): T[] {
  return Array.from(root.querySelectorAll<T>(partSelector(part)));
}

/**
 * Finds a required part or throws an error that identifies the missing markup
 * contract. Existing classes are never changed.
 */
export function requirePart<T extends Element = HTMLElement>(root: ParentNode, part: string): T {
  const element = queryPart<T>(root, part);

  if (element === null) {
    throw new Error(
      `[Faisceau UI] Missing required part "${part}" in ${describeRoot(root)}. Expected ${partSelector(part)}.`,
    );
  }

  return element;
}

/** Finds several required parts and returns an object keyed by part name. */
export function requireParts<const Names extends readonly string[]>(
  root: ParentNode,
  names: Names,
): { [Name in Names[number]]: HTMLElement } {
  const parts = {} as { [Name in Names[number]]: HTMLElement };

  for (const name of names) {
    parts[name as Names[number]] = requirePart(root, name);
  }

  return parts;
}

/** Returns the canonical selector for an exact `data-fui-part` value. */
export function partSelector(part: string): string {
  if (!PART_NAME_PATTERN.test(part)) {
    throw new Error(
      `[Faisceau UI] Invalid part name "${part}". Use lowercase letters, numbers, and hyphens.`,
    );
  }

  return `[data-fui-part="${part}"]`;
}

function describeRoot(root: ParentNode): string {
  if (root instanceof Element) {
    const id = root.id ? `#${root.id}` : "";
    return `<${root.localName}${id}>`;
  }

  if (root instanceof Document) {
    return "document";
  }

  return "the provided root";
}
