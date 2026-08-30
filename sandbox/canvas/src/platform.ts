// A scene platform: elements are plain rects in canvas space. Nothing here
// measures the DOM — this is the repo's proof that core is substrate-free
// (the equivalent of state-machine's opentui target).
import type { Platform, Rect } from '@dunky.dev/balloons'

export interface SceneNode extends Rect {}

export function createScenePlatform(screen: {
  width: number
  height: number
}): Platform<SceneNode> {
  return {
    getElementRects: ({ reference, floating }) => ({
      reference: { ...reference },
      floating: { x: 0, y: 0, width: floating.width, height: floating.height },
    }),
    getDimensions: node => ({ width: node.width, height: node.height }),
    getClippingRect: () => ({ x: 0, y: 0, width: screen.width, height: screen.height }),
  }
}
