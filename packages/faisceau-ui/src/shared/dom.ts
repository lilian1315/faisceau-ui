/** Returns a Zag lookup root even while an element is mounted in a detached tree. */
export function getLookupRoot(element: Element): Document | ShadowRoot {
  const root = element.getRootNode();
  return "getElementById" in root ? (root as Document | ShadowRoot) : element.ownerDocument;
}
