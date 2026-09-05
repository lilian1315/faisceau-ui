import type { Reactive } from "faisceau";

/** Lifecycle shared by every DOM component in the package. */
export interface FuiController<Api> {
  readonly api: Reactive<Api>;
  readonly root: HTMLElement;
  readonly started: boolean;

  /** Appends a newly-created component and starts its Zag machine. */
  mount(target: ParentNode): this;

  /** Starts a prepared component after its markup has entered the document. */
  start(): this;

  /** Stops effects/listeners. Markup created by the controller is also removed. */
  destroy(): void;
}

export interface FuiFieldOptions {
  /** Stable machine id. A `fui-*` id is generated when omitted. */
  id?: string;
  /** Extra caller-owned class added without replacing FUI classes. */
  className?: string;
  /** Optional supporting text rendered below the control. */
  description?: string;
  /** Optional validation message rendered below the control. */
  errorMessage?: string;
}
