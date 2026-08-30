import type { ClientRect } from '@dunky.dev/balloons'

// A measurable non-element: cursor positions, ranges, canvas hit areas.
// `contextElement` (when given) anchors clipping and RTL detection.
export interface VirtualElement {
  getBoundingClientRect(): ClientRect | DOMRect
  contextElement?: Element
}

export type ReferenceElement = Element | VirtualElement
