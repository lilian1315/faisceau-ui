import type { FuiController, FuiFieldOptions } from "../types.js";

export interface FieldControlContext {
  readonly describedBy: string | undefined;
  readonly disabled: boolean;
  readonly id: string;
  readonly invalid: boolean;
  readonly label: HTMLLabelElement;
}

export interface FieldControlFactory<Controller extends FuiController<unknown>> {
  readonly rootClass: `fui-${string}`;
  create(context: FieldControlContext): Controller;
  enhance(root: HTMLElement, context: FieldControlContext): Controller;
}

export interface FieldOptions<Controller extends FuiController<unknown>> extends FuiFieldOptions {
  control: FieldControlFactory<Controller>;
  disabled?: boolean;
  invalid?: boolean;
  label: string;
}

export interface EnhanceFieldOptions<
  Controller extends FuiController<unknown>,
> extends FuiFieldOptions {
  control: FieldControlFactory<Controller>;
  disabled?: boolean;
  invalid?: boolean;
  label?: string;
}

export type FieldController<Controller extends FuiController<unknown>> = Controller & {
  readonly control: Controller;
};
