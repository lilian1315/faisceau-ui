# TODO

## Date Picker

- Implement `createDatePicker` and `enhanceDatePicker` with the dedicated Zag Next primitive.
- Keep a native form value, cover single/range/multiple modes as supported by Zag, and document the
  minimal enhancement markup.
- Add Chrome behavior tests, type tests, Storybook stories, styles, and published export coverage.

## Move item-aligned Select positioning upstream to Zag

- Propose a native `alignItemWithTrigger` option for `@zag-js/select`.
- Coordinate selected-item scrolling, placement, and positioned visibility inside the Zag
  machine so adapters do not need a virtual-anchor shim or an extra animation frame.
- Cover viewport fallback, RTL, coarse pointers, and reopening without stale coordinates.
- Replace `packages/faisceau-ui/src/select/positioning.ts` after adopting the upstream API.

Related Zag discussion: [“item-aligned” for Select component](https://github.com/chakra-ui/zag/discussions?discussions_q=%22item-aligned%22).
