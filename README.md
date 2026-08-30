# balloons

Anchored positioning for floating UI — tooltips, popovers, menus,
selects — computed once as pure rectangle math, rendered anywhere
through thin substrate platforms.

```ts
import { computePosition, offset, flip, shift, arrow } from '@dunky.dev/balloons'
import { platform, autoUpdate } from '@dunky.dev/balloons-dom'

const result = computePosition(referenceEl, floatingEl, {
  placement: 'bottom',
  platform,
  middleware: [offset(8), flip(), shift({ padding: 8 })],
})

// On a synchronous platform (the DOM is one), `result` is a plain
// object — not a Promise. Same call stack, zero microtask hops.
Object.assign(floatingEl.style, {
  left: `${result.x}px`,
  top: `${result.y}px`,
})
```

## Why another positioning engine

The engine is built around four decisions its ancestors can't adopt
without breaking their public contracts (see
[`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full reasoning):

1. **Sync-first execution.** Middleware pipelines run synchronously all
   the way through when the platform measures synchronously; the
   Promise path exists only from the first genuinely async call onward.
2. **A positioning authority.** Middleware declare what they `read` and
   `write`; misordered pipelines throw at dev time with the fix in the
   message, instead of silently misplacing arrows in production.
3. **Named reset.** Pipeline re-entry is an explicit `resetTo(phase)`
   transition with a budget — not a rewound loop index.
4. **Typed, proven platform-agnosticism.** `Platform<TElement>` is
   generic (no `any`), a purity test fails CI if core ever references a
   substrate global, and a non-DOM sandbox computes real positions on a
   canvas scene.

## Packages

| Package                                     | What it is                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| [`@dunky.dev/balloons`](./packages/core)    | The engine: `computePosition`, middleware + authority, overflow, geometry    |
| [`@dunky.dev/balloons-dom`](./packages/dom) | The DOM platform: measurement, virtual elements, `autoUpdate`, the scheduler |

Substrate bindings (`react`, `solid`, `native`) are planned as thin
siblings of `dom`, mirroring the `state-machine` layout. Interactions
(hover intent, dismiss, typeahead) intentionally live in
[`dunky-dev/ui`](https://github.com/dunky-dev/ui), not here.

## Where things are

| Path         | What                                                               |
| ------------ | ------------------------------------------------------------------ |
| `packages/`  | The publishable engine and platforms — each with its own `SPEC.md` |
| `sandbox/`   | Runnable demos: `dom` (real tooltip), `canvas` (non-DOM platform)  |
| `benchmark/` | Perf suite vs `@floating-ui/core` — see `AGENTS.md#benchmark`      |

## Status

v0.1 territory: solid on the DOM common path (`offset`, `shift`, `flip`,
`arrow`, virtual elements, `autoUpdate`), explicit about what's not yet
hardened (transforms/zoom, iframes, shadow-DOM clipping — tracked in
`packages/dom/SPEC.md`). No comparative performance numbers appear
anywhere until the benchmark suite produces them — that's a repo rule,
not modesty.

## Contributing

Start with [`AGENTS.md`](./AGENTS.md) — the working contract — then
[`CONTRIBUTING.md`](./CONTRIBUTING.md) for setup and commands.

## License

[MIT](./LICENSE)
