import { arrow, flip, getSide, offset, shift } from '@dunky.dev/balloons'
import { autoUpdate, computePosition } from '@dunky.dev/balloons-dom'

const anchor = document.querySelector<HTMLButtonElement>('.anchor')!
const tooltip = document.querySelector<HTMLDivElement>('.tooltip')!
const arrowElement = document.querySelector<HTMLDivElement>('.arrow')!
const placementLabel = document.querySelector<HTMLElement>('.placement')!

const oppositeSide = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' } as const

function update(): void {
  // synchronous on the DOM platform: plain object, same call stack
  const { x, y, placement, middlewareData } = computePosition(anchor, tooltip, {
    placement: 'top',
    middleware: [offset(10), flip(), shift({ padding: 8 }), arrow({ element: arrowElement })],
  })
  tooltip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
  placementLabel.textContent = placement
  const side = getSide(placement)
  const arrowData = middlewareData.arrow
  Object.assign(arrowElement.style, {
    left: arrowData?.x != null ? `${arrowData.x}px` : '',
    top: arrowData?.y != null ? `${arrowData.y}px` : '',
    [oppositeSide[side]]: '-5px',
  })
}

autoUpdate(anchor, tooltip, update)
