import type { Derivable, Middleware, Padding } from '../types'
import { chain } from '../utils/awaitable'
import { getAlignmentAxis, getAxisLength } from '../utils/placement'
import { clamp, evaluate, getPaddingObject } from '../utils/rects'

export interface ArrowOptions<TElement = unknown> {
  element: TElement
  // Minimum distance the arrow keeps from the floating box's corners.
  padding?: Padding
}

// Positions a caret so it points at the reference. Declares reads on offset
// and shift: when they are present they must run first, so the arrow is
// computed from the coordinates the floating box actually gets — a shifted
// popover keeps a truthful arrow (the ancestor's open arrow+shift bug class).
export function arrow<TElement = unknown>(
  options: ArrowOptions<TElement> | Derivable<TElement, ArrowOptions<TElement>>,
): Middleware<TElement> {
  return {
    name: 'arrow',
    reads: ['offset', 'shift'],
    writes: [],
    fn(state) {
      const { x, y, placement, rects, platform } = state
      const { element, padding = 0 } = evaluate(options, state)
      if (element == null) return {}
      const paddingObject = getPaddingObject(padding)
      const axis = getAlignmentAxis(placement)
      const length = getAxisLength(axis)
      const coord = axis === 'y' ? y : x
      return chain(platform.getDimensions(element), arrowDimensions => {
        const isYAxis = axis === 'y'
        const minPadding = isYAxis ? paddingObject.top : paddingObject.left
        const maxPadding = isYAxis ? paddingObject.bottom : paddingObject.right
        const endDiff =
          rects.reference[axis] + rects.reference[length] - coord - rects.floating[length]
        const startDiff = coord - rects.reference[axis]
        const centerToReference = endDiff / 2 - startDiff / 2
        const clientSize = rects.floating[length]
        const center = clientSize / 2 - arrowDimensions[length] / 2 + centerToReference
        const min = minPadding
        const max = clientSize - arrowDimensions[length] - maxPadding
        const arrowOffset = clamp(min, center, max)
        const data: { x?: number; y?: number; centerOffset: number } = {
          centerOffset: center - arrowOffset,
        }
        data[axis] = arrowOffset
        return { data }
      })
    },
  }
}
