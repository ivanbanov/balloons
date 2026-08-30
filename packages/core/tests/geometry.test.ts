import { describe, expect, it } from 'vitest'
import { pointInPolygon, pointInRect } from '../src'

describe('pointInRect', () => {
  const rect = { x: 10, y: 10, width: 100, height: 50 }

  it('accepts points inside and on the edges', () => {
    expect(pointInRect({ x: 50, y: 30 }, rect)).toBe(true)
    expect(pointInRect({ x: 10, y: 10 }, rect)).toBe(true)
    expect(pointInRect({ x: 110, y: 60 }, rect)).toBe(true)
  })

  it('rejects points outside', () => {
    expect(pointInRect({ x: 9, y: 30 }, rect)).toBe(false)
    expect(pointInRect({ x: 50, y: 61 }, rect)).toBe(false)
  })
})

describe('pointInPolygon', () => {
  // the safe-polygon shape: a triangle from a cursor point to a floating edge
  const triangle = [
    { x: 0, y: 0 },
    { x: 100, y: 40 },
    { x: 100, y: -40 },
  ]

  it('accepts points inside', () => {
    expect(pointInPolygon({ x: 50, y: 0 }, triangle)).toBe(true)
    expect(pointInPolygon({ x: 90, y: 20 }, triangle)).toBe(true)
  })

  it('rejects points outside', () => {
    expect(pointInPolygon({ x: 50, y: 30 }, triangle)).toBe(false)
    expect(pointInPolygon({ x: -10, y: 0 }, triangle)).toBe(false)
  })

  it('handles concave polygons', () => {
    const concave = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 50, y: 50 },
      { x: 0, y: 100 },
    ]
    expect(pointInPolygon({ x: 50, y: 40 }, concave)).toBe(true)
    expect(pointInPolygon({ x: 50, y: 80 }, concave)).toBe(false)
  })
})
