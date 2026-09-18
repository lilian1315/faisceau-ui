interface StoryShellOptions {
  description: string;
  eyebrow: string;
  title: string;
}

export interface StoryShell {
  canvas: HTMLElement;
  output: HTMLOutputElement;
  root: HTMLElement;
  setSource(source: string): void;
}

export function createStoryShell(options: StoryShellOptions): StoryShell {
  const canvas = asDom<HTMLElement>(
    <section aria-label="Aperçu du composant" class="fui-story__canvas" />,
  );
  const output = asDom<HTMLOutputElement>(
    <output aria-live="polite" class="fui-story__output">
      Interagissez avec le composant pour observer sa valeur.
    </output>,
  );
  const source = asDom<HTMLElement>(<code />);
  const root = asDom<HTMLElement>(
    <article class="fui-story" lang="fr">
      <header class="fui-story__header">
        <span class="fui-story__eyebrow">{options.eyebrow}</span>
        <h2 class="fui-story__title">{options.title}</h2>
        <p class="fui-story__description">{options.description}</p>
      </header>
      {canvas}
      {output}
      <aside class="fui-story__inspect">
        <details>
          <summary>Voir le code source</summary>
          <pre>{source}</pre>
        </details>
      </aside>
    </article>,
  );

  return {
    canvas,
    output,
    root,
    setSource(value) {
      source.textContent = value.trim();
    },
  };
}

export function asDom<T extends globalThis.Element>(element: unknown): T {
  return element as T;
}

export function trackController(root: HTMLElement, controller: { destroy(): void }): void {
  queueMicrotask(() => {
    if (!root.isConnected) {
      controller.destroy();
      return;
    }

    const observer = new MutationObserver(() => {
      if (root.isConnected) return;
      observer.disconnect();
      controller.destroy();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

export function formatValues(values: readonly string[]): string {
  return values.length === 0 ? "Aucune valeur" : values.join(", ");
}
