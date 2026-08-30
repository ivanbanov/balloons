# Contributing

For the contribution _workflow_, code conventions, and boundaries, see [`AGENTS.md`](./AGENTS.md) — it's the same
contract agents follow here, and it applies to you too.

## Setup

```bash
git clone git@github.com:dunky-dev/balloons.git
cd balloons
nvm use
corepack enable
pnpm install
```

## Commands

| Command                        | What it does                                               |
| ------------------------------ | ---------------------------------------------------------- |
| `pnpm test`                    | Full test suite, watch mode                                |
| `pnpm test:ci`                 | Full test suite, once                                      |
| `pnpm typecheck`               | `tsc -b` across the whole workspace                        |
| `pnpm lint`                    | `oxlint`                                                   |
| `pnpm format` / `format:check` | `oxfmt`                                                    |
| `pnpm build`                   | Build every publishable package                            |
| `pnpm benchmark`               | Perf suite — see [Benchmark](./AGENTS.md#benchmark)        |
| `pnpm changeset`               | Add a changeset — see [Versioning](./AGENTS.md#versioning) |

## Sandbox

Each sandbox positions the same floating UI on a different substrate —
the fastest way to see a change actually work end to end:

```bash
pnpm -C sandbox/dom dev     # real DOM: tooltip + autoUpdate + scheduler
pnpm -C sandbox/canvas dev  # non-DOM platform: proves core's agnosticism
```

## Filing an issue

A bug report is only as useful as its reproduction. Use an **SSCCE** — Short,
Self-Contained, Correct (Compilable) Example:

- **Short** — the smallest reference/floating/middleware setup that still
  reproduces it. Strip every middleware and option that isn't load-bearing.
- **Self-contained** — no missing imports, no "assume you have X set up."
  Someone should be able to paste it and run it with nothing else.
- **Correct (compilable)** — it actually runs and actually reproduces the
  bug. Not what you _think_ is happening — what you pasted and ran.

If you can't shrink your repro to an SSCCE, that's often a sign the bug
isn't where you think it is — shrinking it is frequently how you find the
real cause yourself.

## Pull requests

### Humans

When using AI to help write changes, read the diff like you wrote it yourself
before asking someone else to. Cut comments that don't say anything, drop
anything that drifted from what you're actually fixing, and be able to
explain any line if asked. A reviewer's time isn't free.

### AI

Before opening it, make sure tests, lint, and typecheck pass, and a changeset is
included — see `AGENTS.md`'s RECONCILE step.
