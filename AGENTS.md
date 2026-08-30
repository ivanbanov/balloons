# Agents

The working contract for anyone — human or agent — modifying code in this
repo. This file is the canonical entry point: read it first, every time.

This is Dunky's positioning-engine monorepo: anchored positioning
(tooltips, popovers, menus, selects) computed once as pure rectangle math
(`packages/core`), measured and scheduled per substrate through thin
platform packages (`packages/dom` today), with a benchmark suite and
per-substrate sandboxes alongside.

## Preflight

Before touching any code, read these in order:

1. `AGENTS.md` (this file) — rules, boundaries, the flow.
2. `README.md` — what this repo is and where things are.
3. `ARCHITECTURE.md` — the deep reference: the layered model, where
   things live, testing, releases.

If a nested `AGENTS.md` exists next to a `package.json`, read it before
editing files in that scope — it overrides anything here for that scope
(see [Agents](#agents-1)).

## Scopes

| Scope     | Path          | What it is                                                     |
| --------- | ------------- | -------------------------------------------------------------- |
| Packages  | `packages/**` | The core engine and the substrate platforms (dom)              |
| Benchmark | `benchmark/`  | Perf suite comparing against competitor libraries              |
| Sandbox   | `sandbox/`    | Per-substrate demo apps for manual verification (dom + canvas) |

Some changes are cross-scope: a change in `core/` may need follow-up in
the platforms, sandboxes, and docs — and vice versa. Check what else your
change touches before calling it done.

## Boundaries

These are invariants, not preferences. Violating them breaks the
layered model:

- **Core never imports a substrate.** No DOM, no `window`, no
  `document`, no observers, no timers. `packages/core/*` is pure
  TypeScript over rectangles. This is enforced by
  `packages/core/tests/purity.test.ts`, which fails the suite if a
  substrate token appears anywhere in `packages/core/src` — the test is
  the boundary; do not weaken it to make a change fit. If you reach for
  a substrate API in `core/`, stop — the code belongs in a platform
  package.
- **Sync-first is a contract, not an optimization.** A fully synchronous
  platform must get a plain object back from `computePosition` — same
  call stack, no Promise allocated, no microtask hop. Never introduce an
  unconditional `await`, `.then`, or `Promise.resolve` on the compute
  path; asynchrony may only enter at a genuinely asynchronous platform
  or middleware return, and only from that point forward.
- **Middleware declare their effects.** Every middleware carries
  `reads` (names it depends on) and `writes` (channels it mutates:
  `coords`, `placement`, `rects`). The authority validates the pipeline
  and enforces declarations at apply time. A new middleware with
  undeclared effects is wrong even if its math is right.
- **No interactions.** Hover intent, dismiss, focus management,
  typeahead belong to consumers (`dunky-dev/ui`'s `dom/utils/*`), never
  to this repo. Core exports the pure geometry those features need
  (`pointInPolygon`, `pointInRect`); the event wiring lives with the
  consumer.
- **Core stays dependency-free.** No runtime dependencies in
  `packages/core` — not even sibling `@dunky.dev` packages. It is a
  plain function library, same as it promises consumers.

## Workflow

`SPEC -> TEST -> IMPLEMENT -> RECONCILE`

Keep an eye on what's been done and what's going on so you don't make a
mess: know the state before you change it, and check your work still
fits after.

### SPEC

Describes the package's intent: the problem it solves, its expected
behavior, and the constraints and edge cases that define its scope. The
spec is a description of intent, not a checklist — the reconcile step
verifies the implementation against it, so state what the package is
meant to do rather than enumerating fields. Capture what carries design
and API meaning: the consumer-facing API, the behavior contract, and any
UX or reference material that anchors it. Its home is the package's
`SPEC.md`.

If the package has no `SPEC.md` yet, ask before creating one — don't
add it unprompted.

A design decision lives in one `SPEC.md` — the package it's about.
Don't copy it into every package it touches. When a decision affects
others, just check their specs don't now contradict it; only edit
another package's `SPEC.md` if it genuinely conflicts (and prefer a
short cross-reference over restating the decision).

### TEST

Write behavior tests first. Tests are the executable spec: they capture
what the code is meant to do before the code exists.

Middleware get **combinatorial** coverage, not just unit coverage: every
open composition bug in the ancestor engines is a pairing problem
(arrow+shift, size+shift, autoPlacement+placement), never a single
middleware in isolation. A new middleware lands with tests for its
realistic pairings in `packages/core/tests/middleware/combinations.test.ts`.

### IMPLEMENT

Write the code that faithfully realizes the SPEC and the behavior the
TEST phase captures, within the boundaries and the architecture. The
implementation must cover the intent, not merely satisfy the assertions.
Match the existing code patterns rather than inventing structure
whenever possible, otherwise open it up for discussion.

### RECONCILE

Check whether the SPEC still describes the code: loop back or ship it.
Before shipping: tests, lint, and type-check pass, and the change is
verified across all scopes. Use the `/code-review` skill before
reviewing code, and suggest improvements you noticed along the way —
don't just do the minimum. If something's off, loop back to SPEC or
TEST; if not, ship it!

## Code

### Principles

Every change is held to these four, in this order — simplest thing that
works, written once, built only when needed, behaving as promised:

| Principle | Meaning                                                                                                                                                         |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **KISS**  | Keep it simple. Prefer the plain solution over the clever one; complexity must earn its keep with a need the simple version can't meet.                         |
| **DRY**   | Don't repeat yourself. A rule two places must agree on is written once and shared — duplication is where the copies drift apart.                                |
| **YAGNI** | You aren't gonna need it. Build for the requirement in front of you, not the one imagined; speculative machinery is deleted-on-sight, not kept just in case.    |
| **POLA**  | Principle of least astonishment. A thing does what its name and shape promise — no hidden side effects, no behavior a reader wouldn't guess from the call site. |

### Naming

Descriptive names everywhere. Short names are fine for local variables
with a tight, obvious scope.

### Comments

If the code says what it does, the comment is noise. Write comments to
explain _why_: a hidden constraint, a subtle invariant, a workaround, a
hard decision. Keep them short — over-explaining is its own kind of
noise.

### Performance

Performance is a constraint, not a feature. Prefer mutation over
allocation on hot paths. Avoid spreading objects, chaining array
methods, or allocating closures inside loops. On the compute path
specifically: no Promise creation unless the platform forced it (see
[Boundaries](#boundaries)).

### Testing

Unit tests cover behavior and logic only — test what the code does, not
how it's structured.

No overlapping tests — each test covers one distinct behavior. Do not
write a test that is already an implicit consequence of another test
passing. Shared setup goes at the top of the file: if multiple tests
need the same platform fixture or helper, define it once at the top, not
inside each `it()`. Reusable multi-file fixtures go in
`tests/fixtures/` — anything shared across test files lives there, not
inlined or duplicated.

## Accessibility

Accessibility is referenced, not improvised — the external specs are the
contract, and the API is cross-matched against them.
[`ACCESSIBILITY.md`](./ACCESSIBILITY.md) is the reference: read it before
designing a public API.

## Versioning

Every PR with a user-visible change to a public package needs a
changeset in `.changeset/`, describing the change from a consumer's
perspective — the feature or decision, not the code change. Add a code
snippet when the API surface changed or the usage is non-obvious, and
include context for non-obvious decisions — why the change was made,
not just what it does.

| Bump      | When                                          |
| --------- | --------------------------------------------- |
| **Major** | Breaking changes; stable milestone (1.0.0)    |
| **Minor** | New backward-compatible feature               |
| **Patch** | Bug fix, dependency update, cleanup, refactor |

## Benchmark

When the user asks to run the benchmark, check performance, or run perf
tests, invoke the `/benchmark` skill. Do not run the benchmark manually
or interpret results without it — the skill handles execution, output
formatting, and prompts before updating any documented result tables.

**No hand-written performance claims, anywhere.** A comparative number
(vs floating-ui or anything else) appears in a README, doc, or changeset
only if it came out of the benchmark suite through the skill's flow.

## Agents

If a package needs rules of its own (different stack, platform
constraints), add an `AGENTS.md` next to its `package.json`. Resolution
is nearest-wins: an `AGENTS.md` inside the directory you're editing —
or any ancestor up to the repo root — overrides everything above it for
that directory's code. Read every `AGENTS.md` between the repo root and
the file you're editing, apply them top-down, and let the closest one
settle conflicts.

Keep nested files small — encode only what genuinely differs from this
file. A nested file that would just restate the root should be deleted.

## Diagrams in docs

Draw ASCII diagrams (boxes, trees, flows) with plain `|`, `-`, and `+`
only — never Unicode box-drawing characters (`┌ ┐ └ ┘ ─ │ ├ ┼ ▼` …).
Use `|` for verticals, `-` for horizontals, `+` for every corner and
junction, and a plain `v` / `^` / `>` / `<` for arrowheads. The
box-drawing glyphs render inconsistently across fonts, terminals, and
GitHub, and are awkward to edit; the ASCII set is portable and diffs
cleanly. This applies to every `.md` in the repo.
