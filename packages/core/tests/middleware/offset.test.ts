import { describe, expect, it } from 'vitest'
import type { ComputePositionResult, Placement, Rect } from '../../src'
import { computePosition, offset } from '../../src'
import { createPlatform } from '../fixtures/platform'

const platform = createPlatform()
const reference: Rect = { x: 400, y: 400, width: 200, height: 100 }
const floating: Rect = { x: 0, y: 0, width: 100, height: 50 }

function compute(
  placement: Placement,
  value: Parameters<typeof offset>[0],
  rtl = false,
): ComputePositionResult {
  return computePosition(reference, floating, {
    placement,
    platform: createPlatform({ rtl }),
    middleware: [offset(value)],
  }) as ComputePositionResult
}

describe('offset', () => {
  it('pushes away from the reference on the main axis', () => {
    expect(compute('bottom', 10)).toMatchObject({ x: 450, y: 510 })
    expect(compute('top', 10)).toMatchObject({ x: 450, y: 340 })
    expect(compute('left', 10)).toMatchObject({ x: 290, y: 425 })
    expect(compute('right', 10)).toMatchObject({ x: 610, y: 425 })
  })

  it('accepts a negative main-axis value to overlap the reference', () => {
    expect(compute('bottom', -10)).toMatchObject({ y: 490 })
  })

  it('applies crossAxis alongside mainAxis', () => {
    expect(compute('bottom', { mainAxis: 10, crossAxis: 5 })).toMatchObject({ x: 455, y: 510 })
    expect(compute('right', { mainAxis: 10, crossAxis: 5 })).toMatchObject({ x: 610, y: 430 })
  })

  it('alignmentAxis overrides crossAxis on aligned placements and flips with end', () => {
    expect(compute('bottom-start', { alignmentAxis: 8 })).toMatchObject({ x: 408 })
    expect(compute('bottom-end', { alignmentAxis: 8 })).toMatchObject({ x: 492 })
  })

  it('alignmentAxis follows the text direction on vertical sides', () => {
    expect(compute('bottom-start', { alignmentAxis: 8 }, true)).toMatchObject({ x: 492 })
  })

  it('accepts a derivable option', () => {
    const result = computePosition(reference, floating, {
      platform,
      middleware: [offset(state => state.rects.reference.height / 2)],
    }) as ComputePositionResult
    expect(result.y).toBe(550)
  })

  it('publishes the applied diff as data', () => {
    expect(compute('bottom', 10).middlewareData.offset).toEqual({ x: 0, y: 10 })
  })
})
