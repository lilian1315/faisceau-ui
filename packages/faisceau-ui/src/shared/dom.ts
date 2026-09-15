import {
  h,
  type ElementAttributesTagNameMap,
  type PrefixedElementTag,
  type ElementPrefixedTagNameMap,
} from "@lilian1315/create-element";

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

/** Adopts a label or description, generating it from a string option if missing. */
export function ensureText<Tag extends PrefixedElementTag>(
  root: HTMLElement,
  part: {
    readonly tag: Tag;
    readonly class: string;
    readonly data?: { [name: string]: string | boolean | undefined | null };
  },
  place: (parent: HTMLElement, node: ElementPrefixedTagNameMap[Tag]) => void,
  text: string | undefined,
  enhanceMode: boolean,
  restores: (() => void)[],
): ElementPrefixedTagNameMap[Tag] | null {
  let node = root.querySelector<ElementPrefixedTagNameMap[Tag]>(toSelector(part));
  const adopted = node !== null;
  if (typeof text === "string" && !node) {
    const created = h(part.tag, {
      class: part.class,
      data: part.data,
    } as ElementAttributesTagNameMap[Tag] & { children: never });
    place(root, created);
    restores.push(() => created.remove());
    node = created;
  }
  if (enhanceMode && adopted && node) restores.push(captureAttributes(node));
  if (node && text !== undefined) {
    if (enhanceMode && adopted) restores.push(captureChildNodes(node));
    node.replaceChildren(new Text(text));
  }
  return node;
}

/** Derives the lookup selector from a part spec, mirroring h()'s data serialization. */
function toSelector(part: {
  readonly tag: string;
  readonly class: string;
  readonly data?: { [name: string]: string | boolean | undefined | null };
}): string {
  let selector = `${part.tag}.${part.class}`;
  for (const [key, value] of Object.entries(part.data ?? {})) {
    if (typeof value !== "string" && value !== true) continue;
    const name = `data-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
    selector += value === true || value === "" ? `[${name}]` : `[${name}="${CSS.escape(value)}"]`;
  }
  return selector;
}
