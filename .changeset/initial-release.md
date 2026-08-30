---
'@dunky.dev/balloons': minor
'@dunky.dev/balloons-dom': minor
---

Initial release of the balloons positioning engine.

`@dunky.dev/balloons` — the substrate-agnostic core: `computePosition` with
sync-first adaptive execution (a synchronous platform gets a plain object on
the same call stack; the Promise path activates only from the first genuinely
async platform call), a typed `Platform<TElement>` contract, a positioning
authority that validates middleware `reads`/`writes` declarations before the
pipeline runs, named `resetTo` phases instead of loop-index rewinding, the
`offset` / `shift` / `flip` / `arrow` middleware, `detectOverflow`, and the
pure geometry helpers `pointInPolygon` / `pointInRect`.

`@dunky.dev/balloons-dom` — the DOM platform: element and virtual-element
measurement, clipping-rect resolution, event-driven `autoUpdate`, and a
batched cross-instance frame scheduler that coalesces every active floating
element's update into one read-then-write pass per frame.

```ts
import { computePosition, offset, flip, shift } from '@dunky.dev/balloons'
import { platform } from '@dunky.dev/balloons-dom'

const { x, y, placement } = computePosition(reference, floating, {
  placement: 'bottom',
  platform,
  middleware: [offset(8), flip(), shift({ padding: 4 })],
})
```
