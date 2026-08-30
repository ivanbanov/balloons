# Architecture

The deep reference for how this repo is put together: the layered model,
the four design decisions that define the engine, where things live, and
how testing and releases work. For the rules of engagement, read
[`AGENTS.md`](./AGENTS.md) first.

## What this is

`balloons` is an anchored-positioning engine — the layer that answers
"where does this floating thing go, given this anchor and this screen".
It is the positioning foundation for every overlay primitive in
`dunky-dev/ui` (Tooltip, Popover, Menu, Select, Combobox), the same way
`dunky-dev/state-machine` is its behavior foundation.

It is deliberately **not** an interaction library. Hover intent,
dismiss ownership, focus, typeahead live in `dunky-dev/ui`'s
`dom/utils/*` next to their peers (`navigation`, `overlay`); this repo
exports positions and the pure geometry those features consume.

## The layered model

```
  packages/core          @dunky.dev/balloons
  |
  |   pure TypeScript over rectangles - zero dependencies, zero DOM
  |   computePosition, middleware + authority, detectOverflow,
  |   Platform<TElement> contract, geometry helpers
  |
  |          implemented by
  v
  packages/dom           @dunky.dev/balloons-dom
  |
  |   the DOM platform: measurement (rects, clipping, offset parents),
  |   virtual elements, event-driven autoUpdate, and the batched
  |   cross-instance frame scheduler
  |
  |          consumed by
  v
  dunky-dev/ui           (separate repo)
      overlay primitives wire positions to components; interactions
      (hover-intent, dismiss, typeahead) live there, calling back into
      core's geometry helpers
```

Dependencies point strictly downward on this diagram: `dom` imports
`core`; `core` imports nothing. A future substrate (canvas, native,
terminal) is a sibling of `dom`, never a change to `core`.

## The four design decisions

Each of these is a deliberate divergence from the ancestor engines
(floating-ui and kin), chosen after reading their source. They are
contracts — see `packages/core/SPEC.md` for the consumer-facing wording.

### 1. Sync-first execution

The ancestor engines run every middleware through `async`/`await`
because one platform (React Native bridge measurement) is genuinely
callback-based — so the DOM case, where every measurement is
synchronous, pays Promise allocation and microtask hops per middleware
per computation for no benefit.

Here, `computePosition` adapts per call: every platform and middleware
return is checked; synchronous values are consumed on the same call
stack, and the Promise path activates only from the first genuinely
asynchronous value onward. Middleware authors still write one `fn`
regardless. The helper is `chain(value, fn)` in
`packages/core/src/utils/awaitable.ts` — it is the only place the
sync/async fork exists.

### 2. The positioning authority

The ancestor engines let every middleware read and patch a shared
coords/middlewareData blob with no declared relationships — which is why
their open bug tracker is dominated by pair-wise composition bugs
(arrow+shift, size+shift, autoPlacement+placement).

Here, one authority (`packages/core/src/authority.ts`) validates the
pipeline before it runs: middleware declare `reads` (names they depend
on) and `writes` (channels they mutate), duplicate names and
out-of-order dependencies throw at dev time with the fix in the message,
and undeclared mutations throw at apply time. Composition mistakes are
loud and immediate, not silent and positional.

### 3. Named reset

Middleware re-enter the pipeline by requesting a named phase —
`{ phase: 'placement' }` or `{ phase: 'rects' }` — handled by an
explicit `resetTo` function, instead of the ancestor's `i = -1`
loop-index rewind. Same power (flip walks candidate placements,
re-measure on demand), but re-entry is a named, testable state
transition with a budget (`MAX_RESET_COUNT`), not a loop hack.

This does **not** pull in `@dunky.dev/state-machine` — core stays a
plain, dependency-free function library. Consumers that want machine
semantics wire them in their own bindings.

### 4. Typed platforms, proven agnostic

`Platform<TElement>` is generic — an `Element` on DOM, a plain rect in
tests, a scene node on canvas — where the ancestors type every element
`any`. And the agnosticism is exercised, not asserted:

- `packages/core/tests/purity.test.ts` fails the suite if any substrate
  token (`window`, `document`, `ResizeObserver`, …) appears in
  `packages/core/src` — the exact class of drift that let dead
  `document.getElementById` code sit inside floating-ui's "pure" core.
- `packages/core/tests/platform-agnostic.test.ts` runs the full
  middleware pipeline against a terminal-style integer grid platform.
- `sandbox/canvas` positions floating boxes on a `<canvas>` scene whose
  platform never touches DOM layout — the non-DOM consumer, runnable.

## Repo map

```
  packages/
    core/                 @dunky.dev/balloons - the engine
      src/
        compute-position.ts    sync-first orchestrator + named reset
        authority.ts           pipeline validation + write enforcement
        platform.ts            Platform<TElement>
        detect-overflow.ts     per-side overflow vs a clipping boundary
        types.ts               placement vocabulary, rects, results
        middleware/            offset, shift, flip, arrow
        utils/                 awaitable (sync/async fork), placement
                               math, rects, geometry (pointInPolygon)
      tests/                   behavior + combinatorial middleware suites,
                               grid-platform proof, purity gate
    dom/                  @dunky.dev/balloons-dom - the DOM platform
      src/
        platform.ts            Platform<Element | VirtualElement>
        get-element-rects.ts   offset-parent-relative measurement
        get-clipping-rect.ts   viewport + overflow-ancestor intersection
        get-offset-parent.ts
        auto-update.ts         event-driven reposition-on-change
        scheduler.ts           batched cross-instance frame coordinator
        utils.ts               element predicates, overflow ancestors
      tests/                   windowless-Node SSR gate, scheduler logic
  benchmark/              tinybench suite vs @floating-ui/core + demo app
  sandbox/
    dom/                  tooltip on real DOM, autoUpdate wired
    canvas/               non-DOM platform demo - the agnosticism proof
```

## The DOM platform's honest scope (v0.1)

The ancestor's real moat is years of paid-down measurement edge cases.
This platform starts correct for the common cases and explicit about
what it does not yet handle:

- **Handled:** absolute/fixed strategies, offset-parent-relative rects,
  scroll compensation, overflow-ancestor clipping, viewport root
  boundary, virtual elements, RTL detection.
- **Not yet (tracked in `packages/dom/SPEC.md`):** CSS transforms/zoom
  (`get-scale`), iframes, shadow-DOM clipping with fixed ancestors,
  writing modes beyond direction, `IntersectionObserver`-based reference
  tracking in `autoUpdate`.

New edge-case coverage lands with a regression test and a SPEC note —
that is how the moat gets re-earned deliberately.

## The scheduler (why it exists)

Ancestor engines give each floating element its own `autoUpdate`
listener chain: 50 tooltips means 50 independent read-then-write passes
per scroll event — a structural layout-thrashing risk no micro-opt
fixes. `packages/dom/src/scheduler.ts` is one per-frame coordinator:
every active instance's update is enqueued, deduplicated, and flushed
in a single frame callback, with two-phase (`read` all, then `write`
all) tasks available for consumers that split measurement from
mutation. `autoUpdate` routes through it by default. This — not raw
compute speed — is the structural performance difference, and the
benchmark suite is where it gets proven, never prose.

## Testing

- **Everything runs in bare Node** (`vitest`, `environment: 'node'`).
  Core needs nothing else by design; the dom package's SSR test is only
  meaningful in a process with no `window` at all.
- **Combinatorial middleware suites** (`tests/middleware/combinations.test.ts`)
  pair middleware the way real consumers do — arrow+shift, flip+shift,
  offset+flip — because the ancestor's live bugs are pairing bugs.
- **Fixtures** (`tests/fixtures/platform.ts`) provide a synchronous
  rect-based platform plus an `asAsync` wrapper, so every behavior can
  be asserted on both execution paths.
- **Browser-behavioral verification** happens in `sandbox/` by hand for
  now; a browser-mode CI lane is future work.

## Releases

Changesets drive versioning and publishing (`release.yml`): merged
changesets accumulate into a "Version Packages" PR; merging that PR
publishes to npm with provenance. Every publishable package ships ESM
with types, built by `tsdown` from the root config. `knip` keeps
dead code and dependencies out.
