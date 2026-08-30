import type { Boundary, ClientRect, Rect, RootBoundary, Strategy } from '@dunky.dev/balloons'
import { rectToClientRect } from '@dunky.dev/balloons'
import type { ReferenceElement, VirtualElement } from './types'
import {
  getBoundingClientRect,
  getDocumentElement,
  getOverflowAncestors,
  isElement,
  unwrapElement,
} from './utils'

function getViewportRect(element: Element): Rect {
  const html = getDocumentElement(element)
  return { x: 0, y: 0, width: html.clientWidth, height: html.clientHeight }
}

// The padding box — what actually clips overflowing content.
function getInnerBoundingClientRect(element: Element): ClientRect {
  const rect = getBoundingClientRect(element)
  return rectToClientRect({
    x: rect.x + element.clientLeft,
    y: rect.y + element.clientTop,
    width: element.clientWidth,
    height: element.clientHeight,
  })
}

function isVirtualElement(value: unknown): value is VirtualElement {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as VirtualElement).getBoundingClientRect === 'function'
  )
}

// v0.1 honest scope: same-document overflow ancestors intersected with the
// root boundary. No iframes, no shadow-root hosts, no fixed-ancestor pruning
// yet — tracked in SPEC.md.
export function getClippingRect(args: {
  element: ReferenceElement
  boundary: Boundary<ReferenceElement>
  rootBoundary: RootBoundary
  strategy: Strategy
}): Rect {
  const { element, boundary, rootBoundary } = args
  const contextElement = unwrapElement(element)
  const rects: ClientRect[] = []
  if (boundary === 'clippingAncestors') {
    if (contextElement) {
      for (const ancestor of getOverflowAncestors(contextElement)) {
        if (isElement(ancestor)) rects.push(getInnerBoundingClientRect(ancestor))
      }
    }
  } else {
    const entries = Array.isArray(boundary) ? boundary : [boundary]
    for (const entry of entries) {
      if (isElement(entry)) rects.push(getInnerBoundingClientRect(entry))
      else if (isVirtualElement(entry)) rects.push(rectToClientRect(getBoundingClientRect(entry)))
      else rects.push(rectToClientRect(entry))
    }
  }
  if (rootBoundary === 'viewport') {
    // a virtual element without a contextElement clips against the global
    // viewport — resolved here, at call time, never at import time
    const viewportContext = contextElement ?? document.documentElement
    rects.push(rectToClientRect(getViewportRect(viewportContext)))
  } else {
    rects.push(rectToClientRect(rootBoundary))
  }
  let { top, right, bottom, left } = rects[0]
  for (let i = 1; i < rects.length; i++) {
    const rect = rects[i]
    top = Math.max(top, rect.top)
    left = Math.max(left, rect.left)
    right = Math.min(right, rect.right)
    bottom = Math.min(bottom, rect.bottom)
  }
  return { x: left, y: top, width: right - left, height: bottom - top }
}
