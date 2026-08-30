import type { Platform } from './platform'

export type Side = 'top' | 'right' | 'bottom' | 'left'
export type Alignment = 'start' | 'end'
export type AlignedPlacement = `${Side}-${Alignment}`
export type Placement = Side | AlignedPlacement
export type Strategy = 'absolute' | 'fixed'
export type Axis = 'x' | 'y'
export type Length = 'width' | 'height'

export interface Coords {
  x: number
  y: number
}

export interface Dimensions {
  width: number
  height: number
}

export interface Rect extends Coords, Dimensions {}

export interface SideObject {
  top: number
  right: number
  bottom: number
  left: number
}

export interface ClientRect extends Rect, SideObject {}

export interface ElementRects {
  reference: Rect
  floating: Rect
}

export interface Elements<TElement> {
  reference: TElement
  floating: TElement
}

export type Padding = number | Partial<SideObject>

// The platform interprets boundaries; core only carries them. A substrate
// element, a list of them, a plain rect, or the platform's own default token.
export type Boundary<TElement> = 'clippingAncestors' | TElement | TElement[] | Rect
export type RootBoundary = 'viewport' | Rect

// The sync-first contract in one type: every platform and middleware return
// is a value or a Promise of it, and core consumes each without forcing the
// Promise path on the rest.
export type Awaitable<T> = T | Promise<T>

// An option that may be computed from the live pipeline state.
export type Derivable<TElement, T> = (state: MiddlewareState<TElement>) => T

export interface PlacementOverflow {
  placement: Placement
  overflows: number[]
}

export interface MiddlewareData {
  [key: string]: unknown
  arrow?: { x?: number; y?: number; centerOffset: number }
  flip?: { index: number; overflows: PlacementOverflow[] }
  offset?: Coords
  shift?: Coords
}

// The channels a middleware may mutate. Publishing namespaced `data` is
// always allowed — it cannot collide, so it needs no declaration.
export type MiddlewareWrite = 'coords' | 'placement' | 'rects'

// Named re-entry: the pipeline restarts from an explicit phase, never from a
// rewound loop index.
export type Reset =
  | { phase: 'placement'; placement: Placement }
  | { phase: 'rects'; rects?: ElementRects }

export interface MiddlewareResult {
  x?: number
  y?: number
  data?: Record<string, unknown>
  reset?: Reset
}

export interface MiddlewareState<TElement> extends Coords {
  initialPlacement: Placement
  placement: Placement
  strategy: Strategy
  rects: ElementRects
  platform: Platform<TElement>
  elements: Elements<TElement>
  middlewareData: MiddlewareData
  rtl: boolean
}

export interface Middleware<TElement = unknown> {
  name: string
  // Names of middleware whose effects this one depends on. Present names must
  // run earlier in the pipeline; absent names deactivate the constraint.
  reads?: readonly string[]
  writes: readonly MiddlewareWrite[]
  // Method syntax on purpose — see the note on Platform.
  fn(state: MiddlewareState<TElement>): Awaitable<MiddlewareResult>
}

export interface ComputePositionOptions<TElement> {
  platform: Platform<TElement>
  placement?: Placement
  strategy?: Strategy
  middleware?: readonly Middleware<TElement>[]
}

export interface ComputePositionResult {
  x: number
  y: number
  placement: Placement
  strategy: Strategy
  middlewareData: MiddlewareData
}
