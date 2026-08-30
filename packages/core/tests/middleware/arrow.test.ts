import { describe, expect, it } from 'vitest'
import type { ComputePositionResult, Rect } from '../../src'
import { arrow, computePosition } from '../../src'
import { createPlatform } from '../fixtures/platform'

const platform = createPlatform()
const arrowElement: Rect = { x: 0, y: 0, width: 20, height: 20 }

describe('arrow', () => {
  it('centers the arrow on the reference along the alignment axis', () => {
    const reference: Rect = { x: 450, y: 450, width: 100, height: 100 }
    const wide: Rect = { x: 0, y: 0, width: 200, height: 50 }
    const result = computePosition(reference, wide, {
      platform,
      middleware: [arrow({ element: arrowElement })],
    }) as ComputePositionResult
    // floating spans 400..600; arrow at 490..510 centers on the reference center (500)
    expect(result.middlewareData.arrow).toEqual({ x: 90, centerOffset: 0 })
  })

  it('positions on the y axis for horizontal placements', () => {
    const reference: Rect = { x: 450, y: 450, width: 100, height: 100 }
    const tall: Rect = { x: 0, y: 0, width: 50, height: 200 }
    const result = computePosition(reference, tall, {
      placement: 'right',
      platform,
      middleware: [arrow({ element: arrowElement })],
    }) as ComputePositionResult
    expect(result.middlewareData.arrow).toEqual({ y: 90, centerOffset: 0 })
  })

  it('clamps inside the floating box and reports the compromise as centerOffset', () => {
    const cornered: Rect = { x: 0, y: 100, width: 20, height: 20 }
    const wide: Rect = { x: 0, y: 0, width: 200, height: 50 }
    const result = computePosition(cornered, wide, {
      placement: 'bottom-start',
      platform,
      middleware: [arrow({ element: arrowElement, padding: 15 })],
    }) as ComputePositionResult
    // the true center would be 0; padding forces 15, and the compromise is reported
    expect(result.middlewareData.arrow).toEqual({ x: 15, centerOffset: -15 })
  })
})
