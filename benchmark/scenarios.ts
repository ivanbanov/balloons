// The scenario set shared by the Node runner (index.ts) and the browser demo
// (demo/). Both engines get identical geometry, equivalent middleware, and
// the same fully synchronous platform — the DOM-shaped case.
import type { ComputePositionResult, Platform, Rect } from '@dunky.dev/balloons'
import { computePosition, flip, offset, shift } from '@dunky.dev/balloons'
import type { Platform as FloatingPlatform } from '@floating-ui/core'
import {
  computePosition as floatingComputePosition,
  flip as floatingFlip,
  offset as floatingOffset,
  shift as floatingShift,
} from '@floating-ui/core'

const VIEWPORT: Rect = { x: 0, y: 0, width: 1000, height: 1000 }
// near the bottom-left corner, so flip and shift both do real work
const reference: Rect = { x: 10, y: 940, width: 40, height: 40 }
const floating: Rect = { x: 0, y: 0, width: 100, height: 50 }

const balloonsPlatform: Platform<Rect> = {
  getElementRects: args => ({
    reference: { ...args.reference },
    floating: { x: 0, y: 0, width: args.floating.width, height: args.floating.height },
  }),
  getDimensions: element => ({ width: element.width, height: element.height }),
  getClippingRect: () => ({ ...VIEWPORT }),
}

const floatingPlatform: FloatingPlatform = {
  getElementRects: args => ({
    reference: { ...(args.reference as Rect) },
    floating: {
      x: 0,
      y: 0,
      width: (args.floating as Rect).width,
      height: (args.floating as Rect).height,
    },
  }),
  getDimensions: element => ({ width: (element as Rect).width, height: (element as Rect).height }),
  getClippingRect: () => ({ ...VIEWPORT }),
}

// Hoisted like real consumers hoist (hooks memoize their middleware), which
// also lets balloons' pipeline validation cache hit.
const balloonsMiddleware = [offset(8), flip(), shift({ padding: 4 })]
const floatingMiddleware = [floatingOffset(8), floatingFlip(), floatingShift({ padding: 4 })]

export function balloonsCompute(): ComputePositionResult {
  return computePosition(reference, floating, {
    platform: balloonsPlatform,
    middleware: balloonsMiddleware,
  }) as ComputePositionResult
}

export function floatingCompute(): Promise<{ x: number; y: number; placement: string }> {
  return floatingComputePosition(reference, floating, {
    platform: floatingPlatform,
    placement: 'bottom',
    middleware: floatingMiddleware,
  })
}

export interface Scenario {
  name: string
  run: () => unknown
}

export const scenarios: Scenario[] = [
  { name: 'balloons - single compute (sync path)', run: () => balloonsCompute() },
  { name: 'floating-ui - single compute (forced async)', run: () => floatingCompute() },
  {
    name: 'balloons - fan-out x50 (autoUpdate storm)',
    run: () => {
      for (let i = 0; i < 50; i++) balloonsCompute()
    },
  },
  {
    name: 'floating-ui - fan-out x50 (autoUpdate storm)',
    run: () => {
      const pending: Promise<unknown>[] = []
      for (let i = 0; i < 50; i++) pending.push(floatingCompute())
      return Promise.all(pending)
    },
  },
]

function isThenable(value: unknown): value is Promise<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

// Drains one microtask turn per loop until the result settles — a direct
// measure of "how many hops before the coordinates are usable".
async function microtaskTicks(make: () => unknown): Promise<number> {
  const result = make()
  if (!isThenable(result)) return 0
  let settled = false
  void result.then(() => {
    settled = true
  })
  let ticks = 0
  while (!settled) {
    ticks++
    if (ticks > 1000) throw new Error('result never settled')
    await Promise.resolve()
  }
  return ticks
}

export async function runMicrotaskProbe(): Promise<Record<string, number>[]> {
  const balloonsTicks = await microtaskTicks(balloonsCompute)
  const floatingTicks = await microtaskTicks(floatingCompute)
  if (balloonsTicks !== 0) {
    throw new Error('sync-path regression: a balloons compute crossed a microtask boundary')
  }
  return [{ 'balloons (ticks)': balloonsTicks, 'floating-ui (ticks)': floatingTicks }]
}

// The numbers only mean anything if both engines agree on the answer.
export async function assertParity(): Promise<string> {
  const ours = balloonsCompute()
  const theirs = await floatingCompute()
  if (ours.x !== theirs.x || ours.y !== theirs.y || ours.placement !== theirs.placement) {
    throw new Error(
      `parity mismatch: balloons (${ours.x}, ${ours.y}, ${ours.placement}) vs ` +
        `floating-ui (${theirs.x}, ${theirs.y}, ${theirs.placement})`,
    )
  }
  return `parity check passed: both engines -> (${ours.x}, ${ours.y}) ${ours.placement}`
}
