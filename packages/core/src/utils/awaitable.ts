import type { Awaitable } from '../types'

export function isPromise<T>(value: Awaitable<T>): value is Promise<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

// The single place the sync/async fork exists: consume a value on the same
// call stack when it's plain, chain through the Promise only when the
// substrate forced one. Everything sync-first in the engine routes through
// here — never add an unconditional `await`/`.then` elsewhere.
export function chain<T, R>(value: Awaitable<T>, fn: (value: T) => Awaitable<R>): Awaitable<R> {
  return isPromise(value) ? value.then(fn) : fn(value)
}
