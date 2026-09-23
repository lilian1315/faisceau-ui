import { assertType, expectTypeOf, test } from 'vite-plus/test'
import * as checkbox from '@zag-js/checkbox'
import * as combobox from '@zag-js/combobox'

import { createZagMachine } from './index.ts'

test('couples the machine and connector through one Zag schema', () => {
  const controller = createZagMachine(checkbox.machine, { id: 'terms' }, checkbox.connect)

  expectTypeOf(controller.api.get()).toMatchTypeOf<checkbox.Api>()
  expectTypeOf(controller.api).toHaveProperty('get').toBeFunction()
  expectTypeOf(controller.api).toHaveProperty('peek').toBeFunction()
  expectTypeOf(controller.service).toMatchTypeOf<checkbox.Service>()

  // @ts-expect-error A Checkbox machine cannot be paired with a Combobox connector.
  assertType(createZagMachine(checkbox.machine, { id: 'field' }, combobox.connect))
})
