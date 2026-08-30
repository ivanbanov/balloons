// The batched cross-instance coordinator: every autoUpdate on the page (and
// any consumer work) funnels into ONE frame callback. n floating elements do
// not get n independent read-then-write chains — they share a flush.

export interface MeasuredTask<TMeasure = unknown> {
  read(): TMeasure
  write(measured: TMeasure): void
}

export interface Scheduler {
  // Coalesced by task identity: scheduling the same function n times within
  // a frame runs it once.
  schedule(task: () => void): void
  // Split tasks: within a flush, ALL reads run before ANY write, so measured
  // work never interleaves layout reads with layout writes.
  scheduleMeasured<TMeasure>(task: MeasuredTask<TMeasure>): void
  cancel<TMeasure>(task: (() => void) | MeasuredTask<TMeasure>): void
}

export function createScheduler(requestFrame?: (flush: () => void) => void): Scheduler {
  const tasks = new Set<() => void>()
  const measuredTasks = new Set<MeasuredTask<unknown>>()
  let frameRequested = false

  // The default frame source resolves requestAnimationFrame at schedule time,
  // not at import time — creating a scheduler in a windowless process is safe.
  const request = requestFrame ?? (flush => requestAnimationFrame(flush))

  function flush(): void {
    // cleared before running so work scheduled during the flush lands in the
    // next frame, never re-entering this one
    frameRequested = false
    const plain = Array.from(tasks)
    tasks.clear()
    const measured = Array.from(measuredTasks)
    measuredTasks.clear()
    for (const task of plain) task()
    const results: unknown[] = []
    for (const task of measured) results.push(task.read())
    for (let i = 0; i < measured.length; i++) measured[i].write(results[i])
  }

  function ensureFrame(): void {
    if (frameRequested) return
    frameRequested = true
    request(flush)
  }

  return {
    schedule(task) {
      tasks.add(task)
      ensureFrame()
    },
    scheduleMeasured(task) {
      measuredTasks.add(task as MeasuredTask<unknown>)
      ensureFrame()
    },
    cancel(task) {
      tasks.delete(task as () => void)
      measuredTasks.delete(task as MeasuredTask<unknown>)
    },
  }
}

// The shared per-process instance — sharing is the point (see SPEC.md).
export const scheduler: Scheduler = createScheduler()
