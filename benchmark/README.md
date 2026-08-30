# Benchmark

Compares `@dunky.dev/balloons` against `@floating-ui/core` on the same
synthetic, fully synchronous platform — the DOM-shaped case both engines
serve most.

## The rule

**No result numbers live in this repo until the `/benchmark` flow puts
them here.** Running the suite and documenting results are two separate,
human-gated steps — see `AGENTS.md#benchmark`. This file documents
methodology only.

## What it measures

1. **Single compute** — one `computePosition` with `offset + flip +
shift` on a reference near a corner (so flip and shift both do real
   work). balloons runs its sync path; floating-ui's pipeline is
   async by architecture, so its numbers include the Promise machinery
   it imposes on a sync platform. That asymmetry is the design
   difference under test, not an unfairness — both get identical
   geometry and equivalent middleware.
2. **Fan-out** — 50 instances recomputed back-to-back, the shape of an
   `autoUpdate` storm (50 tooltips, one scroll event). This is where
   per-computation overhead compounds.
3. **Microtask ticks** — how many microtask-queue turns pass before each
   engine's result is usable. Measured by draining `Promise.resolve()`
   turns until the result settles. The balloons sync path must report
   **0**; this is asserted, not just printed.

## Running

```bash
pnpm benchmark   # from the repo root
```

One Node process, tinybench, `NODE_ENV=production`. Numbers from a
single laptop run are a snapshot, not a verdict — treat cross-machine
comparisons accordingly.

## Demo

`benchmark/demo` is a small Vite app that runs the same cases in a
browser and renders the table — deployed by
`.github/workflows/deploy-benchmark.yml`.

```bash
pnpm benchmark:demo
```
