import type { InputProps, Machine, MachineSchema, Service } from "@zag-js/core";
import { normalizeProps, spreadProps, VanillaMachine, type Attrs } from "@zag-js/vanilla";
import { effect, signal } from "faisceau";

/** A value or a Faisceau-tracked getter accepted by Zag's vanilla machine. */
export type MaybeGetter<T> = T | (() => T);

/** Infer the public props handled by a Zag machine. */
export type ZagMachineProps<TSchema extends MachineSchema> = NonNullable<TSchema["props"]>;

/** DOM attributes returned by a connected Zag API. */
export type ZagDomProps = Attrs;

/** Read a set of DOM props from the latest connected Zag API. */
export type ZagPropsGetter<TApi> = (api: TApi) => ZagDomProps | null | undefined;

/** Read-only view of the latest connected Zag value. */
export interface ZagConnected<TApi> {
  get(): TApi;
  peek(): TApi;
}

/**
 * A small lifecycle wrapper around a Zag vanilla machine.
 *
 * Bindings can be installed before `start()`, which makes it possible to
 * enhance existing markup as well as elements created from scratch.
 */
export interface ZagMachineController<TProps extends object, TApi> {
  /** The latest value returned by the machine's `connect` function. */
  readonly api: ZagConnected<TApi>;

  /**
   * Reactively apply one of the connected API's prop getters to an element.
   * Returns an idempotent disposer for this binding.
   */
  bind<TElement extends Element>(element: TElement, getter: ZagPropsGetter<TApi>): () => void;

  /** Start the Zag service. Calling this more than once has no effect. */
  start(): void;

  /** Merge new props into the Zag service; getter dependencies remain reactive. */
  updateProps(props: MaybeGetter<Partial<TProps>>): void;

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
export function createZagMachine<TSchema extends MachineSchema, TApi>(
  machine: Machine<TSchema>,
  props: MaybeGetter<InputProps<NoInfer<TSchema>>>,
  connect: (service: Service<NoInfer<TSchema>>, normalize: typeof normalizeProps) => TApi,
): ZagMachineController<ZagMachineProps<TSchema>, TApi> {
  type TProps = ZagMachineProps<TSchema>;

  const service = new VanillaMachine(machine, props);
  const apiSignal = signal(connect(service.service, normalizeProps));
  const api: ZagConnected<TApi> = {
    get: () => apiSignal.get(),
    peek: () => apiSignal.peek(),
  };
  const bindings = new Set<() => void>();
  const scope = `faisceau-zag-${++controllerId}`;

  let bindingId = 0;
  let state: "idle" | "started" | "destroyed" = "idle";

  const publishApi = (): void => {
    if (state === "destroyed") return;

    const previousApi = apiSignal.peek();
    const nextApi = connect(service.service, normalizeProps);

    // Most Zag connectors return a fresh object. Trigger explicitly as a
    // fallback for custom connectors that retain their API object.
    if (Object.is(previousApi, nextApi)) {
      apiSignal.trigger();
    } else {
      apiSignal.set(nextApi);
    }
  };

  const unsubscribe = service.subscribe(publishApi);
  let stopPropsSync = (): void => {};

  const synchronizeProps = (source: MaybeGetter<Partial<TProps>>, applyImmediately: boolean) => {
    stopPropsSync();
    stopPropsSync = (): void => {};

    if (typeof source !== "function") {
      if (applyImmediately) service.updateProps(source as never);
      return;
    }

    let firstRun = true;
    stopPropsSync = effect(() => {
      source();
      if (firstRun && !applyImmediately) {
        firstRun = false;
        return;
      }
      firstRun = false;
      service.updateProps(source as never);
    });
  };

  synchronizeProps(props as MaybeGetter<Partial<TProps>>, false);

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
      publishApi();
    } catch (error) {
      state = "idle";
      throw error;
    }
  };

  const updateProps = (nextProps: MaybeGetter<Partial<TProps>>): void => {
    if (state === "destroyed") return;
    synchronizeProps(nextProps, true);
  };

  const destroy = (): void => {
    if (state === "destroyed") return;
    state = "destroyed";

    stopPropsSync();
    unsubscribe();
    for (const dispose of bindings) dispose();

    // `stop` also releases the store subscriptions created by VanillaMachine,
    // including when the controller was destroyed before it was started.
    service.stop();
  };

  return { api, bind, start, updateProps, destroy };
}

export { normalizeProps } from "@zag-js/vanilla";
