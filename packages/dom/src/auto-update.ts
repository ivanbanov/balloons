import { scheduler } from './scheduler'
import type { ReferenceElement } from './types'
import { getBoundingClientRect, getOverflowAncestors, unwrapElement } from './utils'

export interface AutoUpdateOptions {
  ancestorScroll?: boolean
  ancestorResize?: boolean
  elementResize?: boolean
  // rAF rect-diff for references that move without firing any event (e.g.
  // mid-animation). Position tracking is not an animation: this keeps running
  // under prefers-reduced-motion so overlays never detach (ACCESSIBILITY.md).
  animationFrame?: boolean
}

// Event-driven repositioning. Every trigger routes through the shared
// scheduler: bursts within a frame collapse to one update, and updates from
// different floating elements share a single flush.
export function autoUpdate(
  reference: ReferenceElement,
  floating: HTMLElement,
  update: () => void,
  options: AutoUpdateOptions = {},
): () => void {
  const {
    ancestorScroll = true,
    ancestorResize = true,
    elementResize = true,
    animationFrame = false,
  } = options
  const referenceElement = unwrapElement(reference)
  const scheduleUpdate = (): void => scheduler.schedule(update)
  const ancestors =
    ancestorScroll || ancestorResize
      ? [
          ...(referenceElement ? getOverflowAncestors(referenceElement) : []),
          ...getOverflowAncestors(floating),
        ]
      : []
  for (const ancestor of ancestors) {
    if (ancestorScroll) ancestor.addEventListener('scroll', scheduleUpdate, { passive: true })
    if (ancestorResize) ancestor.addEventListener('resize', scheduleUpdate)
  }
  let resizeObserver: ResizeObserver | null = null
  if (elementResize && typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(scheduleUpdate)
    if (referenceElement) resizeObserver.observe(referenceElement)
    resizeObserver.observe(floating)
  }
  let frame = 0
  let previousRect = animationFrame ? getBoundingClientRect(reference) : null
  if (animationFrame) {
    const frameLoop = (): void => {
      const nextRect = getBoundingClientRect(reference)
      if (
        previousRect &&
        (nextRect.x !== previousRect.x ||
          nextRect.y !== previousRect.y ||
          nextRect.width !== previousRect.width ||
          nextRect.height !== previousRect.height)
      ) {
        scheduleUpdate()
      }
      previousRect = nextRect
      frame = requestAnimationFrame(frameLoop)
    }
    frame = requestAnimationFrame(frameLoop)
  }
  update()
  return () => {
    for (const ancestor of ancestors) {
      if (ancestorScroll) ancestor.removeEventListener('scroll', scheduleUpdate)
      if (ancestorResize) ancestor.removeEventListener('resize', scheduleUpdate)
    }
    resizeObserver?.disconnect()
    resizeObserver = null
    if (animationFrame) cancelAnimationFrame(frame)
    // no post-teardown update may fire, even one already queued
    scheduler.cancel(update)
  }
}
