import { assertType, expectTypeOf, it } from 'vite-plus/test'
import * as checkbox from '@zag-js/checkbox'
import * as combobox from '@zag-js/combobox'

import { createZagMachine } from './index.ts'

it('couples the machine and connector through one Zag schema', () => {
  const controller = createZagMachine(checkbox.machine, { id: 'terms' }, checkbox.connect)

  expectTypeOf(controller.api.get()).toEqualTypeOf<checkbox.Api>()
  expectTypeOf(controller.api).toHaveProperty('get').toBeFunction()
  expectTypeOf(controller.api).toHaveProperty('peek').toBeFunction()
  expectTypeOf(controller.service).toEqualTypeOf<checkbox.Service>()

  // @ts-expect-error A Checkbox machine cannot be paired with a Combobox connector.
  assertType(createZagMachine(checkbox.machine, { id: 'field' }, combobox.connect))
})

it('exposes a read-only connected value and one prop update operation', () => {
  const controller = createZagMachine(checkbox.machine, { id: 'terms' }, checkbox.connect)

  // @ts-expect-error the set method is not available on the connected value.
  controller.api.set()
  // @ts-expect-error the trigger method is not available on the connected value.
  controller.api.trigger()
  // @ts-expect-error the refresh method is not available on the connected value.
  controller.api.refresh()
  // @ts-expect-error the updateProps method is not available on the connected value.
  controller.api.updateProps()
})
