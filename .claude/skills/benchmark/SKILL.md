---
name: benchmark
description: This skill should be used whenever the user asks to run the benchmark or perf tests for the balloons positioning engine (e.g. "run the benchmark", "check perf", "pnpm benchmark", "how fast is it vs floating-ui"). It runs the suite, shows the results, and then ASKS whether to update any documented result tables before touching docs.
---

# Run the benchmark suite

Runs the `@dunky.dev/balloons` benchmark and, only after asking, refreshes
documented result tables.

## The rule

**Running the benchmark and updating the docs are two separate steps.** Always
run first, show the user the numbers, and then **ask** whether to update any
documented tables. Never edit docs as part of "run the benchmark" without an
explicit yes — benchmark numbers are noisy and the user may just want a look.

This is also the only path by which a comparative performance claim may enter
any document in this repo (see `AGENTS.md#benchmark`).

## Step 1 — run it

The suite is its own workspace package under `benchmark/`, but the root has a
delegating script, so this works from the repo root:

```bash
pnpm benchmark
```

It runs tinybench cases in one Node process and prints `console.table`s per
section:

- **single compute** — one `computePosition` (offset+flip+shift), balloons
  sync path vs `@floating-ui/core` (forced-async by design).
- **fan-out** — N=50 instances recomputed per simulated frame, the
  autoUpdate-storm shape.
- **microtasks** — `queueMicrotask`-instrumented flush counts per compute:
  the sync path must report zero.

Show the user the tables (or a tidy summary of the headline rows).

## Step 2 — ASK before updating docs

After showing the numbers, ask the user — use the AskUserQuestion tool —
whether to write any of them into docs. As of now no doc carries result
tables (deliberately: none exist until this flow produces them); if the user
says yes, add them to `benchmark/README.md` first and keep the methodology
section intact. Remind the user these are first-look numbers from one
machine — a single run is a snapshot, not a verdict.
