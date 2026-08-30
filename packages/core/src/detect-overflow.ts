import type {
  Awaitable,
  Boundary,
  Derivable,
  MiddlewareState,
  Padding,
  Rect,
  RootBoundary,
  SideObject,
} from './types'
import { chain } from './utils/awaitable'
import { evaluate, getPaddingObject, rectToClientRect } from './utils/rects'

export interface DetectOverflowOptions<TElement = unknown> {
  boundary?: Boundary<TElement>
  rootBoundary?: RootBoundary
  elementContext?: 'reference' | 'floating'
  // Check the boundary of the *other* element — e.g. the floating box's
  // overflow relative to the reference's clipping context.
  altBoundary?: boolean
  padding?: Padding
}

// How far the element escapes its clipping boundary, per side, in the
// platform's units. Positive means overflowing. Inherits the sync-first rule:
// a synchronous platform yields a synchronous side object.
export function detectOverflow<TElement>(
  state: MiddlewareState<TElement>,
  options:
    | DetectOverflowOptions<TElement>
    | Derivable<TElement, DetectOverflowOptions<TElement>> = {},
): Awaitable<SideObject> {
  const { x, y, platform, rects, elements, strategy } = state
  const {
    boundary = 'clippingAncestors',
    rootBoundary = 'viewport',
    elementContext = 'floating',
    altBoundary = false,
    padding = 0,
  } = evaluate(options, state)
  const paddingObject = getPaddingObject(padding)
  const altContext = elementContext === 'floating' ? 'reference' : 'floating'
  const element = elements[altBoundary ? altContext : elementContext]
  return chain(
    platform.getClippingRect({ element, boundary, rootBoundary, strategy }),
    clippingRect => {
      const rect: Rect =
        elementContext === 'floating'
          ? { x, y, width: rects.floating.width, height: rects.floating.height }
          : rects.reference
      const viewportRect = platform.convertOffsetParentRelativeRectToViewportRelativeRect
        ? platform.convertOffsetParentRelativeRectToViewportRelativeRect({
            elements,
            rect,
            strategy,
          })
        : rect
      return chain(viewportRect, elementRect => {
        const clipping = rectToClientRect(clippingRect)
        const client = rectToClientRect(elementRect)
        return {
          top: clipping.top - client.top + paddingObject.top,
          bottom: client.bottom - clipping.bottom + paddingObject.bottom,
          left: clipping.left - client.left + paddingObject.left,
          right: client.right - clipping.right + paddingObject.right,
        }
      })
    },
  )
}
