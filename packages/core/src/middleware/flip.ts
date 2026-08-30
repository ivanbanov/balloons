import type { DetectOverflowOptions } from '../detect-overflow'
import { detectOverflow } from '../detect-overflow'
import type { Derivable, Middleware, Placement, PlacementOverflow } from '../types'
import { chain } from '../utils/awaitable'
import { getAlignmentSides, getOppositePlacement, getSide } from '../utils/placement'
import { evaluate } from '../utils/rects'

export interface FlipOptions<TElement = unknown> extends DetectOverflowOptions<TElement> {
  // Check overflow on the placement's own side.
  mainAxis?: boolean
  // Check overflow on the alignment-axis sides too.
  crossAxis?: boolean
  // Candidates tried after the initial placement; defaults to its opposite.
  fallbackPlacements?: Placement[]
  // When no candidate fits: settle on the least-overflowing one, or go back
  // to the initial placement.
  fallbackStrategy?: 'bestFit' | 'initialPlacement'
}

export function flip<TElement = unknown>(
  options: FlipOptions<TElement> | Derivable<TElement, FlipOptions<TElement>> = {},
): Middleware<TElement> {
  return {
    name: 'flip',
    reads: ['offset'],
    writes: ['placement'],
    fn(state) {
      const { placement, initialPlacement, middlewareData, rects, rtl } = state
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = true,
        fallbackPlacements,
        fallbackStrategy = 'bestFit',
        ...detectOverflowOptions
      } = evaluate(options, state)
      const placements: Placement[] = [
        initialPlacement,
        ...(fallbackPlacements ?? [getOppositePlacement(initialPlacement)]),
      ]
      return chain(detectOverflow(state, detectOverflowOptions), overflow => {
        const overflows: number[] = []
        if (checkMainAxis) overflows.push(overflow[getSide(placement)])
        if (checkCrossAxis) {
          const sides = getAlignmentSides(placement, rects, rtl)
          overflows.push(overflow[sides[0]], overflow[sides[1]])
        }
        // Overflows accumulate across resets in this middleware's own data —
        // that record is what bestFit judges once every candidate was tried.
        const tried: PlacementOverflow[] = [
          ...(middlewareData.flip?.overflows ?? []),
          { placement, overflows },
        ]
        const index = middlewareData.flip?.index ?? 0
        if (overflows.every(value => value <= 0)) {
          return { data: { index, overflows: tried } }
        }
        const nextPlacement = placements[index + 1]
        if (nextPlacement) {
          return {
            data: { index: index + 1, overflows: tried },
            reset: { phase: 'placement', placement: nextPlacement },
          }
        }
        let resetPlacement = initialPlacement
        if (fallbackStrategy === 'bestFit') {
          // Prefer candidates whose cross axis fits; among those, the least
          // main-axis overflow wins.
          const crossFitting: PlacementOverflow[] = []
          for (const candidate of tried) {
            let fits = true
            for (let i = 1; i < candidate.overflows.length; i++) {
              if (candidate.overflows[i] > 0) fits = false
            }
            if (fits) crossFitting.push(candidate)
          }
          const pool = crossFitting.length > 0 ? crossFitting : tried
          let best = pool[0]
          for (const candidate of pool) {
            if (candidate.overflows[0] < best.overflows[0]) best = candidate
          }
          resetPlacement = best.placement
        }
        if (placement !== resetPlacement) {
          return {
            data: { index: index + 1, overflows: tried },
            reset: { phase: 'placement', placement: resetPlacement },
          }
        }
        return { data: { index, overflows: tried } }
      })
    },
  }
}
