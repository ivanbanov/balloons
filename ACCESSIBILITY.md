# Accessibility

Accessibility here is referenced, not improvised: decisions are
cross-matched against pinned external specs, so a PR discussion never
re-litigates what a spec already settled. Read this before designing or
changing a public API.

## Pinned references

| Spec                                                               | Version | What we take from it                                         |
| ------------------------------------------------------------------ | ------- | ------------------------------------------------------------ |
| [WCAG](https://www.w3.org/TR/WCAG22/)                              | 2.2     | Success criteria — reflow, motion, pointer, focus visibility |
| [WAI-ARIA](https://www.w3.org/TR/wai-aria-1.2/)                    | 1.2     | Roles/states vocabulary consumers attach to positioned UI    |
| [ARIA Authoring Practices (APG)](https://www.w3.org/WAI/ARIA/apg/) | living  | Tooltip/menu/combobox patterns that consume positions        |

When a newer version ships, updating this table is a deliberate PR, not
a side effect.

## What a positioning engine owes accessibility

`balloons` renders nothing and owns no ARIA — consumers (`dunky-dev/ui`)
attach roles and manage focus. But positioning decisions either enable
or sabotage accessible overlays, so these contracts live here:

### `hide` <-> `aria-hidden` coordination

A future `hide` middleware reports visibility facts
(`referenceHidden`, `escaped`) — it never mutates the tree. The
contract: the data it publishes must be reliable enough for a consumer
to drive both visual hiding **and** `aria-hidden`/`inert` from the same
signal, so what a sighted user sees and what a screen reader traverses
never disagree. A `hide` that flickers or reports asymmetrically across
placements (an open bug class in the ancestor engine) is an
accessibility bug here, not just a visual one.

### Logical placement in RTL (WCAG 2.2 language/direction integrity)

`start`/`end` alignments are logical: on vertical sides they follow the
text direction reported by `platform.isRTL`. A `bottom-start` menu in a
Hebrew UI opens at the right edge without the consumer writing a single
direction check. Alignment math that ignores `rtl` is a correctness bug
caught by tests, not a nice-to-have.

### Motion and updates (WCAG 2.2 SC 2.3.3, Animation from Interactions)

Two distinct things, deliberately separated:

- **Position tracking is not animation.** `autoUpdate` keeping an open
  popover attached to its scrolling anchor must keep working under
  `prefers-reduced-motion` — a detached tooltip floating over the wrong
  element is worse for everyone, including motion-sensitive users.
- **Transitions between positions are animation.** Consumers animating
  from one computed position to the next (sliding flips, springy
  shifts) must gate that on `prefers-reduced-motion` and snap instead.
  The engine hands over final coordinates so snapping is always
  possible; docs and sandbox examples must never demonstrate an
  animated transition without the reduced-motion branch.

### Keyboard and virtual references

Cursor-anchored positioning (virtual elements) is pointer-born; every
consumer pattern built on it needs a keyboard-reachable equivalent
(APG: context menus fall back to the anchor element's bounds). The
engine's part of the contract: virtual and real references are
interchangeable inputs, so the keyboard path costs the consumer nothing
extra. This stays tested (same middleware behavior for both reference
kinds).

### Collision padding is a target-size ally (WCAG 2.2 SC 2.5.8)

`shift`/`flip` padding keeps floating UI from hugging viewport edges
where OS gestures and magnified-view users lose it. Sandbox and doc
examples default to a non-zero boundary padding rather than 0 — the
engine can't enforce a consumer's padding, but it can refuse to
normalize the hostile default.

## Working rules

- A new middleware or platform capability that touches any contract
  above names the relevant spec section in its PR description.
- An accessibility-relevant behavior gets a test naming the contract
  (e.g. RTL alignment flip), so a regression reads as what it is.
- When the engine cannot uphold a contract alone (it usually cannot —
  it computes numbers), the consumer-facing obligation is written into
  the package README rather than assumed.
