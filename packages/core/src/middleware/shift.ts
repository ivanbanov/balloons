import type { DetectOverflowOptions } from '../detect-overflow'
import { detectOverflow } from '../detect-overflow'
import type { Derivable, Middleware } from '../types'
import { chain } from '../utils/awaitable'
import { getOppositeAxis, getSide, getSideAxis } from '../utils/placement'
import { clamp, evaluate } from '../utils/rects'

export interface ShiftOptions<TElement = unknown> extends DetectOverflowOptions<TElement> {
  // The shift axis is the placement's alignment axis — the one the floating
  // box slides along to stay visible.
  mainAxis?: boolean
  crossAxis?: boolean
}

export function shift<TElement = unknown>(
  options: ShiftOptions<TElement> | Derivable<TElement, ShiftOptions<TElement>> = {},
): Middleware<TElement> {
  return {
    name: 'shift',
    reads: ['offset'],
    writes: ['coords'],
    fn(state) {
      const { x, y, placement } = state
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = false,
        ...detectOverflowOptions
      } = evaluate(options, state)
      return chain(detectOverflow(state, detectOverflowOptions), overflow => {
        const sideAxis = getSideAxis(getSide(placement))
        const shiftAxis = getOppositeAxis(sideAxis)
        let shiftCoord = shiftAxis === 'x' ? x : y
        let sideCoord = sideAxis === 'x' ? x : y
        if (checkMainAxis) {
          const minSide = shiftAxis === 'y' ? 'top' : 'left'
          const maxSide = shiftAxis === 'y' ? 'bottom' : 'right'
          shiftCoord = clamp(
            shiftCoord + overflow[minSide],
            shiftCoord,
            shiftCoord - overflow[maxSide],
          )
        }
        if (checkCrossAxis) {
          const minSide = sideAxis === 'y' ? 'top' : 'left'
          const maxSide = sideAxis === 'y' ? 'bottom' : 'right'
          sideCoord = clamp(sideCoord + overflow[minSide], sideCoord, sideCoord - overflow[maxSide])
        }
        const nextX = shiftAxis === 'x' ? shiftCoord : sideCoord
        const nextY = shiftAxis === 'y' ? shiftCoord : sideCoord
        return { x: nextX, y: nextY, data: { x: nextX - x, y: nextY - y } }
      })
    },
  }
}
