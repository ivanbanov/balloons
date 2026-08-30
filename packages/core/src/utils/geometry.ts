import type { Coords, Rect } from '../types'

// Pure geometry shared with interaction layers: hover-intent safe-polygons in
// consumers call into these instead of reimplementing the math. Keep them
// dependency-free and side-effect-free.

export function pointInRect(point: Coords, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

// Ray casting: count edge crossings of a horizontal ray from the point.
export function pointInPolygon(point: Coords, polygon: readonly Coords[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    const intersects =
      yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}
