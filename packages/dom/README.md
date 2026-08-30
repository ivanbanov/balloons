# `@dunky.dev/balloons-dom`

The DOM platform for [`@dunky.dev/balloons`](../core): element and
virtual-element measurement, clipping resolution, event-driven
`autoUpdate`, and a batched cross-instance frame scheduler.

```ts
import { autoUpdate, computePosition } from '@dunky.dev/balloons-dom'
import { flip, offset, shift } from '@dunky.dev/balloons'

const cleanup = autoUpdate(reference, floating, () => {
  // synchronous: the DOM platform never forces a Promise
  const { x, y } = computePosition(reference, floating, {
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  })
  floating.style.transform = `translate(${x}px, ${y}px)`
})
```

Every `autoUpdate` instance on the page funnels into one per-frame
scheduler flush — n tooltips share a single frame callback instead of n
independent listener chains. SSR-safe: importing this package in a
windowless Node process is tested in CI.

See [`SPEC.md`](./SPEC.md) for the behavior contract and the explicit
list of v0.1 measurement gaps.
