# SPEC - `@dunky.dev/balloons-dom`

## Overview

The DOM platform for `@dunky.dev/balloons`: it measures real elements
(and virtual ones), resolves clipping boundaries, keeps positions fresh
as the page moves (`autoUpdate`), and coordinates every active floating
element through one per-frame scheduler.

```
   scroll / resize / ResizeObserver / rAF-diff   (per instance)
   |
   v
   scheduler  -  ONE frame callback for the whole page
   |
   |   coalesce: n events, n instances  ->  one flush
   |   order:    plain updates, then all reads, then all writes
   v
   update()  -  computePosition(reference, floating, ...)
   |
   |   every platform method here is synchronous
   v
   plain result object  -  same call stack, zero microtask hops
```

## Intent

Be the reference platform: prove the core's sync-first contract on the
substrate that matters most, and own the one structural performance
decision a DOM layer can make — **batching across instances**. Ancestor
engines give each floating element an independent listener chain; fifty
tooltips means fifty read-then-write passes per scroll event. Here every
instance funnels into one scheduler flush per frame.

## Scope & boundaries

**In scope.** `Platform<ReferenceElement>` (measurement, clipping,
coordinate-space conversion, RTL detection); virtual elements;
`autoUpdate`; the frame scheduler; a `computePosition` convenience bound
to this platform and typed synchronously.

**Out of scope — invariants.**

- **No positioning math.** Geometry belongs to core; this package only
  measures and schedules.
- **No interactions.** Hover, dismiss, focus live in consumers.
- **SSR-safe imports.** No module in `src/` may touch `window`,
  `document`, or any observer at import time — globals are referenced
  inside functions only. Enforced by `tests/ssr.test.ts`, which imports
  everything in a windowless Node process. (This is the guard the
  sibling repos don't have yet; the correct pattern is
  `typeof window === 'undefined'`-style checks, never a bare `window`
  reference that assumes the global exists.)

## The behavior contract

### Measurement

- Rects are offset-parent-relative for `absolute` strategy and
  viewport-relative for `fixed`, in CSS pixels.
- The floating rect is `{ x: 0, y: 0, width, height }` — position comes
  out of the engine, not the current layout.
- A **virtual element** (`{ getBoundingClientRect, contextElement? }`)
  is a first-class reference: measurement uses its rect, and its
  `contextElement` (when given) anchors clipping and RTL detection.
- `isRTL` reads the computed `direction`, so logical alignments follow
  the document's language without consumer code.

### Clipping

- `'clippingAncestors'` resolves to the element's overflow-clipping
  ancestor chain, intersected with the root boundary (`'viewport'` or a
  given rect). Explicit boundaries (element, list, rect) intersect the
  same way. The intersection is what `detectOverflow` compares against.

### autoUpdate

- Event-driven by default: ancestor `scroll` (passive) + `resize`
  listeners and a `ResizeObserver` on both elements. `animationFrame`
  mode adds a rAF rect-diff for references that move without events.
- Every trigger routes through the scheduler — bursts within one frame
  collapse to a single update, and updates from different instances
  share the same flush.
- Calls `update()` once, synchronously, on setup; returns a cleanup that
  removes every listener and cancels pending scheduled work.
- Position **tracking** is not animation: it does not pause under
  `prefers-reduced-motion` (a detached overlay is the worse failure —
  see `ACCESSIBILITY.md`). Animated _transitions_ between positions are
  the consumer's to gate.

### Scheduler

- `schedule(task)` — deduplicates by task identity, flushes once on the
  next frame.
- `scheduleMeasured({ read, write })` — within a flush, **all** reads
  run before **any** write, so split tasks never interleave layout reads
  with writes. Plain tasks run before the measured set.
- A task scheduled during a flush lands in the next frame, never the
  current one.
- One shared instance per process (`scheduler`); `createScheduler`
  exists for isolation and for tests, with an injectable frame source.

### The sync contract, made concrete

Every platform method here returns plainly, so this package's
`computePosition` is **typed** to return `ComputePositionResult`, not a
Promise — consumers get the coordinates on the same call stack. Keeping
that true is a boundary: a platform method that turns async breaks the
public type and is a major change by definition.

## Not yet handled — deliberate v0.1 gaps

Each of these is real, known, and belongs to the "re-earn the edge-case
moat deliberately" plan (ARCHITECTURE.md). Landing one means landing a
regression test with it:

- CSS transforms and zoom (`getScale`, visual-viewport offsets).
- Iframe traversal (measuring across frame boundaries).
- Shadow DOM: slotted/host clipping, composed-tree ancestor walks, and
  the fixed-ancestor + `overflow: hidden` interaction (the ancestor
  engine's open bug #2934 class).
- Fixed-strategy clipping-ancestor pruning (a fixed floating element
  escapes non-containing ancestors; today they still clip it).
- `IntersectionObserver`-based reference tracking in `autoUpdate`
  (cheaper than rAF for detached-movement detection).
- Table offset-parent quirks and non-`static` body edge cases.

## Edge cases that carry design meaning

- Importing any module in a windowless process must not throw — globals
  are function-scoped, never module-scoped.
- A virtual element without `contextElement` still positions; clipping
  falls back to the viewport.
- `autoUpdate`'s cleanup cancels work already queued in the scheduler —
  no post-teardown update may fire.
- `ResizeObserver` absence (older environments) degrades gracefully:
  scroll/resize handling continues, element-resize tracking is skipped.
