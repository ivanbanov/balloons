import { describe, expect, it } from 'vitest'
import type { ComputePositionResult, ElementRects, Middleware, Platform, Rect } from '../src'
import { MAX_RESET_COUNT, computePosition } from '../src'
import { createPlatform } from './fixtures/platform'

const platform = createPlatform()
const reference: Rect = { x: 400, y: 400, width: 200, height: 100 }
const floating: Rect = { x: 0, y: 0, width: 100, height: 50 }

describe('resetTo(placement)', () => {
  it('recomputes coordinates from the new placement and reruns the pipeline', () => {
    const passes: string[] = []
    const flipOnce: Middleware<Rect> = {
      name: 'flip-once',
      writes: ['placement'],
      fn: state => {
        passes.push(state.placement)
        if (state.placement === 'bottom' && !state.middlewareData['flip-once']) {
          return { data: { done: true }, reset: { phase: 'placement', placement: 'top' } }
        }
        return {}
      },
    }
    const result = computePosition(reference, floating, {
      platform,
      middleware: [flipOnce],
    }) as ComputePositionResult
    expect(passes).toEqual(['bottom', 'top'])
    expect(result.placement).toBe('top')
    expect(result.y).toBe(350)
    // middlewareData survived the reset
    expect(result.middlewareData['flip-once']).toEqual({ done: true })
  })

  it('settles instead of hanging when the reset budget is spent', () => {
    let calls = 0
    const pingPong: Middleware<Rect> = {
      name: 'ping-pong',
      writes: ['placement'],
      fn: state => {
        calls++
        return {
          reset: { phase: 'placement', placement: state.placement === 'top' ? 'bottom' : 'top' },
        }
      },
    }
    const result = computePosition(reference, floating, { platform, middleware: [pingPong] })
    expect(result).toMatchObject({ strategy: 'absolute' })
    expect(calls).toBe(MAX_RESET_COUNT + 1)
  })
})

describe('resetTo(rects)', () => {
  it('re-measures through the platform when no rects are provided', () => {
    let measures = 0
    const counting: Platform<Rect> = {
      ...platform,
      getElementRects: args => {
        measures++
        return platform.getElementRects(args) as ElementRects
      },
    }
    const remeasure: Middleware<Rect> = {
      name: 'remeasure',
      writes: ['rects'],
      fn: state =>
        state.middlewareData.remeasure ? {} : { data: { done: true }, reset: { phase: 'rects' } },
    }
    computePosition(reference, floating, { platform: counting, middleware: [remeasure] })
    expect(measures).toBe(2)
  })

  it('uses provided rects without re-measuring', () => {
    let measures = 0
    const counting: Platform<Rect> = {
      ...platform,
      getElementRects: args => {
        measures++
        return platform.getElementRects(args) as ElementRects
      },
    }
    const moved: ElementRects = {
      reference: { x: 0, y: 0, width: 200, height: 100 },
      floating: { x: 0, y: 0, width: 100, height: 50 },
    }
    const inject: Middleware<Rect> = {
      name: 'inject',
      writes: ['rects'],
      fn: state =>
        state.middlewareData.inject
          ? {}
          : { data: { done: true }, reset: { phase: 'rects', rects: moved } },
    }
    const result = computePosition(reference, floating, {
      platform: counting,
      middleware: [inject],
    }) as ComputePositionResult
    expect(measures).toBe(1)
    // coordinates were recomputed from the injected rects
    expect({ x: result.x, y: result.y }).toEqual({ x: 50, y: 100 })
  })
})
