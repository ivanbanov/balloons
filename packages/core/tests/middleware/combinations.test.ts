// Combinatorial coverage: every open math bug in the ancestor engine is a
// middleware *pairing* bug, never a single middleware in isolation. New
// middleware land with their realistic pairings tested here.
import { describe, expect, it } from 'vitest'
import type { ComputePositionResult, Rect } from '../../src'
import { arrow, computePosition, flip, offset, shift } from '../../src'
import { asAsync, createPlatform } from '../fixtures/platform'

const platform = createPlatform()
const arrowElement: Rect = { x: 0, y: 0, width: 20, height: 20 }

describe('arrow + shift', () => {
  // The ancestor's open bug: the arrow drifts off the reference once shift
  // activates. Here the arrow is computed from post-shift coordinates.
  it('keeps the arrow pointing at the reference after shift moves the box', () => {
    const nearCorner: Rect = { x: 0, y: 0, width: 40, height: 20 }
    const wide: Rect = { x: 0, y: 0, width: 200, height: 50 }
    const result = computePosition(nearCorner, wide, {
      platform,
      middleware: [shift(), arrow({ element: arrowElement })],
    }) as ComputePositionResult
    // raw x is -80; shift clamps to 0
    expect(result.x).toBe(0)
    expect(result.middlewareData.shift).toEqual({ x: 80, y: 0 })
    // arrow at 10..30 centers on the reference center (20) — no drift
    expect(result.middlewareData.arrow).toEqual({ x: 10, centerOffset: 0 })
  })
})

describe('offset + flip', () => {
  it('flip accounts for the offset when measuring overflow, and keeps it after flipping', () => {
    const nearBottom: Rect = { x: 450, y: 900, width: 100, height: 50 }
    const squat: Rect = { x: 0, y: 0, width: 100, height: 40 }
    const result = computePosition(nearBottom, squat, {
      platform,
      middleware: [offset(20), flip()],
    }) as ComputePositionResult
    // without the offset, bottom would fit (950..990); with it, it overflows
    expect(result.placement).toBe('top')
    // the offset survives the flip: 900 - 40 - 20
    expect(result.y).toBe(840)
  })
})

describe('flip + shift', () => {
  it('flips on one axis and shifts on the other in the same computation', () => {
    const cornered: Rect = { x: 10, y: 940, width: 40, height: 40 }
    const box: Rect = { x: 0, y: 0, width: 100, height: 50 }
    const result = computePosition(cornered, box, {
      platform,
      middleware: [flip(), shift()],
    }) as ComputePositionResult
    expect(result.placement).toBe('top')
    expect({ x: result.x, y: result.y }).toEqual({ x: 0, y: 890 })
  })
})

describe('full pipeline', () => {
  const cornered: Rect = { x: 10, y: 940, width: 40, height: 40 }
  const box: Rect = { x: 0, y: 0, width: 100, height: 50 }
  const middleware = () => [
    offset(8),
    flip(),
    shift({ padding: 4 }),
    arrow({ element: arrowElement }),
  ]

  it('stays synchronous end to end on a sync platform', () => {
    const result = computePosition(cornered, box, { platform, middleware: middleware() })
    expect(result).not.toBeInstanceOf(Promise)
    const { middlewareData } = result as ComputePositionResult
    expect(middlewareData.offset).toBeDefined()
    expect(middlewareData.flip).toBeDefined()
    expect(middlewareData.shift).toBeDefined()
    expect(middlewareData.arrow).toBeDefined()
  })

  it('produces identical results on the async path', async () => {
    const syncResult = computePosition(cornered, box, { platform, middleware: middleware() })
    const asyncResult = await computePosition(cornered, box, {
      platform: asAsync(platform),
      middleware: middleware(),
    })
    expect(asyncResult).toEqual(syncResult)
  })
})
