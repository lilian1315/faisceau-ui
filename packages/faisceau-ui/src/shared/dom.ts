/** Returns a Zag lookup root even while an element is mounted in a detached tree. */
export function getLookupRoot(element: Element): Document | ShadowRoot {
  const root = element.getRootNode();
  return "getElementById" in root ? (root as Document | ShadowRoot) : element.ownerDocument;
}

export function insertAfter(parent: Node, newNode: Node, referenceNode: Node): void {
  const nextNode = referenceNode.nextSibling;
  if (nextNode) parent.insertBefore(newNode, nextNode);
  else parent.appendChild(newNode);
}

/** Takes an attribute snapshot that can be restored after progressive enhancement. */
export function captureAttributes(element: Element): () => void {
  const attributes = Array.from(element.attributes, ({ name, value }) => [name, value] as const);

  return () => {
    for (const attribute of Array.from(element.attributes)) {
      element.removeAttribute(attribute.name);
    }
    for (const [name, value] of attributes) element.setAttribute(name, value);
  };
}

/** Takes an childNodes snapshot that can be restored after progressive enhancement. */
export function captureChildNodes(element: Element): () => void {
  const nodes = Array.from(element.childNodes);
  return () => element.replaceChildren(...nodes);
}
