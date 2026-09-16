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

/**
 * Finds a required structural class or throws an error that identifies the missing markup
 * contract. Existing classes are never changed.
 */
export function requireFuiClass<T extends Element = HTMLElement>(
  root: ParentNode,
  className: string,
): T {
  validateFuiClass(className);
  const selector = `.${CSS.escape(className)}`;
  const element = root.querySelector<T>(selector);

  if (element === null) {
    throw new Error(
      `[Faisceau UI] Missing required class "${className}" in ${describeRoot(root)}. Expected ${selector}.`,
    );
  }

  return element;
}

function validateFuiClass(className: string): void {
  if (!/^fui-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(className)) {
    throw new Error(
      `[Faisceau UI] Invalid owned class "${className}". Every owned class must be a single fui-* token.`,
    );
  }
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
