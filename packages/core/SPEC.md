# SPEC - `@dunky.dev/balloons`

## Overview

An **anchored-positioning engine**: given a reference box and a floating
box, compute where the floating box goes — a tooltip beside a button, a
menu under a trigger, a popover pinned to a text selection. The engine is
pure math over rectangles; a thin **platform** supplies the measurements,
and **middleware** refine the raw coordinates one concern at a time.

```
   reference + floating  (opaque handles, never inspected by core)
   |
   |  platform.getElementRects()   - the only way core learns geometry
   v
   rects  -  { reference: Rect, floating: Rect }
   |
   |  computeCoordsFromPlacement(placement, rtl)
   v
   raw coords  -  where the placement says the floating box goes
   |
   v
   [ middleware pipeline ]  -  validated by the authority before running
   |
   |   offset ...... push away from the reference
   |   flip ........ placement doesn't fit -> resetTo(placement)
   |   shift ....... clamp into the boundary
   |   arrow ....... aim the caret at the reference
   |
   |   each declares reads: [...] and writes: [...]
   |   a violated declaration is a thrown error, not a silent drift
   v
   { x, y, placement, strategy, middlewareData }
   |
   |   sync platform  -> plain object, same call stack, zero microtasks
   |   async platform -> Promise, from the first async hop onward only
   v
   consumer applies the coordinates (core never touches a view)
```

## Intent

Compute anchored positions **once, agnostically**, and run identically on
any substrate — DOM, canvas, native, a terminal grid, or a bare test.
Core is the agnostic half: coordinate math, overflow detection, the
middleware pipeline, and the platform contract a substrate implements.

Three design decisions distinguish this engine from its ancestors, and
each is part of the contract, not an implementation detail:

1. **Sync-first execution.** A fully synchronous platform gets a fully
   synchronous answer — a plain object on the same call stack. The
   Promise path exists only from the first genuinely asynchronous
   platform call onward. Nothing is made async by architecture.
2. **A positioning authority.** Middleware declare what they read and
   write. The pipeline is validated against those declarations before it
   runs; a middleware ordered before its declared dependency is a thrown
   error with the fix in the message.
3. **Named reset.** A middleware re-enters the pipeline by requesting a
   named phase — `placement` or `rects` — never by loop-index tricks.

## Scope & boundaries

**In scope.** The placement vocabulary and its coordinate math; the
typed platform contract; the middleware pipeline, its authority, and its
reset protocol; overflow detection; the built-in middleware (`offset`,
`shift`, `flip`, `arrow`); and the pure geometry helpers
(`pointInPolygon`, `pointInRect`) that interaction layers build on.

**Out of scope — invariants, not preferences.**

- **No substrate.** Core is pure TypeScript. No DOM, no `window`, no
  `document`, no observers, no timers. This is enforced by a test that
  scans `src/` for substrate tokens — not by convention.
- **No interactions.** Hover intent, dismiss, focus, typeahead live in
  consumers (`dunky-dev/ui`), never here. Core exports the geometry those
  features need; it never wires an event.
- **No `any` at the platform boundary.** The platform is
  `Platform<TElement>`; element handles keep their type from the call
  site through middleware and back.
- **No scheduling.** `autoUpdate` and the cross-instance scheduler are
  substrate concerns (`@dunky.dev/balloons-dom`). Core computes a
  position when called and holds no state between calls.

## The model

### Placement

A placement is a **side** (`top` / `right` / `bottom` / `left`),
optionally refined by an **alignment** (`-start` / `-end`) — twelve
values total. `start`/`end` are logical along the alignment axis: on
vertical sides they follow the text direction, so `rtl` flips them.

### Platform

The platform is the only window onto the substrate:

```
Platform<TElement>
  getElementRects({ reference, floating, strategy })  -> ElementRects
  getDimensions(element)                              -> Dimensions
  getClippingRect({ element, boundary,
                    rootBoundary, strategy })         -> Rect
  convertOffsetParentRelativeRectToViewportRelativeRect?  (optional)
  isRTL?(element)                                     -> boolean
```

Every method may return its value **or** a Promise of it. Core adapts
per call: a synchronous return is consumed synchronously. `TElement` is
whatever the substrate anchors to — an `Element`, a scene node, a plain
rect, a grid cell. Core never inspects it; it only passes it back to the
platform.

### The pipeline and its authority

A middleware is a named unit with declared effects:

```
Middleware<TElement>
  name    - unique in a pipeline
  reads   - names of middleware whose effects it depends on
  writes  - channels it may mutate: 'coords' | 'placement' | 'rects'
  fn      - (state) => result, possibly async
```

Before the first run of a pipeline, the **authority** validates it:

- Duplicate names are an error.
- For each middleware, every name in `reads` that is present in the
  pipeline must appear **earlier**. `reads` names that are absent are
  fine — `arrow` reads `shift` when both are used, but works alone.
- At apply time, a result that mutates an undeclared channel — returns
  coordinates without `writes: ['coords']`, requests a placement reset
  without `'placement'`, a rects reset without `'rects'` — is an error.

Violations throw with the fix in the message. This is the structural
answer to the composition-order bug class (arrow+shift, size+shift,
autoPlacement+placement) that grows in engines where middleware patch a
shared blob with no declared dependencies.

### Reset — named re-entry

A middleware that invalidates earlier work requests re-entry by phase:

- `{ phase: 'placement', placement }` — the placement changed; recompute
  raw coordinates and rerun the pipeline from the top.
- `{ phase: 'rects', rects? }` — the geometry changed; re-measure via the
  platform (or accept provided rects), then recompute and rerun.

`middlewareData` survives a reset — that is how `flip` accumulates the
overflow of every placement it has tried. Resets are budgeted
(`MAX_RESET_COUNT = 50`); a request past the budget is ignored and the
pipeline settles with what it has, so a ping-ponging pair of middleware
degrades to a stale-but-rendered position, never a hang.

## The behavior contract

### Execution

- With a placement and no middleware, the result is the raw coordinates
  for that placement, centered on the alignment axis.
- **A pipeline in which every platform call and every middleware resolves
  synchronously returns a plain object — not a thenable.** This is the
  load-bearing guarantee consumers and the scheduler build on.
- The first asynchronous value — from the platform or a middleware —
  upgrades the remainder of that computation to a Promise. Everything
  already computed stays computed; middleware before the async hop ran
  synchronously.
- Middleware run in array order. Each sees the coordinates, placement,
  rects, and accumulated `middlewareData` left by its predecessors.
- A middleware's `data` is namespaced under its `name` and shallow-merged
  across passes.
- The result carries `x`, `y`, the final (possibly flipped) `placement`,
  the `strategy`, and `middlewareData`.

### Overflow detection

`detectOverflow(state, options)` reports how far an element escapes a
clipping boundary, per side, in pixels — positive means overflowing.
Options: `boundary` (platform-defined, default `'clippingAncestors'`),
`rootBoundary` (`'viewport'` or a rect), `elementContext` (`'floating'`
or `'reference'`), `altBoundary`, and `padding` (number or per-side).
It inherits the sync-first rule: a synchronous platform yields a
synchronous side object.

### Built-in middleware

- **`offset`** — displaces the floating box from its raw position:
  a number (main axis), or `{ mainAxis, crossAxis, alignmentAxis }`,
  where `alignmentAxis` overrides `crossAxis` on aligned placements and
  flips with `end` alignment and with `rtl`. Runs first; declares
  `writes: ['coords']`.
- **`shift`** — clamps the floating box into the boundary along the main
  axis (and the cross axis when `crossAxis: true`), publishing the
  applied delta as `{ x, y }`. Declares `reads: ['offset']`,
  `writes: ['coords']`.
- **`flip`** — walks `[initialPlacement, ...fallbackPlacements]`
  (default: the opposite placement), requesting a `placement` reset for
  the next candidate while the current one overflows. When nothing fits:
  `bestFit` (default) settles on the least-overflowing candidate,
  `initialPlacement` settles back on the original. Declares
  `reads: ['offset']`, `writes: ['placement']`.
- **`arrow`** — positions a caret element on the alignment axis so it
  points at the reference, clamped inside the floating box by `padding`,
  and reports `centerOffset` (how far it had to compromise). Because it
  runs after `shift` (`reads: ['offset', 'shift']`), the arrow is
  computed from the coordinates the floating box actually gets — a
  shifted popover keeps a truthful arrow.

### Geometry helpers

`pointInPolygon(point, polygon)` (ray-casting) and
`pointInRect(point, rect)` are exported pure functions. They exist here
so interaction layers (hover-intent safe-polygons) consume the same
geometry the engine trusts, instead of reimplementing it.

### Virtual references

The reference is opaque to core, so anything the platform can measure is
a valid anchor — including plain `{ getBoundingClientRect }` objects for
cursor-anchored menus and range selections. The contract: core passes
the handle to the platform untouched and never assumes element-ness.

## Performance guarantees

Performance is part of the contract. The engine must not regress these:

- **The all-sync path allocates no Promises and hops no microtasks** —
  measured, not asserted: the benchmark suite instruments microtask
  flushes.
- **A reset pass reuses the session** — re-entry recomputes coordinates;
  it does not rebuild state objects per attempt.
- Pipeline validation is **cached per middleware array** (WeakSet), so
  steady-state calls skip re-validation.

Any comparative performance claim against another engine goes through
the benchmark gate (`/benchmark`) before it appears in any document.

## Edge cases that carry design meaning

- A sync result is a **plain object**: `'then' in result` is false.
- `reads` on an absent middleware is not an error — presence is what
  activates the ordering constraint.
- A reset past the budget is ignored, never thrown: settle, don't hang.
- `middlewareData` persists across resets; coordinates and placement are
  recomputed each pass.
- `rtl` flips alignment only on vertical (`top`/`bottom`) sides, and
  flips `alignmentAxis` offsets with it.
- An `end`-aligned `alignmentAxis` offset is negated — `alignmentAxis`
  means "toward the alignment edge", not "toward positive x".
- `flip` with every candidate overflowing must still return a placement —
  the least-bad one, deterministically.
- `arrow` on a shifted floating box reports a `centerOffset` of the real
  compromise, computed from post-shift coordinates.
