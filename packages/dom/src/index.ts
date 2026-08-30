import type { ComputePositionResult, Middleware, Placement, Strategy } from '@dunky.dev/balloons'
import { computePosition as computePositionCore } from '@dunky.dev/balloons'
import { platform } from './platform'
import type { ReferenceElement } from './types'

export interface ComputePositionDomOptions {
  placement?: Placement
  strategy?: Strategy
  middleware?: readonly Middleware<ReferenceElement>[]
}

// Bound to the DOM platform and typed synchronously — the platform never
// returns a Promise, so neither does this (see platform.ts).
export function computePosition(
  reference: ReferenceElement,
  floating: HTMLElement,
  options: ComputePositionDomOptions = {},
): ComputePositionResult {
  return computePositionCore<ReferenceElement>(reference, floating, {
    platform,
    ...options,
  }) as ComputePositionResult
}

export { autoUpdate } from './auto-update'
export type { AutoUpdateOptions } from './auto-update'
export { platform } from './platform'
export { createScheduler, scheduler } from './scheduler'
export type { MeasuredTask, Scheduler } from './scheduler'
export type { ReferenceElement, VirtualElement } from './types'
export { getOverflowAncestors, isElement } from './utils'
