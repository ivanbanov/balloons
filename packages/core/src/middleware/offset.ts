import type { Derivable, Middleware } from '../types'
import { getAlignment, getSide, getSideAxis } from '../utils/placement'
import { evaluate } from '../utils/rects'

export interface OffsetOptions {
  // Distance from the reference along the placement's main axis.
  mainAxis?: number
  // Skidding along the perpendicular axis.
  crossAxis?: number
  // Cross-axis displacement expressed logically: toward the alignment edge,
  // so it flips with `end` alignment and with rtl on vertical sides. Only
  // applies on aligned placements; overrides crossAxis there.
  alignmentAxis?: number | null
}

export function offset<TElement = unknown>(
  options: number | OffsetOptions | Derivable<TElement, number | OffsetOptions> = 0,
): Middleware<TElement> {
  return {
    name: 'offset',
    writes: ['coords'],
    fn(state) {
      const { x, y, placement, rtl } = state
      const raw = evaluate(options, state)
      const side = getSide(placement)
      const alignment = getAlignment(placement)
      const isVertical = getSideAxis(placement) === 'y'
      const mainAxisMultiplier = side === 'left' || side === 'top' ? -1 : 1
      const crossAxisMultiplier = rtl && isVertical ? -1 : 1
      let mainAxis: number
      let crossAxis: number
      let alignmentAxis: number | null
      if (typeof raw === 'number') {
        mainAxis = raw
        crossAxis = 0
        alignmentAxis = null
      } else {
        mainAxis = raw.mainAxis ?? 0
        crossAxis = raw.crossAxis ?? 0
        alignmentAxis = raw.alignmentAxis ?? null
      }
      if (alignment && typeof alignmentAxis === 'number') {
        crossAxis = alignment === 'end' ? alignmentAxis * -1 : alignmentAxis
      }
      const diff = isVertical
        ? { x: crossAxis * crossAxisMultiplier, y: mainAxis * mainAxisMultiplier }
        : { x: mainAxis * mainAxisMultiplier, y: crossAxis * crossAxisMultiplier }
      return { x: x + diff.x, y: y + diff.y, data: diff }
    },
  }
}
