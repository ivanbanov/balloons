import type { ComputePositionResult } from '@dunky.dev/balloons'
import { computePosition, flip, offset, shift } from '@dunky.dev/balloons'
import type { SceneNode } from './platform'
import { createScenePlatform } from './platform'

const canvas = document.querySelector('canvas')!
const context = canvas.getContext('2d')!

const platform = createScenePlatform({ width: canvas.width, height: canvas.height })
const anchor: SceneNode = { x: 380, y: 220, width: 40, height: 40 }
const tooltip: SceneNode = { x: 0, y: 0, width: 160, height: 48 }
const middleware = [offset(12), flip(), shift({ padding: 8 })]

function draw(): void {
  // the canvas is only the screen; every coordinate below came from core
  const { x, y, placement } = computePosition(anchor, tooltip, {
    placement: 'top',
    platform,
    middleware,
  }) as ComputePositionResult

  context.clearRect(0, 0, canvas.width, canvas.height)

  context.fillStyle = '#4a90d9'
  context.fillRect(anchor.x, anchor.y, anchor.width, anchor.height)

  context.fillStyle = '#222'
  context.fillRect(x, y, tooltip.width, tooltip.height)
  context.fillStyle = '#fff'
  context.font = '14px system-ui'
  context.textBaseline = 'middle'
  context.fillText(`placement: ${placement}`, x + 12, y + tooltip.height / 2)
}

canvas.addEventListener('pointermove', event => {
  const bounds = canvas.getBoundingClientRect()
  anchor.x = event.clientX - bounds.left - anchor.width / 2
  anchor.y = event.clientY - bounds.top - anchor.height / 2
  draw()
})

draw()
