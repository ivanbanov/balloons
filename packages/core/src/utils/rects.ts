import type { ClientRect, Derivable, MiddlewareState, Padding, Rect, SideObject } from '../types'

export function rectToClientRect(rect: Rect): ClientRect {
  const { x, y, width, height } = rect
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
  }
}

export function getPaddingObject(padding: Padding): SideObject {
  if (typeof padding === 'number') {
    return { top: padding, right: padding, bottom: padding, left: padding }
  }
  return {
    top: padding.top ?? 0,
    right: padding.right ?? 0,
    bottom: padding.bottom ?? 0,
    left: padding.left ?? 0,
  }
}

export function clamp(start: number, value: number, end: number): number {
  return Math.max(start, Math.min(value, end))
}

export function evaluate<TElement, T>(
  value: T | Derivable<TElement, T>,
  state: MiddlewareState<TElement>,
): T {
  return typeof value === 'function' ? (value as Derivable<TElement, T>)(state) : value
}
