import type {
  Awaitable,
  Boundary,
  Dimensions,
  ElementRects,
  Elements,
  Rect,
  RootBoundary,
  Strategy,
} from './types'

// The only gateway to the substrate. `TElement` is whatever the substrate
// anchors to — a web element, a scene node, a grid cell, a plain rect — and
// core never inspects it, only hands it back to the platform. Every method
// may return its value directly or as a Promise: a synchronous return keeps
// the whole computation synchronous (see compute-position.ts).
//
// Method syntax on purpose: its bivariance lets a `Middleware<unknown>` (what
// a bare factory call infers) flow into a concrete `Middleware<TElement>`
// pipeline, without giving up typed elements at the call sites.
export interface Platform<TElement = unknown> {
  getElementRects(args: {
    reference: TElement
    floating: TElement
    strategy: Strategy
  }): Awaitable<ElementRects>
  getDimensions(element: TElement): Awaitable<Dimensions>
  getClippingRect(args: {
    element: TElement
    boundary: Boundary<TElement>
    rootBoundary: RootBoundary
    strategy: Strategy
  }): Awaitable<Rect>
  // Substrates whose measured rects live in a different coordinate space than
  // their clipping rects (offset-parent-relative vs viewport-relative)
  // implement this to reconcile the two before overflow is compared.
  convertOffsetParentRelativeRectToViewportRelativeRect?(args: {
    elements: Elements<TElement>
    rect: Rect
    strategy: Strategy
  }): Awaitable<Rect>
  isRTL?(element: TElement): Awaitable<boolean>
}
