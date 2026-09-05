# TODO

## Move item-aligned Select positioning upstream to Zag

- Propose a native `alignItemWithTrigger` option for `@zag-js/select`.
- Coordinate selected-item scrolling, placement, and positioned visibility inside the Zag
  machine so adapters do not need a virtual-anchor shim or an extra animation frame.
- Cover viewport fallback, RTL, coarse pointers, and reopening without stale coordinates.
- Replace `packages/faisceau-ui/src/select/positioning.ts` after adopting the upstream API.

Related Zag discussion: [“item-aligned” for Select component](https://github.com/chakra-ui/zag/discussions?discussions_q=%22item-aligned%22).
