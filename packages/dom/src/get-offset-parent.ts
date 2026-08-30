import { getWindow, isHTMLElement } from './utils'

// v0.1: trusts the layout engine's own offsetParent. A static body resolves
// to the window (the initial containing block). Transformed-ancestor
// containing blocks and table quirks land with getScale — tracked in SPEC.md.
export function getOffsetParent(element: Element): Element | Window {
  const win = getWindow(element)
  if (!isHTMLElement(element)) return win
  const offsetParent = element.offsetParent
  if (!offsetParent) return win
  if (
    offsetParent === element.ownerDocument.body &&
    win.getComputedStyle(offsetParent).position === 'static'
  ) {
    return win
  }
  return offsetParent
}
