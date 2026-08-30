import type { Alignment, Axis, ElementRects, Length, Placement, Side } from '../types'

const oppositeSides: Record<Side, Side> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
}

export function getSide(placement: Placement): Side {
  return placement.split('-')[0] as Side
}

export function getAlignment(placement: Placement): Alignment | undefined {
  return placement.split('-')[1] as Alignment | undefined
}

// The axis the side sits on: top/bottom live on y, left/right on x.
export function getSideAxis(placement: Placement): Axis {
  const side = getSide(placement)
  return side === 'top' || side === 'bottom' ? 'y' : 'x'
}

export function getAlignmentAxis(placement: Placement): Axis {
  return getOppositeAxis(getSideAxis(placement))
}

export function getOppositeAxis(axis: Axis): Axis {
  return axis === 'x' ? 'y' : 'x'
}

export function getAxisLength(axis: Axis): Length {
  return axis === 'y' ? 'height' : 'width'
}

export function getOppositeSide(side: Side): Side {
  return oppositeSides[side]
}

export function getOppositePlacement(placement: Placement): Placement {
  return placement.replace(
    /top|bottom|left|right/,
    side => oppositeSides[side as Side],
  ) as Placement
}

// The two perpendicular sides a placement can escape through on its alignment
// axis, most-likely-to-overflow first. Alignment biases the guess; a reference
// larger than the floating box inverts it.
export function getAlignmentSides(
  placement: Placement,
  rects: ElementRects,
  rtl: boolean,
): [Side, Side] {
  const alignment = getAlignment(placement)
  const alignmentAxis = getAlignmentAxis(placement)
  const length = getAxisLength(alignmentAxis)
  let mainAlignmentSide: Side =
    alignmentAxis === 'x'
      ? alignment === (rtl ? 'end' : 'start')
        ? 'right'
        : 'left'
      : alignment === 'start'
        ? 'bottom'
        : 'top'
  if (rects.reference[length] > rects.floating[length]) {
    mainAlignmentSide = getOppositeSide(mainAlignmentSide)
  }
  return [mainAlignmentSide, getOppositeSide(mainAlignmentSide)]
}
