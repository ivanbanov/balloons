import type { Platform, Rect } from '../../src'

// The reference/floating handles ARE plain rects: the engine never inspects
// them, so the simplest possible TElement doubles as the measurement source.
export interface TestPlatformOptions {
  viewport?: Rect
  rtl?: boolean
}

export const VIEWPORT: Rect = { x: 0, y: 0, width: 1000, height: 1000 }

export function createPlatform(options: TestPlatformOptions = {}): Platform<Rect> {
  const { viewport = VIEWPORT, rtl = false } = options
  return {
    getElementRects: ({ reference, floating }) => ({
      reference: {
        x: reference.x,
        y: reference.y,
        width: reference.width,
        height: reference.height,
      },
      floating: { x: 0, y: 0, width: floating.width, height: floating.height },
    }),
    getDimensions: element => ({ width: element.width, height: element.height }),
    getClippingRect: ({ boundary, rootBoundary }) => {
      if (boundary !== 'clippingAncestors' && !Array.isArray(boundary)) {
        return { x: boundary.x, y: boundary.y, width: boundary.width, height: boundary.height }
      }
      if (rootBoundary !== 'viewport') {
        return {
          x: rootBoundary.x,
          y: rootBoundary.y,
          width: rootBoundary.width,
          height: rootBoundary.height,
        }
      }
      return { x: viewport.x, y: viewport.y, width: viewport.width, height: viewport.height }
    },
    isRTL: () => rtl,
  }
}

// Same behavior, every method resolving through a Promise — the RN-bridge
// shape. Lets every test assert both execution paths of the same scenario.
export function asAsync(platform: Platform<Rect>): Platform<Rect> {
  return {
    getElementRects: args => Promise.resolve(platform.getElementRects(args)),
    getDimensions: element => Promise.resolve(platform.getDimensions(element)),
    getClippingRect: args => Promise.resolve(platform.getClippingRect(args)),
    isRTL: element => Promise.resolve(platform.isRTL ? platform.isRTL(element) : false),
  }
}
