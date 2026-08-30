import { describe, expect, it } from 'vitest'
import { createScheduler } from '../src/scheduler'

// A hand-cranked frame source: scheduler logic is pure coordination, so it
// runs in bare Node with no requestAnimationFrame anywhere.
function createManualFrame() {
  const callbacks: (() => void)[] = []
  return {
    request: (callback: () => void): void => {
      callbacks.push(callback)
    },
    tick: (): void => {
      for (const callback of callbacks.splice(0)) callback()
    },
    pending: (): number => callbacks.length,
  }
}

describe('scheduler', () => {
  it('coalesces repeated schedules of the same task into one run', () => {
    const frame = createManualFrame()
    const scheduler = createScheduler(frame.request)
    let runs = 0
    const task = () => {
      runs++
    }
    scheduler.schedule(task)
    scheduler.schedule(task)
    scheduler.schedule(task)
    frame.tick()
    expect(runs).toBe(1)
  })

  it('flushes every scheduled task in a single frame', () => {
    const frame = createManualFrame()
    const scheduler = createScheduler(frame.request)
    const ran: string[] = []
    scheduler.schedule(() => ran.push('a'))
    scheduler.schedule(() => ran.push('b'))
    scheduler.schedule(() => ran.push('c'))
    // the whole point: n instances, one frame callback
    expect(frame.pending()).toBe(1)
    frame.tick()
    expect(ran).toEqual(['a', 'b', 'c'])
  })

  it('runs all measured reads before any measured write', () => {
    const frame = createManualFrame()
    const scheduler = createScheduler(frame.request)
    const order: string[] = []
    scheduler.scheduleMeasured({
      read: () => {
        order.push('read:a')
        return 'a'
      },
      write: value => {
        order.push(`write:${value}`)
      },
    })
    scheduler.scheduleMeasured({
      read: () => {
        order.push('read:b')
        return 'b'
      },
      write: value => {
        order.push(`write:${value}`)
      },
    })
    frame.tick()
    expect(order).toEqual(['read:a', 'read:b', 'write:a', 'write:b'])
  })

  it('runs plain tasks before the measured set', () => {
    const frame = createManualFrame()
    const scheduler = createScheduler(frame.request)
    const order: string[] = []
    scheduler.scheduleMeasured({
      read: () => order.push('read'),
      write: () => order.push('write'),
    })
    scheduler.schedule(() => order.push('plain'))
    frame.tick()
    expect(order).toEqual(['plain', 'read', 'write'])
  })

  it('defers a task scheduled during a flush to the next frame', () => {
    const frame = createManualFrame()
    const scheduler = createScheduler(frame.request)
    const ran: string[] = []
    scheduler.schedule(() => {
      ran.push('first')
      scheduler.schedule(() => ran.push('second'))
    })
    frame.tick()
    expect(ran).toEqual(['first'])
    expect(frame.pending()).toBe(1)
    frame.tick()
    expect(ran).toEqual(['first', 'second'])
  })

  it('cancel removes a pending task of either kind', () => {
    const frame = createManualFrame()
    const scheduler = createScheduler(frame.request)
    let runs = 0
    const task = () => {
      runs++
    }
    const measured = {
      read: () => {
        runs++
      },
      write: () => {
        runs++
      },
    }
    scheduler.schedule(task)
    scheduler.scheduleMeasured(measured)
    scheduler.cancel(task)
    scheduler.cancel(measured)
    frame.tick()
    expect(runs).toBe(0)
  })
})
