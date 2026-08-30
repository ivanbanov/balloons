import { describe, expect, it } from 'vitest'
import type { ComputePositionResult, Rect } from '../../src'
import { computePosition, flip } from '../../src'
import { createPlatform } from '../fixtures/platform'

const platform = createPlatform()
const floating: Rect = { x: 0, y: 0, width: 100, height: 100 }

describe('flip', () => {
  it('keeps the placement when it fits', () => {
    const centered: Rect = { x: 450, y: 450, width: 100, height: 100 }
    const result = computePosition(centered, floating, {
      platform,
      middleware: [flip()],
    }) as ComputePositionResult
    expect(result.placement).toBe('bottom')
  })

  it('flips to the opposite placement when the initial one overflows', () => {
    const nearBottom: Rect = { x: 450, y: 900, width: 100, height: 50 }
    const result = computePosition(nearBottom, floating, {
      platform,
      middleware: [flip()],
    }) as ComputePositionResult
    expect(result.placement).toBe('top')
    expect({ x: result.x, y: result.y }).toEqual({ x: 450, y: 800 })
  })

  it('walks explicit fallbackPlacements in order', () => {
    const nearBottom: Rect = { x: 100, y: 920, width: 100, height: 50 }
    const small: Rect = { x: 0, y: 0, width: 100, height: 50 }
    const result = computePosition(nearBottom, small, {
      platform,
      middleware: [flip({ fallbackPlacements: ['right'] })],
    }) as ComputePositionResult
    expect(result.placement).toBe('right')
    expect({ x: result.x, y: result.y }).toEqual({ x: 200, y: 920 })
  })

  it('settles on the least-overflowing candidate when nothing fits (bestFit)', () => {
    const shortViewport = createPlatform({ viewport: { x: 0, y: 0, width: 1000, height: 150 } })
    const reference: Rect = { x: 450, y: 40, width: 100, height: 80 }
    const squat: Rect = { x: 0, y: 0, width: 100, height: 60 }
    const result = computePosition(reference, squat, {
      platform: shortViewport,
      middleware: [flip()],
    }) as ComputePositionResult
    // bottom overflows by 30, top by 20 — top is the least bad
    expect(result.placement).toBe('top')
    expect(result.y).toBe(-20)
  })

  it('settles back on the initial placement when asked', () => {
    const shortViewport = createPlatform({ viewport: { x: 0, y: 0, width: 1000, height: 150 } })
    const reference: Rect = { x: 450, y: 40, width: 100, height: 80 }
    const squat: Rect = { x: 0, y: 0, width: 100, height: 60 }
    const result = computePosition(reference, squat, {
      platform: shortViewport,
      middleware: [flip({ fallbackStrategy: 'initialPlacement' })],
    }) as ComputePositionResult
    expect(result.placement).toBe('bottom')
    expect(result.y).toBe(120)
  })
})
