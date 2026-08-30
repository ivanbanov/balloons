export { MAX_RESET_COUNT, computePosition } from './compute-position'
export { detectOverflow } from './detect-overflow'
export type { DetectOverflowOptions } from './detect-overflow'
export { arrow } from './middleware/arrow'
export type { ArrowOptions } from './middleware/arrow'
export { flip } from './middleware/flip'
export type { FlipOptions } from './middleware/flip'
export { offset } from './middleware/offset'
export type { OffsetOptions } from './middleware/offset'
export { shift } from './middleware/shift'
export type { ShiftOptions } from './middleware/shift'
export type { Platform } from './platform'
export type {
  AlignedPlacement,
  Alignment,
  Awaitable,
  Axis,
  Boundary,
  ClientRect,
  ComputePositionOptions,
  ComputePositionResult,
  Coords,
  Derivable,
  Dimensions,
  ElementRects,
  Elements,
  Length,
  Middleware,
  MiddlewareData,
  MiddlewareResult,
  MiddlewareState,
  MiddlewareWrite,
  Padding,
  Placement,
  PlacementOverflow,
  Rect,
  Reset,
  RootBoundary,
  Side,
  SideObject,
  Strategy,
} from './types'
export { chain, isPromise } from './utils/awaitable'
export { pointInPolygon, pointInRect } from './utils/geometry'
export {
  getAlignment,
  getAlignmentAxis,
  getAlignmentSides,
  getAxisLength,
  getOppositeAxis,
  getOppositePlacement,
  getOppositeSide,
  getSide,
  getSideAxis,
} from './utils/placement'
export { clamp, evaluate, getPaddingObject, rectToClientRect } from './utils/rects'
