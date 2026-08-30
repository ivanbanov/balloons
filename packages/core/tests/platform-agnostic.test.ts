// Proof, not claim: the engine positions boxes on a terminal-style character
// grid — integer cells, no pixels, no DOM anywhere — through the same
// middleware the DOM platform uses. Mirrors state-machine's opentui sandbox.
import { describe, expect, it } from 'vitest'
import type { ComputePositionResult, Platform } from '../src'
import { computePosition, flip, offset, shift } from '../src'

interface GridBox {
  col: number
  row: number
  cols: number
  rows: number
}

const SCREEN = { cols: 80, rows: 24 }

const gridPlatform: Platform<GridBox> = {
  getElementRects: ({ reference, floating }) => ({
    reference: {
      x: reference.col,
      y: reference.row,
      width: reference.cols,
      height: reference.rows,
    },
    floating: { x: 0, y: 0, width: floating.cols, height: floating.rows },
  }),
  getDimensions: box => ({ width: box.cols, height: box.rows }),
  getClippingRect: () => ({ x: 0, y: 0, width: SCREEN.cols, height: SCREEN.rows }),
}

describe('terminal-grid platform', () => {
  const statusLine: GridBox = { col: 10, row: 20, cols: 10, rows: 1 }
  const popup: GridBox = { col: 0, row: 0, cols: 20, rows: 3 }

  it('computes synchronously with plain integer cells as elements', () => {
    const result = computePosition(statusLine, popup, {
      platform: gridPlatform,
      middleware: [offset(1), flip(), shift()],
    })
    expect(result).not.toBeInstanceOf(Promise)
    const { x, y, placement } = result as ComputePositionResult
    // 3 rows below row 21 would run off the 24-row screen -> flips above
    expect(placement).toBe('top')
    expect({ col: x, row: y }).toEqual({ col: 5, row: 16 })
  })

  it('positions below when the screen has room', () => {
    const topBar: GridBox = { col: 10, row: 1, cols: 10, rows: 1 }
    const result = computePosition(topBar, popup, {
      platform: gridPlatform,
      middleware: [offset(1), flip(), shift()],
    }) as ComputePositionResult
    expect(result.placement).toBe('bottom')
    expect(result.y).toBe(3)
  })
})
