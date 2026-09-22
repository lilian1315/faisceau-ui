import { describe, expect, it, vi } from "vite-plus/test";
import type { Machine, MachineSchema } from "@zag-js/core";
import { signal } from "faisceau";

import { createZagMachine, normalizeProps, type ZagDomProps } from "./index.ts";

type TestState = "closed" | "open";

interface TestProps {
  disabled: boolean;
  id: string;
  onPress?: () => void;
  showTitle: boolean;
}

interface TestService {
  prop<TKey extends keyof TestProps>(key: TKey): TestProps[TKey];
  send(event: { type: "TOGGLE" }): void;
  state: { get(): TestState };
}

interface TestApi {
  getTriggerProps(): ZagDomProps;
  open: boolean;
}

interface TestSchema extends MachineSchema {
  action: "onStart" | "onStop";
  computed: Record<never, never>;
  context: Record<never, never>;
  effect: never;
  event: { type: "TOGGLE" };
  guard: never;
  props: TestProps;
  refs: Record<never, never>;
  state: TestState;
  tag: never;
}

function createTestMachine(onStart = () => {}, onStop = () => {}): Machine<TestSchema> {
  return {
    implementations: {
      actions: {
        onStart,
        onStop,
      },
    },
    initialState: () => "closed" as TestState,
    props: ({ props }: { props: Partial<TestProps> }): TestProps => ({
      disabled: false,
      id: "test",
      showTitle: true,
      ...props,
    }),
    states: {
      closed: {
        entry: ["onStart"],
        on: { TOGGLE: { target: "open" } },
      },
      open: {
        on: { TOGGLE: { target: "closed" } },
      },
    },
    exit: ["onStop"],
  };
}

function connectTestMachine(service: TestService, normalize: typeof normalizeProps): TestApi {
  const open = service.state.get() === "open";

  return {
    open,
    getTriggerProps: () =>
      normalize.button({
        "aria-expanded": open,
        disabled: service.prop("disabled"),
        onClick: () => {
          service.prop("onPress")?.();
          service.send({ type: "TOGGLE" });
        },
        title: service.prop("showTitle") ? "Available choices" : undefined,
      }),
  };
}

const tick = async (): Promise<void> => {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
};

describe("createZagMachine", () => {
  it("binds existing markup before start and reacts to service notifications", async () => {
    document.body.innerHTML = '<button id="trigger">Choose</button>';
    const trigger = document.querySelector<HTMLButtonElement>("#trigger")!;
    const controller = createZagMachine(
      createTestMachine(),
      { id: "fruit", showTitle: true },
      connectTestMachine,
    );

    controller.bind(trigger, (api) => api.getTriggerProps());

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.title).toBe("Available choices");

    // The listener is already mounted, but Zag ignores events until start.
    trigger.click();
    await tick();
    expect(controller.api.get().open).toBe(false);

    controller.start();
    trigger.click();
    await tick();

    expect(controller.api.get().open).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    controller.destroy();
  });

  it("starts, stops, and destroys bindings idempotently", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const trigger = document.createElement("button");
    const controller = createZagMachine(
      createTestMachine(onStart, onStop),
      { id: "fruit" },
      connectTestMachine,
    );

    controller.bind(trigger, (api) => api.getTriggerProps());
    controller.start();
    controller.start();

    expect(onStart).toHaveBeenCalledTimes(1);

    controller.destroy();
    controller.destroy();
    controller.start();

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(trigger.hasAttribute("aria-expanded")).toBe(false);
    expect(trigger.hasAttribute("title")).toBe(false);
  });

  it("reconciles removed keys and replaces listeners on prop updates", async () => {
    const oldPress = vi.fn();
    const newPress = vi.fn();
    const trigger = document.createElement("button");
    const controller = createZagMachine(
      createTestMachine(),
      {
        disabled: true,
        id: "fruit",
        onPress: oldPress,
        showTitle: true,
      },
      connectTestMachine,
    );

    controller.bind(trigger, (api) => api.getTriggerProps());
    controller.start();
    controller.updateProps({
      disabled: false,
      onPress: newPress,
      showTitle: false,
    });

    expect(trigger.disabled).toBe(false);
    expect(trigger.hasAttribute("title")).toBe(false);

    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await tick();

    expect(oldPress).not.toHaveBeenCalled();
    expect(newPress).toHaveBeenCalledTimes(1);

    controller.destroy();
  });

  it("updates user props from Faisceau dependencies", () => {
    const showTitle = signal(true);
    const getProps = vi.fn(() => ({ id: "fruit", showTitle: showTitle.get() }));
    const trigger = document.createElement("button");
    const controller = createZagMachine(createTestMachine(), getProps, connectTestMachine);

    controller.bind(trigger, (api) => api.getTriggerProps());
    controller.start();
    expect(trigger.title).toBe("Available choices");
    expect(getProps).toHaveBeenCalledTimes(2);

    showTitle.set(false);
    expect(trigger.hasAttribute("title")).toBe(false);
    expect(getProps).toHaveBeenCalledTimes(3);
    controller.destroy();
  });

  it("disposes an individual binding without affecting the service", async () => {
    const onPress = vi.fn();
    const trigger = document.createElement("button");
    const controller = createZagMachine(
      createTestMachine(),
      { id: "fruit", onPress },
      connectTestMachine,
    );

    const dispose = controller.bind(trigger, (api) => api.getTriggerProps());
    controller.start();
    dispose();
    dispose();

    trigger.click();
    await tick();

    expect(onPress).not.toHaveBeenCalled();
    expect(trigger.hasAttribute("aria-expanded")).toBe(false);
    expect(controller.api.get().open).toBe(false);

    controller.destroy();
  });

  it("publishes prop updates when a connector retains its API object", () => {
    const trigger = document.createElement("button");
    let label = "First";
    const retainedApi = {
      getTriggerProps: () => ({ "aria-label": label }),
      open: false,
    } satisfies TestApi;
    const connect = (_service: TestService): TestApi => retainedApi;
    const controller = createZagMachine(createTestMachine(), { id: "fruit" }, connect);

    controller.bind(trigger, (api) => api.getTriggerProps());
    expect(trigger.getAttribute("aria-label")).toBe("First");

    label = "Second";
    controller.updateProps({});

    expect(trigger.getAttribute("aria-label")).toBe("Second");
    controller.destroy();
  });

  it("exposes a read-only connected value and one prop update operation", () => {
    const controller = createZagMachine(createTestMachine(), { id: "fruit" }, connectTestMachine);

    expect("set" in controller.api).toBe(false);
    expect("trigger" in controller.api).toBe(false);
    expect("refresh" in controller).toBe(false);
    expect("updateProps" in controller).toBe(true);
    controller.destroy();
  });

  it("uses the official vanilla prop normalization matrix", () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const onInput = vi.fn();
    const onChange = vi.fn();
    const onDoubleClick = vi.fn();
    const normalized = normalizeProps.element({
      className: "field",
      defaultChecked: true,
      defaultValue: "France",
      htmlFor: "country",
      onBlur,
      onDoubleClick,
      onFocus,
      style: { "--fui-accent": "red", marginBottom: "4px" },
      viewBox: "0 0 16 16",
    });

    expect(normalized).toMatchObject({
      checked: true,
      class: "field",
      for: "country",
      ondblclick: onDoubleClick,
      onfocusin: onFocus,
      onfocusout: onBlur,
      value: "France",
      viewBox: "0 0 16 16",
    });
    expect(normalized.style).toMatchObject({ "--fui-accent": "red", marginBottom: "4px" });
    expect(normalizeProps.input({ onInput }).oninput).toBe(onInput);
    expect(normalizeProps.input({ onChange }).oninput).toBe(onChange);
  });
});
