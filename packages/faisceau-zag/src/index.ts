import { effect, signal, type Signal } from "faisceau";
import { normalizeProps, spreadProps, VanillaMachine, type Attrs } from "@zag-js/vanilla";

/** A value or a lazy value accepted by Zag's vanilla machine. */
export type MaybeGetter<T> = T | (() => T);

type FallbackProps = Record<string, unknown>;
type AnyConnect = (service: never, normalize: typeof normalizeProps) => unknown;

type PropsFactory<TMachine> = TMachine extends { props?: infer TFactory }
  ? NonNullable<TFactory>
  : never;

/** Infer the public props handled by a Zag machine. */
export type ZagMachineProps<TMachine> =
  PropsFactory<TMachine> extends (...args: never[]) => infer TProps
    ? TProps extends object
      ? TProps
      : FallbackProps
    : FallbackProps;

/** DOM attributes returned by a connected Zag API. */
export type ZagDomProps = Attrs;

/** Read a set of DOM props from the latest connected Zag API. */
export type ZagPropsGetter<TApi> = (api: TApi) => ZagDomProps | null | undefined;

/**
 * A small lifecycle wrapper around a Zag vanilla machine.
 *
 * Bindings can be installed before `start()`, which makes it possible to
 * enhance existing markup as well as elements created from scratch.
 */
export interface ZagMachineController<TProps extends object, TApi> {
  /** The latest value returned by the machine's `connect` function. */
  readonly api: Signal<TApi>;

  /**
   * Reactively apply one of the connected API's prop getters to an element.
   * Returns an idempotent disposer for this binding.
   */
  bind<TElement extends Element>(element: TElement, getter: ZagPropsGetter<TApi>): () => void;

  /** Start the Zag service. Calling this more than once has no effect. */
  start(): void;

  /** Merge new props into the Zag service and refresh its connected API. */
  updateProps(props: MaybeGetter<Partial<TProps>>): void;

  /** Re-run the supplied Zag `connect` function. */
  refresh(): void;

  /** Stop the service and dispose every DOM binding. */
  destroy(): void;
}

let controllerId = 0;

/**
 * Adapt a Zag machine to Faisceau signals and vanilla DOM elements.
 *
 * @example
 * ```ts
 * const select = createZagMachine(machine, props, connect)
 * const disposeTrigger = select.bind(trigger, (api) => api.getTriggerProps())
 * select.start()
 *
 * // Later
 * disposeTrigger()
 * select.destroy()
 * ```
 */
export function createZagMachine<TMachine, TConnect extends AnyConnect>(
  machine: TMachine,
  props: MaybeGetter<Partial<ZagMachineProps<TMachine>>>,
  connect: TConnect,
): ZagMachineController<ZagMachineProps<TMachine>, ReturnType<TConnect>> {
  type TApi = ReturnType<TConnect>;
  type TProps = ZagMachineProps<TMachine>;

  // `VanillaMachine` does not expose the schema type it inferred as a public
  // utility. The public factory keeps that inference at its boundary and this
  // cast is the single bridge to Zag's runtime wrapper.
  const service = new VanillaMachine(machine as never, props as never);
  const connectApi = connect as unknown as (
    zagService: typeof service.service,
    normalize: typeof normalizeProps,
  ) => TApi;
  const api = signal(connectApi(service.service, normalizeProps));
  const bindings = new Set<() => void>();
  const scope = `faisceau-zag-${++controllerId}`;

  let bindingId = 0;
  let state: "idle" | "started" | "destroyed" = "idle";

  const refresh = (): void => {
    if (state === "destroyed") return;

    const previousApi = api.peek();
    const nextApi = connectApi(service.service, normalizeProps);

    // Most Zag connectors return a fresh object. Trigger explicitly as a
    // fallback for custom connectors that retain their API object.
    if (Object.is(previousApi, nextApi)) {
      api.trigger();
    } else {
      api.set(nextApi);
    }
  };

  const unsubscribe = service.subscribe(refresh);

  const bind = <TElement extends Element>(
    element: TElement,
    getter: ZagPropsGetter<TApi>,
  ): (() => void) => {
    if (state === "destroyed") return () => {};

    const bindingScope = `${scope}-${++bindingId}`;
    let disposed = false;

    // Do not return spreadProps' cleanup from this effect. Its internal
    // previous-props snapshot must survive effect re-runs so that removed
    // keys and replaced listeners are reconciled correctly.
    const stopEffect = effect(() => {
      spreadProps(element, getter(api.get()) ?? {}, bindingScope);
    });

    const dispose = (): void => {
      if (disposed) return;
      disposed = true;

      stopEffect();

      // Reconcile with an empty prop bag before releasing spreadProps' state.
      // This removes the final listeners and attributes owned by the binding.
      spreadProps(element, {}, bindingScope)();
      bindings.delete(dispose);
    };

    bindings.add(dispose);
    return dispose;
  };

  const start = (): void => {
    if (state !== "idle") return;
    state = "started";

    try {
      service.start();
      // Starting runs entry actions without necessarily publishing a state
      // change, so force one connected snapshot afterwards.
      refresh();
    } catch (error) {
      state = "idle";
      throw error;
    }
  };

  const updateProps = (nextProps: MaybeGetter<Partial<TProps>>): void => {
    if (state === "destroyed") return;
    service.updateProps(nextProps as never);
  };

  const destroy = (): void => {
    if (state === "destroyed") return;
    state = "destroyed";

    unsubscribe();
    for (const dispose of bindings) dispose();

    // `stop` also releases the store subscriptions created by VanillaMachine,
    // including when the controller was destroyed before it was started.
    service.stop();
  };

  return { api, bind, start, updateProps, refresh, destroy };
}

export { normalizeProps } from "@zag-js/vanilla";
