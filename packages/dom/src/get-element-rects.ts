import type { Dimensions, ElementRects, Elements, Rect, Strategy } from '@dunky.dev/balloons'
import { getOffsetParent } from './get-offset-parent'
import type { ReferenceElement } from './types'
import {
  getBoundingClientRect,
  getDocumentElement,
  getWindow,
  isElement,
  isHTMLElement,
} from './utils'

export function getDimensions(element: ReferenceElement): Dimensions {
  if (isHTMLElement(element)) {
    return { width: element.offsetWidth, height: element.offsetHeight }
  }
  const rect = getBoundingClientRect(element)
  return { width: rect.width, height: rect.height }
}

export function getRectRelativeToOffsetParent(
  element: ReferenceElement,
  offsetParent: Element | Window,
  strategy: Strategy,
): Rect {
  const rect = getBoundingClientRect(element)
  if (strategy === 'fixed') {
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  }
  if (isElement(offsetParent) && offsetParent !== getDocumentElement(offsetParent)) {
    // CSS positions from the parent's padding edge; the border sits between
    // it and the client rect, hence clientLeft/clientTop.
    const parentRect = getBoundingClientRect(offsetParent)
    return {
      x: rect.x - parentRect.x - offsetParent.clientLeft + offsetParent.scrollLeft,
      y: rect.y - parentRect.y - offsetParent.clientTop + offsetParent.scrollTop,
      width: rect.width,
      height: rect.height,
    }
  }
  const win = isElement(offsetParent) ? getWindow(offsetParent) : (offsetParent as Window)
  return {
    x: rect.x + win.scrollX,
    y: rect.y + win.scrollY,
    width: rect.width,
    height: rect.height,
  }
}

export function getElementRects(args: {
  reference: ReferenceElement
  floating: ReferenceElement
  strategy: Strategy
}): ElementRects {
  const { reference, floating, strategy } = args
  if (!isHTMLElement(floating)) {
    throw new Error('[balloons-dom] the floating element must be an HTMLElement.')
  }
  const offsetParent = getOffsetParent(floating)
  const dimensions = getDimensions(floating)
  return {
    reference: getRectRelativeToOffsetParent(reference, offsetParent, strategy),
    // position comes out of the engine, not the current layout
    floating: { x: 0, y: 0, width: dimensions.width, height: dimensions.height },
  }
}

// The exact inverse of getRectRelativeToOffsetParent: engine-space rects back
// into viewport space so detectOverflow compares like with like.
export function convertOffsetParentRelativeRectToViewportRelativeRect(args: {
  elements: Elements<ReferenceElement>
  rect: Rect
  strategy: Strategy
}): Rect {
  const { elements, rect, strategy } = args
  if (strategy === 'fixed') return rect
  const floating = elements.floating
  if (!isElement(floating)) return rect
  const offsetParent = getOffsetParent(floating)
  if (isElement(offsetParent) && offsetParent !== getDocumentElement(offsetParent)) {
    const parentRect = getBoundingClientRect(offsetParent)
    return {
      x: rect.x + parentRect.x + offsetParent.clientLeft - offsetParent.scrollLeft,
      y: rect.y + parentRect.y + offsetParent.clientTop - offsetParent.scrollTop,
      width: rect.width,
      height: rect.height,
    }
  }
  const win = isElement(offsetParent) ? getWindow(offsetParent) : (offsetParent as Window)
  return {
    x: rect.x - win.scrollX,
    y: rect.y - win.scrollY,
    width: rect.width,
    height: rect.height,
  }
}
