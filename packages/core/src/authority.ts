import type { Middleware, MiddlewareResult } from './types'

// Validation is cached per middleware array identity — steady-state callers
// that reuse their pipeline pay the check once.
const validatedPipelines = new WeakSet<object>()

function indexOfName<TElement>(middleware: readonly Middleware<TElement>[], name: string): number {
  for (let i = 0; i < middleware.length; i++) {
    if (middleware[i].name === name) return i
  }
  return -1
}

// The authority's build-time half: the pipeline's order must satisfy every
// declared dependency before anything runs. Violations are programming
// errors, so they throw — loudly, with the fix in the message — instead of
// silently misplacing things in production.
export function validatePipeline<TElement>(middleware: readonly Middleware<TElement>[]): void {
  if (validatedPipelines.has(middleware)) return
  for (let i = 0; i < middleware.length; i++) {
    const entry = middleware[i]
    if (indexOfName(middleware, entry.name) !== i) {
      throw new Error(
        `[balloons] duplicate middleware "${entry.name}" in the pipeline. ` +
          'Each middleware may appear once; merge the options into a single instance.',
      )
    }
    if (!entry.reads) continue
    for (const dependency of entry.reads) {
      if (indexOfName(middleware, dependency) > i) {
        throw new Error(
          `[balloons] "${entry.name}" declares reads: ["${dependency}"] but runs before ` +
            `"${dependency}". Move "${entry.name}" after "${dependency}" in the middleware array.`,
        )
      }
    }
  }
  validatedPipelines.add(middleware)
}

// The authority's apply-time half: a result may only touch the channels its
// middleware declared.
export function enforceWrites<TElement>(
  middleware: Middleware<TElement>,
  result: MiddlewareResult,
): void {
  if ((result.x !== undefined || result.y !== undefined) && !middleware.writes.includes('coords')) {
    throw new Error(
      `[balloons] "${middleware.name}" returned coordinates without declaring ` +
        `writes: ["coords"]. Declare the write or stop returning x/y.`,
    )
  }
  const reset = result.reset
  if (!reset) return
  if (reset.phase === 'placement' && !middleware.writes.includes('placement')) {
    throw new Error(
      `[balloons] "${middleware.name}" requested a placement reset without declaring ` +
        `writes: ["placement"].`,
    )
  }
  if (reset.phase === 'rects' && !middleware.writes.includes('rects')) {
    throw new Error(
      `[balloons] "${middleware.name}" requested a rects reset without declaring ` +
        `writes: ["rects"].`,
    )
  }
}
