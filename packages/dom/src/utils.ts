import type { ClientRect } from '@dunky.dev/balloons'
import type { ReferenceElement } from './types'

// Every global in this file is referenced inside a function body, never at
// module scope — importing in a windowless process must stay safe (SPEC.md).
// The `typeof` guards protect the predicates themselves in those processes.

export function isElement(value: unknown): value is Element {
  return typeof Element !== 'undefined' && value instanceof Element
}

export function isHTMLElement(value: unknown): value is HTMLElement {
  return typeof HTMLElement !== 'undefined' && value instanceof HTMLElement
}

export function getWindow(element: Element): Window & typeof globalThis {
  return element.ownerDocument.defaultView ?? window
}

export function getDocumentElement(element: Element): HTMLElement {
  return element.ownerDocument.documentElement
}

export function unwrapElement(reference: ReferenceElement): Element | undefined {
  return isElement(reference) ? reference : reference.contextElement
}

export function getBoundingClientRect(element: ReferenceElement): ClientRect {
  const rect = element.getBoundingClientRect()
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
  }
}

const OVERFLOW_VALUES = /auto|scroll|overlay|hidden|clip/

export function isOverflowElement(element: Element): boolean {
  const style = getWindow(element).getComputedStyle(element)
  return (
    OVERFLOW_VALUES.test(style.overflow + style.overflowY + style.overflowX) &&
    style.display !== 'inline' &&
    style.display !== 'contents'
  )
}

// v0.1: a same-document parent walk — no shadow roots, no iframes yet. The
// window closes the chain so scroll/resize on the viewport itself is covered.
export function getOverflowAncestors(element: Element): (Element | Window)[] {
  const ancestors: (Element | Window)[] = []
  let parent = element.parentElement
  while (parent) {
    if (isOverflowElement(parent)) ancestors.push(parent)
    parent = parent.parentElement
  }
  ancestors.push(getWindow(element))
  return ancestors
}
