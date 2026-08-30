# Sandbox

Runnable demos — the fastest way to see a change actually work end to
end, and the first dogfooding surface for edge-case discovery.

| Sandbox   | Substrate                   | What it proves                                                              |
| --------- | --------------------------- | --------------------------------------------------------------------------- |
| `dom/`    | real DOM                    | the full stack: `balloons-dom` platform, `autoUpdate`, the shared scheduler |
| `canvas/` | canvas scene (no DOM rects) | core's platform-agnosticism: real positions from a non-DOM platform         |

```bash
pnpm -C sandbox/dom dev
pnpm -C sandbox/canvas dev
```

The canvas sandbox is the repo's equivalent of `state-machine`'s
`opentui` target: the `<canvas>` tag is just the screen — measurement,
clipping, and every coordinate come from a scene-object platform that
never touches DOM layout.
