import { describe, expect, it } from 'vitest'
import type { Middleware, Rect } from '../src'
import { arrow, computePosition, offset, shift } from '../src'
import { createPlatform } from './fixtures/platform'

const platform = createPlatform()
const reference: Rect = { x: 400, y: 400, width: 200, height: 100 }
const floating: Rect = { x: 0, y: 0, width: 100, height: 50 }
const arrowElement: Rect = { x: 0, y: 0, width: 20, height: 20 }

describe('pipeline validation', () => {
  it('rejects a middleware ordered before its declared dependency', () => {
    expect(() =>
      computePosition(reference, floating, {
        platform,
        middleware: [arrow({ element: arrowElement }), shift()],
      }),
    ).toThrowError(/"arrow".*"shift"/s)
  })

  it('rejects duplicate middleware names', () => {
    expect(() =>
      computePosition(reference, floating, {
        platform,
        middleware: [offset(4), offset(8)],
      }),
    ).toThrowError(/duplicate.*"offset"/s)
  })

  it('accepts a declared dependency that is absent from the pipeline', () => {
    // arrow reads shift, but shift is optional — absence deactivates the constraint
    expect(() =>
      computePosition(reference, floating, {
        platform,
        middleware: [arrow({ element: arrowElement })],
      }),
    ).not.toThrow()
  })
})

describe('write enforcement', () => {
  it('rejects coordinates from a middleware that did not declare writes: coords', () => {
    const rogue: Middleware<Rect> = { name: 'rogue', writes: [], fn: () => ({ x: 0 }) }
    expect(() =>
      computePosition(reference, floating, { platform, middleware: [rogue] }),
    ).toThrowError(/"rogue".*coords/s)
  })

  it('rejects a placement reset from a middleware that did not declare writes: placement', () => {
    const rogue: Middleware<Rect> = {
      name: 'rogue',
      writes: ['coords'],
      fn: () => ({ reset: { phase: 'placement', placement: 'top' } }),
    }
    expect(() =>
      computePosition(reference, floating, { platform, middleware: [rogue] }),
    ).toThrowError(/"rogue".*placement/s)
  })

  it('rejects a rects reset from a middleware that did not declare writes: rects', () => {
    const rogue: Middleware<Rect> = {
      name: 'rogue',
      writes: ['coords'],
      fn: () => ({ reset: { phase: 'rects' } }),
    }
    expect(() =>
      computePosition(reference, floating, { platform, middleware: [rogue] }),
    ).toThrowError(/"rogue".*rects/s)
  })

  it('allows declared writes through', () => {
    const declared: Middleware<Rect> = {
      name: 'declared',
      writes: ['coords'],
      fn: state => ({ x: state.x + 1, y: state.y + 2 }),
    }
    const result = computePosition(reference, floating, { platform, middleware: [declared] })
    expect(result).toMatchObject({ x: 451, y: 502 })
  })
})
