import { enforceWrites, validatePipeline } from './authority'
import type { Platform } from './platform'
import type {
  Awaitable,
  ComputePositionOptions,
  ComputePositionResult,
  Coords,
  ElementRects,
  Elements,
  Middleware,
  MiddlewareData,
  MiddlewareResult,
  Placement,
  Reset,
  Strategy,
} from './types'
import { chain, isPromise } from './utils/awaitable'
import {
  getAlignment,
  getAlignmentAxis,
  getAxisLength,
  getSide,
  getSideAxis,
} from './utils/placement'

// Reset budget, shared with the ancestor engines for behavioral parity: a
// ping-ponging middleware pair degrades to a stale-but-rendered position,
// never a hang.
export const MAX_RESET_COUNT = 50

// One mutable session per computation. It is structurally a MiddlewareState,
// so middleware read it directly — no per-step state allocation. Middleware
// communicate through returned results, never by mutating this.
interface Session<TElement> {
  x: number
  y: number
  initialPlacement: Placement
  placement: Placement
  strategy: Strategy
  rects: ElementRects
  platform: Platform<TElement>
  elements: Elements<TElement>
  middleware: readonly Middleware<TElement>[]
  middlewareData: MiddlewareData
  rtl: boolean
  resetCount: number
}

// Sync-first orchestrator: with an all-sync platform and pipeline the result
// is a plain object on the same call stack — no Promise, no microtask hop.
// The Promise path activates at the first async value and only from there on.
export function computePosition<TElement>(
  reference: TElement,
  floating: TElement,
  options: ComputePositionOptions<TElement>,
): Awaitable<ComputePositionResult> {
  const { platform, placement = 'bottom', strategy = 'absolute', middleware = [] } = options
  validatePipeline(middleware)
  const elements: Elements<TElement> = { reference, floating }
  return chain(platform.isRTL ? platform.isRTL(floating) : false, rtl =>
    chain(platform.getElementRects({ reference, floating, strategy }), rects =>
      startPass({
        x: 0,
        y: 0,
        initialPlacement: placement,
        placement,
        strategy,
        rects,
        platform,
        elements,
        middleware,
        middlewareData: {},
        rtl,
        resetCount: 0,
      }),
    ),
  )
}

// A pass = raw coordinates from the current placement, then the pipeline from
// the top. Resets re-enter here; middlewareData deliberately survives.
function startPass<TElement>(session: Session<TElement>): Awaitable<ComputePositionResult> {
  const coords = computeCoordsFromPlacement(session.rects, session.placement, session.rtl)
  session.x = coords.x
  session.y = coords.y
  return runFrom(session, 0)
}

function runFrom<TElement>(
  session: Session<TElement>,
  index: number,
): Awaitable<ComputePositionResult> {
  const { middleware } = session
  for (let i = index; i < middleware.length; i++) {
    const result = middleware[i].fn(session)
    if (isPromise(result)) {
      // The upgrade point: everything before this middleware already ran
      // synchronously; only the remainder rides the Promise.
      const at = i
      return result.then(resolved => {
        const reentry = applyResult(session, middleware[at], resolved)
        return reentry === undefined ? runFrom(session, at + 1) : reentry
      })
    }
    const reentry = applyResult(session, middleware[i], result)
    if (reentry !== undefined) return reentry
  }
  return settle(session)
}

// Returns undefined to continue with the next middleware, or the re-entered
// computation when the result requested a reset.
function applyResult<TElement>(
  session: Session<TElement>,
  middleware: Middleware<TElement>,
  result: MiddlewareResult,
): Awaitable<ComputePositionResult> | undefined {
  enforceWrites(middleware, result)
  if (result.data) {
    session.middlewareData[middleware.name] = {
      ...(session.middlewareData[middleware.name] as Record<string, unknown> | undefined),
      ...result.data,
    }
  }
  if (result.x !== undefined) session.x = result.x
  if (result.y !== undefined) session.y = result.y
  if (result.reset && session.resetCount < MAX_RESET_COUNT) {
    session.resetCount++
    return resetTo(session, result.reset)
  }
  // A reset past the budget is ignored: settle, don't hang.
  return undefined
}

// Named re-entry — the replacement for the ancestor's `i = -1` loop rewind.
function resetTo<TElement>(
  session: Session<TElement>,
  reset: Reset,
): Awaitable<ComputePositionResult> {
  if (reset.phase === 'rects') {
    const rects =
      reset.rects ??
      session.platform.getElementRects({
        reference: session.elements.reference,
        floating: session.elements.floating,
        strategy: session.strategy,
      })
    return chain(rects, measured => {
      session.rects = measured
      return startPass(session)
    })
  }
  session.placement = reset.placement
  return startPass(session)
}

function settle<TElement>(session: Session<TElement>): ComputePositionResult {
  return {
    x: session.x,
    y: session.y,
    placement: session.placement,
    strategy: session.strategy,
    middlewareData: session.middlewareData,
  }
}

function computeCoordsFromPlacement(
  rects: ElementRects,
  placement: Placement,
  rtl: boolean,
): Coords {
  const { reference, floating } = rects
  const alignmentAxis = getAlignmentAxis(placement)
  const alignLength = getAxisLength(alignmentAxis)
  const isVertical = getSideAxis(placement) === 'y'
  const commonX = reference.x + reference.width / 2 - floating.width / 2
  const commonY = reference.y + reference.height / 2 - floating.height / 2
  const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2
  let coords: Coords
  switch (getSide(placement)) {
    case 'top':
      coords = { x: commonX, y: reference.y - floating.height }
      break
    case 'bottom':
      coords = { x: commonX, y: reference.y + reference.height }
      break
    case 'right':
      coords = { x: reference.x + reference.width, y: commonY }
      break
    case 'left':
      coords = { x: reference.x - floating.width, y: commonY }
      break
    default:
      coords = { x: reference.x, y: reference.y }
  }
  // start/end are logical on the alignment axis: vertical sides follow the
  // text direction, so rtl inverts them there and only there.
  switch (getAlignment(placement)) {
    case 'start':
      coords[alignmentAxis] -= commonAlign * (rtl && isVertical ? -1 : 1)
      break
    case 'end':
      coords[alignmentAxis] += commonAlign * (rtl && isVertical ? -1 : 1)
      break
  }
  return coords
}
