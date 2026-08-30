import type { Platform } from '@dunky.dev/balloons'
import { getClippingRect } from './get-clipping-rect'
import {
  convertOffsetParentRelativeRectToViewportRelativeRect,
  getDimensions,
  getElementRects,
} from './get-element-rects'
import type { ReferenceElement } from './types'
import { getWindow, unwrapElement } from './utils'

function isRTL(element: ReferenceElement): boolean {
  const el = unwrapElement(element)
  if (!el) return false
  return getWindow(el).getComputedStyle(el).direction === 'rtl'
}

// Fully synchronous on purpose: this platform is what makes the core's
// sync-first contract concrete on the web. A method here turning async is a
// breaking change by definition (SPEC.md).
export const platform: Platform<ReferenceElement> = {
  getElementRects,
  getDimensions,
  getClippingRect,
  convertOffsetParentRelativeRectToViewportRelativeRect,
  isRTL,
}
