// The AGENTS.md#Boundaries gate: core never references a substrate. This test
// is what makes that an invariant instead of a convention — the exact class of
// drift that let dead `document.getElementById` code sit inside the ancestor
// engine's "pure" package for years.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(import.meta.dirname, '../src')

const FORBIDDEN = [
  'window',
  'document',
  'globalThis',
  'HTMLElement',
  'SVGElement',
  'Element',
  'Node',
  'ShadowRoot',
  'getBoundingClientRect',
  'getComputedStyle',
  'ResizeObserver',
  'IntersectionObserver',
  'MutationObserver',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'setTimeout',
  'setInterval',
  'navigator',
  'location',
  'fetch',
]

function listFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...listFiles(path))
    else if (entry.name.endsWith('.ts')) files.push(path)
  }
  return files
}

describe('core purity', () => {
  it('references no substrate token anywhere in src/', () => {
    const violations: string[] = []
    for (const file of listFiles(SRC)) {
      const source = readFileSync(file, 'utf8')
      for (const token of FORBIDDEN) {
        if (new RegExp(`\\b${token}\\b`).test(source)) {
          violations.push(`${file} references "${token}"`)
        }
      }
    }
    expect(violations).toEqual([])
  })
})
