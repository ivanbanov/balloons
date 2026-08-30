import { describe, expect, it } from 'vitest'
import type { ComputePositionResult, Rect } from '../../src'
import { computePosition, shift } from '../../src'
import { createPlatform } from '../fixtures/platform'

const platform = createPlatform()
const floating: Rect = { x: 0, y: 0, width: 100, height: 50 }

describe('shift', () => {
  it('clamps the floating box into the boundary on the main axis', () => {
    const nearLeftEdge: Rect = { x: 0, y: 400, width: 50, height: 50 }
    const result = computePosition(nearLeftEdge, floating, {
      platform,
      middleware: [shift()],
    }) as ComputePositionResult
    // raw x would be -25; shifted flush to the boundary
    expect(result.x).toBe(0)
    expect(result.middlewareData.shift).toEqual({ x: 25, y: 0 })
  })

  it('does not move a floating box that already fits', () => {
    const centered: Rect = { x: 450, y: 400, width: 100, height: 50 }
    const result = computePosition(centered, floating, {
      platform,
      middleware: [shift()],
    }) as ComputePositionResult
    expect(result.x).toBe(450)
    expect(result.middlewareData.shift).toEqual({ x: 0, y: 0 })
  })

  it('respects padding as a minimum distance from the boundary', () => {
    const nearLeftEdge: Rect = { x: 0, y: 400, width: 50, height: 50 }
    const result = computePosition(nearLeftEdge, floating, {
      platform,
      middleware: [shift({ padding: 10 })],
    }) as ComputePositionResult
    expect(result.x).toBe(10)
  })

  it('slides along the alignment axis on horizontal placements too', () => {
    const nearBottom: Rect = { x: 400, y: 950, width: 50, height: 50 }
    const tall: Rect = { x: 0, y: 0, width: 50, height: 100 }
    const result = computePosition(nearBottom, tall, {
      placement: 'right',
      platform,
      middleware: [shift()],
    }) as ComputePositionResult
    // for `right`, the main shift axis is vertical
    expect(result.y).toBe(900)
    expect(result.middlewareData.shift).toEqual({ x: 0, y: -25 })
  })

  it('leaves the side axis alone by default', () => {
    const nearRightEdge: Rect = { x: 900, y: 400, width: 50, height: 50 }
    const result = computePosition(nearRightEdge, floating, {
      placement: 'right',
      platform,
      middleware: [shift()],
    }) as ComputePositionResult
    // overflowing toward/away from the reference is not shift's job by default
    expect(result.x).toBe(950)
  })

  it('clamps the side axis when crossAxis is enabled', () => {
    const nearRightEdge: Rect = { x: 900, y: 400, width: 50, height: 50 }
    const result = computePosition(nearRightEdge, floating, {
      placement: 'right',
      platform,
      middleware: [shift({ crossAxis: true })],
    }) as ComputePositionResult
    expect(result.x).toBe(900)
    expect(result.middlewareData.shift).toEqual({ x: -50, y: 0 })
  })
})
