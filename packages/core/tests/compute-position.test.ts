import { describe, expect, it } from 'vitest'
import type { ComputePositionResult, Middleware, Placement, Rect } from '../src'
import { computePosition } from '../src'
import { asAsync, createPlatform } from './fixtures/platform'

const platform = createPlatform()
const reference: Rect = { x: 400, y: 400, width: 200, height: 100 }
const floating: Rect = { x: 0, y: 0, width: 100, height: 50 }

function compute(placement: Placement): ComputePositionResult {
  return computePosition(reference, floating, { placement, platform }) as ComputePositionResult
}

describe('placement math', () => {
  it.each([
    ['bottom', 450, 500],
    ['bottom-start', 400, 500],
    ['bottom-end', 500, 500],
    ['top', 450, 350],
    ['top-start', 400, 350],
    ['top-end', 500, 350],
    ['right', 600, 425],
    ['right-start', 600, 400],
    ['right-end', 600, 450],
    ['left', 300, 425],
    ['left-start', 300, 400],
    ['left-end', 300, 450],
  ] as [Placement, number, number][])('%s -> (%d, %d)', (placement, x, y) => {
    const result = compute(placement)
    expect({ x: result.x, y: result.y }).toEqual({ x, y })
    expect(result.placement).toBe(placement)
    expect(result.strategy).toBe('absolute')
  })

  it('defaults to bottom', () => {
    const result = computePosition(reference, floating, { platform }) as ComputePositionResult
    expect(result.placement).toBe('bottom')
  })

  it('flips start/end alignment on vertical sides in rtl', () => {
    const rtlPlatform = createPlatform({ rtl: true })
    const result = computePosition(reference, floating, {
      placement: 'bottom-start',
      platform: rtlPlatform,
    }) as ComputePositionResult
    // start follows the text direction: in rtl it hugs the reference's end edge
    expect(result.x).toBe(500)
  })

  it('does not flip alignment on horizontal sides in rtl', () => {
    const rtlPlatform = createPlatform({ rtl: true })
    const result = computePosition(reference, floating, {
      placement: 'right-start',
      platform: rtlPlatform,
    }) as ComputePositionResult
    expect(result.y).toBe(400)
  })
})

describe('sync-first execution', () => {
  it('returns a plain object — not a thenable — on an all-sync platform', () => {
    const result = computePosition(reference, floating, { platform })
    expect(result).not.toBeInstanceOf(Promise)
    expect('then' in (result as object)).toBe(false)
  })

  it('returns a Promise on an async platform, with identical coordinates', async () => {
    const syncResult = compute('top-end')
    const asyncResult = computePosition(reference, floating, {
      placement: 'top-end',
      platform: asAsync(platform),
    })
    expect(asyncResult).toBeInstanceOf(Promise)
    expect(await asyncResult).toEqual(syncResult)
  })

  it('upgrades to async only from the first async middleware onward', async () => {
    const order: string[] = []
    const before: Middleware<Rect> = {
      name: 'before',
      writes: [],
      fn: () => {
        order.push('before')
        return {}
      },
    }
    const asyncMiddleware: Middleware<Rect> = {
      name: 'async',
      writes: ['coords'],
      fn: state => Promise.resolve({ x: state.x + 1 }),
    }
    const after: Middleware<Rect> = {
      name: 'after',
      writes: [],
      fn: () => {
        order.push('after')
        return {}
      },
    }
    const result = computePosition(reference, floating, {
      platform,
      middleware: [before, asyncMiddleware, after],
    })
    // everything before the async hop already ran, synchronously
    expect(order).toEqual(['before'])
    expect(result).toBeInstanceOf(Promise)
    const resolved = await (result as Promise<ComputePositionResult>)
    expect(order).toEqual(['before', 'after'])
    expect(resolved.x).toBe(451)
  })

  it('runs middleware in array order and accumulates namespaced data', () => {
    const order: string[] = []
    const make = (name: string): Middleware<Rect> => ({
      name,
      writes: [],
      fn: () => {
        order.push(name)
        return { data: { ran: true } }
      },
    })
    const result = computePosition(reference, floating, {
      platform,
      middleware: [make('one'), make('two')],
    }) as ComputePositionResult
    expect(order).toEqual(['one', 'two'])
    expect(result.middlewareData).toEqual({ one: { ran: true }, two: { ran: true } })
  })
})
