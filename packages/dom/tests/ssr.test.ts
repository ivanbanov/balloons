// The windowless-Node gate: this suite runs in a process where `window` is
// not merely empty but absent, so a module-scope `window.x` (or a
// feature-check that assumes `window` exists before `typeof` can protect it)
// throws right here instead of in a consumer's server render.
import { describe, expect, it } from 'vitest'

describe('SSR (windowless Node)', () => {
  it('runs in a process with no DOM globals at all', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
  })

  it('imports the whole package without touching a substrate global', async () => {
    const dom = await import('../src')
    expect(typeof dom.computePosition).toBe('function')
    expect(typeof dom.autoUpdate).toBe('function')
    expect(typeof dom.getOverflowAncestors).toBe('function')
    expect(typeof dom.createScheduler).toBe('function')
    expect(dom.platform).toBeDefined()
    expect(dom.scheduler).toBeDefined()
  })

  it('imports the core package the same way', async () => {
    const core = await import('@dunky.dev/balloons')
    expect(typeof core.computePosition).toBe('function')
  })
})
