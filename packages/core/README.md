# `@dunky.dev/balloons`

The positioning engine: `computePosition`, the middleware pipeline and
its authority, `detectOverflow`, and pure geometry helpers. Zero
dependencies, zero substrate — pure TypeScript over rectangles.

```ts
import { computePosition, offset, flip, shift } from '@dunky.dev/balloons'

const result = computePosition(reference, floating, {
  placement: 'bottom',
  platform, // any Platform<TElement> — DOM, canvas, a test double
  middleware: [offset(8), flip(), shift({ padding: 8 })],
})
```

On a fully synchronous platform the result is a **plain object** — no
Promise, no microtask hop. On an async platform (native bridge
measurement) the same call returns a Promise from the first async hop
onward. Middleware are written once and work on both paths.

Middleware declare `reads` and `writes`; the pipeline is validated
before it runs, so a misordered composition (e.g. `arrow` before
`shift`) throws with the fix in the message instead of silently
misplacing things.

See [`SPEC.md`](./SPEC.md) for the full behavior contract, and the
[repo README](../../README.md) for the layered model.
