/** Read-only reactive value exposed by a Faisceau UI controller. */
export interface FuiReactive<T> {
  get(): T;
  peek(): T;
}

/** Lifecycle shared by every DOM component in the package. */
export interface FuiController<Api> {
  readonly api: FuiReactive<Api>;
  readonly root: HTMLElement;
  readonly started: boolean;

  /** Appends a newly-created component and starts its Zag machine. */
  mount(target: ParentNode): this;

  /** Starts a prepared component after its markup has entered the document. */
  start(): this;

  /** Stops effects/listeners. Markup created by the controller is also removed. */
  destroy(): void;
}
